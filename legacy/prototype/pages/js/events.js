// =============================================
// EVENTS PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUserData = null;
let currentCommunity = 'kwamankese';
let allEvents = [];
let filteredEvents = [];
let currentCategory = 'all';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let showAllUpcoming = false;
let showAllMoreEvents = false;

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'events': '../pages/events.html',
    'community': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// CATEGORIES
// =============================================
const CATEGORIES = [
    { id: 'all', icon: 'fa-th-large', label: 'All Events' },
    { id: 'music', icon: 'fa-music', label: 'Music' },
    { id: 'community', icon: 'fa-users', label: 'Community' },
    { id: 'education', icon: 'fa-graduation-cap', label: 'Education' },
    { id: 'sports', icon: 'fa-futbol', label: 'Sports' },
    { id: 'business', icon: 'fa-briefcase', label: 'Business' },
    { id: 'culture', icon: 'fa-palette', label: 'Culture' },
    { id: 'health', icon: 'fa-heartbeat', label: 'Health' }
];

// =============================================
// CATEGORY COLORS FOR STYLING
// =============================================
const CATEGORY_COLORS = {
    'all': 'bg-primary text-white border-primary',
    'music': 'bg-purple-500 text-white border-purple-500',
    'community': 'bg-blue-500 text-white border-blue-500',
    'education': 'bg-green-500 text-white border-green-500',
    'sports': 'bg-orange-500 text-white border-orange-500',
    'business': 'bg-indigo-500 text-white border-indigo-500',
    'culture': 'bg-pink-500 text-white border-pink-500',
    'health': 'bg-red-500 text-white border-red-500'
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch (e) {
        return 'N/A';
    }
}

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getCategoryColor(category) {
    const colors = {
        'music': 'bg-purple-100 text-purple-700',
        'community': 'bg-blue-100 text-blue-700',
        'education': 'bg-green-100 text-green-700',
        'sports': 'bg-orange-100 text-orange-700',
        'business': 'bg-indigo-100 text-indigo-700',
        'culture': 'bg-pink-100 text-pink-700',
        'health': 'bg-red-100 text-red-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
}

function getCategoryIcon(category) {
    const icons = {
        'music': 'fa-music',
        'community': 'fa-users',
        'education': 'fa-graduation-cap',
        'sports': 'fa-futbol',
        'business': 'fa-briefcase',
        'culture': 'fa-palette',
        'health': 'fa-heartbeat'
    };
    return icons[category] || 'fa-calendar-days';
}

// =============================================
// NAVIGATION FUNCTIONS - FIXED (EXPLORE ACTIVE)
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
    const currentPage = currentPath.split('/').pop() || 'events.html';
    const isEventsPage = currentPage === 'events.html';
    
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
        
        // Set active state based on current page
        if (isEventsPage && page === 'explore') {
            newItem.classList.add('active');
        } else if (!isEventsPage && page === 'home' && currentPage === 'home.html') {
            newItem.classList.add('active');
        } else if (page === 'community' && currentPage === 'community.html') {
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
// LOAD NAVIGATION - FIXED (EXPLORE ACTIVE)
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
        .catch(() => {
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item" href="home.html"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item active" href="explore.html"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="community.html"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="profile.html"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
        });
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

async function loadEvents(community) {
    try {
        let query = db.collection('events')
            .where('status', '==', 'approved')
            .orderBy('eventDate', 'asc')
            .limit(50);
        
        if (community && community !== 'all') {
            query = db.collection('events')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('eventDate', 'asc')
                .limit(50);
        }
        
        const snapshot = await query.get();
        const events = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            events.push({
                id: doc.id,
                ...data
            });
        });
        
        allEvents = events;
        filteredEvents = events;
        return events;
    } catch (error) {
        console.warn('Error loading events:', error.message);
        allEvents = [];
        filteredEvents = [];
        return [];
    }
}

