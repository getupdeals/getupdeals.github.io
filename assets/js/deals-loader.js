// deals-loader.js - Dynamically loads deals from Firebase (Products Manager)
class DealsLoader {
    constructor() {
        this.dealsContainer = document.getElementById('dealsGrid');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.currentFilter = 'all';
        this.deals = [];
        this.isLoading = false;
        this.db = firebase.firestore();
    }

    async init() {
        try {
            this.showLoadingSkeletons();
            await this.loadDealsData();
            this.renderDeals(this.deals);
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing DealsLoader:', error);
            this.showErrorState();
        }
    }

    showLoadingSkeletons() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
    }

    hideLoadingSkeletons() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }

    async loadDealsData() {
        try {
            // Fetch all active products
            const snapshot = await this.db.collection('products')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .get();

            if (snapshot.empty) {
                console.warn('No active products found');
                this.deals = [];
                return;
            }

            // Prepare array of promises to fetch review counts & ratings
            const productPromises = snapshot.docs.map(async doc => {
                const product = doc.data();
                const productId = doc.id;
                
                // Get review stats from subcollection
                let reviewCount = 0;
                let avgRating = product.rating || 0; // fallback to stored rating
                
                try {
                    const reviewsSnap = await this.db
                        .collection('products')
                        .doc(productId)
                        .collection('reviews')
                        .get();
                    
                    reviewCount = reviewsSnap.size;
                    
                    if (reviewCount > 0) {
                        let totalRating = 0;
                        reviewsSnap.forEach(reviewDoc => {
                            const review = reviewDoc.data();
                            totalRating += review.rating || 0;
                        });
                        avgRating = totalRating / reviewCount;
                        avgRating = Math.round(avgRating * 10) / 10; // one decimal
                    }
                } catch (err) {
                    console.warn(`Could not fetch reviews for ${productId}:`, err);
                }
                
                // Map product to deal object
                return this.mapProductToDeal(product, productId, reviewCount, avgRating);
            });
            
            this.deals = (await Promise.all(productPromises)).filter(deal => deal !== null);
            
        } catch (error) {
            console.error('Firebase fetch error:', error);
            throw error;
        }
    }

    mapProductToDeal(product, productId, reviewCount, avgRating) {
        // Determine store from first affiliate link
        let store = 'unknown';
        if (product.affiliateLinks && product.affiliateLinks.length > 0) {
            store = product.affiliateLinks[0].store.toLowerCase();
        }
        
        // Use extraFields for description if available
        let description = product.extraFields?.description || 
                         product.extraFields?.shortDesc || 
                         `${product.title} - Grab this amazing deal!`;
        
        // Use provided rating (from reviews) or fallback to product.rating
        const rating = avgRating || product.rating || 0;
        const reviews = reviewCount || product.reviewCount || 0;
        
        // Expiry date (from extraFields or null)
        const expiry = product.extraFields?.expiry || null;
        
        // Featured flag (check tags)
        const isFeatured = product.tags?.includes('featured') || 
                           product.tags?.includes('hot') || 
                           false;
        
        // Sold count (trust signal)
        const sold = product.sold || 0;
        
        // Ensure required fields exist
        if (!product.title || !product.price) return null;
        
        // Calculate discount if not already present
        let discount = product.discount || 0;
        if (!discount && product.originalPrice && product.originalPrice > product.price) {
            discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        }
        
        return {
            id: productId,
            title: product.title,
            description: description,
            currentPrice: product.price,
            originalPrice: product.originalPrice || product.price,
            discount: discount,
            category: product.category || 'uncategorized',
            store: store,
            image: product.image || '',
            rating: rating,
            reviews: reviews,
            expiry: expiry,
            isFeatured: isFeatured,
            tags: product.tags || [],
            sold: sold
        };
    }

    renderDeals(deals) {
        this.dealsContainer.innerHTML = '';
        const filteredDeals = this.currentFilter === 'all' 
            ? deals 
            : deals.filter(deal => deal.store === this.currentFilter);
        
        filteredDeals.forEach(deal => {
            const dealCard = this.createDealCard(deal);
            this.dealsContainer.appendChild(dealCard);
        });
        
        this.hideLoadingSkeletons();
        
        if (filteredDeals.length === 0) {
            this.showNoDealsMessage();
        }
    }

    createDealCard(deal) {
        const card = document.createElement('a');
        card.className = 'deal-card';
        card.href = `/product/index.html?id=${deal.id}`;
        card.style.textDecoration = 'none';
        card.style.color = 'inherit';
        card.style.cursor = 'pointer';
        card.dataset.store = deal.store;
        card.dataset.category = deal.category;
        card.dataset.dealId = deal.id;
        
        const formattedCurrentPrice = `₹${deal.currentPrice.toLocaleString('en-IN')}`;
        const formattedOriginalPrice = `₹${deal.originalPrice.toLocaleString('en-IN')}`;
        const youSave = deal.originalPrice - deal.currentPrice;
        
        card.innerHTML = `
            <div class="deal-badges">
                <span class="deal-badge discount">${deal.discount}% OFF</span>
                <span class="deal-badge store ${deal.store}">
                    ${this.getStoreIcon(deal.store)} ${deal.store.charAt(0).toUpperCase() + deal.store.slice(1)}
                </span>
                ${deal.isFeatured ? '<span class="deal-badge featured">🔥 Hot</span>' : ''}
            </div>
            
            <div class="deal-image">
                <img src="${deal.image || 'https://placehold.co/200x200?text=No+Image'}" alt="${this.escapeHtml(deal.title)}" loading="lazy">
            </div>
            
            <div class="deal-content">
                <h3 class="deal-title">${this.escapeHtml(deal.title.substring(0, 60))}</h3>
                <div class="deal-pricing">
                    <div class="current-price">${formattedCurrentPrice}</div>
                    <div class="original-price">${formattedOriginalPrice}</div>
                    <div class="you-save">You save: ₹${youSave.toLocaleString('en-IN')}</div>
                </div>
                
                <div class="deal-expiry">
                    <i class="far fa-clock"></i>
                    <span>Deal ends: ${deal.expiry ? this.formatDate(deal.expiry) : 'Limited time'}</span>
                </div>
                
                ${deal.sold > 0 ? `
                <div class="deal-sold">
                    <i class="fas fa-chart-line"></i>
                    <span>${deal.sold} bought in past 24h</span>
                </div>
                ` : ''}
                
                <div class="deal-actions">
                    <span class="deal-btn primary">View Deal <i class="fas fa-external-link-alt"></i></span>
                    <button class="deal-btn secondary share-btn" data-deal-id="${deal.id}">
                        <i class="fas fa-share-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Wishlist & share handlers
        const shareBtn = card.querySelector('.share-btn');
        
        
        if (shareBtn) {
            shareBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.shareDeal(shareBtn, deal);
            });
        }
        
        return card;
    }

    getStoreIcon(store) {
        const icons = {
            'amazon': '<i class="fab fa-amazon"></i>',
            'flipkart': '<img src="./assets/images/ui/flipkart-icon.png" alt="Flipkart" class="store-icon">',
            'myntra': '<img src="./assets/images/ui/myntra-icon.png" alt="Myntra" class="store-icon">',
            'ajio': '<img src="./assets/images/ui/ajio-icon.png" alt="Ajio" class="store-icon">'
        };
        return icons[store] || '<i class="fas fa-store"></i>';
    }


    formatDate(dateString) {
        if (!dateString) return 'Limited time';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    setupEventListeners() {
        this.filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentFilter = button.dataset.filter;
                this.renderDeals(this.deals);
            });
        });
    }

    shareDeal(button, deal) {
        const dealUrl = window.location.origin + `/product/index.html?id=${deal.id}`;
        if (navigator.share) {
            navigator.share({
                title: deal.title,
                text: `Check out this amazing deal: ${deal.title} for just ₹${deal.currentPrice} (${deal.discount}% OFF)`,
                url: dealUrl
            });
        } else {
            navigator.clipboard.writeText(dealUrl).then(() => {
                this.showToast('Deal link copied to clipboard!');
            }).catch(() => {
                alert('Deal link copied to clipboard!');
            });
        }
        if (window.analytics) window.analytics.trackEvent('deal_share', { dealId: deal.id });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    showNoDealsMessage() {
        const message = document.createElement('div');
        message.className = 'no-deals-message';
        message.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No deals found</h3>
            <p>Try changing your filters or check back later for new deals!</p>
        `;
        this.dealsContainer.appendChild(message);
    }

    showErrorState() {
        this.dealsContainer.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Unable to load deals</h3>
                <p>Please check your internet connection and try again.</p>
                <button class="retry-btn" id="retryLoading">Retry</button>
            </div>
        `;
        document.getElementById('retryLoading')?.addEventListener('click', () => this.init());
    }

    escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const dealsLoader = new DealsLoader();
    dealsLoader.init();
});

// At the very end of deals-loader.js
if (!window.skipDefaultDealsLoader) {
    document.addEventListener('DOMContentLoaded', () => {
        const dealsLoader = new DealsLoader();
        dealsLoader.init();
    });
}