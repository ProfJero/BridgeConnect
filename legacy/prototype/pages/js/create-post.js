// =============================================
// CREATE POST PAGE JAVASCRIPT - WITH FIRESTORE
// =============================================

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let currentUserData = null;
let selectedPostType = null;
let selectedImageFile = null;
let imageUploading = false;

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
// POST TYPES
// =============================================
const POST_TYPES = [
    {
        id: 'community',
        icon: 'fa-comments',
        label: 'Community Post',
        description: 'Share updates, questions, or recommendations',
        color: 'bg-secondary/10 text-secondary',
        borderColor: 'hover:border-secondary'
    },
    {
        id: 'request',
        icon: 'fa-circle-question',
        label: 'Request Something',
        description: 'Ask your community for help',
        color: 'bg-primary/10 text-primary',
        borderColor: 'hover:border-primary'
    },
    {
        id: 'business',
        icon: 'fa-store',
        label: 'Request a Business',
        description: 'Suggest a local business to be listed',
        color: 'bg-purple-100 text-purple-700',
        borderColor: 'hover:border-purple-600'
    },
    {
        id: 'organization',
        icon: 'fa-building',
        label: 'Request an Organisation',
        description: 'Suggest an organisation to be added',
        color: 'bg-orange-100 text-orange-600',
        borderColor: 'hover:border-orange-500'
    },
    {
        id: 'ngo',
        icon: 'fa-hand-holding-heart',
        label: 'Request an NGO',
        description: 'Suggest a non-profit in your area',
        color: 'bg-pink-100 text-pink-600',
        borderColor: 'hover:border-pink-500'
    },
    {
        id: 'school',
        icon: 'fa-graduation-cap',
        label: 'Request a School',
        description: 'Suggest a school or training centre',
        color: 'bg-teal-100 text-teal-700',
        borderColor: 'hover:border-teal-500'
    },
    {
        id: 'health',
        icon: 'fa-heart-pulse',
        label: 'Request a Health Resource',
        description: 'Suggest a health facility or service',
        color: 'bg-cyan-100 text-cyan-700',
        borderColor: 'hover:border-cyan-500'
    },
    {
        id: 'service',
        icon: 'fa-tools',
        label: 'Request a Service',
        description: 'Suggest a local service provider',
        color: 'bg-blue-100 text-blue-700',
        borderColor: 'hover:border-blue-500'
    },
    {
        id: 'product',
        icon: 'fa-bag-shopping',
        label: 'Request a Product',
        description: 'Suggest a product available locally',
        color: 'bg-yellow-100 text-yellow-700',
        borderColor: 'hover:border-yellow-500'
    },
    {
        id: 'announcement',
        icon: 'fa-bullhorn',
        label: 'Submit an Announcement',
        description: 'Submit a community announcement for review',
        color: 'bg-indigo-100 text-indigo-700',
        borderColor: 'hover:border-indigo-500'
    }
];

