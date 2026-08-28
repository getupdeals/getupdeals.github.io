/**
 * blog-post.js – Universal functionality for all blog posts
 * Dependencies: none (pure vanilla JS)
 */

(function() {
    'use strict';

    // ---------- Table of Contents (smooth scroll + active highlight) ----------
    const tocLinks = document.querySelectorAll('.toc-link');
    const headings = Array.from(document.querySelectorAll('.article-section h2, .article-section h3')).filter(h => h.id);

    function updateActiveToc() {
        if (!headings.length) return;
        const scrollPos = window.scrollY + 120;
        let current = null;
        for (let i = headings.length - 1; i >= 0; i--) {
            if (headings[i].offsetTop <= scrollPos) {
                current = headings[i].id;
                break;
            }
        }
        tocLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('#')) return;
            const targetId = href.substring(1);
            if (targetId === current) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // Throttle scroll events for better performance
    let ticking = false;
    function onScroll() {
        if (!ticking) {
            requestAnimationFrame(() => {
                updateActiveToc();
                ticking = false;
            });
            ticking = true;
        }
    }

    function initToc() {
        if (!tocLinks.length) return;
        tocLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;
                const targetId = href.substring(1);
                const target = document.getElementById(targetId);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    history.pushState(null, null, `#${targetId}`);
                }
            });
        });
        window.addEventListener('scroll', onScroll);
        updateActiveToc();
    }

    // ========== FAQ ACCORDION (Event Delegation) ==========
    function initFaq() {
        const faqContainer = document.querySelector('.faq-container');
        if (!faqContainer) return;
        
        faqContainer.removeEventListener('click', window.faqHandler);
        
        window.faqHandler = function(e) {
            const question = e.target.closest('.faq-question');
            if (!question) return;
            
            const item = question.closest('.faq-item');
            if (!item) return;
            
            document.querySelectorAll('.faq-item').forEach(i => {
                if (i !== item) i.classList.remove('open');
            });
            
            item.classList.toggle('open');
        };
        
        faqContainer.addEventListener('click', window.faqHandler);
    }

    // ---------- Share Buttons (Facebook, Twitter, WhatsApp, Pinterest) ----------
    function initShareButtons() {
        const currentUrl = encodeURIComponent(window.location.href);
        const currentTitle = encodeURIComponent(document.title);
        const shareBtnMap = {
            'facebook': `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`,
            'twitter': `https://twitter.com/intent/tweet?text=${currentTitle}&url=${currentUrl}`,
            'whatsapp': `https://api.whatsapp.com/send?text=${currentTitle}%20${currentUrl}`,
            'pinterest': `https://pinterest.com/pin/create/button/?url=${currentUrl}&description=${currentTitle}`
        };
        document.querySelectorAll('.share-btn').forEach(btn => {
            const network = btn.dataset.share;
            if (network && shareBtnMap[network]) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    window.open(shareBtnMap[network], '_blank', 'width=600,height=400');
                });
            }
        });
        // Print button
        const printBtn = document.querySelector('.btn-print');
        if (printBtn) printBtn.addEventListener('click', () => window.print());
    }

    // ---------- Comments (generic, can be disabled via window.skipUniversalComments) ----------
    function initComments() {
        const commentForm = document.getElementById('commentForm');
        const commentsList = document.getElementById('commentsList');
        const commentCountSpans = document.querySelectorAll('#commentCount, #commentCountFooter');
        if (!commentForm || !commentsList) return;

        function loadComments() {
            const comments = JSON.parse(localStorage.getItem('blog_comments') || '[]');
            if (comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">Be the first to comment!</div>';
            } else {
                commentsList.innerHTML = comments.map(c => `
                    <div class="comment">
                        <div class="comment-author">${escapeHtml(c.name)}</div>
                        <div class="comment-date">${new Date(c.date).toLocaleString()}</div>
                        <div class="comment-text">${escapeHtml(c.text)}</div>
                    </div>
                `).join('');
            }
            commentCountSpans.forEach(span => span.textContent = comments.length);
        }

        commentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = commentForm.querySelector('input[type="text"]').value.trim();
            const email = commentForm.querySelector('input[type="email"]').value.trim();
            const text = commentForm.querySelector('textarea').value.trim();
            if (!name || !text) return;
            const comments = JSON.parse(localStorage.getItem('blog_comments') || '[]');
            comments.push({
                name: name,
                email: email,
                text: text,
                date: new Date().toISOString()
            });
            localStorage.setItem('blog_comments', JSON.stringify(comments));
            commentForm.reset();
            loadComments();
        });

        loadComments();
    }

    // ---------- "Save Article" button (bookmark) ----------
    function initSaveArticle() {
        const saveBtn = document.getElementById('saveArticle');
        if (!saveBtn) return;
        saveBtn.addEventListener('click', () => {
            const articleTitle = document.querySelector('.post-title')?.innerText || 'Blog post';
            const articleUrl = window.location.href;
            let saved = JSON.parse(localStorage.getItem('saved_articles') || '[]');
            if (!saved.some(a => a.url === articleUrl)) {
                saved.push({ title: articleTitle, url: articleUrl, date: new Date().toISOString() });
                localStorage.setItem('saved_articles', JSON.stringify(saved));
                alert('Article saved to your bookmarks!');
            } else {
                alert('Already saved.');
            }
        });
    }

    // ---------- Sidebar Newsletter (demo) ----------
    function initNewsletter() {
        const form = document.getElementById('sidebarNewsletter');
        if (!form) return;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = form.querySelector('input[type="email"]').value;
            if (email) {
                alert(`Thanks for subscribing! (Demo: ${email})`);
                form.reset();
            }
        });
    }

    // ---------- Helper: escape HTML ----------
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // ========== CHECKLIST PERSISTENCE ==========
    function initChecklist() {
        const checkboxes = document.querySelectorAll('.checklist-grid input');
        checkboxes.forEach((cb) => {
            let key = null;
            if (cb.id) {
                key = `check_${cb.id}`;
            } else if (cb.name) {
                key = `check_${cb.name}`;
            } else {
                return; // skip if no identifier
            }
            const saved = localStorage.getItem(key);
            if (saved === 'true') cb.checked = true;
            cb.addEventListener('change', () => localStorage.setItem(key, cb.checked));
        });
    }

    // ========== BACK TO TOP ==========
    function initBackToTop() {
        const backBtn = document.getElementById('backToTop');
        if (!backBtn) return;
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backBtn.classList.add('visible');
            } else {
                backBtn.classList.remove('visible');
            }
        });
        backBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ---------- Initialize all universal features ----------
    document.addEventListener('DOMContentLoaded', () => {
        initToc();
        initFaq();
        initShareButtons();
        // Only init generic comments if not disabled by page-specific script
        if (!window.skipUniversalComments) {
            initComments();
        }
        initSaveArticle();
        initNewsletter();
        initChecklist();
        initBackToTop();
    });
})();