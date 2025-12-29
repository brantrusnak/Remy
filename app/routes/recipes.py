from __future__ import annotations
from flask import Blueprint, request, jsonify, render_template, flash, redirect, url_for, Response
from flask_login import login_required, current_user
from app import db
from app.models import Recipe, RecipeVersion, PantryItem, DietaryPreference
from app.services.gpt_service import GPTService
from app.services.recipe_parser import RecipeParser

bp = Blueprint('recipes', __name__)


def get_gpt_service() -> GPTService:
    return GPTService()


def get_recipe_parser() -> RecipeParser:
    return RecipeParser()


@bp.route('/generate', methods=['POST'])
@login_required
def generate() -> tuple[Response, int] | Response:
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    user_prompt: str | None = data.get('prompt')
    recipe_id: int | None = data.get('recipe_id')
    version_id: int | None = data.get('version_id')

    if not user_prompt or not user_prompt.strip():
        return jsonify({'error': 'Prompt is required'}), 400
    
    pantry_items: list[str] = [
        item.name for item in PantryItem.query.filter_by(user_id=current_user.id).all()
    ]

    prefs: DietaryPreference | None = DietaryPreference.query.filter_by(
        user_id=current_user.id
    ).first()
    
    current_recipe_data: dict | None = None

    if version_id:
        existing_version: RecipeVersion | None = RecipeVersion.query.filter_by(id=version_id, user_id=current_user.id).first()
        if existing_version:
            current_recipe_data = {
                'title': existing_version.title,
                'description': existing_version.description,
                'ingredients': existing_version.ingredients,
                'steps': existing_version.steps,
                'tips': existing_version.tips
            }
            if existing_version.recipe_id:
                recipe_id = existing_version.recipe_id
    elif recipe_id:
        existing_recipe: Recipe | None = Recipe.query.filter_by(id=recipe_id, user_id=current_user.id).first()
        if existing_recipe:
            current_recipe_data = {
                'title': existing_recipe.title,
                'description': existing_recipe.description,
                'ingredients': existing_recipe.ingredients,
                'steps': existing_recipe.steps,
                'tips': existing_recipe.tips
            }
    
    try:
        gpt_service = get_gpt_service()
        recipe_data = gpt_service.generate_recipe(
            user_prompt=user_prompt,
            pantry_items=pantry_items,
            dietary_preferences=prefs,
            current_recipe=current_recipe_data
        )
    except Exception as e:
        return jsonify({'error': f'Failed to generate recipe: {str(e)}'}), 500
    
    try:
        recipe_parser = get_recipe_parser()
        parsed_recipe = recipe_parser.parse(recipe_data)
    except ValueError:
        return jsonify({
            'error': 'Failed to parse recipe from AI response. Please try again with a different prompt.',
            'debug_response': recipe_data[:1000] if len(recipe_data) > 1000 else recipe_data
        }), 500
    
    recipe = None
    if recipe_id:
        recipe = Recipe.query.filter_by(id=recipe_id, user_id=current_user.id).first()
    
    if recipe:
        # Update existing recipe
        recipe.title = parsed_recipe['title']
        recipe.description = parsed_recipe.get('description', '')
        recipe.ingredients = parsed_recipe['ingredients']
        recipe.steps = parsed_recipe['steps']
        recipe.tips = parsed_recipe.get('tips', '')
    else:
        # Create new recipe
        recipe = Recipe(
            user_id=current_user.id,
            title=parsed_recipe['title'],
            description=parsed_recipe.get('description', ''),
            ingredients=parsed_recipe['ingredients'],
            steps=parsed_recipe['steps'],
            tips=parsed_recipe.get('tips', '')
        )
        db.session.add(recipe)
        db.session.flush()
    
    last_version: RecipeVersion | None = RecipeVersion.query.filter_by(
        user_id=current_user.id,
        recipe_id=recipe.id
    ).order_by(RecipeVersion.version_number.desc()).first()
    next_version: int = (last_version.version_number + 1) if last_version else 1
    
    version = RecipeVersion(
        user_id=current_user.id,
        recipe_id=recipe.id,
        version_number=next_version,
        title=parsed_recipe['title'],
        description=parsed_recipe.get('description', ''),
        ingredients=parsed_recipe['ingredients'],
        steps=parsed_recipe['steps'],
        tips=parsed_recipe.get('tips', '')
    )
    db.session.add(version)
    db.session.flush()
    
    db.session.commit()
    
    return jsonify({
        'version': next_version,
        'version_id': version.id,
        'recipe_id': recipe.id,
        'recipe': parsed_recipe
    })


@bp.route('/versions', methods=['GET'])
@login_required
def get_versions() -> Response:
    recipe_id: int | None = request.args.get('recipe_id', type=int)
    
    query = RecipeVersion.query.filter_by(user_id=current_user.id)
    
    if recipe_id:
        query = query.filter_by(recipe_id=recipe_id)
    
    versions: list[RecipeVersion] = query.order_by(RecipeVersion.version_number.desc()).all()
    
    return jsonify([{
        'id': v.id,
        'version': v.version_number,
        'title': v.title,
        'created_at': v.created_at.isoformat()
    } for v in versions])


@bp.route('/versions/<int:version_id>', methods=['GET'])
@login_required
def get_version(version_id: int) -> tuple[Response, int] | Response:
    version: RecipeVersion | None = RecipeVersion.query.filter_by(
        id=version_id, 
        user_id=current_user.id
    ).first()
    
    if not version:
        return jsonify({'error': 'Version not found'}), 404
    
    return jsonify({
        'id': version.id,
        'version': version.version_number,
        'title': version.title,
        'description': version.description,
        'ingredients': version.ingredients,
        'steps': version.steps,
        'tips': version.tips,
        'recipe_id': version.recipe_id,
        'created_at': version.created_at.isoformat()
    })


@bp.route('/list', methods=['GET'])
@login_required
def list_recipes() -> Response:
    recipes: list[Recipe] = Recipe.query.filter_by(
        user_id=current_user.id
    ).order_by(Recipe.updated_at.desc()).all()
    
    return jsonify([{
        'id': r.id,
        'title': r.title,
        'description': r.description,
        'created_at': r.created_at.isoformat(),
        'updated_at': r.updated_at.isoformat()
    } for r in recipes])


@bp.route('/<int:recipe_id>', methods=['DELETE'])
@login_required
def delete_recipe(recipe_id: int) -> tuple[Response, int] | Response:
    recipe: Recipe | None = Recipe.query.filter_by(
        id=recipe_id, 
        user_id=current_user.id
    ).first()
    
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    db.session.delete(recipe)
    db.session.commit()
    
    return jsonify({'message': 'Recipe deleted successfully'})


@bp.route('/<int:recipe_id>/edit', methods=['GET'])
@login_required
def edit_recipe(recipe_id: int) -> str | Response:
    recipe: Recipe | None = Recipe.query.filter_by(
        id=recipe_id, 
        user_id=current_user.id
    ).first()
    
    if not recipe:
        flash('Recipe not found', 'error')
        return redirect(url_for('main.index'))
    
    version_id: int | None = request.args.get('version_id', type=int)
    edit_data = recipe
    
    if version_id:
        version: RecipeVersion | None = RecipeVersion.query.filter_by(
            id=version_id,
            recipe_id=recipe_id,
            user_id=current_user.id
        ).first()
        if version:
            edit_data = version
    
    return render_template('recipes/develop.html', edit_recipe=edit_data, edit_version_id=version_id)
