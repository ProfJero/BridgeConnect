// ============================================
// ADMIN USERS PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allUsers = [];
let filteredUsers = [];
let currentPage = 1;
let pageSize = 10;
let selectedUsers = new Set();
let currentFilter = {
    search: '',
    status: 'all',
    role: 'all'
};

// ============================================
// LOAD SIDEBAR (Using context-based system)
// ============================================
// ============================================
// LOAD SIDEBAR (Using context-based system)
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
        
        // Build sidebar HTML dynamically
        let sidebarHTML = `
        <aside id="adminSidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30 overflow-y-auto transition-all duration-300 relative">
            <!-- Toggle Button - Fixed position at the right edge of sidebar -->
            <button class="sidebar-toggle-btn absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center hover:bg-gray-50 transition-all z-40" id="sidebarToggleBtn" title="Toggle Sidebar">
                <i class="fa-solid fa-chevron-left text-gray-600 text-xs"></i>
            </button>

            <!-- Logo -->
            <div class="sidebar-logo p-4 pb-3 flex items-center gap-3 border-b border-gray-200/50 flex-shrink-0">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <i class="fa-solid fa-users text-xl"></i>
                </div>
                <div class="logo-text transition-all duration-300 overflow-hidden">
                    <h1 class="text-lg font-bold text-blue-600 leading-tight">BridgeConnect</h1>
                    <p class="text-[10px] text-gray-500">${activeContext?.label || 'Admin Portal'}</p>
                </div>
            </div>
            
            <!-- Context Switcher (if multiple contexts) -->
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
            
            <!-- DBI Badge -->
            <div class="sidebar-dbi p-2.5 mx-3 my-2 bg-gray-50 rounded-lg border border-gray-200/50 flex items-center gap-2 flex-shrink-0 transition-all duration-300">
                <div class="w-5 h-5 bg-blue-600 rounded text-white flex items-center justify-center text-[8px] font-bold shrink-0">DBI</div>
                <div class="dbi-text text-[10px] text-gray-500 transition-all duration-300 overflow-hidden whitespace-nowrap">
                    Powered by <br/><span class="font-semibold text-gray-800">Digital Bridge Initiative</span>
                </div>
            </div>
            
            <!-- Navigation - Scrollable -->
            <nav class="sidebar-nav flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        `;
        
        // Add menu items
        menuItems.forEach(item => {
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop() || 'users.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'users' && currentPage === 'users.html') ||
                           (item.page === 'dashboard' && currentPage === 'dashboard.html');
            
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
        
        // Add divider and bottom items
        sidebarHTML += `
                <div class="my-2 border-t border-gray-200/50"></div>
                
                <a class="sidebar-link flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="notifications.html" data-page="notifications">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-bell w-5 text-center text-sm"></i>
                        <span class="link-text transition-all duration-300">Notifications</span>
                    </div>
                    <span class="notif-badge bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">12</span>
                </a>
                
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="support.html" data-page="support">
                    <i class="fa-solid fa-circle-question w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">Support</span>
                </a>
            </nav>
            
            <!-- Logout -->
            <div class="sidebar-footer p-3 border-t border-gray-200/50 flex-shrink-0">
                <a id="logoutBtn" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 font-medium text-sm transition-all cursor-pointer group">
                    <i class="fa-solid fa-right-from-bracket w-5 text-center text-sm group-hover:rotate-12 transition-transform"></i>
                    <span class="link-text transition-all duration-300">Logout</span>
                </a>
            </div>
        </aside>
        `;
        
        container.innerHTML = sidebarHTML;
        
        // Initialize sidebar interactions
        initSidebarInteractions();
        initContextSwitcher();
        
        console.log('✅ Sidebar rendered for users page');
    }
    
    renderSidebar();
}

// ============================================
// SIDEBAR INTERACTIONS
// ============================================
// ============================================
// SIDEBAR INTERACTIONS
// ============================================
function initSidebarInteractions() {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    // Toggle button
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

    // Sidebar link clicks
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href !== '#' && !href.includes('#')) {
                return;
            }
            e.preventDefault();
            const page = this.dataset.page;
            if (!page || page === 'logout') return;
            
            document.querySelectorAll('.sidebar-link').forEach(l => {
                l.classList.remove('active');
                l.style.backgroundColor = '';
                l.style.color = '';
                l.style.fontWeight = '';
            });
            this.classList.add('active');
            this.style.backgroundColor = '#2563eb';
            this.style.color = 'white';
            this.style.fontWeight = '600';
            
            showToast(`Loading ${page}...`, 'info');
        });
    });

    // Mobile menu toggle
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

    // Logout
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

