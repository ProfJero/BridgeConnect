// ============================================
// LOCATIONS PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let locationData = { regions: [] };
let expandedItems = new Set();
let isSidebarRendered = false;

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
            const currentPage = currentPath.split('/').pop() || 'locations.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'locations' && currentPage === 'locations.html');
            
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
    const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0052cc&color=fff&size=32`;
    
    const mobileAvatar = document.getElementById('mobileUserAvatar');
    if (mobileAvatar) mobileAvatar.src = avatarUrl;
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
                // Load locations after sidebar is ready
                setTimeout(() => {
                    loadLocations();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD LOCATIONS FROM FIRESTORE
// ============================================
async function loadLocations() {
    try {
        const tree = document.getElementById('locationTree');
        if (!tree) {
            console.error('Location tree element not found');
            return;
        }
        
        tree.innerHTML = '<div class="text-center text-on-surface-variant py-8"><i class="fa-solid fa-spinner fa-spin text-2xl"></i><p class="mt-2 text-sm">Loading locations...</p></div>';
        
        // Load regions
        const regionsSnapshot = await db.collection('regions').orderBy('name').get();
        
        if (regionsSnapshot.empty) {
            tree.innerHTML = `
                <div class="text-center text-on-surface-variant py-12">
                    <i class="fa-regular fa-circle-plus text-4xl block mb-3 text-gray-300"></i>
                    <p class="text-sm">No regions added yet</p>
                    <p class="text-xs mt-1">Click "Add Region" to get started</p>
                </div>
            `;
            updateStats();
            // Still attach main buttons even if no regions
            attachMainButtons();
            return;
        }
        
        locationData.regions = [];
        
        for (const regionDoc of regionsSnapshot.docs) {
            const region = regionDoc.data();
            region.id = regionDoc.id;
            region.districts = [];
            
            // Load districts for this region
            const districtsSnapshot = await db.collection('regions')
                .doc(regionDoc.id)
                .collection('districts')
                .orderBy('name')
                .get();
            
            for (const districtDoc of districtsSnapshot.docs) {
                const district = districtDoc.data();
                district.id = districtDoc.id;
                district.communities = [];
                
                // Load communities for this district
                const communitiesSnapshot = await db.collection('regions')
                    .doc(regionDoc.id)
                    .collection('districts')
                    .doc(districtDoc.id)
                    .collection('communities')
                    .orderBy('name')
                    .get();
                
                for (const communityDoc of communitiesSnapshot.docs) {
                    const community = communityDoc.data();
                    community.id = communityDoc.id;
                    district.communities.push(community);
                }
                
                region.districts.push(district);
            }
            
            locationData.regions.push(region);
        }
        
        renderLocationTree();
        updateStats();
        // Attach main buttons after rendering
        attachMainButtons();
        
    } catch (error) {
        console.error('Error loading locations:', error);
        const tree = document.getElementById('locationTree');
        if (tree) {
            tree.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fa-solid fa-circle-exclamation text-3xl"></i>
                    <p class="mt-2 text-sm">Error loading locations</p>
                    <p class="text-xs mt-1">${error.message}</p>
                </div>
            `;
        }
        showToast('Error loading locations: ' + error.message, 'error');
    }
}

// ============================================
// ATTACH MAIN BUTTONS (Add Region, Refresh)
// ============================================
function attachMainButtons() {
    // Add Region button
    const addRegionBtn = document.getElementById('addRegionBtn');
    if (addRegionBtn) {
        // Remove existing listeners to prevent duplicates
        const newBtn = addRegionBtn.cloneNode(true);
        addRegionBtn.parentNode.replaceChild(newBtn, addRegionBtn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Add Region button clicked');
            showAddRegionModal();
        });
        console.log('✅ Add Region button attached successfully');
    } else {
        console.warn('Add Region button not found in DOM');
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        const newBtn = refreshBtn.cloneNode(true);
        refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Refresh button clicked');
            refreshLocations();
        });
        console.log('✅ Refresh button attached successfully');
    } else {
        console.warn('Refresh button not found in DOM');
    }
}

