// =============================================
// MARKETPLACE PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentCommunity = 'kwamankese';
let allProducts = [];
let featuredProducts = [];
let currentSort = 'popular';
let currentCategory = 'all';
let cartItems = [];
let wishlistItems = [];
let showAllFeatured = false;
let showAllProducts = false;

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'marketplace': '../pages/marketplace.html',
    'messages': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// CATEGORIES
// =============================================
const CATEGORIES = [
    { id: 'all', icon: 'fa-th-large', label: 'All' },
    { id: 'electronics', icon: 'fa-laptop', label: 'Electronics' },
    { id: 'fashion', icon: 'fa-tshirt', label: 'Fashion' },
    { id: 'home', icon: 'fa-house-chimney', label: 'Home & Living' },
    { id: 'beauty', icon: 'fa-spa', label: 'Beauty' },
    { id: 'food', icon: 'fa-utensils', label: 'Food' },
    { id: 'agriculture', icon: 'fa-seedling', label: 'Farm Produce' },
    { id: 'more', icon: 'fa-ellipsis-h', label: 'More' }
];

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatCurrency(amount) {
    return `GH¢ ${(amount || 0).toFixed(2)}`;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// =============================================
// NAVIGATION FUNCTIONS - FIXED
// =============================================

function navigateTo(page) {
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    
    let targetUrl = NAV_PAGES[page];
    if (!targetUrl) {
        console.warn('Unknown page:', page);
        return;
    }
    
    if (isInPages) {
        targetUrl = targetUrl.replace('../pages/', './');
    }
    
    window.location.href = targetUrl;
}

function setupNavItemListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    const fabButton = document.querySelector('.fab-button');
    
    // FIRST: Remove any existing active classes from ALL nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine which page we're on
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'marketplace.html';
    const isMarketplacePage = currentPage === 'marketplace.html';
    
    navItems.forEach(item => {
        const label = item.querySelector('.nav-label')?.textContent?.toLowerCase() || '';
        const icon = item.querySelector('.nav-icon');
        let page = null;
        
        if (label === 'home' || (icon && icon.classList.contains('fa-house'))) {
            page = 'home';
        } else if (label === 'explore' || (icon && icon.classList.contains('fa-magnifying-glass'))) {
            page = 'explore';
        } else if (label === 'messages' || (icon && icon.classList.contains('fa-comment-dots'))) {
            page = 'messages';
        } else if (label === 'profile' || (icon && icon.classList.contains('fa-user'))) {
            page = 'profile';
        }
        
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Set active state based on current page
        if (isMarketplacePage && page === 'explore') {
            newItem.classList.add('active');
        } else if (!isMarketplacePage && page === 'home' && currentPage === 'home.html') {
            newItem.classList.add('active');
        } else if (page === 'messages' && currentPage === 'community.html') {
            newItem.classList.add('active');
        } else if (page === 'profile' && currentPage === 'profile.html') {
            newItem.classList.add('active');
        }
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            const currentPageName = window.location.pathname.split('/').pop() || 'home.html';
            
            if (currentPageName === targetPage) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    if (fabButton) {
        const newFab = fabButton.cloneNode(true);
        fabButton.parentNode.replaceChild(newFab, fabButton);
        
        newFab.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Opening create post...', 'info');
            window.location.href = '../pages/create-post.html';
        });
    }
}

// =============================================
// FIRESTORE DATA FETCHERS
// =============================================

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
            localStorage.setItem('bridgeconnect_user', JSON.stringify({
                uid: user.uid,
                ...currentUserData
            }));
            return currentUserData;
        }
        return null;
    } catch (error) {
        console.error('Error loading user data:', error);
        return null;
    }
}

async function loadProducts(community) {
    try {
        let query = db.collection('products')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(50);
        
        if (community && community !== 'all') {
            query = db.collection('products')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(50);
        }
        
        const snapshot = await query.get();
        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            products.push({
                id: doc.id,
                ...data
            });
        });
        
        allProducts = products;
        return products;
    } catch (error) {
        console.warn('Error loading products:', error.message);
        allProducts = [];
        return [];
    }
}

