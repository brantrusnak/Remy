from __future__ import annotations
from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from werkzeug.wrappers import Response as WerkzeugResponse
from app.models import Recipe, RecipeVersion

bp = Blueprint('main', __name__)


@bp.route('/')
def index() -> str:
    if current_user.is_authenticated:
        return render_template('recipes/develop.html')
    return render_template('index.html')


@bp.route('/<int:recipe_id>')
@login_required
def view_recipe(recipe_id: int) -> str | WerkzeugResponse:
    recipe: Recipe | None = Recipe.query.filter_by(
        id=recipe_id, 
        user_id=current_user.id
    ).first()
    
    if not recipe:
        flash('Recipe not found', 'error')
        return redirect(url_for('main.index'))
    
    versions: list[RecipeVersion] = RecipeVersion.query.filter_by(
        recipe_id=recipe_id,
        user_id=current_user.id
    ).order_by(RecipeVersion.version_number.desc()).all()
    
    return render_template('recipes/view.html', recipe=recipe, versions=versions)
