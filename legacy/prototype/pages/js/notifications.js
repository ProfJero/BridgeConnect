// =============================================
// NOTIFICATIONS PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let currentUserData = null;
let allNotifications = [];
let currentFilter = 'all';
let isLoading = false;

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

function truncateText(text, maxLength = 80) {
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
// NAVIGATION FUNCTIONS - FIXED (NO ACTIVE NAV)
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
    
    // FIRST: Remove any existing active classes from ALL nav items
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
        } else if (label === 'messages' || (icon && icon.classList.contains('fa-comment-dots'))) {
            page = 'messages';
        } else if (label === 'profile' || (icon && icon.classList.contains('fa-user'))) {
            page = 'profile';
        }
        
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        // IMPORTANT: No active state for notifications page
        // All nav items will remain inactive
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const currentPage = window.location.pathname.split('/').pop() || 'notifications.html';
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            
            if (currentPage === targetPage) {
                // Remove all active states
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
            window.location.href = '../pages/create-post.html';
        });
    }
}

// =============================================
// LOAD NAVIGATION - FIXED (NO ACTIVE NAV)
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
            // No active nav items - explicitly remove any that might have been set
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        })
        .catch(() => {
            placeholder.innerHTML = `
            <div class="bottom-nav-wrapper">
                <nav class="bottom-nav-glass" role="navigation" aria-label="Main navigation">
                    <a class="nav-item" href="home.html"><i class="fa-solid fa-house nav-icon"></i><span class="nav-label">Home</span></a>
                    <a class="nav-item" href="explore.html"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="community.html"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item" href="profile.html"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
            // No active nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
        });
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
            
            currentUserData = user;
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
    }
}

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

// =============================================
// LOAD NOTIFICATIONS FROM FIRESTORE
// =============================================

async function loadNotifications() {
    if (isLoading) return;
    
    isLoading = true;
    const container = document.getElementById('notificationsContainer');
    container.innerHTML = `
        <div class="text-center py-12 text-gray-400">
            <i class="fa-solid fa-spinner fa-spin text-2xl mb-2 block"></i>
            <p>Loading notifications...</p>
        </div>
    `;
    
    try {
        if (!currentUser) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fa-regular fa-face-frown text-3xl mb-3 block"></i>
                    <p>Please sign in to view notifications</p>
                    <a href="../login.html" class="mt-4 inline-block bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                        <i class="fa-solid fa-sign-in-alt mr-2"></i>Sign In
                    </a>
                </div>
            `;
            isLoading = false;
            return;
        }
        
        // Query notifications from Firestore
        const query = db.collection('notifications')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .limit(50);
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fa-regular fa-bell-slash text-3xl mb-3 block"></i>
                    <p class="font-medium">No notifications yet</p>
                    <p class="text-sm">When you receive notifications, they'll appear here</p>
                </div>
            `;
            isLoading = false;
            return;
        }
        
        allNotifications = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allNotifications.push({
                id: doc.id,
                ...data
            });
        });
        
        updateFilterCounts(allNotifications);
        renderNotifications(allNotifications, currentFilter);
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        container.innerHTML = `
            <div class="text-center py-12 text-red-400">
                <i class="fa-solid fa-circle-exclamation text-3xl mb-3 block"></i>
                <p>Failed to load notifications</p>
                <p class="text-sm text-gray-500 mt-1">${error.message}</p>
                <button id="retryLoad" class="mt-4 bg-brand-primary text-white px-6 py-2 rounded-full text-sm font-medium hover:bg-brand-primary/90 transition-colors">
                    <i class="fa-solid fa-rotate-right mr-2"></i>Retry
                </button>
            </div>
        `;
        document.getElementById('retryLoad')?.addEventListener('click', () => {
            loadNotifications();
        });
    } finally {
        isLoading = false;
    }
}

// =============================================
// UPDATE FILTER COUNTS
// =============================================

function updateFilterCounts(notifications) {
    const counts = {
        all: notifications.length,
        job: 0,
        marketplace: 0,
        event: 0,
        message: 0,
        announcement: 0
    };
    
    notifications.forEach(n => {
        const type = n.type || 'announcement';
        if (counts.hasOwnProperty(type)) {
            counts[type]++;
        }
    });
    
    const countAll = document.getElementById('countAll');
    const countJobs = document.getElementById('countJobs');
    const countMarketplace = document.getElementById('countMarketplace');
    const countEvents = document.getElementById('countEvents');
    const countMessages = document.getElementById('countMessages');
    const countAnnouncements = document.getElementById('countAnnouncements');
    
    if (countAll) countAll.textContent = counts.all;
    if (countJobs) countJobs.textContent = counts.job;
    if (countMarketplace) countMarketplace.textContent = counts.marketplace;
    if (countEvents) countEvents.textContent = counts.event;
    if (countMessages) countMessages.textContent = counts.message;
    if (countAnnouncements) countAnnouncements.textContent = counts.announcement;
    
    // Update notification badge
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.textContent = unreadCount > 0 ? unreadCount : '';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// =============================================
// RENDER NOTIFICATIONS
// =============================================

function renderNotifications(notifications, filter = 'all') {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;
    
    let filtered = notifications;
    if (filter !== 'all') {
        filtered = notifications.filter(n => n.type === filter);
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fa-regular fa-bell-slash text-3xl mb-3 block"></i>
                <p class="font-medium">No ${filter !== 'all' ? filter : ''} notifications</p>
                <p class="text-sm">Check back later for updates</p>
            </div>
        `;
        return;
    }
    
    // Group by date
    const grouped = {};
    filtered.forEach(n => {
        const date = n.createdAt ? formatDate(n.createdAt) : 'Today';
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(n);
    });
    
    // Get date labels
    const today = formatDate(new Date());
    const yesterday = formatDate(new Date(Date.now() - 86400000));
    
    let html = '';
    
    Object.keys(grouped).forEach(dateKey => {
        let label = dateKey;
        if (dateKey === today) label = 'Today';
        else if (dateKey === yesterday) label = 'Yesterday';
        else label = dateKey;
        
        html += `
            <div class="pt-2 pb-1">
                <h3 class="font-bold text-gray-900 text-sm">${label}</h3>
            </div>
        `;
        
        grouped[dateKey].forEach(n => {
            html += renderNotificationItem(n);
        });
    });
    
    container.innerHTML = html;
    
    // Attach event listeners
    attachNotificationListeners();
}