async function loadFeaturedProducts(community) {
    try {
        let query = db.collection('products')
            .where('status', '==', 'approved')
            .where('featured', '==', true)
            .orderBy('rating', 'desc')
            .limit(20);
        
        if (community && community !== 'all') {
            query = db.collection('products')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .where('featured', '==', true)
                .orderBy('rating', 'desc')
                .limit(20);
        }
        
        const snapshot = await query.get();
        const products = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            products.push({
                id: doc.id,
                ...data
            });
        });
        
        featuredProducts = products;
        return products;
    } catch (error) {
        console.warn('Error loading featured products:', error.message);
        // Fallback: get top rated products
        try {
            let fallbackQuery = db.collection('products')
                .where('status', '==', 'approved')
                .orderBy('rating', 'desc')
                .limit(12);
            
            if (community && community !== 'all') {
                fallbackQuery = db.collection('products')
                    .where('community', '==', community)
                    .where('status', '==', 'approved')
                    .orderBy('rating', 'desc')
                    .limit(12);
            }
            
            const fallbackSnapshot = await fallbackQuery.get();
            const fallbackProducts = [];
            fallbackSnapshot.forEach(doc => {
                const data = doc.data();
                fallbackProducts.push({
                    id: doc.id,
                    ...data
                });
            });
            featuredProducts = fallbackProducts;
            return fallbackProducts;
        } catch (e) {
            featuredProducts = [];
            return [];
        }
    }
}

// =============================================
// MODAL FUNCTIONS
// =============================================

