// ============================================
// ADMIN PROFILE PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let currentUserId = null;
let userProfileData = null;
let isSidebarRendered = false;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'suspended': 'status-suspended',
        'pending': 'status-pending',
        'inactive': 'status-inactive'
    };
    return statusMap[status] || 'status-inactive';
}

function getRoleLabel(role) {
    const labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'community_moderator': 'Community Moderator',
        'moderator': 'Community Moderator',
        'business_owner': 'Business Owner',
        'organization': 'Organization',
        'verified_org': 'Verified Organization',
        'resident': 'Resident'
    };
    return labels[role] || role || 'User';
}

function getRoleIcon(role) {
    const icons = {
        'platform_owner': 'fa-globe',
        'owner': 'fa-globe',
        'district_admin': 'fa-building',
        'community_moderator': 'fa-people-group',
        'moderator': 'fa-people-group',
        'business_owner': 'fa-store',
        'organization': 'fa-building-columns',
        'verified_org': 'fa-building-columns',
        'resident': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

function getUserType(user) {
    const role = user.role || 'resident';
    if (role === 'business_owner') return 'business';
    if (role === 'organization' || role === 'verified_org') return 'organization';
    if (role === 'community_moderator' || role === 'moderator') return 'moderator';
    if (role === 'district_admin') return 'district_admin';
    if (role === 'platform_owner' || role === 'owner') return 'platform_owner';
    return 'resident';
}

function getVerificationBadges(user) {
    const badges = [];
    const type = getUserType(user);
    const isVerified = user.isVerified || false;
    const verificationLevel = user.verificationLevel || 'none';
    
    // Role-based badges
    if (type === 'business') {
        if (isVerified && verificationLevel === 'verified_business') {
            badges.push({
                icon: 'fa-store',
                label: 'Verified Business',
                color: 'badge-verified-business'
            });
        }
        if (user.trustedSeller) {
            badges.push({
                icon: 'fa-star',
                label: 'Trusted Seller',
                color: 'badge-trusted-seller'
            });
        }
    } else if (type === 'organization' || type === 'verified_org') {
        if (isVerified) {
            if (verificationLevel === 'government') {
                badges.push({
                    icon: 'fa-landmark',
                    label: 'Government Office',
                    color: 'badge-government-office'
                });
            } else {
                badges.push({
                    icon: 'fa-building',
                    label: 'Verified Organization',
                    color: 'badge-verified-organization'
                });
            }
        }
    } else if (type === 'moderator' || type === 'community_moderator') {
        badges.push({
            icon: 'fa-users',
            label: 'Community Leader',
            color: 'badge-community-leader'
        });
    } else if (type === 'district_admin') {
        badges.push({
            icon: 'fa-building',
            label: 'District Administrator',
            color: 'badge-government-office'
        });
    }
    
    return badges;
}

function timeAgo(date) {
    if (!date) return 'Recently';
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
}

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount) {
    return `GHC ${(amount || 0).toFixed(2)}`;
}

// ============================================
// SIDEBAR - Using context-based system
// ============================================
function loadSidebar() {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    
    function renderSidebar() {
        if (typeof contextManager === 'undefined' || !contextManager.isInitialized) {
            setTimeout(renderSidebar, 200);
            return;
        }
        
        const activeContext = contextManager.getActiveContext();
        const menuItems = contextManager.getMenuItems();
        const hasMultipleContexts = contextManager.hasMultipleContexts();
        
        let sidebarHTML = `
        <aside id="adminSidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30 overflow-y-auto transition-all duration-300 relative">
            <button class="sidebar-toggle-btn absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center hover:bg-gray-50 transition-all z-40" id="sidebarToggleBtn" title="Toggle Sidebar">
                <i class="fa-solid fa-chevron-left text-gray-600 text-xs"></i>
            </button>

            <div class="sidebar-logo p-4 pb-3 flex items-center gap-3 border-b border-gray-200/50 flex-shrink-0">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <i class="fa-solid fa-users text-xl"></i>
                </div>
                <div class="logo-text transition-all duration-300 overflow-hidden">
                    <h1 class="text-lg font-bold text-blue-600 leading-tight">BridgeConnect</h1>
                    <p class="text-[10px] text-gray-500">${activeContext?.label || 'Admin Portal'}</p>
                </div>
            </div>
            
            ${hasMultipleContexts ? `
            <div class="context-switcher px-3 py-2 border-b border-gray-200/50">
                <button class="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors" id="contextSwitcherBtn">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-arrows-rotate text-blue-600 text-xs"></i>
                        <span class="text-xs font-medium text-blue-700">Switch Workspace</span>
                    </div>
                    <i class="fa-solid fa-chevron-right text-blue-600 text-xs"></i>
                </button>
            </div>
            ` : ''}
            
            <div class="sidebar-dbi p-2.5 mx-3 my-2 bg-gray-50 rounded-lg border border-gray-200/50 flex items-center gap-2 flex-shrink-0 transition-all duration-300">
                <div class="w-5 h-5 bg-blue-600 rounded text-white flex items-center justify-center text-[8px] font-bold shrink-0">DBI</div>
                <div class="dbi-text text-[10px] text-gray-500 transition-all duration-300 overflow-hidden whitespace-nowrap">
                    Powered by <br/><span class="font-semibold text-gray-800">Digital Bridge Initiative</span>
                </div>
            </div>
            
            <nav class="sidebar-nav flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        `;
        
        menuItems.forEach(item => {
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop() || 'user-profile.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'users' && currentPage === 'user-profile.html');
            
            sidebarHTML += `
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group ${isActive ? 'active' : ''}" 
                   href="${item.page}.html" 
                   data-page="${item.page}"
                   style="${isActive ? 'background-color: #2563eb; color: white; font-weight: 600;' : ''}">
                    <i class="fa-solid ${item.icon} w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">${item.label}</span>
                </a>
            `;
        });
        
        sidebarHTML += `
                <div class="my-2 border-t border-gray-200/50"></div>
                <a class="sidebar-link flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="#" data-page="notifications">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-bell w-5 text-center text-sm"></i>
                        <span class="link-text transition-all duration-300">Notifications</span>
                    </div>
                    <span class="notif-badge bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">12</span>
                </a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="#" data-page="support">
                    <i class="fa-solid fa-circle-question w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">Support</span>
                </a>
            </nav>
            
            <div class="sidebar-footer p-3 border-t border-gray-200/50 flex-shrink-0">
                <a id="logoutBtn" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 font-medium text-sm transition-all cursor-pointer group">
                    <i class="fa-solid fa-right-from-bracket w-5 text-center text-sm group-hover:rotate-12 transition-transform"></i>
                    <span class="link-text transition-all duration-300">Logout</span>
                </a>
            </div>
        </aside>
        `;
        
        container.innerHTML = sidebarHTML;
        isSidebarRendered = true;
        initSidebarInteractions();
        initContextSwitcher();
        updateHeader();
    }
    
    renderSidebar();
}

// ============================================
// SIDEBAR INTERACTIONS
// ============================================
function initSidebarInteractions() {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    const toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
        let isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            toggleBtn.querySelector('i').className = 'fa-solid fa-chevron-right text-gray-600 text-xs';
        }

        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            const collapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('adminSidebarCollapsed', collapsed);
            const icon = this.querySelector('i');
            if (collapsed) {
                icon.className = 'fa-solid fa-chevron-right text-gray-600 text-xs';
            } else {
                icon.className = 'fa-solid fa-chevron-left text-gray-600 text-xs';
            }
        });
    }

    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebarContainer = document.getElementById('sidebarContainer');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (menuBtn && sidebarContainer && overlay) {
        menuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebarContainer.classList.toggle('mobile-open');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebarContainer.classList.contains('mobile-open') ? 'hidden' : '';
        });
        
        overlay.addEventListener('click', function() {
            sidebarContainer.classList.remove('mobile-open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebarContainer) sidebarContainer.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                if (typeof auth !== 'undefined' && auth.signOut) {
                    auth.signOut().then(() => {
                        localStorage.removeItem('bridgeconnect_user');
                        localStorage.removeItem('bridgeconnect_active_context');
                        window.location.href = '../login.html';
                    }).catch(err => {
                        showToast('Error logging out: ' + err.message, 'error');
                    });
                }
            }
        });
    }
}