function renderNotificationItem(notification) {
    const typeConfig = {
        'job': { icon: 'fa-briefcase', color: 'bg-green-50 text-green-600', bg: 'hover:border-green-200' },
        'marketplace': { icon: 'fa-store', color: 'bg-orange-50 text-orange-500', bg: 'hover:border-orange-200' },
        'event': { icon: 'fa-calendar-days', color: 'bg-purple-50 text-purple-600', bg: 'hover:border-purple-200' },
        'message': { icon: 'fa-comment', color: 'bg-indigo-50 text-indigo-500', bg: 'hover:border-indigo-200' },
        'announcement': { icon: 'fa-bullhorn', color: 'bg-blue-50 text-blue-600', bg: 'hover:border-blue-200' },
        'order': { icon: 'fa-box', color: 'bg-teal-50 text-teal-600', bg: 'hover:border-teal-200' },
        'birthday': { icon: 'fa-cake-candles', color: 'bg-pink-50 text-pink-500', bg: 'hover:border-pink-200' }
    };
    
    const config = typeConfig[notification.type] || typeConfig['announcement'];
    const time = notification.createdAt ? timeAgo(notification.createdAt) : 'Just now';
    const isUnread = !notification.read;
    const title = notification.title || 'Notification';
    const message = notification.message || notification.body || '';
    const actionText = notification.actionText || 'View Details';
    const actionUrl = notification.actionUrl || '#';
    
    // Get avatar
    let avatarHtml = '';
    if (notification.avatar) {
        avatarHtml = `<img class="w-12 h-12 rounded-full object-cover" src="${notification.avatar}" alt="Avatar"/>`;
    } else if (notification.senderName) {
        avatarHtml = `<div class="w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-xl font-bold">${getInitials(notification.senderName)}</div>`;
    } else {
        avatarHtml = `<div class="w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-2xl"><i class="fa-solid ${config.icon}"></i></div>`;
    }
    
    return `
        <div class="notification-item bg-white p-4 rounded-xl border ${isUnread ? 'border-blue-200 unread bg-blue-50/30' : 'border-gray-100'} ${config.bg} shadow-sm transition-all cursor-pointer" data-id="${notification.id}">
            <div class="flex gap-4 items-start">
                <div class="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border-2 border-white shadow-sm">
                    ${avatarHtml}
                </div>
                <div class="flex-grow min-w-0">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <h4 class="font-bold text-gray-900 text-sm flex items-center gap-2">
                                ${title}
                                ${isUnread ? `<span class="unread-dot w-2 h-2 bg-blue-500 rounded-full inline-block"></span>` : ''}
                            </h4>
                            ${message ? `<p class="text-gray-600 text-sm mt-1">${truncateText(message, 100)}</p>` : ''}
                            ${actionText && actionUrl ? `
                                <a href="${actionUrl}" class="mt-2 text-brand-primary text-sm font-semibold hover:underline inline-block notification-action" data-id="${notification.id}">
                                    ${actionText} <i class="fa-solid fa-arrow-right text-xs ml-1"></i>
                                </a>
                            ` : ''}
                        </div>
                        <span class="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">${time}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// =============================================
// NOTIFICATION LISTENERS
// =============================================

function attachNotificationListeners() {
    // Click on notification item
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function(e) {
            // Don't trigger if clicking on action link
            if (e.target.closest('.notification-action')) return;
            
            const id = this.dataset.id;
            markNotificationRead(id);
            
            // Navigate to action URL if available
            const actionLink = this.querySelector('.notification-action');
            if (actionLink) {
                const url = actionLink.getAttribute('href');
                if (url && url !== '#') {
                    window.location.href = url;
                }
            }
        });
    });
    
    // Click on action links
    document.querySelectorAll('.notification-action').forEach(link => {
        link.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id || this.closest('.notification-item')?.dataset.id;
            if (id) {
                markNotificationRead(id);
            }
        });
    });
}

// =============================================
// MARK NOTIFICATION AS READ
// =============================================

async function markNotificationRead(notificationId) {
    if (!currentUser) return;
    
    try {
        await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update local state
        const notif = allNotifications.find(n => n.id === notificationId);
        if (notif) {
            notif.read = true;
        }
        
        // Update UI
        const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
        if (item) {
            item.classList.remove('unread', 'bg-blue-50/30', 'border-blue-200');
            item.classList.add('border-gray-100');
            const dot = item.querySelector('.unread-dot');
            if (dot) dot.remove();
        }
        
        // Update badge count
        const unreadCount = allNotifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = unreadCount > 0 ? unreadCount : '';
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
        
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// =============================================
// MARK ALL AS READ
// =============================================

async function markAllAsRead() {
    if (!currentUser) return;
    
    const unreadNotifications = allNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) {
        showToast('All notifications are already read', 'info');
        return;
    }
    
    try {
        showToast('Marking all as read...', 'info');
        
        const batch = db.batch();
        unreadNotifications.forEach(n => {
            const ref = db.collection('notifications').doc(n.id);
            batch.update(ref, {
                read: true,
                readAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        await batch.commit();
        
        // Update local state
        allNotifications.forEach(n => {
            n.read = true;
        });
        
        // Update UI
        document.querySelectorAll('.notification-item').forEach(item => {
            item.classList.remove('unread', 'bg-blue-50/30', 'border-blue-200');
            item.classList.add('border-gray-100');
            const dot = item.querySelector('.unread-dot');
            if (dot) dot.remove();
        });
        
        // Update badge
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.textContent = '';
            badge.style.display = 'none';
        }
        
        showToast('All notifications marked as read ✅', 'success');
        
    } catch (error) {
        console.error('Error marking all as read:', error);
        showToast('Error marking notifications as read', 'error');
    }
}

// =============================================
// SETUP FILTERS
// =============================================

function setupFilters() {
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            document.querySelectorAll('.filter-pill').forEach(p => {
                p.classList.remove('active');
                p.className = p.className
                    .replace('bg-brand-primary text-white', 'bg-gray-50 text-gray-700 border border-gray-200');
            });
            
            this.classList.add('active');
            this.className = this.className
                .replace('bg-gray-50 text-gray-700 border border-gray-200', 'bg-brand-primary text-white');
            
            currentFilter = this.dataset.filter;
            renderNotifications(allNotifications, currentFilter);
        });
    });
}

// =============================================
// SETUP NOTIFICATION BELL
// =============================================

function setupNotificationBell() {
    const notifBtn = document.getElementById('notificationBtn');
    if (!notifBtn) return;
    
    notifBtn.addEventListener('click', function() {
        // Already on notifications page, refresh
        loadNotifications();
        showToast('Refreshing notifications...', 'info');
    });
}

// =============================================
// SETUP MARK ALL READ BUTTON
// =============================================

function setupMarkAllRead() {
    const btn = document.getElementById('markAllReadBtn');
    if (!btn) return;
    
    btn.addEventListener('click', markAllAsRead);
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
                await loadNotifications();
                
                // Set up realtime listener for new notifications
                setupRealtimeNotifications();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            await loadNotifications();
        }
    });
}

// =============================================
// REALTIME NOTIFICATION UPDATES
// =============================================

function setupRealtimeNotifications() {
    if (!currentUser) return;
    
    const query = db.collection('notifications')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .limit(50);
    
    query.onSnapshot((snapshot) => {
        let hasChanges = false;
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const newNotif = { id: change.doc.id, ...change.doc.data() };
                // Check if already exists
                const exists = allNotifications.some(n => n.id === newNotif.id);
                if (!exists) {
                    allNotifications = [newNotif, ...allNotifications];
                    hasChanges = true;
                    
                    // Show toast for new notification
                    if (!newNotif.read) {
                        showToast(`🔔 ${newNotif.title || 'New notification'}`, 'info');
                    }
                }
            } else if (change.type === 'modified') {
                const updated = { id: change.doc.id, ...change.doc.data() };
                const index = allNotifications.findIndex(n => n.id === updated.id);
                if (index !== -1) {
                    allNotifications[index] = updated;
                    hasChanges = true;
                }
            }
        });
        
        if (hasChanges) {
            updateFilterCounts(allNotifications);
            renderNotifications(allNotifications, currentFilter);
        }
    }, (error) => {
        console.warn('Realtime notifications error:', error);
    });
}

// =============================================
// PROFILE CLICK
// =============================================

function setupProfileClick() {
    const profileImg = document.getElementById('profileImage');
    if (!profileImg) return;
    
    profileImg.addEventListener('click', () => {
        window.location.href = 'profile.html';
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    setupFilters();
    setupNotificationBell();
    setupMarkAllRead();
    setupProfileClick();
    
    console.log('✅ BridgeConnect Notifications page initialized');
});

// Expose functions globally
window.markAllAsRead = markAllAsRead;
window.loadNotifications = loadNotifications;