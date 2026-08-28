// ================================
// product.js – Two Types of Similar Products
// Carousel: same brand + same subsubcategory + same fabric (in‑page update)
// Similar Products: same subsubcategory + same fabric (navigation)
// ================================

// ========== GLOBAL VARIABLES ==========
let allProducts = [];
let currentProduct = null;
let lastClickTime = 0;
let authPromise = null;
let currentUserId = null;
let priceChart = null;
let productUnsubscribe = null;
let previewImages = [];
let currentPreviewIndex = 0;
let modalListenersAttached = false;
let recentlyViewed = [];

// ========== HELPER: URL PARAMETER ==========
function getQueryParam(key) {
    return new URLSearchParams(location.search).get(key);
}

// ========== HELPER: DISCOUNT ==========
function calculateDiscount(price, original) {
    const p = Number(price);
    const o = Number(original);
    if (isNaN(p) || isNaN(o) || o === 0) return 0;
    return Math.round(((o - p) / o) * 100);
}

// ========== XSS PROTECTION ==========
function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
function escapeAttr(str) {
    if (!str) return "";
    return String(str).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ========== HELPER: STORE ICON ==========
function getStoreIcon(store) {
    const icons = {
        'amazon': '<i class="fab fa-amazon"></i>',
        'flipkart': '<img src="../assets/images/ui/flipkart-icon.png" alt="Flipkart" class="store-icon">',
        'myntra': '<img src="../assets/images/ui/myntra-icon.png" alt="Myntra" class="store-icon">',
        'ajio': '<img src="../assets/images/ui/ajio-icon.png" alt="Ajio" class="store-icon">'
    };
    return icons[store] || '<i class="fas fa-store"></i>';
}

// ========== HELPER: STAR RATING ==========
function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) stars += '<i class="fas fa-star"></i>';
        else if (i === fullStars + 1 && hasHalfStar) stars += '<i class="fas fa-star-half-alt"></i>';
        else stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

// ========== TOAST ==========
function showToast(message) {
    let toast = document.querySelector('.toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========== AUTHENTICATION (for click tracking only) ==========
async function ensureUser() {
    if (authPromise) return authPromise;
    authPromise = new Promise(async (resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) { currentUserId = user.uid; return resolve(user); }
            try {
                const result = await firebase.auth().signInAnonymously();
                currentUserId = result.user.uid;
                resolve(result.user);
            } catch (err) { reject(err); }
        });
    });
    return authPromise;
}

// ========== VIEW TRACKING ==========
async function trackUserProductView(productId, sources) {
    try {
        const user = await ensureUser();
        const uid = user.uid;
        const sessionKey = `viewed_${productId}`;
        if (sessionStorage.getItem(sessionKey)) return false;
        sessionStorage.setItem(sessionKey, "1");
        const ref = firebase.database().ref(`userViews/${uid}/${productId}`);
        await ref.transaction(data => {
            const newSources = Array.isArray(sources) ? sources : [sources];
            if (!data) return { count: 1, lastViewed: Date.now(), source: newSources };
            data.count = (data.count || 0) + 1;
            data.lastViewed = Date.now();
            const existing = Array.isArray(data.source) ? data.source : [data.source];
            data.source = Array.from(new Set([...existing, ...newSources]));
            return data;
        });
        return true;
    } catch (err) { console.error("View tracking error:", err); return false; }
}

// ========== CLICK TRACKING & REDIRECT ==========
async function trackAndRedirect(productId, store, url) {
    if (!url) return;
    const now = Date.now();
    if (now - lastClickTime < 1500) return;
    lastClickTime = now;
    (async () => {
        try {
            const user = await ensureUser();
            const uid = user.uid;
            const timestamp = Date.now();
            await firebase.database().ref(`clicks/${uid}/${timestamp}`).set({
                productId, store, url, timestamp,
                title: currentProduct?.title || "",
                price: currentProduct?.price || 0,
                originalPrice: currentProduct?.originalPrice || 0,
                category: currentProduct?.category || "",
                subcategory: currentProduct?.subcategory || "",
                userAgent: navigator.userAgent,
                referrer: document.referrer || location.href
            });
        } catch (err) { console.error("Click tracking error:", err); }
    })();
    location.href = url;
}

