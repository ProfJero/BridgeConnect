// ============================================
// ADMIN BUSINESS VERIFICATION PAGE JAVASCRIPT - WITH FIRESTORE
// ============================================

// ============================================
// STATE
// ============================================
let businessData = null;
let isSidebarRendered = false;
let verificationChecklist = [];

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDate(date) {
    if (!date) return 'N/A';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

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
            const currentPage = currentPath.split('/').pop() || 'verify-business.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'verify-business' && currentPage === 'verify-business.html');
            
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
                    loadVerificationData();
                }, 300);
            }
        } catch (error) {
            console.error('Auth initialization error:', error);
            showToast('Error loading user data', 'error');
        }
    });
}

// ============================================
// LOAD VERIFICATION DATA
// ============================================
async function loadVerificationData() {
    const loadingState = document.getElementById('loadingState');
    const content = document.getElementById('verificationContent');
    
    try {
        // Get business ID from URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const businessId = urlParams.get('id');
        
        if (!businessId) {
            showToast('No business ID provided', 'error');
            loadingState.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-exclamation-circle text-3xl text-red-500"></i>
                    <p class="mt-4 text-on-surface-variant">No business ID provided</p>
                    <a href="businesses.html" class="mt-2 text-primary hover:underline">Return to Businesses</a>
                </div>
            `;
            return;
        }
        
        // Fetch business data
        const businessDoc = await db.collection('businesses').doc(businessId).get();
        
        if (!businessDoc.exists) {
            showToast('Business not found', 'error');
            loadingState.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-store-slash text-3xl text-red-500"></i>
                    <p class="mt-4 text-on-surface-variant">Business not found</p>
                    <a href="businesses.html" class="mt-2 text-primary hover:underline">Return to Businesses</a>
                </div>
            `;
            return;
        }
        
        businessData = { id: businessDoc.id, ...businessDoc.data() };
        
        // Hide loading, show content
        loadingState.classList.add('hidden');
        content.classList.remove('hidden');
        
        // Render all sections
        renderBusinessInfo(businessData);
        renderContactInfo(businessData);
        renderOwnerInfo(businessData);
        renderDocuments(businessData);
        renderLocationInfo(businessData);
        renderChecklist(businessData);
        renderNotes(businessData);
        
        // Update verification ID
        document.getElementById('verificationId').textContent = `#BIZ-${businessData.id.substring(0, 8).toUpperCase()}`;
        
        console.log('✅ Business verification data loaded:', businessData);
        
    } catch (error) {
        console.error('Error loading verification data:', error);
        showToast('Error loading verification data: ' + error.message, 'error');
        loadingState.innerHTML = `
            <div class="text-center">
                <i class="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                <p class="mt-4 text-on-surface-variant">Failed to load verification data</p>
                <p class="text-xs text-outline mt-1">${error.message}</p>
                <button onclick="loadVerificationData()" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    <i class="fas fa-sync mr-2"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// RENDER: BUSINESS INFO
// ============================================
function renderBusinessInfo(data) {
    const name = data.name || 'Unnamed Business';
    const category = data.category || 'Uncategorized';
    const subCategory = data.subCategory || '';
    const description = data.description || 'No description provided';
    const logo = data.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=128`;
    const status = data.verificationStatus || data.status || 'pending';
    const statusClass = getStatusClass(status);
    const statusIcon = getStatusIcon(status);
    
    document.getElementById('businessLogo').src = logo;
    document.getElementById('businessName').textContent = name;
    document.getElementById('businessCategory').textContent = category;
    document.getElementById('businessSubCategory').textContent = subCategory || '';
    document.getElementById('businessDescription').textContent = description;
    
    // Status badge
    const badge = document.getElementById('verificationStatusBadge');
    badge.className = `text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 uppercase ${statusClass}`;
    badge.innerHTML = `<i class="fas ${statusIcon} text-xs"></i> ${status.charAt(0).toUpperCase() + status.slice(1)}`;
    
    // Business details
    const details = document.getElementById('businessDetails');
    const regNumber = data.registrationNumber || data.businessRegistrationNumber || 'N/A';
    const dateRegistered = data.dateRegistered ? formatDate(data.dateRegistered) : 'N/A';
    const yearsInOperation = data.yearsInOperation || 'N/A';
    
    details.innerHTML = `
        <div>
            <p class="text-[11px] text-outline font-bold uppercase">Business Registration Number</p>
            <p class="text-sm font-medium text-on-surface">${regNumber}</p>
        </div>
        <div>
            <p class="text-[11px] text-outline font-bold uppercase">Date Registered</p>
            <p class="text-sm font-medium text-on-surface">${dateRegistered}</p>
        </div>
        <div>
            <p class="text-[11px] text-outline font-bold uppercase">Years in Operation</p>
            <p class="text-sm font-medium text-on-surface">${yearsInOperation}</p>
        </div>
    `;
}

// ============================================
// RENDER: CONTACT INFO
// ============================================
function renderContactInfo(data) {
    const container = document.getElementById('contactInfo');
    const phone = data.phone || data.mobile || 'N/A';
    const email = data.email || 'N/A';
    const website = data.website || '#';
    const social = data.socialMedia || {};
    
    let socialHtml = '';
    if (social.facebook) {
        socialHtml += `<div class="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">f</div>`;
    }
    if (social.instagram) {
        socialHtml += `<div class="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 text-xs font-bold">ig</div>`;
    }
    if (social.whatsapp) {
        socialHtml += `<div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold">wa</div>`;
    }
    
    container.innerHTML = `
        <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-3 text-outline">
                <i class="fas fa-phone text-primary"></i> Phone Number
            </span>
            <span class="font-medium text-on-surface">${phone}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-3 text-outline">
                <i class="fas fa-envelope text-primary"></i> Email Address
            </span>
            <span class="font-medium text-on-surface">${email}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-3 text-outline">
                <i class="fas fa-globe text-primary"></i> Website
            </span>
            ${website !== '#' ? `<a href="${website}" class="font-medium text-primary hover:underline">${website}</a>` : '<span class="font-medium text-outline">N/A</span>'}
        </div>
        <div class="flex items-center justify-between text-sm">
            <span class="flex items-center gap-3 text-outline">
                <i class="fas fa-share-alt text-primary"></i> Social Media
            </span>
            <div class="flex gap-2">${socialHtml || '<span class="text-outline">N/A</span>'}</div>
        </div>
    `;
}

// ============================================
// RENDER: OWNER INFO
// ============================================
function renderOwnerInfo(data) {
    const container = document.getElementById('ownerInfo');
    const ownerName = data.ownerName || 'Unknown';
    const ownerAvatar = data.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ownerName)}&background=6366f1&color=fff&size=64`;
    const ownerRole = data.ownerRole || 'Owner / Manager';
    const ownerVerified = data.ownerVerified !== false;
    const idType = data.ownerIdType || 'N/A';
    const idNumber = data.ownerIdNumber || 'N/A';
    const ownerEmail = data.ownerEmail || 'N/A';
    
    container.innerHTML = `
        <div class="flex items-center gap-4 mb-4">
            <img alt="${ownerName}" class="w-16 h-16 rounded-full border border-outline-variant object-cover" src="${ownerAvatar}"/>
            <div>
                <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-base font-bold text-on-surface">${ownerName}</p>
                    ${ownerVerified ? '<span class="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">Verified</span>' : ''}
                </div>
                <p class="text-xs text-outline font-medium">${ownerRole}</p>
            </div>
        </div>
        <div class="space-y-3">
            <div class="flex justify-between text-[11px]">
                <span class="text-outline font-bold uppercase">ID Type:</span>
                <span class="text-on-surface font-semibold">${idType}</span>
            </div>
            <div class="flex justify-between text-[11px]">
                <span class="text-outline font-bold uppercase">ID Number:</span>
                <span class="text-on-surface font-semibold">${idNumber}</span>
            </div>
            <div class="flex justify-between text-[11px]">
                <span class="text-outline font-bold uppercase">Email:</span>
                <span class="text-on-surface font-semibold">${ownerEmail}</span>
            </div>
        </div>
    `;
}

// ============================================
// RENDER: DOCUMENTS
// ============================================
function renderDocuments(data) {
    const container = document.getElementById('documentsContainer');
    const documents = data.documents || [];
    
    document.getElementById('documentCount').textContent = documents.length;
    
    if (documents.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center text-on-surface-variant text-sm py-4">
                <i class="fas fa-file text-2xl block mb-2 opacity-30"></i>
                No documents uploaded
            </div>
        `;
        return;
    }
    
    const statusColors = {
        'uploaded': 'bg-green-50 text-green-600',
        'pending': 'bg-amber-50 text-amber-600',
        'rejected': 'bg-red-50 text-red-600'
    };
    
    container.innerHTML = documents.slice(0, 6).map(doc => {
        const status = doc.status || 'uploaded';
        const statusColor = statusColors[status] || 'bg-green-50 text-green-600';
        const icon = doc.icon || 'fa-file-pdf';
        const docName = doc.name || 'Document';
        const docDate = doc.uploadedAt ? formatDate(doc.uploadedAt) : 'N/A';
        const docType = doc.type || 'Document';
        
        return `
            <div class="doc-card border border-outline-variant rounded-xl p-3 bg-surface-container-low cursor-pointer" onclick="showToast('Viewing ${docName}...', 'info')">
                <div class="aspect-[3/4] bg-white rounded shadow-sm mb-3 overflow-hidden relative flex items-center justify-center">
                    <i class="fas ${icon} text-4xl text-primary opacity-50"></i>
                    <span class="absolute top-2 right-2 ${status === 'uploaded' ? 'text-green-600' : status === 'pending' ? 'text-amber-500' : 'text-red-500'} bg-white rounded-full w-6 h-6 flex items-center justify-center text-sm shadow-sm">
                        <i class="fas ${status === 'uploaded' ? 'fa-check-circle' : status === 'pending' ? 'fa-clock' : 'fa-times-circle'}"></i>
                    </span>
                </div>
                <p class="text-xs font-bold text-on-surface mb-1 leading-tight">${docName}</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="text-[10px] ${statusColor} px-1.5 py-0.5 rounded font-bold uppercase">${docType}</span>
                    <span class="text-[10px] text-outline">${docDate}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// RENDER: LOCATION INFO
// ============================================
function renderLocationInfo(data) {
    const container = document.getElementById('locationInfo');
    const address = data.address || 'N/A';
    const digitalAddress = data.digitalAddress || 'N/A';
    const location = data.location || {};
    const coords = location.lat && location.lng ? `${location.lat}, ${location.lng}` : 'N/A';
    
    container.innerHTML = `
        <div class="flex items-start gap-2">
            <i class="fas fa-location-dot text-primary mt-0.5"></i>
            <div class="text-sm">
                <p class="font-medium text-on-surface">${address}</p>
                ${digitalAddress !== 'N/A' ? `<p class="text-outline">Digital Address: ${digitalAddress}</p>` : ''}
            </div>
        </div>
        <div class="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-outline-variant relative">
            <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                <div class="text-center text-on-surface-variant">
                    <i class="fas fa-map-location-dot text-4xl mb-2 block opacity-30"></i>
                    <span class="text-sm">Map view for ${data.name || 'this business'}</span>
                    ${coords !== 'N/A' ? `<p class="text-xs mt-1">Coordinates: ${coords}</p>` : ''}
                </div>
            </div>
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="relative">
                    <i class="fas fa-location-dot text-primary text-4xl drop-shadow-md"></i>
                    <div class="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full border-2 border-primary animate-ping"></div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// RENDER: CHECKLIST
// ============================================
function renderChecklist(data) {
    const container = document.getElementById('checklistContainer');
    const verificationItems = data.verificationChecklist || [
        { id: 'reg_cert', label: 'Business Registration Certificate', status: 'verified' },
        { id: 'id_card', label: 'Ghana Card / Identification', status: 'verified' },
        { id: 'tin', label: 'Tax Identification Number (TIN)', status: 'verified' },
        { id: 'license', label: 'Business License / Permit', status: 'pending' },
        { id: 'utility', label: 'Utility Bill / Proof of Address', status: 'verified' },
        { id: 'safety_cert', label: 'Food Safety Certificate (If Applicable)', status: 'verified' },
        { id: 'profile', label: 'Business Profile Information', status: 'completed' },
        { id: 'owner_verification', label: 'Owner Information Verification', status: 'verified' },
        { id: 'compliance', label: 'Compliance & Background Check', status: 'pending' }
    ];
    
    const statusIcons = {
        'verified': 'fa-check-circle text-green-600',
        'completed': 'fa-check-circle text-blue-600',
        'pending': 'fa-clock text-amber-500',
        'rejected': 'fa-times-circle text-red-600'
    };
    
    const statusLabels = {
        'verified': 'VERIFIED',
        'completed': 'COMPLETED',
        'pending': 'PENDING',
        'rejected': 'REJECTED'
    };
    
    const statusColors = {
        'verified': 'text-green-600 bg-green-50 border-green-100',
        'completed': 'text-blue-600 bg-blue-50 border-blue-100',
        'pending': 'text-amber-600 bg-amber-50 border-amber-100',
        'rejected': 'text-red-600 bg-red-50 border-red-100'
    };
    
    container.innerHTML = verificationItems.map(item => {
        const status = item.status || 'pending';
        const icon = statusIcons[status] || 'fa-clock text-amber-500';
        const label = statusLabels[status] || 'PENDING';
        const color = statusColors[status] || 'text-amber-600 bg-amber-50 border-amber-100';
        
        return `
            <li class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low/50">
                <div class="flex items-center gap-3">
                    <i class="fas ${icon}"></i>
                    <span class="text-sm font-medium text-on-surface">${item.label}</span>
                </div>
                <span class="text-[10px] font-bold ${color} px-2 py-0.5 rounded flex items-center gap-1 border">
                    <span class="w-1.5 h-1.5 rounded-full ${status === 'verified' || status === 'completed' ? 'bg-green-600' : status === 'pending' ? 'bg-amber-500' : 'bg-red-600'}"></span>
                    ${label}
                </span>
            </li>
        `;
    }).join('');
}

// ============================================
// RENDER: NOTES
// ============================================
function renderNotes(data) {
    const container = document.getElementById('notesContainer');
    const notes = data.verificationNotes || [];
    
    if (notes.length === 0) {
        container.innerHTML = `
            <p class="text-sm text-on-surface-variant italic">No verification notes yet.</p>
            <div class="mt-4 flex flex-wrap items-center gap-2">
                <span class="text-[11px] text-outline font-medium">Add a note to start</span>
            </div>
        `;
        return;
    }
    
    const latestNote = notes[0];
    container.innerHTML = `
        <p class="text-sm text-on-surface-variant italic">"${latestNote.content}"</p>
        <div class="mt-4 flex flex-wrap items-center gap-2">
            <span class="text-[11px] text-outline font-medium">${latestNote.date ? formatDate(latestNote.date) : 'N/A'} at ${latestNote.time || 'N/A'}</span>
            <span class="w-1 h-1 bg-outline rounded-full"></span>
            <span class="text-[11px] font-bold text-on-surface">by ${latestNote.author || 'Unknown'}</span>
        </div>
        ${notes.length > 1 ? `<button class="mt-2 text-xs text-primary hover:underline" onclick="showToast('Viewing all notes...', 'info')">View all ${notes.length} notes</button>` : ''}
    `;
}

// ============================================
// VERIFICATION ACTIONS
// ============================================
async function approveBusiness() {
    if (!businessData) return;
    
    if (!confirm(`Approve "${businessData.name || 'this business'}"? It will be marked as verified and active.`)) return;
    
    try {
        await db.collection('businesses').doc(businessData.id).update({
            verificationStatus: 'verified',
            status: 'active',
            verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
            verifiedBy: auth.currentUser?.uid || 'system',
            isVerified: true
        });
        
        showToast(`✅ "${businessData.name}" approved and verified successfully!`, 'success');
        loadVerificationData();
    } catch (error) {
        showToast('Failed to approve business: ' + error.message, 'error');
    }
}

async function rejectBusiness() {
    if (!businessData) return;
    
    const reason = prompt('Please provide a reason for rejecting this business:');
    if (reason === null) return;
    
    if (!reason.trim()) {
        showToast('Please provide a reason for rejection.', 'error');
        return;
    }
    
    if (!confirm(`Reject "${businessData.name || 'this business'}"?`)) return;
    
    try {
        await db.collection('businesses').doc(businessData.id).update({
            verificationStatus: 'rejected',
            status: 'rejected',
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser?.uid || 'system',
            rejectionReason: reason
        });
        
        showToast(`❌ "${businessData.name}" rejected. Reason: ${reason}`, 'error');
        loadVerificationData();
    } catch (error) {
        showToast('Failed to reject business: ' + error.message, 'error');
    }
}

async function requestMoreInfo() {
    if (!businessData) return;
    
    const request = prompt('What additional information do you need from the business owner?');
    if (request === null) return;
    
    if (!request.trim()) {
        showToast('Please enter your request.', 'error');
        return;
    }
    
    try {
        // Add request to verification notes
        const notes = businessData.verificationNotes || [];
        notes.push({
            content: `Request for more information: ${request}`,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            author: auth.currentUser?.displayName || 'Admin',
            type: 'request'
        });
        
        await db.collection('businesses').doc(businessData.id).update({
            verificationNotes: notes,
            verificationStatus: 'pending'
        });
        
        showToast(`📨 Request sent: "${request}"`, 'info');
        loadVerificationData();
    } catch (error) {
        showToast('Failed to send request: ' + error.message, 'error');
    }
}

async function editNotes() {
    if (!businessData) return;
    
    const notes = businessData.verificationNotes || [];
    const currentNote = notes.length > 0 ? notes[0].content : '';
    
    const modalHtml = `
        <div class="modal-overlay" id="notesModalOverlay">
            <div class="modal-content">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Verification Notes</h3>
                    <p class="text-sm text-outline mt-1">Add or update verification notes</p>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div>
                            <label class="text-sm font-medium text-on-surface">Add Note</label>
                            <textarea id="noteInput" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" rows="4" placeholder="Enter verification notes...">${currentNote}</textarea>
                        </div>
                        ${notes.length > 0 ? `
                            <div class="border-t border-gray-200 pt-4">
                                <p class="text-xs font-semibold text-outline uppercase tracking-wider mb-2">Previous Notes</p>
                                ${notes.slice(0, 5).map(n => `
                                    <div class="text-xs text-on-surface-variant py-1 border-b border-gray-50">
                                        <p class="font-medium">${n.content}</p>
                                        <p class="text-[10px] text-outline">${n.date || ''} ${n.time || ''} by ${n.author || 'Unknown'}</p>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-save px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Save Notes</button>
                </div>
            </div>
        </div>
    `;
    
    const container = document.getElementById('modalContainer');
    container.innerHTML = modalHtml;
    
    const overlay = document.getElementById('notesModalOverlay');
    
    overlay.querySelector('.modal-cancel').addEventListener('click', () => {
        container.innerHTML = '';
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) container.innerHTML = '';
    });
    
    overlay.querySelector('.modal-save').addEventListener('click', async function() {
        const noteContent = document.getElementById('noteInput').value.trim();
        
        if (!noteContent) {
            showToast('Please enter a note', 'error');
            return;
        }
        
        try {
            const existingNotes = businessData.verificationNotes || [];
            const newNote = {
                content: noteContent,
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                author: auth.currentUser?.displayName || 'Admin'
            };
            
            await db.collection('businesses').doc(businessData.id).update({
                verificationNotes: [newNote, ...existingNotes]
            });
            
            showToast('✅ Notes updated successfully', 'success');
            container.innerHTML = '';
            loadVerificationData();
        } catch (error) {
            showToast('Failed to update notes: ' + error.message, 'error');
        }
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
    
    // Approve
    document.getElementById('approveBtn')?.addEventListener('click', approveBusiness);
    
    // Reject
    document.getElementById('rejectBtn')?.addEventListener('click', rejectBusiness);
    
    // Request More Info
    document.getElementById('requestInfoBtn')?.addEventListener('click', requestMoreInfo);
    
    // Edit Notes
    document.getElementById('editNotesBtn')?.addEventListener('click', editNotes);
    
    // View All Documents
    document.getElementById('viewAllDocumentsBtn')?.addEventListener('click', function() {
        showToast('Viewing all documents...', 'info');
    });
    
    // View Map
    document.getElementById('viewMapBtn')?.addEventListener('click', function() {
        showToast('Opening Google Maps...', 'info');
    });
});

console.log('🔄 BridgeConnect Business Verification page loaded with Firestore integration');