async function getFeaturedEvent(events) {
    const now = new Date();
    const upcoming = events.filter(e => {
        if (!e.eventDate) return false;
        const date = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
        return date > now;
    });
    
    if (upcoming.length > 0) {
        return upcoming[0];
    }
    return events[0] || null;
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderFeaturedEvent(event) {
    const container = document.getElementById('featuredEvent');
    if (!container) return;
    
    if (!event) {
        container.innerHTML = `
            <div class="bg-gray-100 rounded-3xl p-8 text-center min-h-[300px] flex items-center justify-center">
                <div>
                    <i class="fa-solid fa-calendar-plus text-4xl mb-3 opacity-30"></i>
                    <p class="text-gray-500">No upcoming events</p>
                    <p class="text-sm text-gray-400 mt-1">Be the first to host an event in your community</p>
                </div>
            </div>
        `;
        return;
    }
    
    const image = event.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title || 'Event')}&background=003f87&color=fff&size=600&format=png`;
    const date = event.eventDate ? formatDate(event.eventDate) : 'Date TBD';
    const location = event.community || event.district || 'N/A';
    const category = event.category || 'Community';
    const description = event.description || '';
    const categoryColor = getCategoryColor(category.toLowerCase());
    
    container.innerHTML = `
        <div class="relative rounded-[32px] overflow-hidden min-h-[250px] md:min-h-[350px]">
            <img alt="${event.title || 'Event'}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${image}"/>
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div class="absolute bottom-0 left-0 w-full p-6 md:p-10 text-white">
                <span class="inline-block bg-secondary text-on-secondary px-3 py-1 rounded-full text-xs font-bold mb-3">FEATURED EVENT</span>
                <h3 class="text-xl md:text-3xl font-bold mb-3">${event.title || 'Event'}</h3>
                <div class="flex flex-wrap gap-4 mb-3 opacity-90 text-sm">
                    <div class="flex items-center gap-2">
                        <i class="fa-regular fa-calendar text-secondary"></i>
                        <span>${date}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-location-dot text-secondary"></i>
                        <span>${location}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-full ${categoryColor} text-xs font-medium">${category}</span>
                    </div>
                </div>
                <p class="text-sm opacity-80 line-clamp-2">${description}</p>
                <button class="mt-4 bg-white text-primary px-6 py-2.5 rounded-xl font-medium hover:bg-gray-100 transition-colors shadow-lg view-event-btn" data-id="${event.id}">
                    View Details
                </button>
            </div>
        </div>
    `;
    
    container.querySelector('.view-event-btn')?.addEventListener('click', function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        window.location.href = `event-detail.html?id=${id}`;
    });
    
    container.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        if (event.id) {
            window.location.href = `event-detail.html?id=${event.id}`;
        }
    });
}

function renderCategories() {
    const container = document.getElementById('categoriesContainer');
    if (!container) return;
    
    container.innerHTML = CATEGORIES.map(cat => {
        const isActive = currentCategory === cat.id;
        const activeClass = isActive ? CATEGORY_COLORS[cat.id] : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
        return `
            <button class="category-btn px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border-2 flex items-center gap-2 whitespace-nowrap shadow-sm hover:shadow-md hover:-translate-y-0.5 ${activeClass}" data-category="${cat.id}">
                <i class="fa-solid ${cat.icon} text-sm"></i>
                ${cat.label}
                ${isActive ? `<span class="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-[10px]">Active</span>` : ''}
            </button>
        `;
    }).join('');
}

function renderEvents(events) {
    const container = document.getElementById('eventsList');
    if (!container) return;
    
    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500">
                <i class="fa-solid fa-calendar-times text-4xl block mb-3 opacity-30"></i>
                <p class="text-lg font-medium">No events found</p>
                <p class="text-sm mt-1">Check back later for upcoming events in your community</p>
            </div>
        `;
        return;
    }
    
    // Sort events by date (upcoming first)
    const sortedEvents = [...events].sort((a, b) => {
        const dateA = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(a.eventDate || 0);
        const dateB = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate || 0);
        return dateA - dateB;
    });
    
    // Determine how many to show
    const displayCount = showAllUpcoming ? sortedEvents.length : 6;
    const displayEvents = sortedEvents.slice(0, displayCount);
    
    container.innerHTML = displayEvents.map(event => {
        const date = event.eventDate ? formatDate(event.eventDate) : 'N/A';
        const time = event.eventDate ? formatTime(event.eventDate) : 'N/A';
        const location = event.community || event.district || 'N/A';
        const category = event.category || 'Community';
        const categoryColor = getCategoryColor(category.toLowerCase());
        const day = event.eventDate?.toDate ? event.eventDate.toDate().getDate() : '?';
        const month = event.eventDate?.toDate ? event.eventDate.toDate().toLocaleString('default', { month: 'short' }) : '?';
        
        return `
            <div class="event-card bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer" onclick="window.location.href='event-detail.html?id=${event.id}'">
                <div class="flex-shrink-0 w-16 h-16 bg-primary/5 rounded-2xl flex flex-col items-center justify-center text-primary border border-primary/10">
                    <span class="text-xl font-bold leading-none">${day}</span>
                    <span class="text-xs font-bold uppercase">${month}</span>
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="text-base font-bold mb-1 hover:text-primary transition-colors line-clamp-1">${event.title || 'Untitled Event'}</h4>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <div class="flex items-center gap-1.5">
                            <i class="fa-regular fa-clock text-xs"></i>
                            <span>${time}</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <i class="fa-solid fa-location-dot text-xs"></i>
                            <span>${location}</span>
                        </div>
                        <span class="px-2 py-0.5 rounded-full ${categoryColor} text-[10px] font-medium">${category}</span>
                    </div>
                </div>
                <button class="bg-secondary text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity register-btn" data-id="${event.id}" onclick="event.stopPropagation(); registerForEvent('${event.id}')">
                    Register
                </button>
            </div>
        `;
    }).join('');
    
    // Update "See All" button text
    const viewAllBtn = document.getElementById('viewAllEvents');
    if (viewAllBtn) {
        viewAllBtn.textContent = showAllUpcoming ? 'Show Less' : 'See All';
    }
}