function initContextSwitcher() {
    const switcherBtn = document.getElementById('contextSwitcherBtn');
    if (!switcherBtn) return;
    
    switcherBtn.addEventListener('click', function() {
        window.location.href = 'workspace-selector.html';
    });
}

// ============================================
// UPDATE HEADER
// ============================================
function updateHeader() {
    if (typeof contextManager === 'undefined' || !contextManager.isInitialized) return;
    
    const userData = contextManager.userData;
    if (!userData) return;
    
    const fullName = userData.fullName || 'User';
    document.getElementById('headerUserName').textContent = fullName;
    
    const activeContext = contextManager.getActiveContext();
    if (activeContext) {
        document.getElementById('headerUserRole').textContent = getRoleLabel(activeContext.type);
    }
    
    const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0052cc&color=fff&size=40`;
    document.getElementById('desktopUserAvatar').src = avatarUrl;
    document.getElementById('mobileUserAvatar').src = avatarUrl;
}

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    if (typeof auth === 'undefined' || !auth) {
        console.warn('Firebase auth not available');
        return;
    }
    
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        try {
            if (typeof contextManager !== 'undefined' && !contextManager.isInitialized) {
                const initialized = await contextManager.initialize(user);
                if (!initialized) {
                    showToast('Error loading user data', 'error');
                    return;
                }
                
                loadSidebar();
                loadUserProfile();
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD USER PROFILE FROM FIRESTORE
// ============================================
async function loadUserProfile() {
    const loadingState = document.getElementById('loadingState');
    const profileData = document.getElementById('profileData');
    
    try {
        // Get user ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        
        if (!userId) {
            showToast('No user ID provided', 'error');
            loadingState.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-exclamation-circle text-3xl text-red-500"></i>
                    <p class="mt-4 text-on-surface-variant">No user ID provided</p>
                    <a href="users.html" class="mt-2 text-primary hover:underline">Return to Users</a>
                </div>
            `;
            return;
        }
        
        currentUserId = userId;
        
        // Fetch user data from Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
            showToast('User not found', 'error');
            loadingState.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-user-slash text-3xl text-red-500"></i>
                    <p class="mt-4 text-on-surface-variant">User not found</p>
                    <a href="users.html" class="mt-2 text-primary hover:underline">Return to Users</a>
                </div>
            `;
            return;
        }
        
        userProfileData = { id: userDoc.id, ...userDoc.data() };
        
        // Hide loading, show profile
        loadingState.classList.add('hidden');
        profileData.classList.remove('hidden');
        
        // Render all sections
        renderUserSummary(userProfileData);
        renderPersonalInfo(userProfileData);
        renderContactInfo(userProfileData);
        renderRoles(userProfileData);
        renderVerificationStatus(userProfileData);
        renderLocationInfo(userProfileData);
        renderBusinesses(userProfileData);
        renderOrders(userProfileData);
        renderReviews(userProfileData);
        renderReports(userProfileData);
        renderActivities(userProfileData);
        
        // Update breadcrumb and title
        document.getElementById('breadcrumbUserName').textContent = userProfileData.fullName || 'User';
        document.getElementById('pageTitle').textContent = `${userProfileData.fullName || 'User'} - User Profile`;
        
        console.log('✅ User profile loaded:', userProfileData);
        
    } catch (error) {
        console.error('Error loading user profile:', error);
        showToast('Error loading user profile: ' + error.message, 'error');
        loadingState.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                <p class="mt-4 text-on-surface-variant">Failed to load user profile</p>
                <p class="text-xs text-outline mt-1">${error.message}</p>
                <a href="users.html" class="mt-4 inline-block text-primary hover:underline">Return to Users</a>
            </div>
        `;
    }
}

