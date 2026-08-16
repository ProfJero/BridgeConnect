// ============================================
// ADMIN COMMUNITY PAGE JAVASCRIPT
// ============================================

// ============================================
// LOAD SIDEBAR COMPONENT
// ============================================
(function loadSidebar() {
    const container = document.getElementById('sidebarContainer');
    if (!container) {
        console.error('Sidebar container not found');
        return;
    }
    
    const sidebarPath = 'components/sidebar.html';
    
    console.log(`Attempting to load sidebar from: ${sidebarPath}`);
    
    fetch(sidebarPath)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
            return res.text();
        })
        .then(html => {
            container.innerHTML = html;
            console.log('✅ Sidebar loaded successfully from:', sidebarPath);
            initSidebarInteractions();
            initAuth();
            initCommunityPage();
        })
        .catch(err => {
            console.error('❌ Failed to load sidebar:', err);
            loadFallbackSidebar();
        });
    
    function loadFallbackSidebar() {
        console.log('Using fallback sidebar HTML');
        container.innerHTML = `
        <aside id="adminSidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30 overflow-y-auto transition-all duration-300">
            <div class="sidebar-logo p-4 pb-3 flex items-center gap-3 border-b border-gray-200/50 flex-shrink-0">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0"><i class="fa-solid fa-users text-xl"></i></div>
                <div class="logo-text"><h1 class="text-lg font-bold text-blue-600 leading-tight">BridgeConnect</h1><p class="text-[10px] text-gray-500">Admin Portal</p></div>
            </div>
            <div class="sidebar-dbi p-2.5 mx-3 my-2 bg-gray-50 rounded-lg border border-gray-200/50 flex items-center gap-2">
                <div class="w-5 h-5 bg-blue-600 rounded text-white flex items-center justify-center text-[8px] font-bold shrink-0">DBI</div>
                <div class="dbi-text text-[10px] text-gray-500">Powered by <br/><span class="font-semibold text-gray-800">Digital Bridge Initiative</span></div>
            </div>
            <nav class="sidebar-nav flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="dashboard.html" data-page="dashboard"><i class="fa-solid fa-house w-5 text-center"></i><span class="link-text">Dashboard</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="users.html" data-page="users"><i class="fa-solid fa-users w-5 text-center"></i><span class="link-text">Users</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="businesses.html" data-page="businesses"><i class="fa-solid fa-store w-5 text-center"></i><span class="link-text">Businesses</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="organizations.html" data-page="organizations"><i class="fa-solid fa-building w-5 text-center"></i><span class="link-text">Organizations</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="marketplace.html" data-page="marketplace"><i class="fa-solid fa-shop w-5 text-center"></i><span class="link-text">Marketplace</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="jobs.html" data-page="jobs"><i class="fa-solid fa-briefcase w-5 text-center"></i><span class="link-text">Jobs</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="community.html" data-page="community"><i class="fa-solid fa-people-group w-5 text-center"></i><span class="link-text">Community</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="events.html" data-page="events"><i class="fa-solid fa-calendar-days w-5 text-center"></i><span class="link-text">Events</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="advertisements.html" data-page="advertisements"><i class="fa-solid fa-bullhorn w-5 text-center"></i><span class="link-text">Advertisements</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="reports.html" data-page="reports"><i class="fa-solid fa-flag w-5 text-center"></i><span class="link-text">Reports</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="analytics.html" data-page="analytics"><i class="fa-solid fa-chart-line w-5 text-center"></i><span class="link-text">Analytics</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="roles.html" data-page="roles"><i class="fa-solid fa-user-shield w-5 text-center"></i><span class="link-text">Roles & Permissions</span></a>
                <div class="my-2 border-t border-gray-200/50"></div>
                <a class="sidebar-link flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="notifications.html" data-page="notifications"><div class="flex items-center gap-3"><i class="fa-solid fa-bell w-5 text-center"></i><span class="link-text">Notifications</span></div><span class="notif-badge bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">12</span></a>
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm" href="support.html" data-page="support"><i class="fa-solid fa-circle-question w-5 text-center"></i><span class="link-text">Support</span></a>
            </nav>
            <div class="sidebar-footer p-3 border-t border-gray-200/50 flex-shrink-0">
                <a id="logoutBtn" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 font-medium text-sm cursor-pointer"><i class="fa-solid fa-right-from-bracket w-5 text-center"></i><span class="link-text">Logout</span></a>
            </div>
        </aside>
        `;
        initSidebarInteractions();
        initAuth();
        initCommunityPage();
    }
})();

// ============================================
// HIGHLIGHT ACTIVE LINK BASED ON CURRENT PAGE
// ============================================
function highlightActiveLink() {
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'community.html';
    const pageName = currentPage.replace('.html', '');
    
    console.log(`📍 Current page: ${pageName}`);
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const linkPage = link.dataset.page;
        
        link.classList.remove('active');
        link.style.backgroundColor = '';
        link.style.color = '';
        link.style.fontWeight = '';
        
        if (linkPage === pageName) {
            link.classList.add('active');
            link.style.backgroundColor = '#2563eb';
            link.style.color = 'white';
            link.style.fontWeight = '600';
            console.log(`✅ Active link: ${linkPage}`);
        }
    });
}

