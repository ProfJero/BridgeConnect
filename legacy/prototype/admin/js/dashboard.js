// ============================================
// ADMIN DASHBOARD JAVASCRIPT - WITH PLATFORM_OWNER SUPPORT
// ============================================

// ============================================
// GLOBAL STATE
// ============================================
let isSidebarRendered = false;
let notifications = [];
let unreadCount = 0;
let statsData = {};
let currentUserData = null;
let dashboardData = {};
let selectedRevenuePeriod = 'month';
let selectedGrowthPeriod = 'year';

// ============================================
// HELPER FUNCTIONS FOR ROLE CHECKING
// ============================================

function isPlatformOwner() {
    return currentUserData?.role === 'platform_owner' || currentUserData?.role === 'owner';
}

function isDistrictAdmin() {
    return currentUserData?.role === 'district_admin';
}

function isModerator() {
    return currentUserData?.role === 'moderator';
}

function isVerifiedOrg() {
    return currentUserData?.role === 'verified_org';
}

function isResident() {
    return currentUserData?.role === 'resident';
}

function getRoleDisplayName(role) {
    const labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'moderator': 'Community Moderator',
        'verified_org': 'Verified Organization',
        'resident': 'Resident'
    };
    return labels[role] || role;
}

function getDashboardLabel(role) {
    const labels = {
        'platform_owner': 'Platform',
        'owner': 'Platform',
        'district_admin': 'District',
        'moderator': 'Community',
        'verified_org': 'Organization',
        'resident': 'Dashboard'
    };
    return labels[role] || 'Dashboard';
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
        console.log('👤 User role:', currentUserData.role);
        console.log('🔑 Is platform owner?', isPlatformOwner());
        return currentUserData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

async function fetchRevenueData(period = 'month') {
    try {
        if (!isPlatformOwner()) {
            console.log('🔒 Revenue data restricted - user is not platform owner');
            return { totalRevenue: 0, revenueChange: 0, revenueBreakdown: {} };
        }
        
        let query = db.collection('revenue');
        
        if (period === 'month') {
            query = query.orderBy('month', 'desc').limit(1);
        } else if (period === 'year') {
            query = query.orderBy('year', 'desc').limit(1);
        } else {
            query = query.orderBy('month', 'desc').limit(1);
        }
        
        const revenueSnapshot = await query.get();
        if (!revenueSnapshot.empty) {
            const revenueDoc = revenueSnapshot.docs[0];
            const data = revenueDoc.data();
            return {
                totalRevenue: data.amount || 0,
                revenueChange: data.change || 0,
                revenueBreakdown: data.breakdown || {},
                period: data.period || period,
                label: data.label || (period === 'month' ? 'This Month' : 'This Year')
            };
        }
        
        return { totalRevenue: 0, revenueChange: 0, revenueBreakdown: {}, period: period };
    } catch (error) {
        console.warn('Error fetching revenue:', error.message);
        return { totalRevenue: 0, revenueChange: 0, revenueBreakdown: {} };
    }
}

async function fetchGrowthData(period = 'year') {
    try {
        // This would fetch growth data from Firestore
        // For now, return mock data based on period
        const mockData = {
            year: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                users: [1200, 1450, 1800, 2100, 2500, 2900, 3400, 3800, 4200, 4700, 5200, 5800],
                businesses: [200, 250, 310, 380, 450, 520, 600, 680, 760, 840, 920, 1000],
                orders: [150, 220, 300, 390, 480, 580, 680, 790, 900, 1020, 1150, 1290]
            },
            quarter: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8', 'Week 9', 'Week 10', 'Week 11', 'Week 12'],
                users: [5800, 5900, 6050, 6200, 6350, 6500, 6680, 6850, 7020, 7200, 7380, 7560],
                businesses: [1000, 1015, 1030, 1050, 1070, 1090, 1110, 1135, 1160, 1185, 1210, 1240],
                orders: [1290, 1310, 1340, 1370, 1400, 1440, 1480, 1520, 1560, 1600, 1650, 1700]
            },
            month: {
                labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'],
                users: [7560, 7620, 7700, 7780, 7850, 7920, 8000],
                businesses: [1240, 1250, 1265, 1280, 1295, 1310, 1325],
                orders: [1700, 1720, 1750, 1780, 1810, 1840, 1870]
            }
        };
        
        return mockData[period] || mockData.year;
    } catch (error) {
        console.warn('Error fetching growth data:', error.message);
        return null;
    }
}