function openCartModal() {
    // Remove any existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
        document.body.style.overflow = '';
    }
    
    const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
    
    const modalHTML = `
        <div class="modal-overlay" id="cartModal">
            <div class="modal-content">
                <!-- Header -->
                <div class="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Your Cart</h3>
                        <p class="text-sm text-gray-500 mt-0.5">${cartCount} item${cartCount !== 1 ? 's' : ''} in your cart</p>
                    </div>
                    <button class="modal-close w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                
                <!-- Cart Items -->
                <div class="p-6 max-h-[50vh] overflow-y-auto">
                    ${cartCount === 0 ? `
                        <div class="text-center py-12 text-gray-500">
                            <i class="fa-solid fa-cart-shopping text-5xl block mb-4 opacity-20"></i>
                            <p class="text-lg font-medium">Your cart is empty</p>
                            <p class="text-sm mt-1">Start shopping to add items</p>
                            <button onclick="closeModal()" class="mt-4 bg-primary text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                                Continue Shopping
                            </button>
                        </div>
                    ` : `
                        ${cartItems.map((item, index) => `
                            <div class="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
                                <div class="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                                    <img class="w-12 h-12 object-contain" src="${item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Product')}&background=22c55e&color=fff&size=100`}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Product')}&background=22c55e&color=fff&size=100'"/>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h4 class="text-sm font-semibold text-gray-800 line-clamp-1">${item.name || 'Product'}</h4>
                                    <p class="text-xs text-gray-500">${item.category || 'General'}</p>
                                    <div class="flex items-center gap-3 mt-1">
                                        <span class="text-sm font-bold text-secondary">${formatCurrency(item.price || 0)}</span>
                                        <div class="flex items-center gap-2">
                                            <button onclick="updateCartQuantity('${item.id}', -1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-xs font-bold">-</button>
                                            <span class="text-sm font-semibold w-6 text-center">${item.quantity || 1}</span>
                                            <button onclick="updateCartQuantity('${item.id}', 1)" class="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-xs font-bold">+</button>
                                        </div>
                                    </div>
                                </div>
                                <button onclick="removeFromCart('${item.id}')" class="text-gray-400 hover:text-red-500 transition-colors">
                                    <i class="fa-regular fa-trash-can"></i>
                                </button>
                            </div>
                        `).join('')}
                    `}
                </div>
                
                <!-- Footer -->
                ${cartCount > 0 ? `
                    <div class="sticky bottom-0 bg-white z-10 px-6 py-4 border-t border-gray-100">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-sm font-semibold text-gray-600">Total</span>
                            <span class="text-xl font-bold text-secondary">${formatCurrency(totalAmount)}</span>
                        </div>
                        <button class="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            <i class="fa-solid fa-lock"></i> Proceed to Checkout
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Ensure modal container exists
    let container = document.getElementById('modalContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modalContainer';
        document.body.appendChild(container);
    }
    
    container.innerHTML = modalHTML;
    
    const modal = document.getElementById('cartModal');
    if (!modal) return;
    
    const closeBtns = modal.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            const modalEl = document.getElementById('cartModal');
            if (modalEl) {
                modalEl.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', closeOnEscape);
            }
        }
    });
    
    document.body.style.overflow = 'hidden';
}

function openWishlistModal() {
    // Remove any existing modal
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
        document.body.style.overflow = '';
    }
    
    const wishlistCount = wishlistItems.length;
    
    const modalHTML = `
        <div class="modal-overlay" id="wishlistModal">
            <div class="modal-content">
                <!-- Header -->
                <div class="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">Your Wishlist</h3>
                        <p class="text-sm text-gray-500 mt-0.5">${wishlistCount} item${wishlistCount !== 1 ? 's' : ''} saved</p>
                    </div>
                    <button class="modal-close w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                
                <!-- Wishlist Items -->
                <div class="p-6 max-h-[50vh] overflow-y-auto">
                    ${wishlistCount === 0 ? `
                        <div class="text-center py-12 text-gray-500">
                            <i class="fa-regular fa-heart text-5xl block mb-4 opacity-20"></i>
                            <p class="text-lg font-medium">Your wishlist is empty</p>
                            <p class="text-sm mt-1">Save items you love to your wishlist</p>
                            <button onclick="closeModal()" class="mt-4 bg-primary text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
                                Start Shopping
                            </button>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            ${wishlistItems.map(item => `
                                <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div class="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-200">
                                        <img class="w-12 h-12 object-contain" src="${item.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Product')}&background=22c55e&color=fff&size=100`}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Product')}&background=22c55e&color=fff&size=100'"/>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <h4 class="text-sm font-semibold text-gray-800 line-clamp-1">${item.name || 'Product'}</h4>
                                        <p class="text-xs text-gray-500">${item.category || 'General'}</p>
                                        <p class="text-sm font-bold text-secondary">${formatCurrency(item.price || 0)}</p>
                                    </div>
                                    <button onclick="removeFromWishlist('${item.id}')" class="text-red-400 hover:text-red-600 transition-colors">
                                        <i class="fa-solid fa-heart"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
                
                <!-- Footer -->
                ${wishlistCount > 0 ? `
                    <div class="sticky bottom-0 bg-white z-10 px-6 py-4 border-t border-gray-100">
                        <button onclick="addAllToCart()" class="w-full bg-secondary text-white py-3 rounded-xl font-semibold hover:bg-secondary/90 transition-colors shadow-lg shadow-secondary/20 flex items-center justify-center gap-2">
                            <i class="fa-solid fa-cart-plus"></i> Add All to Cart
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Ensure modal container exists
    let container = document.getElementById('modalContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modalContainer';
        document.body.appendChild(container);
    }
    
    container.innerHTML = modalHTML;
    
    const modal = document.getElementById('wishlistModal');
    if (!modal) return;
    
    const closeBtns = modal.querySelectorAll('.modal-close');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = '';
        });
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            const modalEl = document.getElementById('wishlistModal');
            if (modalEl) {
                modalEl.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', closeOnEscape);
            }
        }
    });
    
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// =============================================
// CART FUNCTIONS
// =============================================

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId) || featuredProducts.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    const existingItem = cartItems.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        showToast(`Added another ${product.name || 'product'} to cart 🛒`, 'success');
    } else {
        cartItems.push({
            ...product,
            quantity: 1
        });
        showToast(`Added "${product.name || 'Product'}" to cart 🛒`, 'success');
    }
    
    updateCartBadge();
}

function removeFromCart(productId) {
    cartItems = cartItems.filter(item => item.id !== productId);
    updateCartBadge();
    showToast('Removed from cart', 'info');
    // Refresh modal if open
    if (document.getElementById('cartModal')) {
        openCartModal();
    }
}

function updateCartQuantity(productId, change) {
    const item = cartItems.find(i => i.id === productId);
    if (!item) return;
    
    const newQuantity = (item.quantity || 1) + change;
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    item.quantity = newQuantity;
    updateCartBadge();
    // Refresh modal
    if (document.getElementById('cartModal')) {
        openCartModal();
    }
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    
    const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    if (totalItems > 0) {
        badge.textContent = totalItems;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// =============================================
// WISHLIST FUNCTIONS
// =============================================

function toggleWishlist(productId) {
    const product = allProducts.find(p => p.id === productId) || featuredProducts.find(p => p.id === productId);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    const existingIndex = wishlistItems.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
        wishlistItems.splice(existingIndex, 1);
        showToast(`Removed from wishlist`, 'info');
    } else {
        wishlistItems.push(product);
        showToast(`Added "${product.name || 'Product'}" to wishlist ❤️`, 'success');
    }
    
    updateWishlistBadge();
}

function removeFromWishlist(productId) {
    wishlistItems = wishlistItems.filter(item => item.id !== productId);
    updateWishlistBadge();
    showToast('Removed from wishlist', 'info');
    // Refresh modal if open
    if (document.getElementById('wishlistModal')) {
        openWishlistModal();
    }
}

function addAllToCart() {
    if (wishlistItems.length === 0) {
        showToast('Wishlist is empty', 'info');
        return;
    }
    
    const itemsToAdd = [...wishlistItems];
    wishlistItems = [];
    
    itemsToAdd.forEach(item => {
        const existingItem = cartItems.find(i => i.id === item.id);
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cartItems.push({ ...item, quantity: 1 });
        }
    });
    
    updateCartBadge();
    updateWishlistBadge();
    showToast(`Added ${itemsToAdd.length} items to cart 🛒`, 'success');
    
    // Close modal
    const modal = document.getElementById('wishlistModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (!badge) return;
    
    if (wishlistItems.length > 0) {
        badge.textContent = wishlistItems.length;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => `
        <div class="category-item flex flex-col items-center min-w-[56px] gap-2 cursor-pointer" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">
            <div class="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center hover:bg-gray-200 transition-colors ${cat.id === currentCategory ? 'bg-primary/10' : ''}">
                <i class="fa-solid ${cat.icon} text-lg ${cat.id === currentCategory ? 'text-primary' : 'text-gray-600'}"></i>
            </div>
            <span class="text-[10px] font-medium text-center ${cat.id === currentCategory ? 'text-primary font-bold' : 'text-gray-600'}">${cat.label}</span>
        </div>
    `).join('');
}

function renderFeaturedProducts(products) {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="min-w-full text-center py-8 text-gray-500">
                <i class="fa-solid fa-store text-3xl block mb-2 opacity-30"></i>
                <p class="text-sm">No featured products</p>
            </div>
        `;
        return;
    }
    
    const displayCount = showAllFeatured ? products.length : 6;
    const displayProducts = products.slice(0, displayCount);
    
    container.innerHTML = displayProducts.map(product => `
        <div class="product-card min-w-[140px] w-[140px] bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm" onclick="window.location.href='product-detail.html?id=${product.id}'">
            <div class="p-4 flex items-center justify-center bg-gray-50/50 h-32 relative">
                ${product.discount ? `<span class="absolute top-1 left-1 bg-orange-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">-${product.discount}%</span>` : ''}
                <img alt="${product.name || 'Product'}" class="h-28 object-contain" src="${product.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=22c55e&color=fff&size=200`}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=22c55e&color=fff&size=200'"/>
                <button class="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-white transition-colors" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                    <i class="fa-regular fa-heart text-gray-400 hover:text-red-500 transition-colors text-sm"></i>
                </button>
            </div>
            <div class="p-3">
                <h3 class="text-[11px] font-semibold text-gray-800 line-clamp-2">${product.name || 'Product'}</h3>
                <p class="text-[12px] font-bold text-secondary mt-1">${formatCurrency(product.price || 0)}</p>
                <div class="flex items-center gap-1 mt-1">
                    <i class="fa-solid fa-star text-secondary text-[10px]"></i>
                    <span class="text-[10px] text-secondary font-medium">${product.rating || '4.5'}</span>
                    <span class="text-[10px] text-gray-400 ml-1">(${product.reviews || 0})</span>
                </div>
                <button class="w-full mt-2 bg-primary/10 text-primary text-[10px] font-semibold py-1.5 rounded-lg hover:bg-primary/20 transition-colors" onclick="event.stopPropagation(); addToCart('${product.id}')">
                    <i class="fa-solid fa-cart-plus mr-1"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
    
    // Update "View All" link
    const viewAllLink = document.getElementById('viewAllFeatured');
    if (viewAllLink) {
        viewAllLink.textContent = showAllFeatured ? 'Show Less' : 'View All';
    }
}

function renderAllProducts(products) {
    const container = document.getElementById('allProducts');
    const countEl = document.getElementById('productCount');
    if (!container) return;
    
    if (countEl) {
        countEl.textContent = `${products.length} items available`;
    }
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fa-solid fa-box-open text-4xl block mb-3 opacity-30"></i>
                <p class="text-lg font-medium">No products found</p>
                <p class="text-sm mt-1">Try adjusting your filters or check back later</p>
            </div>
        `;
        return;
    }
    
    const displayCount = showAllProducts ? products.length : 8;
    const displayProducts = products.slice(0, displayCount);
    
    container.innerHTML = displayProducts.map(product => {
        const discount = product.discount || 0;
        const hasDiscount = discount > 0;
        const originalPrice = hasDiscount ? (product.price / (1 - discount / 100)) : product.price;
        
        return `
            <div class="product-card bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm relative" onclick="window.location.href='product-detail.html?id=${product.id}'">
                ${hasDiscount ? `<span class="absolute top-2 left-2 bg-orange-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">-${discount}%</span>` : ''}
                <button class="absolute top-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors z-10" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                    <i class="fa-regular fa-heart text-gray-400 hover:text-red-500 transition-colors text-sm"></i>
                </button>
                <div class="p-3 flex items-center justify-center bg-gray-50/30 h-40">
                    <img alt="${product.name || 'Product'}" class="h-32 object-contain" src="${product.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=22c55e&color=fff&size=200`}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=22c55e&color=fff&size=200'"/>
                </div>
                <div class="p-3">
                    <h3 class="text-[11px] font-bold text-gray-800 line-clamp-2">${product.name || 'Product'}</h3>
                    ${product.category ? `<p class="text-[9px] text-gray-400">${product.category}</p>` : ''}
                    <div class="flex items-center gap-2 mt-1">
                        <span class="text-[12px] font-bold text-secondary">${formatCurrency(product.price || 0)}</span>
                        ${hasDiscount ? `<span class="text-[9px] text-gray-400 line-through">${formatCurrency(originalPrice)}</span>` : ''}
                    </div>
                    <div class="mt-2 space-y-1">
                        <div class="flex items-center gap-1">
                            <i class="fa-solid fa-store text-gray-400 text-xs"></i>
                            <span class="text-[9px] text-gray-500">${product.seller || product.sellerName || 'Local Seller'}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <i class="fa-solid fa-location-dot text-secondary text-xs"></i>
                            <span class="text-[9px] text-gray-500">${product.community || product.district || 'N/A'}</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center gap-1">
                            <i class="fa-solid fa-star text-secondary text-[10px]"></i>
                            <span class="text-[10px] text-secondary font-medium">${product.rating || '4.5'}</span>
                            <span class="text-[9px] text-gray-400">(${product.reviews || 0})</span>
                        </div>
                        <button class="bg-primary/10 text-primary text-[10px] font-semibold px-3 py-1 rounded-lg hover:bg-primary/20 transition-colors" onclick="event.stopPropagation(); addToCart('${product.id}')">
                            <i class="fa-solid fa-cart-plus mr-1"></i> Add
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Update "View All" link
    const viewAllLink = document.getElementById('viewAllProducts');
    if (viewAllLink) {
        viewAllLink.textContent = showAllProducts ? 'Show Less' : 'View All';
    }
}

// =============================================
// FILTER FUNCTIONS
// =============================================

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    renderCategories();
    applyFilters();
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
    let filtered = [...allProducts];
    
    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => 
            p.category?.toLowerCase() === currentCategory ||
            p.category?.toLowerCase().includes(currentCategory)
        );
    }
    
    // Search filter
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name?.toLowerCase().includes(searchTerm) ||
            p.category?.toLowerCase().includes(searchTerm) ||
            p.seller?.toLowerCase().includes(searchTerm) ||
            (p.tags && p.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }
    
    // Apply sort
    filtered = sortProducts(filtered);
    
    renderAllProducts(filtered);
}

