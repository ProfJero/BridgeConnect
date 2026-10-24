// ============================================
// ADMIN BUSINESSES PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allBusinesses = [];
let filteredBusinesses = [];
let currentPage = 1;
let pageSize = 10;
let selectedBusinesses = new Set();
let isSidebarRendered = false;
let categories = new Set();

// Current filters
let currentFilters = {
    search: '',
    category: 'all',
    status: 'all',
    verified: 'all'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'pending': 'status-pending',
        'suspended': 'status-suspended',
        'inactive': 'status-inactive'
    };
    return statusMap[status] || 'status-inactive';
}

function getStatusColor(status) {
    const colors = {
        'active': 'text-green-600',
        'pending': 'text-orange-600',
        'suspended': 'text-red-600',
        'inactive': 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
}

function getVerificationLabel(verified) {
    return verified ? 'Verified' : 'Not Verified';
}

function getVerificationClass(verified) {
    return verified ? 'verified-true' : 'verified-false';
}

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(date) {
    if (!date) return '';
    if (typeof date === 'string') return '';
    if (date.toDate) date = date.toDate();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
            const currentPage = currentPath.split('/').pop() || 'businesses.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'businesses' && currentPage === 'businesses.html');
            
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
        const roleLabels = {
            'platform_owner': 'Platform Owner',
            'owner': 'Platform Owner',
            'district_admin': 'District Admin',
            'community_moderator': 'Community Moderator',
            'business_owner': 'Business Owner',
            'organization': 'Organization',
            'resident': 'Resident'
        };
        document.getElementById('headerUserRole').textContent = roleLabels[activeContext.type] || activeContext.type;
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
                // Load businesses after sidebar is ready
                setTimeout(() => {
                    loadBusinesses();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD BUSINESSES FROM FIRESTORE
// ============================================
async function loadBusinesses() {
    const tableBody = document.getElementById('businessesTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-8 text-outline">
                <i class="fas fa-spinner fa-spin text-2xl"></i>
                <p class="mt-2">Loading businesses...</p>
            </td>
        </tr>
    `;
    
    try {
        const userData = contextManager.userData;
        const isOwner = userData?.role === 'platform_owner' || userData?.role === 'owner';
        const userDistrict = userData?.district;
        
        let query = db.collection('businesses');
        
        // If not platform owner, filter by district
        if (!isOwner && userDistrict) {
            query = query.where('district', '==', userDistrict);
        }
        
        // Get all businesses
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        allBusinesses = [];
        categories.clear();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const business = {
                id: doc.id,
                ...data
            };
            allBusinesses.push(business);
            
            // Collect categories
            if (data.category) {
                categories.add(data.category);
            }
        });
        
        console.log(`✅ Loaded ${allBusinesses.length} businesses`);
        
        // Populate category filter
        populateCategoryFilter();
        
        // Apply filters and render
        applyFilters();
        
    } catch (error) {
        console.error('Error loading businesses:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl"></i>
                    <p class="mt-2">Failed to load businesses</p>
                    <p class="text-xs mt-1">${error.message}</p>
                </td>
            </tr>
        `;
        showToast('Error loading businesses: ' + error.message, 'error');
    }
}

// ============================================
// POPULATE CATEGORY FILTER
// ============================================
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    // Clear existing options except "All Categories"
    select.innerHTML = '<option value="all">All Categories</option>';
    
    // Sort categories alphabetically
    const sortedCategories = Array.from(categories).sort();
    
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    const verified = document.getElementById('verifiedFilter')?.value || 'all';
    
    filteredBusinesses = allBusinesses.filter(business => {
        // Search filter
        if (search) {
            const name = (business.name || '').toLowerCase();
            const owner = (business.ownerName || business.owner || '').toLowerCase();
            const phone = (business.phone || business.mobile || '').toLowerCase();
            const categorySearch = (business.category || '').toLowerCase();
            if (!name.includes(search) && !owner.includes(search) && 
                !phone.includes(search) && !categorySearch.includes(search)) {
                return false;
            }
        }
        
        // Category filter
        if (category !== 'all' && business.category !== category) {
            return false;
        }
        
        // Status filter
        if (status !== 'all') {
            const businessStatus = business.status || 'pending';
            if (businessStatus !== status) return false;
        }
        
        // Verified filter
        if (verified !== 'all') {
            const isVerified = business.isVerified === true;
            if (verified === 'true' && !isVerified) return false;
            if (verified === 'false' && isVerified) return false;
        }
        
        return true;
    });
    
    // Reset to first page when filtering
    currentPage = 1;
    renderTable();
    updateStats();
}

// ============================================
// RENDER TABLE
// ============================================
function renderTable() {
    const tableBody = document.getElementById('businessesTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredBusinesses.length);
    const pageBusinesses = filteredBusinesses.slice(startIndex, endIndex);
    
    if (pageBusinesses.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12 text-outline">
                    <i class="fas fa-store-slash text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No businesses found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    let html = '';
    pageBusinesses.forEach(business => {
        const status = business.status || 'pending';
        const statusClass = getStatusClass(status);
        const statusColor = getStatusColor(status);
        const isVerified = business.isVerified === true;
        const verifiedLabel = getVerificationLabel(isVerified);
        const verifiedClass = getVerificationClass(isVerified);
        const ownerName = business.ownerName || business.owner || 'Unknown';
        const ownerAvatar = business.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=6366f1&color=fff&size=32`;
        const businessName = business.name || 'Unnamed Business';
        const businessLogo = business.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(businessName)}&background=0052cc&color=fff&size=40`;
        const phone = business.phone || business.mobile || 'N/A';
        const category = business.category || 'Uncategorized';
        const community = business.community || business.district || 'N/A';
        const region = business.region || 'N/A';
        const createdDate = business.createdAt ? formatDate(business.createdAt) : 'N/A';
        const createdTime = business.createdAt ? formatTime(business.createdAt) : '';
        
        html += `
            <tr class="table-row-hover cursor-pointer hover:bg-surface-container-low/50 transition-colors" data-id="${business.id}">
                <td class="px-4 py-4">
                    <input class="business-checkbox rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-id="${business.id}"/>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <img alt="${businessName}" class="w-10 h-10 rounded-full border border-outline-variant object-cover" src="${businessLogo}"/>
                        <div>
                            <p class="font-bold text-on-surface text-sm">${businessName}</p>
                            <p class="text-xs text-outline">${phone}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center text-xs text-on-surface-variant">
                        <i class="fas fa-tag mr-2 text-blue-500"></i> ${category}
                    </div>
                </td>
                <td class="px-4 py-4">
                    <p class="font-medium text-on-surface text-xs">${community}</p>
                    <p class="text-[10px] text-outline">${region}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <img alt="${ownerName}" class="w-6 h-6 rounded-full object-cover" src="${ownerAvatar}"/>
                        <span class="text-xs font-medium text-on-surface">${ownerName}</span>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${verifiedClass} border">${verifiedLabel}</span>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${statusClass} border">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                </td>
                <td class="px-4 py-4">
                    <p class="text-xs text-on-surface">${createdDate}</p>
                    <p class="text-[10px] text-outline">${createdTime}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-1">
                        <button class="view-business-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${business.id}" title="View">
                            <i class="fas fa-eye text-sm"></i>
                        </button>
                        ${status === 'pending' ? `
                            <button class="approve-business-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${business.id}" title="Approve">
                                <i class="fas fa-check-circle text-sm"></i>
                            </button>
                            <button class="reject-business-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${business.id}" title="Reject">
                                <i class="fas fa-times-circle text-sm"></i>
                            </button>
                        ` : `
                            <button class="edit-business-btn p-1.5 text-blue-400 hover:bg-blue-50 rounded transition-colors" data-id="${business.id}" title="Edit">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            ${status === 'active' ? `
                                <button class="suspend-business-btn p-1.5 text-orange-400 hover:bg-orange-50 rounded transition-colors" data-id="${business.id}" title="Suspend">
                                    <i class="fas fa-pause-circle text-sm"></i>
                                </button>
                            ` : status === 'suspended' ? `
                                <button class="reactivate-business-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${business.id}" title="Reactivate">
                                    <i class="fas fa-play-circle text-sm"></i>
                                </button>
                            ` : ''}
                            <button class="verify-business-btn p-1.5 text-purple-500 hover:bg-purple-50 rounded transition-colors" data-id="${business.id}" title="Toggle Verification">
                                <i class="fas fa-shield-alt text-sm"></i>
                            </button>
                        `}
                        <button class="delete-business-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${business.id}" title="Delete">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    
    // Attach event listeners
    attachTableEventListeners();
    
    // Update pagination
    updatePagination();
}

// ============================================
// ATTACH TABLE EVENT LISTENERS
// ============================================
function attachTableEventListeners() {
    // View Business
    document.querySelectorAll('.view-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showToast('Viewing business details...', 'info');
            // window.location.href = `business-detail.html?id=${id}`;
        });
    });
    
    // Edit Business
    document.querySelectorAll('.edit-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showEditBusinessModal(id);
        });
    });
    
    // Approve Business
    document.querySelectorAll('.approve-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            approveBusiness(id);
        });
    });
    
    // Reject Business
    document.querySelectorAll('.reject-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            rejectBusiness(id);
        });
    });
    
    // Suspend Business
    document.querySelectorAll('.suspend-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            suspendBusiness(id);
        });
    });
    
    // Reactivate Business
    document.querySelectorAll('.reactivate-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            reactivateBusiness(id);
        });
    });
    
    // Verify Business
    document.querySelectorAll('.verify-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            toggleVerification(id);
        });
    });
    
    // Delete Business
    document.querySelectorAll('.delete-business-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            deleteBusiness(id);
        });
    });
    
    // Row click - view details
    document.querySelectorAll('#businessesTableBody tr[data-id]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const id = this.dataset.id;
            showToast('Viewing business details...', 'info');
            // window.location.href = `business-detail.html?id=${id}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.business-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedBusinesses.add(this.dataset.id);
            } else {
                selectedBusinesses.delete(this.dataset.id);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.business-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedBusinesses.add(cb.dataset.id);
                } else {
                    selectedBusinesses.delete(cb.dataset.id);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.business-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.business-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    const total = allBusinesses.length;
    const verified = allBusinesses.filter(b => b.isVerified === true).length;
    const pending = allBusinesses.filter(b => b.status === 'pending').length;
    const suspended = allBusinesses.filter(b => b.status === 'suspended').length;
    
    // This month
    const now = new Date();
    const thisMonth = allBusinesses.filter(b => {
        if (!b.createdAt) return false;
        const date = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    document.getElementById('totalBusinesses').textContent = total;
    document.getElementById('verifiedBusinesses').textContent = verified;
    document.getElementById('pendingBusinesses').textContent = pending;
    document.getElementById('suspendedBusinesses').textContent = suspended;
    document.getElementById('thisMonthBusinesses').textContent = thisMonth;
}

// ============================================
// UPDATE PAGINATION
// ============================================
function updatePagination() {
    const totalPages = Math.ceil(filteredBusinesses.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredBusinesses.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing <span class="text-on-surface">${filteredBusinesses.length > 0 ? startIndex : 0} - ${endIndex}</span> of <span class="text-on-surface">${filteredBusinesses.length}</span> businesses`;
    
    // Page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    let pagesHtml = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        pagesHtml += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-xs font-medium" data-page="1">1</button>`;
        if (startPage > 2) {
            pagesHtml += `<span class="text-outline px-1">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        pagesHtml += `
            <button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg ${isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface-container-high'} text-xs font-medium" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagesHtml += `<span class="text-outline px-1">...</span>`;
        }
        pagesHtml += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high text-xs font-medium" data-page="${totalPages}">${totalPages}</button>`;
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
// BUSINESS ACTIONS
// ============================================
async function approveBusiness(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    if (!confirm(`Approve "${business.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(id).update({
            status: 'active',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${business.name}" approved successfully`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast('Failed to approve business: ' + error.message, 'error');
    }
}

async function rejectBusiness(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    if (!confirm(`Reject "${business.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(id).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${business.name}" rejected`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast('Failed to reject business: ' + error.message, 'error');
    }
}

async function suspendBusiness(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    if (!confirm(`Suspend "${business.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(id).update({
            status: 'suspended',
            suspendedAt: firebase.firestore.FieldValue.serverTimestamp(),
            suspendedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${business.name}" suspended successfully`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast('Failed to suspend business: ' + error.message, 'error');
    }
}

async function reactivateBusiness(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    if (!confirm(`Reactivate "${business.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(id).update({
            status: 'active',
            reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reactivatedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${business.name}" reactivated successfully`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast('Failed to reactivate business: ' + error.message, 'error');
    }
}

async function toggleVerification(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    const currentStatus = business.isVerified === true;
    const action = currentStatus ? 'unverify' : 'verify';
    
    if (!confirm(`${action === 'verify' ? 'Verify' : 'Unverify'} "${business.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(id).update({
            isVerified: !currentStatus,
            verifiedAt: currentStatus ? null : firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: currentStatus ? null : auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${business.name}" ${action === 'verify' ? 'verified' : 'unverified'}`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast(`Failed to ${action} business: ` + error.message, 'error');
    }
}

async function deleteBusiness(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) return;
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${business.name || 'this business'}"? This action cannot be undone!`)) return;
    
    try {
        await db.collection('businesses').doc(id).delete();
        showToast(`✅ "${business.name}" deleted successfully`, 'success');
        loadBusinesses();
    } catch (error) {
        showToast('Failed to delete business: ' + error.message, 'error');
    }
}

// ============================================
// SHOW EDIT BUSINESS MODAL
// ============================================
function showEditBusinessModal(id) {
    const business = allBusinesses.find(b => b.id === id);
    if (!business) {
        showToast('Business not found', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="editModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Edit Business</h3>
                    <p class="text-sm text-outline mt-1">Update business information</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Business Name</label>
                        <input id="editBusinessName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${business.name || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Category</label>
                        <input id="editCategory" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${business.category || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone</label>
                        <input id="editPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${business.phone || business.mobile || ''}" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="editCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${business.community || business.district || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="active" ${business.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="pending" ${business.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="suspended" ${business.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="inactive" ${business.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Verified</label>
                        <select id="editVerified" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="true" ${business.isVerified === true ? 'selected' : ''}>Verified</option>
                            <option value="false" ${business.isVerified === true ? '' : 'selected'}>Not Verified</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-save px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm" data-id="${id}">Save Changes</button>
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
        const name = document.getElementById('editBusinessName').value.trim();
        const category = document.getElementById('editCategory').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const community = document.getElementById('editCommunity').value.trim();
        const status = document.getElementById('editStatus').value;
        const verified = document.getElementById('editVerified').value === 'true';
        const businessId = this.dataset.id;
        
        if (!name) {
            showToast('Please enter a business name', 'error');
            return;
        }
        
        try {
            const updates = {
                name: name,
                category: category,
                phone: phone,
                community: community,
                status: status,
                isVerified: verified,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('businesses').doc(businessId).update(updates);
            
            showToast('✅ Business updated successfully', 'success');
            container.innerHTML = '';
            loadBusinesses();
        } catch (error) {
            console.error('Error updating business:', error);
            showToast('Failed to update business: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW ADD BUSINESS MODAL
// ============================================
function showAddBusinessModal() {
    const modalHtml = `
        <div class="modal-overlay" id="addModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Add New Business</h3>
                    <p class="text-sm text-outline mt-1">Create a new business listing</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Business Name <span class="text-red-500">*</span></label>
                        <input id="addBusinessName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter business name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Category <span class="text-red-500">*</span></label>
                        <input id="addCategory" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Food & Catering" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone <span class="text-red-500">*</span></label>
                        <input id="addPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0241234567" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="addCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Kwamankese" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Owner ID (UID)</label>
                        <input id="addOwnerId" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Firebase UID of the owner" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="addStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending">Pending (Needs Approval)</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Create Business</button>
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
        const name = document.getElementById('addBusinessName').value.trim();
        const category = document.getElementById('addCategory').value.trim();
        const phone = document.getElementById('addPhone').value.trim();
        const community = document.getElementById('addCommunity').value.trim();
        const ownerId = document.getElementById('addOwnerId').value.trim() || auth.currentUser?.uid || 'system';
        const status = document.getElementById('addStatus').value;
        
        if (!name) {
            showToast('Please enter a business name', 'error');
            return;
        }
        if (!category) {
            showToast('Please enter a category', 'error');
            return;
        }
        if (!phone) {
            showToast('Please enter a phone number', 'error');
            return;
        }
        
        try {
            await db.collection('businesses').add({
                name: name,
                category: category,
                phone: phone,
                community: community || 'N/A',
                ownerId: ownerId,
                ownerName: 'Unknown',
                status: status,
                isVerified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            });
            
            showToast(`✅ Business "${name}" created successfully`, 'success');
            container.innerHTML = '';
            loadBusinesses();
        } catch (error) {
            console.error('Error creating business:', error);
            showToast('Failed to create business: ' + error.message, 'error');
        }
    });
}

// ============================================
// EXPORT BUSINESSES
// ============================================
function exportBusinesses() {
    if (filteredBusinesses.length === 0) {
        showToast('No businesses to export', 'info');
        return;
    }
    
    // Create CSV
    let csv = 'Name,Category,Phone,Community,Owner,Status,Verified,Date Added\n';
    filteredBusinesses.forEach(business => {
        const date = business.createdAt ? formatDate(business.createdAt) : 'N/A';
        csv += `"${business.name || ''}","${business.category || ''}","${business.phone || ''}","${business.community || ''}","${business.ownerName || ''}","${business.status || ''}","${business.isVerified ? 'Yes' : 'No'}","${date}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `businesses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredBusinesses.length} businesses`, 'success');
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
    
    // Add Business
    document.getElementById('addBusinessBtn')?.addEventListener('click', showAddBusinessModal);
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportBusinesses);
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        document.querySelector('.flex-wrap .border')?.focus();
    });
    
    // Search
    document.getElementById('searchFilter')?.addEventListener('input', applyFilters);
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('verifiedFilter')?.addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', function() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('categoryFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('verifiedFilter').value = 'all';
        applyFilters();
        showToast('Filters cleared', 'info');
    });
    
    // Per page change
    document.getElementById('perPageSelect')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        renderTable();
    });
    
    // Previous page
    document.getElementById('prevPage')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    // Next page
    document.getElementById('nextPage')?.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredBusinesses.length / pageSize);
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
});

console.log('🔄 BridgeConnect Businesses page loaded with Firestore integration');