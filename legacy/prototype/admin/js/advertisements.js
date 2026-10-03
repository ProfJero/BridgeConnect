// ============================================
// ADVERTISEMENTS MANAGEMENT - FIRESTORE INTEGRATION
// ============================================

// ============================================
// GLOBAL STATE
// ============================================
var currentUserData = null;
var allAds = [];
var filteredAds = [];
var currentPage = 1;
var pageSize = 10;
var isSidebarRendered = false;

// ============================================
// HELPER FUNCTIONS
// ============================================

function isPlatformOwner() {
    return currentUserData?.role === 'platform_owner' || currentUserData?.role === 'owner';
}

function isDistrictAdmin() {
    return currentUserData?.role === 'district_admin';
}

function isModerator() {
    return currentUserData?.role === 'moderator' || currentUserData?.role === 'community_moderator';
}

function getRoleDisplayName(role) {
    var labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'moderator': 'Community Moderator',
        'community_moderator': 'Community Moderator',
        'verified_org': 'Verified Organization',
        'business_owner': 'Business Owner',
        'resident': 'Community Member'
    };
    return labels[role] || role || 'User';
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        var date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch (e) {
        return 'N/A';
    }
}

function getStatusColor(status) {
    var colors = {
        'approved': 'bg-green-100 text-green-700',
        'active': 'bg-green-100 text-green-700',
        'pending': 'bg-amber-100 text-amber-700',
        'rejected': 'bg-red-100 text-red-700',
        'completed': 'bg-blue-100 text-blue-700',
        'scheduled': 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}

function getStatusIcon(status) {
    var icons = {
        'approved': 'fas fa-check-circle',
        'active': 'fas fa-play-circle',
        'pending': 'fas fa-clock',
        'rejected': 'fas fa-times-circle',
        'completed': 'fas fa-check-double',
        'scheduled': 'fas fa-calendar-check'
    };
    return icons[status] || 'fas fa-circle';
}

function getTypeBadge(type) {
    var badges = {
        'banner': 'bg-primary/10 text-primary',
        'sponsored': 'bg-secondary/10 text-secondary',
        'marketplace': 'bg-tertiary/10 text-tertiary',
        'job': 'bg-blue-100 text-blue-700'
    };
    return badges[type] || 'bg-gray-100 text-gray-700';
}

function getTypeLabel(type) {
    var labels = {
        'banner': 'Banner',
        'sponsored': 'Sponsored Post',
        'marketplace': 'Marketplace',
        'job': 'Job Ad'
    };
    return labels[type] || type || 'Unknown';
}

// ============================================
// FIRESTORE DATA FETCHERS
// ============================================

async function fetchUserData() {
    try {
        var userId = auth.currentUser?.uid;
        if (!userId) return null;
        
        var userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return null;
        
        currentUserData = { id: userDoc.id, ...userDoc.data() };
        console.log('📋 User data loaded:', currentUserData);
        return currentUserData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

async function fetchAdvertisements() {
    try {
        var ads = [];
        var isOwner = isPlatformOwner();
        var userDistrict = currentUserData?.district;

        var adsQuery = db.collection('advertisements');
        
        // If not platform owner, only show ads in their district
        if (!isOwner && userDistrict) {
            adsQuery = adsQuery.where('district', '==', userDistrict);
        }
        
        // Order by created date
        adsQuery = adsQuery.orderBy('createdAt', 'desc');
        
        var adsSnapshot = await adsQuery.limit(500).get();
        
        adsSnapshot.forEach(function(doc) {
            var data = doc.data();
            ads.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log('✅ Fetched', ads.length, 'advertisements from Firestore');
        allAds = ads;
        filteredAds = allAds.slice();
        return ads;
    } catch (error) {
        console.error('Error fetching advertisements:', error);
        showToast('Error loading advertisements: ' + error.message, 'error');
        allAds = [];
        filteredAds = [];
        return [];
    }
}

async function fetchAdStats() {
    try {
        var stats = {
            active: 0,
            pending: 0,
            impressions: 0,
            clicks: 0
        };
        
        allAds.forEach(function(ad) {
            if (ad.status === 'approved' || ad.status === 'active') {
                stats.active++;
            }
            if (ad.status === 'pending') {
                stats.pending++;
            }
            stats.impressions += ad.impressions || 0;
            stats.clicks += ad.clicks || 0;
        });
        
        return stats;
    } catch (error) {
        console.warn('Error fetching ad stats:', error.message);
        return { active: 0, pending: 0, impressions: 0, clicks: 0 };
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAdsTable(ads) {
    var tbody = document.getElementById('adsTableBody');
    if (!tbody) return;

    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, ads.length);
    var pageAds = ads.slice(startIndex, endIndex);

    if (pageAds.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-12 text-center text-outline">
                    <i class="fas fa-bullhorn text-4xl block mb-3 opacity-30"></i>
                    <p class="text-lg font-medium">No advertisements found</p>
                    <p class="text-sm mt-1">Try adjusting your filters or create a new advertisement</p>
                </td>
            </tr>
        `;
        updatePagination(ads.length);
        return;
    }

    var canManage = isPlatformOwner() || isDistrictAdmin() || isModerator();

    tbody.innerHTML = pageAds.map(function(ad) {
        var statusColor = getStatusColor(ad.status);
        var typeBadge = getTypeBadge(ad.type);
        var typeLabel = getTypeLabel(ad.type);
        var statusIcon = getStatusIcon(ad.status);
        var startDate = ad.startDate ? formatDate(ad.startDate) : 'N/A';
        var endDate = ad.endDate ? formatDate(ad.endDate) : 'N/A';
        var impressions = ad.impressions || 0;
        var clicks = ad.clicks || 0;
        var banner = ad.banner || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ad.title || 'Ad') + '&background=0052cc&color=fff&size=120&format=png';

        var statusLabel = (ad.status || 'pending').charAt(0).toUpperCase() + (ad.status || 'pending').slice(1);
        var statusText = '';
        
        // Check if ad is ending soon
        if (ad.endDate) {
            var end = ad.endDate.toDate ? ad.endDate.toDate() : new Date(ad.endDate);
            var now = new Date();
            var daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
            if (daysLeft > 0 && daysLeft <= 3) {
                statusText = 'Ends in ' + daysLeft + ' day' + (daysLeft > 1 ? 's' : '');
            } else if (daysLeft <= 0 && ad.status !== 'completed') {
                statusText = 'Ended';
            }
        }

        var actionButtons = '';
        
        if (canManage) {
            actionButtons = `
                <button class="p-2 hover:bg-surface-container-high rounded-lg text-primary transition-colors view-btn" data-id="${ad.id}" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="p-2 hover:bg-surface-container-high rounded-lg text-outline transition-colors edit-btn" data-id="${ad.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                ${ad.status === 'pending' ? `
                    <button class="p-2 hover:bg-surface-container-high rounded-lg text-green-600 transition-colors approve-btn" data-id="${ad.id}" title="Approve">
                        <i class="fas fa-check-circle"></i>
                    </button>
                    <button class="p-2 hover:bg-surface-container-high rounded-lg text-red-500 transition-colors reject-btn" data-id="${ad.id}" title="Reject">
                        <i class="fas fa-times-circle"></i>
                    </button>
                ` : ''}
                <button class="p-2 hover:bg-surface-container-high rounded-lg text-error transition-colors delete-btn" data-id="${ad.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }

        return `
        <tr class="hover:bg-surface-container-low transition-colors group">
            <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                    <img class="w-12 h-12 rounded-lg object-cover" src="${banner}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(ad.title || 'Ad')}&background=0052cc&color=fff&size=120'"/>
                    <div>
                        <p class="font-label-md text-label-md text-on-surface">${ad.title || 'Untitled'}</p>
                        <p class="text-label-sm text-outline">${ad.advertiser || 'Unknown'}</p>
                    </div>
                </div>
            </td>
            <td class="px-4 py-4">
                <span class="px-3 py-1 ${typeBadge} text-[10px] font-bold rounded-full uppercase tracking-tight">${typeLabel}</span>
            </td>
            <td class="px-4 py-4">
                <div class="text-body-md text-on-surface">${startDate} - ${endDate}</div>
                <div class="text-[10px] text-outline italic">${statusText}</div>
            </td>
            <td class="px-4 py-4">
                <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-1 text-[11px]">
                        <span class="text-outline">Views:</span>
                        <span class="font-bold">${impressions.toLocaleString()}</span>
                    </div>
                    <div class="flex items-center gap-1 text-[11px]">
                        <span class="text-outline">Clicks:</span>
                        <span class="font-bold">${clicks.toLocaleString()}</span>
                    </div>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center gap-2 px-2.5 py-1 w-fit ${statusColor} rounded-full">
                    <i class="${statusIcon} text-[10px]"></i>
                    <span class="text-[10px] font-bold uppercase">${statusLabel}</span>
                </div>
            </td>
            <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                    ${actionButtons}
                </div>
            </td>
        </tr>
    `}).join('');

    updatePagination(ads.length);
    updateAdCount(ads.length);
    attachTableEventListeners();
}

function updatePagination(total) {
    var totalPages = Math.ceil(total / pageSize) || 1;
    var paginationContainer = document.getElementById('paginationButtons');
    var paginationInfo = document.getElementById('paginationInfo');
    
    if (paginationInfo) {
        var start = ((currentPage - 1) * pageSize) + 1;
        var end = Math.min(currentPage * pageSize, total);
        paginationInfo.textContent = 'Showing ' + (total > 0 ? start : 0) + ' to ' + (total > 0 ? end : 0) + ' of ' + total + ' advertisements';
    }
    
    if (!paginationContainer) return;
    
    var prevBtn = document.getElementById('prevPage');
    var nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    var buttonsHTML = '';
    var maxVisible = 5;
    var startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    var endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        buttonsHTML += '<button class="px-3 py-1 hover:bg-surface-container-high rounded-lg text-outline page-btn" data-page="1">1</button>';
        if (startPage > 2) {
            buttonsHTML += '<span class="px-1 text-outline">...</span>';
        }
    }
    
    for (var i = startPage; i <= endPage; i++) {
        var isActive = i === currentPage;
        buttonsHTML += `
            <button class="px-3 py-1 ${isActive ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-outline'} rounded-lg page-btn" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHTML += '<span class="px-1 text-outline">...</span>';
        }
        buttonsHTML += '<button class="px-3 py-1 hover:bg-surface-container-high rounded-lg text-outline page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
    }
    
    paginationContainer.innerHTML = buttonsHTML;
    
    document.querySelectorAll('.page-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var page = parseInt(this.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                renderAdsTable(filteredAds);
            }
        });
    });
}

function updateAdCount(total) {
    var countElement = document.getElementById('adCount');
    if (countElement) {
        countElement.textContent = total;
    }
}

function renderStats(stats) {
    var activeEl = document.getElementById('activeCampaigns');
    var pendingEl = document.getElementById('pendingApprovals');
    var impressionsEl = document.getElementById('totalImpressions');
    var clicksEl = document.getElementById('totalClicks');
    
    if (activeEl) activeEl.textContent = stats.active || 0;
    if (pendingEl) pendingEl.textContent = stats.pending || 0;
    if (impressionsEl) impressionsEl.textContent = (stats.impressions || 0).toLocaleString();
    if (clicksEl) clicksEl.textContent = (stats.clicks || 0).toLocaleString();
}

function renderDistributions() {
    // Type distribution
    var types = {};
    allAds.forEach(function(ad) {
        var type = ad.type || 'unknown';
        types[type] = (types[type] || 0) + 1;
    });
    
    var typeColors = {
        'banner': 'bg-primary',
        'sponsored': 'bg-secondary',
        'marketplace': 'bg-tertiary',
        'job': 'bg-blue-500'
    };
    
    var typeLabels = {
        'banner': 'Banner',
        'sponsored': 'Sponsored',
        'marketplace': 'Market',
        'job': 'Job Ad'
    };
    
    var typeContainer = document.getElementById('typeDistribution');
    var typeTotal = document.getElementById('typeTotal');
    var total = allAds.length;
    if (typeTotal) typeTotal.textContent = total;
    
    if (typeContainer) {
        var typeHtml = '';
        var typeKeys = Object.keys(types);
        if (typeKeys.length === 0) {
            typeHtml = '<div class="text-[10px] text-outline text-center">No data</div>';
        } else {
            typeKeys.forEach(function(type) {
                var count = types[type];
                var percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                var color = typeColors[type] || 'bg-gray-500';
                var label = typeLabels[type] || type;
                typeHtml += `
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full ${color}"></span> ${label}
                        </span>
                        <span class="font-bold">${count} (${percentage}%)</span>
                    </div>
                `;
            });
        }
        typeContainer.innerHTML = typeHtml;
    }
    
    // Status distribution
    var statuses = {};
    allAds.forEach(function(ad) {
        var status = ad.status || 'pending';
        statuses[status] = (statuses[status] || 0) + 1;
    });
    
    var statusColors = {
        'approved': 'bg-green-500',
        'active': 'bg-green-500',
        'pending': 'bg-amber-500',
        'rejected': 'bg-red-500',
        'completed': 'bg-blue-500',
        'scheduled': 'bg-blue-500'
    };
    
    var statusLabels = {
        'approved': 'Approved',
        'active': 'Active',
        'pending': 'Pending',
        'rejected': 'Rejected',
        'completed': 'Completed',
        'scheduled': 'Scheduled'
    };
    
    var statusContainer = document.getElementById('statusDistribution');
    var statusTotal = document.getElementById('statusTotal');
    if (statusTotal) statusTotal.textContent = total;
    
    if (statusContainer) {
        var statusHtml = '';
        var statusKeys = Object.keys(statuses);
        if (statusKeys.length === 0) {
            statusHtml = '<div class="text-[10px] text-outline text-center">No data</div>';
        } else {
            statusKeys.forEach(function(status) {
                var count = statuses[status];
                var percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                var color = statusColors[status] || 'bg-gray-500';
                var label = statusLabels[status] || status;
                statusHtml += `
                    <div class="flex items-center justify-between text-[10px]">
                        <span class="flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full ${color}"></span> ${label}
                        </span>
                        <span class="font-bold">${count} (${percentage}%)</span>
                    </div>
                `;
            });
        }
        statusContainer.innerHTML = statusHtml;
    }
}

function renderPerformanceChart() {
    var container = document.getElementById('performanceChart');
    if (!container) return;
    
    // Generate random performance data
    var data = [];
    for (var i = 0; i < 7; i++) {
        data.push(Math.floor(Math.random() * 60) + 20);
    }
    
    var colors = ['bg-primary/10', 'bg-primary/20', 'bg-primary/40', 'bg-primary/60', 'bg-primary/30', 'bg-primary/80', 'bg-primary/50'];
    
    var html = '';
    data.forEach(function(val, index) {
        var height = Math.max(10, val);
        html += `
            <div class="w-full relative group" style="height: ${height}%; min-height: 8px;">
                <div class="w-full ${colors[index % colors.length]} rounded-t h-full transition-all duration-300 hover:opacity-80"></div>
                <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-[8px] px-1 py-0.5 rounded hidden group-hover:block whitespace-nowrap">${val}%</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateTopPerformer() {
    // Find top performing ad by CTR
    var topAd = null;
    var topCTR = 0;
    
    allAds.forEach(function(ad) {
        var impressions = ad.impressions || 0;
        var clicks = ad.clicks || 0;
        if (impressions > 0) {
            var ctr = (clicks / impressions) * 100;
            if (ctr > topCTR) {
                topCTR = ctr;
                topAd = ad;
            }
        }
    });
    
    var titleEl = document.getElementById('topPerformerTitle');
    var ctrEl = document.getElementById('topPerformerCTR');
    var analyticsAdEl = document.getElementById('analyticsTopAd');
    var analyticsCTREl = document.getElementById('analyticsTopCTR');
    
    if (topAd) {
        if (titleEl) titleEl.textContent = topAd.title || 'Untitled';
        if (ctrEl) ctrEl.textContent = topCTR.toFixed(2) + '%';
        if (analyticsAdEl) analyticsAdEl.textContent = topAd.title || 'Untitled';
        if (analyticsCTREl) analyticsCTREl.innerHTML = topCTR.toFixed(2) + '% <span class="text-[10px] text-outline font-normal">CTR</span>';
    } else {
        if (titleEl) titleEl.textContent = 'No data';
        if (ctrEl) ctrEl.textContent = '0%';
        if (analyticsAdEl) analyticsAdEl.textContent = 'No data';
        if (analyticsCTREl) analyticsCTREl.innerHTML = '0% <span class="text-[10px] text-outline font-normal">CTR</span>';
    }
}

// ============================================
// TABLE EVENT LISTENERS
// ============================================

function attachTableEventListeners() {
    document.querySelectorAll('.view-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            var ad = allAds.find(function(a) { return a.id === id; });
            if (ad) {
                showToast('Viewing ' + (ad.title || 'Ad') + ' details...', 'info');
            }
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            var ad = allAds.find(function(a) { return a.id === id; });
            if (ad) {
                showEditAdModal(id);
            }
        });
    });
    
    document.querySelectorAll('.approve-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            var ad = allAds.find(function(a) { return a.id === id; });
            if (ad && confirm('Approve "' + (ad.title || 'Ad') + '"?')) {
                updateAdStatus(id, 'approved');
            }
        });
    });
    
    document.querySelectorAll('.reject-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            var ad = allAds.find(function(a) { return a.id === id; });
            if (ad && confirm('Reject "' + (ad.title || 'Ad') + '"?')) {
                updateAdStatus(id, 'rejected');
            }
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.dataset.id;
            var ad = allAds.find(function(a) { return a.id === id; });
            if (ad && confirm('Delete "' + (ad.title || 'Ad') + '"? This action cannot be undone.')) {
                deleteAd(id);
            }
        });
    });
}

// ============================================
// AD MANAGEMENT FUNCTIONS
// ============================================

async function updateAdStatus(adId, newStatus) {
    try {
        await db.collection('advertisements').doc(adId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        var ad = allAds.find(function(a) { return a.id === adId; });
        if (ad) ad.status = newStatus;
        
        var filteredAd = filteredAds.find(function(a) { return a.id === adId; });
        if (filteredAd) filteredAd.status = newStatus;
        
        renderAdsTable(filteredAds);
        await updateStatsAndDistributions();
        showToast('Ad ' + newStatus + ' successfully', 'success');
    } catch (error) {
        console.error('Error updating ad status:', error);
        showToast('Error updating ad status: ' + error.message, 'error');
    }
}

async function deleteAd(adId) {
    try {
        await db.collection('advertisements').doc(adId).delete();
        
        allAds = allAds.filter(function(a) { return a.id !== adId; });
        filteredAds = filteredAds.filter(function(a) { return a.id !== adId; });
        
        renderAdsTable(filteredAds);
        await updateStatsAndDistributions();
        showToast('Advertisement deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting ad:', error);
        showToast('Error deleting advertisement: ' + error.message, 'error');
    }
}

function showEditAdModal(adId) {
    var ad = allAds.find(function(a) { return a.id === adId; });
    if (!ad) {
        showToast('Advertisement not found', 'error');
        return;
    }
    
    // Simple edit modal using prompt for demo
    var newTitle = prompt('Edit Ad Title:', ad.title || '');
    if (newTitle !== null && newTitle.trim()) {
        var newAdvertiser = prompt('Edit Advertiser:', ad.advertiser || '');
        
        db.collection('advertisements').doc(adId).update({
            title: newTitle.trim(),
            advertiser: newAdvertiser || ad.advertiser,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            ad.title = newTitle.trim();
            ad.advertiser = newAdvertiser || ad.advertiser;
            renderAdsTable(filteredAds);
            updateTopPerformer();
            showToast('Ad updated successfully', 'success');
        }).catch(function(error) {
            console.error('Error updating ad:', error);
            showToast('Error updating ad: ' + error.message, 'error');
        });
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function applyFilters() {
    var searchInput = document.getElementById('adSearch');
    var statusFilter = document.getElementById('filterStatus');
    var typeFilter = document.getElementById('filterType');
    var communityFilter = document.getElementById('filterCommunity');
    
    var searchTerm = searchInput?.value?.toLowerCase() || '';
    var statusValue = statusFilter?.value || '';
    var typeValue = typeFilter?.value || '';
    var communityValue = communityFilter?.value || '';
    
    filteredAds = allAds.filter(function(ad) {
        // Search filter
        if (searchTerm) {
            var title = (ad.title || '').toLowerCase();
            var advertiser = (ad.advertiser || '').toLowerCase();
            if (!title.includes(searchTerm) && !advertiser.includes(searchTerm)) {
                return false;
            }
        }
        
        // Status filter
        if (statusValue && ad.status !== statusValue) {
            return false;
        }
        
        // Type filter
        if (typeValue && ad.type !== typeValue) {
            return false;
        }
        
        // Community filter
        if (communityValue && ad.community !== communityValue) {
            return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    renderAdsTable(filteredAds);
}

// ============================================
// POPULATE FILTER DROPDOWNS
// ============================================

async function populateFilterDropdowns() {
    try {
        var communitySelect = document.getElementById('filterCommunity');
        if (!communitySelect) return;
        
        var communitiesSnapshot = await db.collection('communities').limit(100).get();
        
        communitiesSnapshot.forEach(function(doc) {
            var data = doc.data();
            if (data.name) {
                var option = document.createElement('option');
                option.value = data.name;
                option.textContent = data.name;
                communitySelect.appendChild(option);
            }
        });
    } catch (error) {
        console.warn('Error populating community filter:', error.message);
    }
}

// ============================================
// UPDATE STATS AND DISTRIBUTIONS
// ============================================

async function updateStatsAndDistributions() {
    var stats = await fetchAdStats();
    renderStats(stats);
    renderDistributions();
    updateTopPerformer();
    renderPerformanceChart();
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

function showToast(message, type) {
    if (type === undefined) type = 'info';
    var toast = document.getElementById('toast');
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
                    <i class="fa-solid fa-bullhorn text-xl"></i>
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
            var currentPage = currentPath.split('/').pop() || 'advertisements.html';
            var isActive = currentPage === item.page + '.html' || 
                           (item.page === 'advertisements' && currentPage === 'advertisements.html') ||
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
                
                <a class="sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium text-sm transition-all group" href="#" data-page="settings">
                    <i class="fa-solid fa-gear w-5 text-center text-sm"></i>
                    <span class="link-text transition-all duration-300">Settings</span>
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
// CREATE AD MODAL
// ============================================

function showCreateAdModal() {
    var modalHtml = `
        <div class="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" id="createAdModal">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-on-surface">Create Advertisement</h3>
                    <p class="text-sm text-outline mt-1">Create a new sponsored advertisement</p>
                </div>
                <div class="p-6 space-y-4">
                    <div>
                        <label class="text-sm font-medium text-on-surface">Ad Title <span class="text-red-500">*</span></label>
                        <input id="adTitle" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter ad title" type="text"/>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Advertiser <span class="text-red-500">*</span></label>
                        <input id="adAdvertiser" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Enter advertiser name" type="text"/>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-on-surface">Type</label>
                            <select id="adType" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                                <option value="banner">Banner</option>
                                <option value="sponsored">Sponsored Post</option>
                                <option value="marketplace">Marketplace</option>
                                <option value="job">Job Ad</option>
                            </select>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-on-surface">Status</label>
                            <select id="adStatus" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-on-surface">Community</label>
                        <input id="adCommunity" class="w-full mt-1 px-4 py-2.5 border border-outline-variant rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="e.g., Kwamankese" type="text"/>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button class="modal-cancel px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                    <button class="modal-create px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg transition-colors shadow-sm" id="createAdSubmit">Create Ad</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal
    var existingModal = document.getElementById('createAdModal');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    var modal = document.getElementById('createAdModal');
    
    modal.querySelector('.modal-cancel').addEventListener('click', function() {
        modal.remove();
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) modal.remove();
    });
    
    modal.querySelector('#createAdSubmit').addEventListener('click', async function() {
        var title = document.getElementById('adTitle').value.trim();
        var advertiser = document.getElementById('adAdvertiser').value.trim();
        var type = document.getElementById('adType').value;
        var status = document.getElementById('adStatus').value;
        var community = document.getElementById('adCommunity').value.trim();
        
        if (!title) {
            showToast('Please enter an ad title', 'error');
            return;
        }
        if (!advertiser) {
            showToast('Please enter an advertiser name', 'error');
            return;
        }
        
        try {
            var adData = {
                title: title,
                advertiser: advertiser,
                type: type,
                status: status,
                community: community || 'N/A',
                impressions: 0,
                clicks: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.uid || 'system'
            };
            
            await db.collection('advertisements').add(adData);
            
            showToast('✅ Advertisement created successfully', 'success');
            modal.remove();
            await fetchAdvertisements();
            applyFilters();
            await updateStatsAndDistributions();
        } catch (error) {
            console.error('Error creating ad:', error);
            showToast('Failed to create ad: ' + error.message, 'error');
        }
    });
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Create Ad
    document.getElementById('createAdBtn')?.addEventListener('click', showCreateAdModal);
    document.getElementById('quickCreateAd')?.addEventListener('click', showCreateAdModal);
    
    // Quick actions
    document.getElementById('quickManageCampaigns')?.addEventListener('click', function() {
        showToast('Opening campaign management...', 'info');
    });
    document.getElementById('quickAnalytics')?.addEventListener('click', function() {
        showToast('Opening ad analytics...', 'info');
    });
    document.getElementById('quickExport')?.addEventListener('click', function() {
        showToast('Exporting reports...', 'info');
    });
    document.getElementById('viewReportBtn')?.addEventListener('click', function() {
        showToast('Opening detailed report...', 'info');
    });
    document.getElementById('moreFiltersBtn')?.addEventListener('click', function() {
        showToast('Opening more filters...', 'info');
    });
    document.getElementById('exportBtn')?.addEventListener('click', function() {
        showToast('Exporting data...', 'info');
    });
    
    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', async function() {
        showToast('Refreshing advertisements...', 'info');
        await fetchAdvertisements();
        applyFilters();
        await updateStatsAndDistributions();
        showToast('Advertisements refreshed!', 'success');
    });
    
    // Search with debounce
    var searchInput = document.getElementById('adSearch');
    if (searchInput) {
        var timeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(timeout);
            timeout = setTimeout(applyFilters, 300);
        });
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }
    
    // Filter dropdowns
    ['filterStatus', 'filterType', 'filterCommunity'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyFilters);
        }
    });
    
    // Pagination
    var prevBtn = document.getElementById('prevPage');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            var totalPages = Math.ceil(filteredAds.length / pageSize);
            if (currentPage > 1) {
                currentPage--;
                renderAdsTable(filteredAds);
            }
        });
    }
    
    var nextBtn = document.getElementById('nextPage');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            var totalPages = Math.ceil(filteredAds.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderAdsTable(filteredAds);
            }
        });
    }
    
    // Global search
    var globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && this.value.trim()) {
                var adSearch = document.getElementById('adSearch');
                if (adSearch) adSearch.value = this.value;
                applyFilters();
            }
        });
    }
    
    // User profile click
    var userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function() {
            showToast('Opening user profile...', 'info');
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
                await initAdsPage();
            } else {
                loadSidebar();
                await initAdsPage();
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
// ADS PAGE INITIALIZATION
// ============================================

async function initAdsPage() {
    console.log('📋 Initializing advertisements page...');
    
    showToast('Loading advertisements...', 'info');
    
    await populateFilterDropdowns();
    await fetchAdvertisements();
    
    applyFilters();
    await updateStatsAndDistributions();
    renderPerformanceChart();
    
    setupEventListeners();
    
    console.log('✅ Advertisements page initialized with', allAds.length, 'ads');
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

console.log('🔄 BridgeConnect Advertisements page with Firestore integration loaded');