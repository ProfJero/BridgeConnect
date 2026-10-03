// ============================================
// ADMIN MARKETPLACE PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let pageSize = 10;
let selectedProducts = new Set();
let isSidebarRendered = false;
let categories = new Set();
let currentTab = 'all';

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusClass(status) {
    const statusMap = {
        'active': 'status-active',
        'pending': 'status-pending',
        'suspended': 'status-suspended',
        'out-of-stock': 'status-out-of-stock'
    };
    return statusMap[status] || 'status-pending';
}

function getStatusIcon(status) {
    const icons = {
        'active': 'fa-check-circle',
        'pending': 'fa-clock',
        'suspended': 'fa-ban',
        'out-of-stock': 'fa-box'
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

function formatCurrency(amount) {
    return `GHC ${(amount || 0).toFixed(2)}`;
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
            const currentPage = currentPath.split('/').pop() || 'marketplace.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'marketplace' && currentPage === 'marketplace.html');
            
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
                    loadProducts();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD PRODUCTS FROM FIRESTORE
// ============================================
async function loadProducts() {
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-8 text-outline">
                <i class="fas fa-spinner fa-spin text-2xl"></i>
                <p class="mt-2">Loading products...</p>
            </td>
        </tr>
    `;
    
    try {
        const userData = contextManager.userData;
        const isOwner = userData?.role === 'platform_owner' || userData?.role === 'owner';
        const userDistrict = userData?.district;
        
        let query = db.collection('products');
        
        // If not platform owner, filter by district
        if (!isOwner && userDistrict) {
            query = query.where('district', '==', userDistrict);
        }
        
        // Get all products
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        allProducts = [];
        categories.clear();
        
        if (snapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-12 text-outline">
                        <i class="fas fa-box-open text-3xl text-gray-300 mb-3 block"></i>
                        <p class="text-sm font-medium">No products found</p>
                        <p class="text-xs mt-1">Click "Add Product" to create your first product</p>
                    </td>
                </tr>
            `;
            updateStats();
            populateCategoryFilter();
            updatePagination();
            return;
        }
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const product = {
                id: doc.id,
                ...data
            };
            allProducts.push(product);
            
            // Collect categories
            if (data.category) {
                categories.add(data.category);
            }
        });
        
        console.log(`✅ Loaded ${allProducts.length} products`);
        
        // Populate category filter
        populateCategoryFilter();
        
        // Apply filters and render
        applyFilters();
        
    } catch (error) {
        console.error('Error loading products:', error);
        
        if (error.code === 'permission-denied' || error.message.includes('permission')) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-8 text-orange-500">
                        <i class="fas fa-shield-alt text-3xl mb-3 block"></i>
                        <p class="text-sm font-medium">Unable to access products</p>
                        <p class="text-xs mt-1">Please ensure you have proper permissions and the products collection exists.</p>
                        <button onclick="loadProducts()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
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
                        <p class="text-sm font-medium">Failed to load products</p>
                        <p class="text-xs mt-1">${error.message}</p>
                        <button onclick="loadProducts()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
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
                    <i class="fas fa-boxes text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Total Products</p>
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
                    <p class="text-xs text-outline font-medium">Active</p>
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
                    <p class="text-xs text-outline font-medium">Pending</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-ban text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Suspended</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-box text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Out of Stock</p>
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
// POPULATE CATEGORY FILTER
// ============================================
function populateCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    if (!select) return;
    
    select.innerHTML = '<option value="all">All Categories</option>';
    
    const sortedCategories = Array.from(categories).sort();
    sortedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
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
                b.classList.add('text-on-surface-variant');
            });
            
            // Add active class to clicked tab
            this.classList.add('tab-active');
            this.classList.add('border-primary');
            this.classList.add('text-primary');
            this.classList.remove('border-transparent');
            this.classList.remove('text-on-surface-variant');
            
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
        defaultTab.classList.remove('text-on-surface-variant');
    }
}

