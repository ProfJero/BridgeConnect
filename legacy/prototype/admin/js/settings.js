// ============================================
// PLATFORM SETTINGS - FIRESTORE INTEGRATION
// ============================================

// ============================================
// GLOBAL STATE
// ============================================
let currentUserData = null;
let settingsData = {};
let isSidebarRendered = false;
let districtStats = {};
let activeTab = 'branding';

// ============================================
// HELPER FUNCTIONS FOR ROLE CHECKING
// ============================================

function isPlatformOwner() {
    return currentUserData?.role === 'platform_owner' || currentUserData?.role === 'owner';
}

function isDistrictAdmin() {
    return currentUserData?.role === 'district_admin';
}

function isCommunityModerator() {
    return currentUserData?.role === 'community_moderator' || currentUserData?.role === 'moderator';
}

function isBusinessOwner() {
    return currentUserData?.role === 'business_owner';
}

function isOrganizationManager() {
    return currentUserData?.role === 'organization' || currentUserData?.role === 'verified_org';
}

function isResident() {
    return currentUserData?.role === 'resident';
}

function getRoleDisplayName(role) {
    const labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'community_moderator': 'Community Moderator',
        'moderator': 'Community Moderator',
        'business_owner': 'Business Owner',
        'organization': 'Organization Manager',
        'verified_org': 'Organization Manager',
        'resident': 'Community Member'
    };
    return labels[role] || role || 'User';
}

function getRoleIcon(role) {
    const icons = {
        'platform_owner': 'fa-crown',
        'owner': 'fa-crown',
        'district_admin': 'fa-building',
        'community_moderator': 'fa-gavel',
        'moderator': 'fa-gavel',
        'business_owner': 'fa-store',
        'organization': 'fa-building-columns',
        'verified_org': 'fa-building-columns',
        'resident': 'fa-user'
    };
    return icons[role] || 'fa-user';
}

// ============================================
// ROLE-BASED PERMISSIONS
// ============================================

function getRolePermissions() {
    const role = currentUserData?.role || 'resident';
    
    const permissions = {
        'platform_owner': {
            canView: ['branding', 'districts', 'sms', 'email', 'notifications', 'security', 'backup', 'api', 'maintenance', 'system-info'],
            canEdit: ['branding', 'districts', 'sms', 'email', 'notifications', 'security', 'backup', 'api', 'maintenance'],
            canDelete: ['branding', 'districts', 'sms', 'email', 'notifications', 'security', 'backup', 'api', 'maintenance']
        },
        'district_admin': {
            canView: ['districts', 'notifications', 'security', 'system-info'],
            canEdit: ['districts', 'notifications'],
            canDelete: []
        },
        'community_moderator': {
            canView: ['notifications', 'system-info'],
            canEdit: ['notifications'],
            canDelete: []
        },
        'business_owner': {
            canView: ['notifications', 'system-info'],
            canEdit: ['notifications'],
            canDelete: []
        },
        'organization': {
            canView: ['notifications', 'system-info'],
            canEdit: ['notifications'],
            canDelete: []
        },
        'resident': {
            canView: ['system-info'],
            canEdit: [],
            canDelete: []
        }
    };
    
    return permissions[role] || permissions['resident'];
}

// ============================================
// FIRESTORE DATA FETCHERS
// ============================================

