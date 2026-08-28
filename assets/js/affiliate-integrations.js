// assets/js/affiliate-integrations.js
/**
 * Affiliate Integrations – Tracks affiliate link clicks,
 * sends data to analytics, and manages redirects with proper
 * tracking parameters.
 */
(function() {
    'use strict';

    // ==================== Configuration ====================
    const TRACKING_API = './api/affiliate/track-click.php'; // endpoint for tracking
    const DEFAULT_REDIRECT_DELAY = 100; // ms before redirect (allow tracking)
    const STORAGE_KEYS = {
        CLICKED_DEALS: 'getupdeals-clicked-deals',
        LAST_CLICK: 'getupdeals-last-click'
    };

    // ==================== State ====================
    let clickQueue = []; // queue for pending tracking events
    let isProcessing = false;

    // ==================== Helper Functions ====================

    /**
     * Get UTM parameters for tracking.
     * @param {Object} deal - Deal information
     * @returns {string} - UTM parameters string
     */
    function getUTMParameters(deal) {
        const params = new URLSearchParams({
            utm_source: 'getupdeals',
            utm_medium: 'affiliate',
            utm_campaign: deal.store || 'general',
            utm_content: deal.dealId || '',
            utm_term: deal.category || ''
        });
        return params.toString();
    }

    /**
     * Build affiliate URL with tracking parameters.
     * @param {string} baseUrl - Original affiliate URL
     * @param {Object} deal - Deal information
     * @returns {string} - URL with tracking parameters
     */
    function buildAffiliateUrl(baseUrl, deal) {
        if (!baseUrl || baseUrl === '#') return '#';

        try {
            const url = new URL(baseUrl);
            const utmParams = getUTMParameters(deal);

            // Append UTM parameters if not already present
            if (!url.searchParams.has('utm_source')) {
                url.search = url.search ? url.search + '&' + utmParams : '?' + utmParams;
            }

            // Add click ID for internal tracking (optional)
            url.searchParams.set('ref', 'getupdeals');

            return url.toString();
        } catch (e) {
            console.warn('Invalid URL:', baseUrl);
            return baseUrl;
        }
    }

    /**
     * Send tracking data to server.
     * @param {Object} clickData - Data about the click
     * @returns {Promise} - Fetch promise
     */
    async function sendTrackingData(clickData) {
        try {
            const response = await fetch(TRACKING_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clickData),
                keepalive: true // ensures request completes even if page unloads
            });
            return response;
        } catch (error) {
            console.warn('Tracking failed, queueing for retry:', error);
            // Queue failed tracking for later retry
            clickQueue.push(clickData);
            if (!isProcessing) {
                processQueue();
            }
        }
    }

    /**
     * Process queued tracking events.
     */
    async function processQueue() {
        if (isProcessing || clickQueue.length === 0) return;
        isProcessing = true;

        while (clickQueue.length > 0) {
            const clickData = clickQueue.shift();
            try {
                await sendTrackingData(clickData);
            } catch (e) {
                // If still failing, put back at end of queue (limit retries)
                clickData.retries = (clickData.retries || 0) + 1;
                if (clickData.retries < 3) {
                    clickQueue.push(clickData);
                }
            }
            // Small delay between retries
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        isProcessing = false;
    }

    /**
     * Track click locally (analytics, localStorage, etc.)
     * @param {Object} deal - Deal information
     */
    function trackClickLocally(deal) {
        // Google Analytics 4
        if (typeof gtag === 'function') {
            gtag('event', 'affiliate_click', {
                'event_category': 'Affiliate',
                'event_label': deal.store,
                'value': deal.price || 0,
                'deal_id': deal.dealId
            });
        }

        // Facebook Pixel
        if (typeof fbq === 'function') {
            fbq('trackCustom', 'AffiliateClick', {
                store: deal.store,
                deal_id: deal.dealId
            });
        }

        // Store in localStorage for personalization
        try {
            const clicked = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLICKED_DEALS) || '[]');
            clicked.push({
                dealId: deal.dealId,
                store: deal.store,
                timestamp: new Date().toISOString()
            });
            // Keep only last 20
            if (clicked.length > 20) clicked.shift();
            localStorage.setItem(STORAGE_KEYS.CLICKED_DEALS, JSON.stringify(clicked));
            localStorage.setItem(STORAGE_KEYS.LAST_CLICK, JSON.stringify(deal));
        } catch (e) {
            // ignore storage errors
        }
    }

    // ==================== Event Handlers ====================

    /**
     * Handle affiliate link click.
     * @param {Event} e - Click event
     * @param {HTMLElement} link - The clicked link
     */
    async function handleAffiliateClick(e, link) {
        // Prevent default to allow tracking first
        e.preventDefault();

        const url = link.getAttribute('href');
        if (!url || url === '#') return;

        // Extract deal data from data attributes
        const deal = {
            dealId: link.dataset.dealId || 'unknown',
            store: link.dataset.store || 'unknown',
            category: link.dataset.category || '',
            price: link.dataset.price || 0,
            url: url
        };

        // Build enhanced affiliate URL
        const finalUrl = buildAffiliateUrl(url, deal);

        // Send tracking data to server (fire and forget)
        sendTrackingData({
            deal_id: deal.dealId,
            store: deal.store,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            referrer: document.referrer,
            page_url: window.location.href
        });

        // Local tracking (analytics, storage)
        trackClickLocally(deal);

        // Dispatch custom event for other scripts
        document.dispatchEvent(new CustomEvent('affiliateClick', { detail: deal }));

        // Redirect after a small delay (allow tracking requests to initiate)
        setTimeout(() => {
            window.location.href = finalUrl;
        }, DEFAULT_REDIRECT_DELAY);
    }

    /**
     * Attach click listeners to all affiliate links.
     */
    function attachListeners() {
        // Select all links that should be tracked
        const affiliateLinks = document.querySelectorAll('a[data-affiliate="true"], .deal-btn.primary[href], .affiliate-link');

        affiliateLinks.forEach(link => {
            // Avoid duplicate listeners
            if (link.dataset.affiliateListenerAttached) return;
            link.dataset.affiliateListenerAttached = 'true';

            link.addEventListener('click', (e) => handleAffiliateClick(e, link));
        });
    }

    /**
     * Observe DOM changes to handle dynamically added affiliate links.
     */
    function setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldAttach = false;
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length) {
                    shouldAttach = true;
                }
            });
            if (shouldAttach) {
                attachListeners();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==================== Initialization ====================

    function init() {
        // Attach to existing links
        attachListeners();

        // Watch for new links
        setupMutationObserver();

        // Process any queued events (from previous failed sends)
        if (clickQueue.length > 0) {
            processQueue();
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();