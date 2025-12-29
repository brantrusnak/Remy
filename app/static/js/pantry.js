async function handleAddPantry(e) {
    e.preventDefault();
    
    const form = e.target;
    const input = document.getElementById('add-pantry-input');
    const btn = document.getElementById('add-pantry-btn');
    
    if (!input || !btn) {
        return;
    }
    
    const itemsText = input.value.trim();
    
    if (!itemsText) {
        showToast( 'Please enter at least one item.', 'error');
        return;
    }
    
    const parsedItems = itemsText
        .split(/[,\n]/)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0);
    
    const uniqueItems = [...new Set(parsedItems)];
    
    if (uniqueItems.length === 0) {
        showToast( 'Please enter at least one valid item.', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
        const response = await fetch('/pantry/items/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items: uniqueItems.join(',') })
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast( data.message || 'Items added successfully!', 'success');
            form.reset();
            await loadPantryItems();
        } else {
            showToast( data.error || 'Error adding items', 'error');
        }
    } catch (error) {
        showToast( 'Error adding items: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add to Pantry';
    }
}

function initializePantry() {
    loadPantryItems();
    
    const addPantryForm = document.getElementById('add-pantry-form');
    if (addPantryForm) {
        addPantryForm.addEventListener('submit', handleAddPantry);
    }
    
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-item-btn')) {
            const itemId = parseInt(e.target.getAttribute('data-item-id'));
            const itemName = e.target.getAttribute('data-item-name');
            removeItem(itemId, itemName);
        }
    });
}

document.addEventListener('content-ready', initializePantry);

async function loadPantryItems() {
    try {
        const response = await fetch('/pantry/items');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const items = await response.json();
        const formattedItems = items.map(item => 
            typeof item === 'string' ? {id: null, name: item} : item
        );
        displayPantryItems(formattedItems);
    } catch (error) {
        const display = document.getElementById('pantry-items-list');
        if (display) {
            display.innerHTML = '<p class="text-red-500 text-sm">Error loading pantry items: ' + escapeHtml(error.message) + '</p>';
        }
    }
}

function displayPantryItems(items) {
    const display = document.getElementById('pantry-items-list');
    const countEl = document.getElementById('item-count');
    
    if (!display) {
        return;
    }
    
    if (!items || items.length === 0) {
        display.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 mb-1">Your pantry is empty!</p>
                <p class="text-gray-400 text-sm">Add some ingredients below to get started</p>
            </div>
        `;
        if (countEl) countEl.textContent = '';
        return;
    }
    
    if (countEl) {
        countEl.textContent = `${items.length} ingredient${items.length !== 1 ? 's' : ''}`;
    }
    
    display.innerHTML = '<div class="flex flex-wrap gap-2">' + 
        items.map(item => {
            const itemId = (typeof item === 'object' && item.id !== null && item.id !== undefined) ? item.id : null;
            const itemName = (typeof item === 'object' && item.name) ? item.name : (typeof item === 'string' ? item : 'Unknown');
            const escapedName = escapeHtml(itemName);
            const escapedNameForJS = itemName.replace(/'/g, "\\'").replace(/"/g, '\\"');
            
            if (itemId !== null) {
                return `<div class="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700 flex items-center gap-2 border border-gray-200 hover:border-gray-300 transition-colors">
                    <span>${escapedName}</span>
                    <button data-item-id="${itemId}" data-item-name="${escapedNameForJS}" class="remove-item-btn text-gray-400 hover:text-red-500 font-bold text-lg leading-none transition-colors" title="Remove item">×</button>
                </div>`;
            } else {
                return `<div class="bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700 border border-gray-200">
                    <span>${escapedName}</span>
                </div>`;
            }
        }).join('') + 
        '</div>';
}

async function removeItem(itemId, itemName) {
    if (!confirm(`Remove "${itemName}" from your pantry?`)) {
        return;
    }

    try {
        const response = await fetch(`/pantry/items/${itemId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast( data.message || 'Item removed successfully!', 'success');
            await loadPantryItems();
        } else {
            showToast( data.error || 'Error removing item', 'error');
        }
    } catch (error) {
        showToast( 'Error removing item: ' + error.message, 'error');
    }
}