// ============================================
// APPLY FILTERS
// ============================================
function applyFilters() {
    const search = document.getElementById('searchFilter')?.value?.toLowerCase() || '';
    const category = document.getElementById('categoryFilter')?.value || 'all';
    const status = document.getElementById('statusFilter')?.value || 'all';
    
    filteredProducts = allProducts.filter(product => {
        // Search filter
        if (search) {
            const name = (product.name || '').toLowerCase();
            const seller = (product.sellerName || '').toLowerCase();
            const desc = (product.description || '').toLowerCase();
            if (!name.includes(search) && !seller.includes(search) && !desc.includes(search)) {
                return false;
            }
        }
        
        // Category filter
        if (category !== 'all' && product.category !== category) {
            return false;
        }
        
        // Status filter
        if (status !== 'all') {
            const productStatus = product.status || 'pending';
            if (productStatus !== status) return false;
        }
        
        // Tab filter
        if (currentTab !== 'all') {
            const productStatus = product.status || 'pending';
            if (productStatus !== currentTab) return false;
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
    const tableBody = document.getElementById('productsTableBody');
    if (!tableBody) return;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProducts.length);
    const pageProducts = filteredProducts.slice(startIndex, endIndex);
    
    if (pageProducts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-12 text-outline">
                    <i class="fas fa-box-open text-3xl text-gray-300 mb-3 block"></i>
                    <p class="text-sm font-medium">No products found</p>
                    <p class="text-xs mt-1">Try adjusting your filters or search criteria</p>
                </td>
            </tr>
        `;
        updatePagination();
        return;
    }
    
    let html = '';
    pageProducts.forEach(product => {
        const status = product.status || 'pending';
        const statusClass = getStatusClass(status);
        const statusIcon = getStatusIcon(status);
        const productName = product.name || 'Unnamed Product';
        const productImage = product.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(productName)}&background=0052cc&color=fff&size=40`;
        const sellerName = product.sellerName || 'Unknown Seller';
        const price = product.price || 0;
        const stock = product.stock || 0;
        const category = product.category || 'Uncategorized';
        const createdDate = product.createdAt ? formatDate(product.createdAt) : 'N/A';
        const createdTime = product.createdAt ? formatTime(product.createdAt) : '';
        
        html += `
            <tr class="table-row-hover cursor-pointer hover:bg-surface-container-low/50 transition-colors" data-id="${product.id}">
                <td class="px-4 py-4">
                    <input class="product-checkbox rounded border-outline-variant text-primary focus:ring-primary" type="checkbox" data-id="${product.id}"/>
                </td>
                <td class="px-4 py-4">
                    <div class="flex items-center gap-3">
                        <img alt="${productName}" class="w-10 h-10 rounded-lg border border-outline-variant object-cover" src="${productImage}"/>
                        <div>
                            <p class="text-sm font-semibold text-on-surface">${productName}</p>
                            <p class="text-[11px] text-outline">${product.id.substring(0, 8)}</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-4">
                    <span class="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full">${category}</span>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-bold text-on-surface">${formatCurrency(price)}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-medium text-on-surface">${sellerName}</p>
                </td>
                <td class="px-4 py-4">
                    <p class="text-sm font-medium text-on-surface">${stock}</p>
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
                        <button class="view-product-btn p-1.5 text-blue-500 hover:bg-blue-50 rounded transition-colors" data-id="${product.id}" title="View">
                            <i class="fas fa-eye text-sm"></i>
                        </button>
                        ${status === 'pending' ? `
                            <button class="approve-product-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${product.id}" title="Approve">
                                <i class="fas fa-check-circle text-sm"></i>
                            </button>
                            <button class="reject-product-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${product.id}" title="Reject">
                                <i class="fas fa-times-circle text-sm"></i>
                            </button>
                        ` : `
                            <button class="edit-product-btn p-1.5 text-blue-400 hover:bg-blue-50 rounded transition-colors" data-id="${product.id}" title="Edit">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            ${status === 'active' ? `
                                <button class="suspend-product-btn p-1.5 text-orange-400 hover:bg-orange-50 rounded transition-colors" data-id="${product.id}" title="Suspend">
                                    <i class="fas fa-pause-circle text-sm"></i>
                                </button>
                            ` : status === 'suspended' ? `
                                <button class="reactivate-product-btn p-1.5 text-green-500 hover:bg-green-50 rounded transition-colors" data-id="${product.id}" title="Reactivate">
                                    <i class="fas fa-play-circle text-sm"></i>
                                </button>
                            ` : ''}
                        `}
                        <button class="delete-product-btn p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" data-id="${product.id}" title="Delete">
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
    if (allProducts.length === 0) {
        updateStatsEmpty();
        return;
    }
    
    const total = allProducts.length;
    const active = allProducts.filter(p => p.status === 'active').length;
    const pending = allProducts.filter(p => p.status === 'pending').length;
    const suspended = allProducts.filter(p => p.status === 'suspended').length;
    const outOfStock = allProducts.filter(p => p.status === 'out-of-stock' || (p.stock && p.stock <= 0)).length;
    
    const metricsHtml = `
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center">
                    <i class="fas fa-boxes text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Total Products</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${total}</span>
                        <span class="text-[10px] font-bold text-green-500 flex items-center">
                            <i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${total > 0 ? '12.5%' : '0%'}
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
                    <p class="text-xs text-outline font-medium">Active</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${active}</span>
                        <span class="text-[10px] font-bold text-green-500 flex items-center">
                            <i class="fas fa-arrow-up text-[8px] mr-0.5"></i> ${active > 0 ? '10.2%' : '0%'}
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
                    <p class="text-xs text-outline font-medium">Pending</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${pending}</span>
                        <span class="text-[10px] font-bold text-red-500 flex items-center">
                            <i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${pending > 0 ? '5.1%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-ban text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Suspended</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${suspended}</span>
                        <span class="text-[10px] font-bold text-red-500 flex items-center">
                            <i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${suspended > 0 ? '2.3%' : '0%'}
                        </span>
                        <span class="text-[9px] text-outline">vs last month</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="bg-surface border border-outline-variant rounded-xl p-4 card-shadow">
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-gray-50 text-gray-600 rounded-lg flex items-center justify-center">
                    <i class="fas fa-box text-lg"></i>
                </div>
                <div>
                    <p class="text-xs text-outline font-medium">Out of Stock</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-2xl font-bold text-on-surface">${outOfStock}</span>
                        <span class="text-[10px] font-bold text-red-500 flex items-center">
                            <i class="fas fa-arrow-down text-[8px] mr-0.5"></i> ${outOfStock > 0 ? '1.8%' : '0%'}
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
    const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize + 1;
    const endIndex = Math.min(currentPage * pageSize, filteredProducts.length);
    
    document.getElementById('paginationInfo').innerHTML = 
        `Showing <span class="text-on-surface">${filteredProducts.length > 0 ? startIndex : 0} - ${endIndex}</span> of <span class="text-on-surface">${filteredProducts.length}</span> products`;
    
    const controls = document.getElementById('paginationControls');
    let html = '';
    
    html += `<button class="pagination-prev w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-surface transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left text-sm"></i>
    </button>`;
    
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
    
    html += `<button class="pagination-next w-8 h-8 flex items-center justify-center rounded-lg text-outline hover:bg-surface transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" ${currentPage === totalPages ? 'disabled' : ''}>
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
    // View Product
    document.querySelectorAll('.view-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showToast('Viewing product details...', 'info');
            // window.location.href = `product-detail.html?id=${id}`;
        });
    });
    
    // Edit Product
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            showEditProductModal(id);
        });
    });
    
    // Approve Product
    document.querySelectorAll('.approve-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            approveProduct(id);
        });
    });
    
    // Reject Product
    document.querySelectorAll('.reject-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            rejectProduct(id);
        });
    });
    
    // Suspend Product
    document.querySelectorAll('.suspend-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            suspendProduct(id);
        });
    });
    
    // Reactivate Product
    document.querySelectorAll('.reactivate-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            reactivateProduct(id);
        });
    });
    
    // Delete Product
    document.querySelectorAll('.delete-product-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            deleteProduct(id);
        });
    });
    
    // Row click - view details
    document.querySelectorAll('#productsTableBody tr[data-id]').forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('input')) return;
            const id = this.dataset.id;
            showToast('Viewing product details...', 'info');
            // window.location.href = `product-detail.html?id=${id}`;
        });
    });
    
    // Checkbox selection
    document.querySelectorAll('.product-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            if (this.checked) {
                selectedProducts.add(this.dataset.id);
            } else {
                selectedProducts.delete(this.dataset.id);
            }
            updateSelectAllState();
        });
    });
    
    // Select All
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('.product-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
                if (this.checked) {
                    selectedProducts.add(cb.dataset.id);
                } else {
                    selectedProducts.delete(cb.dataset.id);
                }
            });
        });
    }
}

// ============================================
// UPDATE SELECT ALL STATE
// ============================================
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.product-checkbox');
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        const checked = document.querySelectorAll('.product-checkbox:checked');
        selectAll.checked = checkboxes.length > 0 && checked.length === checkboxes.length;
    }
}

// ============================================
// PRODUCT ACTIONS
// ============================================
async function approveProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`Approve "${product.name || 'this product'}"?`)) return;
    
    try {
        await db.collection('products').doc(id).update({
            status: 'active',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            approvedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${product.name}" approved successfully`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to approve product: ' + error.message, 'error');
    }
}

async function rejectProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`Reject "${product.name || 'this product'}"?`)) return;
    
    try {
        await db.collection('products').doc(id).update({
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${product.name}" rejected`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to reject product: ' + error.message, 'error');
    }
}

async function suspendProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`Suspend "${product.name || 'this product'}"?`)) return;
    
    try {
        await db.collection('products').doc(id).update({
            status: 'suspended',
            suspendedAt: firebase.firestore.FieldValue.serverTimestamp(),
            suspendedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${product.name}" suspended successfully`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to suspend product: ' + error.message, 'error');
    }
}

async function reactivateProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`Reactivate "${product.name || 'this product'}"?`)) return;
    
    try {
        await db.collection('products').doc(id).update({
            status: 'active',
            reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            reactivatedBy: auth.currentUser?.uid || 'system'
        });
        showToast(`✅ "${product.name}" reactivated successfully`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to reactivate product: ' + error.message, 'error');
    }
}

