from __future__ import annotations
from flask import Blueprint, render_template, request, flash, redirect, url_for, Response, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.wrappers import Response as WerkzeugResponse
from urllib.parse import urlparse
from app import db
from app.models import User


def is_safe_url(target: str | None) -> bool:
    if not target:
        return False
    test_url = urlparse(target)
    if test_url.scheme == '' and test_url.netloc == '':
        return True
    ref_url = urlparse(request.host_url)
    return test_url.scheme in ('http', 'https') and test_url.netloc == ref_url.netloc

bp = Blueprint('auth', __name__)


@bp.route('/register', methods=['GET', 'POST'])
def register() -> str | WerkzeugResponse | tuple[Response, int] | Response:
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST' and request.is_json:
        data = request.get_json()
        username: str | None = data.get('username')
        password: str | None = data.get('password')
        confirm_password: str | None = data.get('confirm_password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password are required.'}), 400
        
        if password != confirm_password:
            return jsonify({'error': 'Passwords do not match.'}), 400
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists.'}), 400
        
        user = User(username=username)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        return jsonify({'message': 'Account created!', 'username': username})
    
    return render_template('auth/register.html')


@bp.route('/login', methods=['GET', 'POST'])
def login() -> str | WerkzeugResponse:
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    
    if request.method == 'POST':
        username: str | None = request.form.get('username')
        password: str | None = request.form.get('password')
        remember: bool = bool(request.form.get('remember'))
        
        user: User | None = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password or ''):
            login_user(user, remember=remember)
            next_page: str | None = request.args.get('next')
            if next_page and is_safe_url(next_page):
                return redirect(next_page)
            return redirect(url_for('main.index'))
        else:
            flash('Invalid username or password.', 'error')
    
    return render_template('auth/login.html')


@bp.route('/logout')
@login_required
def logout() -> WerkzeugResponse:
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('main.index'))
