from __future__ import annotations
import re
from flask import Blueprint, request, jsonify, render_template, Response
from flask_login import login_required, current_user
from app import db
from app.models import PantryItem

bp = Blueprint('pantry', __name__)


@bp.route('', methods=['GET'])
@login_required
def pantry_page() -> str:
    return render_template('pantry/index.html')


@bp.route('/items', methods=['GET'])
@login_required
def get_items() -> Response:
    items: list[PantryItem] = PantryItem.query.filter_by(user_id=current_user.id).order_by(PantryItem.name).all()
    return jsonify([{'id': item.id, 'name': item.name} for item in items])


@bp.route('/items', methods=['POST'])
@login_required
def update_items() -> tuple[Response, int] | Response:
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    csv_input: str | None = data.get('items')
    
    if not csv_input or not csv_input.strip():
        return jsonify({'error': 'No items provided'}), 400
    
    items: list[str] = [item.strip().lower() for item in re.split(r'[,;]', csv_input)]
    items = [item for item in items if item]
    items = list(set(items))
    
    PantryItem.query.filter_by(user_id=current_user.id).delete()
    
    for item_name in items:
        pantry_item = PantryItem(user_id=current_user.id, name=item_name)
        db.session.add(pantry_item)
    
    db.session.commit()
    
    all_items: list[dict[str, int | str]] = [
        {'id': item.id, 'name': item.name} 
        for item in PantryItem.query.filter_by(user_id=current_user.id).all()
    ]
    
    return jsonify({'message': 'Pantry updated successfully', 'items': all_items})


@bp.route('/items/add', methods=['POST'])
@login_required
def add_items() -> tuple[Response, int] | Response:
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        csv_input: str | None = data.get('items')
        
        if not csv_input or not csv_input.strip():
            return jsonify({'error': 'No items provided'}), 400
        
        new_items: list[str] = [item.strip().lower() for item in csv_input.split(',')]
        new_items = [item for item in new_items if item]
        
        if not new_items:
            return jsonify({'error': 'No valid items found'}), 400
        
        existing_names: set[str] = {
            item.name for item in PantryItem.query.filter_by(user_id=current_user.id).all()
        }
        
        added_count: int = 0
        for item_name in new_items:
            if item_name not in existing_names:
                pantry_item = PantryItem(user_id=current_user.id, name=item_name)
                db.session.add(pantry_item)
                added_count += 1
        
        if added_count > 0:
            db.session.commit()
            db.session.expire_all()
        
        all_items: list[PantryItem] = PantryItem.query.filter_by(user_id=current_user.id).order_by(PantryItem.name).all()
        items_list: list[dict[str, int | str]] = [
            {'id': item.id, 'name': item.name} for item in all_items
        ]
        
        return jsonify({
            'message': f'Added {added_count} new item(s) to pantry',
            'items': items_list
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error: {str(e)}'}), 500


@bp.route('/items/<int:item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id: int) -> tuple[Response, int] | Response:
    item: PantryItem | None = PantryItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    
    if not item:
        return jsonify({'error': 'Item not found'}), 404
    
    item_name: str = item.name
    db.session.delete(item)
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting item: {str(e)}'}), 500
    
    db.session.expire_all()
    all_items: list[PantryItem] = PantryItem.query.filter_by(
        user_id=current_user.id
    ).order_by(PantryItem.name).all()
    items_list: list[dict[str, int | str]] = [
        {'id': item.id, 'name': item.name} for item in all_items
    ]
    
    return jsonify({'message': f'{item_name} removed from pantry', 'items': items_list})
