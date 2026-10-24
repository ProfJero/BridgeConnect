// ============================================
// ADMIN JOBS PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allJobs = [];
let filteredJobs = [];
let currentPage = 1;
let pageSize = 10;
let selectedJobs = new Set();
let isSidebarRendered = false;
let currentTab = 'all';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusClass(status) {
    const statusMap = {
        'pending': 'status-pending',
        'approved': 'status-approved',
        'rejected': 'status-rejected',
        'expired': 'status-expired'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'fa-clock',
        'approved': 'fa-check-circle',
        'rejected': 'fa-times-circle',
        'expired': 'fa-hourglass-end'
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
            const currentPage = currentPath.split('/').pop() || 'jobs.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'jobs' && currentPage === 'jobs.html');
            
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
                    loadJobs();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// TAB MANAGEMENT
// ============================================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all tabs
            tabBtns.forEach(b => {
                b.classList.remove('tab-active');
                b.classList.remove('border-primary');
                b.classList.remove('text-primary');
                b.classList.add('border-transparent');
                b.classList.add('text-outline');
                b.classList.remove('font-semibold');
                b.classList.add('font-medium');
            });
            
            // Add active class to clicked tab
            this.classList.add('tab-active');
            this.classList.add('border-primary');
            this.classList.add('text-primary');
            this.classList.remove('border-transparent');
            this.classList.remove('text-outline');
            this.classList.add('font-semibold');
            this.classList.remove('font-medium');
            
            currentTab = this.dataset.tab;
            applyFilters();
        });
    });
    
    // Set default active tab
    const defaultTab = document.querySelector('.tab-btn[data-tab="all"]');
    if (defaultTab) {
        defaultTab.classList.add('tab-active');
        defaultTab.classList.add('border-primary');
        defaultTab.classList.add('text-primary');
        defaultTab.classList.remove('border-transparent');
        defaultTab.classList.remove('text-outline');
        defaultTab.classList.add('font-semibold');
        defaultTab.classList.remove('font-medium');
    }
}

