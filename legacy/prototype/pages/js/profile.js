// =============================================
// PROFILE PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let currentUserData = null;
let cloudinaryWidget = null;

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
// WORKSPACE DATA
// =============================================
const WORKSPACES = [
    {
        id: 'resident',
        icon: 'fa-house',
        label: 'Resident',
        description: 'Access the BridgeConnect community',
        color: 'bg-secondary/10 text-secondary',
        requiredRole: null
    },
    {
        id: 'business',
        icon: 'fa-briefcase',
        label: 'Business Owner',
        description: 'Manage your business and listings',
        color: 'bg-primary/10 text-primary',
        requiredRole: 'business_owner'
    },
    {
        id: 'moderator',
        icon: 'fa-shield',
        label: 'Moderator',
        description: 'Support and moderate community',
        color: 'bg-orange-100 text-orange-600',
        requiredRole: 'community_moderator'
    },
    {
        id: 'organization',
        icon: 'fa-building',
        label: 'Organisation',
        description: 'Represent your organisation',
        color: 'bg-purple-100 text-purple-600',
        requiredRole: 'verified_org'
    },
    {
        id: 'admin',
        icon: 'fa-user-tie',
        label: 'Admin',
        description: 'Manage district operations',
        color: 'bg-blue-100 text-blue-600',
        requiredRole: 'district_admin'
    }
];

// =============================================
// COMMUNITIES DATA
// =============================================
const COMMUNITIES = [
    { id: 'kwamankese', label: 'Kwamankese', district: 'Abura-Asebu-Kwamankese', region: 'Central Region' },
    { id: 'abura', label: 'Abura', district: 'Abura-Asebu-Kwamankese', region: 'Central Region' },
    { id: 'asebu', label: 'Asebu', district: 'Abura-Asebu-Kwamankese', region: 'Central Region' },
    { id: 'cape_coast', label: 'Cape Coast', district: 'Cape Coast Metropolitan', region: 'Central Region' }
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
        'district_admin': 'Admin',
        'community_moderator': 'Moderator',
        'moderator': 'Moderator',
        'verified_org': 'Organisation',
        'business_owner': 'Business Owner',
        'resident': 'Resident'
    };
    return labels[role] || role || 'Resident';
}

function getWorkspaceAccess(userRole) {
    return WORKSPACES.filter(ws => {
        if (ws.requiredRole === null) return true;
        return userRole === ws.requiredRole || userRole === 'platform_owner' || userRole === 'owner';
    });
}