// ============================================
// RENDER LOCATION TREE
// ============================================
function renderLocationTree() {
    const tree = document.getElementById('locationTree');
    if (!tree) return;
    
    let html = '';
    
    locationData.regions.forEach((region, regionIndex) => {
        const isExpanded = expandedItems.has(`region-${region.id}`);
        const districtCount = region.districts.length;
        const communityCount = region.districts.reduce((sum, d) => sum + d.communities.length, 0);
        
        html += `
            <div class="location-item rounded-lg border border-transparent hover:border-outline-variant ${isExpanded ? 'expanded' : ''}" data-type="region" data-id="${region.id}">
                <div class="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 rounded-lg cursor-pointer region-toggle" data-id="${region.id}">
                    <div class="flex items-center gap-3 flex-1">
                        <i class="fa-solid fa-chevron-right text-xs text-gray-400 transition-transform expand-icon ${isExpanded ? 'rotate-90' : ''}"></i>
                        <i class="fa-solid fa-map text-blue-600 text-sm"></i>
                        <span class="font-medium text-on-surface">${region.name}</span>
                        <span class="text-xs text-on-surface-variant ml-2">
                            ${districtCount} district${districtCount !== 1 ? 's' : ''} · ${communityCount} communit${communityCount !== 1 ? 'ies' : 'y'}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="add-district-btn text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors" data-region-id="${region.id}">
                            <i class="fa-solid fa-plus mr-1"></i> Add District
                        </button>
                        <button class="edit-region-btn text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" data-id="${region.id}" data-name="${region.name}">
                            <i class="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button class="delete-region-btn text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors" data-id="${region.id}" data-name="${region.name}">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </div>
                </div>
                
                <div class="child-list ${isExpanded ? 'expanded' : ''}" data-parent="region-${region.id}">
                    <div class="ml-8 space-y-1">
        `;
        
        // Render districts
        region.districts.forEach((district) => {
            const isDistrictExpanded = expandedItems.has(`district-${district.id}`);
            const communityCount = district.communities.length;
            
            html += `
                <div class="location-item rounded-lg border border-transparent hover:border-outline-variant ${isDistrictExpanded ? 'expanded' : ''}" data-type="district" data-id="${district.id}">
                    <div class="flex items-center justify-between px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer district-toggle" data-id="${district.id}">
                        <div class="flex items-center gap-3 flex-1">
                            <i class="fa-solid fa-chevron-right text-xs text-gray-400 transition-transform expand-icon ${isDistrictExpanded ? 'rotate-90' : ''}"></i>
                            <i class="fa-solid fa-building text-green-600 text-sm"></i>
                            <span class="text-on-surface">${district.name}</span>
                            <span class="text-xs text-on-surface-variant ml-2">${communityCount} communit${communityCount !== 1 ? 'ies' : 'y'}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button class="add-community-btn text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors" data-region-id="${region.id}" data-district-id="${district.id}">
                                <i class="fa-solid fa-plus mr-1"></i> Add Community
                            </button>
                            <button class="edit-district-btn text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" data-id="${district.id}" data-name="${district.name}" data-region-id="${region.id}">
                                <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button class="delete-district-btn text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors" data-id="${district.id}" data-name="${district.name}" data-region-id="${region.id}">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="child-list ${isDistrictExpanded ? 'expanded' : ''}" data-parent="district-${district.id}">
                        <div class="ml-8 space-y-1">
            `;
            
            // Render communities
            district.communities.forEach((community) => {
                html += `
                    <div class="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50 rounded-lg group">
                        <div class="flex items-center gap-3 flex-1">
                            <i class="fa-solid fa-circle text-[6px] text-purple-400 ml-4"></i>
                            <span class="text-sm text-on-surface">${community.name}</span>
                        </div>
                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="edit-community-btn text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors" data-id="${community.id}" data-name="${community.name}" data-district-id="${district.id}" data-region-id="${region.id}">
                                <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button class="delete-community-btn text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors" data-id="${community.id}" data-name="${community.name}" data-district-id="${district.id}" data-region-id="${region.id}">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
    });
    
    tree.innerHTML = html;
    
    // Attach event listeners after rendering
    setTimeout(attachEventListeners, 50);
}

// ============================================
// ATTACH EVENT LISTENERS
// ============================================
function attachEventListeners() {
    // Region toggle
    document.querySelectorAll('.region-toggle').forEach(el => {
        el.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            const id = this.dataset.id;
            toggleExpand(`region-${id}`);
        });
    });
    
    // District toggle
    document.querySelectorAll('.district-toggle').forEach(el => {
        el.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;
            const id = this.dataset.id;
            toggleExpand(`district-${id}`);
        });
    });
    
    // Add District
    document.querySelectorAll('.add-district-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const regionId = this.dataset.regionId;
            showAddDistrictModal(regionId);
        });
    });
    
    // Add Community
    document.querySelectorAll('.add-community-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const regionId = this.dataset.regionId;
            const districtId = this.dataset.districtId;
            showAddCommunityModal(regionId, districtId);
        });
    });
    
    // Edit Region
    document.querySelectorAll('.edit-region-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            showEditRegionModal(id, name);
        });
    });
    
    // Edit District
    document.querySelectorAll('.edit-district-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            const regionId = this.dataset.regionId;
            showEditDistrictModal(id, name, regionId);
        });
    });
    
    // Edit Community
    document.querySelectorAll('.edit-community-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            const districtId = this.dataset.districtId;
            const regionId = this.dataset.regionId;
            showEditCommunityModal(id, name, districtId, regionId);
        });
    });
    
    // Delete Region
    document.querySelectorAll('.delete-region-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            deleteRegion(id, name);
        });
    });
    
    // Delete District
    document.querySelectorAll('.delete-district-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            const regionId = this.dataset.regionId;
            deleteDistrict(id, name, regionId);
        });
    });
    
    // Delete Community
    document.querySelectorAll('.delete-community-btn').forEach(el => {
        el.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const name = this.dataset.name;
            const districtId = this.dataset.districtId;
            const regionId = this.dataset.regionId;
            deleteCommunity(id, name, districtId, regionId);
        });
    });
    
    // Expand All / Collapse All
    const expandAllBtn = document.getElementById('expandAllBtn');
    if (expandAllBtn) {
        expandAllBtn.addEventListener('click', expandAll);
    }
    
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    if (collapseAllBtn) {
        collapseAllBtn.addEventListener('click', collapseAll);
    }
}

// ============================================
// REFRESH FUNCTION
// ============================================
function refreshLocations() {
    console.log('🔄 Refreshing locations...');
    showToast('🔄 Refreshing locations...', 'info');
    loadLocations();
}

// ============================================
// EXPAND / COLLAPSE
// ============================================
function toggleExpand(id) {
    if (expandedItems.has(id)) {
        expandedItems.delete(id);
    } else {
        expandedItems.add(id);
    }
    renderLocationTree();
}

function expandAll() {
    locationData.regions.forEach(region => {
        expandedItems.add(`region-${region.id}`);
        region.districts.forEach(district => {
            expandedItems.add(`district-${district.id}`);
        });
    });
    renderLocationTree();
}

function collapseAll() {
    expandedItems.clear();
    renderLocationTree();
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats() {
    const totalRegions = locationData.regions.length;
    const totalDistricts = locationData.regions.reduce((sum, r) => sum + r.districts.length, 0);
    const totalCommunities = locationData.regions.reduce((sum, r) => 
        sum + r.districts.reduce((s, d) => s + d.communities.length, 0), 0
    );
    
    const regionsEl = document.getElementById('totalRegions');
    const districtsEl = document.getElementById('totalDistricts');
    const communitiesEl = document.getElementById('totalCommunities');
    
    if (regionsEl) regionsEl.textContent = totalRegions;
    if (districtsEl) districtsEl.textContent = totalDistricts;
    if (communitiesEl) communitiesEl.textContent = totalCommunities;
}

// ============================================
// MODAL HELPERS
// ============================================
function createModal(title, content, submitText, onSubmit) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    overlay.id = 'modalOverlay';
    
    const modal = document.createElement('div');
    modal.className = 'bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden';
    
    modal.innerHTML = `
        <div class="p-6 border-b border-gray-200">
            <h3 class="text-lg font-semibold text-on-surface">${title}</h3>
        </div>
        <div class="p-6">
            ${content}
        </div>
        <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button class="modal-submit px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">${submitText}</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.querySelector('.modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    overlay.querySelector('.modal-submit').addEventListener('click', () => {
        const result = onSubmit(overlay);
        if (result !== false) {
            overlay.remove();
        }
    });
    
    return overlay;
}

// ============================================
// ADD REGION MODAL
// ============================================
function showAddRegionModal() {
    console.log('🏗️ Opening Add Region modal');
    createModal(
        'Add Region',
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">Region Name</label>
                    <input id="regionNameInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" placeholder="e.g., Central Region" type="text" autofocus/>
                </div>
            </div>
        `,
        'Add Region',
        async (modal) => {
            const name = modal.querySelector('#regionNameInput').value.trim();
            if (!name) {
                showToast('Please enter a region name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions').add({
                    name: name,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showToast(`✅ Region "${name}" added successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error adding region:', error);
                showToast('Failed to add region: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('regionNameInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// ADD DISTRICT MODAL
// ============================================
function showAddDistrictModal(regionId) {
    const region = locationData.regions.find(r => r.id === regionId);
    if (!region) {
        showToast('Region not found', 'error');
        return;
    }
    
    createModal(
        `Add District to ${region.name}`,
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">District Name</label>
                    <input id="districtNameInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" placeholder="e.g., Abura Asebu Kwamankese" type="text" autofocus/>
                </div>
            </div>
        `,
        'Add District',
        async (modal) => {
            const name = modal.querySelector('#districtNameInput').value.trim();
            if (!name) {
                showToast('Please enter a district name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions')
                    .doc(regionId)
                    .collection('districts')
                    .add({
                        name: name,
                        regionId: regionId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                showToast(`✅ District "${name}" added successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error adding district:', error);
                showToast('Failed to add district: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('districtNameInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// ADD COMMUNITY MODAL
// ============================================
function showAddCommunityModal(regionId, districtId) {
    const region = locationData.regions.find(r => r.id === regionId);
    if (!region) {
        showToast('Region not found', 'error');
        return;
    }
    const district = region.districts.find(d => d.id === districtId);
    if (!district) {
        showToast('District not found', 'error');
        return;
    }
    
    createModal(
        `Add Community to ${district.name}`,
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">Community Name</label>
                    <input id="communityNameInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" placeholder="e.g., Kwamankese" type="text" autofocus/>
                </div>
            </div>
        `,
        'Add Community',
        async (modal) => {
            const name = modal.querySelector('#communityNameInput').value.trim();
            if (!name) {
                showToast('Please enter a community name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions')
                    .doc(regionId)
                    .collection('districts')
                    .doc(districtId)
                    .collection('communities')
                    .add({
                        name: name,
                        districtId: districtId,
                        regionId: regionId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                showToast(`✅ Community "${name}" added successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error adding community:', error);
                showToast('Failed to add community: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('communityNameInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// EDIT REGION MODAL
// ============================================
function showEditRegionModal(regionId, currentName) {
    createModal(
        'Edit Region',
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">Region Name</label>
                    <input id="editRegionInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" value="${currentName}" type="text" autofocus/>
                </div>
            </div>
        `,
        'Save Changes',
        async (modal) => {
            const name = modal.querySelector('#editRegionInput').value.trim();
            if (!name) {
                showToast('Please enter a region name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions').doc(regionId).update({
                    name: name,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                showToast(`✅ Region updated successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error updating region:', error);
                showToast('Failed to update region: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('editRegionInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// EDIT DISTRICT MODAL
// ============================================
function showEditDistrictModal(districtId, currentName, regionId) {
    createModal(
        'Edit District',
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">District Name</label>
                    <input id="editDistrictInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" value="${currentName}" type="text" autofocus/>
                </div>
            </div>
        `,
        'Save Changes',
        async (modal) => {
            const name = modal.querySelector('#editDistrictInput').value.trim();
            if (!name) {
                showToast('Please enter a district name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions')
                    .doc(regionId)
                    .collection('districts')
                    .doc(districtId)
                    .update({
                        name: name,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                showToast(`✅ District updated successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error updating district:', error);
                showToast('Failed to update district: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('editDistrictInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// EDIT COMMUNITY MODAL
// ============================================
function showEditCommunityModal(communityId, currentName, districtId, regionId) {
    createModal(
        'Edit Community',
        `
            <div class="space-y-3">
                <div>
                    <label class="text-sm font-medium text-on-surface">Community Name</label>
                    <input id="editCommunityInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all" value="${currentName}" type="text" autofocus/>
                </div>
            </div>
        `,
        'Save Changes',
        async (modal) => {
            const name = modal.querySelector('#editCommunityInput').value.trim();
            if (!name) {
                showToast('Please enter a community name', 'error');
                return false;
            }
            
            try {
                await db.collection('regions')
                    .doc(regionId)
                    .collection('districts')
                    .doc(districtId)
                    .collection('communities')
                    .doc(communityId)
                    .update({
                        name: name,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                
                showToast(`✅ Community updated successfully!`, 'success');
                loadLocations();
            } catch (error) {
                console.error('Error updating community:', error);
                showToast('Failed to update community: ' + error.message, 'error');
                return false;
            }
        }
    );
    setTimeout(() => {
        const input = document.getElementById('editCommunityInput');
        if (input) input.focus();
    }, 100);
}

// ============================================
// DELETE FUNCTIONS
// ============================================
function deleteRegion(regionId, regionName) {
    if (!confirm(`Are you sure you want to delete "${regionName}" and all its districts and communities?`)) return;
    
    const region = locationData.regions.find(r => r.id === regionId);
    if (region && region.districts.length > 0) {
        if (!confirm(`"${regionName}" has ${region.districts.length} district(s). Deleting it will also delete all districts and communities. Continue?`)) return;
    }
    
    db.collection('regions').doc(regionId).delete()
        .then(() => {
            showToast(`✅ Region "${regionName}" deleted successfully!`, 'success');
            loadLocations();
        })
        .catch(error => {
            console.error('Error deleting region:', error);
            showToast('Failed to delete region: ' + error.message, 'error');
        });
}

function deleteDistrict(districtId, districtName, regionId) {
    if (!confirm(`Are you sure you want to delete "${districtName}" and all its communities?`)) return;
    
    const region = locationData.regions.find(r => r.id === regionId);
    const district = region?.districts.find(d => d.id === districtId);
    if (district && district.communities.length > 0) {
        if (!confirm(`"${districtName}" has ${district.communities.length} communit${district.communities.length !== 1 ? 'ies' : 'y'}. Continue?`)) return;
    }
    
    db.collection('regions')
        .doc(regionId)
        .collection('districts')
        .doc(districtId)
        .delete()
        .then(() => {
            showToast(`✅ District "${districtName}" deleted successfully!`, 'success');
            loadLocations();
        })
        .catch(error => {
            console.error('Error deleting district:', error);
            showToast('Failed to delete district: ' + error.message, 'error');
        });
}

function deleteCommunity(communityId, communityName, districtId, regionId) {
    if (!confirm(`Are you sure you want to delete "${communityName}"?`)) return;
    
    db.collection('regions')
        .doc(regionId)
        .collection('districts')
        .doc(districtId)
        .collection('communities')
        .doc(communityId)
        .delete()
        .then(() => {
            showToast(`✅ Community "${communityName}" deleted successfully!`, 'success');
            loadLocations();
        })
        .catch(error => {
            console.error('Error deleting community:', error);
            showToast('Failed to delete community: ' + error.message, 'error');
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

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 Locations page initializing...');
    // Attach main buttons immediately when DOM is ready
    attachMainButtons();
    initAuth();
});

console.log('📍 Location Management page loaded');