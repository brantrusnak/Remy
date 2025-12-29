async function handleSavePreferences(e) {
    e.preventDefault();
    
    const dietType = document.getElementById('diet-type');
    const foodsToAvoid = document.getElementById('foods-to-avoid');
    const foodsILove = document.getElementById('foods-i-love');
    const btn = document.getElementById('save-preferences-btn');
    
    if (!dietType || !foodsToAvoid || !foodsILove || !btn) {
        return;
    }
    
    const formData = {
        diet_type: dietType.value,
        foods_to_avoid: foodsToAvoid.value.trim(),
        foods_i_love: foodsILove.value.trim()
    };

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const response = await fetch('/settings/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast('Preferences saved successfully!', 'success');
        } else {
            showToast(data.error || 'Error saving preferences', 'error');
        }
    } catch (error) {
        showToast('Error saving preferences: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Preferences';
    }
}

async function handleChangePassword(e) {
    e.preventDefault();
    
    const form = e.target;
    const currentPassword = document.getElementById('current-password');
    const newPassword = document.getElementById('new-password');
    const confirmPassword = document.getElementById('confirm-password');
    const btn = document.getElementById('save-password-btn');
    
    if (!currentPassword || !newPassword || !confirmPassword || !btn) {
        return;
    }
    
    const currentPasswordValue = currentPassword.value;
    const newPasswordValue = newPassword.value;
    const confirmPasswordValue = confirmPassword.value;
    
    if (newPasswordValue !== confirmPasswordValue) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (newPasswordValue.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Changing...';

    try {
        const response = await fetch('/settings/password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                current_password: currentPasswordValue,
                new_password: newPasswordValue,
                confirm_password: confirmPasswordValue
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            showToast('Password changed successfully!', 'success');
            form.reset();
        } else {
            showToast(data.error || 'Error changing password', 'error');
        }
    } catch (error) {
        showToast('Error changing password: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Change Password';
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.settings-tab').forEach(tab => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('text-[#c47a5a]', isActive);
        tab.classList.toggle('border-[#c47a5a]', isActive);
        tab.classList.toggle('text-gray-500', !isActive);
        tab.classList.toggle('border-transparent', !isActive);
    });
    
    document.querySelectorAll('.settings-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `panel-${tabName}`);
    });
}

function initializeSettings() {
    loadPreferences();
    
    const preferencesForm = document.getElementById('preferences-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', handleSavePreferences);
    }
    
    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handleChangePassword);
    }
    
    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            switchTab(tab.dataset.tab);
        });
    });
}

document.addEventListener('content-ready', initializeSettings);

async function loadPreferences() {
    const response = await fetch('/settings/preferences');
    const prefs = await response.json();
    document.getElementById('diet-type').value = prefs.diet_type || 'omnivore';
    document.getElementById('foods-to-avoid').value = prefs.foods_to_avoid || '';
    document.getElementById('foods-i-love').value = prefs.foods_i_love || '';
}
