document.addEventListener('DOMContentLoaded', function() {
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenuDropdown = document.getElementById('user-menu-dropdown');
    const userMenuContainer = document.getElementById('user-menu-container');
    
    if (userMenuButton && userMenuDropdown) {
        userMenuButton.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenuDropdown.classList.toggle('hidden');
        });
        
        document.addEventListener('click', function(e) {
            if (userMenuContainer && !userMenuContainer.contains(e.target)) {
                userMenuDropdown.classList.add('hidden');
            }
        });
        
        const menuItems = userMenuDropdown.querySelectorAll('a');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                userMenuDropdown.classList.add('hidden');
            });
        });
    }

    if (typeof loadSidebarRecipes === 'function') {
        loadSidebarRecipes();
    }
    
    const contentBlock = document.querySelector('[data-content-block]');
    if (contentBlock) {
        const wrapper = document.getElementById('content-wrapper');
        if (wrapper) {
            wrapper.innerHTML = contentBlock.innerHTML;
            contentBlock.remove();
        }
    }
    
    // Dispatch a custom event to notify other scripts that the content is ready.
    document.dispatchEvent(new CustomEvent('content-ready'));
});

