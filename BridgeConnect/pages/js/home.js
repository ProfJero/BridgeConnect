// =============================================
// HOME PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let currentUserData = null;
let currentCommunity = 'kwamankese';
let allAnnouncements = [];
let allBusinesses = [];
let allJobs = [];
let allProducts = [];
let allEvents = [];
let sliderData = [];
let currentSlide = 0;
let autoSlideInterval = null;

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

function timeAgo(timestamp) {
    if (!timestamp) return 'Recently';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    } catch (e) {
        return 'Recently';
    }
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getStatusColor(status) {
    const colors = {
        'active': 'bg-green-100 text-green-700',
        'approved': 'bg-green-100 text-green-700',
        'pending': 'bg-orange-100 text-orange-700',
        'suspended': 'bg-red-100 text-red-700',
        'rejected': 'bg-red-100 text-red-700',
        'completed': 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}

// =============================================
// NAVIGATION FUNCTIONS
// =============================================

function navigateTo(page) {
    // Get the current path to determine relative navigation
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    
    let targetUrl = NAV_PAGES[page];
    if (!targetUrl) {
        console.warn('Unknown page:', page);
        return;
    }
    
    // If we're already in the pages folder, use relative path
    if (isInPages) {
        targetUrl = targetUrl.replace('../pages/', './');
    }
    
    window.location.href = targetUrl;
}

function setupNavItemListeners() {
    // Get all nav items
    const navItems = document.querySelectorAll('.nav-item');
    const fabButton = document.querySelector('.fab-button');
    
    // Map nav items to their corresponding pages
    navItems.forEach(item => {
        const label = item.querySelector('.nav-label')?.textContent?.toLowerCase() || '';
        const icon = item.querySelector('.nav-icon');
        let page = null;
        
        // Determine which page this nav item points to
        if (label === 'home' || (icon && icon.classList.contains('fa-house'))) {
            page = 'home';
        } else if (label === 'explore' || (icon && icon.classList.contains('fa-magnifying-glass'))) {
            page = 'explore';
        } else if (label === 'messages' || (icon && icon.classList.contains('fa-comment-dots'))) {
            page = 'messages';
        } else if (label === 'profile' || (icon && icon.classList.contains('fa-user'))) {
            page = 'profile';
        }
        
        // Remove existing click listeners by replacing the element
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // Add click listener to the new element
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Don't navigate if already on this page
            const currentPage = window.location.pathname.split('/').pop() || 'home.html';
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            
            if (currentPage === targetPage) {
                // Just update active state
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                this.classList.add('active');
                return;
            }
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            this.classList.add('active');
            
            // Navigate to the page
            if (page) {
                navigateTo(page);
            }
        });
    });
    
    // Fab button - Create Post
    if (fabButton) {
        const newFab = fabButton.cloneNode(true);
        fabButton.parentNode.replaceChild(newFab, fabButton);
        
        newFab.addEventListener('click', function(e) {
            e.preventDefault();
            showToast('Opening create post...', 'info');
            // Navigate to create post page
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

async function loadAnnouncements(community) {
    try {
        let query = db.collection('announcements')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(10);
        
        if (community && community !== 'all') {
            query = db.collection('announcements')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(10);
        }
        
        const snapshot = await query.get();
        const announcements = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            announcements.push({
                id: doc.id,
                ...data
            });
        });
        
        allAnnouncements = announcements;
        return announcements;
    } catch (error) {
        console.warn('Error loading announcements:', error.message);
        return [];
    }
}

async function loadBusinesses(community) {
    try {
        let query = db.collection('businesses')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(10);
        
        if (community && community !== 'all') {
            query = db.collection('businesses')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(10);
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
        return businesses;
    } catch (error) {
        console.warn('Error loading businesses:', error.message);
        return [];
    }
}

async function loadJobs(community) {
    try {
        let query = db.collection('jobs')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(5);
        
        if (community && community !== 'all') {
            query = db.collection('jobs')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(5);
        }
        
        const snapshot = await query.get();
        const jobs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            jobs.push({
                id: doc.id,
                ...data
            });
        });
        
        allJobs = jobs;
        return jobs;
    } catch (error) {
        console.warn('Error loading jobs:', error.message);
        return [];
    }
}

