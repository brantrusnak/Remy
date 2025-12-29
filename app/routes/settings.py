from __future__ import annotations
from flask import Blueprint, request, jsonify, render_template, Response
from flask_login import login_required, current_user
from app import db
from app.models import DietaryPreference

bp = Blueprint('settings', __name__)


@bp.route('', methods=['GET'])
@login_required
def settings_page() -> str:
    return render_template('settings/index.html')


@bp.route('/preferences', methods=['GET'])
@login_required
def get_preferences() -> Response:
    prefs: DietaryPreference | None = DietaryPreference.query.filter_by(user_id=current_user.id).first()
    
    if not prefs:
        return jsonify({
            'diet_type': 'omnivore',
            'foods_to_avoid': '',
            'foods_i_love': ''
        })
    
    return jsonify({
        'diet_type': prefs.diet_type,
        'foods_to_avoid': prefs.foods_to_avoid or '',
        'foods_i_love': prefs.foods_i_love or ''
    })


@bp.route('/preferences', methods=['POST'])
@login_required
def update_preferences() -> tuple[Response, int] | Response:
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    prefs: DietaryPreference | None = DietaryPreference.query.filter_by(user_id=current_user.id).first()
    
    if not prefs:
        prefs = DietaryPreference(user_id=current_user.id)
        db.session.add(prefs)
    
    prefs.diet_type = data.get('diet_type', 'omnivore')
    prefs.foods_to_avoid = data.get('foods_to_avoid', '')
    prefs.foods_i_love = data.get('foods_i_love', '')
    
    db.session.commit()
    
    return jsonify({'message': 'Preferences updated successfully'})


@bp.route('/password', methods=['POST'])
@login_required
def change_password() -> tuple[Response, int] | Response:
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    current_password: str | None = data.get('current_password')
    new_password: str | None = data.get('new_password')
    confirm_password: str | None = data.get('confirm_password')
    
    if not current_password or not new_password or not confirm_password:
        return jsonify({'error': 'All password fields are required'}), 400
    
    if new_password != confirm_password:
        return jsonify({'error': 'New passwords do not match'}), 400
    
    if len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400
    
    if not current_user.check_password(current_password):
        return jsonify({'error': 'Current password is incorrect'}), 400
    
    current_user.set_password(new_password)
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'})
