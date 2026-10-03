// =============================================
// COMMUNITY PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let currentUserData = null;
let currentCommunity = 'kwamankese';
let currentFilter = 'all';
let allPosts = [];
let isLoading = false;
let hasMorePosts = true;
let lastDoc = null;
const POSTS_PER_PAGE = 10;

// =============================================
// NAVIGATION CONFIGURATION
// =============================================
const NAV_PAGES = {
    'home': '../pages/home.html',
    'explore': '../pages/explore.html',
    'community': '../pages/community.html',
    'profile': '../pages/profile.html',
    'post': '../pages/create-post.html'
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function timeAgo(timestamp) {
    if (!timestamp) return 'Just now';
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
        return 'Just now';
    }
}

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

function truncateText(text, maxLength = 150) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// =============================================
// NAVIGATION FUNCTIONS - FIXED (COMMUNITY ACTIVE)
// =============================================

function navigateTo(page) {
    const currentPath = window.location.pathname;
    const isInPages = currentPath.includes('/pages/');
    
    let targetUrl = NAV_PAGES[page];
    if (!targetUrl) return;
    
    if (isInPages) {
        targetUrl = targetUrl.replace('../pages/', './');
    }
    
    window.location.href = targetUrl;
}

function setupNavItemListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    const fabButton = document.querySelector('.fab-button');
    
    // First, remove any existing active classes
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Determine which page we're on
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'community.html';
    const isCommunityPage = currentPage === 'community.html';
    
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
        if (isCommunityPage && page === 'community') {
            newItem.classList.add('active');
        } else if (!isCommunityPage && page === 'home' && currentPage === 'home.html') {
            newItem.classList.add('active');
        } else if (page === 'explore' && currentPage === 'explore.html') {
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
            window.location.href = '../pages/create-post.html';
        });
    }
}

// =============================================
// LOAD NAVIGATION - FIXED (COMMUNITY ACTIVE)
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
            // Fallback navigation - Community is active
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item" href="home.html"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item" href="explore.html"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item active" href="community.html"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="profile.html"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
        });
}

// =============================================
// FIRESTORE DATA FUNCTIONS
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
// Community Stats Loading
// =============================================