// ============================================
// SIDEBAR INTERACTIONS
// ============================================
function initSidebarInteractions() {
    const sidebar = document.getElementById('adminSidebar');
    if (!sidebar) {
        console.error('Sidebar element not found after loading');
        return;
    }

    // ---- COLLAPSE TOGGLE ----
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle-btn';
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left text-xs"></i>';
    toggleBtn.title = 'Toggle sidebar';
    toggleBtn.style.cssText = `
        position: absolute;
        right: -12px;
        top: 20px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: white;
        border: 1px solid #c0c8c7;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 40;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    `;
    sidebar.style.position = 'relative';
    sidebar.appendChild(toggleBtn);

    let isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        toggleBtn.querySelector('i').className = 'fa-solid fa-chevron-right text-xs';
    }

    toggleBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('collapsed');
        const collapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('adminSidebarCollapsed', collapsed);
        const icon = this.querySelector('i');
        if (collapsed) {
            icon.className = 'fa-solid fa-chevron-right text-xs';
        } else {
            icon.className = 'fa-solid fa-chevron-left text-xs';
        }
    });

    // ---- HIGHLIGHT ACTIVE LINK ----
    highlightActiveLink();

    // ---- MOBILE MENU ----
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

    // ---- LOGOUT ----
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                if (typeof auth !== 'undefined' && auth.signOut) {
                    auth.signOut().then(() => {
                        localStorage.removeItem('bridgeconnect_user');
                        window.location.href = '../login.html';
                    }).catch(err => {
                        showToast('Error logging out: ' + err.message, 'error');
                    });
                } else {
                    showToast('Logging out...', 'info');
                    localStorage.removeItem('bridgeconnect_user');
                    window.location.href = '../login.html';
                }
            }
        });
    }
    
    console.log('✅ Sidebar interactions initialized');
}

// ============================================
// AUTHENTICATION
// ============================================
function initAuth() {
    if (typeof auth === 'undefined' || !auth) {
        console.warn('Firebase auth not available, skipping auth check');
        return;
    }
    
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (!doc.exists) {
                showToast('User data not found. Please contact support.', 'error');
                auth.signOut();
                return;
            }
            const data = doc.data();
            if (data.role !== 'owner') {
                showToast('Access denied. Admin privileges required.', 'error');
                auth.signOut();
                setTimeout(() => window.location.href = '../login.html', 1500);
            }
        } catch (err) {
            console.error('Auth error:', err);
        }
    });
}

// ============================================
// COMMUNITY PAGE SPECIFIC FUNCTIONS
// ============================================
function initCommunityPage() {
    console.log('Community page initialized');

    // ---- ADD COMMUNITY ----
    document.querySelector('.fa-plus')?.closest('button')?.addEventListener('click', function() {
        showToast('Opening add community form...', 'info');
    });

    // ---- EXPORT ----
    document.querySelector('.fa-download')?.closest('button')?.addEventListener('click', function() {
        showToast('Exporting communities...', 'info');
    });

    // ---- FILTERS ----
    document.querySelector('.fa-sliders-h')?.closest('button')?.addEventListener('click', function() {
        showToast('Opening filters...', 'info');
    });

    // ---- SEARCH ----
    document.querySelector('.fa-search')?.closest('.relative')?.querySelector('input')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            showToast(`Searching for "${this.value.trim()}"...`, 'info');
        }
    });

    // ---- TABLE ROW CLICKS ----
    document.querySelectorAll('.table-row-hover').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const name = this.querySelector('.text-sm.font-bold')?.textContent || 'Community';
            showToast(`Viewing ${name}...`, 'info');
        });
    });

    // ---- TAB CLICKS ----
    document.querySelectorAll('.px-6.py-4.text-sm.font-medium').forEach(tab => {
        tab.addEventListener('click', function() {
            const label = this.textContent.trim();
            showToast(`Viewing ${label}...`, 'info');
        });
    });

    // ---- FILTER SELECTS ----
    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', function() {
            if (this.value && this.value !== 'All Regions' && this.value !== 'All Districts' && 
                this.value !== 'All Status') {
                showToast(`Filtering by ${this.value}...`, 'info');
            }
        });
    });

    // ---- CLEAR FILTERS ----
    document.querySelector('.text-sm.font-medium.text-outline')?.addEventListener('click', function() {
        showToast('Clearing all filters...', 'info');
    });

    // ---- PAGINATION ----
    document.querySelectorAll('.flex.items-center.gap-1 .w-8.h-8, .flex.items-center.gap-1 button.w-8.h-8, .flex.items-center.gap-1 .w-10.h-8').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = this.textContent.trim();
            if (text && !isNaN(text)) {
                showToast(`Loading page ${text}...`, 'info');
            } else if (this.querySelector('.fa-chevron-right')) {
                showToast('Loading next page...', 'info');
            } else if (this.querySelector('.fa-chevron-left')) {
                showToast('Loading previous page...', 'info');
            }
        });
    });

    // ---- ROWS PER PAGE ----
    document.querySelector('select option[value="20 / page"]')?.closest('select')?.addEventListener('change', function() {
        showToast(`Showing ${this.value}...`, 'info');
    });

    // ---- VIEW, EDIT, MORE BUTTONS ----
    document.querySelectorAll('.fa-eye, .fa-edit, .fa-ellipsis-v').forEach(icon => {
        icon.closest('button')?.addEventListener('click', function(e) {
            e.stopPropagation();
            const action = this.querySelector('.fa-eye') ? 'Viewing' :
                          this.querySelector('.fa-edit') ? 'Editing' : 'More options for';
            showToast(`${action} community...`, 'info');
        });
    });
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

console.log('🔄 BridgeConnect Community page loaded successfully');
console.log(`📱 Viewport: ${window.innerWidth}x${window.innerHeight}`);