// assets/js/analytics.js
/**
 * Analytics – Centralized tracking for Google Analytics 4,
 * Facebook Pixel, and custom events with privacy compliance.
 */
(function() {
    'use strict';

    // ==================== Configuration ====================
    const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with your GA4 ID
    const FB_PIXEL_ID = 'XXXXXXXXXXXXXXXXX'; // Replace with your Pixel ID
    const DATA_LAYER_NAME = 'dataLayer';

    // Consent state
    let analyticsEnabled = false;
    let adsEnabled = false;

    // Queue for events before consent
    const eventQueue = [];

    // ==================== Initialize Tracking ====================

    /**
     * Load Google Analytics 4 script.
     */
    function loadGA4() {
        if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === 'G-XXXXXXXXXX') return;

        // Load gtag script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        window.gtag = function() { dataLayer.push(arguments); };

        // Set default consent state
        window.gtag('consent', 'default', {
            'analytics_storage': analyticsEnabled ? 'granted' : 'denied',
            'ad_storage': adsEnabled ? 'granted' : 'denied',
            'wait_for_update': 500
        });

        // Initialize GA4
        window.gtag('js', new Date());
        window.gtag('config', GA_MEASUREMENT_ID, {
            'send_page_view': false, // manual pageview
            'anonymize_ip': true,
            'allow_google_signals': false,
            'allow_ad_personalization_signals': false
        });
    }

    /**
     * Load Facebook Pixel script.
     */
    function loadFacebookPixel() {
        if (!FB_PIXEL_ID || FB_PIXEL_ID === 'XXXXXXXXXXXXXXXXX') return;

        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', FB_PIXEL_ID);
        fbq('consent', analyticsEnabled ? 'grant' : 'revoke');
        fbq('track', 'PageView');
    }

    /**
     * Initialize tracking based on consent.
     */
    function initTracking() {
        // Listen for cookie consent changes
        document.addEventListener('cookieConsent', (e) => {
            const choice = e.detail.choice; // 'accepted' or 'declined'
            analyticsEnabled = (choice === 'accepted');
            adsEnabled = (choice === 'accepted'); // you can separate if needed

            // Update consent for analytics
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'analytics_storage': analyticsEnabled ? 'granted' : 'denied',
                    'ad_storage': analyticsEnabled ? 'granted' : 'denied'
                });
            }
            if (window.fbq) {
                fbq('consent', analyticsEnabled ? 'grant' : 'revoke');
            }

            // Process queued events
            if (analyticsEnabled) {
                while (eventQueue.length) {
                    const { type, data } = eventQueue.shift();
                    sendEvent(type, data);
                }
            }
        });

        // Check initial consent from localStorage
        const consent = localStorage.getItem('getupdeals-cookie-consent');
        analyticsEnabled = (consent === 'accepted');
        adsEnabled = (consent === 'accepted');

        // Load scripts (they will use the current consent)
        loadGA4();
        loadFacebookPixel();

        // Send initial page view
        trackPageView();
    }

    // ==================== Event Tracking ====================

    /**
     * Internal function to send event to all platforms.
     * @param {string} type - Event type (pageview, click, etc.)
     * @param {Object} data - Event data
     */
    function sendEvent(type, data) {
        if (!analyticsEnabled) return;

        // GA4
        if (window.gtag) {
            if (type === 'pageview') {
                window.gtag('config', GA_MEASUREMENT_ID, {
                    'page_title': data.title || document.title,
                    'page_location': data.url || window.location.href,
                    'page_path': data.path || window.location.pathname
                });
            } else {
                window.gtag('event', type, data);
            }
        }

        // Facebook Pixel
        if (window.fbq) {
            if (type === 'pageview') {
                fbq('track', 'PageView');
            } else {
                fbq('track', type, data);
            }
        }
    }

    /**
     * Track a page view.
     */
    function trackPageView() {
        const data = {
            title: document.title,
            url: window.location.href,
            path: window.location.pathname
        };

        if (!analyticsEnabled) {
            eventQueue.push({ type: 'pageview', data });
            return;
        }

        sendEvent('pageview', data);
    }

    /**
     * Track a custom event.
     * @param {string} eventName - Name of the event
     * @param {Object} params - Additional parameters
     */
    function trackEvent(eventName, params = {}) {
        if (!analyticsEnabled) {
            eventQueue.push({ type: eventName, data: params });
            return;
        }

        sendEvent(eventName, params);
    }

    // ==================== Auto-track Events ====================

    /**
     * Track outbound link clicks.
     */
    function trackOutboundLinks() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="http"]:not([href*="' + window.location.hostname + '"])');
            if (link) {
                trackEvent('click', {
                    link_text: link.textContent.trim(),
                    link_url: link.href,
                    link_domain: new URL(link.href).hostname
                });
            }
        });
    }

    /**
     * Track affiliate link clicks (from affiliate-integrations.js).
     */
    function trackAffiliateClicks() {
        document.addEventListener('affiliateClick', (e) => {
            const deal = e.detail;
            trackEvent('affiliate_click', {
                deal_id: deal.dealId,
                store: deal.store,
                category: deal.category,
                price: deal.price
            });
        });
    }

    /**
     * Track search queries.
     */
    function trackSearch() {
        const searchForms = document.querySelectorAll('form[role="search"]');
        searchForms.forEach(form => {
            form.addEventListener('submit', (e) => {
                const input = form.querySelector('input[type="search"]');
                if (input && input.value) {
                    trackEvent('search', {
                        search_term: input.value,
                        search_location: window.location.pathname
                    });
                }
            });
        });
    }

    /**
     * Track newsletter signup.
     */
    function trackNewsletter() {
        const newsletterForm = document.getElementById('newsletterForm');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                const emailInput = newsletterForm.querySelector('input[type="email"]');
                if (emailInput && emailInput.value) {
                    trackEvent('newsletter_signup', {
                        email_hash: simpleHash(emailInput.value) // anonymize
                    });
                }
            });
        }
    }

    // Simple hash for email anonymization
    function simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    // ==================== Initialization ====================

    function init() {
        initTracking();
        trackOutboundLinks();
        trackAffiliateClicks();
        trackSearch();
        trackNewsletter();

        // Expose public API
        window.analytics = {
            trackEvent: trackEvent,
            trackPageView: trackPageView
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();