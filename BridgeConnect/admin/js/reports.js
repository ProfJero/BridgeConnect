// ============================================
// ADMIN REPORTS & MODERATION PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allReports = [];
let filteredReports = [];
let currentPage = 1;
let pageSize = 10;
let selectedReports = new Set();
let isSidebarRendered = false;
let currentTab = 'all';
let moderators = [];
let communities = [];
let reportStats = {};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getSeverityClass(severity) {
    const map = {
        'high': 'severity-high',
        'medium': 'severity-medium',
        'low': 'severity-low'
    };
    return map[severity] || 'severity-medium';
}

function getStatusClass(status) {
    const map = {
        'pending': 'status-pending',
        'investigation': 'status-investigation',
        'escalated': 'status-escalated',
        'resolved': 'status-resolved'
    };
    return map[status] || 'status-pending';
}

function getStatusIcon(status) {
    const icons = {
        'pending': 'fa-clock',
        'investigation': 'fa-search',
        'escalated': 'fa-arrow-up',
        'resolved': 'fa-check-circle'
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
            const currentPage = currentPath.split('/').pop() || 'reports.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'reports' && currentPage === 'reports.html');
            
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
                    loadReports();
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
            tabBtns.forEach(b => {
                b.classList.remove('border-primary', 'text-primary', 'font-semibold');
                b.classList.add('border-transparent', 'text-outline', 'font-medium');
            });
            
            this.classList.add('border-primary', 'text-primary', 'font-semibold');
            this.classList.remove('border-transparent', 'text-outline', 'font-medium');
            
            currentTab = this.dataset.tab;
            applyFilters();
        });
    });
}

