// =============================================
// PRODUCT DETAIL PAGE - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentProduct = null;
let currentImages = [];
let currentImageIndex = 0;
let relatedProducts = [];

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'marketplace': '../pages/marketplace.html',
    'community': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatCurrency(amount) {
    return `GH₵ ${(amount || 0).toFixed(2)}`;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// =============================================
// NAVIGATION FUNCTIONS - NO ACTIVE NAV
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
    
    // Remove any existing active classes
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    navItems.forEach(item => {
        const label = item.querySelector('.nav-label')?.textContent?.toLowerCase() || '';
        const icon = item.querySelector('.nav-icon');
        let page = null;
        
        if (label === 'home' || (icon && icon.classList.contains('fa-house'))) {
            page = 'home';
        } else if (label === 'explore' || (icon && icon.classList.contains('fa-magnifying-glass'))) {
            page = 'explore';
        } else if (label === 'community' || (icon && icon.classList.contains('fa-comment-dots'))) {
            page = 'community';
        } else if (label === 'profile' || (icon && icon.classList.contains('fa-user'))) {
            page = 'profile';
        }
        
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // NO active state for product detail page
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const currentPage = window.location.pathname.split('/').pop() || 'home.html';
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            
            if (currentPage === targetPage) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            
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
// LOAD NAVIGATION COMPONENT - NO ACTIVE NAV
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
            // Ensure no active nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        })
        .catch(err => {
            console.warn('nav.html not loaded, using inline fallback.');
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item" href="#" data-page="home"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item" href="#" data-page="explore"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button" aria-label="Create new post"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="#" data-page="community"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="#" data-page="profile"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        });
}

// =============================================
// FIRESTORE DATA FETCHERS
// =============================================

async function loadProduct(productId) {
    try {
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) {
            showToast('Product not found', 'error');
            return null;
        }
        
        currentProduct = { id: productDoc.id, ...productDoc.data() };
        return currentProduct;
    } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product details', 'error');
        return null;
    }
}

async function loadRelatedProducts(product) {
    try {
        let query = db.collection('products')
            .where('status', '==', 'approved')
            .where('category', '==', product.category)
            .limit(6);
        
        // Exclude current product
        const snapshot = await query.get();
        const products = [];
        snapshot.forEach(doc => {
            if (doc.id !== product.id) {
                products.push({ id: doc.id, ...doc.data() });
            }
        });
        
        // If not enough products, get more from same community
        if (products.length < 4 && product.community) {
            const fallbackQuery = db.collection('products')
                .where('status', '==', 'approved')
                .where('community', '==', product.community)
                .limit(6);
            
            const fallbackSnapshot = await fallbackQuery.get();
            fallbackSnapshot.forEach(doc => {
                if (doc.id !== product.id && !products.find(p => p.id === doc.id)) {
                    products.push({ id: doc.id, ...doc.data() });
                }
            });
        }
        
        relatedProducts = products.slice(0, 6);
        return relatedProducts;
    } catch (error) {
        console.warn('Error loading related products:', error.message);
        relatedProducts = [];
        return [];
    }
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderProduct(product) {
    if (!product) return;
    
    // Update breadcrumb
    document.getElementById('productTitle').textContent = product.name || 'Product';
    document.getElementById('categoryLink').textContent = product.category || 'Category';
    document.getElementById('categoryLink').href = `marketplace.html?category=${product.category}`;
    
    // Main image
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : product.image;
    document.getElementById('mainImage').src = mainImage || 'https://ui-avatars.com/api/?name=Product&background=0052cc&color=fff&size=400';
    document.getElementById('mainImage').alt = product.name || 'Product';
    
    // Set up images array for gallery
    currentImages = product.images || [product.image];
    currentImages = currentImages.filter(img => img);
    if (currentImages.length === 0) {
        currentImages = ['https://ui-avatars.com/api/?name=Product&background=0052cc&color=fff&size=400'];
    }
    currentImageIndex = 0;
    updateImageCounter();
    renderThumbnails();
    
    // Product name
    document.getElementById('productName').textContent = product.name || 'Product';
    
    // Price
    const price = product.price || 0;
    const discount = product.discount || 0;
    const originalPrice = discount > 0 ? price / (1 - discount / 100) : price;
    
    document.getElementById('productPrice').textContent = formatCurrency(price);
    
    if (discount > 0) {
        document.getElementById('originalPrice').textContent = formatCurrency(originalPrice);
        document.getElementById('originalPrice').classList.remove('hidden');
        document.getElementById('discountPercent').textContent = `${discount}% OFF`;
        document.getElementById('discountPercent').classList.remove('hidden');
        document.getElementById('discountBadge').classList.remove('hidden');
        document.getElementById('discountBadge').textContent = `-${discount}% OFF`;
    }
    
    // Stock status
    const stock = product.stock || 0;
    document.getElementById('stockStatus').textContent = stock > 0 ? 'Ready to ship' : 'Out of stock';
    document.getElementById('stockStatus').className = `text-sm font-medium ${stock > 0 ? 'text-green-600' : 'text-red-600'}`;
    
    // Delivery info
    document.getElementById('deliveryInfo').textContent = product.deliveryTime || '1-2 days';
    document.getElementById('shippingLocation').textContent = product.community || product.district || 'Kwamankese';
    
    // Vendor info
    const vendorName = product.seller || product.vendor || 'Local Seller';
    document.getElementById('vendorName').textContent = vendorName;
    document.getElementById('vendorLocation').textContent = product.community || product.district || 'N/A';
    document.getElementById('vendorLogo').src = product.vendorLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(vendorName)}&background=0052cc&color=fff&size=100`;
    
    const rating = product.rating || (product.reviews && product.reviews.length > 0 ? (product.reviews.reduce((a, b) => a + b.rating, 0) / product.reviews.length).toFixed(1) : '4.5');
    const reviewCount = product.reviews ? product.reviews.length : (product.reviewCount || 0);
    document.getElementById('vendorRating').textContent = `★ ${rating}`;
    document.getElementById('vendorReviews').textContent = `(${reviewCount} reviews)`;
    
    // Description
    document.getElementById('productDescription').textContent = product.description || 'No description available.';
    
    // Specs
    const specsContainer = document.getElementById('specsGrid');
    const specs = product.specs || product.attributes || {};
    const specItems = Object.entries(specs);
    
    if (specItems.length > 0) {
        specsContainer.innerHTML = specItems.map(([key, value]) => `
            <div class="bg-white border p-3 rounded-xl text-center">
                <p class="text-[10px] text-gray-400 uppercase font-bold">${key}</p>
                <p class="text-sm font-bold">${value}</p>
            </div>
        `).join('');
    } else {
        specsContainer.innerHTML = `
            <div class="col-span-full text-center text-gray-400 text-sm py-2">No specifications available</div>
        `;
    }
    
    // Setup action buttons
    setupActionButtons(product);
    
    // Load related products
    loadRelatedProducts(product).then(renderRelatedProducts);
}

function renderThumbnails() {
    const container = document.getElementById('thumbnails');
    container.innerHTML = currentImages.map((img, index) => `
        <div class="w-20 h-20 border-2 ${index === currentImageIndex ? 'border-primary' : 'border-gray-200'} rounded-lg p-2 bg-white cursor-pointer flex-shrink-0 hover:border-primary transition-all" onclick="changeImage(${index})">
            <img alt="Thumbnail ${index + 1}" class="w-full h-full object-contain" src="${img}"/>
        </div>
    `).join('');
}

function updateImageCounter() {
    document.getElementById('imageCounter').textContent = `${currentImageIndex + 1}/${currentImages.length}`;
}

function changeImage(index) {
    if (index >= 0 && index < currentImages.length) {
        currentImageIndex = index;
        document.getElementById('mainImage').src = currentImages[index];
        renderThumbnails();
        updateImageCounter();
    }
}

function renderRelatedProducts(products) {
    const container = document.getElementById('relatedProducts');
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500">
                <i class="fa-solid fa-box-open text-3xl block mb-2 opacity-30"></i>
                <p class="text-sm">No related products found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const image = product.image || product.images?.[0] || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=22c55e&color=fff&size=200`;
        const price = product.price || 0;
        const seller = product.seller || 'Local Seller';
        
        return `
            <div class="product-card bg-white p-4 rounded-2xl border border-gray-100 hover:shadow-xl transition-shadow relative group" onclick="window.location.href='product-detail.html?id=${product.id}'">
                <button class="absolute top-4 right-4 text-gray-300 hover:text-red-500 z-10" onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                    <i class="fa-regular fa-heart text-lg"></i>
                </button>
                <div class="aspect-square bg-gray-50 rounded-xl mb-4 p-4 flex items-center justify-center overflow-hidden">
                    <img alt="${product.name || 'Product'}" class="max-h-full transition-transform group-hover:scale-105 object-contain" src="${image}"/>
                </div>
                <h4 class="font-bold text-gray-800 line-clamp-1">${product.name || 'Product'}</h4>
                <p class="text-xs text-gray-400 mt-1">${seller}</p>
                <p class="text-brand-green font-extrabold mt-2">${formatCurrency(price)}</p>
            </div>
        `;
    }).join('');
}