// ============================================
// LOAD JOBS FROM FIRESTORE
// ============================================
async function loadJobs() {
    const tableBody = document.getElementById('jobsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-8 text-outline">
                <i class="fas fa-spinner fa-spin text-2xl"></i>
                <p class="mt-2">Loading jobs...</p>
            </td>
        </tr>
    `;
    
    try {
        const userData = contextManager.userData;
        const isOwner = userData?.role === 'platform_owner' || userData?.role === 'owner';
        const userDistrict = userData?.district;
        
        let query = db.collection('jobs');
        
        // If not platform owner, filter by district
        if (!isOwner && userDistrict) {
            query = query.where('district', '==', userDistrict);
        }
        
        // Get all jobs
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        allJobs = [];
        
        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-12 text-outline">
                        <i class="fas fa-briefcase text-3xl text-gray-300 mb-3 block"></i>
                        <p class="text-sm font-medium">No jobs found</p>
                        <p class="text-xs mt-1">Click "Post a Job" to create your first job listing</p>
                    </td>
                </tr>
            `;
            updateStats();
            updatePagination();
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const job = {
                id: doc.id,
                ...data
            };
            allJobs.push(job);
        });
        
        console.log(`✅ Loaded ${allJobs.length} jobs`);
        
        // Update tab counts
        updateTabCounts();
        
        // Apply filters and render
        applyFilters();
        
    } catch (error) {
        console.error('Error loading jobs:', error);
        
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-8 text-orange-500">
                        <i class="fas fa-shield-alt text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Unable to access jobs</p>
                        <p class="text-xs mt-1">Please ensure you have proper permissions and the jobs collection exists.</p>
                        <button onclick="loadJobs()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
            updateStatsEmpty();
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Failed to load jobs</p>
                        <p class="text-xs mt-1">${error.message}</p>
                        <button onclick="loadJobs()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// UPDATE TAB COUNTS
// ============================================
function updateTabCounts() {
    const counts = {
        all: allJobs.length,
        pending: allJobs.filter(j => j.status === 'pending').length,
        approved: allJobs.filter(j => j.status === 'approved').length,
        rejected: allJobs.filter(j => j.status === 'rejected').length,
        expired: allJobs.filter(j => j.status === 'expired').length
    };
    
    document.querySelectorAll('.tab-btn').forEach(tab => {
        const tabName = tab.dataset.tab;
        const count = counts[tabName] || 0;
        if (tabName !== 'all') {
            const label = tab.textContent.split('(')[0].trim();
            tab.textContent = `${label} (${count})`;
        }
    });
}

// ============================================
// UPDATE STATS - EMPTY STATE
// ============================================
function updateStatsEmpty() {
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Pending Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">0</h3>
                    <p class="text-xs text-outline mt-1">Awaiting review</p>
                </div>
                <div class="p-2 bg-orange-50 rounded-lg text-orange-500">
                    <i class="fas fa-clock text-lg"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Approved Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">0</h3>
                    <p class="text-xs text-outline mt-1">Published and active</p>
                </div>
                <div class="p-2 bg-green-50 rounded-lg text-green-500">
                    <i class="fas fa-check-circle text-lg"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Rejected Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">0</h3>
                    <p class="text-xs text-outline mt-1">Not approved</p>
                </div>
                <div class="p-2 bg-red-50 rounded-lg text-red-500">
                    <i class="fas fa-times-circle text-lg"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">This Month Posted</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">0</h3>
                </div>
                <div class="p-2 bg-blue-50 rounded-lg text-blue-500">
                    <i class="fas fa-calendar-plus text-lg"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Total Applications</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">0</h3>
                </div>
                <div class="p-2 bg-purple-50 rounded-lg text-purple-500">
                    <i class="fas fa-users text-lg"></i>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    if (allJobs.length === 0) {
        updateStatsEmpty();
        return;
    }
    
    const pending = allJobs.filter(j => j.status === 'pending').length;
    const approved = allJobs.filter(j => j.status === 'approved').length;
    const rejected = allJobs.filter(j => j.status === 'rejected').length;
    const expired = allJobs.filter(j => j.status === 'expired').length;
    
    // This month
    const now = new Date();
    const thisMonth = allJobs.filter(j => {
        if (!j.createdAt) return false;
        const date = j.createdAt.toDate ? j.createdAt.toDate() : new Date(j.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
    
    // Total applications
    const totalApplications = allJobs.reduce((sum, j) => sum + (j.applications || 0), 0);
    
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Pending Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">${pending}</h3>
                    <p class="text-xs text-outline mt-1">Awaiting review</p>
                </div>
                <div class="p-2 bg-orange-50 rounded-lg text-orange-500">
                    <i class="fas fa-clock text-lg"></i>
                </div>
            </div>
            <button onclick="switchTab('pending')" class="mt-3 text-xs font-semibold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100 hover:bg-orange-100 transition-colors">View Pending</button>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Approved Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">${approved}</h3>
                    <p class="text-xs text-outline mt-1">Published and active</p>
                </div>
                <div class="p-2 bg-green-50 rounded-lg text-green-500">
                    <i class="fas fa-check-circle text-lg"></i>
                </div>
            </div>
            <button onclick="switchTab('approved')" class="mt-3 text-xs font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 hover:bg-green-100 transition-colors">View Approved</button>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Rejected Jobs</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">${rejected}</h3>
                    <p class="text-xs text-outline mt-1">Not approved</p>
                </div>
                <div class="p-2 bg-red-50 rounded-lg text-red-500">
                    <i class="fas fa-times-circle text-lg"></i>
                </div>
            </div>
            <button onclick="switchTab('rejected')" class="mt-3 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100 hover:bg-red-100 transition-colors">View Rejected</button>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">This Month Posted</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">${thisMonth}</h3>
                    <div class="flex items-center gap-1 text-green-600 text-xs font-bold mt-1">
                        <i class="fas fa-arrow-up text-[10px]"></i> ${thisMonth > 0 ? '18.6%' : '0%'}
                        <span class="text-outline font-normal">vs last month</span>
                    </div>
                </div>
                <div class="p-2 bg-blue-50 rounded-lg text-blue-500">
                    <i class="fas fa-calendar-plus text-lg"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <p class="text-xs font-semibold text-outline uppercase tracking-wider">Total Applications</p>
                    <h3 class="text-3xl font-bold text-on-surface mt-1">${totalApplications}</h3>
                    <div class="flex items-center gap-1 text-green-600 text-xs font-bold mt-1">
                        <i class="fas fa-arrow-up text-[10px]"></i> ${totalApplications > 0 ? '21.4%' : '0%'}
                        <span class="text-outline font-normal">vs last month</span>
                    </div>
                </div>
                <div class="p-2 bg-purple-50 rounded-lg text-purple-500">
                    <i class="fas fa-users text-lg"></i>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tab) {
            btn.click();
        }
    });
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
    const type = document.getElementById('typeFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    
    filteredJobs = allJobs.filter(job => {
        // Search filter
        if (search) {
            const title = (job.title || '').toLowerCase();
            const employer = (job.employer || job.employerName || '').toLowerCase();
            const description = (job.description || '').toLowerCase();
            if (!title.includes(search) && !employer.includes(search) && !description.includes(search)) {
                return false;
            }
        }
        
        // Type filter
        if (type !== 'all' && job.type !== type) {
            return false;
        }
        
        // Status filter
        if (status !== 'all') {
            const jobStatus = job.status || 'pending';
            if (jobStatus !== status) return false;
        }
        
        // Tab filter
        if (currentTab !== 'all') {
            const jobStatus = job.status || 'pending';
            if (jobStatus !== currentTab) return false;
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
    const tableBody = document.getElementById('jobsTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredJobs.length);
    const pageJobs = filteredJobs.slice(startIndex, endIndex);
    
    if (pageJobs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12 text-outline">
                    <i class="fas fa-briefcase text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No jobs found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    let html = '';
    pageJobs.forEach(job => {
        const status = job.status || 'pending';
        const statusClass = getStatusClass(status);
        const statusIcon = getStatusIcon(status);
        const jobTitle = job.title || 'Untitled Job';
        const employer = job.employer || job.employerName || 'Unknown Employer';
        const jobType = job.type || 'Full-time';
        const community = job.community || job.district || 'N/A';
        const applications = job.applications || 0;
        const createdDate = job.createdAt ? formatDate(job.createdAt) : 'N/A';
        const createdTime = job.createdAt ? formatTime(job.createdAt) : '';
        const jobId = job.jobId || job.id.substring(0, 8);
        const initials = getInitials(employer);
        
        const employerLogo = job.employerLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(employer)}&background=6366f1&color=fff&size=32`;
        
        html += `
            <tr class="table-row-hover cursor-pointer hover:bg-surface-container-low/50 transition-colors" data-id="${job.id}">
                <td class="px-4 py-4">
                    <input class="job-checkbox rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-id="${job.id}"/>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">${initials}</div>
                        <div>
                            <p class="font-semibold text-on-surface">${jobTitle}</p>
                            <p class="text-[10px] text-outline uppercase">JOB-${jobId}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4 text-on-surface-variant">
                    <div class="flex items-center gap-2">
                        <img class="w-6 h-6 rounded-md object-cover" src="${employerLogo}" alt="${employer}"/>
                        <span>${employer}</span>
                    </div>
                </td>
                <td class="px-4 py-4 text-on-surface-variant">${community}</td>
                <td class="px-4 py-4">
                    <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[11px] font-medium border border-blue-100">${jobType}</span>
                </td>
                <td class="px-4 py-4">
                    <p class="text-on-surface text-sm">${createdDate}</p>
                    <p class="text-[11px] text-outline uppercase">${createdTime}</p>
                </td>
                <td class="px-4 py-4 font-medium text-on-surface-variant">${applications}</td>
                <td class="px-4 py-4">
                    <span class="px-2.5 py-1 ${statusClass} text-[11px] font-semibold rounded-md border">
                        ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        ${status === 'pending' ? `
                            <button class="approve-job-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${job.id}" title="Approve"><i class="fas fa-check-circle text-sm"></i></button>
                            <button class="reject-job-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${job.id}" title="Reject"><i class="fas fa-times-circle text-sm"></i></button>
                        ` : `
                            <button class="view-job-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${job.id}" title="View"><i class="fas fa-eye text-sm"></i></button>
                            <button class="edit-job-btn p-1.5 text-blue-400 hover:bg-blue-50 rounded transition-colors" data-id="${job.id}" title="Edit"><i class="fas fa-edit text-sm"></i></button>
                            ${status === 'approved' ? `
                                <button class="expire-job-btn p-1.5 text-orange-400 hover:bg-orange-50 rounded transition-colors" data-id="${job.id}" title="Mark Expired"><i class="fas fa-hourglass-end text-sm"></i></button>
                            ` : status === 'expired' ? `
                                <button class="renew-job-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${job.id}" title="Renew"><i class="fas fa-rotate text-sm"></i></button>
                            ` : ''}
                        `}
                        <button class="delete-job-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${job.id}" title="Delete"><i class="fas fa-trash text-sm"></i></button>
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
// UPDATE PAGINATION
// ============================================
function updatePagination() {
    const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredJobs.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing <span class="font-bold text-on-surface">${filteredJobs.length > 0 ? startIndex : 0} - ${endIndex}</span> of <span class="font-bold text-on-surface">${filteredJobs.length}</span> jobs`;
    
    const controls = document.getElementById('paginationControls');
    let html = '';
    
    html += `<button class="pagination-prev p-1.5 rounded-md text-outline hover:bg-surface transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left text-sm"></i>
    </button>`;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface text-xs font-medium transition-colors" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="text-outline px-1">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button class="page-btn w-8 h-8 flex items-center justify-center rounded-md ${isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-surface'} text-xs font-medium transition-colors" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="text-outline px-1">...</span>`;
        }
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface text-xs font-medium transition-colors" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `<button class="pagination-next p-1.5 rounded-md text-outline hover:bg-surface transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right text-sm"></i>
    </button>`;
    
    controls.innerHTML = html;
    
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
    // View Job
    document.querySelectorAll('.view-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showToast('Viewing job details...', 'info');
            // window.location.href = `job-detail.html?id=${id}`;
        });
    });
    
    // Edit Job
    document.querySelectorAll('.edit-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showEditJobModal(id);
        });
    });
    
    // Approve Job
    document.querySelectorAll('.approve-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            approveJob(id);
        });
    });
    
    // Reject Job
    document.querySelectorAll('.reject-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            rejectJob(id);
        });
    });
    
    // Expire Job
    document.querySelectorAll('.expire-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            expireJob(id);
        });
    });
    
    // Renew Job
    document.querySelectorAll('.renew-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            renewJob(id);
        });
    });
    
    // Delete Job
    document.querySelectorAll('.delete-job-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            deleteJob(id);
        });
    });
    
    // Row click - view details
    document.querySelectorAll('#jobsTableBody tr[data-id]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const id = this.dataset.id;
            showToast('Viewing job details...', 'info');
            // window.location.href = `job-detail.html?id=${id}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.job-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedJobs.add(this.dataset.id);
            } else {
                selectedJobs.delete(this.dataset.id);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.job-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedJobs.add(cb.dataset.id);
                } else {
                    selectedJobs.delete(cb.dataset.id);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.job-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.job-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// JOB ACTIONS
// ============================================
async function approveJob(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    if (!confirm(`Approve "${job.title || 'this job'}"?`)) return;
    
    try {
        await db.collection('jobs').doc(id).update({
            status: 'approved',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${job.title}" approved successfully`, 'success');
        loadJobs();
    } catch (error) {
        showToast('Failed to approve job: ' + error.message, 'error');
    }
}

async function rejectJob(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    if (!confirm(`Reject "${job.title || 'this job'}"?`)) return;
    
    try {
        await db.collection('jobs').doc(id).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${job.title}" rejected`, 'success');
        loadJobs();
    } catch (error) {
        showToast('Failed to reject job: ' + error.message, 'error');
    }
}

async function expireJob(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    if (!confirm(`Mark "${job.title || 'this job'}" as expired?`)) return;
    
    try {
        await db.collection('jobs').doc(id).update({
            status: 'expired',
            expiredAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`✅ "${job.title}" marked as expired`, 'success');
        loadJobs();
    } catch (error) {
        showToast('Failed to expire job: ' + error.message, 'error');
    }
}

async function renewJob(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    if (!confirm(`Renew "${job.title || 'this job'}"?`)) return;
    
    try {
        await db.collection('jobs').doc(id).update({
            status: 'approved',
            renewedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`✅ "${job.title}" renewed successfully`, 'success');
        loadJobs();
    } catch (error) {
        showToast('Failed to renew job: ' + error.message, 'error');
    }
}

async function deleteJob(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) return;
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${job.title || 'this job'}"? This action cannot be undone!`)) return;
    
    try {
        await db.collection('jobs').doc(id).delete();
        showToast(`✅ "${job.title}" deleted successfully`, 'success');
        loadJobs();
    } catch (error) {
        showToast('Failed to delete job: ' + error.message, 'error');
    }
}

// ============================================
// SHOW EDIT JOB MODAL
// ============================================
function showEditJobModal(id) {
    const job = allJobs.find(j => j.id === id);
    if (!job) {
        showToast('Job not found', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="editModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Edit Job</h3>
                    <p class="text-sm text-outline mt-1">Update job information</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Job Title</label>
                        <input id="editJobTitle" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${job.title || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Employer</label>
                        <input id="editEmployer" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${job.employer || job.employerName || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Job Type</label>
                        <select id="editType" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="Full-time" ${job.type === 'Full-time' ? 'selected' : ''}>Full-time</option>
                            <option value="Part-time" ${job.type === 'Part-time' ? 'selected' : ''}>Part-time</option>
                            <option value="Contract" ${job.type === 'Contract' ? 'selected' : ''}>Contract</option>
                            <option value="Internship" ${job.type === 'Internship' ? 'selected' : ''}>Internship</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="editCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${job.community || job.district || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Description</label>
                        <textarea id="editDescription" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="3">${job.description || ''}</textarea>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending" ${job.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="approved" ${job.status === 'approved' ? 'selected' : ''}>Approved</option>
                            <option value="rejected" ${job.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            <option value="expired" ${job.status === 'expired' ? 'selected' : ''}>Expired</option>
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
        const title = document.getElementById('editJobTitle').value.trim();
        const employer = document.getElementById('editEmployer').value.trim();
        const type = document.getElementById('editType').value;
        const community = document.getElementById('editCommunity').value.trim();
        const description = document.getElementById('editDescription').value.trim();
        const status = document.getElementById('editStatus').value;
        const jobId = this.dataset.id;
        
        if (!title) {
            showToast('Please enter a job title', 'error');
            return;
        }
        if (!employer) {
            showToast('Please enter an employer name', 'error');
            return;
        }
        
        try {
            const updates = {
                title: title,
                employer: employer,
                type: type,
                community: community,
                description: description,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('jobs').doc(jobId).update(updates);
            
            showToast('✅ Job updated successfully', 'success');
            container.innerHTML = '';
            loadJobs();
        } catch (error) {
            console.error('Error updating job:', error);
            showToast('Failed to update job: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW POST JOB MODAL
// ============================================
function showPostJobModal() {
    const modalHtml = `
        <div class="modal-overlay" id="addModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Post a New Job</h3>
                    <p class="text-sm text-outline mt-1">Create a new job listing</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Job Title <span class="text-red-500">*</span></label>
                        <input id="addJobTitle" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter job title" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Employer <span class="text-red-500">*</span></label>
                        <input id="addEmployer" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter employer name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Job Type</label>
                        <select id="addType" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="Full-time">Full-time</option>
                            <option value="Part-time">Part-time</option>
                            <option value="Contract">Contract</option>
                            <option value="Internship">Internship</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="addCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Kwamankese" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Description</label>
                        <textarea id="addDescription" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="3" placeholder="Job description..."></textarea>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="addStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending">Pending (Needs Approval)</option>
                            <option value="approved">Approved</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Post Job</button>
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
        const title = document.getElementById('addJobTitle').value.trim();
        const employer = document.getElementById('addEmployer').value.trim();
        const type = document.getElementById('addType').value;
        const community = document.getElementById('addCommunity').value.trim();
        const description = document.getElementById('addDescription').value.trim();
        const status = document.getElementById('addStatus').value;
        
        if (!title) {
            showToast('Please enter a job title', 'error');
            return;
        }
        if (!employer) {
            showToast('Please enter an employer name', 'error');
            return;
        }
        
        try {
            const jobData = {
                title: title,
                employer: employer,
                type: type,
                community: community || 'N/A',
                description: description || '',
                status: status,
                applications: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('jobs').add(jobData);
            
            showToast(`✅ Job "${title}" posted successfully`, 'success');
            container.innerHTML = '';
            loadJobs();
        } catch (error) {
            console.error('Error creating job:', error);
            showToast('Failed to post job: ' + error.message, 'error');
        }
    });
}

// ============================================
// EXPORT JOBS
// ============================================
function exportJobs() {
    if (filteredJobs.length === 0) {
        showToast('No jobs to export', 'info');
        return;
    }
    
    let csv = 'Title,Employer,Type,Community,Status,Applications,Date Posted\n';
    filteredJobs.forEach(job => {
        const date = job.createdAt ? formatDate(job.createdAt) : 'N/A';
        csv += `"${job.title || ''}","${job.employer || ''}","${job.type || ''}","${job.community || ''}","${job.status || ''}","${job.applications || 0}","${date}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredJobs.length} jobs`, 'success');
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
    setupTabs();
    
    // Post a Job
    document.getElementById('postJobBtn')?.addEventListener('click', showPostJobModal);
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportJobs);
    
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

console.log('🔄 BridgeConnect Jobs page loaded with Firestore integration');