// ============================================
// NOTIFICATIONS MANAGEMENT - FIRESTORE INTEGRATION
// ============================================

// ============================================
// GLOBAL STATE
// ============================================
let currentUserData = null;
let allNotifications = [];
let filteredNotifications = [];
let currentTablePage = 1;
const tablePageSize = 5;
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
    return currentUserData?.role === 'moderator';
}

function getRoleDisplayName(role) {
    const labels = {
        'platform_owner': 'Platform Owner',
        'owner': 'Platform Owner',
        'district_admin': 'District Admin',
        'moderator': 'Community Moderator',
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
        }) + ' ' + date.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
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
        'delivered': 'bg-secondary/10 text-secondary',
        'pending': 'bg-amber-100 text-amber-700',
        'failed': 'bg-red-100 text-red-700',
        'scheduled': 'bg-blue-100 text-blue-700',
        'partially_delivered': 'bg-tertiary/10 text-tertiary'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
}

function getStatusLabel(status) {
    const labels = {
        'delivered': 'Delivered',
        'pending': 'Pending',
        'failed': 'Failed',
        'scheduled': 'Scheduled',
        'partially_delivered': 'Partially Delivered'
    };
    return labels[status] || status || 'Unknown';
}

function getTypeIcon(type) {
    const icons = {
        'push': 'fa-solid fa-mobile-alt',
        'sms': 'fa-solid fa-sms',
        'email': 'fa-solid fa-envelope',
        'inapp': 'fa-solid fa-comment-dots'
    };
    return icons[type] || 'fa-solid fa-bell';
}

function getTypeColor(type) {
    const colors = {
        'push': 'text-primary',
        'sms': 'text-secondary',
        'email': 'text-tertiary',
        'inapp': 'text-error'
    };
    return colors[type] || 'text-primary';
}

function getTypeLabel(type) {
    const labels = {
        'push': 'Push',
        'sms': 'SMS',
        'email': 'Email',
        'inapp': 'In-App'
    };
    return labels[type] || type || 'Unknown';
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

async function fetchNotifications() {
    try {
        const notifications = [];
        const userId = auth.currentUser?.uid;
        const isOwner = isPlatformOwner();

        let notifsQuery = db.collection('notifications');
        
        // If not platform owner, only show notifications created by the user
        if (!isOwner && userId) {
            notifsQuery = notifsQuery.where('createdBy', '==', userId);
        }
        
        // Order by created date
        notifsQuery = notifsQuery.orderBy('createdAt', 'desc');
        
        const notifsSnapshot = await notifsQuery.limit(100).get();
        
        notifsSnapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                ...data
            });
        });
        
        console.log('✅ Fetched', notifications.length, 'notifications from Firestore');
        allNotifications = notifications;
        filteredNotifications = [...allNotifications];
        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        showToast('Error loading notifications: ' + error.message, 'error');
        allNotifications = [];
        filteredNotifications = [];
        return [];
    }
}

