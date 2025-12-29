from __future__ import annotations
from typing import TYPE_CHECKING
from openai import OpenAI

if TYPE_CHECKING:
    from app.models import DietaryPreference


class GPTService:
    def __init__(self) -> None:
        self._client: OpenAI | None = None
        self._model: str | None = None
    
    def _get_client(self) -> OpenAI:
        if self._client is None:
            from flask import current_app
            api_key = current_app.config.get('OPENAI_API_KEY')
            if not api_key:
                raise ValueError('OPENAI_API_KEY not configured')
            self._client = OpenAI(api_key=api_key)
            self._model = current_app.config.get('OPENAI_MODEL', 'gpt-5-nano')
        return self._client
    
    def _get_model(self) -> str:
        if self._model is None:
            self._get_client()
        return self._model or 'gpt-5-nano'
    
    def generate_recipe(
        self,
        user_prompt: str,
        pantry_items: list[str] | None = None,
        dietary_preferences: DietaryPreference | None = None,
        current_recipe: dict | None = None
    ) -> str:
        context_parts: list[str] = []
        
        if current_recipe:
            recipe_context = f"""Current recipe being refined:
            Title: {current_recipe.get('title', '')}
            Description: {current_recipe.get('description', '')}
            Ingredients: {current_recipe.get('ingredients', '')}
            Steps: {current_recipe.get('steps', '')}
            Tips: {current_recipe.get('tips', '')}"""
            context_parts.append(recipe_context)
        
        if pantry_items:
            context_parts.append(f"Available pantry items: {', '.join(pantry_items)}")
        
        if dietary_preferences:
            context_parts.append(f"Dietary preference: {dietary_preferences.diet_type}")
            if dietary_preferences.foods_to_avoid:
                context_parts.append(f"Foods to avoid: {dietary_preferences.foods_to_avoid}")
            if dietary_preferences.foods_i_love:
                context_parts.append(f"Foods I love: {dietary_preferences.foods_i_love}")
        
        context = "\n".join(context_parts) if context_parts else None
        
        system_prompt = """You are a helpful recipe assistant. When given a user's request, 
        you must return EXACTLY ONE recipe in the following structured format:

        TITLE: [Recipe Title]

        DESCRIPTION: [Brief description of the recipe]

        INGREDIENTS:
        - [Ingredient 1]
        - [Ingredient 2]
        ...

        STEPS:
        1. [Step 1]
        2. [Step 2]
        ...

        TIPS: [Optional tips or notes]

        IMPORTANT FORMATTING REQUIREMENTS:
        - Always include measurements in BOTH cups/imperial AND metric units (e.g., "1 cup (240ml)", "2 tablespoons (30ml)", "1 pound (450g)")
        - Always include temperatures in BOTH Fahrenheit AND Celsius (e.g., "350°F (175°C)", "400°F (200°C)")
        - This ensures the recipe is accessible to users worldwide regardless of their measurement system preference

        Always return exactly one recipe. Never return multiple recipes."""
        
        user_message = user_prompt
        if context:
            user_message = f"{context}\n\nUser request: {user_prompt}"
        
        client = self._get_client()
        model = self._get_model()
        
        is_reasoning_model = any(
            name in model.lower() 
            for name in ['o1', 'o3', 'o4', 'gpt-5', 'reasoning']
        )
        
        kwargs: dict = {
            'model': model,
            'messages': [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_message}
            ],
        }
        if not is_reasoning_model:
            kwargs['max_completion_tokens'] = 2000
        
        response = client.chat.completions.create(**kwargs)
        
        if not response.choices:
            raise ValueError('GPT response has no choices')
        
        choice = response.choices[0]
        content = choice.message.content
        finish_reason = choice.finish_reason
        
        if not content or not content.strip():
            if is_reasoning_model and finish_reason == 'length':
                raise ValueError(
                    'Reasoning model hit token limit. '
                    'Try using a non-reasoning model like gpt-4o.'
                )
            raise ValueError('GPT returned empty response')
        
        return content