// ========== CREATE PRODUCT CARD (for navigation) ==========
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'deal-card';
    const discount = calculateDiscount(product.price, product.originalPrice);
    const formattedCurrentPrice = `₹${Number(product.price).toLocaleString('en-IN')}`;
    const formattedOriginalPrice = product.originalPrice ? `₹${Number(product.originalPrice).toLocaleString('en-IN')}` : '';
    const youSave = product.originalPrice ? (product.originalPrice - product.price) : 0;
    const store = product.store || (product.affiliateLinks && product.affiliateLinks[0]?.store) || 'unknown';
    const isFeatured = product.tags?.includes('featured') || false;
    const rating = product.rating || 0;
    const reviews = product.reviewCount || 0;
    card.innerHTML = `
        <div class="deal-badges">
            <span class="deal-badge discount">${discount}% OFF</span>
            <span class="deal-badge store ${store}">${getStoreIcon(store)} ${store.charAt(0).toUpperCase() + store.slice(1)}</span>
            ${isFeatured ? '<span class="deal-badge featured">🔥 Hot</span>' : ''}
        </div>
        <a href="/product/index.html?id=${product.id}" style="text-decoration:none; color:inherit;">
            <div class="deal-image">
                <img src="${product.image || 'https://placehold.co/200x200?text=No+Image'}" alt="${escapeHtml(product.title)}" loading="lazy">
            </div>
            <div class="deal-content">
                <h3 class="deal-title">${escapeHtml(product.title.substring(0, 60))}</h3>
                <div class="deal-pricing"><div class="current-price">${formattedCurrentPrice}</div>${product.originalPrice ? `<div class="original-price">${formattedOriginalPrice}</div><div class="you-save">Save ₹${youSave.toLocaleString('en-IN')}</div>` : ''}</div>
                <div class="deal-actions"><span class="deal-btn primary">View Deal <i class="fas fa-external-link-alt"></i></span></div>
            </div>
        </a>
    `;
    return card;
}

