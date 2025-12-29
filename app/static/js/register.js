document.addEventListener('content-ready', () => {
    const steps = document.querySelectorAll('.register-step');
    const dots = document.querySelectorAll('.step-dot');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    const stepHeaders = {
        1: { title: 'Join Remy', subtitle: 'Create your account' },
        2: { title: 'Almost there!', subtitle: 'Customize your experience' },
        3: { title: 'One more step!', subtitle: 'Stock your pantry' }
    };
    
    function showStep(stepNumber) {
        steps.forEach(step => {
            step.classList.remove('active', 'animate');
            if (parseInt(step.dataset.step) === stepNumber) {
                step.classList.add('active', 'animate');
            }
        });
        
        dots.forEach(dot => {
            const dotStep = parseInt(dot.dataset.step);
            dot.classList.remove('active', 'bg-[#c47a5a]', 'bg-emerald-500', 'bg-gray-200');
            
            if (dotStep === stepNumber) {
                dot.classList.add('active', 'bg-[#c47a5a]');
            } else if (dotStep < stepNumber) {
                dot.classList.add('bg-emerald-500');
            } else {
                dot.classList.add('bg-gray-200');
            }
        });
        
        headerTitle.textContent = stepHeaders[stepNumber].title;
        headerSubtitle.textContent = stepHeaders[stepNumber].subtitle;
    }
    
    function goToMain() {
        window.location.href = '/';
    }
    
    const registerForm = document.getElementById('register-form');
    const registerBtn = document.getElementById('register-btn');
    
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating account...';
        
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value
        };
        
        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                if (typeof showToast === 'function') {
                    showToast('Welcome, ' + data.username + '!', 'success');
                }
                showStep(2);
            } else {
                if (typeof showToast === 'function') {
                    showToast(data.error || 'Registration failed', 'error');
                }
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (typeof showToast === 'function') {
                showToast('An error occurred. Please try again.', 'error');
            }
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
    });
    
    const preferencesForm = document.getElementById('preferences-form');
    const savePrefsBtn = document.getElementById('save-prefs-btn');
    const skipPrefs = document.getElementById('skip-prefs');
    
    preferencesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        savePrefsBtn.disabled = true;
        savePrefsBtn.textContent = 'Saving...';
        
        const formData = {
            diet_type: document.getElementById('diet-type').value,
            foods_to_avoid: document.getElementById('foods-to-avoid').value,
            foods_i_love: document.getElementById('foods-i-love').value
        };
        
        try {
            const response = await fetch('/settings/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            if (response.ok) {
                showStep(3);
            } else {
                const data = await response.json();
                if (typeof showToast === 'function') {
                    showToast(data.error || 'Failed to save preferences', 'error');
                }
            }
        } catch (error) {
            console.error('Preferences error:', error);
            if (typeof showToast === 'function') {
                showToast('An error occurred', 'error');
            }
        }
        
        savePrefsBtn.disabled = false;
        savePrefsBtn.textContent = 'Continue';
    });
    
    skipPrefs.addEventListener('click', (e) => {
        e.preventDefault();
        showStep(3);
    });
    
    const pantryForm = document.getElementById('pantry-form');
    const finishBtn = document.getElementById('finish-btn');
    const skipPantry = document.getElementById('skip-pantry');
    const backToPrefs = document.getElementById('back-to-prefs');
    
    backToPrefs.addEventListener('click', (e) => {
        e.preventDefault();
        showStep(2);
    });
    
    pantryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pantryItems = document.getElementById('pantry-items').value.trim();
        
        if (pantryItems) {
            finishBtn.disabled = true;
            finishBtn.textContent = 'Setting up...';
            
            try {
                const response = await fetch('/pantry/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: pantryItems })
                });
                
                if (response.ok) {
                    if (typeof showToast === 'function') {
                        showToast('You\'re all set!', 'success');
                    }
                    setTimeout(goToMain, 1500);
                } else {
                    const data = await response.json();
                    if (typeof showToast === 'function') {
                        showToast(data.error || 'Failed to save pantry', 'error');
                    }
                    finishBtn.disabled = false;
                    finishBtn.textContent = 'Start Cooking!';
                }
            } catch (error) {
                console.error('Pantry error:', error);
                if (typeof showToast === 'function') {
                    showToast('An error occurred', 'error');
                }
                finishBtn.disabled = false;
                finishBtn.textContent = 'Start Cooking!';
            }
        } else {
            goToMain();
        }
    });
    
    skipPantry.addEventListener('click', (e) => {
        e.preventDefault();
        goToMain();
    });
});

