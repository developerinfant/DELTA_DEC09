/**
 * Permission checking utility functions
 */

/**
 * Check if a user has a specific permission
 * @param {Object} user - The user object with permissions
 * @param {string} moduleId - The module ID (e.g., 'view-materials')
 * @param {string} action - The action (e.g., 'edit', 'delete', 'view-report')
 * @returns {boolean} - Whether the user has the permission
 */
export const hasPermission = (user, moduleId, action) => {
  // Admins have all permissions
  if (user?.role === 'Admin') {
    return true;
  }
  
  // Check if user has granular permissions
  if (user?.permissions && user.permissions[moduleId]) {
    // If the action exists in permissions, return its value, otherwise default to false
    return user.permissions[moduleId][action] === true;
  }
  
  // Fallback to old module access system
  if (user?.moduleAccess) {
    return user.moduleAccess.includes(moduleId);
  }
  
  // Default to false if no permissions found
  return false;
};

/**
 * Check if a user has any permission in a module
 * @param {Object} user - The user object with permissions
 * @param {string} moduleId - The module ID
 * @returns {boolean} - Whether the user has any permission in the module
 */
export const hasAnyPermissionInModule = (user, moduleId) => {
  // Admins have all permissions
  if (user?.role === 'Admin') {
    return true;
  }
  
  // Check if user has granular permissions for this module
  if (user?.permissions && user.permissions[moduleId]) {
    return Object.values(user.permissions[moduleId]).some(permission => permission === true);
  }
  
  // Fallback to old module access system
  if (user?.moduleAccess) {
    return user.moduleAccess.includes(moduleId);
  }
  
  // Default to false if no permissions found
  return false;
};

/**
 * Check if a module/submodule should be visible (at least one action is enabled or module is explicitly selected)
 * @param {Object} user - The user object with permissions
 * @param {string} moduleId - The module ID
 * @returns {boolean} - Whether the module should be visible
 */
export const isModuleVisible = (user, moduleId) => {
  // Admins can see all modules
  if (user?.role === 'Admin') {
    return true;
  }
  
  // Check if user has granular permissions for this module
  if (user?.permissions && user.permissions[moduleId]) {
    // For the new permission system, a module is visible if:
    // 1. Any action is enabled (hasAnyPermissionInModule)
    // 2. OR the module is explicitly marked as visible (even with no actions)
    return hasAnyPermissionInModule(user, moduleId);
  }
  
  // Fallback to old module access system
  if (user?.moduleAccess) {
    return user.moduleAccess.includes(moduleId);
  }
  
  // Default to false if no permissions found
  return false;
};

/**
 * Check if a user has access to a module (for sidebar visibility)
 * This function now checks if a submodule is visible based on the new permission logic
 * @param {Object} user - The user object with permissions
 * @param {string|Array} moduleId - The module ID or array of module IDs
 * @returns {boolean} - Whether the user has access to the module
 */
export const hasModuleAccess = (user, moduleId) => {
  // Admins have access to all modules
  if (user?.role === 'Admin') {
    return true;
  }
  
  // Handle array of module IDs (for section-level access)
  if (Array.isArray(moduleId)) {
    // Check if user has access to any of the modules in the array
    return moduleId.some(id => isModuleVisible(user, id));
  }
  
  // Check if user has granular permissions for this module
  if (user?.permissions && user.permissions[moduleId]) {
    // For the new permission system, a module is accessible if:
    // 1. Any action is enabled (hasAnyPermissionInModule)
    // 2. OR the module is explicitly marked as visible (even with no actions)
    return isModuleVisible(user, moduleId);
  }
  
  // Fallback to old module access system
  if (user?.moduleAccess) {
    return user.moduleAccess.includes(moduleId);
  }
  
  // Default to false if no permissions found
  return false;
};

/**
 * Hook to check permissions
 * @param {Object} user - The user object with permissions
 * @returns {Object} - Object with permission checking functions
 */
export const usePermissions = (user) => {
  return {
    hasPermission: (moduleId, action) => hasPermission(user, moduleId, action),
    hasAnyPermissionInModule: (moduleId) => hasAnyPermissionInModule(user, moduleId),
    isModuleVisible: (moduleId) => isModuleVisible(user, moduleId),
    hasModuleAccess: (moduleId) => hasModuleAccess(user, moduleId)
  };
};

/**
 * Higher-order component to protect components based on permissions
 * @param {React.Component} Component - The component to protect
 * @param {string} moduleId - The module ID
 * @param {string} action - The action
 * @returns {React.Component} - The protected component
 */
export const withPermission = (Component, moduleId, action) => {
  const PermissionWrapper = (props) => {
    const { user } = props;
    
    if (!user) {
      return null;
    }
    
    if (hasPermission(user, moduleId, action)) {
      return <Component {...props} />;
    }
    
    return (
      <div className="p-4 text-center text-gray-500">
        You don't have permission to view this content.
      </div>
    );
  };
  
  PermissionWrapper.displayName = `WithPermission(${Component.displayName || Component.name})`;
  
  return PermissionWrapper;
};

/**
 * Component to render content only if user has permission
 * @param {Object} props - Component props
 * @param {Object} props.user - The user object with permissions
 * @param {string} props.moduleId - The module ID
 * @param {string} props.action - The action
 * @param {React.ReactNode} props.children - The content to render
 * @param {React.ReactNode} props.fallback - Fallback content if no permission
 * @returns {React.ReactNode} - The content or fallback
 */
export const PermissionGuard = ({ 
  user, 
  moduleId, 
  action, 
  children, 
  fallback = null 
}) => {
  if (!user) {
    return fallback;
  }
  
  if (hasPermission(user, moduleId, action)) {
    return children;
  }
  
  return fallback;
};

/**
 * Hook to check if user has any permission in a list of modules
 * @param {Object} user - The user object with permissions
 * @param {Array} moduleIds - Array of module IDs
 * @returns {boolean} - Whether the user has any permission in any of the modules
 */
export const useAnyModulePermission = (user, moduleIds) => {
  return moduleIds.some(moduleId => hasAnyPermissionInModule(user, moduleId));
};

export default {
  hasPermission,
  hasAnyPermissionInModule,
  hasModuleAccess,
  usePermissions,
  withPermission,
  PermissionGuard,
  useAnyModulePermission
};