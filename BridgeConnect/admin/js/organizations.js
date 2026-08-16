// ============================================
// ADMIN ORGANIZATIONS PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allOrganizations = [];
let filteredOrganizations = [];
let currentPage = 1;
let pageSize = 10;
let selectedOrganizations = new Set();
let isSidebarRendered = false;
let orgTypes = new Set();

// Current filters
let currentFilters = {
    search: '',
    type: 'all',
    status: 'all'
};

// Type colors and icons
const typeConfig = {
    'School': { icon: 'fa-school', color: 'bg-blue-50 text-blue-600', borderColor: 'hover:border-blue-300' },
    'Church': { icon: 'fa-church', color: 'bg-purple-50 text-purple-600', borderColor: 'hover:border-purple-300' },
    'NGO': { icon: 'fa-hand-holding-heart', color: 'bg-green-50 text-green-600', borderColor: 'hover:border-green-300' },
    'Government Office': { icon: 'fa-landmark', color: 'bg-indigo-50 text-indigo-600', borderColor: 'hover:border-indigo-300' },
    'Health Centre': { icon: 'fa-heartbeat', color: 'bg-red-50 text-red-600', borderColor: 'hover:border-red-300' }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusClass(status) {
    const statusMap = {
        'verified': 'status-verified',
        'pending': 'status-pending',
        'rejected': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusIcon(status) {
    const icons = {
        'verified': 'fa-check-circle',
        'pending': 'fa-clock',
        'rejected': 'fa-times-circle'
    };
    return icons[status] || 'fa-clock';
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
            const currentPage = currentPath.split('/').pop() || 'organizations.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'organizations' && currentPage === 'organizations.html');
            
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
                setTimeout(() => {
                    loadOrganizations();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD ORGANIZATIONS FROM FIRESTORE
// ============================================
async function loadOrganizations() {
    const tableBody = document.getElementById('organizationsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-8 text-outline">
                <i class="fas fa-spinner fa-spin text-2xl"></i>
                <p class="mt-2">Loading organizations...</p>
            </td>
        </tr>
    `;
    
    try {
        const userData = contextManager.userData;
        const isOwner = userData?.role === 'platform_owner' || userData?.role === 'owner';
        const userDistrict = userData?.district;
        
        let query = db.collection('organizations');
        
        // If not platform owner, filter by district
        if (!isOwner && userDistrict) {
            query = query.where('district', '==', userDistrict);
        }
        
        // Get all organizations
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        allOrganizations = [];
        orgTypes.clear();
        
        if (snapshot.empty) {
            // No organizations found - show empty state
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12 text-outline">
                        <i class="fas fa-building text-3xl text-gray-300 mb-3 block"></i>
                        <p class="text-sm font-medium">No organizations found</p>
                        <p class="text-xs mt-1">Click "Add Organization" to create your first organization</p>
                    </td>
                </tr>
            `;
            updateStats();
            populateCategoryTiles();
            updatePagination();
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const org = {
                id: doc.id,
                ...data
            };
            allOrganizations.push(org);
            
            // Collect types
            if (data.type) {
                orgTypes.add(data.type);
            }
        });
        
        console.log(`✅ Loaded ${allOrganizations.length} organizations`);
        
        // Populate category tiles
        populateCategoryTiles();
        
        // Apply filters and render
        applyFilters();
        
    } catch (error) {
        console.error('Error loading organizations:', error);
        
        // Check if error is due to missing collection
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-orange-500">
                        <i class="fas fa-shield-alt text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Unable to access organizations</p>
                        <p class="text-xs mt-1">Please ensure you have proper permissions and the organizations collection exists.</p>
                        <button onclick="loadOrganizations()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
            // Show empty stats
            updateStatsEmpty();
            populateCategoryTiles();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Failed to load organizations</p>
                        <p class="text-xs mt-1">${error.message}</p>
                        <button onclick="loadOrganizations()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// UPDATE STATS - EMPTY STATE
// ============================================
function updateStatsEmpty() {
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                    <i class="fas fa-building text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Total Organizations</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-check-circle text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Verified Organizations</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                    <i class="fas fa-clock text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Pending Verification</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-times-circle text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Rejected</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                    <i class="fas fa-user-plus text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">This Month Added</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

// ============================================
// POPULATE CATEGORY TILES
// ============================================
function populateCategoryTiles() {
    const container = document.getElementById('categoryTiles');
    if (!container) return;
    
    // If no organizations, show empty state
    if (allOrganizations.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-on-surface-variant text-sm py-2">
                <i class="fas fa-building mr-2"></i> No organizations added yet
            </div>
        `;
        return;
    }
    
    // Count organizations by type
    const typeCounts = {};
    allOrganizations.forEach(org => {
        const type = org.type || 'Other';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    const sortedTypes = Object.keys(typeCounts).sort();
    
    let html = '';
    sortedTypes.forEach(type => {
        const config = typeConfig[type] || { icon: 'fa-building', color: 'bg-gray-50 text-gray-600', borderColor: 'hover:border-gray-300' };
        const count = typeCounts[type] || 0;
        
        html += `
            <div class="category-tile border border-outline-variant rounded-xl p-3 flex items-center gap-3 ${config.borderColor} cursor-pointer transition-all" data-type="${type}">
                <div class="w-9 h-9 ${config.color} rounded-lg flex items-center justify-center">
                    <i class="fas ${config.icon}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-xs font-semibold text-outline">${type}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-lg font-bold text-on-surface">${count}</span>
                        <span class="text-[10px] text-primary font-bold">→</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Add click listeners to category tiles
    container.querySelectorAll('.category-tile').forEach(tile => {
        tile.addEventListener('click', function() {
            const type = this.dataset.type;
            document.getElementById('typeFilter').value = type;
            applyFilters();
            showToast(`Filtering by ${type}...`, 'info');
        });
    });
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
    const type = document.getElementById('typeFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    
    filteredOrganizations = allOrganizations.filter(org => {
        // Search filter
        if (search) {
            const name = (org.name || '').toLowerCase();
            const contact = (org.contactName || org.contact || '').toLowerCase();
            const phone = (org.phone || '').toLowerCase();
            if (!name.includes(search) && !contact.includes(search) && !phone.includes(search)) {
                return false;
            }
        }
        
        // Type filter
        if (type !== 'all' && org.type !== type) {
            return false;
        }
        
        // Status filter
        if (status !== 'all') {
            const orgStatus = org.verificationStatus || org.status || 'pending';
            if (orgStatus !== status) return false;
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
    const tableBody = document.getElementById('organizationsTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredOrganizations.length);
    const pageOrgs = filteredOrganizations.slice(startIndex, endIndex);
    
    if (pageOrgs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-12 text-outline">
                    <i class="fas fa-building-circle-exclamation text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No organizations found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    let html = '';
    pageOrgs.forEach(org => {
        const status = org.verificationStatus || org.status || 'pending';
        const statusClass = getStatusClass(status);
        const statusIcon = getStatusIcon(status);
        const type = org.type || 'Other';
        const typeConfigData = typeConfig[type] || { icon: 'fa-building', color: 'bg-gray-50 text-gray-600' };
        const orgName = org.name || 'Unnamed Organization';
        const orgLogo = org.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(orgName)}&background=0052cc&color=fff&size=40`;
        const contactName = org.contactName || org.contact || 'N/A';
        const phone = org.phone || 'N/A';
        const community = org.community || org.district || 'N/A';
        const createdDate = org.createdAt ? formatDate(org.createdAt) : 'N/A';
        const createdTime = org.createdAt ? formatTime(org.createdAt) : '';
        const orgId = org.orgId || org.id.substring(0, 8);
        
        html += `
            <tr class="table-row-hover cursor-pointer hover:bg-surface-container-low/50 transition-colors" data-id="${org.id}">
                <td class="px-4 py-4">
                    <input class="org-checkbox rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-id="${org.id}"/>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <img alt="${orgName}" class="w-10 h-10 rounded-full border border-outline-variant object-cover" src="${orgLogo}"/>
                        <div>
                            <p class="text-sm font-semibold text-on-surface">${orgName}</p>
                            <p class="text-[11px] text-outline font-medium">${orgId}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-1 text-[10px] font-bold rounded-md ${typeConfigData.color} uppercase">${type}</span>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-medium text-on-surface">${community}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-semibold text-on-surface">${contactName}</p>
                    <p class="text-[11px] text-outline">${phone}</p>
                </td>
                <td class="px-4 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${statusClass} rounded-full">
                        <i class="fas ${statusIcon} text-xs"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-medium text-on-surface">${createdDate}</p>
                    <p class="text-[11px] text-outline uppercase">${createdTime}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center justify-center gap-1">
                        <button class="view-org-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${org.id}" title="View">
                            <i class="fas fa-eye text-sm"></i>
                        </button>
                        ${status === 'pending' ? `
                            <button class="verify-org-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${org.id}" title="Verify">
                                <i class="fas fa-check-circle text-sm"></i>
                            </button>
                            <button class="reject-org-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${org.id}" title="Reject">
                                <i class="fas fa-times-circle text-sm"></i>
                            </button>
                        ` : status === 'rejected' ? `
                            <button class="reconsider-org-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${org.id}" title="Reconsider">
                                <i class="fas fa-sync text-sm"></i>
                            </button>
                        ` : `
                            <button class="edit-org-btn p-1.5 text-blue-400 hover:bg-blue-50 rounded transition-colors" data-id="${org.id}" title="Edit">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                        `}
                        <button class="delete-org-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${org.id}" title="Delete">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    attachTableEventListeners();
    updatePagination();
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    // If no organizations, show empty stats
    if (allOrganizations.length === 0) {
        updateStatsEmpty();
        return;
    }
    
    const total = allOrganizations.length;
    const verified = allOrganizations.filter(o => o.verificationStatus === 'verified' || o.status === 'verified').length;
    const pending = allOrganizations.filter(o => o.verificationStatus === 'pending' || o.status === 'pending').length;
    const rejected = allOrganizations.filter(o => o.verificationStatus === 'rejected' || o.status === 'rejected').length;
    
    // This month
    const now = new Date();
    const thisMonth = allOrganizations.filter(o => {
        if (!o.createdAt) return false;
        const date = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                    <i class="fas fa-building text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Total Organizations</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${total}</span>
                        <span class="text-[10px] font-bold text-green-500 flex items-center">
                            <i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${total > 0 ? '12.4%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-check-circle text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Verified Organizations</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${verified}</span>
                        <span class="text-[10px] font-bold text-green-500 flex items-center">
                            <i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${verified > 0 ? '9.6%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                    <i class="fas fa-clock text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Pending Verification</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${pending}</span>
                        <span class="text-[10px] font-bold text-red-500 flex items-center">
                            <i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${pending > 0 ? '4.8%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-times-circle text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Rejected</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${rejected}</span>
                        <span class="text-[10px] font-bold text-red-500 flex items-center">
                            <i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${rejected > 0 ? '2.1%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                    <i class="fas fa-user-plus text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">This Month Added</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${thisMonth}</span>
                        <span class="text-[10px] font-bold text-green-500 flex items-center">
                            <i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${thisMonth > 0 ? '15.3%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

// ============================================
// UPDATE PAGINATION
// ============================================
function updatePagination() {
    const totalPages = Math.ceil(filteredOrganizations.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredOrganizations.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing <span class="text-on-surface">${filteredOrganizations.length > 0 ? startIndex : 0} - ${endIndex}</span> of <span class="text-on-surface">${filteredOrganizations.length}</span> organizations`;
    
    const controls = document.getElementById('paginationControls');
    let html = '';
    
    // Previous button
    html += `<button class="pagination-prev w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-surface transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left text-sm"></i>
    </button>`;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-sm font-medium transition-colors" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-1 text-outline">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg ${isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface'} text-sm font-medium transition-colors" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-1 text-outline">...</span>`;
        }
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface text-sm font-medium transition-colors" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button class="pagination-next w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-surface transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right text-sm"></i>
    </button>`;
    
    controls.innerHTML = html;
    
    // Attach event listeners
    controls.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                renderTable();
            }
        });
    });
    
    controls.querySelector('.pagination-prev')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
        }
    });
    
    controls.querySelector('.pagination-next')?.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
        }
    });
}

// ============================================
// ATTACH TABLE EVENT LISTENERS
// ============================================
function attachTableEventListeners() {
    // View Organization
    document.querySelectorAll('.view-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showToast('Viewing organization details...', 'info');
            // window.location.href = `organization-detail.html?id=${id}`;
        });
    });
    
    // Edit Organization
    document.querySelectorAll('.edit-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showEditOrganizationModal(id);
        });
    });
    
    // Verify Organization
    document.querySelectorAll('.verify-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            verifyOrganization(id);
        });
    });
    
    // Reject Organization
    document.querySelectorAll('.reject-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            rejectOrganization(id);
        });
    });
    
    // Reconsider Organization
    document.querySelectorAll('.reconsider-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            reconsiderOrganization(id);
        });
    });
    
    // Delete Organization
    document.querySelectorAll('.delete-org-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            deleteOrganization(id);
        });
    });
    
    // Row click - view details
    document.querySelectorAll('#organizationsTableBody tr[data-id]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const id = this.dataset.id;
            showToast('Viewing organization details...', 'info');
            // window.location.href = `organization-detail.html?id=${id}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.org-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedOrganizations.add(this.dataset.id);
            } else {
                selectedOrganizations.delete(this.dataset.id);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.org-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedOrganizations.add(cb.dataset.id);
                } else {
                    selectedOrganizations.delete(cb.dataset.id);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.org-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.org-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// ORGANIZATION ACTIONS
// ============================================
async function verifyOrganization(id) {
    const org = allOrganizations.find(o => o.id === id);
    if (!org) return;
    
    if (!confirm(`Verify "${org.name || 'this organization'}"?`)) return;
    
    try {
        await db.collection('organizations').doc(id).update({
            verificationStatus: 'verified',
            verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${org.name}" verified successfully`, 'success');
        loadOrganizations();
    } catch (error) {
        showToast('Failed to verify organization: ' + error.message, 'error');
    }
}

async function rejectOrganization(id) {
    const org = allOrganizations.find(o => o.id === id);
    if (!org) return;
    
    if (!confirm(`Reject "${org.name || 'this organization'}"?`)) return;
    
    try {
        await db.collection('organizations').doc(id).update({
            verificationStatus: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${org.name}" rejected`, 'success');
        loadOrganizations();
    } catch (error) {
        showToast('Failed to reject organization: ' + error.message, 'error');
    }
}

async function reconsiderOrganization(id) {
    const org = allOrganizations.find(o => o.id === id);
    if (!org) return;
    
    if (!confirm(`Reconsider "${org.name || 'this organization'}"?`)) return;
    
    try {
        await db.collection('organizations').doc(id).update({
            verificationStatus: 'pending',
            reconsideredAt: firebase.firestore.FieldValue.serverTimestamp(),
            reconsideredBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${org.name}" sent for reconsideration`, 'success');
        loadOrganizations();
    } catch (error) {
        showToast('Failed to reconsider organization: ' + error.message, 'error');
    }
}

async function deleteOrganization(id) {
    const org = allOrganizations.find(o => o.id === id);
    if (!org) return;
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${org.name || 'this organization'}"? This action cannot be undone!`)) return;
    
    try {
        await db.collection('organizations').doc(id).delete();
        showToast(`✅ "${org.name}" deleted successfully`, 'success');
        loadOrganizations();
    } catch (error) {
        showToast('Failed to delete organization: ' + error.message, 'error');
    }
}

// ============================================
// SHOW EDIT ORGANIZATION MODAL
// ============================================
function showEditOrganizationModal(id) {
    const org = allOrganizations.find(o => o.id === id);
    if (!org) {
        showToast('Organization not found', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="editModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Edit Organization</h3>
                    <p class="text-sm text-outline mt-1">Update organization information</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Organization Name</label>
                        <input id="editOrgName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${org.name || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Type</label>
                        <select id="editOrgType" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="School" ${org.type === 'School' ? 'selected' : ''}>School</option>
                            <option value="Church" ${org.type === 'Church' ? 'selected' : ''}>Church</option>
                            <option value="NGO" ${org.type === 'NGO' ? 'selected' : ''}>NGO</option>
                            <option value="Government Office" ${org.type === 'Government Office' ? 'selected' : ''}>Government Office</option>
                            <option value="Health Centre" ${org.type === 'Health Centre' ? 'selected' : ''}>Health Centre</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Contact Person</label>
                        <input id="editContactName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${org.contactName || org.contact || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone</label>
                        <input id="editPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${org.phone || ''}" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="editCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${org.community || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Verification Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending" ${(org.verificationStatus === 'pending' || org.status === 'pending') ? 'selected' : ''}>Pending</option>
                            <option value="verified" ${(org.verificationStatus === 'verified' || org.status === 'verified') ? 'selected' : ''}>Verified</option>
                            <option value="rejected" ${(org.verificationStatus === 'rejected' || org.status === 'rejected') ? 'selected' : ''}>Rejected</option>
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
        const name = document.getElementById('editOrgName').value.trim();
        const type = document.getElementById('editOrgType').value;
        const contactName = document.getElementById('editContactName').value.trim();
        const phone = document.getElementById('editPhone').value.trim();
        const community = document.getElementById('editCommunity').value.trim();
        const status = document.getElementById('editStatus').value;
        const orgId = this.dataset.id;
        
        if (!name) {
            showToast('Please enter an organization name', 'error');
            return;
        }
        
        try {
            const updates = {
                name: name,
                type: type,
                contactName: contactName,
                phone: phone,
                community: community,
                verificationStatus: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('organizations').doc(orgId).update(updates);
            
            showToast('✅ Organization updated successfully', 'success');
            container.innerHTML = '';
            loadOrganizations();
        } catch (error) {
            console.error('Error updating organization:', error);
            showToast('Failed to update organization: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW ADD ORGANIZATION MODAL
// ============================================
function showAddOrganizationModal() {
    const modalHtml = `
        <div class="modal-overlay" id="addModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Add Organization</h3>
                    <p class="text-sm text-outline mt-1">Create a new organization</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Organization Name <span class="text-red-500">*</span></label>
                        <input id="addOrgName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter organization name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Type <span class="text-red-500">*</span></label>
                        <select id="addOrgType" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="School">School</option>
                            <option value="Church">Church</option>
                            <option value="NGO">NGO</option>
                            <option value="Government Office">Government Office</option>
                            <option value="Health Centre">Health Centre</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Contact Person</label>
                        <input id="addContactName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter contact person's name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Phone</label>
                        <input id="addPhone" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0241234567" type="tel"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="addCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Kwamankese" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="addStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Create Organization</button>
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
        const name = document.getElementById('addOrgName').value.trim();
        const type = document.getElementById('addOrgType').value;
        const contactName = document.getElementById('addContactName').value.trim();
        const phone = document.getElementById('addPhone').value.trim();
        const community = document.getElementById('addCommunity').value.trim();
        const status = document.getElementById('addStatus').value;
        
        if (!name) {
            showToast('Please enter an organization name', 'error');
            return;
        }
        
        try {
            const orgData = {
                name: name,
                type: type,
                contactName: contactName || 'N/A',
                phone: phone || 'N/A',
                community: community || 'N/A',
                verificationStatus: status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('organizations').add(orgData);
            
            showToast(`✅ Organization "${name}" created successfully`, 'success');
            container.innerHTML = '';
            loadOrganizations();
        } catch (error) {
            console.error('Error creating organization:', error);
            showToast('Failed to create organization: ' + error.message, 'error');
        }
    });
}

// ============================================
// EXPORT ORGANIZATIONS
// ============================================
function exportOrganizations() {
    if (filteredOrganizations.length === 0) {
        showToast('No organizations to export', 'info');
        return;
    }
    
    // Create CSV
    let csv = 'Name,Type,Contact,Phone,Community,Status,Date Added\n';
    filteredOrganizations.forEach(org => {
        const date = org.createdAt ? formatDate(org.createdAt) : 'N/A';
        const status = org.verificationStatus || org.status || 'pending';
        csv += `"${org.name || ''}","${org.type || ''}","${org.contactName || ''}","${org.phone || ''}","${org.community || ''}","${status}","${date}"\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `organizations_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredOrganizations.length} organizations`, 'success');
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
    
    // Add Organization
    document.getElementById('addOrganizationBtn')?.addEventListener('click', showAddOrganizationModal);
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportOrganizations);
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        document.querySelector('.flex-wrap .border')?.focus();
    });
    
    // Search
    document.getElementById('searchFilter')?.addEventListener('input', applyFilters);
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', function() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        applyFilters();
        showToast('Filters cleared', 'info');
    });
    
    // Per page change
    document.getElementById('perPageSelect')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        renderTable();
    });
});

console.log('🔄 BridgeConnect Organizations page loaded with Firestore integration');