// ========== IMAGE GALLERY & MODAL ==========
function ensureImagePreviewModal() {
    if (document.getElementById("imagePreviewModal")) return;
    const modalHTML = `
        <div id="imagePreviewModal" class="image-preview-modal">
            <span class="close-preview">&times;</span>
            <img class="preview-image" id="previewImage" alt="Full size product image">
            <div class="preview-thumbnails"></div>
            <button class="prev-btn">❮</button>
            <button class="next-btn">❯</button>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHTML);
    if (!document.querySelector("#imagePreviewModal style")) {
        const style = document.createElement("style");
        style.textContent = `
            .image-preview-modal { display: none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:10000; justify-content:center; align-items:center; flex-direction:column; }
            .image-preview-modal.active { display: flex; }
            .preview-image { max-width:90%; max-height:80%; object-fit:contain; }
            .preview-thumbnails { display:flex; gap:10px; margin-top:20px; flex-wrap:wrap; justify-content:center; }
            .preview-thumbnails img { width:60px; height:60px; object-fit:cover; cursor:pointer; border:2px solid transparent; }
            .preview-thumbnails img.active { border-color:white; }
            .close-preview { position:absolute; top:20px; right:30px; font-size:40px; color:white; cursor:pointer; }
            .prev-btn, .next-btn { position:absolute; top:50%; transform:translateY(-50%); background:rgba(0,0,0,0.5); color:white; border:none; font-size:30px; cursor:pointer; padding:10px; z-index:10001; }
            .prev-btn { left:10px; }
            .next-btn { right:10px; }
            @media (max-width:768px) { .prev-btn, .next-btn { font-size:20px; padding:5px; } }
        `;
        document.head.appendChild(style);
    }
}
function setupImageGallery() {
    const mainImage = document.querySelector(".main-image");
    const thumbs = document.querySelectorAll(".thumbnail-row img");
    if (!mainImage || !thumbs.length) return;
    const newMain = mainImage.cloneNode(true);
    mainImage.parentNode.replaceChild(newMain, mainImage);
    thumbs.forEach(thumb => {
        const newThumb = thumb.cloneNode(true);
        thumb.parentNode.replaceChild(newThumb, thumb);
    });
    const finalMain = document.querySelector(".main-image");
    const finalThumbs = document.querySelectorAll(".thumbnail-row img");
    finalThumbs.forEach(thumb => {
        thumb.addEventListener("click", () => {
            finalMain.src = thumb.dataset.img;
            finalThumbs.forEach(t => t.classList.remove("active"));
            thumb.classList.add("active");
        });
    });
    if (finalThumbs.length) finalThumbs[0].classList.add("active");
}
function initModalControls() {
    if (modalListenersAttached) return;
    const modal = document.getElementById("imagePreviewModal");
    if (!modal) return;
    const previewImg = document.getElementById("previewImage");
    const closeBtn = modal.querySelector(".close-preview");
    const prevBtn = modal.querySelector(".prev-btn");
    const nextBtn = modal.querySelector(".next-btn");
    const thumbStrip = modal.querySelector(".preview-thumbnails");

    function changeImage(step) {
        if (!previewImages.length) return;
        currentPreviewIndex = (currentPreviewIndex + step + previewImages.length) % previewImages.length;
        previewImg.src = previewImages[currentPreviewIndex];
        updateActiveThumb();
    }
    function updateActiveThumb() {
        if (!thumbStrip) return;
        thumbStrip.querySelectorAll("img").forEach((t, i) => {
            t.classList.toggle("active", i === currentPreviewIndex);
        });
    }
    function renderPreviewThumbs() {
        if (!thumbStrip) return;
        thumbStrip.innerHTML = "";
        previewImages.forEach((img, i) => {
            const t = document.createElement("img");
            t.src = img;
            if (i === currentPreviewIndex) t.classList.add("active");
            t.addEventListener("click", () => {
                currentPreviewIndex = i;
                previewImg.src = img;
                updateActiveThumb();
            });
            thumbStrip.appendChild(t);
        });
    }
    function openPreview(index) {
        if (!previewImages.length) return;
        currentPreviewIndex = index;
        previewImg.src = previewImages[index];
        modal.classList.add("active");
        renderPreviewThumbs();
        history.pushState({ preview: true }, "");
    }

    document.body.addEventListener("click", (e) => {
        if (e.target.closest(".main-image")) {
            const mainImgElem = document.querySelector(".main-image");
            if (mainImgElem && previewImages.length) {
                const current = previewImages.findIndex(img => mainImgElem.src.includes(img));
                openPreview(current >= 0 ? current : 0);
            }
        }
    });
    if (closeBtn) closeBtn.onclick = () => { modal.classList.remove("active"); history.back(); };
    if (prevBtn) prevBtn.onclick = () => changeImage(-1);
    if (nextBtn) nextBtn.onclick = () => changeImage(1);
    window.addEventListener("popstate", () => { if (modal.classList.contains("active")) modal.classList.remove("active"); });
    document.addEventListener("keydown", e => {
        if (!modal.classList.contains("active")) return;
        if (e.key === "ArrowRight") changeImage(1);
        if (e.key === "ArrowLeft") changeImage(-1);
        if (e.key === "Escape") modal.classList.remove("active");
    });
    let startX = 0, endX = 0;
    modal.addEventListener("touchstart", e => { startX = e.touches[0].clientX; });
    modal.addEventListener("touchmove", e => { endX = e.touches[0].clientX; });
    modal.addEventListener("touchend", () => {
        const diff = startX - endX;
        if (Math.abs(diff) > 50) diff > 0 ? changeImage(1) : changeImage(-1);
    });
    modalListenersAttached = true;
}
function setupFullImagePreview() {
    const thumbs = document.querySelectorAll(".thumbnail-row img");
    if (!thumbs.length) return;
    previewImages = [...thumbs].map(t => t.dataset.img);
    initModalControls();
}

// ========== RECENTLY VIEWED ==========
function addToRecentlyViewed(product) {
    let recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    recent = recent.filter(p => p.id !== product.id);
    recent.unshift({ id: product.id, title: product.title, image: product.image, price: product.price });
    if (recent.length > 10) recent.pop();
    localStorage.setItem('recentlyViewed', JSON.stringify(recent));
    renderRecentlyViewed();
}
function renderRecentlyViewed() {
    const section = document.getElementById('recently-viewed-section');
    const container = document.getElementById('recently-viewed');
    if (!section || !container) return;
    const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    if (recent.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = '';
    recent.slice(0, 10).forEach(p => {
        container.appendChild(createProductCard(p));
    });
}

// ========== Q&A ==========
async function renderQA(productId) {
    const container = document.getElementById('qa-list');
    if (!container) return;
    try {
        const snap = await firebase.firestore().collection('products').doc(productId).collection('questions').orderBy('timestamp', 'desc').get();
        if (snap.empty) { container.innerHTML = '<p>No questions yet. Ask the first one!</p>'; return; }
        container.innerHTML = snap.docs.map(doc => {
            const q = doc.data();
            return `<div class="qa-item"><strong>${escapeHtml(q.name)}</strong> asked: <p>${escapeHtml(q.question)}</p>${q.answer ? `<div class="answer"><strong>Answer:</strong> ${escapeHtml(q.answer)}</div>` : '<em>Awaiting answer...</em>'}</div>`;
        }).join('');
    } catch (err) { container.innerHTML = '<p>Unable to load Q&A.</p>'; }
}
async function submitQuestion(e) {
    e.preventDefault();
    const name = document.getElementById('questionName').value.trim();
    const question = document.getElementById('questionText').value.trim();
    if (!name || !question) { alert('Please fill both fields'); return; }
    await ensureUser();
    await firebase.firestore().collection('products').doc(currentProduct.id).collection('questions').add({
        name, question, userId: currentUserId, timestamp: firebase.firestore.FieldValue.serverTimestamp(), answer: null
    });
    document.getElementById('qa-form').reset();
    renderQA(currentProduct.id);
    showToast('Question submitted!');
}

// ========== RELATED BLOGS ==========
async function loadRelatedBlogs(category) {
    const section = document.getElementById('related-blogs-section');
    const container = document.getElementById('related-blogs');
    if (!section || !container) return;
    try {
        const snap = await firebase.firestore().collection('blog').where('category', '==', category).limit(3).get();
        if (snap.empty) { section.style.display = 'none'; return; }
        section.style.display = 'block';
        container.innerHTML = snap.docs.map(doc => {
            const post = doc.data();
            return `<div class="blog-card"><a href="../blog/${doc.id}.html"><img src="${post.image}" alt="${post.title}"><h4>${escapeHtml(post.title)}</h4></a></div>`;
        }).join('');
    } catch (err) { section.style.display = 'none'; }
}

// ========== AFFILIATE BADGES ==========
function showAffiliateBadges(badges) {
    const container = document.getElementById('affiliate-badges');
    if (!container) return;
    if (!badges || badges.length === 0) { container.style.display = 'none'; return; }
    container.innerHTML = badges.map(b => `<span class="affiliate-badge">${escapeHtml(b)}</span>`).join(' ');
    container.style.display = 'block';
}

// ========== REVIEWS ==========
async function renderReviews(product) {
    const el = document.getElementById('reviews-list');
    if (!el) return;
    el.innerHTML = '<div class="loading-reviews">Loading reviews...</div>';
    try {
        const snap = await firebase.firestore().collection('products').doc(product.id).collection('reviews').orderBy('timestamp', 'desc').limit(20).get();
        if (snap.empty) { el.innerHTML = '<p>No reviews yet. Be the first!</p>'; return; }
        el.innerHTML = snap.docs.map(doc => {
            const r = doc.data();
            return `<div class="review"><strong>${escapeHtml(r.name)}</strong> - ${'⭐'.repeat(r.rating)}<p>${escapeHtml(r.text)}</p><small>${r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString() : ''}</small></div>`;
        }).join('');
    } catch (err) { el.innerHTML = '<p>Unable to load reviews.</p>'; }
}
async function handleReviewSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('reviewerName').value.trim();
    const rating = parseInt(document.getElementById('reviewRating').value, 10);
    const text = document.getElementById('reviewText').value.trim();
    const errorDiv = document.getElementById('reviewError');
    if (!name || !rating || !text) { errorDiv.innerText = 'Please fill all fields.'; errorDiv.style.display = 'block'; return; }
    errorDiv.style.display = 'none';
    await ensureUser();
    await firebase.firestore().collection('products').doc(currentProduct.id).collection('reviews').add({
        name, rating, text, userId: currentUserId, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    await updateRatingDisplay();
    document.getElementById('review-form').reset();
    showToast('Thank you for your review!');
}

// ========== FETCH LIVE REVIEW STATS ==========
async function fetchProductReviewStats(productId) {
    try {
        const snap = await firebase.firestore().collection('products').doc(productId).collection('reviews').get();
        const count = snap.size;
        let avg = 0;
        if (count > 0) {
            let total = 0;
            snap.forEach(d => total += d.data().rating || 0);
            avg = Math.round((total / count) * 10) / 10;
        }
        return { reviewCount: count, avgRating: avg };
    } catch (err) { return { reviewCount: 0, avgRating: 0 }; }
}
async function updateRatingDisplay() {
    if (!currentProduct) return;
    const stats = await fetchProductReviewStats(currentProduct.id);
    currentProduct.rating = stats.avgRating;
    currentProduct.reviewCount = stats.reviewCount;
    const ratingContainer = document.querySelector(".product-details .rating-reviews");
    if (ratingContainer) {
        const starsHtml = '⭐'.repeat(Math.floor(stats.avgRating)) + (stats.avgRating % 1 >= 0.5 ? '½' : '');
        ratingContainer.innerHTML = `<div class="stars">${starsHtml}</div><span class="rating-value">${stats.avgRating || 0}</span><span class="review-count">(${stats.reviewCount} reviews)</span>`;
    }
    await renderReviews(currentProduct);
}

// ========== GET KEY SPECIFICATIONS ==========
function getKeySpecs(product) {
    if (product.keySpecs && Array.isArray(product.keySpecs) && product.keySpecs.length) return product.keySpecs;
    if (product.specifications && typeof product.specifications === 'object') {
        const entries = Object.entries(product.specifications);
        if (entries.length) return entries.slice(0, 4).map(([k, v]) => `${k}: ${v}`);
    }
    return [];
}

// ========== CAROUSEL: Same Brand + Same Subsubcategory + Same Fabric (in‑page update) ==========
async function renderSameBrandFabricSubsubCarousel() {
    if (!currentProduct) return;
    
    // Get fabric from specifications (case-insensitive)
    const fabric = currentProduct.specifications?.fabric || 
                   currentProduct.specifications?.Fabric || 
                   currentProduct.extraFields?.fabric || null;
    
    let query = firebase.firestore().collection('products')
        .where('brand', '==', currentProduct.brand)
        .where('subsubcategory', '==', currentProduct.subsubcategory)
        .where('status', '==', 'active')
        .limit(20);
    
    let snap = await query.get();
    let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by fabric client-side
    if (fabric) {
        products = products.filter(p => {
            const pFabric = p.specifications?.fabric || p.specifications?.Fabric || p.extraFields?.fabric;
            return pFabric && pFabric.toLowerCase() === fabric.toLowerCase();
        });
    }
    
    // Exclude current product
    products = products.filter(p => p.id !== currentProduct.id).slice(0, 10);
    
    if (products.length === 0) return;
    
    // Create carousel container
    const carouselDiv = document.createElement('div');
    carouselDiv.className = 'same-brand-carousel';
    carouselDiv.innerHTML = products.map(p => `
        <div class="carousel-card" data-product-id="${p.id}">
            <img src="${p.image || 'https://placehold.co/160x140?text=No+Image'}" alt="${escapeHtml(p.title)}" loading="lazy">
            <div class="carousel-title">${escapeHtml(p.title)}</div>
        </div>
    `).join('');
    
    // Insert carousel below product title
    const titleElement = document.querySelector('.product-title');
    if (titleElement && titleElement.parentNode) {
        const existingCarousel = titleElement.parentNode.querySelector('.same-brand-carousel');
        if (existingCarousel) existingCarousel.remove();
        titleElement.insertAdjacentElement('afterend', carouselDiv);
    }
    
    // Add click handlers to load new product data (in‑page update)
    carouselDiv.querySelectorAll('.carousel-card').forEach(card => {
        card.addEventListener('click', async () => {
            const newProductId = card.dataset.productId;
            if (newProductId === currentProduct.id) return;
            // Fetch and update the page
            await loadAndRenderProduct(newProductId);
            // Highlight the new current product in carousel
            carouselDiv.querySelectorAll('.carousel-card').forEach(c => c.classList.remove('active-product'));
            card.classList.add('active-product');
        });
    });
    
    // Highlight current product if present (should not be, but just in case)
    const currentCard = carouselDiv.querySelector(`.carousel-card[data-product-id="${currentProduct.id}"]`);
    if (currentCard) currentCard.classList.add('active-product');
}

// Function to load a product and update the entire page (in‑page update)
async function loadAndRenderProduct(productId) {
    try {
        const doc = await firebase.firestore().collection('products').doc(productId).get();
        if (!doc.exists) return;
        const productData = { id: doc.id, ...doc.data() };
        currentProduct = productData;
        
        // Update all sections
        renderProductDetails(currentProduct);
        renderProductTags(currentProduct.tags || []);
        renderTabsContent(currentProduct);
        renderSimilarProductsBySubsubFabric(); // update bottom similar products
        renderTopRatedProducts();
        initTabs();
        trackUserProductView(productId, ["carousel_click"]).catch(console.warn);
        if (currentProduct.category) loadRelatedBlogs(currentProduct.category);
        // Update URL without reload (optional)
        history.pushState({}, '', `/product/index.html?id=${productId}`);
    } catch (err) {
        console.error("Failed to load product:", err);
        showToast("Error loading product");
    }
}

// ========== SIMILAR PRODUCTS (bottom): same subsubcategory + same fabric (navigate) ==========
async function renderSimilarProductsBySubsubFabric() {
    const el = document.getElementById("similar-products");
    if (!el) return;
    el.innerHTML = '<div class="loading">Loading similar products...</div>';
    
    if (!currentProduct) return;
    
    const fabric = currentProduct.specifications?.fabric || 
                   currentProduct.specifications?.Fabric || 
                   currentProduct.extraFields?.fabric || null;
    
    let query = firebase.firestore().collection('products')
        .where('subsubcategory', '==', currentProduct.subsubcategory)
        .where('status', '==', 'active')
        .limit(30);
    
    let snap = await query.get();
    let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter by fabric client-side
    if (fabric) {
        products = products.filter(p => {
            const pFabric = p.specifications?.fabric || p.specifications?.Fabric || p.extraFields?.fabric;
            return pFabric && pFabric.toLowerCase() === fabric.toLowerCase();
        });
    }
    
    // Exclude current product
    products = products.filter(p => p.id !== currentProduct.id).slice(0, 10);
    
    if (products.length === 0) {
        el.innerHTML = "<p>No similar products found.</p>";
        return;
    }
    
    el.innerHTML = '';
    products.forEach(p => {
        el.appendChild(createProductCard(p));
    });
}

// ========== TOP RATED PRODUCTS ==========
async function renderTopRatedProducts() {
    const el = document.getElementById("top-rated-products");
    if (!el) return;
    el.innerHTML = '<div class="loading">Loading top rated...</div>';
    if (!currentProduct || !currentProduct.subcategory) return;
    
    const snap = await firebase.firestore().collection('products')
        .where('subcategory', '==', currentProduct.subcategory)
        .where('status', '==', 'active')
        .limit(20)
        .get();
    
    let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    products = products.filter(p => p.id !== currentProduct.id)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);
    
    if (products.length === 0) {
        el.innerHTML = "<p>No top rated products in this category.</p>";
        return;
    }
    
    el.innerHTML = '';
    products.forEach(p => {
        el.appendChild(createProductCard(p));
    });
}

// ========== TAGS ==========
function renderProductTags(tags = []) {
    const el = document.getElementById("product-tags");
    if (!el) return;
    el.innerHTML = tags.map(t => `<button class="tag" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`).join("");
    document.querySelectorAll(".tag").forEach(btn => {
        btn.onclick = () => renderSimilarProductsBySubsubFabric(); // re-filter by tag? optional
    });
}

// ========== TAB SWITCHING ==========
function initTabs() {
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");
    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            tabContents.forEach(content => content.classList.remove("active"));
            const activeContent = document.getElementById(`tab-${tabId}`);
            if (activeContent) activeContent.classList.add("active");
        });
    });
}

// ========== RENDER PRODUCT DETAILS (main) ==========
function renderProductDetails(product) {
    document.title = `${product.title} | GetUpDeals`;
    const discount = calculateDiscount(product.price, product.originalPrice);
    const container = document.getElementById("product-details-container");
    if (!container) return;
    const keySpecs = getKeySpecs(product);
    container.innerHTML = `
        <div class="product-page">
            <div class="product-gallery"><img src="${product.image}" class="main-image" alt="${escapeHtml(product.title)}"><div class="thumbnail-row">${(product.gallery || [product.image]).map(img => `<img src="${img}" data-img="${img}" alt="Thumbnail">`).join("")}</div></div>
            <div class="product-details">
                <div class="brand-badge">${escapeHtml(product.brand || product.category || 'Brand')}</div>
                <h1 class="product-title">${escapeHtml(product.title)}</h1>
                <div class="price-block"><div class="current-price">₹${Number(product.price).toLocaleString()}</div>${product.originalPrice ? `<div class="original-price">₹${Number(product.originalPrice).toLocaleString()}</div><div class="discount-badge">-${discount}%</div>` : ''}</div>
                <div class="store-comparison"><h3>Available at these stores</h3>${(product.affiliateLinks || []).map(link => `<div class="store-row" data-store="${link.store.toLowerCase()}"><img src="../assets/images/stores/${link.store.toLowerCase()}-logo.svg" alt="${link.store}" class="store-logo" onerror="this.src='https://placehold.co/80x40?text=${encodeURIComponent(link.store)}'"><div class="store-price">₹${link.price ? Number(link.price).toLocaleString() : Number(product.price).toLocaleString()}</div><button class="store-deal-btn" data-product-id="${product.id}" data-store="${escapeAttr(link.store)}" data-url="${escapeAttr(link.url)}" rel="sponsored nofollow">View on ${escapeHtml(link.store)} →</button>${link.isBestPrice ? '<span class="best-price-tag">Best Price</span>' : ''}</div>`).join("")}</div>
                <div class="key-specs"><h3>Key Specifications</h3><ul>${keySpecs.map(spec => `<li>${escapeHtml(spec)}</li>`).join("")}</ul><button class="view-all-specs" data-tab="specs">See all specifications →</button></div>
                <div class="action-buttons"><button class="btn-get-deal" id="bestDealBtn">Get Best Deal <i class="fas fa-arrow-right"></i></button></div>
                <div class="trust-signals"><span><i class="fas fa-chart-line"></i> ${product.sold || 0} bought in past 24h</span><span><i class="fas fa-truck"></i> Free Shipping</span><span><i class="fas fa-credit-card"></i> No-Cost EMI available</span></div>
            </div>
        </div>
    `;
    setupImageGallery();
    ensureImagePreviewModal();
    setupFullImagePreview();
    document.querySelector('.view-all-specs')?.addEventListener('click', (e) => {
        e.preventDefault();
        const specsTabBtn = document.querySelector('.tab-btn[data-tab="specs"]');
        if (specsTabBtn) {
            specsTabBtn.click();               // activate Specifications tab
            const specsContent = document.getElementById('tab-specs');
            if (specsContent) {
                const offset = 120;            // ↓ adjust this value (80–120px works well)
                const rect = specsContent.getBoundingClientRect();
                const scrollTop = window.scrollY + rect.top - offset;
                window.scrollTo({ top: scrollTop, behavior: 'smooth' });
            }
        }
    });
    document.getElementById('bestDealBtn')?.addEventListener('click', () => document.querySelector('.store-deal-btn')?.click());
    
    if (product.affiliateBadges) showAffiliateBadges(product.affiliateBadges);
    addToRecentlyViewed(product);
    
    // Render carousel after product details are in DOM
    renderSameBrandFabricSubsubCarousel();
}

// ========== TABS CONTENT ==========
function renderTabsContent(product) {
    const descEl = document.getElementById("product-description");
    if (descEl) descEl.innerHTML = product.description ? `<p>${escapeHtml(product.description)}</p>` : "<p>No description available.</p>";
    const specsTable = document.getElementById("specs-table");
    if (specsTable) {
        if (product.specifications && typeof product.specifications === 'object') {
            let rows = "";
            for (const [key, value] of Object.entries(product.specifications)) rows += `<tr><td><strong>${escapeHtml(key)}</strong></td><td>${escapeHtml(value)}</td></tr>`;
            specsTable.innerHTML = rows || "<tr><td colspan='2'>No specifications provided.</td></tr>";
        } else specsTable.innerHTML = "<tr><td colspan='2'>No specifications available.</td></tr>";
    }
    const priceHistoryContainer = document.getElementById("price-history-chart");
    if (priceHistoryContainer) {
        if (product.priceHistory && Array.isArray(product.priceHistory) && product.priceHistory.length) {
            const canvas = document.getElementById('priceHistoryChart');
            if (canvas) {
                canvas.style.display = 'block';
                priceHistoryContainer.style.display = 'none';
                if (priceChart) priceChart.destroy();
                priceChart = new Chart(canvas, {
                    type: 'line',
                    data: { labels: product.priceHistory.map(ph => ph.date), datasets: [{ label: 'Price (₹)', data: product.priceHistory.map(ph => ph.price), borderColor: '#3b82f6' }] }
                });
            }
        } else priceHistoryContainer.innerHTML = "📊 No price history available.";
    }
    renderReviews(product);
    renderQA(product.id);
}

// ========== FETCH PRODUCT (real-time) ==========
async function fetchProductAndRelated(productId) {
    const container = document.getElementById("product-details-container");
    if (container) container.innerHTML = '<div class="loading">Loading product...</div>';
    try {
        if (productUnsubscribe) productUnsubscribe();
        productUnsubscribe = firebase.firestore().collection('products').doc(productId).onSnapshot(async (doc) => {
            if (!doc.exists) throw new Error("Product not found");
            const productData = { id: doc.id, ...doc.data() };
            currentProduct = productData;
            renderProductDetails(currentProduct);
            renderProductTags(currentProduct.tags || []);
            renderTabsContent(currentProduct);
            await renderSimilarProductsBySubsubFabric();
            await renderTopRatedProducts();
            initTabs();
            trackUserProductView(productId, ["product_page"]).catch(console.warn);
            if (currentProduct.category) loadRelatedBlogs(currentProduct.category);
        });
    } catch (err) {
        console.error(err);
        if (container) container.innerHTML = `<p class="error">Failed to load product: ${escapeHtml(err.message)}</p>`;
    }
}

// ========== EVENT DELEGATION ==========
function setupGlobalEventDelegation() {
    document.getElementById("product-details-container")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".store-deal-btn");
        if (btn) {
            e.preventDefault();
            trackAndRedirect(btn.dataset.productId, btn.dataset.store, btn.dataset.url);
        }
    });
    document.getElementById('qa-form')?.addEventListener('submit', submitQuestion);
    document.getElementById('review-form')?.addEventListener('submit', handleReviewSubmit);
}

// ========== INIT ==========
document.addEventListener("DOMContentLoaded", () => {
    const productId = getQueryParam("id");
    if (!productId) {
        document.getElementById("product-details-container").innerHTML = "<p class='error'>No product ID specified.</p>";
        return;
    }
    fetchProductAndRelated(productId);
    setupGlobalEventDelegation();
});