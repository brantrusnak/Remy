let currentVersionId = null;
let currentRecipeId = null;
let conversationHistory = [];

async function loadVersionHistory() {
    const versionsList = document.getElementById('versions-list');
    versionsList.innerHTML = '';
    
    if (!currentRecipeId) {
        versionsList.innerHTML = '<p class="text-gray-500 text-sm">Start a conversation to generate a recipe...</p>';
        return;
    }
    
    try {
        const response = await fetch(`/recipes/versions?recipe_id=${currentRecipeId}`);
        const versions = await response.json();
        
        if (versions.length === 0) {
            versionsList.innerHTML = '<p class="text-gray-500 text-sm">No versions yet</p>';
            return;
        }
        
        versions.forEach(version => {
            const versionItem = document.createElement('div');
            const isActive = currentVersionId && currentVersionId == version.id;
            versionItem.className = `p-2 border rounded-md cursor-pointer ${
                isActive 
                    ? 'bg-[#c47a5a]/10 border-[#c47a5a]' 
                    : 'border-gray-200 hover:bg-gray-50'
            }`;
            versionItem.dataset.versionId = version.id;
            versionItem.innerHTML = `
                <div class="text-sm font-medium text-gray-900">v${version.version}</div>
                <div class="text-xs text-gray-500">${version.title}</div>
            `;
            versionItem.addEventListener('click', (e) => loadVersion(version.id, e.currentTarget));
            versionsList.appendChild(versionItem);
        });
    } catch {
        versionsList.innerHTML = '<p class="text-red-500 text-sm">Error loading versions</p>';
    }
}

function updateUrl(versionId) {
    const url = new URL(window.location);
    if (versionId) {
        url.searchParams.set('version_id', versionId);
    } else {
        url.searchParams.delete('version_id');
    }
    history.replaceState(null, '', url);
    
    const backLink = document.getElementById('back-link');
    if (backLink && currentRecipeId) {
        const backUrl = `/${currentRecipeId}${versionId ? '?version_id=' + versionId : ''}`;
        backLink.href = backUrl;
    }
}

async function loadVersion(versionId, clickedElement) {
    const response = await fetch(`/recipes/versions/${versionId}`);
    const version = await response.json();
    
    currentVersionId = version.id;
    if (version.recipe_id) {
        currentRecipeId = version.recipe_id;
    }
    
    displayRecipe(version);
    updateUrl(versionId);
    addMessage('Editing recipe: ' + version.title, 'system');
    
    document.querySelectorAll('#versions-list > div').forEach(item => {
        item.classList.remove('bg-[#c47a5a]/10', 'border-[#c47a5a]');
        item.classList.add('border-gray-200', 'hover:bg-gray-50');
    });
    if (clickedElement) {
        clickedElement.classList.remove('border-gray-200', 'hover:bg-gray-50');
        clickedElement.classList.add('bg-[#c47a5a]/10', 'border-[#c47a5a]');
    }
}

function stripStepNumber(step) {
    // I didn't want to remove the step numbers from the recipe itself because it may be useful at some point later.
    return step.replace(/^\d+[.)]\s*/, '').trim();
}

function stripIngredientMarker(ingredient) {
    // I didn't want to remove the ingredient markers from the recipe itself because it may be useful at some point later.
    return ingredient.replace(/^[-•*–—]\s*/, '').trim();
}

function displayRecipe(recipe) {
    const recipeContent = document.getElementById('recipe-content');
    
    let html = `<h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(recipe.title)}</h3>`;
    
    if (recipe.description) {
        html += `<p class="text-gray-700 mb-4">${escapeHtml(recipe.description)}</p>`;
    }
    
    html += `<div class="mb-4"><h4 class="font-semibold text-gray-900 mb-2">Ingredients:</h4><ul class="list-disc list-inside text-gray-700">`;
    if (typeof recipe.ingredients === 'string') {
        recipe.ingredients.split('\n').forEach(ing => {
            if (ing.trim()) {
                const cleanedIng = stripIngredientMarker(ing.trim());
                html += `<li>${escapeHtml(cleanedIng)}</li>`;
            }
        });
    } else if (Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(ing => {
            const cleanedIng = stripIngredientMarker(ing);
            html += `<li>${escapeHtml(cleanedIng)}</li>`;
        });
    }
    html += `</ul></div>`;
    
    html += `<div class="mb-4"><h4 class="font-semibold text-gray-900 mb-2">Steps:</h4><ol class="list-decimal list-inside text-gray-700">`;
    if (typeof recipe.steps === 'string') {
        recipe.steps.split('\n').forEach(step => {
            if (step.trim()) {
                const cleanedStep = stripStepNumber(step.trim());
                html += `<li>${escapeHtml(cleanedStep)}</li>`;
            }
        });
    } else if (Array.isArray(recipe.steps)) {
        recipe.steps.forEach(step => {
            const cleanedStep = stripStepNumber(step);
            html += `<li>${escapeHtml(cleanedStep)}</li>`;
        });
    }
    html += `</ol></div>`;
    
    if (recipe.tips) {
        html += `<div class="mt-4 p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-lg"><h4 class="font-semibold text-gray-900 mb-2">Tips:</h4><p class="text-gray-700">${escapeHtml(recipe.tips)}</p></div>`;
    }
    
    recipeContent.innerHTML = html;
}

