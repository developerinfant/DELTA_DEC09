const User = require('../models/User');

/**
 * Initialize permission structure with proper defaults
 * @param {Object} permissions - The permissions object to initialize
 * @returns {Object} - The properly structured permissions object
 */
const initializePermissionStructure = (permissions = {}) => {
  // Define the permission structure
  const permissionStructure = {
    packing: {
      name: 'Packing Materials',
      submodules: {
        'view-materials': {
          name: 'Item Master',
          actions: ['view', 'edit', 'add', 'delete', 'view-report']
        },
        'outgoing-materials': {
          name: 'Delivery Challan',
          actions: ['record-usage']
        },
        'stock-alerts': {
          name: 'Stock Alerts',
          actions: ['view', 'add-stock', 'create-po']
        },
        'view-packing-pos': {
          name: 'View POs',
          actions: ['view', 'create-po', 'cancel-po', 'view-report']
        },
        'manage-packing-suppliers': {
          name: 'Master Supplier',
          actions: ['view', 'add', 'edit', 'delete', 'view-report']
        },
        'view-packing-grns': {
          name: 'GRN',
          actions: ['view', 'create-grn', 'view-report']
        }
      }
    },
    stock: {
      name: 'Stock Maintenance',
      submodules: {
        'view-raw-materials': {
          name: 'Raw Materials',
          actions: ['view', 'edit', 'add', 'delete', 'view-report']
        },
        'jobber-unit': {
          name: 'Worker Unit',
          actions: ['view-report', 'send-material', 'edit']
        },
        'outgoing-raw-materials': {
          name: 'Delivery Challan',
          actions: ['record-usage', 'view-report']
        },
        'raw-stock-alerts': {
          name: 'Stock Alerts',
          actions: ['view', 'add-stock', 'create-po']
        },
        'view-stock-pos': {
          name: 'View POs',
          actions: ['view', 'create-po', 'cancel-po', 'view-report']
        },
        'manage-stock-suppliers': {
          name: 'Master Supplier',
          actions: ['view', 'add', 'edit', 'delete', 'view-report']
        },
        'view-stock-grns': {
          name: 'GRN',
          actions: ['view', 'create-grn', 'view-report']
        }
      }
    },
    product: {
      name: 'Product Management',
      submodules: {
        'product-details': {
          name: 'Product Details',
          actions: ['edit', 'view-report']
        },
        'product-dc': {
          name: 'Product DC',
          actions: ['new-invoice', 'view-invoice']
        }
      }
    }
  };

  // Ensure all submodules exist in the permissions object with proper structure
  const initializedPermissions = { ...permissions };
  
  Object.values(permissionStructure).forEach(section => {
    Object.keys(section.submodules).forEach(submoduleId => {
      // Initialize submodule if it doesn't exist
      if (!initializedPermissions[submoduleId]) {
        initializedPermissions[submoduleId] = {};
      }
      
      // Ensure all actions exist for the submodule
      section.submodules[submoduleId].actions.forEach(action => {
        // If action doesn't exist, initialize it as false
        if (initializedPermissions[submoduleId][action] === undefined) {
          initializedPermissions[submoduleId][action] = false;
        }
      });
    });
  });
  
  return initializedPermissions;
};

/**
 * @desc    Get all managers with their module access settings
 * @route   GET /api/settings/managers
 * @access  Private/Admin
 */
const getAllManagersWithAccess = async (req, res) => {
  try {
    // Fetch both Managers and Admins (excluding the current Admin user)
    const managers = await User.find({ 
      $or: [
        { role: 'Manager' },
        { role: 'Admin' }
      ]
    }).select('-password');
    res.json(managers);
  } catch (error) {
    console.error(`Error fetching managers: ${error.message}`);
    res.status(500).json({ message: 'Server error while fetching managers' });
  }
};

/**
 * @desc    Update a manager's module access settings
 * @route   PUT /api/settings/managers/:id/module-access
 * @access  Private/Admin
 */
