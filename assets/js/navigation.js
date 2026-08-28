// navigation.js
// Core UI navigation: mobile menu, desktop header, search, back-to-top, account dropdown toggle
// Auth/reward logic is delegated to the auth-and-rewards.js module

(function() {
    'use strict';

    // ========== DOM Elements ==========
    const mobileToggle = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileClose = document.getElementById('mobileNavClose');
    const backToTop = document.getElementById('backToTop');
    const header = document.querySelector('.main-header');
    const mobileDropdownToggles = document.querySelectorAll('.mobile-nav-dropdown > button');
    const accountBtn = document.getElementById('accountBtn');
    const accountDropdown = document.getElementById('accountDropdown');
    const searchContainer = document.querySelector('.search-container');
    const searchForm = document.querySelector('.search-form');
    const searchBtn = document.querySelector('.search-btn');
    const searchClose = document.querySelector('.search-close-btn');
    const searchInput = document.querySelector('.search-input');

    let isMobileMenuOpen = false;

    // ========== Mobile Menu ==========
    function openMobileMenu() {
        if (!mobileNav) return;
        mobileNav.classList.add('active');
        mobileNav.removeAttribute('hidden');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        isMobileMenuOpen = true;
        if (mobileClose) mobileClose.focus();
    }

    function closeMobileMenu() {
        if (!mobileNav) return;
        mobileNav.classList.remove('active');
        if (mobileToggle) mobileToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        isMobileMenuOpen = false;
        if (mobileToggle) mobileToggle.focus();
    }

    function toggleMobileDropdown(button) {
        const parent = button.closest('.mobile-nav-dropdown');
        if (!parent) return;
        const menu = parent.querySelector('.mobile-dropdown-menu');
        const expanded = button.getAttribute('aria-expanded') === 'true' ? false : true;
        button.setAttribute('aria-expanded', expanded);
        if (menu) menu.classList.toggle('active', expanded);
    }

    // ========== Header Scroll Effect ==========
    window.addEventListener('scroll', () => {
        if (header) header.classList.toggle('scrolled', window.scrollY > 10);
        if (backToTop) backToTop.classList.toggle('visible', window.scrollY > 300);
    });

    if (backToTop) {
        backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ========== Smooth Anchor Scroll ==========
    document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            const targetEl = targetId ? document.querySelector(targetId) : null;
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.pushState(null, null, targetId);
            }
        });
    });

    // ========== Account Dropdown Toggle (UI only) ==========
    if (accountBtn) {
        accountBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Dispatch custom event so auth module knows to populate or sign in
            const isLoggedIn = window.GetUp && window.GetUp.isUserLoggedIn ? window.GetUp.isUserLoggedIn() : false;
            if (isLoggedIn) {
                accountDropdown?.classList.toggle('active');
            } else {
                // Ask auth module to show login modal
                const showAuthEvent = new CustomEvent('getup:showAuth', { detail: { panel: 'login' } });
                document.dispatchEvent(showAuthEvent);
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (accountDropdown && !accountDropdown.contains(e.target) && e.target !== accountBtn) {
            accountDropdown.classList.remove('active');
        }
    });

    // ========== Search (Mobile & Desktop) ==========
    function submitSearch() {
        if (searchInput && searchInput.value.trim() !== '' && searchForm) {
            searchForm.submit();
        } else if (searchInput) {
            const originalPlaceholder = searchInput.placeholder;
            searchInput.placeholder = 'Enter a search term...';
            setTimeout(() => { searchInput.placeholder = originalPlaceholder; }, 1500);
        }
    }

    if (searchBtn && searchContainer) {
        searchBtn.addEventListener('click', function(e) {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) return;
            e.preventDefault();
            if (!searchContainer.classList.contains('search-open')) {
                searchContainer.classList.add('search-open');
                if (searchInput) searchInput.focus();
            } else {
                submitSearch();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const isMobile = window.innerWidth <= 768;
                if (isMobile && !searchContainer.classList.contains('search-open')) {
                    e.preventDefault();
                    searchContainer.classList.add('search-open');
                    searchInput.focus();
                } else {
                    e.preventDefault();
                    submitSearch();
                }
            }
        });
    }

    if (searchClose) {
        searchClose.addEventListener('click', function(e) {
            e.preventDefault();
            if (searchContainer) {
                searchContainer.classList.remove('search-open');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.blur();
                }
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768 && searchContainer && searchContainer.classList.contains('search-open')) {
            if (!searchContainer.contains(e.target)) {
                searchContainer.classList.remove('search-open');
                if (searchInput) searchInput.blur();
            }
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchContainer && searchContainer.classList.contains('search-open')) {
            searchContainer.classList.remove('search-open');
            if (searchInput) searchInput.blur();
        }
    });

    // ========== Event Binding ==========
    if (mobileToggle) mobileToggle.addEventListener('click', openMobileMenu);
    if (mobileClose) mobileClose.addEventListener('click', closeMobileMenu);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isMobileMenuOpen) closeMobileMenu();
    });
    document.addEventListener('click', (e) => {
        if (isMobileMenuOpen && mobileNav && !mobileNav.contains(e.target) && e.target !== mobileToggle && !mobileToggle?.contains(e.target)) {
            closeMobileMenu();
        }
    });
    mobileDropdownToggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMobileDropdown(btn);
        });
    });

    // Ensure mobile nav starts hidden
    if (mobileNav && !mobileNav.classList.contains('active')) {
        mobileNav.setAttribute('hidden', '');
    }
    const navObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            if (m.attributeName === 'class') {
                if (mobileNav.classList.contains('active')) mobileNav.removeAttribute('hidden');
                else mobileNav.setAttribute('hidden', '');
            }
        });
    });
    if (mobileNav) navObserver.observe(mobileNav, { attributes: true });

})();