function sortProducts(products) {
    switch(currentSort) {
        case 'popular':
            return [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        case 'price-low':
            return [...products].sort((a, b) => (a.price || 0) - (b.price || 0));
        case 'price-high':
            return [...products].sort((a, b) => (b.price || 0) - (a.price || 0));
        case 'newest':
            return [...products].sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });
        default:
            return products;
    }
}

// =============================================
// VIEW ALL FUNCTIONS - EXPAND/CONTRACT
// =============================================

function toggleViewAllFeatured() {
    showAllFeatured = !showAllFeatured;
    renderFeaturedProducts(featuredProducts);
    // Scroll to featured section smoothly
    document.querySelector('.featured-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleViewAllProducts() {
    showAllProducts = !showAllProducts;
    applyFilters();
    // Scroll to products section smoothly
    document.querySelector('.all-products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
// LOCATION DROPDOWN
// =============================================

function setupLocationDropdown() {
    const locationBtn = document.getElementById('locationBtn');
    const dropdown = document.getElementById('locationDropdown');
    const overlay = document.getElementById('dropdownOverlay');
    let isOpen = false;

    if (!locationBtn || !dropdown) return;

    function toggleDropdown() {
        isOpen = !isOpen;
        dropdown.style.display = isOpen ? 'block' : 'none';
        if (overlay) overlay.classList.toggle('active', isOpen);
        if (isOpen) {
            setTimeout(() => {
                dropdown.classList.add('open');
            }, 10);
        } else {
            dropdown.classList.remove('open');
        }
    }

    locationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown();
    });

    if (overlay) {
        overlay.addEventListener('click', () => {
            if (isOpen) toggleDropdown();
        });
    }

    document.querySelectorAll('.location-option').forEach(option => {
        option.addEventListener('click', function() {
            const location = this.dataset.location;
            const displayName = location === 'all' ? 'All Communities' : 
                location.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            const locationText = document.getElementById('locationText');
            if (locationText) locationText.textContent = `Deliver to: ${displayName}`;
            
            localStorage.setItem('bridgeconnect_community', location);
            currentCommunity = location;
            
            showToast(`Switched to ${displayName}`, 'success');
            refreshAllData(location);
            
            if (isOpen) toggleDropdown();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            toggleDropdown();
        }
    });
}

// =============================================
// SORT DROPDOWN
// =============================================

function setupSortDropdown() {
    const sortBtn = document.getElementById('sortBtn');
    if (!sortBtn) return;
    
    const sortOptions = [
        { id: 'popular', label: 'Popular' },
        { id: 'price-low', label: 'Price: Low to High' },
        { id: 'price-high', label: 'Price: High to Low' },
        { id: 'newest', label: 'Newest' }
    ];
    
    sortBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const existingDropdown = document.querySelector('.sort-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'sort-dropdown absolute bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[180px]';
        
        const rect = this.getBoundingClientRect();
        dropdown.style.top = (rect.bottom + 8) + 'px';
        dropdown.style.left = Math.min(rect.left, window.innerWidth - 190) + 'px';
        
        dropdown.innerHTML = sortOptions.map(opt => `
            <div class="sort-option px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors ${currentSort === opt.id ? 'bg-blue-50 text-primary font-semibold' : ''}" data-sort="${opt.id}">
                ${opt.label}
                ${currentSort === opt.id ? '<i class="fa-solid fa-check text-primary text-xs"></i>' : ''}
            </div>
        `).join('');
        
        document.body.appendChild(dropdown);
        
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && e.target !== sortBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 10);
        
        dropdown.querySelectorAll('.sort-option').forEach(opt => {
            opt.addEventListener('click', function() {
                const sortId = this.dataset.sort;
                currentSort = sortId;
                const label = sortOptions.find(s => s.id === sortId)?.label || 'Popular';
                document.getElementById('sortLabel').textContent = label;
                
                applyFilters();
                dropdown.remove();
                showToast(`Sorted by: ${label}`, 'info');
            });
        });
    });
}

