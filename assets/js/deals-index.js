// deals-index.js - Full deals loader with sorting & pagination
// Uses same card HTML/styling as deals-loader.js

class DealsIndex {
    constructor() {
        this.dealsContainer = document.getElementById('dealsGrid');
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.sortSelect = document.getElementById('sortBy');
        this.loadMoreBtn = document.getElementById('loadMoreDeals');
        this.pageLinks = document.querySelectorAll('.page-link');   // numbered pagination
        this.currentFilter = 'all';
        this.currentSort = 'popular';
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.allDeals = [];        // original unfiltered array
        this.filteredDeals = [];   // after store filter
        this.isLoading = false;
        this.db = firebase.firestore();
    }

    async init() {
        try {
            this.showLoadingSkeletons();
            await this.loadDealsData();
            this.applyFiltersAndRender();
            this.setupEventListeners();
        } catch (error) {
            console.error('DealsIndex init error:', error);
            this.showErrorState();
        }
    }

    showLoadingSkeletons() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'flex';
    }

    hideLoadingSkeletons() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    async loadDealsData() {
        // Fetch active products from Firestore
        const snapshot = await this.db.collection('products')
            .where('status', '==', 'active')
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            this.allDeals = [];
            return;
        }

        // For each product, fetch its reviews and map to deal object
        const productPromises = snapshot.docs.map(async doc => {
            const product = doc.data();
            const productId = doc.id;

            let reviewCount = 0;
            let avgRating = product.rating || 0;
            try {
                const reviewsSnap = await this.db
                    .collection('products')
                    .doc(productId)
                    .collection('reviews')
                    .get();
                reviewCount = reviewsSnap.size;
                if (reviewCount > 0) {
                    let total = 0;
                    reviewsSnap.forEach(r => total += (r.data().rating || 0));
                    avgRating = Math.round((total / reviewCount) * 10) / 10;
                }
            } catch (err) {
                console.warn(`Reviews error for ${productId}:`, err);
            }

            return this.mapProductToDeal(product, productId, reviewCount, avgRating);
        });

        this.allDeals = (await Promise.all(productPromises)).filter(d => d !== null);
    }

    mapProductToDeal(product, id, reviewCount, avgRating) {
        // Determine store from first affiliate link
        let store = 'unknown';
        if (product.affiliateLinks && product.affiliateLinks.length > 0) {
            store = product.affiliateLinks[0].store.toLowerCase();
        }

        const description = product.extraFields?.description ||
                            product.extraFields?.shortDesc ||
                            `${product.title} - Grab this amazing deal!`;

        const rating = avgRating || product.rating || 0;
        const reviews = reviewCount || product.reviewCount || 0;
        const expiry = product.extraFields?.expiry || null;
        const isFeatured = product.tags?.includes('featured') || product.tags?.includes('hot') || false;
        const sold = product.sold || 0;

        if (!product.title || !product.price) return null;

        let discount = product.discount || 0;
        if (!discount && product.originalPrice && product.originalPrice > product.price) {
            discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
        }

        return {
            id: id,
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
            sold: sold,
            createdAt: product.createdAt?.toDate?.() || new Date()
        };
    }

    // ----- FILTER & SORT -----
    applyFiltersAndRender() {
        // 1. Filter by store
        let deals = this.currentFilter === 'all'
            ? [...this.allDeals]
            : this.allDeals.filter(d => d.store === this.currentFilter);

        // 2. Sort
        deals = this.sortDeals(deals, this.currentSort);

        this.filteredDeals = deals;
        this.currentPage = 1;   // reset to first page when filters change
        this.renderCurrentPage();
        this.updatePaginationControls();
    }

    sortDeals(deals, sortBy) {
        const sorted = [...deals];
        switch (sortBy) {
            case 'discount_high':
                return sorted.sort((a, b) => b.discount - a.discount);
            case 'price_low':
                return sorted.sort((a, b) => a.currentPrice - b.currentPrice);
            case 'newest':
                return sorted.sort((a, b) => b.createdAt - a.createdAt);
            case 'popular':
            default:
                // Popular = highest sold count or highest rating
                return sorted.sort((a, b) => (b.sold || 0) - (a.sold || 0) || (b.rating - a.rating));
        }
    }

    // ----- PAGINATION -----
    renderCurrentPage() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageDeals = this.filteredDeals.slice(start, end);
        this.renderDeals(pageDeals);
        this.hideLoadingSkeletons();

        if (pageDeals.length === 0 && this.filteredDeals.length === 0) {
            this.showNoDealsMessage();
        }
    }

    updatePaginationControls() {
        const totalPages = Math.ceil(this.filteredDeals.length / this.itemsPerPage);
        // Update Load More button visibility
        if (this.loadMoreBtn) {
            if (this.currentPage >= totalPages) {
                this.loadMoreBtn.style.display = 'none';
            } else {
                this.loadMoreBtn.style.display = 'inline-flex';
            }
        }
        // Update numbered page links (if you keep them)
        if (this.pageLinks.length) {
            this.pageLinks.forEach(link => {
                const pageNum = parseInt(link.textContent);
                if (!isNaN(pageNum)) {
                    link.classList.toggle('active', pageNum === this.currentPage);
                }
            });
        }
    }

    loadMore() {
        if (this.currentPage < Math.ceil(this.filteredDeals.length / this.itemsPerPage)) {
            this.currentPage++;
            this.renderCurrentPage();
            this.updatePaginationControls();
        }
    }

    goToPage(pageNum) {
        const totalPages = Math.ceil(this.filteredDeals.length / this.itemsPerPage);
        if (pageNum >= 1 && pageNum <= totalPages) {
            this.currentPage = pageNum;
            this.renderCurrentPage();
            this.updatePaginationControls();
        }
    }

    // ----- RENDER DEAL CARDS (IDENTICAL TO deals-loader.js) -----
    renderDeals(deals) {
        this.dealsContainer.innerHTML = '';
        deals.forEach(deal => {
            const card = this.createDealCard(deal);
            this.dealsContainer.appendChild(card);
        });
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

    // ----- EVENT LISTENERS -----
    setupEventListeners() {
        // Store filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.store; // dataset.store = 'all', 'amazon', etc.
                this.applyFiltersAndRender();
            });
        });

        // Sort dropdown
        if (this.sortSelect) {
            this.sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFiltersAndRender();
            });
        }

        // Load More button
        if (this.loadMoreBtn) {
            this.loadMoreBtn.addEventListener('click', () => this.loadMore());
        }

        // Numbered pagination links
        if (this.pageLinks.length) {
            this.pageLinks.forEach(link => {
                const pageNum = parseInt(link.textContent);
                if (!isNaN(pageNum)) {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        this.goToPage(pageNum);
                    });
                }
            });
        }
    }

    // ----- UTILITIES -----
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
        this.dealsContainer.innerHTML = `
            <div class="no-deals-message">
                <i class="fas fa-search"></i>
                <h3>No deals found</h3>
                <p>Try changing your filters or check back later for new deals!</p>
            </div>
        `;
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

// Start everything when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const dealsIndex = new DealsIndex();
    dealsIndex.init();
});