async function loadProducts(community) {
    try {
        let query = db.collection('products')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .limit(6);
        
        if (community && community !== 'all') {
            query = db.collection('products')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(6);
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
        return [];
    }
}

async function loadEvents(community) {
    try {
        let query = db.collection('events')
            .where('status', '==', 'approved')
            .orderBy('eventDate', 'asc')
            .limit(5);
        
        if (community && community !== 'all') {
            query = db.collection('events')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .orderBy('eventDate', 'asc')
                .limit(5);
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
        return events;
    } catch (error) {
        console.warn('Error loading events:', error.message);
        return [];
    }
}

// =============================================
// SLIDER FUNCTIONS
// =============================================

function prepareSliderData() {
    const sliderItems = [];
    
    // Add announcements
    allAnnouncements.forEach(announcement => {
        sliderItems.push({
            type: 'announcement',
            id: announcement.id,
            title: announcement.title || 'Announcement',
            date: announcement.createdAt ? formatDate(announcement.createdAt) : 'Recent',
            location: announcement.community || 'Community',
            image: announcement.image || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&h=400&fit=crop',
            badge: '📢 Announcement',
            icon: 'fa-solid fa-bullhorn',
            description: announcement.content || announcement.message || ''
        });
    });
    
    // Add events
    allEvents.forEach(event => {
        sliderItems.push({
            type: 'event',
            id: event.id,
            title: event.title || 'Event',
            date: event.eventDate ? formatDate(event.eventDate) : 'Upcoming',
            location: event.community || 'Community',
            image: event.banner || 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&h=400&fit=crop',
            badge: '🎉 Event',
            icon: 'fa-regular fa-calendar-days',
            description: event.description || ''
        });
    });
    
    if (sliderItems.length === 0) {
        sliderItems.push({
            title: 'Welcome to BridgeConnect',
            date: 'Connecting communities',
            location: 'Your community',
            image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&h=400&fit=crop',
            badge: '🌟 Welcome',
            icon: 'fa-solid fa-handshake',
            description: 'Discover opportunities in your community'
        });
    }
    
    sliderData = sliderItems.slice(0, 5);
    return sliderData;
}

function renderSlider() {
    const track = document.getElementById('sliderTrack');
    const dots = document.getElementById('sliderDots');
    
    if (!track || !dots) return;
    
    const slides = sliderData.length > 0 ? sliderData : prepareSliderData();
    
    track.innerHTML = slides.map((slide) => `
        <div class="slider-slide relative">
            <div class="flex items-stretch min-h-[160px]">
                <div class="w-[55%] p-4 flex flex-col justify-between z-10 text-white">
                    <div>
                        <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2 opacity-90">
                            <i class="${slide.icon || 'fa-solid fa-bullhorn'}"></i> ${slide.badge || 'Featured'}
                        </div>
                        <h2 class="text-lg font-bold leading-tight mb-2">${slide.title}</h2>
                        <div class="space-y-1 text-xs opacity-90 mb-4">
                            <div class="flex items-center gap-1.5"><i class="fa-regular fa-calendar"></i> ${slide.date}</div>
                            <div class="flex items-center gap-1.5"><i class="fa-solid fa-location-dot"></i> ${slide.location}</div>
                        </div>
                        ${slide.description ? `<p class="text-xs opacity-75 mb-2 line-clamp-2">${slide.description}</p>` : ''}
                    </div>
                    <button class="bg-white text-brand-primary text-xs font-bold py-2 px-4 rounded-custom-full w-fit shadow-sm active:bg-gray-50 view-slide-btn" data-id="${slide.id}" data-type="${slide.type}">
                        ${slide.type === 'event' ? 'View Event' : 'Learn More'}
                    </button>
                </div>
                <div class="absolute inset-y-0 right-0 w-[55%] h-full">
                    <div class="w-full h-full" style="clip-path: polygon(15% 0, 100% 0, 100% 100%, 0% 100%);">
                        <img alt="Slide" class="w-full h-full object-cover" src="${slide.image}"/>
                        <div class="absolute inset-0 bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent"></div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    dots.innerHTML = slides.map((_, index) => `
        <button class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}" onclick="goToSlide(${index})"></button>
    `).join('');

    if (currentSlide >= slides.length) {
        currentSlide = 0;
    }
    
    updateSlider();
    
    document.querySelectorAll('.view-slide-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const type = this.dataset.type;
            if (type === 'event') {
                window.location.href = `event-detail.html?id=${id}`;
            } else {
                window.location.href = `announcement-detail.html?id=${id}`;
            }
        });
    });
}

function updateSlider() {
    const track = document.getElementById('sliderTrack');
    const dots = document.querySelectorAll('.slider-dot');
    if (!track) return;
    
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentSlide);
    });
}

function nextSlide() {
    const total = sliderData.length > 0 ? sliderData.length : 1;
    currentSlide = (currentSlide + 1) % total;
    updateSlider();
}

function prevSlide() {
    const total = sliderData.length > 0 ? sliderData.length : 1;
    currentSlide = (currentSlide - 1 + total) % total;
    updateSlider();
}

function goToSlide(index) {
    currentSlide = index;
    updateSlider();
    resetAutoSlide();
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    if (sliderData.length > 1) {
        autoSlideInterval = setInterval(nextSlide, 5000);
    }
}

// =============================================
// RENDER FUNCTIONS
// =============================================

function renderBusinesses(businesses) {
    const container = document.getElementById('businessesContainer');
    if (!container) return;
    
    if (!businesses || businesses.length === 0) {
        container.innerHTML = `
            <div class="min-w-full text-center py-8 text-gray-500">
                <i class="fa-solid fa-store text-3xl block mb-2 opacity-30"></i>
                <p class="text-sm">No businesses in your community yet</p>
                <p class="text-xs mt-1">Check back later or explore other communities</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = businesses.map(biz => {
        const logo = biz.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(biz.name || 'Business')}&background=0052cc&color=fff&size=200`;
        const rating = biz.rating || (biz.reviews && biz.reviews.length > 0 ? (biz.reviews.reduce((a, b) => a + b.rating, 0) / biz.reviews.length).toFixed(1) : '4.5');
        const category = biz.category || 'General';
        const distance = biz.distance || 'Near you';
        
        return `
        <div class="business-card min-w-[130px] w-[130px] bg-white rounded-custom shadow-sm border border-gray-100 flex flex-col overflow-hidden snap-start cursor-pointer" onclick="window.location.href='business-detail.html?id=${biz.id}'">
            <div class="h-[90px] w-full bg-gray-200 relative">
                <img alt="${biz.name}" class="w-full h-full object-cover" src="${logo}"/>
                <div class="absolute inset-0 bg-black/20 flex items-center justify-center p-2">
                    <span class="text-white font-bold text-center text-xs leading-tight drop-shadow-md">${biz.name || 'Business'}</span>
                </div>
            </div>
            <div class="p-2 flex flex-col flex-1">
                <h4 class="text-[11px] font-bold text-gray-900 line-clamp-1 mb-1">${biz.name || 'Business'}</h4>
                <p class="text-[10px] text-gray-500 mb-2">${category} · ${distance}</p>
                <div class="mt-auto flex items-center gap-1 text-[10px] font-bold text-brand-green">
                    <i class="fa-solid fa-star"></i> ${rating}
                </div>
            </div>
        </div>
    `}).join('');
}

function renderJobs(jobs) {
    const container = document.getElementById('jobsContainer');
    if (!container) return;
    
    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-4 rounded-custom border border-gray-100 shadow-sm text-center">
                <i class="fa-solid fa-briefcase text-2xl block mb-2 opacity-30"></i>
                <p class="text-xs text-gray-500">No jobs available</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jobs.map(job => {
        const logo = job.employerLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.employer || 'Company')}&background=6366f1&color=fff&size=64`;
        const salary = job.salary || 'Negotiable';
        const company = job.employer || 'Company';
        const location = job.community || job.district || 'N/A';
        const time = job.createdAt ? timeAgo(job.createdAt) : 'Recently';
        
        return `
        <div class="bg-white p-2 rounded-custom border border-gray-100 shadow-sm flex gap-2 items-start cursor-pointer hover:shadow-md transition-shadow" onclick="window.location.href='job-detail.html?id=${job.id}'">
            <div class="w-8 h-8 rounded bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 p-1">
                <img alt="Logo" class="w-full h-full object-contain" src="${logo}" onerror="this.style.display='none'"/>
                ${!logo ? `<i class="fa-solid fa-briefcase text-gray-400"></i>` : ''}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-0.5">
                    <h4 class="text-xs font-bold text-gray-900 line-clamp-1">${job.title || 'Job Position'}</h4>
                    <span class="text-[9px] text-gray-400 whitespace-nowrap ml-1">${time}</span>
                </div>
                <p class="text-[10px] text-gray-500 mb-0.5 line-clamp-1">${company}</p>
                <div class="flex items-center gap-1 text-[9px] text-gray-400 mb-1">
                    <i class="fa-solid fa-location-dot"></i> ${location}
                </div>
                <p class="text-[10px] font-bold text-brand-green">${salary}</p>
            </div>
        </div>
    `}).join('');
}

function renderProducts(products) {
    const container = document.getElementById('productsContainer');
    if (!container) return;
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="min-w-[90px] w-[90px] bg-white rounded-custom border border-gray-100 shadow-sm p-2 flex flex-col snap-start items-center justify-center">
                <i class="fa-solid fa-box text-3xl mb-2 opacity-30"></i>
                <p class="text-[9px] text-gray-500 text-center">No products</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => {
        const image = product.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(product.name || 'Product')}&background=16A34A&color=fff&size=200`;
        const price = product.price ? `GH¢ ${product.price}` : 'Price on request';
        const name = product.name || 'Product';
        
        return `
        <div class="min-w-[90px] w-[90px] bg-white rounded-custom border border-gray-100 shadow-sm p-2 flex flex-col snap-start cursor-pointer hover:shadow-md transition-shadow" onclick="window.location.href='product-detail.html?id=${product.id}'">
            <div class="h-16 w-full mb-2 bg-gray-50 rounded flex items-center justify-center p-1">
                <img alt="${name}" class="w-full h-full object-contain" src="${image}"/>
            </div>
            <h4 class="text-[10px] font-bold text-gray-900 line-clamp-2 mb-1 leading-tight flex-1">${name}</h4>
            <p class="text-[11px] font-bold text-brand-green">${price}</p>
        </div>
    `}).join('');
}

// =============================================
// GREETING FUNCTION
// =============================================

function updateGreeting(userName) {
    const hour = new Date().getHours();
    let greeting, emoji;
    
    if (hour >= 5 && hour < 12) {
        greeting = 'Good Morning';
        emoji = '🌅';
    } else if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
        emoji = '☀️';
    } else if (hour >= 17 && hour < 20) {
        greeting = 'Good Evening';
        emoji = '🌆';
    } else {
        greeting = 'Good Night';
        emoji = '🌙';
    }
    
    const greetingEl = document.getElementById('greetingText');
    const emojiEl = document.getElementById('greetingEmoji');
    const nameEl = document.getElementById('userName');
    
    if (greetingEl) greetingEl.textContent = `${greeting},`;
    if (emojiEl) emojiEl.textContent = emoji;
    if (nameEl && userName) {
        nameEl.innerHTML = `${userName} <span class="text-xl">👋</span>`;
    }
}

function loadUserProfile() {
    const userData = localStorage.getItem('bridgeconnect_user');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            const name = user.fullName || user.name || 'User';
            const firstName = name.split(' ')[0] || 'User';
            updateGreeting(firstName);
            
            const profileImg = document.getElementById('profileImage');
            if (profileImg && user.photoURL) {
                profileImg.src = user.photoURL;
            } else if (profileImg) {
                profileImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=200`;
            }
            
            if (user.community) {
                const displayName = user.community.charAt(0).toUpperCase() + user.community.slice(1);
                const locationText = document.getElementById('locationText');
                const communityUpdate = document.getElementById('communityUpdateLocation');
                if (locationText) locationText.textContent = displayName;
                if (communityUpdate) communityUpdate.textContent = displayName;
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
            const communityUpdate = document.getElementById('communityUpdateLocation');
            if (locationText) locationText.textContent = displayName;
            if (communityUpdate) communityUpdate.textContent = displayName;
            
            localStorage.setItem('bridgeconnect_community', location);
            currentCommunity = location;
            
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
// REFRESH DATA
// =============================================

async function refreshAllData(community) {
    showToast('Loading content for your community...', 'info');
    
    try {
        const [announcements, businesses, jobs, products, events] = await Promise.all([
            loadAnnouncements(community),
            loadBusinesses(community),
            loadJobs(community),
            loadProducts(community),
            loadEvents(community)
        ]);
        
        prepareSliderData();
        renderSlider();
        renderBusinesses(businesses);
        renderJobs(jobs);
        renderProducts(products);
        
        showToast('Content updated!', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showToast('Error loading content', 'error');
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
// QUICK SERVICES NAVIGATION
// =============================================

function setupQuickServices() {
    const serviceMap = {
        'Jobs': 'jobs.html',
        'Marketplace': 'marketplace.html',
        'Businesses': 'businesses.html',
        'Events': 'events.html',
        'News': 'news.html',
        'Health': 'health.html',
        'Education': 'education.html',
        'Agriculture': 'agriculture.html'
    };
    
    document.querySelectorAll('.service-icon').forEach((icon) => {
        const parent = icon.closest('a');
        if (!parent) return;
        
        const label = parent.querySelector('span')?.textContent || '';
        if (serviceMap[label]) {
            parent.href = serviceMap[label];
        }
    });
}

// =============================================
// LOAD NAVIGATION COMPONENT
// =============================================

function loadNavigation() {
    const placeholder = document.getElementById('nav-placeholder');
    if (!placeholder) return;
    
    fetch('../nav.html')
        .then(res => {
            if (!res.ok) throw new Error('Nav component not found');
            return res.text();
        })
        .then(html => {
            placeholder.innerHTML = html;
            // Setup nav item listeners after loading
            setupNavItemListeners();
        })
        .catch(err => {
            console.warn('nav.html not loaded, using inline fallback.');
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item active" href="#" aria-current="page"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item" href="#"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button" aria-label="Create new post"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="#"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="#"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
        });
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
        
        currentUser = user;
        
        try {
            const userData = await loadUserData();
            if (userData) {
                loadUserProfile();
                
                const community = userData.community || localStorage.getItem('bridgeconnect_community') || 'kwamankese';
                currentCommunity = community;
                
                const displayName = community.charAt(0).toUpperCase() + community.slice(1);
                const locationText = document.getElementById('locationText');
                const communityUpdate = document.getElementById('communityUpdateLocation');
                if (locationText) locationText.textContent = displayName;
                if (communityUpdate) communityUpdate.textContent = displayName;
                
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
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    setupLocationDropdown();
    setupNotificationBell();
    setupSearch();
    setupQuickServices();
    
    const prevBtn = document.getElementById('prevSlideBtn');
    const nextBtn = document.getElementById('nextSlideBtn');
    if (prevBtn) prevBtn.addEventListener('click', prevSlide);
    if (nextBtn) nextBtn.addEventListener('click', nextSlide);
    
    const sliderContainer = document.querySelector('.slider-container');
    if (sliderContainer) {
        sliderContainer.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
        });
        sliderContainer.addEventListener('mouseleave', () => {
            if (sliderData.length > 1) {
                resetAutoSlide();
            }
        });
    }
    
    const communityUpdateLink = document.querySelector('.flex.items-center.justify-between.p-4.rounded-custom-lg');
    if (communityUpdateLink) {
        communityUpdateLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'community-updates.html';
        });
    }
    
    document.querySelectorAll('.text-brand-green.flex.items-center.gap-1').forEach(link => {
        const parentSection = link.closest('section');
        if (parentSection) {
            const heading = parentSection.querySelector('h3')?.textContent || '';
            if (heading.includes('Nearby Businesses')) {
                link.href = 'businesses.html';
            } else if (heading.includes('Latest Jobs')) {
                link.href = 'jobs.html';
            } else if (heading.includes('Featured Products')) {
                link.href = 'marketplace.html';
            }
        }
    });
    
    console.log('✅ BridgeConnect Home page initialized');
});

window.goToSlide = goToSlide;
window.nextSlide = nextSlide;
window.prevSlide = prevSlide;