// ============================================
// RENDER: USER SUMMARY
// ============================================
function renderUserSummary(user) {
    const name = user.fullName || 'Unknown User';
    const initials = getInitials(name);
    const status = user.status || 'inactive';
    const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=128`;
    
    // Avatar
    const avatarEl = document.getElementById('profileAvatar');
    avatarEl.style.backgroundImage = `url(${avatarUrl})`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.textContent = '';
    
    // Name
    document.getElementById('profileFullName').textContent = name;
    
    // Status badge
    const statusBadge = document.getElementById('statusBadge');
    const statusColors = {
        'active': 'bg-green-50 text-green-700 border-green-200',
        'suspended': 'bg-red-50 text-red-700 border-red-200',
        'pending': 'bg-orange-50 text-orange-700 border-orange-200',
        'inactive': 'bg-gray-50 text-gray-700 border-gray-200'
    };
    statusBadge.className = `absolute top-4 right-4 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border ${statusColors[status] || statusColors.inactive}`;
    document.getElementById('statusText').textContent = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Badges
    const badges = getVerificationBadges(user);
    const badgesContainer = document.getElementById('badgesContainer');
    if (badges.length > 0) {
        badgesContainer.innerHTML = badges.map(b => `
            <span class="text-[9px] font-semibold px-2 py-0.5 rounded-full border ${b.color} flex items-center gap-1">
                <i class="fas ${b.icon} text-[8px]"></i> ${b.label}
            </span>
        `).join('');
    } else {
        badgesContainer.innerHTML = `<span class="text-[9px] text-outline">No badges</span>`;
    }
    
    // User ID
    const userId = user.id || user.uid || 'N/A';
    document.getElementById('userIdDisplay').textContent = `User ID: ${userId.substring(0, 12)}`;
    
    // Member since
    const joinedDate = user.createdAt ? formatDate(user.createdAt) : 'N/A';
    document.getElementById('memberSince').textContent = `Member since ${joinedDate}`;
}

// ============================================
// RENDER: PERSONAL INFO
// ============================================
function renderPersonalInfo(user) {
    const container = document.getElementById('personalInfo');
    const gender = user.gender || 'Not specified';
    const dob = user.dateOfBirth || 'N/A';
    const nationality = user.nationality || 'Ghanaian';
    
    container.innerHTML = `
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Full Name</p>
            <p class="text-xs font-medium text-on-surface">${user.fullName || 'N/A'}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Date of Birth</p>
            <p class="text-xs font-medium text-on-surface">${dob}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Gender</p>
            <p class="text-xs font-medium text-on-surface">${gender}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Nationality</p>
            <p class="text-xs font-medium text-on-surface">${nationality}</p>
        </div>
    `;
}

// ============================================
// RENDER: CONTACT INFO
// ============================================
function renderContactInfo(user) {
    const container = document.getElementById('contactInfo');
    const phone = user.mobile || user.phone || 'N/A';
    const email = user.email || 'N/A';
    const whatsapp = user.whatsapp || 'N/A';
    const address = user.address || 'N/A';
    
    container.innerHTML = `
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Phone Number</p>
            <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-on-surface">${phone}</p>
                <span class="text-[9px] text-green-600 bg-green-50 px-1 rounded flex items-center gap-1"><i class="fas fa-check-circle"></i> Verified</span>
            </div>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Email Address</p>
            <div class="flex items-center justify-between">
                <p class="text-xs font-medium text-on-surface">${email}</p>
                ${email !== 'N/A' ? '<span class="text-[9px] text-green-600 bg-green-50 px-1 rounded flex items-center gap-1"><i class="fas fa-check-circle"></i> Verified</span>' : ''}
            </div>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">WhatsApp</p>
            <p class="text-xs font-medium text-on-surface">${whatsapp}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Address</p>
            <p class="text-xs font-medium text-on-surface leading-relaxed">${address}</p>
        </div>
    `;
}

// ============================================
// RENDER: ROLES
// ============================================
function renderRoles(user) {
    const container = document.getElementById('rolesContainer');
    const role = user.role || 'resident';
    const roleLabel = getRoleLabel(role);
    const roleIcon = getRoleIcon(role);
    
    let html = `
        <div class="bg-blue-50 border border-blue-100 p-2 rounded-lg flex items-center gap-2">
            <i class="fas ${roleIcon} text-blue-600 text-xs"></i>
            <span class="text-[11px] font-medium text-blue-700">${roleLabel}</span>
        </div>
    `;
    
    // Additional roles from contexts
    if (user.contexts && user.contexts.length > 1) {
        user.contexts.forEach(context => {
            if (context.type !== role) {
                const ctxIcon = getRoleIcon(context.type);
                const ctxLabel = getRoleLabel(context.type);
                html += `
                    <div class="bg-gray-50 border border-gray-100 p-2 rounded-lg flex items-center gap-2">
                        <i class="fas ${ctxIcon} text-gray-400 text-xs"></i>
                        <span class="text-[11px] font-medium text-gray-600">${ctxLabel}</span>
                    </div>
                `;
            }
        });
    }
    
    container.innerHTML = html;
    const totalRoles = user.contexts ? user.contexts.length : 1;
    document.getElementById('viewAllRolesBtn').textContent = `View All Roles (${totalRoles})`;
}

// ============================================
// RENDER: VERIFICATION STATUS
// ============================================
function renderVerificationStatus(user) {
    const container = document.getElementById('verificationContainer');
    const type = getUserType(user);
    
    const verifications = [
        { icon: 'fa-envelope', label: 'Email Verified', verified: user.emailVerified !== false },
        { icon: 'fa-phone', label: 'Phone Verified', verified: user.phoneVerified !== false },
        { icon: 'fa-id-card', label: 'Identity Verified', verified: user.identityVerified || false },
        { icon: 'fa-home', label: 'Address Verified', verified: user.addressVerified || false }
    ];
    
    // Add business-specific verifications
    if (type === 'business') {
        verifications.push(
            { icon: 'fa-store', label: 'Business Verified', verified: user.businessVerified || false }
        );
        if (user.trustedSeller) {
            verifications.push(
                { icon: 'fa-star', label: 'Trusted Seller', verified: true }
            );
        }
    }
    
    // Add organization-specific verifications
    if (type === 'organization' || type === 'verified_org') {
        verifications.push(
            { icon: 'fa-building', label: 'Organization Verified', verified: user.orgVerified || false }
        );
    }
    
    container.innerHTML = verifications.map(v => `
        <div class="flex justify-between items-center text-[11px]">
            <div class="flex items-center gap-2 text-outline">
                <i class="fas ${v.icon}"></i> ${v.label}
            </div>
            <span class="${v.verified ? 'text-green-600' : 'text-orange-500'} font-semibold">${v.verified ? 'Verified' : 'Not Verified'}</span>
        </div>
    `).join('');
}

// ============================================
// RENDER: LOCATION INFO
// ============================================
function renderLocationInfo(user) {
    const container = document.getElementById('locationInfo');
    const community = user.community || user.communityName || 'N/A';
    const district = user.district || 'N/A';
    const region = user.region || 'N/A';
    const digitalAddress = user.digitalAddress || 'N/A';
    
    container.innerHTML = `
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Primary Community</p>
            <p class="text-xs font-medium text-on-surface">${community}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">District</p>
            <p class="text-xs font-medium text-on-surface">${district}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Region</p>
            <p class="text-xs font-medium text-on-surface">${region}</p>
        </div>
        <div>
            <p class="text-[10px] text-outline uppercase font-bold tracking-tight">Digital Address</p>
            <div class="flex items-center gap-2">
                <p class="text-xs font-medium text-on-surface">${digitalAddress}</p>
                <button class="copy-address-btn text-outline hover:text-on-surface transition-colors" data-address="${digitalAddress}">
                    <i class="fas fa-copy text-xs"></i>
                </button>
            </div>
        </div>
    `;
    
    container.querySelector('.copy-address-btn')?.addEventListener('click', function() {
        const address = this.dataset.address;
        if (address && address !== 'N/A') {
            navigator.clipboard?.writeText(address).then(() => {
                showToast('Digital address copied to clipboard!', 'success');
            }).catch(() => {
                const input = document.createElement('input');
                input.value = address;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                input.remove();
                showToast('Digital address copied!', 'success');
            });
        }
    });
}

// ============================================
// RENDER: BUSINESSES
// ============================================
async function renderBusinesses(user) {
    const container = document.getElementById('businessesContainer');
    const userId = user.id || user.uid;
    
    try {
        // Query businesses where ownerId matches user ID
        const businessesSnapshot = await db.collection('businesses')
            .where('ownerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (businessesSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center text-on-surface-variant text-sm py-4">
                    <i class="fas fa-store text-2xl block mb-2 opacity-30"></i>
                    No businesses owned
                </div>
            `;
            return;
        }
        
        let html = '';
        businessesSnapshot.forEach(doc => {
            const business = doc.data();
            const statusColor = business.status === 'approved' ? 'text-green-600 bg-green-50 border-green-200' : 
                               business.status === 'pending' ? 'text-orange-600 bg-orange-50 border-orange-200' : 
                               'text-red-600 bg-red-50 border-red-200';
            
            html += `
                <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer" onclick="showToast('Viewing ${business.name || 'business'}...', 'info')">
                    <div class="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center p-1 flex-shrink-0">
                        <i class="fas fa-store text-gray-400 text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-xs font-bold text-on-surface truncate">${business.name || 'Unnamed Business'}</p>
                            <span class="text-[8px] px-1.5 py-0.5 rounded border ${statusColor} font-medium">${business.status || 'Unknown'}</span>
                        </div>
                        <p class="text-[10px] text-outline">${business.category || 'General'}</p>
                        <p class="text-[10px] text-outline mt-0.5">${business.location || business.district || 'Location not set'}</p>
                        <p class="text-[9px] text-outline italic">${business.createdAt ? formatDate(business.createdAt) : 'Recently'}</p>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.warn('Error fetching businesses:', error);
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-exclamation-circle text-2xl block mb-2 opacity-30"></i>
                Unable to load businesses
            </div>
        `;
    }
}

