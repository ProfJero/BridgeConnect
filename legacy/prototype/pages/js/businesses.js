// =============================================
// BUSINESS DIRECTORY PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentCommunity = 'kwamankese';
let allBusinesses = [];
let filteredBusinesses = [];
let currentCategory = 'all';
let searchQuery = '';

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'businesses': '../pages/businesses.html',
    'messages': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// CATEGORIES
// =============================================
const CATEGORIES = [
    { id: 'all', icon: 'fa-th-large', label: 'All' },
    { id: 'retail', icon: 'fa-store', label: 'Retail' },
    { id: 'food', icon: 'fa-utensils', label: 'Food & Drinks' },
    { id: 'health', icon: 'fa-heartbeat', label: 'Health & Beauty' },
    { id: 'auto', icon: 'fa-car', label: 'Auto Services' },
    { id: 'education', icon: 'fa-graduation-cap', label: 'Education' },
    { id: 'agriculture', icon: 'fa-seedling', label: 'Agriculture' },
    { id: 'services', icon: 'fa-handshake', label: 'Services' },
    { id: 'more', icon: 'fa-ellipsis-h', label: 'More' }
];

// =============================================
// HELPER FUNCTIONS
// =============================================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getStatusClass(status) {
    const classes = {
        'open': 'status-open',
        'closed': 'status-closed'
    };
    return classes[status] || 'status-open';
}

function getStatusLabel(status) {
    const labels = {
        'open': 'Open',
        'closed': 'Closed'
    };
    return labels[status] || 'Open';
}

function formatRating(rating) {
    if (!rating) return '4.5';
    if (typeof rating === 'number') return rating.toFixed(1);
    return rating;
}

// =============================================
// NAVIGATION FUNCTIONS
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
    
    // Determine which page we're on
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'businesses.html';
    const isBusinessPage = currentPage === 'businesses.html';
    
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
        
        // Set active state
        if (isBusinessPage && page === 'explore') {
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

async function loadBusinesses(community) {
    try {
        let query = db.collection('businesses')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(50);
        
        if (community && community !== 'all') {
            query = db.collection('businesses')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(50);
        }
        
        const snapshot = await query.get();
        const businesses = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            businesses.push({
                id: doc.id,
                ...data
            });
        });
        
        allBusinesses = businesses;
        filteredBusinesses = businesses;
        return businesses;
    } catch (error) {
        console.warn('Error loading businesses:', error.message);
        allBusinesses = [];
        filteredBusinesses = [];
        return [];
    }
}

// =============================================
// LOAD NOTIFICATIONS - FIXED
// =============================================

async function loadNotifications() {
    try {
        const notifCount = document.getElementById('notificationCount');
        if (!notifCount) return; // Exit if element doesn't exist
        
        const user = auth.currentUser;
        if (!user) {
            notifCount.textContent = '0';
            return;
        }
        
        const notifSnapshot = await db.collection('users')
            .doc(user.uid)
            .collection('notifications')
            .where('read', '==', false)
            .get();
        
        const count = notifSnapshot.size || 0;
        notifCount.textContent = count;
        
        // Update badge visibility
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (count > 0) {
                badge.style.display = 'flex';
                badge.textContent = count;
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.warn('Error loading notifications:', error.message);
        const notifCount = document.getElementById('notificationCount');
        if (notifCount) notifCount.textContent = '0';
    }
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => `
        <div class="category-item" data-category="${cat.id}" onclick="filterByCategory('${cat.id}')">
            <div class="category-icon ${cat.id === 'all' ? 'active' : ''}">
                <i class="fa-solid ${cat.icon}"></i>
            </div>
            <span class="category-label ${cat.id === 'all' ? 'active' : ''}">${cat.label}</span>
        </div>
    `).join('');
}

