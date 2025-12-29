# Remy

Remy is an AI-powered recipe generation web application that transforms the way home cooks discover and develop recipes. Inspired by the culinary genius rat from Pixar's Ratatouille, Remy leverages OpenAI's GPT models to create personalized recipes based on what's in your pantry, your dietary preferences, and your specific requests.

## Features

- **AI-Powered Recipe Generation**: Describe what you want to cook in natural language and get complete recipes with ingredients, instructions, and tips
- **Pantry Management**: Maintain an inventory of ingredients and get recipe suggestions based on what you have
- **Dietary Preferences**: Configure diet types, allergies, and favorite ingredients that the AI considers when generating recipes
- **Recipe Versioning**: Iterate on recipes with AI prompts while preserving the history of all changes
- **Recipe Library**: Save, search, and manage all your generated recipes

## Installation

Use the package manager [pip](https://pip.pypa.io/en/stable/) to install Remy's dependencies.

```bash
pip install -r requirements.txt
```

## Usage

1. **Set up a virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**: Copy `env.example` to `.env` and configure your settings:
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` and set:
   - `SECRET_KEY`: A secret key for Flask sessions
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_MODEL`: The OpenAI model to use (default: `gpt-5-nano`)

4. **Run the application**:
   ```bash
   python run.py
   ```

5. **Access the application**: Open your browser to `http://localhost:5000`

6. **Create an account**: Register a new account or log in to start generating recipes

7. **Generate recipes**: 
   - Add ingredients to your pantry
   - Configure your dietary preferences in settings
   - Use the recipe development page to describe what you want to cook
   - Refine recipes with follow-up prompts like "make it less spicy" or "add more vegetables"

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.