// =============================================
// ACTION BUTTONS
// =============================================

function setupActionButtons(product) {
    // Add to Cart
    document.getElementById('addToCartBtn').addEventListener('click', function() {
        if (!auth.currentUser) {
            showToast('Please sign in to add items to cart', 'error');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1500);
            return;
        }
        showToast(`Added "${product.name || 'Product'}" to cart! 🛒`, 'success');
    });
    
    // Buy Now
    document.getElementById('buyNowBtn').addEventListener('click', function() {
        if (!auth.currentUser) {
            showToast('Please sign in to proceed', 'error');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1500);
            return;
        }
        showToast('Proceeding to checkout...', 'info');
        // window.location.href = 'checkout.html';
    });
    
    // WhatsApp
    document.getElementById('whatsappBtn').addEventListener('click', function() {
        const phone = product.phone || product.whatsapp || '';
        if (phone) {
            window.open(`https://wa.me/${phone}`, '_blank');
        } else {
            showToast('No WhatsApp number available', 'error');
        }
    });
    
    // Call
    document.getElementById('callBtn').addEventListener('click', function() {
        const phone = product.phone || '';
        if (phone) {
            window.location.href = `tel:${phone}`;
        } else {
            showToast('No phone number available', 'error');
        }
    });
    
    // View Shop
    document.getElementById('viewShopBtn').addEventListener('click', function() {
        const sellerId = product.sellerId || '';
        if (sellerId) {
            window.location.href = `business-detail.html?id=${sellerId}`;
        } else {
            showToast('Shop details not available', 'error');
        }
    });
    
    // Wishlist toggle
    document.getElementById('wishlistBtn').addEventListener('click', function() {
        if (!auth.currentUser) {
            showToast('Please sign in to save items', 'error');
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 1500);
            return;
        }
        const icon = this.querySelector('i');
        const isFilled = icon.classList.contains('fa-solid');
        if (isFilled) {
            icon.className = 'fa-regular fa-heart text-xl';
            showToast('Removed from wishlist', 'info');
        } else {
            icon.className = 'fa-solid fa-heart text-xl text-red-500';
            showToast('Added to wishlist ❤️', 'success');
        }
    });
}

