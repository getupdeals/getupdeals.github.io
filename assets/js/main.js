// assets/js/main.js
/**
 * Main entry point for GetUpDeals.
 * Initializes core modules, handles global errors,
 * and injects authentication modal dynamically.
 */
(function() {
    'use strict';

    // ==================== Configuration ====================
    const VERSION = '1.0.0';
    const DEBUG = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    // ==================== Global Error Handling ====================

    window.addEventListener('error', (event) => {
        if (DEBUG) {
            console.error('Global error:', event.error || event.message);
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        if (DEBUG) {
            console.warn('Unhandled promise rejection:', event.reason);
        }
    });

    // ==================== Feature Detection ====================
    function checkSupport() {
        const features = {
            intersectionObserver: 'IntersectionObserver' in window,
            localStorage: 'localStorage' in window,
            fetch: 'fetch' in window,
            promise: 'Promise' in window,
        };

        if (DEBUG) {
            console.log('Feature support:', features);
        }

        if (!features.fetch || !features.promise) {
            const warning = document.createElement('div');
            warning.className = 'browser-warning';
            warning.innerHTML = 'Your browser is outdated. Some features may not work properly.';
            document.body.prepend(warning);
        }

        return features;
    }

    // ==================== Performance Marking ====================
    function markPerformance() {
        if (window.performance && window.performance.mark) {
            performance.mark('main-js-start');
        }
    }

    // ==================== HTML Templates ====================
    const AUTH_MODAL_HTML = `
    <div class="modal-overlay" id="authModal">
        <div class="auth-modal">
            <button class="close-modal" id="closeAuthModal">&times;</button>
            
            <!-- Login Panel -->
            <div id="loginPanel" class="auth-panel">
                <h3>Welcome Back 👋</h3>
                <p class="modal-sub">Sign in to unlock rewards & track your cashback</p>
                <div class="input-group">
                    <input type="email" id="loginEmail" placeholder="Email address" autocomplete="email">
                </div>
                <div class="input-group">
                    <input type="password" id="loginPassword" placeholder="Password" autocomplete="current-password">
                </div>
                <div id="loginError" class="error-message" style="display:none;"></div>
                <button class="auth-btn" id="loginBtn">Sign In</button>
                <div class="divider">or continue with</div>
                <div class="social-login">
                    <div class="social-icon" id="googleSignInBtn"><i class="fab fa-google"></i></div>
                </div>
                <div class="auth-footer">
                    Don't have an account? <a href="#" id="showSignupLink">Create one</a>
                </div>
            </div>

            <!-- Signup Panel – Google & Phone always shown, more options slide-down -->
            <div id="signupPanel" class="auth-panel" style="display: none;">
                <div id="benefitsSection" class="signup-benefits" style="display: none;">
                    <div class="benefits-rating">
                        <span class="stars">⭐ 4.8</span> <span class="dot">•</span> <span>1M+ downloads</span>
                    </div>
                    <div class="benefits-header">
                        <p class="benefits-highlight">Don't miss out on the best deals</p>
                        <h3>Join GetUpDeals and never overpay again</h3>
                    </div>
                    <ul class="benefits-list">
                        <li><i class="fas fa-bell"></i> Get real-time alerts before deals sell out</li>
                        <li><i class="fas fa-tag"></i> Unlock exclusive discounts</li>
                        <li><i class="fas fa-search"></i> Search and save your favorite deals</li>
                        <li><i class="fas fa-chart-line"></i> Access price drops before anyone else</li>
                    </ul>
                    <div class="benefits-divider"></div>
                </div>

                <h3>Join GetUpDeals 🎉</h3>
                <p class="modal-sub">Create an account to start saving & earning cashback</p>

                <div class="social-login dual-buttons">
                    <div class="social-icon google-btn" id="googleSignUpBtn">
                        <i class="fab fa-google"></i>
                        
                    </div>
                    <div class="social-icon phone-btn" id="phoneSignUpBtn">
                        <i class="fas fa-mobile-alt"></i>
                        
                    </div>
                </div>

                <div class="more-options-trigger">
                    <a href="#" id="showMoreSignupOptions">More sign up options</a>
                </div>

                <div id="moreSignupOptions" class="more-signup-options" style="display: none;">
                    <div class="divider">or sign up with email & password</div>

                    <div class="input-group">
                        <input type="email" id="signupEmail" placeholder="Email address" autocomplete="email">
                    </div>
                    <div class="input-group">
                        <input type="text" id="signupName" placeholder="Full name (optional)" autocomplete="name">
                    </div>
                    <div class="input-group">
                        <input type="password" id="signupPassword" placeholder="Password" autocomplete="new-password">
                    </div>
                    <div class="input-group">
                        <input type="password" id="signupConfirmPassword" placeholder="Confirm password">
                    </div>

                    <div class="input-group checkbox-group">
                        <label>
                            <input type="checkbox" id="termsCheckbox"> I agree to the <a href="./pages/terms-of-service/index.html" target="_blank">Terms of Service</a> and <a href="./pages/privacy-policy/index.html" target="_blank">Privacy Policy</a>
                        </label>
                    </div>

                    <div id="signupError" class="error-message" style="display:none;"></div>
                    <button class="auth-btn" id="signupBtn">Create Account</button>
                </div>

                <p class="auth-switch">
                    Already have an account? <a href="#" id="showLoginLink">Sign in</a>
                </p>
            </div>
        </div>
    </div>
    `;

    const REWARD_MODAL_HTML = `
    <div class="modal-overlay" id="rewardModal">
        <div class="auth-modal reward-modal">
            <button class="close-modal" id="closeRewardModal">&times;</button>
            <h3 id="rewardModalTitle">Rewards</h3>
            <div id="rewardModalContent"></div>
        </div>
    </div>
    `;

    // ==================== Dynamic Injection Helpers ====================
    function ensureElementExists() {
        if (!document.getElementById('authModal')) {
            document.body.insertAdjacentHTML('beforeend', AUTH_MODAL_HTML);
            if (DEBUG) console.log('Auth modal injected dynamically');
        }
        if (!document.getElementById('rewardModal')) {
            document.body.insertAdjacentHTML('beforeend', REWARD_MODAL_HTML);
            if (DEBUG) console.log('Reward modal injected dynamically');
        }
    }

    // ==================== Helper Functions ====================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function copyHandler(e) {
        const btn = e.currentTarget;
        let code = btn.getAttribute('data-code');
        if (!code) {
            const prev = btn.previousElementSibling;
            if (prev) code = prev.innerText.trim();
            else code = 'GETUP10';
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                const original = btn.innerText;
                btn.innerText = 'Copied!';
                setTimeout(() => btn.innerText = original, 1500);
            }).catch(() => alert('Press Ctrl+C to copy: ' + code));
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = code;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            const original = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = original, 1500);
        }
    }

    // ==================== Reward Content Generators ====================
    function getCouponsHTML() {
        return `<div class="reward-list">
                    <div class="reward-item">🎟️ 10% off on Amazon - <strong>GETUP10</strong> <button class="copy-link" data-code="GETUP10">Copy</button></div>
                    <div class="reward-item">🎟️ ₹100 off on Flipkart - <strong>SAVE100</strong> <button class="copy-link" data-code="SAVE100">Copy</button></div>
                    <div class="reward-item">🎟️ Free shipping on Myntra - <strong>FREESHIP</strong> <button class="copy-link" data-code="FREESHIP">Copy</button></div>
                </div>`;
    }

    function getCashbackHTML(user) {
        return `<div class="reward-list">
                    <div class="reward-item">💰 Total Cashback: ₹250</div>
                    <div class="reward-item">📅 Last earned: ₹50 from Amazon (Dec 10, 2024)</div>
                    <div class="reward-item">💳 Pending: ₹100</div>
                    ${user ? '<button class="auth-btn" id="withdrawBtn">Withdraw (Min ₹200)</button>' : ''}
                </div>`;
    }

    function getReferHTML(user) {
        const refLink = user ? `https://getupdeals.com/?ref=${user.uid.substring(0, 8)}` : '#';
        return `<div class="reward-list">
                    <p>Share your unique link and earn ₹50 coupon for each friend who signs up and makes a purchase!</p>
                    <div class="reward-item">🔗 Your link: <strong>${refLink}</strong> <button class="copy-link" data-code="${refLink}">Copy</button></div>
                    <div class="reward-item">👥 Referrals made: 3</div>
                    <div class="reward-item">✅ Successful: 2 (₹100 earned)</div>
                    <div class="reward-item">🎁 Pending: ₹50</div>
                </div>`;
    }

    function getDashboardHTML(user) {
        const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
        return `<div class="reward-list">
                    <div class="reward-item">👋 Welcome, ${escapeHtml(displayName)}!</div>
                    <div class="reward-item">🎟️ Coupons: 3</div>
                    <div class="reward-item">💰 Cashback: ₹250</div>
                    <div class="reward-item">👥 Referral earnings: ₹100</div>
                </div>`;
    }

    function getNotificationsHTML() {
        return `<div class="reward-list">
                    <div class="reward-item">🔔 New deal: 50% off on winter wear!</div>
                    <div class="reward-item">💰 Your cashback of ₹50 has been credited.</div>
                    <div class="reward-item">🎉 Referral bonus: You earned ₹25.</div>
                </div>`;
    }

    function showRewardModal(title, htmlContent) {
        const rewardModal = document.getElementById('rewardModal');
        const rewardModalTitle = document.getElementById('rewardModalTitle');
        const rewardModalContent = document.getElementById('rewardModalContent');
        if (!rewardModal || !rewardModalTitle || !rewardModalContent) return;
        rewardModalTitle.innerText = title;
        rewardModalContent.innerHTML = htmlContent;
        rewardModal.classList.add('active');
        requestAnimationFrame(() => {
            document.querySelectorAll('#rewardModalContent .copy-link').forEach(btn => {
                btn.removeEventListener('click', copyHandler);
                btn.addEventListener('click', copyHandler);
            });
        });
    }

    // ==================== Auth Modal State Management ====================
    let currentUser = null;
    let recaptchaVerifier = null;
    let confirmationResult = null;

    function closeAuthModal() {
        const authModal = document.getElementById('authModal');
        if (!authModal) return;
        authModal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset fields
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const signupName = document.getElementById('signupName');
        const signupEmail = document.getElementById('signupEmail');
        const signupPassword = document.getElementById('signupPassword');
        const signupConfirm = document.getElementById('signupConfirmPassword');
        const termsCheck = document.getElementById('termsCheckbox');
        const loginError = document.getElementById('loginError');
        const signupError = document.getElementById('signupError');
        if (loginEmail) loginEmail.value = '';
        if (loginPassword) loginPassword.value = '';
        if (signupName) signupName.value = '';
        if (signupEmail) signupEmail.value = '';
        if (signupPassword) signupPassword.value = '';
        if (signupConfirm) signupConfirm.value = '';
        if (termsCheck) termsCheck.checked = false;
        if (loginError) loginError.style.display = 'none';
        if (signupError) signupError.style.display = 'none';
        
        // Reset to login panel and minimal signup mode
        const loginPanel = document.getElementById('loginPanel');
        const signupPanel = document.getElementById('signupPanel');
        if (loginPanel) loginPanel.style.display = 'block';
        if (signupPanel) signupPanel.style.display = 'none';
        setSignupMode(false);
    }

    function setSignupMode(detailed) {
        const signupPanel = document.getElementById('signupPanel');
        const benefitsSection = document.getElementById('benefitsSection');
        const signupTitle = signupPanel?.querySelector('h3');
        const signupSubtitle = signupPanel?.querySelector('.modal-sub');
        const moreSignupOptionsDiv = document.getElementById('moreSignupOptions');
        const showMoreSignupOptions = document.getElementById('showMoreSignupOptions');
        
        if (!signupPanel) return;
        if (detailed) {
            if (benefitsSection) benefitsSection.style.display = 'block';
            if (signupTitle) signupTitle.style.display = 'none';
            if (signupSubtitle) signupSubtitle.style.display = 'none';
            if (moreSignupOptionsDiv && moreSignupOptionsDiv.style.display !== 'block') {
                moreSignupOptionsDiv.style.display = 'block';
                if (showMoreSignupOptions) showMoreSignupOptions.textContent = 'Fewer options';
            }
        } else {
            if (benefitsSection) benefitsSection.style.display = 'none';
            if (signupTitle) signupTitle.style.display = '';
            if (signupSubtitle) signupSubtitle.style.display = '';
            if (moreSignupOptionsDiv) moreSignupOptionsDiv.style.display = 'none';
            if (showMoreSignupOptions) showMoreSignupOptions.textContent = 'More sign up options';
        }
    }

    function showSignupModal(detailed = false) {
        const authModal = document.getElementById('authModal');
        const loginPanel = document.getElementById('loginPanel');
        const signupPanel = document.getElementById('signupPanel');
        if (!authModal) return;
        
        setSignupMode(detailed);
        if (loginPanel) loginPanel.style.display = 'none';
        if (signupPanel) signupPanel.style.display = 'block';
        
        const signupError = document.getElementById('signupError');
        if (signupError) signupError.style.display = 'none';
        
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function showAuthModal(panel = 'login') {
        if (panel === 'signup') {
            showSignupModal(false);
        } else {
            const loginPanel = document.getElementById('loginPanel');
            const signupPanel = document.getElementById('signupPanel');
            if (loginPanel) loginPanel.style.display = 'block';
            if (signupPanel) signupPanel.style.display = 'none';
            const loginError = document.getElementById('loginError');
            if (loginError) loginError.style.display = 'none';
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }
    }

    function shouldAutoShowSignup() {
        if (currentUser) return false;
        const LAST_PROMPT_KEY = 'getupdeals_last_auto_signup';
        const lastPrompt = localStorage.getItem(LAST_PROMPT_KEY);
        if (!lastPrompt) return true;
        const now = Date.now();
        const twentyMinutes = 20 * 60 * 1000;
        return (now - parseInt(lastPrompt, 10)) > twentyMinutes;
    }

    function triggerAutoSignup() {
        if (!shouldAutoShowSignup()) return;
        localStorage.setItem('getupdeals_last_auto_signup', Date.now().toString());
        showSignupModal(true);
    }

    // ==================== Phone Authentication ====================
    function createPhoneModal() {
        if (document.getElementById('phoneAuthModal')) return;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'phoneAuthModal';
        modalDiv.className = 'modal-overlay';
        modalDiv.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:10000;';
        modalDiv.innerHTML = `
            <div class="auth-modal" style="max-width:400px; width:90%;">
                <button class="close-modal" id="closePhoneModal">&times;</button>
                <div id="phoneStep1">
                    <h3>Sign up with Phone</h3>
                    <p class="modal-sub">Enter your mobile number</p>
                    <div class="input-group">
                        <input type="tel" id="phoneNumber" placeholder="+91 9876543210" autocomplete="tel">
                    </div>
                    <div id="phoneError" class="error-message" style="display:none;"></div>
                    <button class="auth-btn" id="sendOtpBtn">Send OTP</button>
                </div>
                <div id="phoneStep2" style="display:none;">
                    <h3>Verify OTP</h3>
                    <p class="modal-sub">Enter the 6-digit code sent to your phone</p>
                    <div class="input-group">
                        <input type="text" id="otpCode" placeholder="123456" maxlength="6">
                    </div>
                    <div id="otpError" class="error-message" style="display:none;"></div>
                    <button class="auth-btn" id="verifyOtpBtn">Verify & Sign Up</button>
                </div>
                <div id="recaptcha-container" style="margin-top:15px;"></div>
            </div>
        `;
        document.body.appendChild(modalDiv);
        const phoneModal = modalDiv;

        const closePhone = document.getElementById('closePhoneModal');
        if (closePhone) closePhone.addEventListener('click', () => phoneModal.remove());

        const sendBtn = document.getElementById('sendOtpBtn');
        const phoneInput = document.getElementById('phoneNumber');
        const phoneErrorDiv = document.getElementById('phoneError');
        
        sendBtn.addEventListener('click', () => {
            const phoneNumber = phoneInput.value.trim();
            if (!phoneNumber) {
                phoneErrorDiv.textContent = 'Please enter a valid phone number.';
                phoneErrorDiv.style.display = 'block';
                return;
            }
            phoneErrorDiv.style.display = 'none';
            if (!recaptchaVerifier) {
                recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
                    size: 'invisible',
                    callback: () => {}
                });
            }
            firebase.auth().signInWithPhoneNumber(phoneNumber, recaptchaVerifier)
                .then((result) => {
                    confirmationResult = result;
                    document.getElementById('phoneStep1').style.display = 'none';
                    document.getElementById('phoneStep2').style.display = 'block';
                })
                .catch((error) => {
                    phoneErrorDiv.textContent = error.message;
                    phoneErrorDiv.style.display = 'block';
                    recaptchaVerifier.render();
                });
        });

        const verifyBtn = document.getElementById('verifyOtpBtn');
        const otpInput = document.getElementById('otpCode');
        const otpErrorDiv = document.getElementById('otpError');
        
        verifyBtn.addEventListener('click', () => {
            const otp = otpInput.value.trim();
            if (!otp || otp.length < 6) {
                otpErrorDiv.textContent = 'Please enter the 6-digit code.';
                otpErrorDiv.style.display = 'block';
                return;
            }
            otpErrorDiv.style.display = 'none';
            confirmationResult.confirm(otp)
                .then((result) => {
                    closeAuthModal();
                    phoneModal.remove();
                    updateAuthUI(result.user);
                })
                .catch((error) => {
                    otpErrorDiv.textContent = error.message;
                    otpErrorDiv.style.display = 'block';
                });
        });
    }

    // ==================== Account Panel Rendering ====================
    function renderAccountPanel(container, user) {
        if (!container) return;
        if (user) {
            const name = user.displayName || user.email?.split('@')[0] || 'User';
            container.innerHTML = `
                <div class="account-header">
                    <div class="user-name">${escapeHtml(name)}</div>
                    <div class="user-email">${escapeHtml(user.email)}</div>
                </div>
                <a class="dropdown-item" data-reward="dashboard" href="#"><i class="fas fa-chart-line"></i> Rewards</a>
                <a class="dropdown-item" data-reward="notifications" href="#"><i class="fas fa-bell"></i> Notifications</a>
                <a class="dropdown-item" data-reward="cashback" href="#"><i class="fas fa-coins"></i> My Cashback</a>
                <a class="dropdown-item" data-reward="refer" href="#"><i class="fas fa-users"></i> Refer & Earn</a>
                <div class="dropdown-divider"></div>
                <a class="dropdown-item" id="logoutLinkUnified" href="#"><i class="fas fa-sign-out-alt"></i> Logout</a>
            `;
            attachAccountEvents(container, user);
        } else {
            container.innerHTML = `
                <div class="account-header">
                    <div class="user-name">Guest User</div>
                    <div class="user-email">Not signed in</div>
                </div>
                <button class="auth-btn-mobile" id="unifiedSignInBtn">Sign In</button>
                <button class="auth-btn-mobile" id="unifiedSignUpBtn">Sign Up</button>
            `;
            const signInBtn = container.querySelector('#unifiedSignInBtn');
            const signUpBtn = container.querySelector('#unifiedSignUpBtn');
            if (signInBtn) signInBtn.addEventListener('click', () => showAuthModal('login'));
            if (signUpBtn) signUpBtn.addEventListener('click', () => showSignupModal(false));
        }
    }

    function attachAccountEvents(container, user) {
        container.removeEventListener('click', accountClickHandler);
        container.addEventListener('click', accountClickHandler);
        container._currentUser = user;
    }

    function accountClickHandler(e) {
        const target = e.target.closest('.dropdown-item');
        if (!target) return;
        e.preventDefault();
        const reward = target.getAttribute('data-reward');
        const container = target.closest('.account-dropdown-inner, #mobileAccountContainer');
        const user = container ? container._currentUser : currentUser;
        if (!user && reward !== 'logout') {
            showAuthModal('login');
            return;
        }
        switch (reward) {
            case 'dashboard':
                showRewardModal('Rewards', getDashboardHTML(user));
                break;
            case 'notifications':
                showRewardModal('Notifications', getNotificationsHTML());
                break;
            case 'cashback':
                showRewardModal('My Cashback', getCashbackHTML(user));
                break;
            case 'refer':
                showRewardModal('Refer & Earn', getReferHTML(user));
                break;
            default:
                if (target.id === 'logoutLinkUnified') {
                    firebase.auth().signOut().then(() => {
                        const accountDropdown = document.getElementById('accountDropdown');
                        if (accountDropdown) accountDropdown.classList.remove('active');
                        closeMobileMenu();
                    });
                }
                break;
        }
    }

    function closeMobileMenu() {
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) {
            mobileNav.classList.remove('active');
            const toggle = document.getElementById('mobileMenuToggle');
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }

    // ==================== Update UI Based on Auth State ====================
    function updateAuthUI(user) {
        currentUser = user;
        const desktopAccountInner = document.querySelector('#accountDropdown .account-dropdown-inner');
        const mobileAccountContainer = document.getElementById('mobileAccountContainer');
        
        if (desktopAccountInner) renderAccountPanel(desktopAccountInner, user);
        if (mobileAccountContainer) renderAccountPanel(mobileAccountContainer, user);
        
        const accountBtn = document.getElementById('accountBtn');
        if (accountBtn) {
            if (user) {
                const shortName = user.displayName ? user.displayName.split(' ')[0] : (user.email?.split('@')[0] || user.phoneNumber || 'Account');
                accountBtn.innerHTML = `<i class="fas fa-user-circle"></i><span>${escapeHtml(shortName)}</span>`;
            } else {
                accountBtn.innerHTML = `<i class="fas fa-user-circle"></i><span>Sign In</span>`;
                setTimeout(() => {
                    const authModal = document.getElementById('authModal');
                    if (authModal && !authModal.classList.contains('active')) {
                        triggerAutoSignup();
                    }
                }, 800);
            }
        }

        window.GetUp = window.GetUp || {};
        window.GetUp.isUserLoggedIn = () => !!currentUser;
    }

    // ==================== Firebase Auth Event Binding ====================
    function bindAuthEventHandlers() {
        const auth = firebase.auth();
        const googleProvider = new firebase.auth.GoogleAuthProvider();

        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                const email = document.getElementById('loginEmail')?.value.trim();
                const password = document.getElementById('loginPassword')?.value;
                const errorDiv = document.getElementById('loginError');
                if (!email || !password) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Please enter email and password.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                auth.signInWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        closeAuthModal();
                        updateAuthUI(userCredential.user);
                    })
                    .catch((error) => {
                        if (errorDiv) {
                            errorDiv.textContent = error.message;
                            errorDiv.style.display = 'block';
                        }
                    });
            });
        }

        // Signup button
        const signupBtn = document.getElementById('signupBtn');
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                const name = document.getElementById('signupName')?.value.trim();
                const email = document.getElementById('signupEmail')?.value.trim();
                const password = document.getElementById('signupPassword')?.value;
                const confirm = document.getElementById('signupConfirmPassword')?.value;
                const terms = document.getElementById('termsCheckbox')?.checked;
                const errorDiv = document.getElementById('signupError');
                
                if (!email || !password || !confirm) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Please fill in email and password.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                if (!email.includes('@')) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Please enter a valid email address.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                if (password !== confirm) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Passwords do not match.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                if (password.length < 6) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Password must be at least 6 characters.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                if (!terms) {
                    if (errorDiv) {
                        errorDiv.textContent = 'You must agree to the Terms & Privacy Policy.';
                        errorDiv.style.display = 'block';
                    }
                    return;
                }
                auth.createUserWithEmailAndPassword(email, password)
                    .then((userCredential) => {
                        // Update profile with name (optional)
                        if (name) {
                            return userCredential.user.updateProfile({ displayName: name }).then(() => userCredential.user);
                        }
                        return userCredential.user;
                    })
                    .then((user) => {
                        closeAuthModal();
                        updateAuthUI(user);
                    })
                    .catch((error) => {
                        if (errorDiv) {
                            errorDiv.textContent = error.message;
                            errorDiv.style.display = 'block';
                        }
                    });
            });
        }

        // Google sign in/up buttons
        const googleBtns = document.querySelectorAll('#googleSignInBtn, #googleSignUpBtn');
        googleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                auth.signInWithPopup(googleProvider)
                    .then((result) => {
                        closeAuthModal();
                        updateAuthUI(result.user);
                    })
                    .catch((error) => alert(error.message));
            });
        });

        // Phone signup button
        const phoneSignUpBtn = document.getElementById('phoneSignUpBtn');
        if (phoneSignUpBtn) {
            phoneSignUpBtn.addEventListener('click', () => {
                createPhoneModal();
            });
        }

        // Modal close buttons
        const closeAuth = document.getElementById('closeAuthModal');
        if (closeAuth) closeAuth.addEventListener('click', closeAuthModal);
        const closeReward = document.getElementById('closeRewardModal');
        if (closeReward) {
            closeReward.addEventListener('click', () => {
                const rewardModal = document.getElementById('rewardModal');
                if (rewardModal) rewardModal.classList.remove('active');
            });
        }

        // Modal overlay clicks
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) closeAuthModal();
            });
        }
        const rewardModal = document.getElementById('rewardModal');
        if (rewardModal) {
            rewardModal.addEventListener('click', (e) => {
                if (e.target === rewardModal) rewardModal.classList.remove('active');
            });
        }

        // Tab switching links
        const showSignupLink = document.getElementById('showSignupLink');
        const showLoginLink = document.getElementById('showLoginLink');
        if (showSignupLink) {
            showSignupLink.addEventListener('click', (e) => {
                e.preventDefault();
                showSignupModal(false);
            });
        }
        if (showLoginLink) {
            showLoginLink.addEventListener('click', (e) => {
                e.preventDefault();
                showAuthModal('login');
            });
        }

        // More signup options toggle
        const showMoreSignupOptions = document.getElementById('showMoreSignupOptions');
        const moreSignupOptionsDiv = document.getElementById('moreSignupOptions');
        if (showMoreSignupOptions && moreSignupOptionsDiv) {
            showMoreSignupOptions.addEventListener('click', (e) => {
                e.preventDefault();
                const isVisible = moreSignupOptionsDiv.style.display === 'block';
                moreSignupOptionsDiv.style.display = isVisible ? 'none' : 'block';
                showMoreSignupOptions.textContent = isVisible ? 'More sign up options' : 'Fewer options';
            });
        }

        // Custom event listener for external auth triggers
        document.addEventListener('getup:showAuth', (e) => {
            showAuthModal(e.detail?.panel || 'login');
        });
    }

    // ==================== Initialize Auth System ====================
    function initAuthSystem() {
        // Check if Firebase is available
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.warn('Firebase not initialized. Auth features disabled.');
            const desktopAccountInner = document.querySelector('#accountDropdown .account-dropdown-inner');
            const mobileAccountContainer = document.getElementById('mobileAccountContainer');
            if (desktopAccountInner) renderAccountPanel(desktopAccountInner, null);
            if (mobileAccountContainer) renderAccountPanel(mobileAccountContainer, null);
            return;
        }

        // Ensure modal HTML exists
        ensureElementExists();
        
        // Bind all event handlers
        bindAuthEventHandlers();
        
        // Listen to auth state changes
        const auth = firebase.auth();
        auth.onAuthStateChanged(user => updateAuthUI(user));
    }

    // ==================== Main Initialization ====================
    function init() {
        markPerformance();
        checkSupport();

        if (DEBUG) {
            console.log(`GetUpDeals v${VERSION} initialized`);
        }

        // Initialize authentication system (injects modals if needed)
        initAuthSystem();

        // Dispatch event that main is ready
        document.dispatchEvent(new CustomEvent('main-ready', { detail: { version: VERSION } }));
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();