// ============================================
// CONTEXT SWITCHER
// ============================================
function initContextSwitcher() {
    const switcherBtn = document.getElementById('contextSwitcherBtn');
    if (!switcherBtn) return;
    
    switcherBtn.addEventListener('click', function() {
        window.location.href = 'workspace-selector.html';
    });
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
                updateHeaderInfo(user);
                loadUsers();
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// UPDATE HEADER INFO
// ============================================
function updateHeaderInfo(user) {
    if (!contextManager || !contextManager.userData) return;
    
    const userData = contextManager.userData;
    const fullName = userData.fullName || 'User';
    const firstName = fullName.split(' ')[0] || 'User';
    const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=2563eb&color=fff&size=40`;
    
    // Update desktop header
    const nameEl = document.getElementById('headerUserName');
    const roleEl = document.getElementById('headerUserRole');
    const avatarEl = document.getElementById('headerUserAvatar');
    const mobileAvatar = document.getElementById('mobileUserAvatar');
    
    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) {
        const activeContext = contextManager.getActiveContext();
        const roleLabels = {
            'platform_owner': 'Platform Owner',
            'district_admin': 'District Admin',
            'community_moderator': 'Community Moderator',
            'business_owner': 'Business Owner',
            'organization': 'Organization',
            'resident': 'Resident'
        };
        roleEl.textContent = roleLabels[activeContext?.type] || activeContext?.type || 'User';
    }
    if (avatarEl) avatarEl.src = avatarUrl;
    if (mobileAvatar) mobileAvatar.src = avatarUrl;
}

// ============================================
// LOAD USERS FROM FIRESTORE
// ============================================
async function loadUsers() {
    try {
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-outline">
                    <i class="fas fa-spinner fa-spin text-2xl"></i>
                    <p class="mt-2">Loading users...</p>
                </td>
            </tr>
        `;
        
        // Get all users from Firestore
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            allUsers.push({
                id: doc.id,
                ...data
            });
        });
        
        // Update metrics
        updateMetrics();
        
        // Apply filters and render
        applyFilters();
        
        console.log(`✅ Loaded ${allUsers.length} users`);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error loading users: ' + error.message, 'error');
        const tableBody = document.getElementById('usersTableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl"></i>
                    <p class="mt-2">Failed to load users</p>
                    <p class="text-xs mt-1">${error.message}</p>
                </td>
            </tr>
        `;
    }
}

// ============================================
// UPDATE METRICS
// ============================================
function updateMetrics() {
    const total = allUsers.length;
    const active = allUsers.filter(u => u.status === 'active').length;
    const suspended = allUsers.filter(u => u.status === 'suspended').length;
    const pending = allUsers.filter(u => u.approvalStatus === 'pending' || u.status === 'pending').length;
    
    document.getElementById('totalUsers').textContent = total;
    document.getElementById('activeUsers').textContent = active;
    document.getElementById('suspendedUsers').textContent = suspended;
    document.getElementById('pendingUsers').textContent = pending;
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('searchInputTable')?.value?.toLowerCase() || '';
    const status = document.getElementById('statusFilter')?.value || 'all';
    const role = document.getElementById('roleFilter')?.value || 'all';
    
    filteredUsers = allUsers.filter(user => {
        // Search filter
        if (search) {
            const name = (user.fullName || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const phone = (user.mobile || user.phone || '').toLowerCase();
            const username = (user.username || '').toLowerCase();
            if (!name.includes(search) && !email.includes(search) && 
                !phone.includes(search) && !username.includes(search)) {
                return false;
            }
        }
        
        // Status filter
        if (status !== 'all') {
            const userStatus = user.status || (user.approvalStatus === 'pending' ? 'pending' : 'inactive');
            if (userStatus !== status) return false;
        }
        
        // Role filter
        if (role !== 'all') {
            const userRole = user.role || 'resident';
            if (userRole !== role) return false;
        }
        
        return true;
    });
    
    // Reset to first page when filtering
    currentPage = 1;
    renderTable();
}

// ============================================
// RENDER TABLE
// ============================================
function renderTable() {
    const tableBody = document.getElementById('usersTableBody');
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredUsers.length);
    const pageUsers = filteredUsers.slice(startIndex, endIndex);
    
    if (pageUsers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-outline">
                    <i class="fas fa-users-slash text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No users found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
    } else {
        let html = '';
        pageUsers.forEach(user => {
            const status = user.status || (user.approvalStatus === 'pending' ? 'pending' : 'inactive');
            const statusClass = `status-${status}`;
            const roleLabels = {
                'platform_owner': 'Platform Owner',
                'district_admin': 'District Admin',
                'community_moderator': 'Community Moderator',
                'business_owner': 'Business Owner',
                'organization': 'Organization',
                'resident': 'Resident'
            };
            const roleLabel = roleLabels[user.role] || user.role || 'User';
            const avatarUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName || 'User')}&background=2563eb&color=fff&size=40`;
            const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000) : new Date();
            const dateStr = joinedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const timeStr = joinedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <tr class="hover:bg-surface-container-low transition-colors group cursor-pointer" data-userid="${user.id}">
                    <td class="py-4 px-6">
                        <input class="user-checkbox w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-userid="${user.id}"/>
                    </td>
                    <td class="py-4 px-4">
                        <div class="flex items-center">
                            <img class="w-10 h-10 rounded-full mr-3 object-cover shadow-sm" alt="${user.fullName || 'User'}" src="${avatarUrl}"/>
                            <div>
                                <p class="font-label-md text-label-md text-on-surface font-bold">${user.fullName || 'Unknown'}</p>
                                <p class="text-[11px] text-outline">${user.email || 'No email'}</p>
                            </div>
                        </div>
                    </td>
                    <td class="py-4 px-4 font-body-md text-body-md text-on-surface-variant">${user.mobile || user.phone || 'N/A'}</td>
                    <td class="py-4 px-4 font-body-md text-body-md text-on-surface-variant">${user.community || user.communityName || 'N/A'}</td>
                    <td class="py-4 px-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${statusClass} border">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </td>
                    <td class="py-4 px-4 font-body-md text-body-md text-on-surface-variant">${roleLabel}</td>
                    <td class="py-4 px-4">
                        <p class="font-body-md text-body-md text-on-surface">${dateStr}</p>
                        <p class="text-[10px] text-outline">${timeStr}</p>
                    </td>
                    <td class="py-4 px-4 text-right">
                        <div class="flex items-center justify-end space-x-1">
                            <button class="view-user-btn w-8 h-8 rounded-full flex items-center justify-center text-primary-container hover:bg-primary-container hover:text-white transition-all" data-userid="${user.id}">
                                <i class="fas fa-eye text-lg"></i>
                            </button>
                            <button class="edit-user-btn w-8 h-8 rounded-full flex items-center justify-center text-outline hover:bg-surface-container-high transition-all" data-userid="${user.id}">
                                <i class="fas fa-edit text-lg"></i>
                            </button>
                            ${status === 'suspended' ? `
                            <button class="reactivate-user-btn w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:bg-secondary hover:text-white transition-all" data-userid="${user.id}">
                                <i class="fas fa-check-circle text-lg"></i>
                            </button>
                            ` : `
                            <button class="suspend-user-btn w-8 h-8 rounded-full flex items-center justify-center text-tertiary-container hover:bg-tertiary-container hover:text-white transition-all" data-userid="${user.id}">
                                <i class="fas fa-ban text-lg"></i>
                            </button>
                            `}
                            <button class="delete-user-btn w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error hover:text-white transition-all" data-userid="${user.id}">
                                <i class="fas fa-trash text-lg"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
    }
    
    // Update pagination
    updatePagination();
    
    // Attach event listeners to new elements
    attachTableEventListeners();
}