async function deleteProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    if (!confirm(`⚠️ Are you sure you want to permanently delete "${product.name || 'this product'}"? This action cannot be undone!`)) return;
    
    try {
        await db.collection('products').doc(id).delete();
        showToast(`✅ "${product.name}" deleted successfully`, 'success');
        loadProducts();
    } catch (error) {
        showToast('Failed to delete product: ' + error.message, 'error');
    }
}

// ============================================
// SHOW EDIT PRODUCT MODAL
// ============================================
function showEditProductModal(id) {
    const product = allProducts.find(p => p.id === id);
    if (!product) {
        showToast('Product not found', 'error');
        return;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="editModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Edit Product</h3>
                    <p class="text-sm text-outline mt-1">Update product information</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Product Name</label>
                        <input id="editProductName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${product.name || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Category</label>
                        <input id="editCategory" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${product.category || ''}" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Price (GHC)</label>
                        <input id="editPrice" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${product.price || 0}" type="number" step="0.01"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Stock</label>
                        <input id="editStock" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" value="${product.stock || 0}" type="number"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="editStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="active" ${product.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="pending" ${product.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="suspended" ${product.status === 'suspended' ? 'selected' : ''}>Suspended</option>
                            <option value="out-of-stock" ${product.status === 'out-of-stock' ? 'selected' : ''}>Out of Stock</option>
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
        const name = document.getElementById('editProductName').value.trim();
        const category = document.getElementById('editCategory').value.trim();
        const price = parseFloat(document.getElementById('editPrice').value) || 0;
        const stock = parseInt(document.getElementById('editStock').value) || 0;
        const status = document.getElementById('editStatus').value;
        const productId = this.dataset.id;
        
        if (!name) {
            showToast('Please enter a product name', 'error');
            return;
        }
        
        try {
            const updates = {
                name: name,
                category: category,
                price: price,
                stock: stock,
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('products').doc(productId).update(updates);
            
            showToast('✅ Product updated successfully', 'success');
            container.innerHTML = '';
            loadProducts();
        } catch (error) {
            console.error('Error updating product:', error);
            showToast('Failed to update product: ' + error.message, 'error');
        }
    });
}

// ============================================
// SHOW ADD PRODUCT MODAL
// ============================================
function showAddProductModal() {
    const modalHtml = `
        <div class="modal-overlay" id="addModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Add New Product</h3>
                    <p class="text-sm text-outline mt-1">Create a new product listing</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Product Name <span class="text-red-500">*</span></label>
                        <input id="addProductName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter product name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Category <span class="text-red-500">*</span></label>
                        <input id="addCategory" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Electronics" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Price (GHC) <span class="text-red-500">*</span></label>
                        <input id="addPrice" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" step="0.01"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Stock</label>
                        <input id="addStock" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0" type="number"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Seller Name</label>
                        <input id="addSellerName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter seller name" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Description</label>
                        <textarea id="addDescription" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="3" placeholder="Product description..."></textarea>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Status</label>
                        <select id="addStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                            <option value="pending">Pending</option>
                            <option value="active">Active</option>
                        </select>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Create Product</button>
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
        const name = document.getElementById('addProductName').value.trim();
        const category = document.getElementById('addCategory').value.trim();
        const price = parseFloat(document.getElementById('addPrice').value) || 0;
        const stock = parseInt(document.getElementById('addStock').value) || 0;
        const sellerName = document.getElementById('addSellerName').value.trim() || 'Unknown';
        const description = document.getElementById('addDescription').value.trim();
        const status = document.getElementById('addStatus').value;
        
        if (!name) {
            showToast('Please enter a product name', 'error');
            return;
        }
        if (!category) {
            showToast('Please enter a category', 'error');
            return;
        }
        if (price <= 0) {
            showToast('Please enter a valid price', 'error');
            return;
        }
        
        try {
            const productData = {
                name: name,
                category: category,
                price: price,
                stock: stock,
                sellerName: sellerName,
                description: description || '',
                status: status,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('products').add(productData);
            
            showToast(`✅ Product "${name}" created successfully`, 'success');
            container.innerHTML = '';
            loadProducts();
        } catch (error) {
            console.error('Error creating product:', error);
            showToast('Failed to create product: ' + error.message, 'error');
        }
    });
}

// ============================================
// EXPORT PRODUCTS
// ============================================
function exportProducts() {
    if (filteredProducts.length === 0) {
        showToast('No products to export', 'info');
        return;
    }
    
    let csv = 'Name,Category,Price,Stock,Seller,Status,Date Added\n';
    filteredProducts.forEach(product => {
        const date = product.createdAt ? formatDate(product.createdAt) : 'N/A';
        csv += `"${product.name || ''}","${product.category || ''}","${product.price || 0}","${product.stock || 0}","${product.sellerName || ''}","${product.status || ''}","${date}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketplace_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`✅ Exported ${filteredProducts.length} products`, 'success');
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
    
    // Add Product
    document.getElementById('addProductBtn')?.addEventListener('click', showAddProductModal);
    
    // Export
    document.getElementById('exportBtn')?.addEventListener('click', exportProducts);
    
    // Filter button
    document.getElementById('filterBtn')?.addEventListener('click', function() {
        document.querySelector('.flex-wrap .border')?.focus();
    });
    
    // Search
    document.getElementById('searchFilter')?.addEventListener('input', applyFilters);
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyFilters);
    
    // Clear filters
    document.getElementById('clearFiltersBtn')?.addEventListener('click', function() {
        document.getElementById('searchFilter').value = '';
        document.getElementById('categoryFilter').value = 'all';
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

console.log('🔄 BridgeConnect Marketplace page loaded with Firestore integration');