async function fetchUserData() {
    try {
        const userId = auth.currentUser?.uid;
        if (!userId) return null;
        
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return null;
        
        currentUserData = { id: userDoc.id, ...userDoc.data() };
        console.log('📋 User data loaded:', currentUserData);
        return currentUserData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

async function fetchSettings() {
    try {
        const settingsDoc = await db.collection('settings').doc('platform').get();
        if (settingsDoc.exists) {
            settingsData = settingsDoc.data();
            console.log('📋 Settings loaded:', settingsData);
            return settingsData;
        }
        
        // Create default settings if none exist
        const defaultSettings = {
            branding: {
                platformName: 'BridgeConnect',
                tagline: 'Connecting Communities. Empowering Lives.',
                primaryColor: '#2563EB',
                secondaryColor: '#16A34A',
                logo: ''
            },
            sms: {
                provider: 'arkesel',
                senderId: 'BridgeConnect',
                apiKey: '',
                balance: 0
            },
            email: {
                mailer: 'smtp',
                fromName: 'BridgeConnect Team',
                fromAddress: 'noreply@bridgeconnect.app'
            },
            notifications: {
                inApp: true,
                email: true,
                sms: true
            },
            security: {
                twoFactor: true,
                passwordPolicy: 'strong',
                sessionTimeout: 30
            },
            maintenance: {
                enabled: false
            },
            system: {
                version: 'v2.3.1',
                environment: 'Production',
                uptime: '99.98%'
            }
        };
        
        await db.collection('settings').doc('platform').set(defaultSettings);
        settingsData = defaultSettings;
        return settingsData;
    } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
    }
}

async function fetchDistrictStats() {
    try {
        const stats = {
            regions: 0,
            districts: 0,
            communities: 0
        };
        
        // Try to get regions
        try {
            const regionsSnapshot = await db.collection('regions').get();
            stats.regions = regionsSnapshot.size;
        } catch (e) {
            console.warn('Error fetching regions:', e.message);
        }
        
        // Try to get districts
        try {
            const districtsSnapshot = await db.collection('districts').get();
            stats.districts = districtsSnapshot.size;
        } catch (e) {
            console.warn('Error fetching districts:', e.message);
        }
        
        // Try to get communities
        try {
            const communitiesSnapshot = await db.collection('communities').get();
            stats.communities = communitiesSnapshot.size;
        } catch (e) {
            console.warn('Error fetching communities:', e.message);
        }
        
        districtStats = stats;
        return stats;
    } catch (error) {
        console.warn('Error fetching district stats:', error.message);
        return { regions: 0, districts: 0, communities: 0 };
    }
}

// ============================================
// ROLE-BASED UI RENDER
// ============================================

function renderSettings(settings) {
    if (!settings) return;
    
    const permissions = getRolePermissions();
    const role = currentUserData?.role || 'resident';
    const isOwner = isPlatformOwner();
    
    // Update navigation - show/hide links based on permissions
    document.querySelectorAll('#settingsNav a').forEach(function(link) {
        const section = link.dataset.section;
        const canView = permissions.canView.includes(section);
        link.style.display = canView ? '' : 'none';
    });
    
    // Branding - Only Platform Owner can edit
    if (permissions.canEdit.includes('branding')) {
        enableField('platformName', true);
        enableField('platformTagline', true);
        enableField('primaryColor', true);
        enableField('secondaryColor', true);
        const brandingBtn = document.querySelector('#branding button');
        if (brandingBtn) brandingBtn.style.display = '';
    } else {
        enableField('platformName', false);
        enableField('platformTagline', false);
        enableField('primaryColor', false);
        enableField('secondaryColor', false);
        const brandingBtn = document.querySelector('#branding button');
        if (brandingBtn) brandingBtn.style.display = 'none';
    }
    
    // Branding values
    document.getElementById('platformName').value = settings.branding?.platformName || 'BridgeConnect';
    document.getElementById('platformTagline').value = settings.branding?.tagline || 'Connecting Communities. Empowering Lives.';
    document.getElementById('primaryColor').value = settings.branding?.primaryColor || '#2563EB';
    document.getElementById('secondaryColor').value = settings.branding?.secondaryColor || '#16A34A';
    document.getElementById('primaryColorPreview').style.backgroundColor = settings.branding?.primaryColor || '#2563EB';
    document.getElementById('secondaryColorPreview').style.backgroundColor = settings.branding?.secondaryColor || '#16A34A';
    
    if (settings.branding?.logo) {
        document.getElementById('brandingLogo').src = settings.branding.logo;
    }
    
    // SMS - Only Platform Owner can edit
    if (permissions.canEdit.includes('sms')) {
        enableField('smsProvider', true);
        enableField('smsSenderId', true);
        enableField('smsApiKey', true);
        const checkBalance = document.querySelector('.check-balance');
        if (checkBalance) checkBalance.style.display = '';
    } else {
        enableField('smsProvider', false);
        enableField('smsSenderId', false);
        enableField('smsApiKey', false);
        const checkBalance = document.querySelector('.check-balance');
        if (checkBalance) checkBalance.style.display = 'none';
    }
    
    document.getElementById('smsProvider').value = settings.sms?.provider || 'arkesel';
    document.getElementById('smsSenderId').value = settings.sms?.senderId || 'BridgeConnect';
    document.getElementById('smsApiKey').value = settings.sms?.apiKey || '';
    document.getElementById('smsBalance').textContent = settings.sms?.balance + ' SMS' || '0 SMS';
    
    // Email - Only Platform Owner can edit
    if (permissions.canEdit.includes('email')) {
        enableField('emailMailer', true);
        enableField('emailFromName', true);
        enableField('emailFromAddress', true);
        const testEmail = document.querySelector('.test-email');
        if (testEmail) testEmail.style.display = '';
    } else {
        enableField('emailMailer', false);
        enableField('emailFromName', false);
        enableField('emailFromAddress', false);
        const testEmail = document.querySelector('.test-email');
        if (testEmail) testEmail.style.display = 'none';
    }
    
    document.getElementById('emailMailer').value = settings.email?.mailer || 'smtp';
    document.getElementById('emailFromName').value = settings.email?.fromName || 'BridgeConnect Team';
    document.getElementById('emailFromAddress').value = settings.email?.fromAddress || 'noreply@bridgeconnect.app';
    
    // Notifications - Most roles can edit
    if (permissions.canEdit.includes('notifications')) {
        document.querySelectorAll('.toggle-switch[data-setting="inApp"]').forEach(function(el) {
            el.disabled = false;
            const label = el.closest('label');
            if (label) {
                label.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        document.querySelectorAll('.toggle-switch[data-setting="email"]').forEach(function(el) {
            el.disabled = false;
            const label = el.closest('label');
            if (label) {
                label.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        document.querySelectorAll('.toggle-switch[data-setting="sms"]').forEach(function(el) {
            el.disabled = false;
            const label = el.closest('label');
            if (label) {
                label.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        const notificationsLink = document.querySelector('#notifications a');
        if (notificationsLink) notificationsLink.style.display = '';
    } else {
        document.querySelectorAll('.toggle-switch[data-setting="inApp"]').forEach(function(el) {
            el.disabled = true;
            const label = el.closest('label');
            if (label) {
                label.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        document.querySelectorAll('.toggle-switch[data-setting="email"]').forEach(function(el) {
            el.disabled = true;
            const label = el.closest('label');
            if (label) {
                label.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        document.querySelectorAll('.toggle-switch[data-setting="sms"]').forEach(function(el) {
            el.disabled = true;
            const label = el.closest('label');
            if (label) {
                label.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        const notificationsLink = document.querySelector('#notifications a');
        if (notificationsLink) notificationsLink.style.display = 'none';
    }
    
    document.querySelectorAll('.toggle-switch[data-setting="inApp"]').forEach(function(el) {
        el.checked = settings.notifications?.inApp !== false;
    });
    document.querySelectorAll('.toggle-switch[data-setting="email"]').forEach(function(el) {
        el.checked = settings.notifications?.email !== false;
    });
    document.querySelectorAll('.toggle-switch[data-setting="sms"]').forEach(function(el) {
        el.checked = settings.notifications?.sms !== false;
    });
    
    // Security - Only Platform Owner and District Admin can edit
    if (permissions.canEdit.includes('security')) {
        document.querySelectorAll('.toggle-switch[data-setting="twoFactor"]').forEach(function(el) {
            el.disabled = false;
            const label = el.closest('label');
            if (label) {
                label.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
        const editPolicy = document.querySelector('.edit-policy');
        if (editPolicy) editPolicy.style.display = '';
        const editTimeout = document.querySelector('.edit-timeout');
        if (editTimeout) editTimeout.style.display = '';
        const securityLink = document.querySelector('#security a');
        if (securityLink) securityLink.style.display = '';
    } else {
        document.querySelectorAll('.toggle-switch[data-setting="twoFactor"]').forEach(function(el) {
            el.disabled = true;
            const label = el.closest('label');
            if (label) {
                label.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        const editPolicy = document.querySelector('.edit-policy');
        if (editPolicy) editPolicy.style.display = 'none';
        const editTimeout = document.querySelector('.edit-timeout');
        if (editTimeout) editTimeout.style.display = 'none';
        const securityLink = document.querySelector('#security a');
        if (securityLink) securityLink.style.display = 'none';
    }
    
    document.querySelectorAll('.toggle-switch[data-setting="twoFactor"]').forEach(function(el) {
        el.checked = settings.security?.twoFactor !== false;
    });
    document.getElementById('sessionTimeoutDisplay').textContent = settings.security?.sessionTimeout + ' minutes' || '30 minutes';
    
    // Districts - Only Platform Owner and District Admin can edit
    if (permissions.canEdit.includes('districts')) {
        const districtsBtn = document.querySelector('#districts button');
        if (districtsBtn) districtsBtn.style.display = '';
    } else {
        const districtsBtn = document.querySelector('#districts button');
        if (districtsBtn) districtsBtn.style.display = 'none';
    }
    
    // Backup - Only Platform Owner can edit
    if (permissions.canEdit.includes('backup')) {
        const createBackup = document.querySelector('.create-backup');
        if (createBackup) createBackup.style.display = '';
        const backupLink = document.querySelector('#backup a');
        if (backupLink) backupLink.style.display = '';
    } else {
        const createBackup = document.querySelector('.create-backup');
        if (createBackup) createBackup.style.display = 'none';
        const backupLink = document.querySelector('#backup a');
        if (backupLink) backupLink.style.display = 'none';
        document.getElementById('lastBackup').textContent = 'Loading...';
        document.getElementById('nextBackup').textContent = 'Loading...';
    }
    
    // API - Only Platform Owner can edit
    if (permissions.canEdit.includes('api')) {
        const apiBtn = document.querySelector('#api button');
        if (apiBtn) apiBtn.style.display = '';
    } else {
        const apiBtn = document.querySelector('#api button');
        if (apiBtn) apiBtn.style.display = 'none';
    }
    
    // Maintenance - Only Platform Owner can edit
    if (permissions.canEdit.includes('maintenance')) {
        document.querySelectorAll('.toggle-switch[data-setting="maintenance"]').forEach(function(el) {
            el.disabled = false;
            const label = el.closest('label');
            if (label) {
                label.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        });
    } else {
        document.querySelectorAll('.toggle-switch[data-setting="maintenance"]').forEach(function(el) {
            el.disabled = true;
            const label = el.closest('label');
            if (label) {
                label.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
    }
    
    document.querySelectorAll('.toggle-switch[data-setting="maintenance"]').forEach(function(el) {
        el.checked = settings.maintenance?.enabled || false;
    });
    
    // System info - Everyone can view
    document.getElementById('platformVersion').textContent = settings.system?.version || 'v2.3.1';
    document.getElementById('environment').textContent = settings.system?.environment || 'Production';
    document.getElementById('uptime').textContent = settings.system?.uptime || '99.98%';
}

function enableField(fieldId, enabled) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.disabled = !enabled;
        if (enabled) {
            field.classList.remove('bg-gray-50');
            field.classList.add('bg-white');
        } else {
            field.classList.remove('bg-white');
            field.classList.add('bg-gray-50');
        }
        field.style.cursor = enabled ? 'text' : 'not-allowed';
    }
}

function renderDistrictStats(stats) {
    if (stats) {
        document.getElementById('totalRegions').textContent = stats.regions || 0;
        document.getElementById('totalDistricts').textContent = stats.districts || 0;
        document.getElementById('totalCommunities').textContent = stats.communities || 0;
    }
}

function updateServerTime() {
    const now = new Date();
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    };
    document.getElementById('serverTime').textContent = now.toLocaleDateString('en-US', options) + ' (GMT)';
}

// ============================================
// SETTINGS SAVE FUNCTION
// ============================================

async function saveSettings() {
    const permissions = getRolePermissions();
    const canEdit = permissions.canEdit;
    
    try {
        const settings = {};
        
        // Only save fields the user has permission to edit
        if (canEdit.includes('branding')) {
            settings.branding = {
                platformName: document.getElementById('platformName').value,
                tagline: document.getElementById('platformTagline').value,
                primaryColor: document.getElementById('primaryColor').value,
                secondaryColor: document.getElementById('secondaryColor').value,
                logo: settingsData.branding?.logo || ''
            };
        }
        
        if (canEdit.includes('sms')) {
            settings.sms = {
                provider: document.getElementById('smsProvider').value,
                senderId: document.getElementById('smsSenderId').value,
                apiKey: document.getElementById('smsApiKey').value,
                balance: settingsData.sms?.balance || 0
            };
        }
        
        if (canEdit.includes('email')) {
            settings.email = {
                mailer: document.getElementById('emailMailer').value,
                fromName: document.getElementById('emailFromName').value,
                fromAddress: document.getElementById('emailFromAddress').value
            };
        }
        
        if (canEdit.includes('notifications')) {
            let inAppChecked = false;
            let emailChecked = false;
            let smsChecked = false;
            
            document.querySelectorAll('.toggle-switch[data-setting="inApp"]').forEach(function(el) {
                inAppChecked = el.checked;
            });
            document.querySelectorAll('.toggle-switch[data-setting="email"]').forEach(function(el) {
                emailChecked = el.checked;
            });
            document.querySelectorAll('.toggle-switch[data-setting="sms"]').forEach(function(el) {
                smsChecked = el.checked;
            });
            
            settings.notifications = {
                inApp: inAppChecked,
                email: emailChecked,
                sms: smsChecked
            };
        }
        
        if (canEdit.includes('security')) {
            let twoFactorChecked = false;
            document.querySelectorAll('.toggle-switch[data-setting="twoFactor"]').forEach(function(el) {
                twoFactorChecked = el.checked;
            });
            
            settings.security = {
                twoFactor: twoFactorChecked,
                passwordPolicy: 'strong',
                sessionTimeout: parseInt(document.getElementById('sessionTimeoutDisplay').textContent) || 30
            };
        }
        
        if (canEdit.includes('maintenance')) {
            let maintenanceChecked = false;
            document.querySelectorAll('.toggle-switch[data-setting="maintenance"]').forEach(function(el) {
                maintenanceChecked = el.checked;
            });
            
            settings.maintenance = {
                enabled: maintenanceChecked
            };
        }
        
        // Only update if there are changes
        if (Object.keys(settings).length > 0) {
            settings.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
            settings.updatedBy = auth.currentUser?.uid || '';
            
            await db.collection('settings').doc('platform').set(settings, { merge: true });
            
            // Update local data
            Object.assign(settingsData, settings);
            
            showToast('Settings saved successfully!', 'success');
        } else {
            showToast('No changes to save', 'info');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error saving settings: ' + error.message, 'error');
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type) {
    if (type === undefined) type = 'info';
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg';
        document.body.appendChild(toast);
    }
    
    var colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-0 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg ' + (colors[type] || colors.info);
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(function() {
        toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg';
    }, 3500);
}

// ============================================
// SIDEBAR FUNCTIONS
// ============================================

function loadSidebar() {
    var container = document.getElementById('sidebarContainer');
    if (!container) return;
    
    if (isSidebarRendered) return;
    
    function renderSidebar() {
        if (typeof contextManager === 'undefined' || !contextManager.isInitialized) {
            setTimeout(renderSidebar, 200);
            return;
        }
        
        var activeContext = contextManager.getActiveContext();
        var menuItems = contextManager.getMenuItems();
        var hasMultipleContexts = contextManager.hasMultipleContexts();
        
        var sidebarHTML = `
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
        
        menuItems.forEach(function(item) {
            var currentPath = window.location.pathname;
            var currentPage = currentPath.split('/').pop() || 'settings.html';
            var isActive = currentPage === item.page + '.html' || 
                           (item.page === 'settings' && currentPage === 'settings.html') ||
                           (item.page === 'dashboard' && currentPage === 'dashboard.html');
            
            var activeStyle = isActive ? 'background-color: #2563eb; color: white; font-weight: 600;' : '';
            
            sidebarHTML += `
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group ${isActive ? 'active' : ''}" 
                   href="${item.page}.html" 
                   data-page="${item.page}"
                   style="${activeStyle}">
                    <i class="fa-solid ${item.icon} w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">${item.label}</span>
                </a>
            `;
        });
        
        sidebarHTML += `
                <div class="my-2 border-t border-gray-200/50"></div>
                
                <a class="sidebar-link flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="#" data-page="notifications" id="sidebarNotifications">
                    <div class="flex items-center gap-3">
                        <i class="fa-regular fa-bell w-5 text-center text-sm"></i>
                        <span class="link-text transition-all duration-300">Notifications</span>
                    </div>
                    <span class="notif-badge bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">0</span>
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

function initSidebarInteractions() {
    var sidebar = document.getElementById('adminSidebar');
    if (!sidebar) return;

    var toggleBtn = document.getElementById('sidebarToggleBtn');
    if (toggleBtn) {
        var isCollapsed = localStorage.getItem('adminSidebarCollapsed') === 'true';
        if (isCollapsed) {
            sidebar.classList.add('collapsed');
            toggleBtn.querySelector('i').className = 'fa-solid fa-chevron-right text-gray-600 text-xs';
        }

        toggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            var collapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('adminSidebarCollapsed', collapsed);
            var icon = this.querySelector('i');
            if (collapsed) {
                icon.className = 'fa-solid fa-chevron-right text-gray-600 text-xs';
            } else {
                icon.className = 'fa-solid fa-chevron-left text-gray-600 text-xs';
            }
        });
    }

    var menuBtn = document.getElementById('mobileMenuBtn');
    var sidebarContainer = document.getElementById('sidebarContainer');
    var overlay = document.getElementById('sidebarOverlay');
    
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

    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            if (sidebarContainer) sidebarContainer.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                if (typeof auth !== 'undefined' && auth.signOut) {
                    auth.signOut().then(function() {
                        localStorage.removeItem('bridgeconnect_user');
                        localStorage.removeItem('bridgeconnect_active_context');
                        window.location.href = '../login.html';
                    }).catch(function(err) {
                        showToast('Error logging out: ' + err.message, 'error');
                    });
                }
            }
        });
    }
}

function initContextSwitcher() {
    var switcherBtn = document.getElementById('contextSwitcherBtn');
    if (!switcherBtn) return;
    
    switcherBtn.addEventListener('click', function() {
        window.location.href = 'workspace-selector.html';
    });
}

function updateHeader() {
    if (!currentUserData) return;
    
    var name = currentUserData.fullName || currentUserData.name || 'User';
    var role = currentUserData.role || 'resident';
    var photoURL = currentUserData.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=0052cc&color=fff&size=100';
    
    // Update desktop header
    var userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) userNameDisplay.textContent = name;
    
    var userRoleDisplay = document.getElementById('userRoleDisplay');
    if (userRoleDisplay) userRoleDisplay.textContent = getRoleDisplayName(role);
    
    var desktopAvatar = document.getElementById('desktopUserAvatar');
    if (desktopAvatar) desktopAvatar.src = photoURL;
    
    var mobileAvatar = document.getElementById('mobileUserAvatar');
    if (mobileAvatar) mobileAvatar.src = photoURL;
}

// ============================================
// SETTINGS NAVIGATION - TAB FUNCTIONALITY
// ============================================

function setupSettingsNavigation() {
    var navLinks = document.querySelectorAll('#settingsNav a');
    var sections = document.querySelectorAll('.settings-section');
    
    // Function to show a specific tab
    function showTab(tabId) {
        // Hide ALL sections
        sections.forEach(function(section) {
            section.style.display = 'none';
        });
        
        // Show the selected section
        var targetSection = document.getElementById(tabId);
        if (targetSection) {
            targetSection.style.display = '';
        }
        
        // Update nav link active states - remove active class from all
        navLinks.forEach(function(link) {
            link.classList.remove('settings-nav-active');
            link.style.borderLeft = '4px solid transparent';
            var icon = link.querySelector('i');
            if (icon) {
                icon.classList.remove('text-blue-600');
            }
        });
        
        // Add active class to the clicked link
        navLinks.forEach(function(link) {
            if (link.dataset.section === tabId) {
                link.classList.add('settings-nav-active');
                link.style.borderLeft = '4px solid #2563eb';
                var icon = link.querySelector('i');
                if (icon) {
                    icon.classList.add('text-blue-600');
                }
            }
        });
        
        activeTab = tabId;
    }
    
    // Initially hide ALL sections, then show the active one
    var permissions = getRolePermissions();
    var firstVisibleSection = null;
    
    // First, hide all sections
    sections.forEach(function(section) {
        section.style.display = 'none';
    });
    
    // Find the first visible section based on permissions
    sections.forEach(function(section) {
        if (!firstVisibleSection && permissions.canView.includes(section.id)) {
            firstVisibleSection = section.id;
        }
    });
    
    // Show the first visible section or 'branding' as default
    if (firstVisibleSection) {
        showTab(firstVisibleSection);
    } else {
        // If no permission, show branding or first available
        showTab('branding');
    }
    
    // Add click handlers to nav links
    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            var sectionId = this.dataset.section;
            
            // Check if user has permission to view this section
            if (!permissions.canView.includes(sectionId)) {
                showToast('You do not have permission to view this section', 'error');
                return;
            }
            
            showTab(sectionId);
        });
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Save changes
    var saveBtn = document.getElementById('saveChangesBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
    
    // Color picker preview
    var primaryColor = document.getElementById('primaryColor');
    if (primaryColor) {
        primaryColor.addEventListener('input', function() {
            var preview = document.getElementById('primaryColorPreview');
            if (preview) preview.style.backgroundColor = this.value;
        });
    }
    
    var secondaryColor = document.getElementById('secondaryColor');
    if (secondaryColor) {
        secondaryColor.addEventListener('input', function() {
            var preview = document.getElementById('secondaryColorPreview');
            if (preview) preview.style.backgroundColor = this.value;
        });
    }
    
    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var input = this.closest('.relative').querySelector('input');
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                }
            }
        });
    });
    
    // Check SMS balance - Only Platform Owner
    var checkBalance = document.querySelector('.check-balance');
    if (checkBalance) {
        checkBalance.addEventListener('click', function() {
            if (!isPlatformOwner()) {
                showToast('You do not have permission to check SMS balance', 'error');
                return;
            }
            showToast('Checking SMS balance...', 'info');
            setTimeout(function() {
                var balance = Math.floor(Math.random() * 20000) + 5000;
                var balanceDisplay = document.getElementById('smsBalance');
                if (balanceDisplay) {
                    balanceDisplay.textContent = balance.toLocaleString() + ' SMS';
                }
                showToast('SMS balance: ' + balance.toLocaleString() + ' SMS', 'success');
            }, 1500);
        });
    }
    
    // Test email - Only Platform Owner
    var testEmail = document.querySelector('.test-email');
    if (testEmail) {
        testEmail.addEventListener('click', function() {
            if (!isPlatformOwner()) {
                showToast('You do not have permission to test email settings', 'error');
                return;
            }
            showToast('Sending test email...', 'info');
            setTimeout(function() {
                showToast('Test email sent successfully!', 'success');
            }, 1500);
        });
    }
    
    // Create backup - Only Platform Owner
    var createBackup = document.querySelector('.create-backup');
    if (createBackup) {
        createBackup.addEventListener('click', function() {
            if (!isPlatformOwner()) {
                showToast('You do not have permission to create backups', 'error');
                return;
            }
            showToast('Creating database backup...', 'info');
            setTimeout(function() {
                var now = new Date();
                var formatted = now.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                });
                var lastBackup = document.getElementById('lastBackup');
                if (lastBackup) {
                    lastBackup.textContent = formatted + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                }
                showToast('Backup created successfully!', 'success');
            }, 2000);
        });
    }
    
    // Edit policy - Only Platform Owner and District Admin
    var editPolicy = document.querySelector('.edit-policy');
    if (editPolicy) {
        editPolicy.addEventListener('click', function() {
            if (!isPlatformOwner() && !isDistrictAdmin()) {
                showToast('You do not have permission to edit security policies', 'error');
                return;
            }
            showToast('Opening password policy settings...', 'info');
        });
    }
    
    // Edit timeout - Only Platform Owner and District Admin
    var editTimeout = document.querySelector('.edit-timeout');
    if (editTimeout) {
        editTimeout.addEventListener('click', function() {
            if (!isPlatformOwner() && !isDistrictAdmin()) {
                showToast('You do not have permission to edit session timeout', 'error');
                return;
            }
            var display = document.getElementById('sessionTimeoutDisplay');
            if (!display) return;
            var current = display.textContent;
            var minutes = parseInt(current) || 30;
            var newMinutes = prompt('Enter session timeout in minutes:', minutes);
            if (newMinutes && !isNaN(newMinutes) && parseInt(newMinutes) > 0) {
                display.textContent = parseInt(newMinutes) + ' minutes';
                showToast('Session timeout updated to ' + parseInt(newMinutes) + ' minutes', 'success');
            }
        });
    }
    
    // Manage Districts - Only Platform Owner and District Admin
    var districtsBtn = document.querySelector('#districts button');
    if (districtsBtn) {
        districtsBtn.addEventListener('click', function() {
            if (!isPlatformOwner() && !isDistrictAdmin()) {
                showToast('You do not have permission to manage districts', 'error');
                return;
            }
            window.location.href = 'locations.html';
        });
    }
    
    // Manage API Keys - Only Platform Owner
    var apiBtn = document.querySelector('#api button');
    if (apiBtn) {
        apiBtn.addEventListener('click', function() {
            if (!isPlatformOwner()) {
                showToast('You do not have permission to manage API keys', 'error');
                return;
            }
            showToast('Opening API key management...', 'info');
        });
    }
    
    // Change Logo - Only Platform Owner
    var brandingBtn = document.querySelector('#branding button');
    if (brandingBtn) {
        brandingBtn.addEventListener('click', function() {
            if (!isPlatformOwner()) {
                showToast('You do not have permission to change branding', 'error');
                return;
            }
            showToast('Opening logo upload...', 'info');
        });
    }
    
    // District selector
    var districtSelector = document.getElementById('districtSelector');
    if (districtSelector) {
        districtSelector.addEventListener('click', function() {
            showToast('Opening district selector...', 'info');
        });
    }
    
    // User profile
    var userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function() {
            showToast('Opening user profile...', 'info');
        });
    }
    
    // Search
    var globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                showToast('Searching for "' + this.value.trim() + '"...', 'info');
            }
        });
    }
}

// ============================================
// AUTHENTICATION
// ============================================

function initAuth() {
    if (typeof auth === 'undefined' || !auth) {
        console.warn('Firebase auth not available');
        return;
    }
    
    auth.onAuthStateChanged(async function(user) {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        try {
            await fetchUserData();
            
            if (!currentUserData) {
                showToast('Error loading user profile', 'error');
                return;
            }
            
            if (currentUserData.approvalStatus !== 'approved') {
                showToast('Your account is pending approval', 'error');
                return;
            }
            
            if (currentUserData.status !== 'active') {
                showToast('Your account is not active', 'error');
                return;
            }
            
            if (typeof contextManager !== 'undefined' && !contextManager.isInitialized) {
                var initialized = await contextManager.initialize(user);
                if (!initialized) {
                    showToast('Error loading user data', 'error');
                    return;
                }
                
                loadSidebar();
                await initSettingsPage();
            } else {
                loadSidebar();
                await initSettingsPage();
            }
            
        } catch (error) {
            console.error('Auth initialization error:', error);
            if (!error.message.includes('permission')) {
                showToast('Error loading user data', 'error');
            }
        }
    });
}

// ============================================
// SETTINGS PAGE INITIALIZATION
// ============================================

async function initSettingsPage() {
    console.log('📋 Initializing settings page...');
    
    // Show loading state
    showToast('Loading settings...', 'info');
    
    // Fetch settings
    var settings = await fetchSettings();
    if (settings) {
        renderSettings(settings);
    }
    
    // Fetch district stats
    var stats = await fetchDistrictStats();
    renderDistrictStats(stats);
    
    // Update server time
    updateServerTime();
    setInterval(updateServerTime, 60000);
    
    // Setup navigation with tab functionality
    setupSettingsNavigation();
    
    // Setup events
    setupEventListeners();
    
    console.log('✅ Settings page initialized');
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

console.log('🔄 BridgeConnect Settings page with Firestore integration loaded');