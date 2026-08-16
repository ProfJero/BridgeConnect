// ============================================
// CONTEXT MANAGER - Handles user contexts
// ============================================

class ContextManager {
    constructor() {
        this.user = null;
        this.userData = null;
        this.contexts = [];
        this.activeContext = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the context manager with user data
     */
    async initialize(user) {
        if (!user) {
            console.warn('No user provided to ContextManager');
            return false;
        }

        this.user = user;
        
        try {
            // Get user data from Firestore
            const doc = await db.collection('users').doc(user.uid).get();
            
            if (!doc.exists) {
                console.error('User document not found');
                return false;
            }

            this.userData = doc.data();
            
            // Load contexts from user data
            this.contexts = this.userData.contexts || [];
            
            // If no contexts, create a default one based on role
            if (this.contexts.length === 0 && this.userData.role) {
                console.log('No contexts found, creating default context from role');
                const defaultContext = {
                    type: this.userData.role,
                    id: this.userData.role === 'platform_owner' ? 'platform' : 'default',
                    label: this.getRoleLabel(this.userData.role),
                    icon: this.getRoleIcon(this.userData.role),
                    permissions: this.getDefaultPermissions(this.userData.role)
                };
                this.contexts = [defaultContext];
            }
            
            // Set active context
            const savedContext = localStorage.getItem('bridgeconnect_active_context');
            if (savedContext) {
                try {
                    const parsed = JSON.parse(savedContext);
                    const context = this.contexts.find(c => 
                        c.type === parsed.type && c.id === parsed.id
                    );
                    if (context) {
                        this.activeContext = context;
                    }
                } catch (e) {
                    console.warn('Invalid saved context, using first available');
                }
            }
            
            // If no active context set, use first one
            if (!this.activeContext && this.contexts.length > 0) {
                this.activeContext = this.contexts[0];
                this.saveActiveContext();
            }
            
            this.isInitialized = true;
            console.log('✅ ContextManager initialized with', this.contexts.length, 'contexts');
            console.log('📍 Active context:', this.activeContext?.label || 'None');
            
            return true;
            
        } catch (error) {
            console.error('Error initializing ContextManager:', error);
            return false;
        }
    }

    /**
     * Get role label
     */
    getRoleLabel(role) {
        const labels = {
            'platform_owner': 'Platform Owner',
            'district_admin': 'District Admin',
            'community_moderator': 'Community Moderator',
            'business_owner': 'Business Owner',
            'organization': 'Organization',
            'resident': 'Resident'
        };
        return labels[role] || role;
    }

    /**
     * Get role icon
     */
    getRoleIcon(role) {
        const icons = {
            'platform_owner': 'fa-globe',
            'district_admin': 'fa-building',
            'community_moderator': 'fa-people-group',
            'business_owner': 'fa-store',
            'organization': 'fa-building-columns',
            'resident': 'fa-user'
        };
        return icons[role] || 'fa-user';
    }

    /**
     * Get default permissions for a role
     */
    getDefaultPermissions(role) {
        const permissions = {
            'platform_owner': ['*'],
            'district_admin': ['manage_businesses', 'manage_jobs', 'manage_reports', 'manage_events'],
            'community_moderator': ['manage_announcements', 'manage_events', 'manage_reports'],
            'business_owner': ['manage_products', 'manage_orders', 'manage_customers'],
            'organization': ['manage_announcements', 'manage_events', 'manage_members'],
            'resident': ['view_feed', 'apply_jobs', 'buy_products']
        };
        return permissions[role] || [];
    }

    /**
     * Get all available contexts
     */
    getContexts() {
        return this.contexts;
    }

    /**
     * Get the active context
     */
    getActiveContext() {
        return this.activeContext;
    }

    /**
     * Check if user has multiple contexts
     */
    hasMultipleContexts() {
        return this.contexts.length > 1;
    }

    /**
     * Switch to a different context
     */
    switchContext(type, id) {
        const context = this.contexts.find(c => c.type === type && c.id === id);
        if (!context) {
            console.error('Context not found:', type, id);
            return false;
        }
        
        this.activeContext = context;
        this.saveActiveContext();
        
        console.log('🔄 Switched to context:', context.label);
        return true;
    }

    /**
     * Save active context to localStorage
     */
    saveActiveContext() {
        if (this.activeContext) {
            localStorage.setItem('bridgeconnect_active_context', JSON.stringify({
                type: this.activeContext.type,
                id: this.activeContext.id
            }));
        }
    }

    /**
     * Get the dashboard URL for the current context
     */
    getDashboardUrl() {
        if (!this.activeContext) return 'dashboard.html';
        
        const type = this.activeContext.type;
        const id = this.activeContext.id;
        
        // Map context types to dashboard paths
        const dashboards = {
            'platform_owner': 'dashboard.html',
            'district_admin': `dashboard.html?district=${id}`,
            'community_moderator': `dashboard.html?community=${id}`,
            'business_owner': `dashboard.html?business=${id}`,
            'organization': `dashboard.html?org=${id}`,
            'resident': 'dashboard-resident.html'
        };
        
        return dashboards[type] || 'dashboard.html';
    }

    /**
     * Get menu items for the current context
     */
    getMenuItems() {
        if (!this.activeContext) return [];
        
        const type = this.activeContext.type;
        
        // Define menus for each context type
        const menus = {
            'platform_owner': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-map', label: 'Locations', page: 'locations' },  // Consolidated
                { icon: 'fa-users', label: 'Users', page: 'users' },
                { icon: 'fa-store', label: 'Businesses', page: 'businesses' },
                { icon: 'fa-building', label: 'Organizations', page: 'organizations' },
                { icon: 'fa-shop', label: 'Marketplace', page: 'marketplace' },
                { icon: 'fa-briefcase', label: 'Jobs', page: 'jobs' },
                { icon: 'fa-calendar-days', label: 'Events', page: 'events' },
                { icon: 'fa-bullhorn', label: 'Advertisements', page: 'advertisements' },
                { icon: 'fa-flag', label: 'Reports', page: 'reports' },
                { icon: 'fa-chart-line', label: 'Analytics', page: 'analytics' },
                { icon: 'fa-user-shield', label: 'Roles & Permissions', page: 'roles' },
                { icon: 'fa-gear', label: 'Settings', page: 'settings' }
            ],
            'district_admin': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-map', label: 'Locations', page: 'locations' },
                { icon: 'fa-store', label: 'Businesses', page: 'businesses' },
                { icon: 'fa-building', label: 'Organizations', page: 'organizations' },
                { icon: 'fa-briefcase', label: 'Jobs', page: 'jobs' },
                { icon: 'fa-calendar-days', label: 'Events', page: 'events' },
                { icon: 'fa-bullhorn', label: 'Advertisements', page: 'advertisements' },
                { icon: 'fa-flag', label: 'Reports', page: 'reports' },
                { icon: 'fa-chart-line', label: 'Analytics', page: 'analytics' }
            ],
            'community_moderator': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-bullhorn', label: 'Announcements', page: 'announcements' },
                { icon: 'fa-calendar-days', label: 'Events', page: 'events' },
                { icon: 'fa-flag', label: 'Reports', page: 'reports' },
                { icon: 'fa-users', label: 'Community Members', page: 'members' },
                { icon: 'fa-envelope', label: 'Messages', page: 'messages' }
            ],
            'business_owner': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-box', label: 'Products', page: 'products' },
                { icon: 'fa-cart-shopping', label: 'Orders', page: 'orders' },
                { icon: 'fa-users', label: 'Customers', page: 'customers' },
                { icon: 'fa-bullhorn', label: 'Promotions', page: 'promotions' },
                { icon: 'fa-briefcase', label: 'Jobs', page: 'jobs' },
                { icon: 'fa-gear', label: 'Settings', page: 'settings' }
            ],
            'organization': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-bullhorn', label: 'Announcements', page: 'announcements' },
                { icon: 'fa-calendar-days', label: 'Events', page: 'events' },
                { icon: 'fa-users', label: 'Members', page: 'members' },
                { icon: 'fa-images', label: 'Gallery', page: 'gallery' },
                { icon: 'fa-gear', label: 'Settings', page: 'settings' }
            ],
            'resident': [
                { icon: 'fa-house', label: 'Dashboard', page: 'dashboard' },
                { icon: 'fa-newspaper', label: 'Feed', page: 'feed' },
                { icon: 'fa-store', label: 'Businesses', page: 'businesses' },
                { icon: 'fa-briefcase', label: 'Jobs', page: 'jobs' },
                { icon: 'fa-calendar-days', label: 'Events', page: 'events' },
                { icon: 'fa-shop', label: 'Marketplace', page: 'marketplace' },
                { icon: 'fa-user', label: 'Profile', page: 'profile' }
            ]
        };
        
        return menus[type] || menus['platform_owner'];
    }

    /**
     * Check if user has a specific permission in the current context
     */
    hasPermission(permission) {
        if (!this.activeContext) return false;
        const permissions = this.activeContext.permissions || [];
        return permissions.includes('*') || permissions.includes(permission);
    }
}

// Create global instance
const contextManager = new ContextManager();

console.log('📦 ContextManager loaded');