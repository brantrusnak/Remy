function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let cachedRecipes = [];

function renderSidebarRecipes(recipes) {
    const sidebarList = document.getElementById('sidebar-recipes-list');
    if (!sidebarList) return;
    
    if (recipes.length === 0) {
        const searchInput = document.getElementById('sidebar-search');
        const hasSearchQuery = searchInput && searchInput.value.trim();
        sidebarList.innerHTML = hasSearchQuery 
            ? '<p class="text-sm text-gray-500">No matching recipes</p>'
            : '<p class="text-sm text-gray-500">No recipes yet</p>';
        return;
    }
    
    sidebarList.innerHTML = recipes.map(recipe => {
        const recipeId = recipe.id;
        const recipeTitle = recipe.title || recipe.name || 'Untitled';
        const currentPath = window.location.pathname;
        const isActive = currentPath === `/${recipeId}` || currentPath === `/${recipeId}/`;
        return `
            <a href="/${recipeId}" 
               class="block px-3 py-2 text-sm rounded-md hover:bg-gray-100 ${isActive ? 'bg-[#c47a5a]/10 text-[#a65d42] font-medium' : 'text-gray-700'}"
               title="${escapeHtml(recipeTitle)}">
                <div class="truncate">${escapeHtml(recipeTitle)}</div>
            </a>
        `;
    }).join('');
}

function filterSidebarRecipes(query) {
    if (!query.trim()) {
        renderSidebarRecipes(cachedRecipes);
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = cachedRecipes.filter(recipe => {
        const title = (recipe.title || recipe.name || '').toLowerCase();
        const description = (recipe.description || '').toLowerCase();
        return title.includes(lowerQuery) || description.includes(lowerQuery);
    });
    
    renderSidebarRecipes(filtered);
}

async function loadSidebarRecipes() {
    try {
        const response = await fetch('/recipes/list');
        const recipes = await response.json();
        cachedRecipes = recipes;
        
        const searchInput = document.getElementById('sidebar-search');
        if (searchInput && searchInput.value.trim()) {
            filterSidebarRecipes(searchInput.value);
        } else {
            renderSidebarRecipes(recipes);
        }
    } catch (error) {
        const sidebarList = document.getElementById('sidebar-recipes-list');
        if (sidebarList) {
            sidebarList.innerHTML = '<p class="text-sm text-red-500">Error loading recipes</p>';
        }
    }
}

function initSidebarSearch() {
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterSidebarRecipes(e.target.value);
        });
    }
}

document.addEventListener('DOMContentLoaded', initSidebarSearch);