// =============================================
// LOAD USER PROFILE
// =============================================

function loadUserProfile() {
    const userData = localStorage.getItem('bridgeconnect_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const name = user.fullName || user.name || 'User';
            
            const profileImg = document.getElementById('profileImage');
            if (profileImg && user.photoURL) {
                profileImg.src = user.photoURL;
            } else if (profileImg) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003f87&color=fff&size=200`;
            }
            
            if (user.community) {
                const displayName = user.community.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                const locationText = document.getElementById('locationText');
                if (locationText) locationText.textContent = `Deliver to: ${displayName}`;
                currentCommunity = user.community;
            }
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
    }
}

// =============================================
// NOTIFICATION BELL
// =============================================

function setupNotificationBell() {
    const notifBtn = document.getElementById('notificationBtn');
    const badge = document.getElementById('notificationBadge');
    
    if (!notifBtn) return;

    notifBtn.addEventListener('click', function() {
        showToast('Opening notifications...', 'info');
        window.location.href = 'notifications.html';
    });
}

// =============================================
// SEARCH FUNCTION
// =============================================

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let timeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            applyFilters();
        }, 300);
    });
}

// =============================================
// REFRESH DATA
// =============================================

async function refreshAllData(community) {
    showToast('Loading products...', 'info');
    
    try {
        const [products, featured] = await Promise.all([
            loadProducts(community),
            loadFeaturedProducts(community)
        ]);
        
        allProducts = products;
        featuredProducts = featured;
        
        renderAllProducts(sortProducts(products));
        renderFeaturedProducts(featured);
        renderCategories();
        
        showToast(`${products.length} products loaded!`, 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading products', 'error');
    }
}

// =============================================
// LOAD NAVIGATION COMPONENT - FIXED
// =============================================

function loadNavigation() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    const navPath = isInPages ? '../nav.html' : 'nav.html';
    
    fetch(navPath)
        .then(res => {
            if (!res.ok) throw new Error('Nav component not found');
            return res.text();
        })
        .then(html => {
            placeholder.innerHTML = html;
            setupNavItemListeners();
        })
        .catch(err => {
            console.warn('nav.html not loaded, using inline fallback.');
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item active" href="#" data-page="explore"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <a class="nav-item" href="#" data-page="home"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <div class="fab-wrapper"><button class="fab-button" aria-label="Create new post"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="#" data-page="messages"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="#" data-page="profile"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
        });
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

function showToast(message, type) {
    if (type === undefined) type = 'info';
    
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg max-w-[90%] text-center';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-0 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg max-w-[90%] text-center ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-5 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg max-w-[90%] text-center`;
    }, 3500);
}

