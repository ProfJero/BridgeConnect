// =============================================
// EXPLORE PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentCommunity = 'kwamankese';
let categoryData = [];

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'messages': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// CATEGORY DATA
// =============================================
const CATEGORIES = [
    {
        id: 'businesses',
        title: 'Businesses',
        description: 'Find local businesses and connect',
        color: 'bg-[#f0f9ff]',
        buttonColor: 'bg-blue-600',
        icon: 'fa-solid fa-store',
        image: 'https://ui-avatars.com/api/?name=Business&background=0052cc&color=fff&size=128',
        page: 'businesses.html'
    },
    {
        id: 'jobs',
        title: 'Jobs',
        description: 'Discover job opportunities in your area',
        color: 'bg-[#f0fdf4]',
        buttonColor: 'bg-brandGreen',
        icon: 'fa-solid fa-briefcase',
        image: 'https://ui-avatars.com/api/?name=Jobs&background=28a745&color=fff&size=128',
        page: 'jobs.html'
    },
    {
        id: 'marketplace',
        title: 'Marketplace',
        description: 'Buy and sell products locally',
        color: 'bg-[#faf5ff]',
        buttonColor: 'bg-purple-600',
        icon: 'fa-solid fa-bag-shopping',
        image: 'https://ui-avatars.com/api/?name=Marketplace&background=7c3aed&color=fff&size=128',
        page: 'marketplace.html'
    },
    {
        id: 'services',
        title: 'Services',
        description: 'Find trusted services near you',
        color: 'bg-[#fff7ed]',
        buttonColor: 'bg-orange-500',
        icon: 'fa-solid fa-handshake',
        image: 'https://ui-avatars.com/api/?name=Services&background=f97316&color=fff&size=128',
        page: 'services.html'
    },
    {
        id: 'education',
        title: 'Education',
        description: 'Schools, training and learning resources',
        color: 'bg-[#eff6ff]',
        buttonColor: 'bg-blue-600',
        icon: 'fa-solid fa-graduation-cap',
        image: 'https://ui-avatars.com/api/?name=Education&background=2563eb&color=fff&size=128',
        page: 'education.html'
    },
    {
        id: 'health',
        title: 'Health',
        description: 'Health facilities and wellness information',
        color: 'bg-[#fef2f2]',
        buttonColor: 'bg-red-500',
        icon: 'fa-solid fa-heartbeat',
        image: 'https://ui-avatars.com/api/?name=Health&background=ef4444&color=fff&size=128',
        page: 'health.html'
    },
    {
        id: 'agriculture',
        title: 'Agriculture',
        description: 'Farming resources, inputs and support',
        color: 'bg-[#f7fee7]',
        buttonColor: 'bg-green-600',
        icon: 'fa-solid fa-seedling',
        image: 'https://ui-avatars.com/api/?name=Agriculture&background=16a34a&color=fff&size=128',
        page: 'agriculture.html'
    },
    {
        id: 'events',
        title: 'Events',
        description: 'Explore local events and happenings',
        color: 'bg-[#fffbeb]',
        buttonColor: 'bg-amber-500',
        icon: 'fa-regular fa-calendar-days',
        image: 'https://ui-avatars.com/api/?name=Events&background=f59e0b&color=fff&size=128',
        page: 'events.html'
    },
    {
        id: 'ngos',
        title: 'NGOs',
        description: 'Non-profit organizations making an impact',
        color: 'bg-[#f5f3ff]',
        buttonColor: 'bg-indigo-600',
        icon: 'fa-solid fa-hand-holding-heart',
        image: 'https://ui-avatars.com/api/?name=NGOs&background=4f46e5&color=fff&size=128',
        page: 'ngos.html'
    },
    {
        id: 'government',
        title: 'Government',
        description: 'Access government services and information',
        color: 'bg-[#f0f9ff]',
        buttonColor: 'bg-cyan-600',
        icon: 'fa-solid fa-landmark',
        image: 'https://ui-avatars.com/api/?name=Government&background=0891b2&color=fff&size=128',
        page: 'government.html'
    },
    {
        id: 'emergency',
        title: 'Emergency',
        description: 'Get help in an emergency',
        color: 'bg-[#fff1f2]',
        buttonColor: 'bg-rose-500',
        icon: 'fa-solid fa-triangle-exclamation',
        image: 'https://ui-avatars.com/api/?name=Emergency&background=f43f5e&color=fff&size=128',
        page: 'emergency.html'
    },
    {
        id: 'create',
        title: 'Post Request',
        description: "Can't find what you're looking for?",
        color: 'bg-white border border-gray-100',
        buttonColor: 'bg-brand-primary',
        icon: 'fa-solid fa-plus',
        image: 'https://ui-avatars.com/api/?name=Post&background=0052cc&color=fff&size=128',
        page: 'create-post.html',
        isCTA: true
    }
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

function getRoleDisplayName(role) {
    const labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'moderator': 'Community Moderator',
        'community_moderator': 'Community Moderator',
        'verified_org': 'Verified Organization',
        'business_owner': 'Business Owner',
        'resident': 'Community Member'
    };
    return labels[role] || role || 'User';
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
    
    // FIRST: Remove any existing active classes from ALL nav items
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine which page we're on
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'explore.html';
    const isExplorePage = currentPage === 'explore.html';
    
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
        if (isExplorePage && page === 'explore') {
            newItem.classList.add('active');
        } else if (!isExplorePage && page === 'home' && currentPage === 'home.html') {
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
// RENDER CATEGORIES
// =============================================

function renderCategories() {
    const container = document.getElementById('categoryGrid');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => {
        if (cat.isCTA) {
            return `
                <div class="category-card ${cat.color} rounded-card p-4 relative flex flex-col justify-between h-44 shadow-sm overflow-hidden cursor-pointer" onclick="navigateToCategory('${cat.page}')">
                    <div>
                        <p class="text-[11px] text-gray-400 font-medium leading-tight">Can't find what you're looking for?</p>
                        <h3 class="font-bold text-gray-800 text-sm mt-1">Post a request to your community.</h3>
                    </div>
                    <div class="flex flex-col gap-2 relative z-10">
                        <button class="${cat.buttonColor} text-white py-2 px-3 rounded-lg text-xs font-bold w-fit flex items-center gap-2">
                            <i class="${cat.icon}"></i> Create Post
                        </button>
                    </div>
                    <img alt="CTA Icon" class="absolute bottom-1 right-1 w-20 h-20 opacity-80 object-contain" src="${cat.image}"/>
                </div>
            `;
        }
        
        return `
            <div class="category-card ${cat.color} rounded-card p-4 relative flex flex-col justify-between h-44 shadow-sm cursor-pointer" onclick="navigateToCategory('${cat.page}')">
                <div>
                    <h3 class="font-bold text-gray-800">${cat.title}</h3>
                    <p class="text-[11px] text-gray-500 leading-tight mt-1">${cat.description}</p>
                </div>
                <div class="flex justify-between items-end">
                    <button class="${cat.buttonColor} text-white w-7 h-7 rounded-full flex items-center justify-center shadow-md">
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </button>
                    <img alt="${cat.title} Icon" class="w-16 h-16 object-contain -mr-2" src="${cat.image}"/>
                </div>
            </div>
        `;
    }).join('');
}

function navigateToCategory(page) {
    if (page) {
        showToast(`Opening ${page.replace('.html', '')}...`, 'info');
        setTimeout(() => {
            window.location.href = page;
        }, 300);
    }
}

// =============================================
// LOAD USER DATA
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
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=200`;
            }
            
            if (user.community) {
                const displayName = user.community.charAt(0).toUpperCase() + user.community.slice(1);
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
            const displayName = location.charAt(0).toUpperCase() + location.slice(1);
            
            const locationText = document.getElementById('locationText');
            if (locationText) locationText.textContent = displayName;
            
            localStorage.setItem('bridgeconnect_community', location);
            currentCommunity = location;
            
            showToast(`Switched to ${displayName}`, 'success');
            
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
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query) {
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        }
    });
}

// =============================================
// LOAD NAVIGATION COMPONENT
// =============================================

function loadNavigation() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    
    // Determine the correct path to nav.html
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
        toast.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-0 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-24 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg`;
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
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                currentUserData = { id: userDoc.id, ...userData };
                localStorage.setItem('bridgeconnect_user', JSON.stringify({
                    uid: user.uid,
                    ...userData
                }));
                loadUserProfile();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
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
    renderCategories();
    setupLocationDropdown();
    setupNotificationBell();
    setupSearch();
    
    console.log('✅ BridgeConnect Explore page initialized');
});

// Expose functions globally
window.navigateToCategory = navigateToCategory;