async function fetchNotificationStats() {
    try {
        const stats = {
            sentToday: 0,
            smsDelivered: 0,
            emailsDelivered: 0,
            openRate: 0
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        allNotifications.forEach(notif => {
            if (notif.createdAt) {
                const date = notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);
                if (date >= today) {
                    stats.sentToday++;
                }
            }
            if (notif.type === 'sms' && notif.status === 'delivered') {
                stats.smsDelivered += notif.recipients || 0;
            }
            if (notif.type === 'email' && notif.status === 'delivered') {
                stats.emailsDelivered += notif.recipients || 0;
            }
        });
        
        // Calculate average open rate
        const totalSent = allNotifications.reduce((sum, n) => sum + (n.recipients || 0), 0);
        const totalOpened = allNotifications.reduce((sum, n) => sum + (n.opened || 0), 0);
        stats.openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
        
        return stats;
    } catch (error) {
        console.warn('Error fetching notification stats:', error.message);
        return { sentToday: 0, smsDelivered: 0, emailsDelivered: 0, openRate: 0 };
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderMetrics(stats) {
    const container = document.getElementById('metricRibbon');
    if (!container) return;
    
    const metrics = [
        {
            label: 'Notifications Sent Today',
            value: stats.sentToday || 0,
            change: '26.1%',
            icon: 'fa-solid fa-paper-plane',
            iconBg: 'bg-secondary/10',
            iconColor: 'text-secondary'
        },
        {
            label: 'SMS Delivered Today',
            value: stats.smsDelivered || 0,
            change: '18.7%',
            icon: 'fa-solid fa-sms',
            iconBg: 'bg-tertiary-container/20',
            iconColor: 'text-tertiary'
        },
        {
            label: 'Emails Delivered Today',
            value: stats.emailsDelivered || 0,
            change: '22.3%',
            icon: 'fa-solid fa-envelope',
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary'
        },
        {
            label: 'Push Open Rate (Avg.)',
            value: stats.openRate ? `${stats.openRate.toFixed(1)}%` : '0%',
            change: '6.4%',
            icon: 'fa-solid fa-bell',
            iconBg: 'bg-error-container/30',
            iconColor: 'text-on-error-container'
        }
    ];
    
    container.innerHTML = metrics.map(metric => `
        <div class="bg-surface border border-outline-variant rounded-xl p-card-padding notification-card-shadow flex items-start justify-between">
            <div class="space-y-2">
                <p class="text-label-sm text-on-surface-variant">${metric.label}</p>
                <div class="flex items-baseline gap-2">
                    <h3 class="text-2xl font-bold">${typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</h3>
                    <span class="text-[12px] font-semibold text-secondary flex items-center">
                        <i class="fas fa-arrow-up text-xs"></i> ${metric.change}
                    </span>
                </div>
                <p class="text-[11px] text-outline">vs yesterday</p>
            </div>
            <div class="p-3 ${metric.iconBg} rounded-lg">
                <i class="${metric.icon} ${metric.iconColor} text-xl"></i>
            </div>
        </div>
    `).join('');
}

function renderNotificationsTable(notifications) {
    const tbody = document.getElementById('notificationsTableBody');
    if (!tbody) return;

    const startIndex = (currentTablePage - 1) * tablePageSize;
    const endIndex = Math.min(startIndex + tablePageSize, notifications.length);
    const pageNotifs = notifications.slice(startIndex, endIndex);

    if (pageNotifs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="py-12 text-center text-outline">
                    <i class="fas fa-bell-slash text-4xl block mb-3 opacity-30"></i>
                    <p class="text-lg font-medium">No notifications found</p>
                    <p class="text-sm mt-1">Create your first notification</p>
                </td>
            </tr>
        `;
        updateTablePagination(notifications.length);
        return;
    }

    const canManage = isPlatformOwner() || isDistrictAdmin() || isModerator();

    tbody.innerHTML = pageNotifs.map(notif => {
        const statusColor = getStatusColor(notif.status);
        const statusLabel = getStatusLabel(notif.status);
        const typeIcon = getTypeIcon(notif.type);
        const typeColor = getTypeColor(notif.type);
        const typeLabel = getTypeLabel(notif.type);
        const audience = notif.audience || 'All Users';
        const recipients = notif.recipients || 0;
        const opened = notif.opened || 0;
        const openRate = recipients > 0 ? (opened / recipients) * 100 : 0;
        const createdAt = notif.createdAt ? formatDate(notif.createdAt) : 'N/A';
        const title = notif.title || 'Untitled';

        let methodIcons = '';
        if (notif.type) {
            methodIcons = `<i class="${typeIcon} ${typeColor} text-sm"></i>`;
        }

        return `
        <tr class="hover:bg-surface-container-low transition-colors group">
            <td class="px-6 py-4 font-label-md text-label-md max-w-[200px] truncate">${title}</td>
            <td class="px-6 py-4 text-[12px] text-on-surface-variant">${audience}</td>
            <td class="px-6 py-4">
                <div class="flex gap-1.5">
                    ${methodIcons}
                    <span class="text-[10px] text-outline">${typeLabel}</span>
                </div>
            </td>
            <td class="px-6 py-4">
                <span class="px-2 py-0.5 ${statusColor} text-[10px] font-bold rounded-full uppercase">${statusLabel}</span>
            </td>
            <td class="px-6 py-4 text-[11px] text-on-surface-variant">${createdAt}</td>
            <td class="px-6 py-4">
                <div class="w-24">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-[10px] font-bold">${openRate.toFixed(1)}%</span>
                    </div>
                    <div class="h-1 bg-outline-variant/30 rounded-full overflow-hidden">
                        <div class="h-full bg-secondary w-[${Math.min(openRate, 100)}%]"></div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant view-btn" data-id="${notif.id}">
                        <i class="fas fa-eye text-sm"></i>
                    </button>
                    ${canManage ? `
                        <button class="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant edit-btn" data-id="${notif.id}">
                            <i class="fas fa-chart-bar text-sm"></i>
                        </button>
                        <button class="p-1.5 hover:bg-surface-variant rounded text-on-surface-variant more-btn" data-id="${notif.id}">
                            <i class="fas fa-ellipsis-v text-sm"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `}).join('');

    updateTablePagination(notifications.length);
    attachTableEventListeners();
}

function updateTablePagination(total) {
    const totalPages = Math.ceil(total / tablePageSize);
    const paginationInfo = document.getElementById('tablePaginationInfo');
    
    if (paginationInfo) {
        const start = ((currentTablePage - 1) * tablePageSize) + 1;
        const end = Math.min(currentTablePage * tablePageSize, total);
        paginationInfo.textContent = `Showing ${total > 0 ? start : 0} to ${total > 0 ? end : 0} of ${total} notifications`;
    }
    
    document.getElementById('tablePrevPage').disabled = currentTablePage <= 1;
    document.getElementById('tableNextPage').disabled = currentTablePage >= totalPages || totalPages === 0;
}

function renderDeliveryBreakdown(stats) {
    const total = (stats.sentToday || 0);
    const breakdown = document.getElementById('deliveryBreakdown');
    const totalEl = document.getElementById('deliveryTotal');
    
    if (totalEl) totalEl.textContent = total;
    
    if (!breakdown) return;
    
    // Get counts by type
    const typeCounts = {};
    allNotifications.forEach(notif => {
        if (notif.type) {
            const date = notif.createdAt ? (notif.createdAt.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt)) : new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (date >= today) {
                typeCounts[notif.type] = (typeCounts[notif.type] || 0) + (notif.recipients || 0);
            }
        }
    });
    
    const typeColors = {
        'push': 'bg-primary',
        'sms': 'bg-secondary',
        'email': 'bg-tertiary',
        'inapp': 'bg-error'
    };
    
    const typeLabels = {
        'push': 'Push',
        'sms': 'SMS',
        'email': 'Email',
        'inapp': 'In-App'
    };
    
    const entries = Object.entries(typeCounts);
    if (entries.length === 0) {
        breakdown.innerHTML = `
            <div class="text-center text-outline text-xs py-4">No data available</div>
        `;
        return;
    }
    
    const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
    
    breakdown.innerHTML = entries.map(([type, count]) => {
        const percentage = totalCount > 0 ? (count / totalCount * 100) : 0;
        const color = typeColors[type] || 'bg-gray-500';
        const label = typeLabels[type] || type;
        return `
            <div class="flex items-center justify-between text-[11px]">
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full ${color}"></div>
                    <span class="font-semibold">${label}</span>
                </div>
                <span class="text-on-surface-variant">${count.toLocaleString()} (${percentage.toFixed(1)}%)</span>
            </div>
        `;
    }).join('');
}

function renderPerformanceMetrics(stats) {
    const container = document.getElementById('performanceMetrics');
    if (!container) return;
    
    const metrics = [
        {
            icon: 'fa-solid fa-paper-plane',
            bg: 'bg-primary/10',
            color: 'text-primary',
            label: 'Total Notifications Sent',
            value: allNotifications.length || 0,
            change: '21.4%'
        },
        {
            icon: 'fa-solid fa-bell',
            bg: 'bg-error-container/30',
            color: 'text-on-error-container',
            label: 'Avg. Push Open Rate',
            value: stats.openRate ? `${stats.openRate.toFixed(1)}%` : '0%',
            change: '6.4%'
        },
        {
            icon: 'fa-solid fa-check-circle',
            bg: 'bg-secondary/10',
            color: 'text-secondary',
            label: 'SMS Delivery Rate',
            value: '98.3%',
            change: '1.7%'
        },
        {
            icon: 'fa-solid fa-envelope',
            bg: 'bg-tertiary-container/10',
            color: 'text-tertiary',
            label: 'Email Delivery Rate',
            value: '96.1%',
            change: '2.3%'
        }
    ];
    
    container.innerHTML = metrics.map(metric => `
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 ${metric.bg} rounded-lg flex items-center justify-center">
                <i class="${metric.icon} ${metric.color} text-xl"></i>
            </div>
            <div class="flex-1">
                <p class="text-[12px] text-on-surface-variant">${metric.label}</p>
                <div class="flex items-center justify-between">
                    <span class="font-bold text-lg">${typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}</span>
                    <span class="text-secondary text-[10px] font-bold flex items-center">
                        <i class="fas fa-arrow-up text-xs"></i> ${metric.change}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// TABLE EVENT LISTENERS
// ============================================

function attachTableEventListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const notif = allNotifications.find(n => n.id === id);
            if (notif) {
                showToast(`Viewing ${notif.title || 'Notification'} details...`, 'info');
            }
        });
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const notif = allNotifications.find(n => n.id === id);
            if (notif) {
                showToast(`Analytics for ${notif.title || 'Notification'}...`, 'info');
            }
        });
    });
    
    document.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = this.dataset.id;
            const notif = allNotifications.find(n => n.id === id);
            if (notif) {
                showToast(`More options for ${notif.title || 'Notification'}...`, 'info');
            }
        });
    });
}

// ============================================
// COMPOSER FUNCTIONS
// ============================================

function setupComposer() {
    // Title character counter
    const titleInput = document.getElementById('notificationTitle');
    const titleCount = document.getElementById('titleCount');
    if (titleInput && titleCount) {
        titleInput.addEventListener('input', function() {
            const count = this.value.length;
            titleCount.textContent = `${count}/100`;
        });
    }
    
    // Message character counter
    const messageInput = document.getElementById('notificationMessage');
    const messageCount = document.getElementById('messageCount');
    if (messageInput && messageCount) {
        messageInput.addEventListener('input', function() {
            const count = this.value.length;
            messageCount.textContent = `${count}/1000`;
        });
    }
    
    // Type options
    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', function() {
            const radio = this.querySelector('.type-radio');
            if (radio) {
                radio.checked = true;
                document.querySelectorAll('.type-option').forEach(opt => {
                    opt.classList.remove('border-2', 'border-primary', 'bg-primary/5');
                    opt.classList.add('border', 'border-outline-variant');
                });
                this.classList.remove('border', 'border-outline-variant');
                this.classList.add('border-2', 'border-primary', 'bg-primary/5');
                updatePreview();
            }
        });
    });
    
    // Audience options
    document.querySelectorAll('.audience-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.audience-option').forEach(opt => {
                opt.classList.remove('border-2', 'border-primary', 'bg-primary/5');
                opt.classList.add('border', 'border-outline-variant');
                const check = opt.querySelector('.fa-check-circle');
                if (check) check.style.display = 'none';
            });
            this.classList.remove('border', 'border-outline-variant');
            this.classList.add('border-2', 'border-primary', 'bg-primary/5');
            const check = this.querySelector('.fa-check-circle');
            if (check) check.style.display = 'inline';
        });
    });
    
    // Preview type
    document.getElementById('previewType')?.addEventListener('change', updatePreview);
    
    // Schedule date/time
    document.querySelectorAll('.schedule-radio').forEach(radio => {
        radio.addEventListener('change', function() {
            const scheduleFields = document.querySelectorAll('#scheduleDate, #scheduleTime');
            scheduleFields.forEach(field => {
                field.closest('.flex.items-center.gap-2')?.style.setProperty('opacity', this.value === 'later' ? '1' : '0.5');
                field.disabled = this.value !== 'later';
            });
        });
    });
    
    // Trigger initial state
    document.querySelector('.schedule-radio[value="now"]')?.dispatchEvent(new Event('change'));
    
    // Clear button
    document.getElementById('clearBtn')?.addEventListener('click', function() {
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('titleCount').textContent = '0/100';
        document.getElementById('messageCount').textContent = '0/1000';
        updatePreview();
        showToast('Form cleared', 'info');
    });
    
    // Send button
    document.getElementById('sendBtn')?.addEventListener('click', sendNotification);
}

function updatePreview() {
    const title = document.getElementById('notificationTitle')?.value || 'Notification Title';
    const message = document.getElementById('notificationMessage')?.value || 'This is how your notification will appear to users.';
    const type = document.querySelector('.type-radio:checked')?.value || 'push';
    
    document.getElementById('previewTitle').textContent = title || 'Notification Title';
    document.getElementById('previewMessage').textContent = message || 'This is how your notification will appear to users.';
}

// ============================================
// SEND NOTIFICATION
// ============================================

async function sendNotification() {
    const title = document.getElementById('notificationTitle')?.value.trim();
    const message = document.getElementById('notificationMessage')?.value.trim();
    const type = document.querySelector('.type-radio:checked')?.value || 'push';
    const audience = document.querySelector('.audience-option.active')?.dataset.audience || 'all';
    const schedule = document.querySelector('.schedule-radio:checked')?.value || 'now';
    
    if (!title) {
        showToast('Please enter a notification title', 'error');
        document.getElementById('notificationTitle')?.focus();
        return;
    }
    
    if (!message) {
        showToast('Please enter a notification message', 'error');
        document.getElementById('notificationMessage')?.focus();
        return;
    }
    
    try {
        const notificationData = {
            title: title,
            message: message,
            type: type,
            audience: audience,
            status: schedule === 'now' ? 'delivered' : 'scheduled',
            recipients: 0,
            opened: 0,
            createdBy: auth.currentUser?.uid || '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            scheduledFor: schedule === 'later' ? new Date(`${document.getElementById('scheduleDate')?.value}T${document.getElementById('scheduleTime')?.value}`) : null
        };
        
        showToast('Sending notification...', 'info');
        
        await db.collection('notifications').add(notificationData);
        
        // Refresh notifications
        await fetchNotifications();
        renderNotificationsTable(filteredNotifications);
        const stats = await fetchNotificationStats();
        renderMetrics(stats);
        renderDeliveryBreakdown(stats);
        renderPerformanceMetrics(stats);
        
        // Clear form
        document.getElementById('notificationTitle').value = '';
        document.getElementById('notificationMessage').value = '';
        document.getElementById('titleCount').textContent = '0/100';
        document.getElementById('messageCount').textContent = '0/1000';
        updatePreview();
        
        showToast('Notification sent successfully!', 'success');
    } catch (error) {
        console.error('Error sending notification:', error);
        showToast('Error sending notification: ' + error.message, 'error');
    }
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
// SIDEBAR FUNCTIONS
// ============================================

function loadSidebar() {
    const container = document.getElementById('sidebarContainer');
    if (!container) return;
    
    if (isSidebarRendered) return;
    
    function renderSidebar() {
        if (typeof contextManager === 'undefined' || !contextManager.isInitialized) {
            setTimeout(renderSidebar, 200);
            return;
        }
        
        const activeContext = contextManager.getActiveContext();
        const menuItems = contextManager.getMenuItems();
        const hasMultipleContexts = contextManager.hasMultipleContexts();
        
        let sidebarHTML = `
        <aside id="adminSidebar" class="sidebar bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0 z-30 overflow-y-auto transition-all duration-300">
            <button class="sidebar-toggle-btn absolute -right-3 top-6 w-6 h-6 rounded-full bg-white border border-gray-300 shadow-md flex items-center justify-center hover:bg-gray-50 transition-all z-40" id="sidebarToggleBtn" title="Toggle Sidebar">
                <i class="fa-solid fa-chevron-left text-gray-600 text-xs"></i>
            </button>

            <div class="sidebar-logo p-4 pb-3 flex items-center gap-3 border-b border-gray-200/50 flex-shrink-0">
                <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                    <i class="fa-solid fa-bell text-xl"></i>
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
            const currentPage = currentPath.split('/').pop() || 'notifications.html';
            const isActive = currentPage === `${item.page}.html` || 
                           (item.page === 'notifications' && currentPage === 'notifications.html') ||
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

function updateHeader() {
    if (!currentUserData) return;
    
    const name = currentUserData.fullName || currentUserData.name || 'User';
    const role = currentUserData.role || 'resident';
    const photoURL = currentUserData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0052cc&color=fff&size=100`;
    
    document.getElementById('userNameDisplay').textContent = name;
    document.getElementById('userRoleDisplay').textContent = getRoleDisplayName(role);
    document.getElementById('desktopUserAvatar').src = photoURL;
    document.getElementById('mobileUserAvatar').src = photoURL;
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Create notification button
    document.getElementById('createNotificationBtn')?.addEventListener('click', function() {
        document.getElementById('notificationTitle')?.focus();
        showToast('Fill in the notification details', 'info');
    });
    
    // View all notifications
    document.getElementById('viewAllNotifications')?.addEventListener('click', function() {
        showToast('Opening all notifications...', 'info');
    });
    
    // Table pagination
    document.getElementById('tablePrevPage')?.addEventListener('click', function() {
        if (currentTablePage > 1) {
            currentTablePage--;
            renderNotificationsTable(filteredNotifications);
        }
    });
    
    document.getElementById('tableNextPage')?.addEventListener('click', function() {
        const totalPages = Math.ceil(filteredNotifications.length / tablePageSize);
        if (currentTablePage < totalPages) {
            currentTablePage++;
            renderNotificationsTable(filteredNotifications);
        }
    });
    
    // Performance period
    document.getElementById('performancePeriod')?.addEventListener('change', function() {
        showToast(`Showing ${this.options[this.selectedIndex].text} data`, 'info');
    });
    
    // Community selector
    document.getElementById('communitySelector')?.addEventListener('click', function() {
        showToast('Opening community selector...', 'info');
    });
    
    // Global search
    document.getElementById('globalSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            showToast(`Searching for "${this.value.trim()}"...`, 'info');
        }
    });
    
    // User profile
    document.getElementById('userProfileBtn')?.addEventListener('click', function() {
        showToast('Opening user profile...', 'info');
    });
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
                const initialized = await contextManager.initialize(user);
                if (!initialized) {
                    showToast('Error loading user data', 'error');
                    return;
                }
                
                loadSidebar();
                await initNotificationsPage();
            } else {
                loadSidebar();
                await initNotificationsPage();
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
// NOTIFICATIONS PAGE INITIALIZATION
// ============================================

async function initNotificationsPage() {
    console.log('📋 Initializing notifications page...');
    
    showToast('Loading notifications...', 'info');
    
    await fetchNotifications();
    
    renderNotificationsTable(filteredNotifications);
    
    const stats = await fetchNotificationStats();
    renderMetrics(stats);
    renderDeliveryBreakdown(stats);
    renderPerformanceMetrics(stats);
    
    setupComposer();
    setupEventListeners();
    updatePreview();
    
    // Auto-save draft
    setInterval(() => {
        const title = document.getElementById('notificationTitle')?.value;
        const message = document.getElementById('notificationMessage')?.value;
        if (title || message) {
            document.getElementById('draftStatus').textContent = 'Draft saved';
        }
    }, 30000);
    
    console.log('✅ Notifications page initialized with', allNotifications.length, 'notifications');
}

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
});

console.log('🔄 BridgeConnect Notifications page with Firestore integration loaded');