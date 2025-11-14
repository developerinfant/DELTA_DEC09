import { hasPermission, hasAnyPermissionInModule, hasModuleAccess, isModuleVisible } from './permissions';

describe('Permission Utilities', () => {
  const mockUser = {
    role: 'Manager',
    permissions: {
      'view-materials': {
        view: true,
        edit: true,
        add: false,
        delete: false,
        'view-report': false
      },
      'outgoing-materials': {
        'record-usage': false,
        'view-report': false
      }
    }
  };

  const adminUser = {
    role: 'Admin',
    permissions: {}
  };

  describe('hasPermission', () => {
    it('should return true for admin users', () => {
      expect(hasPermission(adminUser, 'view-materials', 'view')).toBe(true);
    });

    it('should return true when user has specific permission', () => {
      expect(hasPermission(mockUser, 'view-materials', 'view')).toBe(true);
      expect(hasPermission(mockUser, 'view-materials', 'edit')).toBe(true);
    });

    it('should return false when user does not have specific permission', () => {
      expect(hasPermission(mockUser, 'view-materials', 'add')).toBe(false);
      expect(hasPermission(mockUser, 'view-materials', 'delete')).toBe(false);
    });

    it('should return false when permission does not exist', () => {
      expect(hasPermission(mockUser, 'non-existent-module', 'view')).toBe(false);
    });
  });

  describe('hasAnyPermissionInModule', () => {
    it('should return true for admin users', () => {
      expect(hasAnyPermissionInModule(adminUser, 'view-materials')).toBe(true);
    });

    it('should return true when user has any permission in module', () => {
      expect(hasAnyPermissionInModule(mockUser, 'view-materials')).toBe(true);
    });

    it('should return false when user has no permissions in module', () => {
      // Create a user with no permissions in a module
      const userWithoutModulePermissions = {
        ...mockUser,
        permissions: {
          'other-module': {
            view: true
          }
        }
      };
      expect(hasAnyPermissionInModule(userWithoutModulePermissions, 'view-materials')).toBe(false);
    });
  });

  describe('isModuleVisible', () => {
    it('should return true for admin users', () => {
      expect(isModuleVisible(adminUser, 'view-materials')).toBe(true);
    });

    it('should return true when user has any permission in module', () => {
      expect(isModuleVisible(mockUser, 'view-materials')).toBe(true);
    });

    it('should return false when user has no permissions in module', () => {
      // Create a user with no permissions in a module
      const userWithoutModulePermissions = {
        ...mockUser,
        permissions: {
          'other-module': {
            view: true
          }
        }
      };
      expect(isModuleVisible(userWithoutModulePermissions, 'view-materials')).toBe(false);
    });
  });

  describe('hasModuleAccess', () => {
    it('should return true for admin users', () => {
      expect(hasModuleAccess(adminUser, 'view-materials')).toBe(true);
    });

    it('should return true when user has any permission in module', () => {
      expect(hasModuleAccess(mockUser, 'view-materials')).toBe(true);
    });

    it('should return false when user has no permissions in module', () => {
      // Create a user with no permissions in a module
      const userWithoutModulePermissions = {
        ...mockUser,
        permissions: {
          'other-module': {
            view: true
          }
        }
      };
      expect(hasModuleAccess(userWithoutModulePermissions, 'view-materials')).toBe(false);
    });

    it('should handle array of module IDs', () => {
      expect(hasModuleAccess(mockUser, ['view-materials', 'outgoing-materials'])).toBe(true);
      expect(hasModuleAccess(mockUser, ['non-existent-1', 'non-existent-2'])).toBe(false);
    });
  });
});