function addMessage(text, type = 'user') {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    
    let alignClass, bubbleClass;
    
    if (type === 'system') {
        alignClass = 'text-center';
        bubbleClass = 'inline-block px-4 py-2 rounded-lg text-sm bg-gradient-to-br from-amber-50 to-orange-50 text-gray-700 border border-amber-100';
    } else if (type === 'user') {
        alignClass = 'text-right';
        bubbleClass = 'inline-block px-4 py-2 rounded-lg max-w-[80%] bg-[#c47a5a] text-white';
    } else {
        alignClass = 'text-left';
        bubbleClass = 'inline-block px-4 py-2 rounded-lg max-w-[80%] bg-white text-gray-900 border border-gray-300';
    }
    
    messageDiv.className = `mb-3 ${alignClass}`;
    
    const messageBubble = document.createElement('div');
    messageBubble.className = bubbleClass;
    messageBubble.textContent = text;
    
    messageDiv.appendChild(messageBubble);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function lockUI() {
    document.body.classList.add('generating');
    
    const versionHistory = document.getElementById('version-history');
    if (versionHistory) {
        versionHistory.style.pointerEvents = 'none';
        versionHistory.style.opacity = '0.5';
    }
    
    const sidebar = document.querySelector('aside');
    if (sidebar) {
        sidebar.style.pointerEvents = 'none';
        sidebar.style.opacity = '0.5';
    }
    
    const backLink = document.getElementById('back-link');
    if (backLink) {
        backLink.style.pointerEvents = 'none';
        backLink.style.opacity = '0.5';
    }
}

function unlockUI() {
    document.body.classList.remove('generating');
    
    const versionHistory = document.getElementById('version-history');
    if (versionHistory) {
        versionHistory.style.pointerEvents = '';
        versionHistory.style.opacity = '';
    }
    
    const sidebar = document.querySelector('aside');
    if (sidebar) {
        sidebar.style.pointerEvents = '';
        sidebar.style.opacity = '';
    }
    
    const backLink = document.getElementById('back-link');
    if (backLink) {
        backLink.style.pointerEvents = '';
        backLink.style.opacity = '';
    }
}

function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
    lockUI();
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    unlockUI();
}

async function handleSend() {
    const input = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const prompt = input.value.trim();
    
    if (!prompt) {
        return;
    }
    
    sendButton.disabled = true;
    input.disabled = true;
    sendButton.textContent = 'Sending...';
    
    showLoadingOverlay();
    
    addMessage(prompt, 'user');
    conversationHistory.push({ role: 'user', content: prompt });
    
    input.value = '';
    
    try {
        const requestBody = { prompt: prompt };
        if (currentRecipeId) {
            requestBody.recipe_id = currentRecipeId;
        }
        if (currentVersionId) {
            requestBody.version_id = currentVersionId;
        }
        
        const response = await fetch('/recipes/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            addMessage('Recipe generated!', 'assistant');
            
            displayRecipe(data.recipe);
            currentVersionId = data.version_id || data.version;
            currentRecipeId = data.recipe_id;
            
            await loadVersionHistory();
            
            if (typeof loadSidebarRecipes === 'function') {
                loadSidebarRecipes();
            }
        } else {
            addMessage(`Error: ${data.error || 'Failed to generate recipe'}`, 'assistant');
        }
    } catch (error) {
        addMessage(`Error: ${error.message}`, 'assistant');
    } finally {
        hideLoadingOverlay();
        
        sendButton.disabled = false;
        input.disabled = false;
        sendButton.textContent = 'Send';
        input.focus();
    }
}

function getEditRecipeData() {
    const dataScript = document.getElementById('edit-recipe-data');
    if (dataScript) {
        try {
            return JSON.parse(dataScript.textContent);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function initializeWhenReady() {
    const sendButton = document.getElementById('send-button');
    const userInput = document.getElementById('user-input');
    
    if (!sendButton || !userInput) {
        console.error('Required elements not found: send-button or user-input');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersionId = urlParams.get('version_id');
    
    const editRecipeData = getEditRecipeData();
    if (editRecipeData) {
        currentRecipeId = editRecipeData.recipe_id || editRecipeData.id;
        
        if (urlVersionId) {
            currentVersionId = parseInt(urlVersionId);
        }
        
        displayRecipe(editRecipeData);
        
        addMessage('Editing recipe: ' + editRecipeData.title, 'system');
        
        loadVersionHistory();
    } else {
        currentRecipeId = null;
        currentVersionId = null;
        conversationHistory = [];
        
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        const recipeContent = document.getElementById('recipe-content');
        if (recipeContent) {
            recipeContent.innerHTML = '<p>Start a conversation to generate a recipe...</p>';
        }
        
        loadVersionHistory();
    }
    
    sendButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        handleSend();
    });
    
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    });
}

function setupFullHeight() {
    const contentWrapper = document.getElementById('content-wrapper');
    if (contentWrapper) {
        contentWrapper.classList.add('develop-page');
    }
}

function initializePage() {
    setupFullHeight();
    initializeWhenReady();
}

document.addEventListener('content-ready', initializePage);

