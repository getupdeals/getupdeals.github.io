// assets/js/optimizations.js
/**
 * Optimizations – Performance enhancements: lazy loading, debouncing,
 * resource hints, and other speed optimizations.
 */
(function() {
    'use strict';

    // ==================== Configuration ====================
    const LAZY_CLASS = 'lazy';
    const DATA_SRC_ATTR = 'data-src';
    const DATA_SRCSET_ATTR = 'data-srcset';
    const DATA_BG_ATTR = 'data-bg';

    // IntersectionObserver options
    const OBSERVER_OPTIONS = {
        rootMargin: '50px 0px', // start loading when within 50px of viewport
        threshold: 0.01
    };

    // ==================== State ====================
    let lazyObserver;

    // ==================== Lazy Loading ====================

    /**
     * Load an image element from data attributes.
     * @param {HTMLImageElement} img - Image element
     */
    function loadImage(img) {
        const src = img.getAttribute(DATA_SRC_ATTR);
        const srcset = img.getAttribute(DATA_SRCSET_ATTR);

        if (src) {
            img.src = src;
            img.removeAttribute(DATA_SRC_ATTR);
        }
        if (srcset) {
            img.srcset = srcset;
            img.removeAttribute(DATA_SRCSET_ATTR);
        }

        // Add loaded class for potential styling
        img.classList.add('loaded');
    }

    /**
     * Load a background image element.
     * @param {HTMLElement} element - Element with data-bg attribute
     */
    function loadBackground(element) {
        const bgUrl = element.getAttribute(DATA_BG_ATTR);
        if (bgUrl) {
            element.style.backgroundImage = `url('${bgUrl}')`;
            element.removeAttribute(DATA_BG_ATTR);
            element.classList.add('bg-loaded');
        }
    }

    /**
     * IntersectionObserver callback.
     * @param {IntersectionObserverEntry[]} entries
     * @param {IntersectionObserver} observer
     */
    function onIntersection(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;

                if (target.tagName === 'IMG') {
                    loadImage(target);
                } else if (target.hasAttribute(DATA_BG_ATTR)) {
                    loadBackground(target);
                }

                observer.unobserve(target);
            }
        });
    }

    /**
     * Initialize lazy loading using IntersectionObserver.
     */
    function initLazyLoading() {
        // Check if IntersectionObserver is supported
        if (!('IntersectionObserver' in window)) {
            // Fallback: load all images immediately
            document.querySelectorAll(`img[${DATA_SRC_ATTR}], [${DATA_BG_ATTR}]`).forEach(el => {
                if (el.tagName === 'IMG') loadImage(el);
                else loadBackground(el);
            });
            return;
        }

        lazyObserver = new IntersectionObserver(onIntersection, OBSERVER_OPTIONS);

        // Observe images with data-src
        document.querySelectorAll(`img[${DATA_SRC_ATTR}]`).forEach(img => {
            lazyObserver.observe(img);
        });

        // Observe elements with data-bg (background images)
        document.querySelectorAll(`[${DATA_BG_ATTR}]`).forEach(el => {
            lazyObserver.observe(el);
        });

        // Also observe images that have loading="lazy" but no data-src
        // (they may have regular src, but we can optionally replace with data-src)
        // We'll leave them as is; browser handles loading="lazy".
    }

    /**
     * Refresh lazy loading (useful when new content is added dynamically).
     */
    function refreshLazyLoading() {
        if (lazyObserver) {
            document.querySelectorAll(`img[${DATA_SRC_ATTR}], [${DATA_BG_ATTR}]`).forEach(el => {
                lazyObserver.observe(el);
            });
        }
    }

    // ==================== Debouncing ====================

    /**
     * Debounce function to limit execution rate.
     * @param {Function} func - Function to debounce
     * @param {number} wait - Milliseconds to wait
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Initialize scroll/resize optimizations (e.g., for performance).
     */
    function initScrollOptimizations() {
        // Example: add class to body when scrolling (for throttling heavy operations)
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    // Perform any scroll-related updates here if needed
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Debounced resize handler (example: adjust layout)
        const handleResize = debounce(() => {
            // You can trigger custom events or layout adjustments here
            // e.g., check if mobile view changed
        }, 150);
        window.addEventListener('resize', handleResize);
    }

    // ==================== Resource Hints ====================

    /**
     * Preload critical resources (fonts, images, etc.)
     */
    function preloadCritical() {
        // Preload fonts (if not already preloaded via link headers or link tags)
        const fontPreloads = [
            { href: './assets/fonts/Inter/Inter.woff2', as: 'font', type: 'font/woff2' },
            { href: './assets/fonts/Poppins/Poppins.woff2', as: 'font', type: 'font/woff2' }
        ];

        fontPreloads.forEach(font => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = font.href;
            link.as = font.as;
            link.type = font.type;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        });

        // Preload critical images (like hero image) if not already preloaded
        const heroImage = document.querySelector('.hero-image img');
        if (heroImage && heroImage.src) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = heroImage.src;
            link.as = 'image';
            document.head.appendChild(link);
        }
    }

    // ==================== Defer Non-Critical JavaScript ====================

    /**
     * Defer loading of non-critical scripts.
     * This can be used to load additional scripts after page load.
     */
    function deferScripts() {
        // Example: load additional scripts after load
        window.addEventListener('load', () => {
            // Load non-critical scripts (e.g., social widgets, chat)
            // const script = document.createElement('script');
            // script.src = '...';
            // document.body.appendChild(script);
        });
    }

    // ==================== Initialization ====================

    function init() {
        initLazyLoading();
        initScrollOptimizations();
        preloadCritical();
        deferScripts();

        // Expose refresh method for dynamic content (e.g., after deals-loader adds new images)
        window.refreshLazyLoading = refreshLazyLoading;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();