// ============================================
// UPDATE PAGINATION
// ============================================
function updatePagination() {
    const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredUsers.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing <span class="text-on-surface font-bold">${filteredUsers.length > 0 ? startIndex : 0} - ${endIndex}</span> of ${filteredUsers.length} users`;
    
    // Page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    let pagesHtml = '';
    
    // Show first page, previous, current, next, last
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        pagesHtml += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-label-md" data-page="1">1</button>`;
        if (startPage > 2) {
            pagesHtml += `<span class="text-outline">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        pagesHtml += `
            <button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg ${isActive ? 'bg-primary text-on-primary font-bold' : 'hover:bg-surface-container-high'} text-label-md" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagesHtml += `<span class="text-outline">...</span>`;
        }
        pagesHtml += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-label-md" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    pageNumbers.innerHTML = pagesHtml;
    
    // Previous/Next buttons
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    
    // Attach page click events
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                renderTable();
            }
        });
    });
}

// ============================================
// ATTACH TABLE EVENT LISTENERS
// ============================================
function attachTableEventListeners() {
    // View User
    document.querySelectorAll('.view-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.userid;
            window.location.href = `user-profile.html?id=${userId}`;
        });
    });
    
    // Edit User
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.userid;
            showEditUserModal(userId);
        });
    });
    
    // Suspend User
    document.querySelectorAll('.suspend-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.userid;
            suspendUser(userId);
        });
    });
    
    // Reactivate User
    document.querySelectorAll('.reactivate-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.userid;
            reactivateUser(userId);
        });
    });
    
    // Delete User
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const userId = this.dataset.userid;
            deleteUser(userId);
        });
    });
    
    // Row click - go to profile
    document.querySelectorAll('#usersTableBody tr[data-userid]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const userId = this.dataset.userid;
            window.location.href = `user-profile.html?id=${userId}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedUsers.add(this.dataset.userid);
            } else {
                selectedUsers.delete(this.dataset.userid);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedUsers.add(cb.dataset.userid);
                } else {
                    selectedUsers.delete(cb.dataset.userid);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.user-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// USER ACTIONS
// ============================================
async function suspendUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to suspend "${user.fullName || 'this user'}"?`)) return;
    
    try {
        await db.collection('users').doc(userId).update({
            status: 'suspended',
            suspendedAt: firebase.firestore.FieldValue.serverTimestamp(),
            suspendedBy: auth.currentUser?.uid || 'system'
        });
        
        showToast(`✅ User "${user.fullName}" suspended successfully`, 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error suspending user:', error);
        showToast('Failed to suspend user: ' + error.message, 'error');
    }
}

