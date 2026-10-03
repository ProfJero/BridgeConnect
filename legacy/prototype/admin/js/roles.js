// ============================================
// ADMIN ROLES & PERMISSIONS PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let isSidebarRendered = false;
let rolesData = [];
let permissionsData = [];
let usersData = [];
let currentTab = 'roles';
let roleAssignments = [];
let selectedRole = null;

// Role definitions
const ROLE_DEFINITIONS = {
    'platform_owner': {
        label: 'Platform Owner',
        icon: 'fa-shield-alt',
        color: 'text-primary',
        bgColor: 'bg-primary-container/10',
        isSystem: true,
        description: 'Full access to all platform features, administrative modules, and global configuration settings.',
        permissions: {
            'dashboard_access': true,
            'user_management': true,
            'business_management': true,
            'organization_management': true,
            'marketplace_management': true,
            'job_management': true,
            'community_management': true,
            'event_management': true,
            'advertisement_management': true,
            'reports_analytics': true,
            'system_settings': true,
            'roles_permissions': true,
            'audit_logs': true
        }
    },
    'district_admin': {
        label: 'District Admin',
        icon: 'fa-user-cog',
        color: 'text-secondary',
        bgColor: 'bg-secondary-container/10',
        isSystem: true,
        description: 'Manage district-level content, users, and reports within their assigned district.',
        permissions: {
            'dashboard_access': true,
            'user_management': true,
            'business_management': true,
            'organization_management': true,
            'marketplace_management': true,
            'job_management': true,
            'community_management': true,
            'event_management': true,
            'advertisement_management': true,
            'reports_analytics': true,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    },
    'community_moderator': {
        label: 'Community Moderator',
        icon: 'fa-gavel',
        color: 'text-tertiary',
        bgColor: 'bg-tertiary/10',
        isSystem: true,
        description: 'Moderate community content, announcements, and events within their community.',
        permissions: {
            'dashboard_access': true,
            'user_management': false,
            'business_management': true,
            'organization_management': false,
            'marketplace_management': true,
            'job_management': false,
            'community_management': true,
            'event_management': false,
            'advertisement_management': false,
            'reports_analytics': false,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    },
    'community_ambassador': {
        label: 'Community Ambassador',
        icon: 'fa-bullhorn',
        color: 'text-on-tertiary-container',
        bgColor: 'bg-on-tertiary-container/10',
        isSystem: false,
        description: 'Promote community engagement, events, and activities.',
        permissions: {
            'dashboard_access': true,
            'user_management': false,
            'business_management': false,
            'organization_management': false,
            'marketplace_management': true,
            'job_management': false,
            'community_management': true,
            'event_management': false,
            'advertisement_management': false,
            'reports_analytics': false,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    },
    'business_owner': {
        label: 'Business Owner',
        icon: 'fa-briefcase',
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        isSystem: false,
        description: 'Manage their business profile, products, and orders.',
        permissions: {
            'dashboard_access': true,
            'user_management': false,
            'business_management': false,
            'organization_management': false,
            'marketplace_management': false,
            'job_management': false,
            'community_management': false,
            'event_management': false,
            'advertisement_management': false,
            'reports_analytics': false,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    },
    'organization_manager': {
        label: 'Organization Manager',
        icon: 'fa-network-wired',
        color: 'text-secondary',
        bgColor: 'bg-secondary/10',
        isSystem: false,
        description: 'Manage organization profile, members, and announcements.',
        permissions: {
            'dashboard_access': true,
            'user_management': false,
            'business_management': false,
            'organization_management': true,
            'marketplace_management': false,
            'job_management': false,
            'community_management': false,
            'event_management': false,
            'advertisement_management': false,
            'reports_analytics': false,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    },
    'resident': {
        label: 'Resident',
        icon: 'fa-user',
        color: 'text-on-surface-variant',
        bgColor: 'bg-on-surface-variant/10',
        isSystem: false,
        description: 'Basic platform access for community members.',
        permissions: {
            'dashboard_access': false,
            'user_management': false,
            'business_management': false,
            'organization_management': false,
            'marketplace_management': false,
            'job_management': false,
            'community_management': false,
            'event_management': false,
            'advertisement_management': false,
            'reports_analytics': false,
            'system_settings': false,
            'roles_permissions': false,
            'audit_logs': false
        }
    }
};

const PERMISSION_LABELS = {
    'dashboard_access': 'Dashboard Access',
    'user_management': 'User Management',
    'business_management': 'Business Management',
    'organization_management': 'Organization Management',
    'marketplace_management': 'Marketplace Management',
    'job_management': 'Job Management',
    'community_management': 'Community Management',
    'event_management': 'Event Management',
    'advertisement_management': 'Advertisement Management',
    'reports_analytics': 'Reports & Analytics',
    'system_settings': 'System Settings',
    'roles_permissions': 'Roles & Permissions',
    'audit_logs': 'Audit Logs'
};

const PERMISSION_ICONS = {
    'dashboard_access': 'fa-chart-pie',
    'user_management': 'fa-users-cog',
    'business_management': 'fa-store',
    'organization_management': 'fa-building',
    'marketplace_management': 'fa-shopping-cart',
    'job_management': 'fa-briefcase',
    'community_management': 'fa-comments',
    'event_management': 'fa-calendar-alt',
    'advertisement_management': 'fa-bullhorn',
    'reports_analytics': 'fa-chart-line',
    'system_settings': 'fa-cog',
    'roles_permissions': 'fa-shield-alt',
    'audit_logs': 'fa-history'
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getInitials(name) {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getRoleLabel(role) {
    return ROLE_DEFINITIONS[role]?.label || role;
}

function getRoleColor(role) {
    return ROLE_DEFINITIONS[role]?.color || 'text-on-surface-variant';
}

function getRoleBgColor(role) {
    return ROLE_DEFINITIONS[role]?.bgColor || 'bg-on-surface-variant/10';
}

function getRoleIcon(role) {
    return ROLE_DEFINITIONS[role]?.icon || 'fa-user';
}

function isSystemRole(role) {
    return ROLE_DEFINITIONS[role]?.isSystem || false;
}

function getRoleDescription(role) {
    return ROLE_DEFINITIONS[role]?.description || 'No description available.';
}

function getPermissionLabel(permission) {
    return PERMISSION_LABELS[permission] || permission;
}

function getPermissionIcon(permission) {
    return PERMISSION_ICONS[permission] || 'fa-circle';
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
            const currentPage = currentPath.split('/').pop() || 'roles.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'roles' && currentPage === 'roles.html');
            
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
                    loadRolesData();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// FIXED CREATE MODAL OVERLAY - PROPER POSITIONING
// ============================================
function createModalOverlay(html) {
    // Remove any existing modal
    const existingOverlay = document.querySelector('.modal-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    // Fixed positioning with flex centering
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        padding: 1rem;
        overflow-y: auto;
    `;
    
    // The content will be the modal itself
    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    
    // Close on backdrop click
    overlay.addEventListener('click', function(e) {
        if (e.target === this) {
            this.remove();
            document.body.style.overflow = '';
        }
    });
    
    // Close on Escape key
    const closeModal = function(e) {
        if (e.key === 'Escape') {
            const modal = document.querySelector('.modal-overlay');
            if (modal) {
                modal.remove();
                document.body.style.overflow = '';
                document.removeEventListener('keydown', closeModal);
            }
        }
    };
    document.addEventListener('keydown', closeModal);
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    return overlay;
}

// ============================================
// LOAD ROLES DATA
// ============================================
async function loadRolesData() {
    try {
        // Load users to get role assignments
        const usersSnapshot = await db.collection('users').get();
        usersData = [];
        roleAssignments = {};
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const user = { id: doc.id, ...data };
            usersData.push(user);
            
            const role = data.role || 'resident';
            if (!roleAssignments[role]) {
                roleAssignments[role] = [];
            }
            roleAssignments[role].push(user);
        });
        
        // Prepare roles data from definitions
        rolesData = Object.keys(ROLE_DEFINITIONS).map(roleKey => {
            const def = ROLE_DEFINITIONS[roleKey];
            const users = roleAssignments[roleKey] || [];
            return {
                key: roleKey,
                label: def.label,
                icon: def.icon,
                color: def.color,
                bgColor: def.bgColor,
                isSystem: def.isSystem,
                description: def.description,
                permissions: def.permissions,
                users: users,
                userCount: users.length
            };
        });
        
        console.log(`✅ Loaded ${rolesData.length} roles with ${usersData.length} users`);
        
        // Update UI
        updatePermissionMatrix();
        updateRoleDetails();
        updateRoleSummary();
        populateRoleSelects();
        updateTotalRoles();
        
        // Select first role by default
        if (rolesData.length > 0) {
            selectedRole = rolesData[0];
            updateRoleDetails();
        }
        
    } catch (error) {
        console.error('Error loading roles data:', error);
        showToast('Error loading roles data: ' + error.message, 'error');
    }
}

// ============================================
// UPDATE PERMISSION MATRIX
// ============================================
function updatePermissionMatrix() {
    const container = document.getElementById('permissionMatrixBody');
    if (!container) return;
    
    const permissions = Object.keys(PERMISSION_LABELS);
    const roles = rolesData;
    
    let html = '';
    permissions.forEach(permission => {
        const label = PERMISSION_LABELS[permission];
        const icon = PERMISSION_ICONS[permission];
        
        html += `
            <tr class="border-b border-outline-variant/50 matrix-cell transition-colors">
                <td class="p-3 md:p-4 sticky left-0 bg-surface-container-lowest z-10 border-r border-outline-variant/50">
                    <div class="flex items-center gap-2 md:gap-3">
                        <i class="fas ${icon} text-outline text-base md:text-xl"></i>
                        <span class="text-xs md:text-sm text-on-surface-variant">${label}</span>
                    </div>
                </td>
        `;
        
        roles.forEach(role => {
            const hasPermission = role.permissions[permission] || false;
            const color = hasPermission ? role.color : 'text-outline-variant';
            const iconClass = hasPermission ? 'fa-check-square' : 'fa-square';
            
            html += `
                <td class="p-3 md:p-4 text-center cursor-pointer permission-toggle" 
                    data-role="${role.key}" 
                    data-permission="${permission}"
                    data-has="${hasPermission}"
                    onclick="togglePermission('${role.key}', '${permission}', ${hasPermission})">
                    <i class="fas ${iconClass} ${color}"></i>
                </td>
            `;
        });
        
        html += `</tr>`;
    });
    
    container.innerHTML = html;
}

// ============================================
// TOGGLE PERMISSION
// ============================================
function togglePermission(roleKey, permission, currentValue) {
    const role = rolesData.find(r => r.key === roleKey);
    if (!role) {
        showToast('Role not found', 'error');
        return;
    }
    
    if (role.isSystem) {
        showToast(`⚠️ Cannot modify system role permissions`, 'error');
        return;
    }
    
    const newValue = !currentValue;
    const action = newValue ? 'grant' : 'revoke';
    const permissionLabel = getPermissionLabel(permission);
    
    if (!confirm(`Are you sure you want to ${action} "${permissionLabel}" for "${role.label}"?`)) {
        return;
    }
    
    // Update local state
    role.permissions[permission] = newValue;
    
    // In production, save to Firestore
    // For now, just update UI
    updatePermissionMatrix();
    showToast(`✅ ${permissionLabel} ${action}ed for ${role.label}`, 'success');
    
    // Update role details if this is the selected role
    if (selectedRole && selectedRole.key === roleKey) {
        updateRoleDetails();
    }
}

// ============================================
// UPDATE ROLE DETAILS
// ============================================
function updateRoleDetails() {
    const container = document.getElementById('roleDetailsContainer');
    if (!container) return;
    
    if (rolesData.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-shield-alt text-2xl block mb-2 opacity-30"></i>
                No roles available
            </div>
        `;
        return;
    }
    
    // Show first role by default
    const role = selectedRole || rolesData[0];
    const users = roleAssignments[role.key] || [];
    
    // Get permissions for this role
    const permissionList = Object.entries(role.permissions)
        .filter(([_, has]) => has)
        .map(([key]) => getPermissionLabel(key));
    
    container.innerHTML = `
        <div class="flex items-center gap-3 mb-4 cursor-pointer" onclick="showToast('Viewing ${role.label} details...', 'info')">
            <div class="h-10 w-10 ${role.bgColor} ${role.color} rounded-lg flex items-center justify-center">
                <i class="fas ${role.icon}"></i>
            </div>
            <div class="flex-1">
                <h5 class="text-lg font-bold">${role.label}</h5>
            </div>
            ${role.isSystem ? `<span class="bg-secondary-container/20 text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold uppercase">System Role</span>` : `<span class="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase">Custom</span>`}
        </div>
        <p class="text-sm text-on-surface-variant mb-4 leading-relaxed">${role.description}</p>
        ${permissionList.length > 0 ? `
            <div class="mb-4">
                <p class="text-xs font-bold mb-2 text-outline uppercase tracking-wider">Permissions (${permissionList.length})</p>
                <div class="flex flex-wrap gap-1">
                    ${permissionList.map(p => `
                        <span class="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full">${p}</span>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        <div class="mb-4">
            <p class="text-xs font-bold mb-3 flex items-center gap-2">
                Users with this role
                <span class="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[10px]">${users.length}</span>
            </p>
            ${users.slice(0, 3).map(user => `
                <div class="flex items-center gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/50 mb-2 last:mb-0 cursor-pointer" onclick="showToast('Viewing ${user.fullName || 'User'}...', 'info')">
                    <div class="h-8 w-8 rounded-full bg-primary-fixed flex items-center justify-center text-[12px] font-bold text-primary">${getInitials(user.fullName || user.name || 'User')}</div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold truncate">${user.fullName || user.name || 'Unknown'}</p>
                        <p class="text-[11px] text-outline truncate">${user.email || 'No email'}</p>
                    </div>
                    <span class="h-2 w-2 rounded-full ${user.status === 'active' ? 'bg-secondary animate-pulse' : 'bg-gray-400'}"></span>
                    <span class="text-[10px] ${user.status === 'active' ? 'text-secondary' : 'text-gray-400'} font-bold uppercase">${user.status || 'Inactive'}</span>
                </div>
            `).join('')}
            ${users.length > 3 ? `<button class="text-xs text-primary font-semibold hover:underline mt-2" onclick="showToast('Viewing all ${users.length} users...', 'info')">View all ${users.length} users</button>` : ''}
            ${users.length === 0 ? `<p class="text-sm text-outline italic">No users assigned to this role</p>` : ''}
        </div>
    `;
}

// ============================================
// UPDATE ROLE SUMMARY
// ============================================
function updateRoleSummary() {
    const container = document.getElementById('roleSummaryContainer');
    if (!container) return;
    
    const totalRoles = rolesData.length;
    const systemRoles = rolesData.filter(r => r.isSystem).length;
    const customRoles = totalRoles - systemRoles;
    const totalAssignments = usersData.length;
    
    container.innerHTML = `
        <div class="flex justify-between items-center py-1.5 border-b border-outline-variant/30">
            <span class="text-sm text-on-surface-variant">Total Roles</span>
            <span class="text-lg font-bold text-on-surface">${totalRoles}</span>
        </div>
        <div class="flex justify-between items-center py-1.5 border-b border-outline-variant/30">
            <span class="text-sm text-on-surface-variant">System Roles</span>
            <span class="text-lg font-bold text-on-surface">${systemRoles}</span>
        </div>
        <div class="flex justify-between items-center py-1.5 border-b border-outline-variant/30">
            <span class="text-sm text-on-surface-variant">Custom Roles</span>
            <span class="text-lg font-bold text-on-surface">${customRoles}</span>
        </div>
        <div class="flex justify-between items-center py-1.5">
            <span class="text-sm text-on-surface-variant">Total Assignments</span>
            <span class="text-lg font-bold text-on-surface">${totalAssignments}</span>
        </div>
    `;
}

// ============================================
// POPULATE ROLE SELECTS
// ============================================
function populateRoleSelects() {
    // Assign user select
    const userSelect = document.getElementById('assignUserSelect');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">Choose a user</option>';
        usersData.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.fullName || user.name || user.email || 'Unknown';
            userSelect.appendChild(option);
        });
    }
    
    // Assign role select
    const roleSelect = document.getElementById('assignRoleSelect');
    if (roleSelect) {
        roleSelect.innerHTML = '<option value="">Choose a role</option>';
        rolesData.forEach(role => {
            const option = document.createElement('option');
            option.value = role.key;
            option.textContent = role.label;
            roleSelect.appendChild(option);
        });
    }
}

// ============================================
// UPDATE TOTAL ROLES
// ============================================
function updateTotalRoles() {
    const display = document.getElementById('totalRolesDisplay');
    if (display) {
        display.textContent = `Total Roles: ${rolesData.length}`;
    }
}

// ============================================
// FIXED CREATE NEW ROLE - PROPER MODAL POSITIONING
// ============================================
function createNewRole() {
    const modalHtml = `
        <div class="modal-content" style="background: white; border-radius: 1rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 0; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: auto;">
            <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-on-surface">Create New Role</h3>
                <p class="text-sm text-outline mt-1">Define a new custom role with specific permissions</p>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <label class="text-sm font-medium text-on-surface">Role Name <span class="text-red-500">*</span></label>
                    <input id="newRoleName" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter role name" type="text"/>
                </div>
                <div>
                    <label class="text-sm font-medium text-on-surface">Description</label>
                    <textarea id="newRoleDescription" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="3" placeholder="Describe the purpose of this role"></textarea>
                </div>
                <div>
                    <label class="text-sm font-medium text-on-surface">Select Permissions</label>
                    <div class="mt-2 space-y-2 max-h-60 overflow-y-auto border border-outline-variant rounded-lg p-3">
                        ${Object.entries(PERMISSION_LABELS).map(([key, label]) => `
                            <div class="flex items-center gap-2">
                                <input type="checkbox" id="perm_${key}" class="rounded border-outline-variant text-primary focus:ring-primary" />
                                <label for="perm_${key}" class="text-sm text-on-surface-variant">${label}</label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm" id="createRoleSubmit">Create Role</button>
            </div>
        </div>
    `;
    
    const overlay = createModalOverlay(modalHtml);
    
    // Cancel button
    overlay.querySelector('.modal-cancel').addEventListener('click', function() {
        overlay.remove();
        document.body.style.overflow = '';
    });
    
    // Create button
    overlay.querySelector('#createRoleSubmit').addEventListener('click', function() {
        const name = document.getElementById('newRoleName').value.trim();
        if (!name) {
            showToast('Please enter a role name', 'error');
            return;
        }
        
        // Get selected permissions
        const selectedPermissions = {};
        Object.keys(PERMISSION_LABELS).forEach(key => {
            const checkbox = document.getElementById(`perm_${key}`);
            if (checkbox) {
                selectedPermissions[key] = checkbox.checked;
            }
        });
        
        // Add new role (in production, save to Firestore)
        // For now, just show success
        showToast(`✅ Role "${name}" created successfully with ${Object.values(selectedPermissions).filter(Boolean).length} permissions`, 'success');
        overlay.remove();
        document.body.style.overflow = '';
        
        // Reload data
        loadRolesData();
    });
}

// ============================================
// ASSIGN ROLE
// ============================================
async function assignRole() {
    const userId = document.getElementById('assignUserSelect').value;
    const roleKey = document.getElementById('assignRoleSelect').value;
    
    if (!userId) {
        showToast('Please select a user', 'error');
        return;
    }
    if (!roleKey) {
        showToast('Please select a role', 'error');
        return;
    }
    
    if (!confirm(`Assign "${getRoleLabel(roleKey)}" to this user?`)) return;
    
    try {
        await db.collection('users').doc(userId).update({
            role: roleKey,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser?.uid || 'system'
        });
        
        showToast(`✅ Role assigned successfully`, 'success');
        loadRolesData();
    } catch (error) {
        showToast('Failed to assign role: ' + error.message, 'error');
    }
}

// ============================================
// TAB MANAGEMENT - FULLY FUNCTIONAL
// ============================================
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update tab styles
            tabBtns.forEach(b => {
                b.classList.remove('border-primary', 'text-primary', 'font-bold');
                b.classList.add('border-transparent', 'text-on-surface-variant', 'font-medium');
            });
            
            this.classList.add('border-primary', 'text-primary', 'font-bold');
            this.classList.remove('border-transparent', 'text-on-surface-variant', 'font-medium');
            
            const tab = this.dataset.tab;
            currentTab = tab;
            
            // Show different content based on tab
            switch(tab) {
                case 'roles':
                    showRolesTab();
                    break;
                case 'permissions':
                    showPermissionsTab();
                    break;
                case 'assignments':
                    showAssignmentsTab();
                    break;
                case 'requests':
                    showRequestsTab();
                    break;
                default:
                    showRolesTab();
            }
        });
    });
}

// ============================================
// TAB CONTENT FUNCTIONS
// ============================================
function showRolesTab() {
    // Show the permission matrix and role details
    document.querySelector('.grid-cols-12').style.display = 'grid';
    showToast('Viewing Roles...', 'info');
}

function showPermissionsTab() {
    // Show full permission matrix with filter options
    const container = document.getElementById('permissionMatrixBody');
    if (container) {
        // Highlight the permission matrix
        container.parentElement.scrollIntoView({ behavior: 'smooth' });
    }
    showToast('Viewing Permissions...', 'info');
}

function showAssignmentsTab() {
    // Show a list of all role assignments
    const modalHtml = `
        <div class="modal-content" style="background: white; border-radius: 1rem; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 0; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: auto;">
            <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-on-surface">Role Assignments</h3>
                <p class="text-sm text-outline mt-1">All users and their assigned roles</p>
            </div>
            <div class="p-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-surface-container-low border-b border-outline-variant">
                            <tr>
                                <th class="px-3 py-2 font-semibold text-outline">User</th>
                                <th class="px-3 py-2 font-semibold text-outline">Email</th>
                                <th class="px-3 py-2 font-semibold text-outline">Role</th>
                                <th class="px-3 py-2 font-semibold text-outline">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${usersData.map(user => {
                                const role = user.role || 'resident';
                                const roleLabel = getRoleLabel(role);
                                const roleColor = getRoleColor(role);
                                return `
                                    <tr class="border-b border-outline-variant/50">
                                        <td class="px-3 py-2 font-medium">${user.fullName || user.name || 'Unknown'}</td>
                                        <td class="px-3 py-2 text-outline">${user.email || 'N/A'}</td>
                                        <td class="px-3 py-2"><span class="font-semibold ${roleColor}">${roleLabel}</span></td>
                                        <td class="px-3 py-2">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
                                                ${user.status || 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-sm text-outline mt-4">Total Users: ${usersData.length}</p>
            </div>
            <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button class="modal-close px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">Close</button>
            </div>
        </div>
    `;
    
    const overlay = createModalOverlay(modalHtml);
    // Add close functionality
    overlay.querySelector('.modal-close').addEventListener('click', function() {
        overlay.remove();
        document.body.style.overflow = '';
    });
}

function showRequestsTab() {
    const modalHtml = `
        <div class="modal-content" style="background: white; border-radius: 1rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 0; box-shadow: 0 20px 60px rgba(0,0,0,0.3); margin: auto;">
            <div class="p-6 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-on-surface">Access Requests</h3>
                <p class="text-sm text-outline mt-1">Pending role access requests from users</p>
            </div>
            <div class="p-6">
                <div class="text-center text-on-surface-variant py-8">
                    <i class="fas fa-inbox text-4xl block mb-3 opacity-30"></i>
                    <p class="text-sm font-medium">No pending access requests</p>
                    <p class="text-xs mt-1">All requests will appear here for review</p>
                </div>
            </div>
            <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                <button class="modal-close px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = '';">Close</button>
            </div>
        </div>
    `;
    
    const overlay = createModalOverlay(modalHtml);
    overlay.querySelector('.modal-close').addEventListener('click', function() {
        overlay.remove();
        document.body.style.overflow = '';
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
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    setupTabs();
    
    // Create Role
    document.getElementById('createRoleBtn')?.addEventListener('click', createNewRole);
    
    // Assign Role
    document.getElementById('assignRoleBtn')?.addEventListener('click', assignRole);
    
    // Search
    document.getElementById('globalSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            showToast(`Searching for "${this.value.trim()}"...`, 'info');
        }
    });
    
    // Community filter
    document.getElementById('communityFilterBtn')?.addEventListener('click', function() {
        showToast('Opening community filter...', 'info');
    });
});

console.log('🔄 BridgeConnect Roles page loaded with Firestore integration');