async function loadCommunityStats(community) {
    try {
        // Get community document from communities collection (has read: true)
        const communityRef = db.collection('communities').doc(community);
        const communityDoc = await communityRef.get();
        
        if (communityDoc.exists) {
            const data = communityDoc.data();
            document.getElementById('statMembers').textContent = data.memberCount || 0;
            document.getElementById('statPosts').textContent = data.postCount || 0;
            document.getElementById('statBusinesses').textContent = data.businessCount || 0;
            document.getElementById('statEvents').textContent = data.eventCount || 0;
            return;
        }
        
        // If no community document exists, count from individual collections
        // These collections have read permissions
        const [announcementsSnapshot, eventsSnapshot, businessesSnapshot, usersSnapshot] = await Promise.all([
            db.collection('announcements')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .get()
                .catch(() => ({ size: 0, empty: true })),
            db.collection('events')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .get()
                .catch(() => ({ size: 0, empty: true })),
            db.collection('businesses')
                .where('community', '==', community)
                .where('status', '==', 'approved')
                .get()
                .catch(() => ({ size: 0, empty: true })),
            // Try to count users - this might fail, but we'll handle it
            db.collection('users')
                .where('community', '==', community)
                .where('status', '==', 'active')
                .get()
                .catch(() => ({ size: 0, empty: true }))
        ]);
        
        const memberCount = usersSnapshot.size || 0;
        const postCount = (announcementsSnapshot.size || 0) + (eventsSnapshot.size || 0);
        const businessCount = businessesSnapshot.size || 0;
        const eventCount = eventsSnapshot.size || 0;
        
        document.getElementById('statMembers').textContent = memberCount;
        document.getElementById('statPosts').textContent = postCount;
        document.getElementById('statBusinesses').textContent = businessCount;
        document.getElementById('statEvents').textContent = eventCount;
        
        // Optionally create/update the community document with these stats
        // (only if user has write permissions)
        try {
            await communityRef.set({
                memberCount: memberCount,
                postCount: postCount,
                businessCount: businessCount,
                eventCount: eventCount,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            // Silently fail - user might not have write permissions
        }

    } catch (error) {
        console.error('Error loading community stats:', error);
        // Show zeros instead of error
        document.getElementById('statMembers').textContent = '0';
        document.getElementById('statPosts').textContent = '0';
        document.getElementById('statBusinesses').textContent = '0';
        document.getElementById('statEvents').textContent = '0';
    }
}

async function loadPosts(community, filter = 'all', loadMore = false) {
    if (isLoading) return;
    
    if (!loadMore) {
        allPosts = [];
        lastDoc = null;
        hasMorePosts = true;
        document.getElementById('feedContainer').innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i>
                <p>Loading posts...</p>
            </div>
        `;
    }
    
    isLoading = true;
    
    try {
        let posts = [];
        
        // Determine which collections to query based on filter
        const collectionsToQuery = [];
        
        if (filter === 'all' || filter === 'announcement' || filter === 'news' || filter === 'notice') {
            collectionsToQuery.push({ name: 'announcements', type: 'announcement' });
        }
        if (filter === 'all' || filter === 'event') {
            collectionsToQuery.push({ name: 'events', type: 'event' });
        }
        if (filter === 'all' || filter === 'job') {
            collectionsToQuery.push({ name: 'jobs', type: 'job' });
        }
        
        // If filter is 'all', query all collections
        if (filter === 'all') {
            collectionsToQuery.length = 0;
            collectionsToQuery.push(
                { name: 'announcements', type: 'announcement' },
                { name: 'events', type: 'event' },
                { name: 'jobs', type: 'job' }
            );
        }
        
        // Query each collection
        for (const col of collectionsToQuery) {
            let query = db.collection(col.name)
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(POSTS_PER_PAGE);
            
            if (community && community !== 'all') {
                query = query.where('community', '==', community);
            }
            
            const snapshot = await query.get().catch(() => ({ empty: true, docs: [] }));
            
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    posts.push({
                        id: doc.id,
                        ...data,
                        type: col.type,
                        _collection: col.name
                    });
                });
            }
        }
        
        // Sort posts by createdAt (newest first)
        posts.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(0);
            return dateB - dateA;
        });
        
        // Limit to POSTS_PER_PAGE
        const startIndex = loadMore ? allPosts.length : 0;
        const paginatedPosts = posts.slice(startIndex, startIndex + POSTS_PER_PAGE);
        
        if (paginatedPosts.length === 0 && !loadMore) {
            document.getElementById('feedContainer').innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fa-regular fa-face-frown text-3xl mb-3 block"></i>
                    <p class="font-medium">No posts in this community yet</p>
                    <p class="text-sm">Be the first to share something!</p>
                    <button id="createFirstPost" class="mt-4 bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                        <i class="fa-solid fa-plus mr-2"></i>Create Post
                    </button>
                </div>
            `;
            document.getElementById('createFirstPost')?.addEventListener('click', () => {
                window.location.href = 'create-post.html';
            });
            hasMorePosts = false;
            isLoading = false;
            return;
        }
        
        allPosts = loadMore ? [...allPosts, ...paginatedPosts] : paginatedPosts;
        hasMorePosts = posts.length > (loadMore ? allPosts.length : paginatedPosts.length);
        
        renderPosts(allPosts);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        if (!loadMore) {
            document.getElementById('feedContainer').innerHTML = `
                <div class="text-center py-12 text-red-400">
                    <i class="fa-solid fa-circle-exclamation text-3xl mb-3 block"></i>
                    <p>Failed to load posts</p>
                    <p class="text-sm text-gray-500 mt-1">${error.message}</p>
                    <button id="retryLoad" class="mt-4 bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                        <i class="fa-solid fa-rotate-right mr-2"></i>Retry
                    </button>
                </div>
            `;
            document.getElementById('retryLoad')?.addEventListener('click', () => {
                loadPosts(community, filter);
            });
        }
    } finally {
        isLoading = false;
    }
}

// =============================================
// RENDER POSTS
// =============================================

function renderPosts(posts) {
    const container = document.getElementById('feedContainer');
    if (!container) return;
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fa-regular fa-face-frown text-3xl mb-3 block"></i>
                <p class="font-medium">No posts match your filter</p>
                <p class="text-sm">Try selecting a different category</p>
            </div>
        `;
        return;
    }
    
    const html = posts.map(post => {
        // Map collection to display type
        let displayType = post.type || 'announcement';
        const typeConfig = {
            'announcement': { icon: 'fa-bullhorn', color: 'bg-blue-50 text-blue-700', label: 'Announcement' },
            'event': { icon: 'fa-calendar-days', color: 'bg-purple-50 text-purple-700', label: 'Event' },
            'news': { icon: 'fa-newspaper', color: 'bg-gray-100 text-gray-700', label: 'News' },
            'notice': { icon: 'fa-bell', color: 'bg-yellow-50 text-yellow-700', label: 'Notice' },
            'job': { icon: 'fa-briefcase', color: 'bg-green-50 text-green-700', label: 'Job' },
            'product': { icon: 'fa-box', color: 'bg-orange-50 text-orange-700', label: 'Product' }
        };
        
        const config = typeConfig[displayType] || typeConfig['announcement'];
        const authorName = post.authorName || post.author || post.postedBy || post.createdBy || 'Anonymous';
        const authorAvatar = post.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0052cc&color=fff&size=64`;
        const time = post.createdAt ? timeAgo(post.createdAt) : 'Recently';
        const image = post.image || post.banner || null;
        const title = post.title || post.name || 'Untitled';
        const description = post.description || post.content || post.message || '';
        
        let contentHtml = '';
        
        if (displayType === 'event') {
            contentHtml = `
                <div class="flex flex-col md:flex-row gap-4 mt-3">
                    <div class="flex-1">
                        <div class="space-y-2 mb-3">
                            ${post.eventDate ? `
                            <div class="flex items-center gap-2 text-gray-600 text-sm">
                                <i class="fa-regular fa-calendar text-brand-primary"></i>
                                <span>${formatDate(post.eventDate)}</span>
                            </div>` : ''}
                            ${post.eventTime ? `
                            <div class="flex items-center gap-2 text-gray-600 text-sm">
                                <i class="fa-regular fa-clock text-brand-primary"></i>
                                <span>${post.eventTime}</span>
                            </div>` : ''}
                            ${post.location ? `
                            <div class="flex items-center gap-2 text-gray-600 text-sm">
                                <i class="fa-solid fa-location-dot text-brand-primary"></i>
                                <span>${post.location}</span>
                            </div>` : ''}
                        </div>
                        ${description ? `<p class="text-gray-600 text-sm">${truncateText(description, 120)}</p>` : ''}
                    </div>
                    ${post.banner || post.image ? `
                    <div class="w-full md:w-40 h-40 rounded-xl overflow-hidden bg-brand-primary relative flex-shrink-0">
                        <div class="absolute inset-0 bg-gradient-to-br from-brand-primary/60 to-brand-primary/20"></div>
                        <img class="absolute inset-0 w-full h-full object-cover" src="${post.banner || post.image}" alt="${title}"/>
                        <div class="relative z-10 text-center text-white p-3 flex items-center justify-center h-full">
                            <h3 class="text-sm font-bold leading-tight">${title}</h3>
                        </div>
                    </div>` : ''}
                </div>
            `;
        } else {
            contentHtml = `
                ${description ? `<p class="text-gray-600 text-sm mt-3">${truncateText(description, 180)}</p>` : ''}
                ${image ? `
                <div class="w-full h-48 md:h-56 rounded-xl overflow-hidden mt-3 border border-gray-100 shadow-sm">
                    <img class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" src="${image}" alt="${title}"/>
                </div>` : ''}
            `;
        }
        
        return `
        <div class="post-card bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-4">
                <!-- Header -->
                <div class="flex justify-between items-start">
                    <div class="flex gap-3">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 flex-shrink-0">
                            <img class="w-full h-full object-cover" src="${authorAvatar}" alt="${authorName}"/>
                        </div>
                        <div>
                            <div class="flex items-center gap-1">
                                <h5 class="font-semibold text-gray-900 text-sm">${authorName}</h5>
                                ${post.authorVerified || post.isVerified ? `<i class="fa-solid fa-check-circle text-brand-primary text-xs"></i>` : ''}
                            </div>
                            <p class="text-xs text-gray-400">${time} • <i class="fa-regular fa-globe"></i> ${post.community || 'Community'}</p>
                        </div>
                    </div>
                    <button class="text-gray-400 hover:text-gray-600 transition-colors post-more-btn" data-id="${post.id}">
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </button>
                </div>
                
                <!-- Type Badge -->
                <div class="flex gap-2 items-center mt-2">
                    <span class="px-2.5 py-0.5 ${config.color} text-xs font-bold rounded-full flex items-center gap-1.5">
                        <i class="fa-solid ${config.icon} text-xs"></i> ${config.label}
                    </span>
                </div>
                
                <!-- Title -->
                <h2 class="text-lg font-bold text-gray-900 mt-3 mb-1">${title}</h2>
                
                <!-- Content -->
                ${contentHtml}
            </div>
            
            <!-- Actions -->
            <div class="px-4 py-2 border-t border-gray-100 flex justify-between">
                <div class="flex items-center gap-4">
                    <span class="text-sm text-gray-500"><i class="fa-regular fa-heart text-brand-primary"></i> ${post.likes || post.likeCount || 0}</span>
                    <span class="text-sm text-gray-500"><i class="fa-regular fa-comment text-brand-primary"></i> ${post.comments || post.commentCount || 0}</span>
                </div>
                <div class="flex gap-3">
                    <button class="text-gray-400 hover:text-brand-primary transition-colors like-btn" data-id="${post.id}" data-collection="${post._collection || 'announcements'}">
                        <i class="fa-regular fa-thumbs-up"></i>
                    </button>
                    <button class="text-gray-400 hover:text-brand-primary transition-colors comment-btn" data-id="${post.id}">
                        <i class="fa-regular fa-comment"></i>
                    </button>
                    <button class="text-gray-400 hover:text-brand-primary transition-colors share-btn" data-id="${post.id}">
                        <i class="fa-regular fa-share-from-square"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    if (hasMorePosts) {
        container.innerHTML += `
            <div class="text-center py-4">
                <button id="loadMoreBtn" class="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-full text-sm font-medium transition-colors">
                    <i class="fa-solid fa-chevron-down mr-2"></i>Load More
                </button>
            </div>
        `;
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
            loadPosts(currentCommunity, currentFilter, true);
        });
    }
    
    attachPostEventListeners();
}

// =============================================
// POST EVENT LISTENERS
// =============================================

function attachPostEventListeners() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.dataset.id;
            const collection = this.dataset.collection || 'announcements';
            handleLike(postId, collection);
        });
    });
    
    document.querySelectorAll('.comment-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.dataset.id;
            window.location.href = `post-detail.html?id=${postId}#comments`;
        });
    });
    
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const postId = this.dataset.id;
            const url = `${window.location.origin}/post-detail.html?id=${postId}`;
            if (navigator.share) {
                navigator.share({ title: 'Check this out on BridgeConnect', url: url }).catch(() => {});
            } else {
                navigator.clipboard.writeText(url).then(() => {
                    showToast('Link copied! 📋', 'success');
                }).catch(() => {
                    prompt('Copy this link:', url);
                });
            }
        });
    });
    
    document.querySelectorAll('.post-more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const postId = this.dataset.id;
            window.location.href = `post-detail.html?id=${postId}`;
        });
    });
}