function renderMoreEvents(events) {
    const container = document.getElementById('moreEventsGrid');
    if (!container) return;
    
    // Filter events beyond the first 6 (which are shown in the main list)
    const moreEvents = events.slice(6);
    
    if (moreEvents.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-400 text-sm">
                <i class="fa-regular fa-calendar-plus text-2xl block mb-2 opacity-30"></i>
                No more events available
            </div>
        `;
        // Hide the explore more section if no more events
        const exploreMoreBtn = document.getElementById('exploreMoreBtn');
        if (exploreMoreBtn) {
            exploreMoreBtn.style.display = 'none';
        }
        return;
    }
    
    // Determine how many to show
    const displayCount = showAllMoreEvents ? moreEvents.length : 4;
    const displayEvents = moreEvents.slice(0, displayCount);
    
    container.innerHTML = displayEvents.map(event => {
        const image = event.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title || 'Event')}&background=003f87&color=fff&size=200&format=png`;
        const category = event.category || 'Community';
        const categoryColor = getCategoryColor(category.toLowerCase());
        const date = event.eventDate ? formatDate(event.eventDate) : 'TBD';
        const location = event.community || event.district || 'N/A';
        
        return `
            <div class="group cursor-pointer" onclick="window.location.href='event-detail.html?id=${event.id}'">
                <div class="aspect-video rounded-2xl overflow-hidden mb-3 relative">
                    <img class="w-full h-full object-cover transition-transform group-hover:scale-110" src="${image}"/>
                    <button class="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-primary transition-all" onclick="event.stopPropagation(); saveEvent('${event.id}')">
                        <i class="fa-regular fa-bookmark text-sm"></i>
                    </button>
                </div>
                <p class="text-xs font-bold text-primary mb-1">${category.toUpperCase()}</p>
                <h5 class="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2">${event.title || 'Untitled Event'}</h5>
                <p class="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <i class="fa-solid fa-location-dot text-[10px]"></i> ${location} • ${date}
                </p>
            </div>
        `;
    }).join('');
    
    // Update "Explore More" button text
    const exploreMoreBtn = document.getElementById('exploreMoreBtn');
    if (exploreMoreBtn) {
        if (showAllMoreEvents) {
            exploreMoreBtn.innerHTML = 'Show Less <i class="fa-solid fa-chevron-up text-xs"></i>';
        } else {
            exploreMoreBtn.innerHTML = 'Explore More <i class="fa-solid fa-arrow-right text-xs"></i>';
        }
        exploreMoreBtn.style.display = 'flex';
    }
}

// =============================================
// TOGGLE VIEW FUNCTIONS
// =============================================