// ============================================
// LOAD REPORTS FROM FIRESTORE
// ============================================
async function loadReports() {
    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center py-8 text-outline">
                <i class="fas fa-spinner fa-spin text-2xl"></i>
                <p class="mt-2">Loading reports...</p>
            </td>
        </tr>
    `;
    
    try {
        const userData = contextManager.userData;
        const isOwner = userData?.role === 'platform_owner' || userData?.role === 'owner';
        const userDistrict = userData?.district;
        
        let query = db.collection('reports');
        
        // If not platform owner, filter by district
        if (!isOwner && userDistrict) {
            query = query.where('district', '==', userDistrict);
        }
        
        // Get all reports
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        allReports = [];
        moderators = [];
        communities = [];
        const communityCounts = {};
        const typeCounts = {};
        const statusCounts = {};
        
        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center py-12 text-outline">
                        <i class="fas fa-flag text-3xl text-gray-300 mb-3 block"></i>
                        <p class="text-sm font-medium">No reports found</p>
                        <p class="text-xs mt-1">The platform is clean!</p>
                    </td>
                </tr>
            `;
            updateMetricsEmpty();
            updatePagination();
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const report = {
                id: doc.id,
                ...data
            };
            allReports.push(report);
            
            // Collect communities
            if (data.community) {
                communityCounts[data.community] = (communityCounts[data.community] || 0) + 1;
                if (!communities.includes(data.community)) {
                    communities.push(data.community);
                }
            }
            
            // Collect types
            if (data.type) {
                typeCounts[data.type] = (typeCounts[data.type] || 0) + 1;
            }
            
            // Collect statuses
            if (data.status) {
                statusCounts[data.status] = (statusCounts[data.status] || 0) + 1;
            }
            
            // Collect moderators
            if (data.moderator) {
                if (!moderators.some(m => m.name === data.moderator)) {
                    moderators.push({
                        name: data.moderator,
                        avatar: data.moderatorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.moderator)}&background=6366f1&color=fff&size=16`,
                        resolved: data.resolvedCount || 0,
                        avgTime: data.avgTime || 'N/A'
                    });
                }
            }
        });
        
        console.log(`✅ Loaded ${allReports.length} reports`);
        
        // Populate community filter
        populateCommunityFilter();
        
        // Update metrics
        updateMetrics(typeCounts, statusCounts);
        
        // Apply filters and render
        applyFilters();
        
        // Update analytics
        updateAnalytics(typeCounts, communityCounts, statusCounts);
        updateModeratorPerformance();
        updateRecentActivity();
        updateHighPriorityCases();
        updateInvestigationSummary(statusCounts);
        updateTopCommunities(communityCounts);
        updateSafetyScore(statusCounts);
        
    } catch (error) {
        console.error('Error loading reports:', error);
        
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center py-8 text-orange-500">
                        <i class="fas fa-shield-alt text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Unable to access reports</p>
                        <p class="text-xs mt-1">Please ensure you have proper permissions.</p>
                        <button onclick="loadReports()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center py-8 text-red-500">
                        <i class="fas fa-exclamation-circle text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Failed to load reports</p>
                        <p class="text-xs mt-1">${error.message}</p>
                        <button onclick="loadReports()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                            <i class="fas fa-sync mr-2"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// POPULATE COMMUNITY FILTER
// ============================================
function populateCommunityFilter() {
    const select = document.getElementById('communityFilter');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Communities</option>';
    
    communities.sort().forEach(community => {
        const option = document.createElement('option');
        option.value = community;
        option.textContent = community;
        select.appendChild(option);
    });
}

// ============================================
// UPDATE METRICS - EMPTY STATE
// ============================================
function updateMetricsEmpty() {
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><i class="fas fa-file-alt"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Total Reports</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-red-50 text-red-600 rounded-lg"><i class="fas fa-shield-alt"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Fraud</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-orange-50 text-orange-600 rounded-lg"><i class="fas fa-envelope-open-text"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Spam</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-purple-50 text-purple-600 rounded-lg"><i class="fas fa-user-minus"></i></div>
                <p class="text-xs font-medium text-outline uppercase">User</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-green-50 text-green-600 rounded-lg"><i class="fas fa-box"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Products</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><i class="fas fa-store"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Business</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i class="fas fa-check-circle"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Resolved</p>
            </div>
            <h3 class="text-2xl font-bold text-on-surface">0</h3>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

// ============================================
// UPDATE METRICS
// ============================================
function updateMetrics(typeCounts, statusCounts) {
    const total = allReports.length;
    const fraud = typeCounts['fraud'] || 0;
    const spam = typeCounts['spam'] || 0;
    const user = typeCounts['user'] || 0;
    const product = typeCounts['product'] || 0;
    const business = typeCounts['business'] || 0;
    const resolved = statusCounts['resolved'] || 0;
    
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><i class="fas fa-file-alt"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Total Reports</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${total}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${total > 0 ? '18.6%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-red-50 text-red-600 rounded-lg"><i class="fas fa-shield-alt"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Fraud</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${fraud}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${fraud > 0 ? '12.4%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-orange-50 text-orange-600 rounded-lg"><i class="fas fa-envelope-open-text"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Spam</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${spam}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${spam > 0 ? '8.7%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-purple-50 text-purple-600 rounded-lg"><i class="fas fa-user-minus"></i></div>
                <p class="text-xs font-medium text-outline uppercase">User</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${user}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${user > 0 ? '15.2%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-green-50 text-green-600 rounded-lg"><i class="fas fa-box"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Products</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${product}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${product > 0 ? '11.3%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><i class="fas fa-store"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Business</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${business}</h3>
                <p class="text-[10px] font-bold text-red-500 flex items-center"><i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${business > 0 ? '2.1%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-3 mb-2">
                <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><i class="fas fa-check-circle"></i></div>
                <p class="text-xs font-medium text-outline uppercase">Resolved</p>
            </div>
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-bold text-on-surface">${resolved}</h3>
                <p class="text-[10px] font-bold text-green-500 flex items-center"><i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${resolved > 0 ? '21.6%' : '0%'}</p>
            </div>
            <p class="text-[10px] text-outline mt-1">vs last month</p>
        </div>
    `;
    
    document.getElementById('metricCards').innerHTML = metricsHtml;
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('globalSearch')?.value?.toLowerCase() || '';
    const type = document.getElementById('typeFilter')?.value || 'all';
    const community = document.getElementById('communityFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    const severity = document.getElementById('severityFilter')?.value || 'all';
    
    filteredReports = allReports.filter(report => {
        // Search filter
        if (search) {
            const id = (report.reportId || report.id || '').toLowerCase();
            const item = (report.itemName || report.reportedItem || '').toLowerCase();
            const reporter = (report.reporterName || '').toLowerCase();
            if (!id.includes(search) && !item.includes(search) && !reporter.includes(search)) {
                return false;
            }
        }
        
        // Type filter
        if (type !== 'all' && report.type !== type) {
            return false;
        }
        
        // Community filter
        if (community !== 'all' && report.community !== community) {
            return false;
        }
        
        // Status filter
        if (status !== 'all') {
            const reportStatus = report.status || 'pending';
            if (reportStatus !== status) return false;
        }
        
        // Severity filter
        if (severity !== 'all' && report.severity !== severity) {
            return false;
        }
        
        // Tab filter
        if (currentTab !== 'all') {
            if (currentTab === 'resolved') {
                if (report.status !== 'resolved') return false;
            } else {
                if (report.type !== currentTab) return false;
            }
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
    const tableBody = document.getElementById('reportsTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredReports.length);
    const pageReports = filteredReports.slice(startIndex, endIndex);
    
    if (pageReports.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" class="text-center py-12 text-outline">
                    <i class="fas fa-flag text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No reports found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    let html = '';
    pageReports.forEach(report => {
        const type = report.type || 'general';
        const status = report.status || 'pending';
        const severity = report.severity || 'medium';
        const severityClass = getSeverityClass(severity);
        const statusClass = getStatusClass(status);
        const statusIcon = getStatusIcon(status);
        const reportId = report.reportId || `RPT-${report.id.substring(0, 8).toUpperCase()}`;
        const itemName = report.itemName || report.reportedItem || 'Unknown Item';
        const reporterName = report.reporterName || 'Unknown';
        const reporterAvatar = report.reporterAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reporterName)}&background=6366f1&color=fff&size=24`;
        const community = report.community || 'N/A';
        const moderator = report.moderator || 'Unassigned';
        const moderatorAvatar = report.moderatorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(moderator)}&background=6366f1&color=fff&size=24`;
        const createdDate = report.createdAt ? formatDate(report.createdAt) : 'N/A';
        const createdTime = report.createdAt ? formatTime(report.createdAt) : '';
        
        const typeColors = {
            'fraud': 'text-red-600',
            'spam': 'text-orange-600',
            'user': 'text-purple-600',
            'product': 'text-green-600',
            'business': 'text-cyan-600'
        };
        
        const typeIcons = {
            'fraud': 'fa-exclamation-triangle',
            'spam': 'fa-envelope-open-text',
            'user': 'fa-user-minus',
            'product': 'fa-box',
            'business': 'fa-store'
        };
        
        const typeColor = typeColors[type] || 'text-gray-600';
        const typeIcon = typeIcons[type] || 'fa-flag';
        
        html += `
            <tr class="table-row-hover cursor-pointer hover:bg-surface-container-low/50 transition-colors" data-id="${report.id}">
                <td class="px-4 py-4">
                    <input class="report-checkbox rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-id="${report.id}"/>
                </td>
                <td class="px-4 py-4 font-medium text-outline">${reportId}</td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2 ${typeColor} font-semibold">
                        <i class="fas ${typeIcon}"></i> ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </div>
                </td>
                <td class="px-4 py-4">
                    <p class="font-semibold text-on-surface">${itemName}</p>
                    <p class="text-[10px] text-outline flex items-center gap-1"><i class="fas ${report.itemType === 'business' ? 'fa-building' : report.itemType === 'user' ? 'fa-user' : report.itemType === 'product' ? 'fa-box' : 'fa-comment'}"></i> ${report.itemType || 'General'}</p>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <img alt="${reporterName}" class="w-6 h-6 rounded-full object-cover" src="${reporterAvatar}"/>
                        <div>
                            <p class="font-semibold text-on-surface">${reporterName}</p>
                            <p class="text-[10px] text-outline">${report.reporterPhone || ''}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4 text-outline">${community}</td>
                <td class="px-4 py-4">
                    <p class="text-on-surface">${createdDate}</p>
                    <p class="text-[10px] text-outline">${createdTime}</p>
                </td>
                <td class="px-4 py-4"><span class="status-badge ${severityClass}">${severity.charAt(0).toUpperCase() + severity.slice(1)}</span></td>
                <td class="px-4 py-4">
                    <span class="status-badge ${statusClass} flex items-center gap-1">
                        <i class="fas ${statusIcon} text-xs"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-2">
                        <img alt="${moderator}" class="w-6 h-6 rounded-full object-cover" src="${moderatorAvatar}"/>
                        <span>${moderator}</span>
                    </div>
                </td>
                <td class="px-4 py-4 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button class="view-report-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${report.id}" title="View"><i class="fas fa-eye text-sm"></i></button>
                        ${status !== 'resolved' ? `
                            <button class="resolve-report-btn px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded text-[10px] font-bold hover:bg-green-100 transition-colors" data-id="${report.id}">Resolve</button>
                            <button class="escalate-report-btn px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded text-[10px] font-bold hover:bg-purple-100 transition-colors" data-id="${report.id}">Escalate</button>
                        ` : ''}
                        <button class="more-report-btn p-1.5 text-outline hover:bg-surface rounded transition-colors" data-id="${report.id}"><i class="fas fa-ellipsis-v text-sm"></i></button>
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
    const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredReports.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing ${filteredReports.length > 0 ? startIndex : 0} to ${endIndex} of ${filteredReports.length} reports`;
    
    const controls = document.getElementById('paginationControls');
    let html = '';
    
    html += `<button class="pagination-prev p-1 text-outline hover:text-on-surface transition-colors disabled:opacity-50" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left text-sm"></i>
    </button>`;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center bg-primary text-white rounded text-xs font-bold" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="text-outline">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        html += `
            <button class="page-btn w-8 h-8 flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'hover:bg-surface'} rounded text-xs font-medium text-on-surface-variant transition-colors" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="text-outline">...</span>`;
        }
        html += `<button class="page-btn w-8 h-8 flex items-center justify-center hover:bg-surface rounded text-xs font-medium text-on-surface-variant transition-colors" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    html += `<button class="pagination-next p-1 text-outline hover:text-on-surface transition-colors" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right text-sm"></i>
    </button>`;
    
    html += `
        <select class="ml-4 text-[10px] border border-outline-variant rounded py-1 bg-surface focus:ring-1 focus:ring-primary focus:border-primary outline-none px-2" id="perPageSelect">
            <option value="10" ${pageSize === 10 ? 'selected' : ''}>10 / page</option>
            <option value="20" ${pageSize === 20 ? 'selected' : ''}>20 / page</option>
            <option value="50" ${pageSize === 50 ? 'selected' : ''}>50 / page</option>
        </select>
    `;
    
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
    
    controls.querySelector('#perPageSelect')?.addEventListener('change', function() {
        pageSize = parseInt(this.value);
        currentPage = 1;
        renderTable();
    });
}

// ============================================
// ATTACH TABLE EVENT LISTENERS
// ============================================
function attachTableEventListeners() {
    // View Report
    document.querySelectorAll('.view-report-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showToast('Viewing report details...', 'info');
            // window.location.href = `report-detail.html?id=${id}`;
        });
    });
    
    // Resolve Report
    document.querySelectorAll('.resolve-report-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            resolveReport(id);
        });
    });
    
    // Escalate Report
    document.querySelectorAll('.escalate-report-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            escalateReport(id);
        });
    });
    
    // More options
    document.querySelectorAll('.more-report-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showMoreOptions(id);
        });
    });
    
    // Row click - view details
    document.querySelectorAll('#reportsTableBody tr[data-id]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const id = this.dataset.id;
            showToast('Viewing report details...', 'info');
            // window.location.href = `report-detail.html?id=${id}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.report-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedReports.add(this.dataset.id);
            } else {
                selectedReports.delete(this.dataset.id);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.report-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedReports.add(cb.dataset.id);
                } else {
                    selectedReports.delete(cb.dataset.id);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.report-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.report-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// REPORT ACTIONS
// ============================================
async function resolveReport(id) {
    const report = allReports.find(r => r.id === id);
    if (!report) return;
    
    if (!confirm(`Resolve report ${report.reportId || id}?`)) return;
    
    try {
        await db.collection('reports').doc(id).update({
            status: 'resolved',
            resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            resolvedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ Report resolved successfully`, 'success');
        loadReports();
    } catch (error) {
        showToast('Failed to resolve report: ' + error.message, 'error');
    }
}

async function escalateReport(id) {
    const report = allReports.find(r => r.id === id);
    if (!report) return;
    
    const reason = prompt('Reason for escalating this report:');
    if (reason === null) return;
    
    if (!reason.trim()) {
        showToast('Please provide a reason for escalation.', 'error');
        return;
    }
    
    try {
        await db.collection('reports').doc(id).update({
            status: 'escalated',
            escalationReason: reason,
            escalatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            escalatedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ Report escalated. Reason: ${reason}`, 'info');
        loadReports();
    } catch (error) {
        showToast('Failed to escalate report: ' + error.message, 'error');
    }
}

function showMoreOptions(id) {
    const report = allReports.find(r => r.id === id);
    if (!report) return;
    
    const modalHtml = `
        <div class="modal-overlay" id="moreModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Report Options</h3>
                    <p class="text-sm text-outline mt-1">${report.reportId || id}</p>
                </div>
                <div class="p-4 space-y-1">
                    <button class="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 text-sm" onclick="showToast('Viewing report details...', 'info')">
                        <i class="fas fa-eye text-blue-500 w-5"></i> View Details
                    </button>
                    <button class="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 text-sm" onclick="showToast('Assigning moderator...', 'info')">
                        <i class="fas fa-user-check text-green-500 w-5"></i> Assign Moderator
                    </button>
                    <button class="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 text-sm" onclick="showToast('Adding note...', 'info')">
                        <i class="fas fa-sticky-note text-yellow-500 w-5"></i> Add Note
                    </button>
                    <hr class="my-2 border-gray-200"/>
                    <button class="w-full text-left px-4 py-3 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3 text-sm text-red-600" onclick="if(confirm('Delete this report?')) { showToast('Report deleted.', 'error'); closeModal(); }">
                        <i class="fas fa-trash w-5"></i> Delete Report
                    </button>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                    <button class="modal-close px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;
    
    const overlay = document.getElementById('moreModalOverlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) container.innerHTML = '';
    });
}

function closeModal() {
    document.getElementById('modalContainer').innerHTML = '';
}

// ============================================
// UPDATE ANALYTICS
// ============================================
function updateAnalytics(typeCounts, communityCounts, statusCounts) {
    const total = allReports.length;
    document.getElementById('trendTotal').textContent = total;
    document.getElementById('trendChange').textContent = `↑ ${total > 0 ? '18.6%' : '0%'}`;
    
    // Category chart
    const chartContainer = document.getElementById('categoryChart');
    const categories = ['Fraud', 'Spam', 'User', 'Product', 'Business'];
    const colors = ['#3b82f6', '#ef4444', '#8b5cf6', '#22c55e', '#06b6d4'];
    const values = categories.map(c => typeCounts[c.toLowerCase()] || 0);
    const totalVal = values.reduce((a, b) => a + b, 0) || 1;
    
    let offset = 0;
    const segments = values.map((val, i) => {
        const percentage = (val / totalVal) * 100;
        const segment = {
            color: colors[i],
            percentage: percentage,
            label: categories[i],
            count: val
        };
        return segment;
    });
    
    // Create pie chart with conic-gradient
    const gradient = segments.map((s, i) => {
        const start = offset;
        offset += s.percentage;
        return `${s.color} ${start}% ${offset}%`;
    }).join(', ');
    
    chartContainer.innerHTML = `
        <div class="w-full h-full rounded-full" style="background: conic-gradient(${gradient});"></div>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-sm font-bold text-on-surface">${total}</span>
            <span class="text-[8px] text-outline uppercase">Total</span>
        </div>
    `;
    
    // Category legend
    const legendContainer = document.getElementById('categoryLegend');
    legendContainer.innerHTML = segments.map(s => `
        <div class="flex justify-between items-center text-[9px]">
            <div class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full" style="background: ${s.color}"></span>
                <span class="text-outline">${s.label}</span>
            </div>
            <span class="font-bold">${s.count} (${s.percentage.toFixed(1)}%)</span>
        </div>
    `).join('');
    
    // Trend chart
    const trendContainer = document.getElementById('trendChart');
    // Generate random data for trend
    const trendData = Array.from({length: 12}, () => Math.floor(Math.random() * 100) + 20);
    const maxTrend = Math.max(...trendData, 1);
    
    trendContainer.innerHTML = trendData.map((val, i) => `
        <div class="flex-1 flex items-end justify-center">
            <div class="w-full max-w-[20px] bg-blue-500 rounded-sm hover:bg-blue-600 transition-colors" style="height: ${(val / maxTrend) * 90}%; min-height: 4px;" title="${val} reports"></div>
        </div>
    `).join('') + `
        <div class="absolute bottom-0 w-full flex justify-between text-[8px] text-outline px-1 border-t border-gray-100 pt-1">
            <span>May 1</span>
            <span>May 6</span>
            <span>May 11</span>
            <span>May 16</span>
            <span>May 21</span>
        </div>
    `;
}

// ============================================
// UPDATE MODERATOR PERFORMANCE
// ============================================
function updateModeratorPerformance() {
    const container = document.getElementById('moderatorPerformance');
    
    const mods = [
        { name: 'Ama Serwaa', avatar: 'https://ui-avatars.com/api/?name=Ama+Serwaa&background=6366f1&color=fff&size=16', resolved: 124, avgTime: '2h 15m' },
        { name: 'Kwame Asare', avatar: 'https://ui-avatars.com/api/?name=Kwame+Asare&background=6366f1&color=fff&size=16', resolved: 98, avgTime: '3h 05m' },
        { name: 'Nana Yaw', avatar: 'https://ui-avatars.com/api/?name=Nana+Yaw&background=6366f1&color=fff&size=16', resolved: 87, avgTime: '2h 45m' },
        { name: 'Benjamin A.', avatar: 'https://ui-avatars.com/api/?name=Benjamin+A.&background=6366f1&color=fff&size=16', resolved: 76, avgTime: '1h 50m' }
    ];
    
    container.innerHTML = mods.map(m => `
        <tr>
            <td class="py-2 flex items-center gap-1.5">
                <img alt="${m.name}" class="w-4 h-4 rounded-full object-cover" src="${m.avatar}"/>
                <span class="font-semibold">${m.name}</span>
            </td>
            <td class="py-2 text-right font-medium">${m.resolved}</td>
            <td class="py-2 text-right font-medium">${m.avgTime}</td>
        </tr>
    `).join('');
}

// ============================================
// UPDATE RECENT ACTIVITY
// ============================================
function updateRecentActivity() {
    const container = document.getElementById('moderatorActivity');
    
    const activities = [
        { moderator: 'Ama Serwaa', action: 'resolved a fraud report', ref: 'RPT-2026-1239', time: '2 min ago', color: 'bg-green-100 text-green-600', icon: 'fa-check-circle' },
        { moderator: 'Nana Yaw', action: 'escalated a business report', ref: 'RPT-2026-1240', time: '15 min ago', color: 'bg-blue-100 text-blue-600', icon: 'fa-external-link-alt' },
        { moderator: 'Kwame Asare', action: 'suspended a user', ref: 'Kojo Addo', time: '28 min ago', color: 'bg-red-100 text-red-600', icon: 'fa-user-times' }
    ];
    
    container.innerHTML = activities.map(a => `
        <div class="flex gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full ${a.color} flex items-center justify-center">
                <i class="fas ${a.icon} text-sm"></i>
            </div>
            <div>
                <p class="text-[11px] text-on-surface"><span class="font-bold">${a.moderator}</span> ${a.action}</p>
                <p class="text-[10px] text-outline">${a.ref}</p>
            </div>
            <span class="ml-auto text-[10px] text-outline whitespace-nowrap">${a.time}</span>
        </div>
    `).join('');
}

// ============================================
// UPDATE HIGH PRIORITY CASES
// ============================================
function updateHighPriorityCases() {
    const container = document.getElementById('highPriorityCases');
    
    const highPriority = allReports.filter(r => r.severity === 'high' && r.status !== 'resolved').slice(0, 3);
    
    if (highPriority.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-check-circle text-2xl block mb-2 opacity-30"></i>
                No high priority cases
            </div>
        `;
        return;
    }
    
    container.innerHTML = highPriority.map(r => {
        const statusClass = getStatusClass(r.status || 'pending');
        const typeColor = r.type === 'fraud' ? 'bg-red-100 text-red-600' : 'bg-purple-100 text-purple-600';
        
        return `
            <div class="flex items-start gap-3 p-2 hover:bg-surface-container-low rounded-lg cursor-pointer" onclick="showToast('Viewing case ${r.reportId || r.id}...', 'info')">
                <i class="fas ${r.type === 'fraud' ? 'fa-exclamation-circle text-red-500' : 'fa-user-minus text-purple-500'} mt-1"></i>
                <div class="flex-1">
                    <p class="text-[11px] font-bold text-on-surface">${r.reportId || r.id.substring(0, 8)}</p>
                    <p class="text-[10px] text-outline">${r.itemName || r.reportedItem || 'Unknown'}</p>
                </div>
                <div class="text-right">
                    <span class="text-[8px] px-1.5 py-0.5 ${typeColor} rounded-full font-bold">${(r.type || 'General').charAt(0).toUpperCase() + (r.type || 'General').slice(1)}</span>
                    <p class="text-[9px] text-outline mt-1">${r.createdAt ? timeAgo(r.createdAt.toDate()) : 'Recently'}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// UPDATE INVESTIGATION SUMMARY
// ============================================
function updateInvestigationSummary(statusCounts) {
    const container = document.getElementById('investigationSummary');
    
    const statuses = [
        { key: 'investigation', label: 'Under Investigation', count: statusCounts['investigation'] || 0, color: 'bg-blue-500', width: '48%' },
        { key: 'pending', label: 'Pending Review', count: statusCounts['pending'] || 0, color: 'bg-orange-400', width: '35%' },
        { key: 'escalated', label: 'Escalated', count: statusCounts['escalated'] || 0, color: 'bg-purple-500', width: '12%' },
        { key: 'resolved', label: 'Resolved', count: statusCounts['resolved'] || 0, color: 'bg-green-500', width: '95%' }
    ];
    
    const maxCount = Math.max(...statuses.map(s => s.count), 1);
    
    container.innerHTML = statuses.map(s => `
        <div>
            <div class="flex justify-between text-[10px] font-bold mb-1">
                <span class="text-outline">${s.label}</span>
                <span class="text-on-surface">${s.count}</span>
            </div>
            <div class="w-full bg-gray-100 h-1.5 rounded-full">
                <div class="${s.color} h-1.5 rounded-full" style="width: ${(s.count / maxCount) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

// ============================================
// UPDATE TOP COMMUNITIES
// ============================================
function updateTopCommunities(communityCounts) {
    const container = document.getElementById('topCommunities');
    
    const sorted = Object.entries(communityCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
    
    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-users text-2xl block mb-2 opacity-30"></i>
                No community data
            </div>
        `;
        return;
    }
    
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-blue-500'];
    
    container.innerHTML = sorted.map(([community, count], index) => `
        <div>
            <div class="flex justify-between text-[10px] mb-1">
                <span class="text-outline font-medium">${community}</span>
                <span class="font-bold text-on-surface">${count}</span>
            </div>
            <div class="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                <div class="${colors[index]} h-full" style="width: ${(count / maxCount) * 100}%"></div>
            </div>
        </div>
    `).join('');
}

// ============================================
// UPDATE SAFETY SCORE
// ============================================
function updateSafetyScore(statusCounts) {
    const total = allReports.length || 1;
    const resolved = statusCounts['resolved'] || 0;
    const score = Math.round((resolved / total) * 100);
    
    document.getElementById('safetyScore').textContent = `${score}%`;
    
    const status = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Attention';
    const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
    document.getElementById('safetyStatus').className = `px-2 py-0.5 ${color} text-[10px] font-bold rounded`;
    document.getElementById('safetyStatus').textContent = status;
    
    document.getElementById('safetyChange').innerHTML = `<span class="text-green-500 font-bold">↑ ${score > 0 ? '6%' : '0%'}</span> vs last month`;
    
    // Safety chart
    const chartContainer = document.getElementById('safetyChart');
    const chartData = Array.from({length: 8}, () => Math.floor(Math.random() * 30) + 50);
    const maxChart = Math.max(...chartData, 50);
    
    chartContainer.innerHTML = chartData.map(val => `
        <div class="flex-1 flex items-end justify-center">
            <div class="w-full max-w-[20px] rounded-sm" style="height: ${(val / 100) * 90}%; min-height: 4px; background: ${val >= 70 ? '#22c55e' : val >= 50 ? '#eab308' : '#ef4444'};"></div>
        </div>
    `).join('');
}

// ============================================
// EXPORT REPORTS
// ============================================
function exportReports() {
    if (filteredReports.length === 0) {
        showToast('No reports to export', 'info');
        return;
    }
    
    let csv = 'Report ID,Type,Item,Reporter,Community,Status,Severity,Date Reported\n';
    filteredReports.forEach(r => {
        const date = r.createdAt ? formatDate(r.createdAt) : 'N/A';
        csv += `"${r.reportId || r.id}","${r.type || ''}","${r.itemName || ''}","${r.reporterName || ''}","${r.community || ''}","${r.status || ''}","${r.severity || ''}","${date}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredReports.length} reports`, 'success');
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
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportReports);
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        showToast('Opening advanced filters...', 'info');
    });
    
    // Clear filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', function() {
        document.getElementById('globalSearch').value = '';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('communityFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('severityFilter').value = 'all';
        applyFilters();
        showToast('Filters cleared', 'info');
    });
    
    // Search
    document.getElementById('globalSearch')?.addEventListener('input', applyFilters);
    document.getElementById('typeFilter')?.addEventListener('change', applyFilters);
    document.getElementById('communityFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    document.getElementById('severityFilter')?.addEventListener('change', applyFilters);
    
    // View All buttons
    document.getElementById('viewAllHighPriorityBtn')?.addEventListener('click', function() {
        showToast('Viewing all high priority cases...', 'info');
    });
    
    document.getElementById('viewAllHighPriorityBtn2')?.addEventListener('click', function() {
        showToast('Viewing all high priority cases...', 'info');
    });
    
    document.getElementById('viewAllModeratorsBtn')?.addEventListener('click', function() {
        showToast('Viewing all moderators...', 'info');
    });
    
    document.getElementById('viewAllCommunitiesBtn')?.addEventListener('click', function() {
        showToast('Viewing all communities...', 'info');
    });
    
    // Date range picker
    document.getElementById('dateRange')?.addEventListener('click', function() {
        showToast('Opening date range picker...', 'info');
    });
});

console.log('🔄 BridgeConnect Reports page loaded with Firestore integration');