async function handleLike(postId, collection = 'announcements') {
    if (!currentUser) {
        showToast('Please sign in to like posts', 'error');
        return;
    }
    
    try {
        await db.collection(collection).doc(postId).update({
            likes: firebase.firestore.FieldValue.increment(1)
        });
        showToast('Liked! ❤️', 'success');
    } catch (error) {
        console.error('Error liking post:', error);
        showToast('Error liking post', 'error');
    }
}

// =============================================
// FILTER PILLS
// =============================================

function setupFilters() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.filter-pill').forEach(p => {
                p.classList.remove('active');
                p.className = p.className
                    .replace('bg-brand-primary text-white border-brand-primary', 'bg-gray-50 text-gray-700 border-gray-200');
            });
            
            this.classList.add('active');
            this.className = this.className
                .replace('bg-gray-50 text-gray-700 border-gray-200', 'bg-brand-primary text-white border-brand-primary');
            
            currentFilter = this.dataset.filter;
            loadPosts(currentCommunity, currentFilter);
        });
    });
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
            setTimeout(() => dropdown.classList.add('open'), 10);
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
                location.charAt(0).toUpperCase() + location.slice(1);
            
            const locationText = document.getElementById('locationText');
            if (locationText) locationText.textContent = displayName;
            
            localStorage.setItem('bridgeconnect_community', location);
            currentCommunity = location;
            
            loadCommunityStats(location);
            loadPosts(location, currentFilter);
            
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
    if (!notifBtn) return;

    notifBtn.addEventListener('click', function() {
        window.location.href = 'notifications.html';
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
                
                const displayName = community === 'all' ? 'All Communities' :
                    community.charAt(0).toUpperCase() + community.slice(1);
                const locationText = document.getElementById('locationText');
                if (locationText) locationText.textContent = displayName;
                
                await loadCommunityStats(community);
                await loadPosts(community, currentFilter);
                
                showToast(`Welcome to ${displayName}! 🏘️`, 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            const community = localStorage.getItem('bridgeconnect_community') || 'kwamankese';
            await loadCommunityStats(community);
            await loadPosts(community, currentFilter);
        }
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    setupFilters();
    setupLocationDropdown();
    setupNotificationBell();
    
    console.log('✅ BridgeConnect Community page initialized');
});

// Expose functions globally
window.loadPosts = loadPosts;
window.loadCommunityStats = loadCommunityStats;