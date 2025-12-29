from __future__ import annotations
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db, login_manager

if TYPE_CHECKING:
    from flask_sqlalchemy.model import Model


@login_manager.user_loader
def load_user(user_id: str) -> User | None:
    return User.query.get(int(user_id))


class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id: int = db.Column(db.Integer, primary_key=True)
    username: str = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash: str = db.Column(db.String(255), nullable=False)
    created_at: datetime = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    pantry_items = db.relationship(
        'PantryItem', 
        backref='user', 
        lazy='dynamic', 
        cascade='all, delete-orphan'
    )
    dietary_preferences = db.relationship(
        'DietaryPreference', 
        backref='user', 
        uselist=False, 
        cascade='all, delete-orphan'
    )
    recipes = db.relationship(
        'Recipe', 
        backref='user', 
        lazy='dynamic', 
        cascade='all, delete-orphan'
    )
    recipe_versions = db.relationship(
        'RecipeVersion', 
        backref='user', 
        lazy='dynamic', 
        cascade='all, delete-orphan'
    )
    
    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self) -> str:
        return f'<User {self.username}>'


class PantryItem(db.Model):
    __tablename__ = 'pantry_items'
    
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name: str = db.Column(db.String(100), nullable=False)
    created_at: datetime = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'name', name='unique_user_pantry_item'),
    )
    
    def __repr__(self) -> str:
        return f'<PantryItem {self.name}>'


class DietaryPreference(db.Model):
    __tablename__ = 'dietary_preferences'
    
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    diet_type: str = db.Column(db.String(50), default='omnivore')
    foods_to_avoid: str | None = db.Column(db.Text)
    foods_i_love: str | None = db.Column(db.Text)
    updated_at: datetime = db.Column(
        db.DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    def __repr__(self) -> str:
        return f'<DietaryPreference {self.diet_type}>'


class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title: str = db.Column(db.String(200), nullable=False)
    description: str | None = db.Column(db.Text)
    ingredients: str = db.Column(db.Text, nullable=False)
    steps: str = db.Column(db.Text, nullable=False)
    tips: str | None = db.Column(db.Text)
    created_at: datetime = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: datetime = db.Column(
        db.DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )
    
    versions = db.relationship(
        'RecipeVersion', 
        backref='recipe', 
        lazy='dynamic', 
        cascade='all, delete-orphan'
    )
    
    def __repr__(self) -> str:
        return f'<Recipe {self.title}>'


class RecipeVersion(db.Model):
    __tablename__ = 'recipe_versions'
    
    id: int = db.Column(db.Integer, primary_key=True)
    user_id: int = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    recipe_id: int | None = db.Column(db.Integer, db.ForeignKey('recipes.id'), nullable=True)
    version_number: int = db.Column(db.Integer, nullable=False)
    title: str = db.Column(db.String(200), nullable=False)
    description: str | None = db.Column(db.Text)
    ingredients: str = db.Column(db.Text, nullable=False)
    steps: str = db.Column(db.Text, nullable=False)
    tips: str | None = db.Column(db.Text)
    created_at: datetime = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        db.Index('idx_user_version', 'user_id', 'version_number'),
    )
    
    def __repr__(self) -> str:
        return f'<RecipeVersion v{self.version_number} - {self.title}>'
