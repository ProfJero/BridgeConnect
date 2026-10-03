// ============================================
// EVENTS MANAGEMENT - FIRESTORE INTEGRATION
// ============================================

// ============================================
// GLOBAL STATE
// ============================================
let currentUserData = null;
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
let pageSize = 8;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let isSidebarRendered = false;

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
    const labels = {
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
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch (e) {
        return 'N/A';
    }
}

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
    } catch (e) {
        return 'N/A';
    }
}

function getStatusColor(status) {
    const colors = {
        'approved': 'bg-green-100 text-green-700',
        'pending': 'bg-orange-100 text-orange-700',
        'rejected': 'bg-red-100 text-red-700',
        'cancelled': 'bg-gray-100 text-gray-700',
        'completed': 'bg-blue-100 text-blue-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}

function getCategoryColor(category) {
    const colors = {
        'Education': 'bg-blue-100 text-blue-700',
        'Agriculture': 'bg-green-100 text-green-700',
        'Health': 'bg-red-100 text-red-700',
        'Business': 'bg-purple-100 text-purple-700',
        'Technology': 'bg-indigo-100 text-indigo-700',
        'Arts': 'bg-pink-100 text-pink-700',
        'Sports': 'bg-yellow-100 text-yellow-700',
        'Community': 'bg-teal-100 text-teal-700'
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
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

async function fetchEvents() {
    try {
        const events = [];
        const isOwner = isPlatformOwner();
        const userDistrict = currentUserData?.district;

        let eventsQuery = db.collection('events');
        
        // If not platform owner, only show events in their district
        if (!isOwner && userDistrict) {
            eventsQuery = eventsQuery.where('district', '==', userDistrict);
        }
        
        // Order by date
        eventsQuery = eventsQuery.orderBy('eventDate', 'desc');
        
        const eventsSnapshot = await eventsQuery.limit(500).get();
        
        eventsSnapshot.forEach(doc => {
            const data = doc.data();
            events.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log('✅ Fetched', events.length, 'events from Firestore');
        allEvents = events;
        filteredEvents = [...allEvents];
        return events;
    } catch (error) {
        console.error('Error fetching events:', error);
        showToast('Error loading events: ' + error.message, 'error');
        allEvents = [];
        filteredEvents = [];
        return [];
    }
}

async function fetchEventStats() {
    try {
        const stats = {
            total: 0,
            upcoming: 0,
            registrations: 0,
            completed: 0
        };
        
        const now = new Date();
        const events = allEvents;
        
        stats.total = events.length;
        stats.upcoming = events.filter(e => {
            if (!e.eventDate) return false;
            const date = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
            return date > now && e.status === 'approved';
        }).length;
        stats.completed = events.filter(e => {
            if (!e.eventDate) return false;
            const date = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
            return date < now && e.status === 'approved';
        }).length;
        stats.registrations = events.reduce((sum, e) => sum + (e.registrations || 0), 0);
        
        return stats;
    } catch (error) {
        console.warn('Error fetching event stats:', error.message);
        return { total: 0, upcoming: 0, registrations: 0, completed: 0 };
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderEventsTable(events) {
    const tbody = document.getElementById('eventsTableBody');
    if (!tbody) return;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, events.length);
    const pageEvents = events.slice(startIndex, endIndex);

    if (pageEvents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="py-12 text-center text-gray-500">
                    <i class="fas fa-calendar-times text-4xl block mb-3 opacity-30"></i>
                    <p class="text-lg font-medium">No events found</p>
                    <p class="text-sm mt-1">Try adjusting your filters or create a new event</p>
                </td>
            </tr>
        `;
        updatePagination(events.length);
        return;
    }

    const canManage = isPlatformOwner() || isDistrictAdmin() || isModerator();

    tbody.innerHTML = pageEvents.map(event => {
        const statusColor = getStatusColor(event.status);
        const categoryColor = getCategoryColor(event.category);
        const eventDate = event.eventDate ? formatDate(event.eventDate) : 'N/A';
        const eventTime = event.eventDate ? formatTime(event.eventDate) : 'N/A';
        const organizerName = event.organizerName || 'Unknown';
        const organizerAvatar = event.organizerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(organizerName)}&background=0052cc&color=fff&size=40`;
        const banner = event.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title || 'Event')}&background=0052cc&color=fff&size=200&format=png`;
        const visibility = event.visibility || 'public';
        const registrations = event.registrations || 0;

        let actionButtons = `
            <button class="p-1.5 text-gray-400 hover:text-primary transition-colors view-btn" data-id="${event.id}">
                <i class="fas fa-eye"></i>
            </button>
            <button class="p-1.5 text-gray-400 hover:text-primary transition-colors edit-btn" data-id="${event.id}">
                <i class="fas fa-edit"></i>
            </button>
        `;

        if (canManage && event.status === 'pending') {
            actionButtons += `
                <button class="p-1.5 text-green-500 hover:text-green-700 approve-btn" data-id="${event.id}">
                    <i class="fas fa-check-circle"></i>
                </button>
                <button class="p-1.5 text-red-500 hover:text-red-700 reject-btn" data-id="${event.id}">
                    <i class="fas fa-times-circle"></i>
                </button>
            `;
        } else {
            actionButtons += `
                <button class="p-1.5 text-gray-400 hover:text-primary transition-colors more-btn" data-id="${event.id}">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            `;
        }

        return `
        <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4">
                <img alt="Banner" class="w-24 h-12 object-cover rounded shadow-sm border border-gray-100" src="${banner}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(event.title || 'Event')}&background=0052cc&color=fff&size=200'"/>
            </td>
            <td class="px-4 py-4">
                <div class="text-sm font-bold text-gray-900 leading-tight">${event.title || 'Untitled Event'}</div>
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                    <img class="w-6 h-6 rounded-full object-cover" src="${organizerAvatar}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(organizerName)}&background=0052cc&color=fff&size=40'"/>
                    <span class="text-xs text-gray-600">${organizerName}</span>
                </div>
            </td>
            <td class="px-4 py-4 text-xs text-gray-600">${event.community || event.district || 'N/A'}</td>
            <td class="px-4 py-4 text-center">
                <span class="category-badge ${categoryColor}">${event.category || 'General'}</span>
            </td>
            <td class="px-4 py-4">
                <div class="text-[10px] text-gray-500">${eventDate}</div>
                <div class="text-[11px] font-medium text-gray-700">${eventTime}</div>
            </td>
            <td class="px-4 py-4 text-center text-sm font-semibold text-gray-700">${registrations}</td>
            <td class="px-4 py-4">
                <span class="status-badge ${statusColor}">${(event.status || 'pending').charAt(0).toUpperCase() + (event.status || 'pending').slice(1)}</span>
            </td>
            <td class="px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-tighter">${visibility}</td>
            <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                    ${actionButtons}
                </div>
            </td>
        </tr>
    `}).join('');

    updatePagination(events.length);
    updateEventCount(events.length);
    attachTableEventListeners();
}

function updatePagination(total) {
    const totalPages = Math.ceil(total / pageSize);
    const paginationContainer = document.getElementById('paginationButtons');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (paginationInfo) {
        const start = ((currentPage - 1) * pageSize) + 1;
        const end = Math.min(currentPage * pageSize, total);
        paginationInfo.textContent = `Showing ${total > 0 ? start : 0} to ${total > 0 ? end : 0} of ${total} events`;
    }
    
    if (!paginationContainer) return;
    
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
    
    let buttonsHTML = '';
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        buttonsHTML += `<button class="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-gray-600 text-xs rounded page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            buttonsHTML += `<span class="text-gray-400 px-1">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage;
        buttonsHTML += `
            <button class="w-8 h-8 flex items-center justify-center ${isActive ? 'bg-primary text-white' : 'hover:bg-gray-200 text-gray-600'} text-xs rounded page-btn" data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            buttonsHTML += `<span class="text-gray-400 px-1">...</span>`;
        }
        buttonsHTML += `<button class="w-8 h-8 flex items-center justify-center hover:bg-gray-200 text-gray-600 text-xs rounded page-btn" data-page="${totalPages}">${totalPages}</button>`;
    }
    
    paginationContainer.innerHTML = buttonsHTML;
    
    // Attach pagination events
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = parseInt(this.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                renderEventsTable(filteredEvents);
            }
        });
    });
}

function updateEventCount(total) {
    const countElement = document.getElementById('eventCount');
    if (countElement) {
        countElement.textContent = `(${total})`;
    }
}

function renderUpcomingEvents(events) {
    const container = document.getElementById('upcomingEvents');
    if (!container) return;
    
    const now = new Date();
    const upcoming = events
        .filter(e => {
            if (!e.eventDate || e.status !== 'approved') return false;
            const date = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
            return date > now;
        })
        .sort((a, b) => {
            const dateA = a.eventDate.toDate ? a.eventDate.toDate() : new Date(a.eventDate);
            const dateB = b.eventDate.toDate ? b.eventDate.toDate() : new Date(b.eventDate);
            return dateA - dateB;
        })
        .slice(0, 3);
    
    if (upcoming.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 text-xs py-4">
                <i class="fas fa-calendar-check text-2xl block mb-2 opacity-30"></i>
                No upcoming events
            </div>
        `;
        return;
    }
    
    container.innerHTML = upcoming.map(event => {
        const date = event.eventDate.toDate ? event.eventDate.toDate() : new Date(event.eventDate);
        const banner = event.banner || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.title || 'Event')}&background=0052cc&color=fff&size=80&format=png`;
        const colorClass = ['bg-blue-50', 'bg-green-50', 'bg-purple-50'][Math.floor(Math.random() * 3)];
        
        return `
        <div class="flex gap-3">
            <div class="w-10 h-10 ${colorClass} rounded overflow-hidden flex-shrink-0">
                <img class="w-full h-full object-cover" src="${banner}" onerror="this.style.display='none'"/>
            </div>
            <div class="min-w-0">
                <p class="text-xs font-bold text-gray-800 truncate">${event.title || 'Untitled'}</p>
                <p class="text-[10px] text-gray-500">${formatDate(event.eventDate)} • ${event.community || event.district || 'N/A'}</p>
            </div>
        </div>
    `}).join('');
}

function renderPendingEvents(events) {
    const container = document.getElementById('pendingEvents');
    if (!container) return;
    
    const pending = events
        .filter(e => e.status === 'pending')
        .slice(0, 3);
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 text-xs py-4">
                <i class="fas fa-check-circle text-2xl block mb-2 opacity-30"></i>
                No pending approvals
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(event => `
        <div class="flex items-center justify-between">
            <div class="min-w-0">
                <p class="text-xs font-bold text-gray-800 truncate">${event.title || 'Untitled'}</p>
                <p class="text-[10px] text-gray-500">${event.organizerName || 'Unknown'} • ${formatDate(event.eventDate)}</p>
            </div>
            <i class="fas fa-clock text-orange-400"></i>
        </div>
    `).join('');
}

function renderEventStats(stats) {
    const container = document.getElementById('eventStats');
    if (!container) return;
    
    const statCards = [
        { 
            icon: 'fa-solid fa-calendar', 
            color: 'bg-blue-500', 
            bgColor: 'bg-blue-50', 
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700',
            label: 'Total Events',
            value: stats.total || 0,
            change: '+18.6%'
        },
        { 
            icon: 'fa-solid fa-clock', 
            color: 'bg-green-500', 
            bgColor: 'bg-green-50', 
            borderColor: 'border-green-100',
            textColor: 'text-green-700',
            label: 'Upcoming',
            value: stats.upcoming || 0,
            change: '+12.3%'
        },
        { 
            icon: 'fa-solid fa-users', 
            color: 'bg-purple-500', 
            bgColor: 'bg-purple-50', 
            borderColor: 'border-purple-100',
            textColor: 'text-purple-700',
            label: 'Registrations',
            value: stats.registrations || 0,
            change: '+24.8%'
        },
        { 
            icon: 'fa-solid fa-check-circle', 
            color: 'bg-orange-500', 
            bgColor: 'bg-orange-50', 
            borderColor: 'border-orange-100',
            textColor: 'text-orange-700',
            label: 'Completed',
            value: stats.completed || 0,
            change: '+28.6%'
        }
    ];
    
    container.innerHTML = statCards.map(card => `
        <div class="p-3 ${card.bgColor} rounded-lg border ${card.borderColor}">
            <div class="${card.color} w-6 h-6 rounded flex items-center justify-center mb-2">
                <i class="${card.icon} text-white text-sm"></i>
            </div>
            <p class="text-[9px] ${card.textColor} font-bold uppercase tracking-tighter">${card.label}</p>
            <p class="text-xl font-bold text-gray-900 mt-1">${card.value.toLocaleString()}</p>
            <p class="text-[9px] text-green-600 font-bold mt-1 flex items-center gap-0.5">
                <i class="fas fa-arrow-up"></i> ${card.change}
            </p>
        </div>
    `).join('');
}

function renderCalendar(month, year) {
    const container = document.getElementById('calendarDays');
    const monthLabel = document.getElementById('calendarMonth');
    if (!container || !monthLabel) return;
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    let daysHTML = '';
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        daysHTML += `<span class="text-[11px] p-1 text-gray-300"></span>`;
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === todayDate && month === todayMonth && year === todayYear;
        const hasEvent = allEvents.some(e => {
            if (!e.eventDate) return false;
            const date = e.eventDate.toDate ? e.eventDate.toDate() : new Date(e.eventDate);
            return date.getDate() === i && date.getMonth() === month && date.getFullYear() === year;
        });
        
        let classes = 'text-[11px] p-1';
        if (isToday) {
            classes += ' bg-primary text-white rounded-full font-bold';
        } else if (hasEvent) {
            classes += ' font-bold border border-primary/20 rounded';
        } else {
            classes += ' text-gray-600';
        }
        
        daysHTML += `<span class="${classes}">${i}</span>`;
    }
    
    container.innerHTML = daysHTML;
}

// ============================================
// TABLE EVENT LISTENERS
// ============================================

function attachTableEventListeners() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const event = allEvents.find(e => e.id === id);
            if (event) {
                showToast(`Viewing ${event.title || 'Event'} details...`, 'info');
            }
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const event = allEvents.find(e => e.id === id);
            if (event) {
                showToast(`Editing ${event.title || 'Event'}...`, 'info');
            }
        });
    });
    
    // Approve buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const event = allEvents.find(e => e.id === id);
            if (event && confirm(`Approve "${event.title || 'Event'}"?`)) {
                updateEventStatus(id, 'approved');
            }
        });
    });
    
    // Reject buttons
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const event = allEvents.find(e => e.id === id);
            if (event && confirm(`Reject "${event.title || 'Event'}"?`)) {
                updateEventStatus(id, 'rejected');
            }
        });
    });
    
    // More buttons
    document.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const event = allEvents.find(e => e.id === id);
            if (event) {
                showToast(`More options for ${event.title || 'Event'}...`, 'info');
            }
        });
    });
}

// ============================================
// EVENT MANAGEMENT FUNCTIONS
// ============================================

async function updateEventStatus(eventId, newStatus) {
    try {
        await db.collection('events').doc(eventId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const event = allEvents.find(e => e.id === eventId);
        if (event) {
            event.status = newStatus;
            const filteredEvent = filteredEvents.find(e => e.id === eventId);
            if (filteredEvent) {
                filteredEvent.status = newStatus;
            }
        }
        
        renderEventsTable(filteredEvents);
        renderPendingEvents(filteredEvents);
        const stats = await fetchEventStats();
        renderEventStats(stats);
        showToast(`Event ${newStatus} successfully`, 'success');
    } catch (error) {
        console.error('Error updating event status:', error);
        showToast('Error updating event status: ' + error.message, 'error');
    }
}

// ============================================
// FILTER FUNCTIONS
// ============================================

function applyFilters() {
    const searchTerm = document.getElementById('eventSearch')?.value?.toLowerCase() || '';
    const regionFilter = document.getElementById('filterRegion')?.value || '';
    const districtFilter = document.getElementById('filterDistrict')?.value || '';
    const communityFilter = document.getElementById('filterCommunity')?.value || '';
    const categoryFilter = document.getElementById('filterCategory')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    
    filteredEvents = allEvents.filter(event => {
        // Search filter
        if (searchTerm) {
            const title = (event.title || '').toLowerCase();
            const organizer = (event.organizerName || '').toLowerCase();
            const community = (event.community || event.district || '').toLowerCase();
            if (!title.includes(searchTerm) && !organizer.includes(searchTerm) && !community.includes(searchTerm)) {
                return false;
            }
        }
        
        // Region filter
        if (regionFilter && event.region !== regionFilter) {
            return false;
        }
        
        // District filter
        if (districtFilter && event.district !== districtFilter) {
            return false;
        }
        
        // Community filter
        if (communityFilter && event.community !== communityFilter) {
            return false;
        }
        
        // Category filter
        if (categoryFilter && event.category !== categoryFilter) {
            return false;
        }
        
        // Status filter
        if (statusFilter && event.status !== statusFilter) {
            return false;
        }
        
        // Date filter
        if (dateFilter) {
            if (!event.eventDate) return false;
            const date = event.eventDate.toDate ? event.eventDate.toDate() : new Date(event.eventDate);
            const filterDate = new Date(dateFilter);
            if (date.toDateString() !== filterDate.toDateString()) {
                return false;
            }
        }
        
        return true;
    });
    
    currentPage = 1;
    renderEventsTable(filteredEvents);
    renderUpcomingEvents(filteredEvents);
    renderPendingEvents(filteredEvents);
}

// ============================================
// POPULATE FILTER DROPDOWNS
// ============================================

async function populateFilterDropdowns() {
    try {
        // Get regions
        const regionsSnapshot = await db.collection('regions').limit(100).get();
        const regionSelect = document.getElementById('filterRegion');
        if (regionSelect) {
            regionsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    regionSelect.innerHTML += `<option value="${data.name}">${data.name}</option>`;
                }
            });
        }
        
        // Get districts
        const districtsSnapshot = await db.collection('districts').limit(100).get();
        const districtSelect = document.getElementById('filterDistrict');
        if (districtSelect) {
            districtsSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    districtSelect.innerHTML += `<option value="${data.name}">${data.name}</option>`;
                }
            });
        }
        
        // Get communities
        const communitiesSnapshot = await db.collection('communities').limit(100).get();
        const communitySelect = document.getElementById('filterCommunity');
        if (communitySelect) {
            communitiesSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.name) {
                    communitySelect.innerHTML += `<option value="${data.name}">${data.name}</option>`;
                }
            });
        }
    } catch (error) {
        console.warn('Error populating filter dropdowns:', error.message);
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
                    <i class="fa-solid fa-calendar text-xl"></i>
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
            var currentPage = currentPath.split('/').pop() || 'events.html';
            var isActive = currentPage === item.page + '.html' || 
                           (item.page === 'events' && currentPage === 'events.html') ||
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
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Create Event
    var createBtn = document.getElementById('createEventBtn');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            showToast('Opening event creation form...', 'info');
        });
    }
    
    // Search with debounce
    var searchInput = document.getElementById('eventSearch');
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
    ['filterRegion', 'filterDistrict', 'filterCommunity', 'filterCategory', 'filterStatus', 'filterDate'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', applyFilters);
        }
    });
    
    // Clear filters
    var clearBtn = document.getElementById('clearFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            var search = document.getElementById('eventSearch');
            if (search) search.value = '';
            ['filterRegion', 'filterDistrict', 'filterCommunity', 'filterCategory', 'filterStatus', 'filterDate'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.value = '';
            });
            applyFilters();
        });
    }
    
    // Refresh events
    var refreshBtn = document.getElementById('refreshEvents');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            showToast('Refreshing events...', 'info');
            await fetchEvents();
            applyFilters();
            var stats = await fetchEventStats();
            renderEventStats(stats);
            renderCalendar(currentMonth, currentYear);
            showToast('Events refreshed!', 'success');
        });
    }
    
    // Pagination
    var prevBtn = document.getElementById('prevPage');
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            var totalPages = Math.ceil(filteredEvents.length / pageSize);
            if (currentPage > 1) {
                currentPage--;
                renderEventsTable(filteredEvents);
            }
        });
    }
    
    var nextBtn = document.getElementById('nextPage');
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            var totalPages = Math.ceil(filteredEvents.length / pageSize);
            if (currentPage < totalPages) {
                currentPage++;
                renderEventsTable(filteredEvents);
            }
        });
    }
    
    var pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener('change', function() {
            pageSize = parseInt(this.value);
            currentPage = 1;
            renderEventsTable(filteredEvents);
        });
    }
    
    // Calendar navigation
    var prevMonthBtn = document.getElementById('prevMonth');
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            if (currentMonth === 0) {
                currentMonth = 11;
                currentYear--;
            } else {
                currentMonth--;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }
    
    var nextMonthBtn = document.getElementById('nextMonth');
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            if (currentMonth === 11) {
                currentMonth = 0;
                currentYear++;
            } else {
                currentMonth++;
            }
            renderCalendar(currentMonth, currentYear);
        });
    }
    
    // Region selector
    var regionSelector = document.getElementById('regionSelector');
    if (regionSelector) {
        regionSelector.addEventListener('click', function() {
            showToast('Opening region selector...', 'info');
        });
    }
    
    // User profile
    var userProfileBtn = document.getElementById('userProfileBtn');
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function() {
            showToast('Opening user profile...', 'info');
        });
    }
    
    // View all upcoming
    var viewAllUpcoming = document.getElementById('viewAllUpcoming');
    if (viewAllUpcoming) {
        viewAllUpcoming.addEventListener('click', function() {
            var statusFilter = document.getElementById('filterStatus');
            if (statusFilter) statusFilter.value = 'approved';
            applyFilters();
            showToast('Showing all approved events', 'info');
        });
    }
    
    // View all pending
    var viewAllPending = document.getElementById('viewAllPending');
    if (viewAllPending) {
        viewAllPending.addEventListener('click', function() {
            var statusFilter = document.getElementById('filterStatus');
            if (statusFilter) statusFilter.value = 'pending';
            applyFilters();
            showToast('Showing all pending events', 'info');
        });
    }
    
    // Stats period
    var statsPeriod = document.getElementById('statsPeriod');
    if (statsPeriod) {
        statsPeriod.addEventListener('change', async function() {
            showToast('Updating statistics...', 'info');
            var stats = await fetchEventStats();
            renderEventStats(stats);
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
                await initEventsPage();
            } else {
                loadSidebar();
                await initEventsPage();
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
// EVENTS PAGE INITIALIZATION
// ============================================

async function initEventsPage() {
    console.log('📋 Initializing events page...');
    
    showToast('Loading events...', 'info');
    
    await populateFilterDropdowns();
    await fetchEvents();
    
    applyFilters();
    
    var stats = await fetchEventStats();
    renderEventStats(stats);
    
    renderCalendar(currentMonth, currentYear);
    renderUpcomingEvents(allEvents);
    renderPendingEvents(allEvents);
    
    setupEventListeners();
    
    console.log('✅ Events page initialized with', allEvents.length, 'events');
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

console.log('🔄 BridgeConnect Events page with Firestore integration loaded');