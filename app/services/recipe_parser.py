from __future__ import annotations
import re
from typing import TypedDict


class ParsedRecipe(TypedDict):
    title: str
    description: str
    ingredients: str
    steps: str
    tips: str


class RecipeParser:

    def parse(self, gpt_response: str) -> ParsedRecipe:
        if not gpt_response or not gpt_response.strip():
            raise ValueError('Empty GPT response')
        
        recipe: ParsedRecipe = {
            'title': '',
            'description': '',
            'ingredients': '',
            'steps': '',
            'tips': ''
        }
        
        text = gpt_response.strip()
        sections: dict[str, str] = {}
        
        section_patterns: list[tuple[str, str, int]] = [
            (r'^TITLE\s*:?\s*(.+?)(?=\n(?:DESCRIPTION|INGREDIENTS|STEPS|TIPS|$))', 'title', re.IGNORECASE | re.MULTILINE | re.DOTALL),
            (r'^DESCRIPTION\s*:?\s*(.+?)(?=\n(?:INGREDIENTS|STEPS|TIPS|$))', 'description', re.IGNORECASE | re.MULTILINE | re.DOTALL),
            (r'^INGREDIENTS\s*:?\s*(.+?)(?=\n(?:STEPS|TIPS|$))', 'ingredients', re.IGNORECASE | re.MULTILINE | re.DOTALL),
            (r'^STEPS\s*:?\s*(.+?)(?=\n(?:TIPS|$))', 'steps', re.IGNORECASE | re.MULTILINE | re.DOTALL),
            (r'^TIPS\s*:?\s*(.+?)$', 'tips', re.IGNORECASE | re.MULTILINE | re.DOTALL),
        ]
        
        for pattern, key, flags in section_patterns:
            match = re.search(pattern, text, flags)
            if match:
                sections[key] = match.group(1).strip()
        
        if not sections.get('ingredients') and not sections.get('steps'):
            sections = self._parse_line_by_line(text, sections)
        
        recipe.update(sections)  # type: ignore[typeddict-item]
        
        # Fallback: title from first non-header line
        if not recipe['title']:
            for line in text.split('\n'):
                line = line.strip()
                if line and not line.upper().startswith(('DESCRIPTION', 'INGREDIENTS', 'STEPS', 'TIPS')):
                    recipe['title'] = line
                    break
        
        # Fallback: ingredients from any bullet points (with or without header)
        if not recipe['ingredients']:
            ingredients_section = re.search(
                r'(?:INGREDIENTS?|INGREDIENT)\s*:?\s*\n((?:[-•*]\s*.+\n?)+)', 
                text, 
                re.IGNORECASE | re.MULTILINE
            )
            if ingredients_section:
                recipe['ingredients'] = ingredients_section.group(1).strip()
            else:
                bullet_section = re.search(r'((?:[-•*]\s*.+\n?)+)', text, re.MULTILINE)
                if bullet_section:
                    recipe['ingredients'] = bullet_section.group(1).strip()
        
        # Fallback: steps from any numbered items (with or without header)
        if not recipe['steps']:
            steps_section = re.search(
                r'(?:STEPS|INSTRUCTIONS|DIRECTIONS)\s*:?\s*\n((?:\d+[\.\)]\s*.+\n?)+)', 
                text, 
                re.IGNORECASE | re.MULTILINE
            )
            if steps_section:
                recipe['steps'] = steps_section.group(1).strip()
            else:
                numbered_section = re.search(r'((?:\d+[\.\)]\s*.+\n?)+)', text, re.MULTILINE)
                if numbered_section:
                    recipe['steps'] = numbered_section.group(1).strip()
        
        if not recipe['title'] or not recipe['ingredients'] or not recipe['steps']:
            if recipe['title'] and not recipe['ingredients'] and not recipe['steps']:
                remaining = text.replace(recipe['title'], '').strip()
                if remaining:
                    parts = remaining.split('\n\n')
                    if len(parts) >= 2:
                        recipe['ingredients'] = parts[0].strip()
                        recipe['steps'] = '\n\n'.join(parts[1:]).strip()
                    elif len(parts) == 1:
                        if re.search(r'\d+[\.\)]', remaining):
                            recipe['steps'] = remaining
                        else:
                            recipe['ingredients'] = remaining
            
            if not recipe['title'] or not recipe['ingredients'] or not recipe['steps']:
                raise ValueError(
                    f'Invalid recipe format: missing required fields. '
                    f'Title: {bool(recipe["title"])}, '
                    f'Ingredients: {bool(recipe["ingredients"])}, '
                    f'Steps: {bool(recipe["steps"])}. '
                    f'Response preview: {text[:200]}'
                )
        
        return recipe
    
    def _parse_line_by_line(self, text: str, sections: dict[str, str]) -> dict[str, str]:
        lines = text.split('\n')
        current_section: str | None = None
        current_content: list[str] = []
        
        for line in lines:
            line_upper = line.upper().strip()
            if line_upper.startswith('TITLE'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'title'
                current_content = [re.sub(r'^TITLE\s*:?\s*', '', line, flags=re.IGNORECASE).strip()]
            elif line_upper.startswith('DESCRIPTION'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'description'
                current_content = [re.sub(r'^DESCRIPTION\s*:?\s*', '', line, flags=re.IGNORECASE).strip()]
            elif line_upper.startswith(('INGREDIENTS', 'INGREDIENT')):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'ingredients'
                current_content = [re.sub(r'^INGREDIENTS?\s*:?\s*', '', line, flags=re.IGNORECASE).strip()]
            elif line_upper.startswith(('STEPS', 'STEP', 'INSTRUCTIONS', 'DIRECTIONS')):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'steps'
                current_content = [re.sub(r'^(?:STEPS?|INSTRUCTIONS?|DIRECTIONS?)\s*:?\s*', '', line, flags=re.IGNORECASE).strip()]
            elif line_upper.startswith('TIPS'):
                if current_section and current_content:
                    sections[current_section] = '\n'.join(current_content).strip()
                current_section = 'tips'
                current_content = [re.sub(r'^TIPS?\s*:?\s*', '', line, flags=re.IGNORECASE).strip()]
            elif current_section and line.strip():
                current_content.append(line)
        
        if current_section and current_content:
            sections[current_section] = '\n'.join(current_content).strip()
        
        return sections