function toggleViewAllUpcoming() {
    showAllUpcoming = !showAllUpcoming;
    applyFilters();
    // Scroll to events section
    document.getElementById('eventsList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function toggleExploreMore() {
    showAllMoreEvents = !showAllMoreEvents;
    applyFilters();
    // Scroll to more events section
    document.getElementById('moreEventsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
// EVENT ACTIONS
// =============================================

function registerForEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) {
        showToast('Event not found', 'error');
        return;
    }
    
    if (!auth.currentUser) {
        showToast('Please sign in to register for events', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    
    showToast(`🎉 Registered for "${event.title || 'Event'}"!`, 'success');
}

function saveEvent(eventId) {
    if (!auth.currentUser) {
        showToast('Please sign in to save events', 'error');
        setTimeout(() => {
            window.location.href = '../login.html';
        }, 1500);
        return;
    }
    showToast('📌 Event saved to your bookmarks!', 'success');
}

// =============================================
// FILTER FUNCTIONS - FIXED
// =============================================

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    renderCategories();
    applyFilters();
}

function applyFilters() {
    let filtered = allEvents;
    
    // Category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(e => 
            e.category?.toLowerCase() === currentCategory ||
            e.category?.toLowerCase().includes(currentCategory)
        );
    }
    
    filteredEvents = filtered;
    renderEvents(filtered);
    renderMoreEvents(filtered);
}

// =============================================
// LOCATION DROPDOWN
// =============================================

function setupLocationDropdown() {
    const locationBtn = document.getElementById('locationBtn');
    const dropdown = document.getElementById('locationDropdown');
    let isOpen = false;

    if (!locationBtn || !dropdown) return;

    function toggleDropdown() {
        isOpen = !isOpen;
        dropdown.style.display = isOpen ? 'block' : 'none';
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

    document.addEventListener('click', (e) => {
        if (isOpen && !dropdown.contains(e.target) && e.target !== locationBtn) {
            toggleDropdown();
        }
    });

    document.querySelectorAll('.location-option').forEach(option => {
        option.addEventListener('click', function() {
            const location = this.dataset.location;
            const displayName = location === 'all' ? 'All Communities' : 
                location.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            
            const locationLabel = document.getElementById('locationLabel');
            const locationText = document.getElementById('locationText');
            if (locationLabel) locationLabel.textContent = displayName;
            if (locationText) locationText.textContent = displayName + ', Ghana';
            
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
                const locationLabel = document.getElementById('locationLabel');
                const locationText = document.getElementById('locationText');
                if (locationLabel) locationLabel.textContent = displayName;
                if (locationText) locationText.textContent = displayName + ', Ghana';
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
// REFRESH DATA
// =============================================

async function refreshAllData(community) {
    showToast('Loading events...', 'info');
    
    try {
        const events = await loadEvents(community);
        allEvents = events;
        filteredEvents = events;
        
        const featured = await getFeaturedEvent(events);
        
        renderCategories();
        renderFeaturedEvent(featured);
        applyFilters();
        
        showToast(`${events.length} events loaded!`, 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading events', 'error');
    }
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
                
                // Show events container
                const loadingState = document.getElementById('loadingState');
                const eventsData = document.getElementById('eventsData');
                if (loadingState) loadingState.classList.add('hidden');
                if (eventsData) eventsData.classList.remove('hidden');
                
                await refreshAllData(community);
                
                const firstName = (userData.fullName || userData.name || 'User').split(' ')[0];
                showToast(`Welcome back, ${firstName}! 🎉`, 'success');
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
    // Host Event
    const hostEventBtn = document.getElementById('hostEventBtn');
    if (hostEventBtn) {
        hostEventBtn.addEventListener('click', function() {
            if (!auth.currentUser) {
                showToast('Please sign in to host an event', 'error');
                setTimeout(() => {
                    window.location.href = '../login.html';
                }, 1500);
                return;
            }
            showToast('Opening event creation form...', 'info');
            // window.location.href = 'create-event.html';
        });
    }
    
    // View All Events - Toggle
    const viewAllBtn = document.getElementById('viewAllEvents');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleViewAllUpcoming();
        });
    }
    
    // Explore More - Toggle
    const exploreMoreBtn = document.getElementById('exploreMoreBtn');
    if (exploreMoreBtn) {
        exploreMoreBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleExploreMore();
        });
    }
    
    // Category clicks - using event delegation
    const categoriesContainer = document.getElementById('categoriesContainer');
    if (categoriesContainer) {
        categoriesContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.category-btn');
            if (btn) {
                const category = btn.dataset.category;
                filterByCategory(category);
            }
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
    setupNotificationBell();
    setupEventListeners();
    
    // Expose functions globally
    window.registerForEvent = registerForEvent;
    window.saveEvent = saveEvent;
    window.filterByCategory = filterByCategory;
    window.showToast = showToast;
    window.toggleViewAllUpcoming = toggleViewAllUpcoming;
    window.toggleExploreMore = toggleExploreMore;
    
    console.log('✅ BridgeConnect Events page initialized');
});