function renderBusinesses(businesses) {
    const container = document.getElementById('businessGrid');
    if (!container) return;
    
    if (!businesses || businesses.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 text-gray-500">
                <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fa-solid fa-store text-3xl text-gray-300"></i>
                </div>
                <p class="text-lg font-semibold text-gray-600">No businesses found</p>
                <p class="text-sm mt-1 text-gray-400">Try adjusting your filters or check back later</p>
            </div>
        `;
        return;
    }
    
    // Limit to 4 businesses for display
    const displayBusinesses = businesses.slice(0, 4);
    
    container.innerHTML = displayBusinesses.map(biz => {
        const logo = biz.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(biz.name || 'Business')}&background=003f87&color=fff&size=200`;
        const rating = formatRating(biz.rating || (biz.reviews && biz.reviews.length > 0 ? (biz.reviews.reduce((a, b) => a + b.rating, 0) / biz.reviews.length) : 4.5));
        const reviewCount = biz.reviews ? biz.reviews.length : (biz.reviewCount || 0);
        const status = biz.status || 'open';
        const statusClass = getStatusClass(status);
        const statusLabel = getStatusLabel(status);
        const category = biz.category || 'General';
        const community = biz.community || biz.district || 'N/A';
        const phone = biz.phone || biz.mobile || '';
        const whatsapp = biz.whatsapp || '';
        const description = biz.description || biz.about || '';
        const address = biz.address || biz.location || '';
        
        // Generate stars
        const stars = Math.round(parseFloat(rating));
        const starsHtml = Array(5).fill(0).map((_, i) => 
            i < stars ? '<i class="fa-solid fa-star star-filled text-sm"></i>' : '<i class="fa-regular fa-star star-empty text-sm"></i>'
        ).join('');
        
        return `
            <div class="business-card" onclick="window.location.href='business-detail.html?id=${biz.id}'">
                <div class="flex flex-col md:flex-row gap-5 p-5">
                    <!-- Logo -->
                    <div class="flex-shrink-0">
                        <div class="w-full md:w-28 h-28 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <img class="w-full h-full object-contain p-2" src="${logo}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(biz.name || 'Business')}&background=003f87&color=fff&size=200'"/>
                        </div>
                    </div>
                    
                    <!-- Content -->
                    <div class="flex-grow min-w-0">
                        <div class="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div class="min-w-0 flex-1">
                                <div class="flex items-center gap-2">
                                    <h3 class="text-lg font-bold text-gray-800 truncate">${biz.name || 'Business'}</h3>
                                    <i class="fa-solid fa-check-circle text-green-600 text-base flex-shrink-0" title="Verified Business"></i>
                                </div>
                                <p class="text-sm text-gray-500">${category}</p>
                            </div>
                            <div class="flex-shrink-0 text-right">
                                <span class="status-badge ${statusClass} text-[10px]">${statusLabel}</span>
                                ${biz.closingTime ? `<p class="text-xs text-gray-400 mt-1">Closes ${biz.closingTime}</p>` : ''}
                            </div>
                        </div>
                        
                        <!-- Description -->
                        ${description ? `<p class="text-sm text-gray-600 line-clamp-2 mb-3">${description}</p>` : ''}
                        
                        <!-- Rating & Location -->
                        <div class="flex flex-wrap items-center gap-4 mb-4">
                            <div class="flex items-center gap-1.5">
                                <div class="flex items-center gap-0.5">${starsHtml}</div>
                                <span class="font-semibold text-gray-800 text-sm">${rating}</span>
                                <span class="text-sm text-gray-400">(${reviewCount} reviews)</span>
                            </div>
                            <div class="flex items-center gap-1.5 text-gray-500">
                                <i class="fa-solid fa-location-dot text-xs"></i>
                                <span class="text-sm">${community}</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="flex flex-wrap gap-2">
                            ${phone ? `
                                <button class="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 transition-colors" onclick="event.stopPropagation(); window.location.href='tel:${phone}'">
                                    <i class="fa-solid fa-phone text-sm"></i> Call
                                </button>
                            ` : ''}
                            ${whatsapp ? `
                                <button class="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-colors" onclick="event.stopPropagation(); window.open('https://wa.me/${whatsapp}', '_blank')">
                                    <i class="fa-brands fa-whatsapp text-sm"></i> WhatsApp
                                </button>
                            ` : ''}
                            <button class="flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-gray-50 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-colors" onclick="event.stopPropagation(); showToast('Opening directions...', 'info')">
                                <i class="fa-solid fa-location-dot text-sm"></i> Directions
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =============================================
// FILTER FUNCTIONS
// =============================================

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    
    // Update active state
    document.querySelectorAll('.category-item').forEach(item => {
        const icon = item.querySelector('.category-icon');
        const label = item.querySelector('.category-label');
        const isActive = item.dataset.category === categoryId;
        
        if (isActive) {
            icon.classList.add('active');
            label.classList.add('active');
        } else {
            icon.classList.remove('active');
            label.classList.remove('active');
        }
    });
    
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value?.toLowerCase() || '';
    
    let filtered = [...allBusinesses];
    
    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(biz => 
            biz.category?.toLowerCase() === currentCategory ||
            biz.category?.toLowerCase().includes(currentCategory) ||
            (biz.tags && biz.tags.some(tag => tag.toLowerCase().includes(currentCategory)))
        );
    }
    
    // Search filter
    if (query) {
        filtered = filtered.filter(biz => 
            biz.name?.toLowerCase().includes(query) ||
            biz.category?.toLowerCase().includes(query) ||
            biz.description?.toLowerCase().includes(query) ||
            (biz.tags && biz.tags.some(tag => tag.toLowerCase().includes(query)))
        );
    }
    
    filteredBusinesses = filtered;
    renderBusinesses(filtered);
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
            if (locationText) locationText.textContent = displayName;
            
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
                if (locationText) locationText.textContent = displayName;
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
    showToast('Loading businesses...', 'info');
    
    try {
        const businesses = await loadBusinesses(community);
        allBusinesses = businesses;
        filteredBusinesses = businesses;
        
        renderCategories();
        applyFilters();
        
        showToast(`${businesses.length} businesses loaded!`, 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading businesses', 'error');
    }
}

// =============================================
// LOAD NAVIGATION COMPONENT
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
                    <a class="nav-item" href="#" data-page="home"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item active" href="#" data-page="explore"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
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
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3.5 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-0 px-6 py-3.5 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3.5 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg`;
    }, 3000);
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
                await loadNotifications();
                
                const firstName = (userData.fullName || userData.name || 'User').split(' ')[0];
                showToast(`Welcome back, ${firstName}! 🏪`, 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            const community = localStorage.getItem('bridgeconnect_community') || 'kwamankese';
            await refreshAllData(community);
            await loadNotifications();
        }
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    loadUserProfile();
    setupLocationDropdown();
    setupNotificationBell();
    setupSearch();
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        showToast('Opening filters...', 'info');
    });
    
    // View All button
    document.getElementById('viewAllBtn')?.addEventListener('click', function() {
        showToast('Viewing all businesses...', 'info');
        window.location.href = 'businesses-all.html';
    });
    
    console.log('✅ BridgeConnect Business Directory page initialized');
});

// Expose functions globally
window.filterByCategory = filterByCategory;
window.showToast = showToast;