// =============================================
// COMMUNITIES
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
    
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'create-post.html';
    const isPostPage = currentPage === 'create-post.html';
    
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
        
        // NO active state for create post page
        
        newItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetPage = page === 'home' ? 'home.html' : page + '.html';
            const currentPageName = window.location.pathname.split('/').pop() || 'home.html';
            
            if (currentPageName === targetPage) {
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
            // Already on create post page
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    <a class="nav-item" href="profile.html"><i class="fa-regular fa-user nav-icon"></i><span class="nav-label">Profile</span></a>
                </nav>
            </div>
            `;
            setupNavItemListeners();
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
                const community = COMMUNITIES.find(c => c.id === user.community) || COMMUNITIES[0];
                document.getElementById('postCommunity').textContent = community.label;
                document.getElementById('postDistrict').textContent = community.district;
            }
        } catch (e) {
            console.warn('Failed to parse user data:', e);
        }
    }
}

// =============================================
// RENDER POST TYPES
// =============================================

function renderPostTypes() {
    const container = document.getElementById('postTypesContainer');
    if (!container) return;
    
    container.innerHTML = POST_TYPES.map(type => `
        <div class="post-card bg-white p-4 rounded-xl border-2 border-gray-200 ${type.borderColor} hover:shadow-md transition-all cursor-pointer flex items-start gap-3" data-type="${type.id}" onclick="selectPostType('${type.id}')">
            <div class="w-10 h-10 ${type.color} rounded-lg flex items-center justify-center flex-shrink-0">
                <i class="fa-solid ${type.icon} text-lg"></i>
            </div>
            <div class="flex-grow min-w-0">
                <h4 class="font-semibold text-gray-900 text-sm">${type.label}</h4>
                <p class="text-xs text-gray-500 line-clamp-1">${type.description}</p>
            </div>
            <i class="fa-solid fa-chevron-right text-gray-300 text-sm self-center"></i>
        </div>
    `).join('');
}

// =============================================
// SELECT POST TYPE
// =============================================

function selectPostType(typeId) {
    selectedPostType = POST_TYPES.find(t => t.id === typeId);
    if (!selectedPostType) return;
    
    // Update UI
    document.querySelectorAll('.post-card').forEach(card => {
        card.classList.remove('border-secondary', 'border-primary', 'border-purple-600', 'border-orange-500', 'border-pink-500', 'border-teal-500', 'border-cyan-500', 'border-blue-500', 'border-yellow-500', 'border-indigo-500');
        card.classList.add('border-gray-200');
    });
    
    const selectedCard = document.querySelector(`.post-card[data-type="${typeId}"]`);
    if (selectedCard) {
        selectedCard.classList.remove('border-gray-200');
        selectedCard.classList.add('border-secondary');
    }
    
    // Show form
    const formSection = document.getElementById('postFormSection');
    formSection.classList.remove('hidden');
    document.getElementById('postFormTitle').textContent = `Create a ${selectedPostType.label}`;
    
    // Scroll to form
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// =============================================
// IMAGE UPLOAD
// =============================================

function setupImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('imageInput');
    const previewContainer = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeBtn = document.getElementById('removeImageBtn');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleImageFile(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleImageFile(e.target.files[0]);
        }
    });
    
    removeBtn.addEventListener('click', () => {
        selectedImageFile = null;
        previewContainer.classList.add('hidden');
        previewImg.src = '';
        fileInput.value = '';
    });
}

function handleImageFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image must be less than 5MB', 'error');
        return;
    }
    
    selectedImageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const previewImg = document.getElementById('previewImg');
        const previewContainer = document.getElementById('imagePreview');
        previewImg.src = e.target.result;
        previewContainer.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// =============================================
// SUBMIT POST
// =============================================

async function submitPost() {
    if (!currentUser) {
        showToast('Please sign in to create a post', 'error');
        return;
    }
    
    if (!selectedPostType) {
        showToast('Please select a post type', 'error');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const description = document.getElementById('postDescription').value.trim();
    
    if (!title) {
        showToast('Please enter a title', 'error');
        document.getElementById('postTitle').focus();
        return;
    }
    
    if (!description) {
        showToast('Please enter a description', 'error');
        document.getElementById('postDescription').focus();
        return;
    }
    
    const submitBtn = document.getElementById('submitPostBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    
    try {
        let imageUrl = null;
        
        // Upload image if selected
        if (selectedImageFile) {
            imageUploading = true;
            const storageRef = storage.ref(`posts/${Date.now()}_${selectedImageFile.name}`);
            const snapshot = await storageRef.put(selectedImageFile);
            imageUrl = await snapshot.ref.getDownloadURL();
            imageUploading = false;
        }
        
        // Get community
        const communityId = currentUserData?.community || 'kwamankese';
        
        // Create post data
        const postData = {
            title: title,
            description: description,
            type: selectedPostType.id,
            typeLabel: selectedPostType.label,
            userId: currentUser.uid,
            authorName: currentUserData?.fullName || currentUserData?.name || 'User',
            authorPhoto: currentUserData?.photoURL || null,
            community: communityId,
            status: 'pending', // Needs approval
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            likes: 0,
            comments: 0,
            image: imageUrl
        };
        
        // Save to Firestore
        await db.collection('posts').add(postData);
        
        showToast('✅ Post submitted successfully! It will be reviewed shortly.', 'success');
        
        // Reset form
        resetForm();
        
    } catch (error) {
        console.error('Error submitting post:', error);
        showToast('Failed to submit post: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Submit Post';
    }
}

function resetForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postDescription').value = '';
    document.getElementById('postFormSection').classList.add('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('previewImg').src = '';
    document.getElementById('imageInput').value = '';
    selectedImageFile = null;
    selectedPostType = null;
    
    document.querySelectorAll('.post-card').forEach(card => {
        card.classList.remove('border-secondary', 'border-primary', 'border-purple-600', 'border-orange-500', 'border-pink-500', 'border-teal-500', 'border-cyan-500', 'border-blue-500', 'border-yellow-500', 'border-indigo-500');
        card.classList.add('border-gray-200');
    });
}

// =============================================
// CHANGE COMMUNITY MODAL
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
            
            document.getElementById('postCommunity').textContent = community.label;
            document.getElementById('postDistrict').textContent = community.district;
            
            showToast(`Switched to ${community.label} 🏘️`, 'success');
        } catch (error) {
            console.error('Error updating community:', error);
            showToast('Failed to update community', 'error');
            return false;
        }
    });
}

// =============================================
// CREATE MODAL
// =============================================

function createModal(title, content, submitText, onSubmit) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modalHTML = `
        <div class="modal-overlay" id="postModal">
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
    
    const modal = document.getElementById('postModal');
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
            const modalEl = document.getElementById('postModal');
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
                renderPostTypes();
                setupImageUpload();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            loadUserProfile();
            renderPostTypes();
            setupImageUpload();
        }
    });
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Submit Post
    document.getElementById('submitPostBtn')?.addEventListener('click', submitPost);
    
    // Cancel Post
    document.getElementById('cancelPostBtn')?.addEventListener('click', resetForm);
    
    // Change Community
    document.getElementById('changeCommunityBtn')?.addEventListener('click', openChangeCommunityModal);
    
    // Make Request
    document.getElementById('makeRequestBtn')?.addEventListener('click', function() {
        // Find and select the request type
        const requestType = POST_TYPES.find(t => t.id === 'request');
        if (requestType) {
            selectPostType('request');
        }
    });
    
    // Notification Bell
    document.getElementById('notificationBtn')?.addEventListener('click', function() {
        window.location.href = 'notifications.html';
    });
    
    // Profile image click
    document.getElementById('profileImage')?.addEventListener('click', function() {
        window.location.href = 'profile.html';
    });
}

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
    setupAuthListener();
    setupEventListeners();
    
    // Expose functions globally
    window.selectPostType = selectPostType;
    window.showToast = showToast;
    window.openChangeCommunityModal = openChangeCommunityModal;
    
    console.log('✅ BridgeConnect Create Post page initialized');
});