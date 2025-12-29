let activeRecipeData = null;
let currentVersionId = null;

function getRecipeData() {
    const dataScript = document.getElementById('recipe-data');
    if (dataScript) {
        try {
            return JSON.parse(dataScript.textContent);
        } catch {
            return null;
        }
    }
    return null;
}

function updateUrl(versionId) {
    const recipeData = getRecipeData();
    if (!recipeData) return;
    
    const url = new URL(window.location);
    if (versionId) {
        url.searchParams.set('version_id', versionId);
    } else {
        url.searchParams.delete('version_id');
    }
    history.replaceState(null, '', url);
}

function updateEditLink(versionId) {
    const editLink = document.getElementById('edit-link');
    if (!editLink) return;
    
    const recipeData = getRecipeData();
    if (!recipeData) return;
    
    const recipeId = recipeData.id;
    if (versionId) {
        editLink.href = `/recipes/${recipeId}/edit?version_id=${versionId}`;
    } else {
        editLink.href = `/recipes/${recipeId}/edit`;
    }
}

async function deleteRecipe(recipeId, recipeTitle) {
    if (!confirm(`Are you sure you want to delete "${recipeTitle}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/recipes/${recipeId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            alert(data.error || 'Error deleting recipe');
        }
    } catch (error) {
        alert('Error deleting recipe: ' + error.message);
    }
}

function updateRecipeDisplay(data) {
    activeRecipeData = data;
    
    const titleEl = document.getElementById('recipe-title');
    const descEl = document.getElementById('recipe-description');
    const ingredientsEl = document.getElementById('recipe-ingredients');
    const stepsEl = document.getElementById('recipe-steps');
    const tipsEl = document.getElementById('recipe-tips');
    const tipsSection = document.getElementById('recipe-tips-section');
    
    if (titleEl) titleEl.textContent = data.title;
    if (descEl) {
        descEl.textContent = data.description || '';
        descEl.classList.toggle('hidden', !data.description);
    }
    if (ingredientsEl) ingredientsEl.textContent = data.ingredients;
    if (stepsEl) stepsEl.textContent = data.steps;
    if (tipsEl) tipsEl.textContent = data.tips || '';
    if (tipsSection) tipsSection.classList.toggle('hidden', !data.tips);
}

async function loadVersion(versionId, clickedElement, updateBrowserUrl = true) {
    try {
        const response = await fetch(`/recipes/versions/${versionId}`);
        if (!response.ok) {
            throw new Error('Failed to load version');
        }
        const data = await response.json();
        updateRecipeDisplay(data);
        currentVersionId = versionId;
        updateEditLink(versionId);
        
        if (updateBrowserUrl) {
            updateUrl(versionId);
        }
        
        document.querySelectorAll('.version-item').forEach(item => {
            item.classList.remove('active');
        });
        if (clickedElement) {
            clickedElement.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading version:', error);
        alert('Failed to load version');
    }
}

function initializeView() {
    activeRecipeData = getRecipeData();
    
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const recipeId = deleteBtn.dataset.recipeId;
            const recipeTitle = deleteBtn.dataset.recipeTitle;
            deleteRecipe(recipeId, recipeTitle);
        });
    }
    
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printRecipe);
    }
    
    document.querySelectorAll('.version-item').forEach(item => {
        item.addEventListener('click', () => {
            const versionId = item.dataset.versionId;
            loadVersion(versionId, item);
        });
    });
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlVersionId = urlParams.get('version_id');
    
    if (urlVersionId) {
        const versionItem = document.querySelector(`.version-item[data-version-id="${urlVersionId}"]`);
        if (versionItem) {
            loadVersion(urlVersionId, versionItem, false);
        }
    } else {
        const activeVersion = document.querySelector('.version-item.active');
        if (activeVersion) {
            currentVersionId = activeVersion.dataset.versionId;
            updateEditLink(currentVersionId);
            updateUrl(currentVersionId);
        }
    }
}

document.addEventListener('content-ready', initializeView);

function printRecipe() {
    if (!activeRecipeData) return;
    
    const data = activeRecipeData;
    
    const tipsSection = data.tips ? `
        <div class="mt-8 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-lg">
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Tips</h2>
            <div class="prose max-w-none whitespace-pre-line text-gray-700">${escapeHtml(data.tips)}</div>
        </div>
    ` : '';
    
    const descriptionSection = data.description 
        ? `<p class="mt-2 text-lg text-gray-600">${escapeHtml(data.description)}</p>` 
        : '';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${escapeHtml(data.title)} - Recipe</title>
            <style>
                @page {
                    margin: 0.5cm;
                    size: letter;
                }
                
                * { box-sizing: border-box; }
                
                body {
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    background: #f9fafb;
                    margin: 0;
                    padding: 0;
                    line-height: 1.5;
                }
                
                .max-w-4xl { max-width: 56rem; margin: 0 auto; }
                .bg-white { background-color: #fff; }
                .rounded-lg { border-radius: 0.5rem; }
                .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
                .border { border-width: 1px; }
                .border-gray-200, .border-gray-100 { border-color: #e5e7eb; }
                .p-6 { padding: 1.5rem; }
                .pt-6 { padding-top: 1.5rem; }
                .flex { display: flex; }
                .grid { display: grid; }
                .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
                .gap-8 { gap: 2rem; }
                
                h1.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
                h2.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
                .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
                .font-bold { font-weight: 700; }
                .font-semibold { font-weight: 600; }
                .text-gray-900 { color: #111827; }
                .text-gray-700 { color: #374151; }
                .text-gray-600 { color: #4b5563; }
                
                .mb-3 { margin-bottom: 0.75rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-8 { margin-top: 2rem; }
                .border-t { border-top-width: 1px; }
                
                .prose { color: #374151; }
                .max-w-none { max-width: none; }
                .whitespace-pre-line { white-space: pre-line; }
                
                @media (min-width: 768px) {
                    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                }
                
                @media print {
                    body { background: white; }
                    .max-w-4xl { max-width: 100%; margin: 0; }
                    .bg-white { background: white; }
                    .rounded-lg, .shadow-sm, .border { border-radius: 0; box-shadow: none; border: none; }
                    .p-6 { padding: 0.5rem !important; }
                    
                    h1.text-3xl { font-size: 1.25rem !important; line-height: 1.5rem !important; }
                    h2.text-xl { font-size: 1rem !important; line-height: 1.25rem !important; }
                    .text-lg { font-size: 0.875rem !important; }
                    .mb-3 { margin-bottom: 0.5rem !important; }
                    .mt-8 { margin-top: 0.75rem !important; }
                    .pt-6 { padding-top: 0.5rem !important; }
                    .gap-8 { gap: 1rem !important; }
                    
                    .grid { grid-template-columns: 1fr 1fr !important; gap: 1rem !important; page-break-inside: avoid; }
                    .prose { font-size: 0.8125rem !important; line-height: 1.4 !important; }
                    h1, h2 { page-break-after: avoid; }
                    h2 + div, .prose { page-break-inside: avoid; }
                }
            </style>
        </head>
        <body>
            <div style="background: #f9fafb; min-height: 100vh; padding: 0.5rem 0;">
                <div class="max-w-4xl mx-auto">
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <div class="p-6 pb-0">
                            <h1 class="text-3xl font-bold text-gray-900 leading-tight">${escapeHtml(data.title)}</h1>
                            ${descriptionSection}
                        </div>
                        <div class="p-6 pt-6">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h2 class="text-xl font-semibold text-gray-900 mb-3">Ingredients</h2>
                                    <div class="prose max-w-none whitespace-pre-line text-gray-700">${escapeHtml(data.ingredients)}</div>
                                </div>
                                <div>
                                    <h2 class="text-xl font-semibold text-gray-900 mb-3">Instructions</h2>
                                    <div class="prose max-w-none whitespace-pre-line text-gray-700">${escapeHtml(data.steps)}</div>
                                </div>
                            </div>
                            ${tipsSection}
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    printWindow.addEventListener('load', () => {
        URL.revokeObjectURL(url);
        printWindow.focus();
        printWindow.print();
    });
}