// =============================================
// BACK BUTTON FUNCTION
// =============================================

function goBack() {
    // Check if there's a previous page in history
    if (document.referrer && document.referrer.includes('marketplace')) {
        window.history.back();
    } else {
        window.location.href = 'marketplace.html';
    }
}

function toggleWishlist(productId) {
    if (!auth.currentUser) {
        showToast('Please sign in to save items', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    showToast('Added to wishlist ❤️', 'success');
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
// IMAGE NAVIGATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    const prevBtn = document.getElementById('prevImage');
    const nextBtn = document.getElementById('nextImage');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : currentImages.length - 1;
            changeImage(newIndex);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const newIndex = currentImageIndex < currentImages.length - 1 ? currentImageIndex + 1 : 0;
            changeImage(newIndex);
        });
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') {
        document.getElementById('prevImage')?.click();
    } else if (e.key === 'ArrowRight') {
        document.getElementById('nextImage')?.click();
    }
});

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
            // Get product ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const productId = urlParams.get('id');
            
            if (!productId) {
                showToast('No product ID provided', 'error');
                document.getElementById('loadingState').innerHTML = `
                    <div class="text-center">
                        <i class="fa-solid fa-exclamation-circle text-3xl text-red-500"></i>
                        <p class="mt-4 text-on-surface-variant">No product ID provided</p>
                        <a href="marketplace.html" class="mt-2 text-primary hover:underline">Return to Marketplace</a>
                    </div>
                `;
                return;
            }
            
            // Load product
            const product = await loadProduct(productId);
            if (!product) {
                document.getElementById('loadingState').innerHTML = `
                    <div class="text-center">
                        <i class="fa-solid fa-store-slash text-3xl text-red-500"></i>
                        <p class="mt-4 text-on-surface-variant">Product not found</p>
                        <a href="marketplace.html" class="mt-2 text-primary hover:underline">Return to Marketplace</a>
                    </div>
                `;
                return;
            }
            
            // Hide loading, show content
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('productData').classList.remove('hidden');
            
            // Render product
            renderProduct(product);
            
        } catch (error) {
            console.error('Error loading product:', error);
            showToast('Error loading product details', 'error');
        }
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    
    // Setup back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', goBack);
    }
    
    console.log('✅ BridgeConnect Product Detail page initialized');
});

// Expose functions globally
window.changeImage = changeImage;
window.toggleWishlist = toggleWishlist;
window.showToast = showToast;
window.goBack = goBack;