// =============================================
// NAVIGATION FUNCTIONS - PROFILE ACTIVE
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
    
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'profile.html';
    const isProfilePage = currentPage === 'profile.html';
    
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
        
        if (isProfilePage && page === 'profile') {
            newItem.classList.add('active');
        } else if (!isProfilePage && page === 'home' && currentPage === 'home.html') {
            newItem.classList.add('active');
        } else if (page === 'explore' && currentPage === 'explore.html') {
            newItem.classList.add('active');
        } else if (page === 'community' && currentPage === 'community.html') {
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
                    <a class="nav-item" href="explore.html"><i class="fa-solid fa-magnifying-glass nav-icon"></i><span class="nav-label">Explore</span></a>
                    <div class="fab-wrapper"><button class="fab-button"><i class="fa-solid fa-plus"></i></button><span class="fab-label">Post</span></div>
                    <a class="nav-item" href="community.html"><i class="fa-regular fa-comment-dots nav-icon"></i><span class="nav-label">Community</span></a>
                    <a class="nav-item active" href="profile.html"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
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
// MODAL FUNCTIONS
// =============================================

function createModal(title, content, submitText, onSubmit) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div class="modal-overlay" id="profileModal">
            <div class="modal-content">
                <div class="sticky top-0 bg-white z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="text-xl font-bold text-gray-900">${title}</h3>
                    <button class="modal-close w-10 h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="p-6">${content}</div>
                <div class="sticky bottom-0 bg-white z-10 px-6 py-4 border-t border-gray-100 flex gap-3">
                    <button class="modal-cancel flex-1 px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                    <button class="modal-submit flex-1 px-4 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                        ${submitText}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    if (!container) {
        const modalContainer = document.createElement('div');
        modalContainer.id = 'modalContainer';
        document.body.appendChild(modalContainer);
    }
    
    document.getElementById('modalContainer').innerHTML = modalHTML;
    
    const modal = document.getElementById('profileModal');
    const closeBtns = modal.querySelectorAll('.modal-close, .modal-cancel');
    
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
            const modalEl = document.getElementById('profileModal');
            if (modalEl) {
                modalEl.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', closeOnEscape);
            }
        }
    });
    
    modal.querySelector('.modal-submit').addEventListener('click', () => {
        const result = onSubmit(modal);
        if (result !== false) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.body.style.overflow = 'hidden';
    return modal;
}

// =============================================
// CLOUDINARY IMAGE UPLOAD
// =============================================

function initCloudinaryWidget() {
    // Cloudinary configuration 
    const cloudName = 'jyhtaeef'; 
    const uploadPreset = 'BridgeConnect'; 
    
    if (typeof cloudinary !== 'undefined') {
        cloudinaryWidget = cloudinary.createUploadWidget({
            cloudName: cloudName,
            uploadPreset: uploadPreset,
            sources: ['local', 'url', 'camera'],
            multiple: false,
            cropping: true,
            croppingAspectRatio: 1,
            showAdvancedOptions: false,
            styles: {
                palette: {
                    window: '#FFFFFF',
                    sourceBg: '#F0F3FF',
                    windowBorder: '#003f87',
                    tabIcon: '#003f87',
                    inactiveTabIcon: '#9CA3AF',
                    menuIcons: '#003f87',
                    link: '#003f87',
                    action: '#006e25',
                    inProgress: '#006e25',
                    complete: '#006e25',
                    error: '#BA1A1A',
                    textDark: '#111C2C',
                    textLight: '#FFFFFF'
                }
            }
        }, function(error, result) {
            if (!error && result && result.event === 'success') {
                const imageUrl = result.info.secure_url;
                uploadProfileImage(imageUrl);
            }
        });
    }
}

function uploadProfileImage(imageUrl) {
    if (!currentUser) {
        showToast('Please sign in to update profile picture', 'error');
        return;
    }
    
    showToast('Updating profile picture...', 'info');
    
    db.collection('users').doc(currentUser.uid).update({
        photoURL: imageUrl,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('userAvatar').src = imageUrl;
        document.getElementById('profileImage').src = imageUrl;
        
        if (currentUserData) {
            currentUserData.photoURL = imageUrl;
            localStorage.setItem('bridgeconnect_user', JSON.stringify({
                uid: currentUser.uid,
                ...currentUserData
            }));
        }
        
        showToast('Profile picture updated successfully! 📸', 'success');
    }).catch(error => {
        console.error('Error updating profile picture:', error);
        showToast('Failed to update profile picture', 'error');
    });
}

// =============================================
// EDIT PROFILE
// =============================================

function openEditProfileModal() {
    if (!currentUserData) {
        showToast('Please sign in to edit profile', 'error');
        return;
    }
    
    const user = currentUserData;
    const content = `
        <div class="space-y-4">
            <div>
                <label class="text-sm font-semibold text-gray-700">Full Name</label>
                <input id="editFullName" type="text" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" value="${user.fullName || user.name || ''}" />
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-700">Username</label>
                <input id="editUsername" type="text" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" value="${user.username || user.handle || ''}" />
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-700">Bio</label>
                <textarea id="editBio" rows="3" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm resize-none">${user.bio || ''}</textarea>
            </div>
            <div>
                <label class="text-sm font-semibold text-gray-700">Phone Number</label>
                <input id="editPhone" type="tel" class="w-full mt-1.5 px-4 py-3 border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" value="${user.phone || ''}" />
            </div>
        </div>
    `;
    
    createModal('Edit Profile', content, 'Save Changes', async (modal) => {
        const fullName = modal.querySelector('#editFullName').value.trim();
        const username = modal.querySelector('#editUsername').value.trim();
        const bio = modal.querySelector('#editBio').value.trim();
        const phone = modal.querySelector('#editPhone').value.trim();
        
        if (!fullName) {
            showToast('Please enter your full name', 'error');
            return false;
        }
        
        try {
            const updateData = {
                fullName: fullName,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (username) updateData.username = username;
            if (bio) updateData.bio = bio;
            if (phone) updateData.phone = phone;
            
            await db.collection('users').doc(currentUser.uid).update(updateData);
            
            Object.assign(currentUserData, updateData);
            localStorage.setItem('bridgeconnect_user', JSON.stringify({
                uid: currentUser.uid,
                ...currentUserData
            }));
            
            document.getElementById('userFullName').textContent = fullName;
            if (username) document.getElementById('userUsername').textContent = `@${username}`;
            
            showToast('Profile updated successfully! ✅', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile', 'error');
            return false;
        }
    });
}

// =============================================
// CHANGE COMMUNITY
// =============================================

function openChangeCommunityModal() {
    if (!currentUserData) {
        showToast('Please sign in to change community', 'error');
        return;
    }
    
    const currentCommunity = currentUserData.community || 'kwamankese';
    
    const content = `
        <div class="space-y-3">
            <p class="text-sm text-gray-500 mb-4">Select your community to connect with local businesses, events, and people.</p>
            ${COMMUNITIES.map(comm => `
                <button class="community-option w-full text-left px-4 py-3 rounded-xl border-2 ${comm.id === currentCommunity ? 'border-secondary bg-secondary/5' : 'border-gray-200 hover:border-primary/30'} transition-all flex items-center justify-between" data-community="${comm.id}">
                    <div>
                        <span class="font-semibold text-gray-900">${comm.label}</span>
                        <p class="text-xs text-gray-500">${comm.district}, ${comm.region}</p>
                    </div>
                    ${comm.id === currentCommunity ? '<i class="fa-solid fa-check-circle text-secondary text-xl"></i>' : ''}
                </button>
            `).join('')}
        </div>
    `;
    
    createModal('Change Community', content, 'Update Community', async (modal) => {
        const selected = modal.querySelector('.community-option.border-secondary');
        if (!selected) {
            showToast('Please select a community', 'error');
            return false;
        }
        
        const communityId = selected.dataset.community;
        const community = COMMUNITIES.find(c => c.id === communityId);
        
        try {
            await db.collection('users').doc(currentUser.uid).update({
                community: communityId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentUserData.community = communityId;
            localStorage.setItem('bridgeconnect_user', JSON.stringify({
                uid: currentUser.uid,
                ...currentUserData
            }));
            
            document.getElementById('userCommunity').textContent = community.label;
            document.getElementById('communityName').textContent = community.label;
            document.getElementById('communityDistrict').textContent = community.district;
            document.getElementById('communityRegion').textContent = community.region;
            
            const locationText = document.getElementById('locationText');
            if (locationText) locationText.textContent = community.label;
            
            showToast(`Switched to ${community.label} 🏘️`, 'success');
        } catch (error) {
            console.error('Error updating community:', error);
            showToast('Failed to update community', 'error');
            return false;
        }
    });
}

// =============================================
// LOAD USER DATA
// =============================================

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    currentUser = user;
    
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
// LOAD USER ACTIVITY COUNTS - WITH PERMISSION HANDLING
// =============================================

async function loadUserActivityCounts(userId) {
    // Get all the count elements
    const postCountEl = document.getElementById('postCount');
    const savedCountEl = document.getElementById('savedCount');
    const requestCountEl = document.getElementById('requestCount');
    const orderCountEl = document.getElementById('orderCount');
    
    // Set default values immediately so user sees something
    if (postCountEl) postCountEl.textContent = '0 posts';
    if (savedCountEl) savedCountEl.textContent = '0 saved';
    if (requestCountEl) requestCountEl.textContent = '0 requests';
    if (orderCountEl) orderCountEl.textContent = '0 orders';
    
    // Try to load each count independently - if one fails, others still work
    try {
        const postsSnapshot = await db.collection('posts')
            .where('userId', '==', userId)
            .where('status', '==', 'approved')
            .get();
        if (postCountEl) postCountEl.textContent = `${postsSnapshot.size} posts`;
    } catch (e) {
        // Collection might not exist or no permission - keep default
        console.log('Posts count not available');
    }
    
    try {
        const savedSnapshot = await db.collection('savedItems')
            .where('userId', '==', userId)
            .get();
        if (savedCountEl) savedCountEl.textContent = `${savedSnapshot.size} saved`;
    } catch (e) {
        console.log('Saved items count not available');
    }
    
    try {
        const requestsSnapshot = await db.collection('requests')
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .get();
        if (requestCountEl) requestCountEl.textContent = `${requestsSnapshot.size} requests`;
    } catch (e) {
        console.log('Requests count not available');
    }
    
    // This is the one that's failing - wrap it in try/catch
    try {
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .get();
        if (orderCountEl) orderCountEl.textContent = `${ordersSnapshot.size} orders`;
    } catch (e) {
        // Keep default "0 orders" - no error thrown
        console.log('Orders count not available');
    }
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
            const username = user.username || user.handle || 'username';
            const communityId = user.community || 'kwamankese';
            const community = COMMUNITIES.find(c => c.id === communityId) || COMMUNITIES[0];
            const role = user.role || 'resident';
            
            document.getElementById('userFullName').textContent = name;
            document.getElementById('userUsername').textContent = `@${username}`;
            document.getElementById('userCommunity').textContent = community.label;
            document.getElementById('userDistrict').textContent = community.district;
            document.getElementById('userRole').textContent = getRoleDisplayName(role);
            
            document.getElementById('communityName').textContent = community.label;
            document.getElementById('communityDistrict').textContent = community.district;
            document.getElementById('communityRegion').textContent = community.region;
            
            const avatar = document.getElementById('userAvatar');
            if (user.photoURL) {
                avatar.src = user.photoURL;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003f87&color=fff&size=200`;
            }
            
            const mobileAvatar = document.getElementById('profileImage');
            if (mobileAvatar) {
                if (user.photoURL) {
                    mobileAvatar.src = user.photoURL;
                } else {
                    mobileAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=003f87&color=fff&size=200`;
                }
            }
            
            const locationText = document.getElementById('locationText');
            if (locationText) locationText.textContent = community.label;
            
            return { user, community };
        } catch (e) {
            console.warn('Failed to parse user data:', e);
            return null;
        }
    }
    return null;
}

// =============================================
// RENDER WORKSPACES
// =============================================

function renderWorkspaces(userRole) {
    const container = document.getElementById('workspacesContainer');
    if (!container) return;
    
    const accessibleWorkspaces = getWorkspaceAccess(userRole || 'resident');
    const activeId = userRole || 'resident';
    
    container.innerHTML = accessibleWorkspaces.map(ws => {
        const isActive = ws.id === activeId || (ws.id === 'resident' && !accessibleWorkspaces.find(w => w.id === activeId));
        return `
            <div class="workspace-card bg-white p-4 rounded-xl card-shadow border-2 ${isActive ? 'border-secondary active' : 'border-transparent'} relative" onclick="switchWorkspace('${ws.id}')">
                ${isActive ? `<div class="absolute top-2 right-2 text-secondary check-badge"><i class="fa-solid fa-check-circle text-lg"></i></div>` : ''}
                <div class="w-12 h-12 flex items-center justify-center ${ws.color} rounded-full mx-auto mb-3">
                    <i class="fa-solid ${ws.icon} text-2xl"></i>
                </div>
                <p class="text-center text-sm font-semibold text-gray-900 mb-0.5">${ws.label}</p>
                <p class="text-[10px] text-center text-gray-500 leading-tight">${ws.description}</p>
            </div>
        `;
    }).join('');
}

function switchWorkspace(workspaceId) {
    const ws = WORKSPACES.find(w => w.id === workspaceId);
    if (!ws) return;
    
    if (ws.requiredRole && currentUserData) {
        const userRole = currentUserData.role || 'resident';
        if (userRole !== ws.requiredRole && userRole !== 'platform_owner' && userRole !== 'owner') {
            showToast(`You don't have access to "${ws.label}" workspace`, 'error');
            return;
        }
    }
    
    showToast(`Switched to ${ws.label} workspace ✅`, 'success');
    renderWorkspaces(workspaceId);
    
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).update({
            activeWorkspace: workspaceId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err => console.warn('Error updating workspace:', err));
    }
}

// =============================================
// SETTINGS TOGGLE
// =============================================

function toggleSettings(sectionId) {
    const content = document.getElementById(`settings-${sectionId}`);
    if (!content) return;
    
    const arrow = document.querySelector(`.settings-arrow[data-target="${sectionId}"]`);
    
    if (content.classList.contains('hidden')) {
        document.querySelectorAll('[id^="settings-"]').forEach(el => {
            if (el.id !== `settings-${sectionId}`) {
                el.classList.add('hidden');
                const otherArrow = document.querySelector(`.settings-arrow[data-target="${el.id.replace('settings-', '')}"]`);
                if (otherArrow) {
                    otherArrow.className = 'fa-solid fa-chevron-right text-gray-400 text-sm settings-arrow';
                }
            }
        });
        
        content.classList.remove('hidden');
        if (arrow) {
            arrow.className = 'fa-solid fa-chevron-down text-primary text-sm settings-arrow';
        }
    } else {
        content.classList.add('hidden');
        if (arrow) {
            arrow.className = 'fa-solid fa-chevron-right text-gray-400 text-sm settings-arrow';
        }
    }
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
                
                await loadUserActivityCounts(user.uid);
                
                document.getElementById('loadingState').classList.add('hidden');
                document.getElementById('profileData').classList.remove('hidden');
                
                const role = userData.role || 'resident';
                renderWorkspaces(role);
                
                initCloudinaryWidget();
                
                const firstName = (userData.fullName || userData.name || 'User').split(' ')[0];
                showToast(`Welcome back, ${firstName}! 👋`, 'success');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            document.getElementById('loadingState').classList.add('hidden');
            document.getElementById('profileData').classList.remove('hidden');
            renderWorkspaces('resident');
            
            if (user) {
                await loadUserActivityCounts(user.uid);
            }
        }
    });
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    document.getElementById('editProfileBtn')?.addEventListener('click', function() {
        openEditProfileModal();
    });
    
    document.getElementById('changePhotoBtn')?.addEventListener('click', function() {
        if (cloudinaryWidget) {
            cloudinaryWidget.open();
        } else {
            showToast('Photo upload is not available', 'error');
        }
    });
    
    document.getElementById('changeCommunityBtn')?.addEventListener('click', function() {
        openChangeCommunityModal();
    });
    
    document.getElementById('switchWorkspaceBtn')?.addEventListener('click', function() {
        showToast('Opening workspace switcher...', 'info');
    });
    
    document.getElementById('notificationBtn')?.addEventListener('click', function() {
        window.location.href = 'notifications.html';
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            auth.signOut().then(() => {
                localStorage.removeItem('bridgeconnect_user');
                localStorage.removeItem('bridgeconnect_active_context');
                window.location.href = '../login.html';
            }).catch(err => {
                showToast('Error logging out: ' + err.message, 'error');
            });
        }
    });
    
    document.getElementById('profileImage')?.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    setupEventListeners();
    
    window.switchWorkspace = switchWorkspace;
    window.showToast = showToast;
    window.toggleSettings = toggleSettings;
    window.openEditProfileModal = openEditProfileModal;
    window.openChangeCommunityModal = openChangeCommunityModal;
    
    console.log('✅ BridgeConnect Profile page initialized');
});