// =============================================
// AUTH STATE LISTENER
// =============================================

function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        try {
            const userData = await loadUserData();
            if (userData) {
                loadUserProfile();
                
                const community = userData.community || localStorage.getItem('bridgeconnect_community') || 'kwamankese';
                currentCommunity = community;
                
                await refreshAllData(community);
                
                const firstName = (userData.fullName || userData.name || 'User').split(' ')[0];
                showToast(`Welcome back, ${firstName}! 🛍️`, 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            const community = localStorage.getItem('bridgeconnect_community') || 'kwamankese';
            await refreshAllData(community);
        }
    });
}

// =============================================
// EVENT LISTENERS - FIXED
// =============================================

function setupEventListeners() {
    // Cart button
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openCartModal();
        });
    }
    
    // Wishlist button
    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            openWishlistModal();
        });
    }
    
    // View All Featured
    const viewAllFeatured = document.getElementById('viewAllFeatured');
    if (viewAllFeatured) {
        viewAllFeatured.addEventListener('click', function(e) {
            e.preventDefault();
            toggleViewAllFeatured();
        });
    }
    
    // View All Products
    const viewAllProducts = document.getElementById('viewAllProducts');
    if (viewAllProducts) {
        viewAllProducts.addEventListener('click', function(e) {
            e.preventDefault();
            toggleViewAllProducts();
        });
    }
    
    // Filter button
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            showToast('Opening filters...', 'info');
        });
    }
    
    // Filter icon in search
    const filterIcon = document.getElementById('filterIcon');
    if (filterIcon) {
        filterIcon.addEventListener('click', function() {
            showToast('Opening filters...', 'info');
        });
    }
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    loadUserProfile();
    setupLocationDropdown();
    setupSortDropdown();
    setupNotificationBell();
    setupSearch();
    setupEventListeners();
    
    // Expose functions globally
    window.filterByCategory = filterByCategory;
    window.toggleWishlist = toggleWishlist;
    window.showToast = showToast;
    window.addToCart = addToCart;
    window.openCartModal = openCartModal;
    window.openWishlistModal = openWishlistModal;
    window.removeFromCart = removeFromCart;
    window.removeFromWishlist = removeFromWishlist;
    window.updateCartQuantity = updateCartQuantity;
    window.addAllToCart = addAllToCart;
    window.closeModal = closeModal;
    window.toggleViewAllFeatured = toggleViewAllFeatured;
    window.toggleViewAllProducts = toggleViewAllProducts;
    
    console.log('✅ BridgeConnect Marketplace page initialized');
});