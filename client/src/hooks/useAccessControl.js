import { useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { hasPermission, isModuleVisible } from '../utils/permissions';

/**
 * Hook for handling access control and permission checking
 * @returns {Object} - Object containing permission checking functions and access control utilities
 */
const useAccessControl = () => {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @returns {boolean} - Whether the user has the permission
   */
  const checkPermission = (moduleId, action) => {
    return hasPermission(user, moduleId, action);
  };

  /**
   * Check if user has access to a module (visible in UI)
   * @param {string} moduleId - The module ID
   * @returns {boolean} - Whether the module is visible to the user
   */
  const checkModuleVisibility = (moduleId) => {
    return isModuleVisible(user, moduleId);
  };

  /**
   * Check if an action is visible but disabled (module visible but action not permitted)
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @returns {boolean} - Whether the action is visible but disabled
   */
  const isActionVisibleButDisabled = (moduleId, action) => {
    // Admins never have disabled actions
    if (user?.role === 'Admin') {
      return false;
    }
    
    // Check if module is visible but user doesn't have permission for this specific action
    return isModuleVisible(user, moduleId) && !hasPermission(user, moduleId, action);
  };

  /**
   * Create a handler function that checks permissions before executing an action
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @param {Function} handler - The function to execute if permission is granted
   * @param {Function} onAccessDenied - Function to call when access is denied
   * @returns {Function} - A wrapped handler function
   */
  const withPermissionCheck = (moduleId, action, handler, onAccessDenied) => {
    return (...args) => {
      if (checkPermission(moduleId, action)) {
        return handler(...args);
      } else {
        if (onAccessDenied) {
          return onAccessDenied();
        }
        // Default behavior - you might want to show a toast or modal here
        console.warn(`Access denied for ${moduleId}.${action}`);
        return null;
      }
    };
  };

  /**
   * Create a handler function that checks permissions and shows access disabled modal if denied
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @param {Function} handler - The function to execute if permission is granted
   * @param {Function} showAccessDisabled - Function to show access disabled modal
   * @param {string} message - Custom message for access denied
   * @returns {Function} - A wrapped handler function
   */
  const withAccessControl = (moduleId, action, handler, showAccessDisabled, message) => {
    return (...args) => {
      if (checkPermission(moduleId, action)) {
        return handler(...args);
      } else {
        const defaultMessage = "You don't have permission to perform this action.";
        showAccessDisabled(message || defaultMessage);
        return null;
      }
    };
  };

  /**
   * Get disabled state for a UI element based on permissions
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @returns {boolean} - Whether the element should be disabled
   */
  const isDisabled = (moduleId, action) => {
    // Admins are never disabled
    if (user?.role === 'Admin') {
      return false;
    }
    
    // Return true if user doesn't have permission
    return !checkPermission(user, moduleId, action);
  };

  /**
   * Get opacity class for a UI element based on permissions
   * @param {string} moduleId - The module ID
   * @param {string} action - The action to check
   * @returns {string} - Tailwind CSS opacity class
   */
  const getOpacityClass = (moduleId, action) => {
    // Admins always get full opacity
    if (user?.role === 'Admin') {
      return '';
    }
    
    // Return opacity class if user doesn't have permission
    return checkPermission(user, moduleId, action) ? '' : 'opacity-50';
  };

  return {
    user,
    checkPermission,
    checkModuleVisibility,
    isActionVisibleButDisabled,
    withPermissionCheck,
    withAccessControl,
    isDisabled,
    getOpacityClass
  };
};

export default useAccessControl;