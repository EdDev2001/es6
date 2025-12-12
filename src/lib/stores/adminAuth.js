// src/lib/stores/adminAuth.js
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Admin Roles
export const ADMIN_ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin'
};

// Permission definitions
export const PERMISSIONS = {
    MANAGE_USERS: 'manage_users',
    VIEW_ATTENDANCE: 'view_attendance',
    EDIT_LOGS: 'edit_logs',
    ACCESS_REPORTS: 'access_reports',
    MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    MANAGE_ANNOUNCEMENTS: 'manage_announcements',
    MANAGE_FEEDBACK: 'manage_feedback',
    MANAGE_SECURITY: 'manage_security'
};

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
    [ADMIN_ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
    [ADMIN_ROLES.ADMIN]: [
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_ATTENDANCE,
        PERMISSIONS.ACCESS_REPORTS,
        PERMISSIONS.MANAGE_ANNOUNCEMENTS,
        PERMISSIONS.MANAGE_FEEDBACK
    ]
};

// Admin auth store
function createAdminAuthStore() {
    const { subscribe, set, update } = writable({
        admin: null,
        isAuthenticated: false,
        isLoading: true,
        mfaRequired: false,
        mfaVerified: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
    });

    return {
        subscribe,
        
        setAdmin: (admin, tokens = {}) => {
            update(state => ({
                ...state,
                admin,
                isAuthenticated: !!admin,
                isLoading: false,
                accessToken: tokens.accessToken || null,
                refreshToken: tokens.refreshToken || null,
                tokenExpiry: tokens.tokenExpiry || null
            }));
            
            if (browser && tokens.accessToken) {
                localStorage.setItem('admin_access_token', tokens.accessToken);
                if (tokens.refreshToken) {
                    localStorage.setItem('admin_refresh_token', tokens.refreshToken);
                }
            }
        },
        
        setMfaRequired: (required) => {
            update(state => ({ ...state, mfaRequired: required }));
        },
        
        setMfaVerified: (verified) => {
            update(state => ({ ...state, mfaVerified: verified, mfaRequired: !verified }));
        },
        
        setLoading: (loading) => {
            update(state => ({ ...state, isLoading: loading }));
        },
        
        updateTokens: (tokens) => {
            update(state => ({
                ...state,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken || state.refreshToken,
                tokenExpiry: tokens.tokenExpiry
            }));
            
            if (browser) {
                localStorage.setItem('admin_access_token', tokens.accessToken);
                if (tokens.refreshToken) {
                    localStorage.setItem('admin_refresh_token', tokens.refreshToken);
                }
            }
        },
        
        logout: () => {
            set({
                admin: null,
                isAuthenticated: false,
                isLoading: false,
                mfaRequired: false,
                mfaVerified: false,
                accessToken: null,
                refreshToken: null,
                tokenExpiry: null
            });
            
            if (browser) {
                localStorage.removeItem('admin_access_token');
                localStorage.removeItem('admin_refresh_token');
            }
        },
        
        getStoredTokens: () => {
            if (!browser) return { accessToken: null, refreshToken: null };
            return {
                accessToken: localStorage.getItem('admin_access_token'),
                refreshToken: localStorage.getItem('admin_refresh_token')
            };
        }
    };
}

export const adminAuthStore = createAdminAuthStore();

// Derived store for checking permissions
export const adminPermissions = derived(adminAuthStore, ($auth) => {
    if (!$auth.admin || !$auth.isAuthenticated) return [];
    
    const role = $auth.admin.role;
    
    // Super admin gets all permissions
    if (role === 'super_admin' || role === ADMIN_ROLES.SUPER_ADMIN) {
        return Object.values(PERMISSIONS);
    }
    
    // Regular admin gets limited permissions
    if (role === 'admin' || role === ADMIN_ROLES.ADMIN) {
        return ROLE_PERMISSIONS[ADMIN_ROLES.ADMIN];
    }
    
    // Fallback to role-based lookup
    return ROLE_PERMISSIONS[role] || [];
});

// Helper function to check if admin has permission
export function hasPermission(permissions, permission) {
    return permissions.includes(permission);
}

// Helper function to check if admin has any of the permissions
export function hasAnyPermission(permissions, requiredPermissions) {
    return requiredPermissions.some(p => permissions.includes(p));
}

// Helper function to check if admin has all permissions
export function hasAllPermissions(permissions, requiredPermissions) {
    return requiredPermissions.every(p => permissions.includes(p));
}