// ============================================
// RENDER: ORDERS
// ============================================
async function renderOrders(user) {
    const container = document.getElementById('ordersContainer');
    const section = document.getElementById('ordersSection');
    const type = getUserType(user);
    
    // Only show orders for businesses and service providers
    if (type !== 'business' && type !== 'service_provider') {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    const userId = user.id || user.uid;
    
    try {
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (ordersSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center text-on-surface-variant text-sm py-4">
                    <i class="fas fa-box text-2xl block mb-2 opacity-30"></i>
                    No orders yet
                </div>
            `;
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('totalSpent').textContent = 'GHC 0.00';
            return;
        }
        
        let totalOrders = 0;
        let totalSpent = 0;
        let ordersHtml = '';
        
        ordersSnapshot.forEach(doc => {
            const order = doc.data();
            totalOrders++;
            totalSpent += order.amount || 0;
            
            const statusColors = {
                'pending': 'text-orange-600 bg-orange-50',
                'processing': 'text-blue-600 bg-blue-50',
                'delivered': 'text-green-600 bg-green-50',
                'completed': 'text-green-600 bg-green-50',
                'cancelled': 'text-red-600 bg-red-50'
            };
            const statusColor = statusColors[order.status] || 'text-gray-600 bg-gray-50';
            const orderDate = order.createdAt ? formatDate(order.createdAt) : 'N/A';
            
            ordersHtml += `
                <div class="flex items-center justify-between text-[11px] pb-2 border-b border-gray-50">
                    <span class="font-bold text-on-surface">#${order.orderId || 'ORD-' + doc.id.substring(0, 6)}</span>
                    <span class="text-outline">${orderDate}</span>
                    <span class="${statusColor} px-1.5 py-0.5 rounded text-[9px] font-bold">${order.status || 'Pending'}</span>
                    <span class="font-bold text-on-surface">${formatCurrency(order.amount || 0)}</span>
                </div>
            `;
        });
        
        container.innerHTML = ordersHtml;
        document.getElementById('totalOrders').textContent = totalOrders;
        document.getElementById('totalSpent').textContent = formatCurrency(totalSpent);
        
    } catch (error) {
        console.warn('Error fetching orders:', error);
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-exclamation-circle text-2xl block mb-2 opacity-30"></i>
                Unable to load orders
            </div>
        `;
    }
}

// ============================================
// RENDER: REVIEWS
// ============================================
async function renderReviews(user) {
    const container = document.getElementById('reviewsContainer');
    const section = document.getElementById('reviewsSection');
    const type = getUserType(user);
    
    // Only show reviews for businesses and service providers
    if (type !== 'business' && type !== 'service_provider') {
        section.classList.add('hidden');
        return;
    }
    
    section.classList.remove('hidden');
    const userId = user.id || user.uid;
    
    try {
        const reviewsSnapshot = await db.collection('reviews')
            .where('targetId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(3)
            .get();
        
        if (reviewsSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center text-on-surface-variant text-sm py-4">
                    <i class="fas fa-star text-2xl block mb-2 opacity-30"></i>
                    No reviews yet
                </div>
            `;
            return;
        }
        
        let totalRating = 0;
        let reviewCount = 0;
        let reviewsHtml = '';
        
        reviewsSnapshot.forEach(doc => {
            const review = doc.data();
            totalRating += review.rating || 0;
            reviewCount++;
            
            const stars = '★'.repeat(review.rating || 0) + '☆'.repeat(5 - (review.rating || 0));
            
            reviewsHtml += `
                <div class="flex items-start gap-3 p-2 border-b border-gray-50 last:border-0">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            ${(review.reviewerName || 'U').charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <p class="text-xs font-medium text-on-surface">${review.reviewerName || 'Anonymous'}</p>
                            <span class="text-[10px] text-yellow-500">${stars}</span>
                        </div>
                        <p class="text-[10px] text-outline">${review.comment || 'No comment'}</p>
                        <p class="text-[9px] text-outline">${review.createdAt ? timeAgo(review.createdAt.toDate()) : 'Recently'}</p>
                    </div>
                </div>
            `;
        });
        
        const averageRating = reviewCount > 0 ? (totalRating / reviewCount).toFixed(1) : 0;
        
        container.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-bold text-on-surface">${averageRating} ★</span>
                <span class="text-[10px] text-outline">${reviewCount} review${reviewCount > 1 ? 's' : ''}</span>
            </div>
            ${reviewsHtml}
        `;
        
    } catch (error) {
        console.warn('Error fetching reviews:', error);
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-exclamation-circle text-2xl block mb-2 opacity-30"></i>
                Unable to load reviews
            </div>
        `;
    }
}

// ============================================
// RENDER: REPORTS
// ============================================
async function renderReports(user) {
    const container = document.getElementById('reportsContainer');
    const userId = user.id || user.uid;
    
    try {
        const reportsSnapshot = await db.collection('reports')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        if (reportsSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center text-on-surface-variant text-sm py-4">
                    <i class="fas fa-file-alt text-2xl block mb-2 opacity-30"></i>
                    No reports submitted
                </div>
            `;
            return;
        }
        
        let reportsHtml = '';
        reportsSnapshot.forEach(doc => {
            const report = doc.data();
            const reportDate = report.createdAt ? formatDate(report.createdAt) : 'N/A';
            const statusColors = {
                'pending': 'text-orange-600 bg-orange-50',
                'under_review': 'text-blue-600 bg-blue-50',
                'resolved': 'text-green-600 bg-green-50',
                'rejected': 'text-red-600 bg-red-50'
            };
            const statusColor = statusColors[report.status] || 'text-gray-600 bg-gray-50';
            
            reportsHtml += `
                <div class="flex items-center justify-between text-[10px] py-1 border-b border-gray-50 last:border-0">
                    <span class="font-bold text-on-surface">#${report.reportId || doc.id.substring(0, 8)}</span>
                    <span class="text-outline">${report.type || 'General'}</span>
                    <span class="text-outline">${reportDate}</span>
                    <span class="${statusColor} px-1 rounded font-medium">${report.status || 'Pending'}</span>
                </div>
            `;
        });
        
        container.innerHTML = reportsHtml;
        
    } catch (error) {
        console.warn('Error fetching reports:', error);
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-exclamation-circle text-2xl block mb-2 opacity-30"></i>
                Unable to load reports
            </div>
        `;
    }
}

// ============================================
// RENDER: ACTIVITIES - Using user data instead of activities collection
// ============================================
function renderActivities(user) {
    const container = document.getElementById('activityContainer');
    const userId = user.id || user.uid;
    
    // Build activities from available user data
    const activities = [];
    
    // 1. Account creation
    if (user.createdAt) {
        activities.push({
            type: 'profile',
            icon: 'fa-user-plus',
            color: 'bg-green-50 text-green-600',
            title: 'Account Created',
            description: `${user.fullName || 'User'} joined BridgeConnect`,
            time: user.createdAt.toDate ? timeAgo(user.createdAt.toDate()) : 'Recently'
        });
    }
    
    // 2. Profile update (if there's a lastUpdated timestamp)
    if (user.updatedAt && user.createdAt) {
        const createdTime = user.createdAt.toDate ? user.createdAt.toDate().getTime() : 0;
        const updatedTime = user.updatedAt.toDate ? user.updatedAt.toDate().getTime() : 0;
        if (updatedTime > createdTime) {
            activities.push({
                type: 'profile',
                icon: 'fa-user-edit',
                color: 'bg-blue-50 text-blue-600',
                title: 'Profile Updated',
                description: 'User updated their profile information',
                time: user.updatedAt.toDate ? timeAgo(user.updatedAt.toDate()) : 'Recently'
            });
        }
    }
    
    // 3. If user has businesses
    if (user.businesses && user.businesses.length > 0) {
        activities.push({
            type: 'business',
            icon: 'fa-store',
            color: 'bg-purple-50 text-purple-600',
            title: 'Business Owner',
            description: `Owns ${user.businesses.length} business(es)`,
            time: 'Active'
        });
    }
    
    // 4. If user is verified
    if (user.isVerified) {
        activities.push({
            type: 'verification',
            icon: 'fa-check-circle',
            color: 'bg-emerald-50 text-emerald-600',
            title: 'Account Verified',
            description: 'User has completed verification',
            time: 'Verified'
        });
    }
    
    // 5. If user has trusted seller status
    if (user.trustedSeller) {
        activities.push({
            type: 'trusted',
            icon: 'fa-star',
            color: 'bg-yellow-50 text-yellow-600',
            title: 'Trusted Seller',
            description: 'Earned trusted seller status',
            time: 'Active'
        });
    }
    
    // If no activities, show message
    if (activities.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-8">
                <i class="fas fa-clock text-2xl block mb-2 opacity-30"></i>
                No recent activity
            </div>
        `;
        return;
    }
    
    // Sort activities by time (most recent first)
    activities.sort((a, b) => {
        const timeOrder = { 'Just now': 0, 'Recently': 1, 'Active': 2, 'Verified': 3 };
        return (timeOrder[a.time] || 99) - (timeOrder[b.time] || 99);
    });
    
    // Render activities
    let html = '';
    activities.forEach((activity, index) => {
        const isLast = index === activities.length - 1;
        
        html += `
            <div class="flex gap-4 relative">
                ${!isLast ? '<div class="absolute left-5 top-10 bottom-[-24px] w-0.5 bg-gray-100"></div>' : ''}
                <div class="w-10 h-10 ${activity.color} rounded-full flex items-center justify-center flex-shrink-0 z-10">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="flex-1 ${!isLast ? 'border-b border-gray-50 pb-4' : ''}">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold text-on-surface">${activity.title}</p>
                            <p class="text-[10px] text-outline">${activity.description}</p>
                        </div>
                        <span class="text-[10px] text-outline">${activity.time}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// SHOW EDIT USER MODAL
// ============================================
function showEditUserModal() {
    if (!userProfileData) return;
    
    const modalHtml = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="editModalOverlay">
            <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Edit User</h3>
                    <p class="text-sm text-outline mt-1">Update user information</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Full Name</label>
                        <input id="editFullName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${userProfileData.fullName || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Email</label>
                        <input id="editEmail" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${userProfileData.email || ''}" type="email"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone</label>
                        <input id="editPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${userProfileData.mobile || userProfileData.phone || ''}" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Role</label>
                        <select id="editRole" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="resident" ${userProfileData.role === 'resident' ? 'selected' : ''}>Resident</option>
                            <option value="business_owner" ${userProfileData.role === 'business_owner' ? 'selected' : ''}>Business Owner</option>
                            <option value="organization" ${userProfileData.role === 'organization' ? 'selected' : ''}>Organization</option>
                            <option value="community_moderator" ${userProfileData.role === 'community_moderator' ? 'selected' : ''}>Community Moderator</option>
                            <option value="district_admin" ${userProfileData.role === 'district_admin' ? 'selected' : ''}>District Admin</option>
                            <option value="platform_owner" ${userProfileData.role === 'platform_owner' ? 'selected' : ''}>Platform Owner</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="active" ${userProfileData.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${userProfileData.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="pending" ${(userProfileData.status === 'pending' || userProfileData.approvalStatus === 'pending') ? 'selected' : ''}>Pending</option>
                            <option value="inactive" ${userProfileData.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-save px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm" data-userid="${userProfileData.id}">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;
    
    const overlay = document.getElementById('editModalOverlay');
    
    overlay.querySelector('.modal-cancel').addEventListener('click', () => {
        container.innerHTML = '';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) container.innerHTML = '';
    });
    
    overlay.querySelector('.modal-save').addEventListener('click', async function() {
        const fullName = document.getElementById('editFullName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const role = document.getElementById('editRole').value;
        const status = document.getElementById('editStatus').value;
        const userId = this.dataset.userid;
        
        if (!fullName) {
            showToast('Please enter a full name', 'error');
            return;
        }
        
        try {
            const updates = {
                fullName: fullName.toUpperCase(),
                email: email,
                mobile: phone,
                role: role,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('users').doc(userId).update(updates);
            
            showToast('✅ User updated successfully', 'success');
            container.innerHTML = '';
            loadUserProfile();
        } catch (error) {
            console.error('Error updating user:', error);
            showToast('Failed to update user: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW MORE OPTIONS DROPDOWN
// ============================================
function toggleMoreOptions() {
    const menu = document.getElementById('moreOptionsMenu');
    menu.classList.toggle('hidden');
}

// ============================================
// HANDLE MORE OPTIONS ACTIONS
// ============================================
async function handleMoreAction(action) {
    if (!userProfileData) return;
    const userId = userProfileData.id;
    const userName = userProfileData.fullName || 'this user';
    
    switch(action) {
        case 'suspend':
            if (confirm(`Are you sure you want to suspend "${userName}"?`)) {
                try {
                    await db.collection('users').doc(userId).update({
                        status: 'suspended',
                        suspendedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        suspendedBy: auth.currentUser?.uid || 'system'
                    });
                    showToast(`✅ "${userName}" suspended successfully`, 'success');
                    loadUserProfile();
                } catch (error) {
                    showToast('Failed to suspend user: ' + error.message, 'error');
                }
            }
            break;
            
        case 'reactivate':
            if (confirm(`Are you sure you want to reactivate "${userName}"?`)) {
                try {
                    await db.collection('users').doc(userId).update({
                        status: 'active',
                        reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        reactivatedBy: auth.currentUser?.uid || 'system'
                    });
                    showToast(`✅ "${userName}" reactivated successfully`, 'success');
                    loadUserProfile();
                } catch (error) {
                    showToast('Failed to reactivate user: ' + error.message, 'error');
                }
            }
            break;
            
        case 'reset-password':
            if (confirm(`Send password reset email to "${userName}"?`)) {
                try {
                    const email = userProfileData.email;
                    if (!email) {
                        showToast('User has no email address', 'error');
                        return;
                    }
                    await auth.sendPasswordResetEmail(email);
                    showToast(`✅ Password reset email sent to ${email}`, 'success');
                } catch (error) {
                    showToast('Failed to send reset email: ' + error.message, 'error');
                }
            }
            break;
            
        case 'send-email':
            showToast('Opening email composer...', 'info');
            break;
            
        case 'delete':
            if (confirm(`⚠️ Are you sure you want to permanently delete "${userName}"? This action cannot be undone!`)) {
                try {
                    await db.collection('users').doc(userId).delete();
                    showToast(`✅ "${userName}" deleted successfully`, 'success');
                    setTimeout(() => {
                        window.location.href = 'users.html';
                    }, 1500);
                } catch (error) {
                    showToast('Failed to delete user: ' + error.message, 'error');
                }
            }
            break;
    }
    
    // Close dropdown
    document.getElementById('moreOptionsMenu').classList.add('hidden');
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-0 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0`;
    }, 3500);
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Edit User
    document.getElementById('editUserBtn')?.addEventListener('click', showEditUserModal);
    
    // More Options
    document.getElementById('moreOptionsBtn')?.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMoreOptions();
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('moreOptionsDropdown');
        if (dropdown && !dropdown.contains(e.target)) {
            document.getElementById('moreOptionsMenu').classList.add('hidden');
        }
    });
    
    // More options menu items
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', function() {
            handleMoreAction(this.dataset.action);
        });
    });
    
    // View All buttons
    document.getElementById('viewAllRolesBtn')?.addEventListener('click', function() {
        showToast('Viewing all roles...', 'info');
    });
    
    document.getElementById('viewAllActivityBtn')?.addEventListener('click', function() {
        showToast('Viewing all activity...', 'info');
    });
    
    document.getElementById('viewAllBusinessesBtn')?.addEventListener('click', function() {
        showToast('Viewing all businesses...', 'info');
    });
    
    document.getElementById('viewAllOrdersBtn')?.addEventListener('click', function() {
        showToast('Viewing all orders...', 'info');
    });
    
    document.getElementById('viewAllReviewsBtn')?.addEventListener('click', function() {
        showToast('Viewing all reviews...', 'info');
    });
    
    document.getElementById('viewAllReportsBtn')?.addEventListener('click', function() {
        showToast('Viewing all reports...', 'info');
    });
    
    // Global search
    document.getElementById('globalSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            showToast(`Searching for "${this.value.trim()}"...`, 'info');
        }
    });
});

console.log('🔄 BridgeConnect User Profile page loaded with Firestore integration');