const updateManagerModuleAccess = async (req, res) => {
  try {
    const { moduleAccess, permissions } = req.body;
    const manager = await User.findById(req.params.id);

    // Check if manager exists
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found with provided ID' });
    }

    // Handle undefined or null role by setting default
    if (!manager.role) {
      manager.role = 'Manager'; // Set default role
    }

    // Check if manager has valid role
    if (manager.role !== 'Manager' && manager.role !== 'Admin') {
      return res.status(400).json({ message: `Invalid role for manager: ${manager.role}` });
    }

    // Update module access (old format - for backward compatibility)
    if (moduleAccess !== undefined) {
      manager.moduleAccess = moduleAccess || [];
    }

    // Update granular permissions (new format)
    if (permissions !== undefined) {
      // Ensure permissions is a proper object structure
      manager.permissions = initializePermissionStructure(permissions);
    }

    const updatedManager = await manager.save();

    res.json({
      _id: updatedManager._id,
      name: updatedManager.name,
      username: updatedManager.username,
      email: updatedManager.email,
      phone: updatedManager.phone,
      role: updatedManager.role,
      moduleAccess: updatedManager.moduleAccess,
      permissions: updatedManager.permissions,
    });
  } catch (error) {
    console.error(`Error updating manager module access: ${error.message}`);
    res.status(500).json({ message: 'Server error while updating manager module access' });
  }
};

/**
 * @desc    Get a manager's module access settings
 * @route   GET /api/settings/managers/:id/module-access
 * @access  Private/Admin
 */
const getManagerModuleAccess = async (req, res) => {
  try {
    const manager = await User.findById(req.params.id).select('moduleAccess role permissions clonedFrom');
    
    // Check if manager exists
    if (!manager) {
      return res.status(404).json({ message: 'Manager not found with provided ID' });
    }

    // Handle undefined or null role by setting default
    if (!manager.role) {
      manager.role = 'Manager'; // Set default role
    }

    // Check if manager has valid role
    if (manager.role !== 'Manager' && manager.role !== 'Admin') {
      return res.status(400).json({ message: `Invalid role for manager: ${manager.role}` });
    }

    // Ensure permissions is a proper object structure
    const permissions = initializePermissionStructure(manager.permissions || {});

    res.json({ 
      moduleAccess: manager.moduleAccess || [],
      permissions: permissions,
      clonedFrom: manager.clonedFrom
    });
  } catch (error) {
    console.error(`Error fetching manager module access: ${error.message}`);
    res.status(500).json({ message: 'Server error while fetching manager module access' });
  }
};

/**
 * @desc    Clone permissions from another manager
 * @route   POST /api/settings/managers/:id/clone-permissions
 * @access  Private/Admin
 */
const cloneManagerPermissions = async (req, res) => {
  try {
    const { sourceManagerId } = req.body;
    const targetManager = await User.findById(req.params.id);
    const sourceManager = await User.findById(sourceManagerId);

    // Check if target manager exists
    if (!targetManager) {
      return res.status(404).json({ message: 'Target manager not found with provided ID' });
    }

    // Check if source manager exists
    if (!sourceManager) {
      return res.status(404).json({ message: 'Source manager not found with provided ID' });
    }

    // Handle undefined or null role by setting default
    if (!targetManager.role) {
      targetManager.role = 'Manager'; // Set default role
    }

    // Check if target manager has valid role
    if (targetManager.role !== 'Manager' && targetManager.role !== 'Admin') {
      return res.status(400).json({ message: `Invalid role for target manager: ${targetManager.role}` });
    }

    // Handle undefined or null role for source manager
    if (!sourceManager.role) {
      sourceManager.role = 'Manager'; // Set default role
    }

    // Check if source manager has valid role
    if (sourceManager.role !== 'Manager' && sourceManager.role !== 'Admin') {
      return res.status(400).json({ message: `Invalid role for source manager: ${sourceManager.role}` });
    }

    // Clone permissions
    targetManager.permissions = initializePermissionStructure(sourceManager.permissions || {});
    targetManager.clonedFrom = sourceManagerId;

    const updatedManager = await targetManager.save();

    res.json({
      _id: updatedManager._id,
      name: updatedManager.name,
      username: updatedManager.username,
      email: updatedManager.email,
      phone: updatedManager.phone,
      role: updatedManager.role,
      permissions: updatedManager.permissions,
      clonedFrom: updatedManager.clonedFrom
    });
  } catch (error) {
    console.error(`Error cloning manager permissions: ${error.message}`);
    res.status(500).json({ message: 'Server error while cloning manager permissions' });
  }
};

// Export all the controller functions
module.exports = {
  getAllManagersWithAccess,
  updateManagerModuleAccess,
  getManagerModuleAccess,
  cloneManagerPermissions,
  initializePermissionStructure
};