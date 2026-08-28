// assets/js/theme-switcher.js
/**
 * Theme Switcher – Handles light/dark theme toggling with localStorage persistence.
 * Also listens to system preference changes and updates accordingly.
 */
(function() {
    'use strict';
    
    // ==================== Configuration ====================
    const STORAGE_KEY = 'getupdeals-theme';
    const htmlElement = document.documentElement;
    
    // DOM elements
    const themeToggle = document.getElementById('themeToggle'); // Desktop toggle
    const mobileSwitch = document.getElementById('themeSwitchMobile'); // Mobile footer switch
    
    // ==================== Helper Functions ====================
    
    /**
     * Get the user's preferred theme based on stored preference or system.
     * @returns {string} 'dark' or 'light'
     */
    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'dark' || stored === 'light') {
            return stored;
        }
        // No stored preference – check system
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    /**
     * Apply the given theme to the document and update localStorage.
     * @param {string} theme - 'dark' or 'light'
     */
    function setTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        updateToggleUI(theme);
    }
    
    /**
     * Toggle between dark and light themes.
     */
    function toggleTheme() {
        const current = htmlElement.getAttribute('data-theme') || 'light';
        const newTheme = current === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }
    
    /**
     * Update any toggle UI that isn't handled purely by CSS.
     * (Mobile switch text may need manual update.)
     * @param {string} theme - Current theme
     */
    function updateToggleUI(theme) {
        if (!mobileSwitch) return;
        
        const iconSpan = mobileSwitch.querySelector('.theme-icon i');
        if (iconSpan) {
            iconSpan.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        // Update the text (the button may contain extra text)
        // We assume the button structure: <span class="theme-icon">...</span> Some Text
        // We'll replace the whole content to keep it simple.
        const textNode = mobileSwitch.childNodes[1]; // May be tricky; safer to rebuild.
        if (theme === 'dark') {
            mobileSwitch.innerHTML = '<span class="theme-icon"><i class="fas fa-sun"></i></span> Light Mode';
        } else {
            mobileSwitch.innerHTML = '<span class="theme-icon"><i class="fas fa-moon"></i></span> Dark Mode';
        }
    }
    
    // ==================== Initialization ====================
    
    function init() {
        // Set initial theme
        const initialTheme = getPreferredTheme();
        setTheme(initialTheme);
        
        // Attach event listeners to toggle buttons
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        if (mobileSwitch) {
            mobileSwitch.addEventListener('click', toggleTheme);
        }
        
        // Listen for system theme changes (e.g., user changes OS preference)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only apply system change if user hasn't explicitly set a preference
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    // Run after DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();