async function fetchDashboardStats() {
    try {
        const stats = {
            totalUsers: 0,
            totalBusinesses: 0,
            totalOrganizations: 0,
            totalProducts: 0,
            totalJobs: 0,
            totalOrders: 0,
            totalCommunities: 0,
            totalDistricts: 0,
            pendingBusinesses: 0,
            pendingOrganizations: 0,
            recentRegistrations: [],
            recentAnnouncements: [],
            activeCommunities: [],
            pendingReports: [],
            notifications: [],
            totalRevenue: 0,
            revenueChange: 0,
            revenueBreakdown: {}
        };
        
        const user = auth.currentUser;
        if (!user) return stats;

        if (!currentUserData) {
            await fetchUserData();
        }

        if (!currentUserData) return stats;

        const userRole = currentUserData.role || 'resident';
        const userDistrict = currentUserData.district;
        const isOwner = isPlatformOwner();
        const isDistrictAdmin = userRole === 'district_admin';
        const isModerator = userRole === 'moderator';
        const isVerifiedOrg = userRole === 'verified_org';

        console.log('👤 User role:', userRole);
        console.log('🔑 Is platform owner?', isOwner);
        console.log('📍 District:', userDistrict);

        // ============================================
        // USERS - Only get current user's data
        // ============================================
        try {
            stats.totalUsers = 1;
            if (currentUserData.approvalStatus === 'approved') {
                stats.recentRegistrations.push({
                    id: user.uid,
                    ...currentUserData
                });
            }
        } catch (error) {
            console.warn('Error fetching users:', error.message);
        }

        // ============================================
        // BUSINESSES - Read only approved businesses
        // ============================================
        try {
            let businessesQuery = db.collection('businesses').where('status', '==', 'approved');
            
            if (!isOwner && userDistrict) {
                businessesQuery = businessesQuery.where('district', '==', userDistrict);
            }
            
            const businessesSnapshot = await businessesQuery.get();
            stats.totalBusinesses = businessesSnapshot.size;
        } catch (error) {
            console.warn('Error fetching businesses:', error.message);
        }

        // ============================================
        // ORGANIZATIONS - Handle missing rules gracefully
        // ============================================
        try {
            if (currentUserData.organizationId) {
                const orgDoc = await db.collection('organizations').doc(currentUserData.organizationId).get();
                if (orgDoc.exists) {
                    stats.totalOrganizations = 1;
                    const data = orgDoc.data();
                    if (data.approvalStatus === 'pending' && (isOwner || isDistrictAdmin || isModerator)) {
                        stats.pendingOrganizations = 1;
                    }
                }
            }
            
            if (isOwner || isDistrictAdmin || isModerator) {
                try {
                    const orgsSnapshot = await db.collection('organizations').limit(50).get();
                    let count = 0;
                    let pending = 0;
                    orgsSnapshot.forEach(doc => {
                        const data = doc.data();
                        count++;
                        if (data.approvalStatus === 'pending') {
                            pending++;
                        }
                    });
                    stats.totalOrganizations = count;
                    stats.pendingOrganizations = pending;
                } catch (e) {
                    console.warn('Could not list organizations:', e.message);
                }
            }
        } catch (error) {
            console.warn('Error fetching organizations:', error.message);
        }

        // ============================================
        // PRODUCTS - Anyone can read products
        // ============================================
        try {
            const productsSnapshot = await db.collection('products').limit(100).get();
            stats.totalProducts = productsSnapshot.size;
        } catch (error) {
            console.warn('Error fetching products:', error.message);
        }

        // ============================================
        // JOBS - Only approved jobs
        // ============================================
        try {
            let jobsQuery = db.collection('jobs').where('status', '==', 'approved');
            
            if (!isOwner && userDistrict) {
                jobsQuery = jobsQuery.where('district', '==', userDistrict);
            }
            
            const jobsSnapshot = await jobsQuery.get();
            stats.totalJobs = jobsSnapshot.size;
        } catch (error) {
            console.warn('Error fetching jobs:', error.message);
        }

        // ============================================
        // ORDERS - Only user's own orders
        // ============================================
        try {
            const ordersSnapshot = await db.collection('orders')
                .where('buyerId', '==', user.uid)
                .get();
            stats.totalOrders = ordersSnapshot.size;
        } catch (error) {
            console.warn('Error fetching orders:', error.message);
        }

        // ============================================
        // COMMUNITIES - Anyone can read communities
        // ============================================
        try {
            let communitiesQuery = db.collection('communities');
            if (!isOwner && userDistrict) {
                communitiesQuery = communitiesQuery.where('district', '==', userDistrict);
            }
            const communitiesSnapshot = await communitiesQuery.limit(100).get();
            stats.totalCommunities = communitiesSnapshot.size;

            let activeCommunitiesQuery = db.collection('communities')
                .orderBy('activityCount', 'desc')
                .limit(3);
            
            if (!isOwner && userDistrict) {
                activeCommunitiesQuery = activeCommunitiesQuery.where('district', '==', userDistrict);
            }
            
            const activeCommunitiesSnapshot = await activeCommunitiesQuery.get();
            activeCommunitiesSnapshot.forEach(doc => {
                stats.activeCommunities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.warn('Error fetching communities:', error.message);
        }

        // ============================================
        // DISTRICTS - Anyone can read districts
        // ============================================
        try {
            const districtsSnapshot = await db.collection('districts').limit(100).get();
            stats.totalDistricts = districtsSnapshot.size;
        } catch (error) {
            console.warn('Error fetching districts:', error.message);
        }

        // ============================================
        // PENDING BUSINESSES - Only owner, district admin, moderator
        // ============================================
        if (isOwner || isDistrictAdmin || isModerator) {
            try {
                let pendingBusinessesQuery = db.collection('businesses').where('status', '==', 'pending');
                if (!isOwner && userDistrict) {
                    pendingBusinessesQuery = pendingBusinessesQuery.where('district', '==', userDistrict);
                }
                const pendingBusinessesSnapshot = await pendingBusinessesQuery.get();
                stats.pendingBusinesses = pendingBusinessesSnapshot.size;
            } catch (error) {
                console.warn('Error fetching pending businesses:', error.message);
            }
        }

        // ============================================
        // REVENUE - Only platform owner can view
        // ============================================
        if (isOwner) {
            const revenueData = await fetchRevenueData(selectedRevenuePeriod);
            stats.totalRevenue = revenueData.totalRevenue;
            stats.revenueChange = revenueData.revenueChange;
            stats.revenueBreakdown = revenueData.revenueBreakdown;
            stats.revenueLabel = revenueData.label;
        } else {
            console.log('🔒 User is not platform owner, revenue hidden');
        }

        // ============================================
        // ANNOUNCEMENTS - Only approved announcements
        // ============================================
        try {
            let announcementsQuery = db.collection('announcements')
                .where('status', '==', 'approved')
                .orderBy('createdAt', 'desc')
                .limit(3);
            
            if (!isOwner && userDistrict) {
                announcementsQuery = announcementsQuery.where('district', '==', userDistrict);
            }
            
            const announcementsSnapshot = await announcementsQuery.get();
            announcementsSnapshot.forEach(doc => {
                stats.recentAnnouncements.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
        } catch (error) {
            console.warn('Error fetching announcements:', error.message);
        }

        // ============================================
        // PENDING REPORTS - Only owner, district admin, moderator
        // ============================================
        if (isOwner || isDistrictAdmin || isModerator) {
            try {
                let reportsQuery = db.collection('reports').where('status', '==', 'pending').limit(2);
                if (!isOwner && userDistrict) {
                    reportsQuery = reportsQuery.where('district', '==', userDistrict);
                }
                const reportsSnapshot = await reportsQuery.get();
                reportsSnapshot.forEach(doc => {
                    stats.pendingReports.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            } catch (error) {
                console.warn('Error fetching pending reports:', error.message);
            }
        }

        // ============================================
        // NOTIFICATIONS - Only user's own notifications
        // ============================================
        try {
            const notificationsSnapshot = await db.collection('notifications')
                .where('userId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();
            
            unreadCount = 0;
            notificationsSnapshot.forEach(doc => {
                const data = doc.data();
                stats.notifications.push({
                    id: doc.id,
                    ...data,
                    unread: data.read === false
                });
                if (data.read === false) {
                    unreadCount++;
                }
            });
        } catch (error) {
            console.warn('Error fetching notifications:', error.message);
        }

        statsData = stats;
        return stats;
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return statsData || {
            totalUsers: 0,
            totalBusinesses: 0,
            totalOrganizations: 0,
            totalProducts: 0,
            totalJobs: 0,
            totalOrders: 0,
            totalCommunities: 0,
            totalDistricts: 0,
            pendingBusinesses: 0,
            pendingOrganizations: 0,
            recentRegistrations: [],
            recentAnnouncements: [],
            activeCommunities: [],
            pendingReports: [],
            notifications: [],
            totalRevenue: 0,
            revenueChange: 0,
            revenueBreakdown: {}
        };
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderStats(stats) {
    const grid = document.getElementById('statsGrid');
    if (!grid) return;
    
    const statCards = [
        { icon: 'fa-solid fa-user-group', color: 'text-blue-500', label: 'Total Users', value: stats.totalUsers || 0, change: stats.totalUsers > 0 ? '+12.5%' : '—' },
        { icon: 'fa-solid fa-store', color: 'text-emerald-500', label: 'Businesses', value: stats.totalBusinesses || 0, change: stats.totalBusinesses > 0 ? '+8.3%' : '—' },
        { icon: 'fa-regular fa-building', color: 'text-purple-500', label: 'Organizations', value: stats.totalOrganizations || 0, change: stats.totalOrganizations > 0 ? '+6.7%' : '—' },
        { icon: 'fa-solid fa-box', color: 'text-orange-500', label: 'Products', value: stats.totalProducts || 0, change: stats.totalProducts > 0 ? '+14.1%' : '—' },
        { icon: 'fa-solid fa-briefcase', color: 'text-blue-600', label: 'Jobs', value: stats.totalJobs || 0, change: stats.totalJobs > 0 ? '+9.6%' : '—' },
        { icon: 'fa-solid fa-cart-shopping', color: 'text-green-600', label: 'Orders', value: stats.totalOrders || 0, change: stats.totalOrders > 0 ? '+15.3%' : '—' },
        { icon: 'fa-solid fa-users', color: 'text-teal-500', label: 'Communities', value: stats.totalCommunities || 0, change: stats.totalCommunities > 0 ? '+3.4%' : '—' },
        { icon: 'fa-solid fa-location-dot', color: 'text-red-500', label: 'Districts', value: stats.totalDistricts || 0, change: '—' }
    ];
    
    grid.innerHTML = statCards.map(card => `
        <div class="stat-card bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 text-on-surface-variant text-sm font-medium">
                <i class="${card.icon} ${card.color}"></i> ${card.label}
            </div>
            <div class="text-2xl font-bold text-on-surface">${card.value.toLocaleString()}</div>
            <div class="text-xs text-on-surface-variant flex items-center gap-1">
                ${card.change !== '—' ? `<span class="text-success font-medium flex items-center gap-1"><i class="fa-solid fa-arrow-up"></i> ${card.change}</span>` : '<span class="text-gray-400 font-medium">— No change</span>'}
            </div>
        </div>
    `).join('');
}

function renderRecentRegistrations(registrations) {
    const container = document.getElementById('recentRegistrations');
    if (!container) return;
    
    if (!registrations || registrations.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fa-regular fa-user text-2xl block mb-2 opacity-30"></i>
                No recent registrations
            </div>
        `;
        return;
    }
    
    container.innerHTML = registrations.map(user => {
        const name = user.fullName || user.name || 'Anonymous';
        const role = user.role || 'User';
        const district = user.district || 'N/A';
        const time = user.createdAt ? timeAgo(user.createdAt.toDate()) : 'Just now';
        
        return `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <img alt="${name}" class="w-8 h-8 rounded-full object-cover" src="${user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=32`}"/>
                <div>
                    <p class="text-sm font-medium text-on-surface leading-tight">${name}</p>
                    <p class="text-[10px] text-on-surface-variant">${role}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="text-xs text-on-surface">${district}</p>
                <p class="text-[10px] text-on-surface-variant">${time}</p>
            </div>
        </div>
    `}).join('');
}

function renderPendingApprovals(stats) {
    const container = document.getElementById('pendingApprovals');
    if (!container) return;
    
    const userRole = currentUserData?.role || 'resident';
    const canViewApprovals = isPlatformOwner() || isDistrictAdmin() || isModerator();
    
    if (!canViewApprovals) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-xs py-2">
                <i class="fa-solid fa-lock text-lg block mb-1 opacity-30"></i>
                Insufficient permissions
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="flex items-center justify-between group cursor-pointer">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded bg-green-50 text-green-600 flex items-center justify-center text-[10px]"><i class="fa-solid fa-store"></i></div>
                <span class="text-xs font-medium text-on-surface">Businesses</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold">${stats.pendingBusinesses || 0}</span>
                <i class="fa-solid fa-chevron-right text-[10px] text-on-surface-variant group-hover:text-primary transition-colors"></i>
            </div>
        </div>
        <div class="flex items-center justify-between group cursor-pointer">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded bg-purple-50 text-purple-600 flex items-center justify-center text-[10px]"><i class="fa-regular fa-building"></i></div>
                <span class="text-xs font-medium text-on-surface">Organizations</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-xs font-bold">${stats.pendingOrganizations || 0}</span>
                <i class="fa-solid fa-chevron-right text-[10px] text-on-surface-variant group-hover:text-primary transition-colors"></i>
            </div>
        </div>
    `;
}

function renderPendingReports(reports) {
    const container = document.getElementById('pendingReports');
    if (!container) return;
    
    const canViewReports = isPlatformOwner() || isDistrictAdmin() || isModerator();
    
    if (!canViewReports) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-xs py-2">
                <i class="fa-solid fa-lock text-lg block mb-1 opacity-30"></i>
                Insufficient permissions
            </div>
        `;
        return;
    }
    
    if (!reports || reports.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-xs py-2">
                <i class="fa-regular fa-circle-check text-lg block mb-1 opacity-30"></i>
                No pending reports
            </div>
        `;
        return;
    }
    
    container.innerHTML = reports.map(report => `
        <div class="flex items-center justify-between group cursor-pointer">
            <div class="flex items-center gap-2">
                <div class="w-6 h-6 rounded ${report.type === 'community' ? 'bg-teal-50 text-teal-600' : 'bg-yellow-50 text-yellow-600'} flex items-center justify-center text-[10px]">
                    <i class="${report.type === 'community' ? 'fa-solid fa-users' : 'fa-solid fa-clipboard-list'}"></i>
                </div>
                <span class="text-xs font-medium text-on-surface">${report.title || 'Report'}</span>
            </div>
            <div class="flex items-center gap-2">
                <i class="fa-solid fa-chevron-right text-[10px] text-on-surface-variant group-hover:text-primary transition-colors"></i>
            </div>
        </div>
    `).join('');
}

function renderAnnouncements(announcements) {
    const container = document.getElementById('recentAnnouncements');
    if (!container) return;
    
    if (!announcements || announcements.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant text-sm py-4">
                <i class="fa-regular fa-bullhorn text-2xl block mb-2 opacity-30"></i>
                No announcements yet
            </div>
        `;
        return;
    }
    
    const icons = ['fa-solid fa-bullhorn', 'fa-solid fa-clipboard-check', 'fa-solid fa-megaphone'];
    const colors = ['bg-green-50 text-green-600', 'bg-blue-50 text-blue-600', 'bg-purple-50 text-purple-600'];
    
    container.innerHTML = announcements.map((announcement, index) => `
        <div class="flex gap-3">
            <div class="w-8 h-8 rounded-full ${colors[index % colors.length]} flex items-center justify-center shrink-0">
                <i class="${icons[index % icons.length]} text-sm"></i>
            </div>
            <div>
                <div class="flex items-center justify-between mb-1">
                    <h4 class="text-sm font-medium text-on-surface leading-tight">${announcement.title || 'Announcement'}</h4>
                    <span class="text-[10px] text-on-surface-variant">${announcement.createdAt ? timeAgo(announcement.createdAt.toDate()) : 'Recently'}</span>
                </div>
                <p class="text-xs text-on-surface-variant line-clamp-2">${announcement.content || announcement.message || ''}</p>
            </div>
        </div>
    `).join('');
}

function renderActiveCommunities(communities) {
    const container = document.getElementById('activeCommunities');
    if (!container) return;
    
    if (!communities || communities.length === 0) {
        container.innerHTML = `
            <li class="text-xs text-on-surface-variant">No community data</li>
        `;
        return;
    }
    
    container.innerHTML = communities.map((community, index) => `
        <li>
            <span class="inline-block align-top ml-1">
                <span class="font-medium text-on-surface block">${community.name || 'Community'}</span>
                <span class="text-[10px] text-on-surface-variant">${community.activityCount || 0} activities</span>
            </span>
        </li>
    `).join('');
}

function renderRevenue(stats) {
    const container = document.getElementById('revenueDisplay');
    const breakdownContainer = document.getElementById('revenueBreakdown');
    
    const isOwner = isPlatformOwner();
    
    console.log('📊 Rendering revenue - Is platform owner?', isOwner);
    
    if (!isOwner) {
        if (container) {
            document.getElementById('totalRevenue').textContent = '🔒 Restricted';
            document.getElementById('revenueChange').innerHTML = '<span class="text-on-surface-variant">Only platform owners can view revenue</span>';
        }
        if (breakdownContainer) {
            breakdownContainer.innerHTML = `
                <div class="w-full text-center text-on-surface-variant text-xs py-4">
                    <i class="fa-solid fa-lock text-2xl block mb-2 opacity-30"></i>
                    Revenue data is restricted
                </div>
            `;
        }
        return;
    }
    
    if (container) {
        const revenue = stats.totalRevenue || 0;
        const change = stats.revenueChange || 0;
        const changeColor = change >= 0 ? 'text-success' : 'text-red-500';
        const changeArrow = change >= 0 ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down';
        
        document.getElementById('totalRevenue').textContent = `GH¢ ${revenue.toFixed(2)}`;
        document.getElementById('revenueChange').innerHTML = `
            <span class="${changeColor} flex items-center gap-1"><i class="${changeArrow}"></i> ${Math.abs(change)}%</span>
            <span class="text-on-surface-variant font-normal">vs last month</span>
        `;
    }
    
    if (breakdownContainer) {
        const breakdown = stats.revenueBreakdown || {};
        const items = Object.entries(breakdown);
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
        
        if (items.length === 0) {
            breakdownContainer.innerHTML = `
                <div class="w-full text-center text-on-surface-variant text-xs py-4">
                    No revenue data available
                </div>
            `;
            return;
        }
        
        const total = items.reduce((sum, [, value]) => sum + value, 0);
        
        breakdownContainer.innerHTML = `
            <div class="w-24 h-24 relative shrink-0">
                <div class="w-full h-full rounded-full" style="
                    background: conic-gradient(
                        ${items.map(([key, value], index) => {
                            const percentage = total > 0 ? (value / total * 100) : 0;
                            const color = colors[index % colors.length];
                            return `${color} 0% ${percentage}%`;
                        }).join(', ')}
                    );
                "></div>
            </div>
            <div class="flex-1 space-y-2 justify-center flex flex-col">
                ${items.map(([key, value], index) => {
                    const percentage = total > 0 ? (value / total * 100) : 0;
                    const color = colors[index % colors.length];
                    return `
                        <div class="flex items-start gap-2">
                            <span class="w-2 h-2 rounded-full ${color} mt-1 shrink-0"></span>
                            <div>
                                <p class="text-[10px] text-on-surface font-medium leading-tight">${key} (${percentage.toFixed(0)}%)</p>
                                <p class="text-[9px] text-on-surface-variant">GH¢ ${value.toFixed(2)}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
}

function renderGrowthChart(data, period) {
    const container = document.getElementById('chartContainer');
    if (!container) return;
    
    if (!data) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant">
                <i class="fa-solid fa-chart-line text-3xl mb-2 block opacity-30"></i>
                <span class="text-sm">No chart data available</span>
            </div>
        `;
        return;
    }
    
    const labels = data.labels || [];
    const users = data.users || [];
    const businesses = data.businesses || [];
    const orders = data.orders || [];
    
    if (labels.length === 0) {
        container.innerHTML = `
            <div class="text-center text-on-surface-variant">
                <i class="fa-solid fa-chart-line text-3xl mb-2 block opacity-30"></i>
                <span class="text-sm">No data for this period</span>
            </div>
        `;
        return;
    }
    
    const maxValue = Math.max(...users, ...businesses, ...orders, 100);
    const height = 160;
    
    // Show only last 10 labels for readability
    const displayCount = Math.min(labels.length, 10);
    const startIndex = Math.max(0, labels.length - displayCount);
    
    let barsHTML = '';
    const containerWidth = container.clientWidth || 400;
    const barWidth = Math.min(30, (containerWidth - 40) / displayCount);
    
    for (let i = startIndex; i < labels.length; i++) {
        const userVal = users[i] || 0;
        const bizVal = businesses[i] || 0;
        const orderVal = orders[i] || 0;
        
        const userHeight = (userVal / maxValue) * height * 0.8;
        const bizHeight = (bizVal / maxValue) * height * 0.8;
        const orderHeight = (orderVal / maxValue) * height * 0.8;
        
        barsHTML += `
            <div class="flex flex-col items-center" style="width: ${barWidth}px;">
                <div class="flex items-end gap-1 h-[${height}px]">
                    <div class="w-1.5 bg-blue-500 rounded-t" style="height: ${userHeight}px;"></div>
                    <div class="w-1.5 bg-green-500 rounded-t" style="height: ${bizHeight}px;"></div>
                    <div class="w-1.5 bg-purple-500 rounded-t" style="height: ${orderHeight}px;"></div>
                </div>
                <span class="text-[8px] text-on-surface-variant mt-1">${labels[i]}</span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="flex items-end justify-around h-full w-full p-2 overflow-x-auto">
            ${barsHTML}
        </div>
    `;
}

function renderQuickActions(role) {
    const container = document.getElementById('quickActions');
    if (!container) return;
    
    let actions = [];
    
    // Check if user is platform owner (supports both 'platform_owner' and 'owner')
    const isOwner = role === 'platform_owner' || role === 'owner';
    
    switch(role) {
        case 'platform_owner':
        case 'owner':
            actions = [
                { icon: 'fa-solid fa-user-plus', label: 'Add User' },
                { icon: 'fa-solid fa-store', label: 'Add Business' },
                { icon: 'fa-solid fa-bullhorn', label: 'Announcement' },
                { icon: 'fa-solid fa-chart-simple', label: 'Analytics' },
                { icon: 'fa-solid fa-gear', label: 'Settings' },
                { icon: 'fa-solid fa-shield-halved', label: 'Security' }
            ];
            break;
        case 'district_admin':
            actions = [
                { icon: 'fa-solid fa-user-plus', label: 'Add User' },
                { icon: 'fa-solid fa-store', label: 'Add Business' },
                { icon: 'fa-solid fa-bullhorn', label: 'Announcement' },
                { icon: 'fa-solid fa-location-dot', label: 'Manage District' }
            ];
            break;
        case 'moderator':
            actions = [
                { icon: 'fa-solid fa-users', label: 'Manage Members' },
                { icon: 'fa-solid fa-bullhorn', label: 'Announcement' },
                { icon: 'fa-solid fa-flag', label: 'Reports' },
                { icon: 'fa-solid fa-calendar', label: 'Events' }
            ];
            break;
        case 'verified_org':
            actions = [
                { icon: 'fa-solid fa-briefcase', label: 'Post Job' },
                { icon: 'fa-solid fa-bullhorn', label: 'Announcement' },
                { icon: 'fa-solid fa-calendar', label: 'Event' },
                { icon: 'fa-solid fa-store', label: 'Products' }
            ];
            break;
        default:
            actions = [
                { icon: 'fa-solid fa-store', label: 'Browse' },
                { icon: 'fa-solid fa-briefcase', label: 'Jobs' },
                { icon: 'fa-solid fa-calendar', label: 'Events' }
            ];
    }
    
    container.innerHTML = actions.map(action => `
        <button class="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-surface transition-colors group quick-action-btn">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <i class="${action.icon}"></i>
            </div>
            <span class="text-[10px] font-medium text-on-surface text-center leading-tight">${action.label}</span>
        </button>
    `).join('');
}

function renderNotifications(notifs) {
    const container = document.getElementById('notificationList');
    const countElements = document.querySelectorAll('.notif-count');
    
    if (!container) return;
    
    unreadCount = notifs.filter(n => n.unread).length;
    countElements.forEach(el => {
        el.textContent = unreadCount;
        el.style.display = unreadCount > 0 ? 'flex' : 'none';
    });
    
    const sidebarBadge = document.querySelector('.notif-badge');
    if (sidebarBadge) {
        sidebarBadge.textContent = unreadCount;
        sidebarBadge.style.display = unreadCount > 0 ? 'inline' : 'none';
    }
    
    if (!notifs || notifs.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fa-regular fa-bell"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    const icons = {
        'user': 'fa-solid fa-user',
        'business': 'fa-solid fa-store',
        'order': 'fa-solid fa-cart-shopping',
        'report': 'fa-solid fa-flag',
        'announcement': 'fa-solid fa-bullhorn',
        'system': 'fa-solid fa-gear',
        'job': 'fa-solid fa-briefcase',
        'event': 'fa-solid fa-calendar'
    };
    
    const colors = {
        'user': 'bg-blue-50 text-blue-600',
        'business': 'bg-green-50 text-green-600',
        'order': 'bg-orange-50 text-orange-600',
        'report': 'bg-red-50 text-red-600',
        'announcement': 'bg-purple-50 text-purple-600',
        'system': 'bg-gray-50 text-gray-600',
        'job': 'bg-teal-50 text-teal-600',
        'event': 'bg-indigo-50 text-indigo-600'
    };
    
    container.innerHTML = notifs.map(notif => `
        <div class="notification-item ${notif.unread ? 'unread' : ''}" data-id="${notif.id}">
            <div class="icon ${colors[notif.type] || colors.system}">
                <i class="${icons[notif.type] || icons.system}"></i>
            </div>
            <div class="content">
                <div class="title">${notif.title || 'Notification'}</div>
                <div class="desc">${notif.message || notif.content || ''}</div>
                <div class="time">${notif.createdAt ? timeAgo(notif.createdAt.toDate()) : 'Just now'}</div>
            </div>
        </div>
    `).join('');
}

// ============================================
// PERIOD SELECTOR FUNCTIONS
// ============================================

async function updateRevenuePeriod(period) {
    selectedRevenuePeriod = period;
    const button = document.getElementById('revenueFilter');
    if (button) {
        const labels = {
            'month': 'This Month',
            'quarter': 'This Quarter',
            'year': 'This Year'
        };
        button.innerHTML = `${labels[period] || 'This Month'} <i class="fa-solid fa-chevron-down text-[10px] ml-1"></i>`;
    }
    
    const stats = await fetchDashboardStats();
    if (stats) {
        renderRevenue(stats);
    }
}

async function updateGrowthPeriod(period) {
    selectedGrowthPeriod = period;
    const button = document.getElementById('growthChartFilter');
    if (button) {
        const labels = {
            'month': 'This Month',
            'quarter': 'This Quarter',
            'year': 'This Year'
        };
        button.innerHTML = `${labels[period] || 'This Year'} <i class="fa-solid fa-chevron-down text-[10px] ml-1"></i>`;
    }
    
    const data = await fetchGrowthData(period);
    renderGrowthChart(data, period);
}

function showPeriodSelector(buttonId, options, callback) {
    const existingPopup = document.querySelector('.period-selector-popup');
    if (existingPopup) existingPopup.remove();
    
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'period-selector-popup absolute bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[160px]';
    popup.style.top = (rect.bottom + 8) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';
    
    options.forEach(option => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 transition-colors';
        item.textContent = option.label;
        item.addEventListener('click', function() {
            callback(option.value);
            popup.remove();
        });
        popup.appendChild(item);
    });
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && e.target !== button) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 10);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function timeAgo(date) {
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

function formatDate(date) {
    if (!date) return 'Loading...';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg';
        document.body.appendChild(toast);
    }
    
    const colors = {
        success: 'bg-green-600',
        error: 'bg-red-600',
        info: 'bg-blue-600'
    };
    
    toast.textContent = message;
    toast.className = `fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-0 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 shadow-lg ${colors[type] || colors.info}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = `fixed bottom-8 left-1/2 transform -translate-x-1/2 -translate-y-12 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all duration-400 opacity-0 shadow-lg`;
    }, 3500);
}

// ============================================
// SIDEBAR RENDER (Keep existing)
// ============================================
// ============================================
// SIDEBAR RENDER
// ============================================
function renderSidebar() {
    if (typeof contextManager === 'undefined') {
        setTimeout(renderSidebar, 300);
        return;
    }
    
    if (!contextManager.isInitialized) {
        setTimeout(renderSidebar, 300);
        return;
    }
    
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    
    if (isSidebarRendered) return;
    
    const activeContext = contextManager.getActiveContext();
    const menuItems = contextManager.getMenuItems();
    const hasMultipleContexts = contextManager.hasMultipleContexts();
    
    if (!activeContext) {
        console.error('No active context found');
        return;
    }
    
    let sidebarHTML = `
    <aside id="adminSidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30 overflow-y-auto transition-all duration-300 relative">
        <!-- Toggle Button - Fixed position at the right edge of sidebar -->
        <button class="sidebar-toggle-btn absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center hover:bg-gray-50 transition-all z-40" id="sidebarToggleBtn" title="Toggle Sidebar">
            <i class="fa-solid fa-chevron-left text-gray-600 text-xs"></i>
        </button>

        <div class="sidebar-logo p-4 pb-3 flex items-center gap-3 border-b border-gray-200/50 flex-shrink-0">
            <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                <i class="fa-solid fa-users text-xl"></i>
            </div>
            <div class="logo-text transition-all duration-300 overflow-hidden">
                <h1 class="text-lg font-bold text-blue-600 leading-tight">BridgeConnect</h1>
                <p class="text-[10px] text-gray-500">${activeContext.label || 'Admin Portal'}</p>
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
    
    if (menuItems.length === 0) {
        sidebarHTML += `
            <div class="text-center text-gray-500 text-sm py-8">
                <i class="fa-solid fa-circle-exclamation text-2xl block mb-2"></i>
                No menu items available
            </div>
        `;
    } else {
        menuItems.forEach(item => {
            const currentPath = window.location.pathname;
            const currentPage = currentPath.split('/').pop() || 'dashboard.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'dashboard' && currentPage === 'dashboard.html');
            
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
    }
    
    sidebarHTML += `
            <div class="my-2 border-t border-gray-200/50"></div>
            
            <a class="sidebar-link flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="notifications.html" data-page="notifications" id="sidebarNotifications">
                <div class="flex items-center gap-3">
                    <i class="fa-regular fa-bell w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">Notifications</span>
                </div>
                <span class="notif-badge bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${unreadCount || 0}</span>
            </a>
            
            <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="support.html" data-page="support">
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
    
    console.log('✅ Sidebar rendered successfully');
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

    document.getElementById('sidebarNotifications')?.addEventListener('click', function(e) {
        e.preventDefault();
        toggleNotificationDropdown();
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
}

function initContextSwitcher() {
    const switcherBtn = document.getElementById('contextSwitcherBtn');
    if (!switcherBtn) return;
    
    switcherBtn.addEventListener('click', function() {
        window.location.href = 'workspace-selector.html';
    });
}

// ============================================
// NOTIFICATION DROPDOWN
// ============================================
function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('active');
}

function setupNotificationListeners() {
    document.querySelectorAll('.notification-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationDropdown();
        });
    });
    
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('notificationDropdown');
        const isNotificationBtn = e.target.closest('.notification-btn');
        const isDropdown = e.target.closest('#notificationDropdown');
        
        if (dropdown && !isNotificationBtn && !isDropdown) {
            dropdown.classList.remove('active');
        }
    });
    
    document.getElementById('markAllReadBtn')?.addEventListener('click', async function() {
        try {
            const unreadNotifs = notifications.filter(n => n.unread);
            for (const notif of unreadNotifs) {
                await db.collection('notifications').doc(notif.id).update({ read: true });
            }
            unreadCount = 0;
            notifications.forEach(n => n.unread = false);
            renderNotifications(notifications);
            showToast('All notifications marked as read', 'success');
        } catch (error) {
            console.error('Error marking notifications read:', error);
            showToast('Error updating notifications', 'error');
        }
    });
}

// ============================================
// UPDATE HEADER
// ============================================
function updateHeader() {
    if (typeof contextManager === 'undefined') return;
    if (!contextManager.isInitialized) return;
    
    const userData = contextManager.userData;
    if (!userData) return;
    
    const name = userData.fullName || userData.name || 'User';
    document.getElementById('userNameDisplay').textContent = name;
    
    const activeContext = contextManager.getActiveContext();
    if (activeContext) {
        document.getElementById('userRoleDisplay').textContent = getRoleDisplayName(activeContext.type);
        
        const communityLabel = document.getElementById('currentCommunityLabel');
        if (communityLabel && activeContext.type !== 'platform_owner' && activeContext.type !== 'owner') {
            communityLabel.textContent = activeContext.label || activeContext.id;
        }
    }
    
    const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=32`;
    document.querySelectorAll('#desktopUserAvatar, #mobileUserAvatar').forEach(el => {
        if (el) el.src = avatarUrl;
    });
}

// ============================================
// UPDATE DASHBOARD CONTENT
// ============================================
function updateDashboardContent(stats) {
    if (typeof contextManager === 'undefined') return;
    if (!contextManager.isInitialized) return;
    
    const activeContext = contextManager.getActiveContext();
    if (!activeContext) return;
    
    document.getElementById('dashboardTitle').textContent = `${getDashboardLabel(activeContext.type)} Dashboard`;
    
    if (contextManager.userData) {
        const name = contextManager.userData.fullName?.split(' ')[0] || 'User';
        const contextType = activeContext.type.replace('_', ' ');
        document.getElementById('dashboardGreeting').textContent = `Welcome back, ${name}! Here's what's happening in your ${contextType}.`;
    }
    
    renderQuickActions(activeContext.type);
    
    if (stats) {
        renderStats(stats);
        renderRecentRegistrations(stats.recentRegistrations);
        renderPendingApprovals(stats);
        renderPendingReports(stats.pendingReports || []);
        renderAnnouncements(stats.recentAnnouncements);
        renderActiveCommunities(stats.activeCommunities);
        renderRevenue(stats);
        
        notifications = stats.notifications || [];
        renderNotifications(notifications);
        
        const summary = document.getElementById('platformSummary');
        if (summary) {
            const totalUsers = stats.totalUsers || 0;
            const totalBusinesses = stats.totalBusinesses || 0;
            const totalCommunities = stats.totalCommunities || 0;
            summary.textContent = `${totalUsers} users • ${totalBusinesses} businesses • ${totalCommunities} communities`;
        }
        
        document.getElementById('dateRangeDisplay').textContent = formatDate(new Date());
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
    
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }
        
        console.log('👤 User authenticated:', user.email);
        
        try {
            await fetchUserData();
            
            if (!currentUserData) {
                showToast('Error loading user profile', 'error');
                return;
            }
            
            console.log('📋 User role:', currentUserData.role);
            console.log('🔑 Is platform owner?', isPlatformOwner());
            
            if (currentUserData.approvalStatus !== 'approved') {
                showToast('Your account is pending approval', 'error');
                return;
            }
            
            if (currentUserData.status !== 'active') {
                showToast('Your account is not active', 'error');
                return;
            }
            
            console.log('✅ User approved and active');
            
            if (typeof contextManager !== 'undefined' && !contextManager.isInitialized) {
                const initialized = await contextManager.initialize(user);
                
                if (!initialized) {
                    showToast('Error loading user data', 'error');
                    return;
                }
                
                const contexts = contextManager.getContexts();
                if (contexts.length === 0) {
                    showToast('No workspaces available', 'error');
                    return;
                }
                
                console.log('✅ ContextManager initialized');
                
                renderSidebar();
                
                const stats = await fetchDashboardStats();
                if (stats) {
                    updateDashboardContent(stats);
                    const growthData = await fetchGrowthData(selectedGrowthPeriod);
                    renderGrowthChart(growthData, selectedGrowthPeriod);
                }
                
                setupNotificationListeners();
                
            } else {
                renderSidebar();
                const stats = await fetchDashboardStats();
                if (stats) {
                    updateDashboardContent(stats);
                    const growthData = await fetchGrowthData(selectedGrowthPeriod);
                    renderGrowthChart(growthData, selectedGrowthPeriod);
                }
                setupNotificationListeners();
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
// EVENT LISTENERS FOR UI ELEMENTS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    
    // Stat cards click
    document.querySelector('#statsGrid')?.addEventListener('click', function(e) {
        const card = e.target.closest('.stat-card');
        if (!card) return;
        const label = card.querySelector('.text-on-surface')?.textContent || 'Item';
        showToast(`Opening ${label.trim()}...`, 'info');
    });
    
    // Quick action buttons
    document.querySelector('#quickActions')?.addEventListener('click', function(e) {
        const btn = e.target.closest('.quick-action-btn');
        if (!btn) return;
        const label = btn.querySelector('.text-[10px]')?.textContent || 'Action';
        showToast(`Opening ${label.trim()}...`, 'info');
    });
    
    // Create announcement
    document.getElementById('createAnnouncementBtn')?.addEventListener('click', function() {
        showToast('Opening announcement creator...', 'info');
    });
    
    // Search
    document.getElementById('globalSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            showToast(`Searching for "${this.value.trim()}"...`, 'info');
        }
    });
    
    // Download report
    document.getElementById('downloadReportBtn')?.addEventListener('click', function() {
        showToast('Generating report...', 'info');
    });
    
    // Date range picker
    document.getElementById('dateRangeBtn')?.addEventListener('click', function() {
        showToast('Opening date range picker...', 'info');
    });
    
    // Community switcher
    document.getElementById('communitySwitcherBtn')?.addEventListener('click', function() {
        if (typeof contextManager !== 'undefined' && contextManager.hasMultipleContexts()) {
            window.location.href = 'workspace-selector.html';
        } else {
            showToast('Switching communities...', 'info');
        }
    });
    
    // View all links
    document.getElementById('viewAllRegistrations')?.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Opening all registrations...', 'info');
    });
    
    document.getElementById('viewAllApprovals')?.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Opening all approvals...', 'info');
    });
    
    document.getElementById('viewAllReports')?.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Opening all reports...', 'info');
    });
    
    document.getElementById('viewAllAnnouncements')?.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Opening all announcements...', 'info');
    });
    
    // ============================================
    // GROWTH CHART PERIOD SELECTOR
    // ============================================
    document.getElementById('growthChartFilter')?.addEventListener('click', function(e) {
        e.stopPropagation();
        showPeriodSelector('growthChartFilter', [
            { label: 'This Month', value: 'month' },
            { label: 'This Quarter', value: 'quarter' },
            { label: 'This Year', value: 'year' }
        ], updateGrowthPeriod);
    });
    
    // ============================================
    // REVENUE PERIOD SELECTOR
    // ============================================
    document.getElementById('revenueFilter')?.addEventListener('click', function(e) {
        e.stopPropagation();
        if (!isPlatformOwner()) {
            showToast('Revenue data is only available for platform owners', 'info');
            return;
        }
        
        showPeriodSelector('revenueFilter', [
            { label: 'This Month', value: 'month' },
            { label: 'This Quarter', value: 'quarter' },
            { label: 'This Year', value: 'year' }
        ], updateRevenuePeriod);
    });
});

console.log('🔄 BridgeConnect Admin Dashboard with Platform Owner support loaded');