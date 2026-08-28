// assets/js/cookie-consent.js
/**
* Cookie Consent – Manages GDPR/CCPA cookie consent banner,
* stores user preference, and updates analytics consent accordingly.
*/
(function() {
'use strict';

// ==================== Configuration ====================
const STORAGE_KEY = 'getupdeals-cookie-consent';
const BANNER_DELAY = 1000; // milliseconds before showing banner

// DOM elements
const cookieBanner = document.getElementById('cookieConsent');
const acceptBtn = document.getElementById('cookieAccept');
const declineBtn = document.getElementById('cookieDecline');

// ==================== Helper Functions ====================

/**
* Update Google Analytics consent (if gtag is available).
* @param {string} consent - 'accepted' or 'declined'
*/
function updateAnalyticsConsent(consent) {
if (typeof window.gtag === 'function') {
const analytics_storage = consent === 'accepted' ? 'granted' : 'denied';
window.gtag('consent', 'update', {
'analytics_storage': analytics_storage,
'ad_storage': analytics_storage, // optional: for ad tracking
});
}
// Also update any other tracking scripts if needed
}

/**
* Save consent preference and hide banner.
* @param {string} choice - 'accepted' or 'declined'
*/
function setConsent(choice) {
localStorage.setItem(STORAGE_KEY, choice);
updateAnalyticsConsent(choice);
hideBanner();

// Optional: trigger custom event for other scripts
document.dispatchEvent(new CustomEvent('cookieConsent', { detail: { choice } }));
}

/**
* Hide the cookie banner (with smooth transition if possible).
*/
function hideBanner() {
if (!cookieBanner) return;
cookieBanner.classList.remove('active');
// After transition ends, set hidden attribute to remove from layout
cookieBanner.addEventListener('transitionend', function onTransitionEnd() {
cookieBanner.setAttribute('hidden', '');
cookieBanner.removeEventListener('transitionend', onTransitionEnd);
}, { once: true });
}

/**
* Show the cookie banner.
*/
function showBanner() {
if (!cookieBanner) return;
cookieBanner.removeAttribute('hidden');
// Force reflow to ensure transition works
void cookieBanner.offsetHeight;
cookieBanner.classList.add('active');
}

// ==================== Initialization ====================

function init() {
// If banner element doesn't exist, abort
if (!cookieBanner) return;

// Check if consent already given
const existingConsent = localStorage.getItem(STORAGE_KEY);
if (existingConsent) {
// Consent already stored – apply it and hide banner
updateAnalyticsConsent(existingConsent);
cookieBanner.setAttribute('hidden', '');
return;
}

// No consent yet – show banner after delay
setTimeout(showBanner, BANNER_DELAY);

// Attach button event listeners
if (acceptBtn) {
acceptBtn.addEventListener('click', () => setConsent('accepted'));
}
if (declineBtn) {
declineBtn.addEventListener('click', () => setConsent('declined'));
}

// Optional: allow closing with Escape key
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && cookieBanner.classList.contains('active')) {
setConsent('declined');
}
});
}

// Run after DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', init);
} else {
init();
}
})();