async function reactivateUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`Are you sure you want to reactivate "${user.fullName || 'this user'}"?`)) return;
    
    try {
        await db.collection('users').doc(userId).update({
            status: 'active',
            reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reactivatedBy: auth.currentUser?.uid || 'system'
        });
        
        showToast(`✅ User "${user.fullName}" reactivated successfully`, 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error reactivating user:', error);
        showToast('Failed to reactivate user: ' + error.message, 'error');
    }
}

async function deleteUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${user.fullName || 'this user'}"? This action cannot be undone!`)) return;
    
    try {
        await db.collection('users').doc(userId).delete();
        showToast(`✅ User "${user.fullName}" deleted successfully`, 'success');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Failed to delete user: ' + error.message, 'error');
    }
}

// ============================================
// SHOW EDIT USER MODAL
// ============================================
function showEditUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
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
                        <input id="editFullName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${user.fullName || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Email</label>
                        <input id="editEmail" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${user.email || ''}" type="email"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone</label>
                        <input id="editPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${user.mobile || user.phone || ''}" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Role</label>
                        <select id="editRole" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="resident" ${user.role === 'resident' ? 'selected' : ''}>Resident</option>
                            <option value="business_owner" ${user.role === 'business_owner' ? 'selected' : ''}>Business Owner</option>
                            <option value="organization" ${user.role === 'organization' ? 'selected' : ''}>Organization</option>
                            <option value="community_moderator" ${user.role === 'community_moderator' ? 'selected' : ''}>Community Moderator</option>
                            <option value="district_admin" ${user.role === 'district_admin' ? 'selected' : ''}>District Admin</option>
                            <option value="platform_owner" ${user.role === 'platform_owner' ? 'selected' : ''}>Platform Owner</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="active" ${user.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="pending" ${(user.status === 'pending' || user.approvalStatus === 'pending') ? 'selected' : ''}>Pending</option>
                            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-save px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm" data-userid="${userId}">Save Changes</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;
    
    const overlay = document.getElementById('editModalOverlay');
    
    // Cancel
    overlay.querySelector('.modal-cancel').addEventListener('click', () => {
        container.innerHTML = '';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) container.innerHTML = '';
    });
    
    // Save
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
            await loadUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            showToast('Failed to update user: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW ADD USER MODAL
// ============================================
function showAddUserModal() {
    const modalHtml = `
        <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="addModalOverlay">
            <div class="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Add New User</h3>
                    <p class="text-sm text-outline mt-1">Create a new user account</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Full Name <span class="text-red-500">*</span></label>
                        <input id="addFullName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter full name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Email <span class="text-red-500">*</span></label>
                        <input id="addEmail" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="user@example.com" type="email"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone <span class="text-red-500">*</span></label>
                        <input id="addPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0241234567" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Password <span class="text-red-500">*</span></label>
                        <input id="addPassword" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Min 8 characters" type="password"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Role</label>
                        <select id="addRole" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="resident">Resident</option>
                            <option value="business_owner">Business Owner</option>
                            <option value="organization">Organization</option>
                            <option value="community_moderator">Community Moderator</option>
                            <option value="district_admin">District Admin</option>
                            <option value="platform_owner">Platform Owner</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="addCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Kwamankese" type="text"/>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Create User</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;
    
    const overlay = document.getElementById('addModalOverlay');
    
    overlay.querySelector('.modal-cancel').addEventListener('click', () => {
        container.innerHTML = '';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) container.innerHTML = '';
    });
    
    overlay.querySelector('.modal-create').addEventListener('click', async function() {
        const fullName = document.getElementById('addFullName').value.trim();
        const email = document.getElementById('addEmail').value.trim();
        const phone = document.getElementById('addPhone').value.trim();
        const password = document.getElementById('addPassword').value;
        const role = document.getElementById('addRole').value;
        const community = document.getElementById('addCommunity').value.trim();
        
        if (!fullName) { showToast('Please enter a full name', 'error'); return; }
        if (!email) { showToast('Please enter an email', 'error'); return; }
        if (!phone) { showToast('Please enter a phone number', 'error'); return; }
        if (!password || password.length < 8) { 
            showToast('Password must be at least 8 characters', 'error'); 
            return; 
        }
        
        try {
            // Create user in Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Format phone
            let phoneFormatted = phone.replace(/[\s\-+]/g, '');
            if (phoneFormatted.startsWith('233')) {
                phoneFormatted = '0' + phoneFormatted.substring(3);
            }
            
            // Generate username
            const username = fullName.toLowerCase().replace(/\s/g, '_') + '_' + Math.random().toString(36).substring(2, 6);
            
            // Save to Firestore
            const userData = {
                uid: user.uid,
                fullName: fullName.toUpperCase(),
                email: email.toLowerCase(),
                mobile: phoneFormatted,
                username: username,
                role: role,
                community: community || 'N/A',
                status: 'active',
                approvalStatus: 'approved',
                isVerified: false,
                isApproved: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('users').doc(user.uid).set(userData);
            
            // Save to usernames collection
            await db.collection('usernames').doc(username).set({
                uid: user.uid,
                username: username,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showToast(`✅ User "${fullName}" created successfully`, 'success');
            container.innerHTML = '';
            await loadUsers();
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.code === 'auth/email-already-in-use') {
                showToast('Email already in use', 'error');
            } else {
                showToast('Failed to create user: ' + error.message, 'error');
            }
        }
    });
}

// ============================================
// EXPORT USERS
// ============================================
function exportUsers() {
    if (filteredUsers.length === 0) {
        showToast('No users to export', 'info');
        return;
    }
    
    // Create CSV
    let csv = 'Name,Email,Phone,Role,Status,Community,Joined\n';
    filteredUsers.forEach(user => {
        const joinedDate = user.createdAt ? new Date(user.createdAt.seconds * 1000) : new Date();
        csv += `"${user.fullName || ''}","${user.email || ''}","${user.mobile || user.phone || ''}","${user.role || ''}","${user.status || ''}","${user.community || ''}","${joinedDate.toLocaleDateString()}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredUsers.length} users`, 'success');
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
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Search input
    document.getElementById('searchInputTable')?.addEventListener('input', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('roleFilter')?.addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', function() {
        document.getElementById('searchInputTable').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('roleFilter').value = 'all';
        applyFilters();
    });
    
    // Add User
    document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportUsers);
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        document.querySelector('.flex-wrap select')?.focus();
    });
    
    // Previous/Next page
    document.getElementById('prevPage')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    document.getElementById('nextPage')?.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredUsers.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
});

console.log('🔄 BridgeConnect Users page loaded with Firestore integration');