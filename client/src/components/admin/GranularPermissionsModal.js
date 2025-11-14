import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FaTimes, FaLock, FaClone } from 'react-icons/fa';

// Define granular permissions structure
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

const GranularPermissionsModal = ({ 
  manager, 
  onClose, 
  onUpdatePermissions 
}) => {
  const [permissions, setPermissions] = useState({});
  const [cloningManager, setCloningManager] = useState('');
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    packing: true,
    stock: true,
    product: true
  });

  // Initialize permissions from manager data
  useEffect(() => {
    if (manager) {
      // Convert existing permissions to the new structure if needed
      const initialPermissions = manager.permissions || {};
      
      // Initialize any missing submodule structures and actions
      Object.values(permissionStructure).forEach(section => {
        Object.keys(section.submodules).forEach(submoduleId => {
          // Initialize submodule if it doesn't exist
          if (initialPermissions[submoduleId] === undefined) {
            initialPermissions[submoduleId] = {};
          }
          
          // Initialize all actions for the submodule if they don't exist
          section.submodules[submoduleId].actions.forEach(action => {
            if (initialPermissions[submoduleId][action] === undefined) {
              initialPermissions[submoduleId][action] = false;
            }
          });
        });
      });
      
      setPermissions(initialPermissions);
    }
  }, [manager]);

  // Fetch all managers for cloning feature
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const { data } = await api.get('/settings/managers');
        // Filter out the current manager and only include managers (not admins)
        const filteredManagers = data.filter(m => 
          m._id !== manager._id && m.role === 'Manager'
        );
        setManagers(filteredManagers);
      } catch (err) {
        console.error('Failed to fetch managers for cloning', err);
      }
    };

    if (manager) {
      fetchManagers();
    }
  }, [manager]);

  // Toggle section expansion
  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Check if all actions in a submodule are selected
  const areAllActionsSelected = (moduleId, actions) => {
    if (!permissions[moduleId]) return false;
    return actions.every(action => permissions[moduleId][action]);
  };

  // Check if some actions in a submodule are selected
  const areSomeActionsSelected = (moduleId, actions) => {
    if (!permissions[moduleId]) return false;
    return actions.some(action => permissions[moduleId][action]);
  };

  // Check if a submodule is visible (has at least one action or is explicitly selected)
  const isSubmoduleVisible = (moduleId) => {
    if (!permissions[moduleId]) return false;
    // Check if any action is selected or if the submodule itself is marked as visible
    return Object.values(permissions[moduleId]).some(value => value === true);
  };

  // Handle submodule toggle (select/deselect all actions)
  const handleSubmoduleToggle = (moduleId, actions) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      
      // Check if all actions are currently selected
      const allSelected = areAllActionsSelected(moduleId, actions);
      
      if (!newPermissions[moduleId]) {
        newPermissions[moduleId] = {};
      }
      
      // If all are selected, deselect all; otherwise, select all
      actions.forEach(action => {
        newPermissions[moduleId][action] = !allSelected;
      });
      
      return newPermissions;
    });
  };

  // Handle individual action toggle
  const handleActionToggle = (moduleId, action) => {
    setPermissions(prev => {
      const newPermissions = { ...prev };
      
      if (!newPermissions[moduleId]) {
        newPermissions[moduleId] = {};
      }
      
      newPermissions[moduleId][action] = !newPermissions[moduleId][action];
      
      return newPermissions;
    });
  };

  // Check if all submodules in a section are fully selected
  const areAllSubmodulesSelected = (sectionId) => {
    const section = permissionStructure[sectionId];
    if (!section) return false;
    
    return Object.keys(section.submodules).every(submoduleId => {
      const submodule = section.submodules[submoduleId];
      return areAllActionsSelected(submoduleId, submodule.actions);
    });
  };

  // Check if some submodules in a section are selected
  const areSomeSubmodulesSelected = (sectionId) => {
    const section = permissionStructure[sectionId];
    if (!section) return false;
    
    return Object.keys(section.submodules).some(submoduleId => {
      const submodule = section.submodules[submoduleId];
      return areSomeActionsSelected(submoduleId, submodule.actions);
    });
  };

  // Handle section toggle (select/deselect all submodules and actions)
  const handleSectionToggle = (sectionId) => {
    const section = permissionStructure[sectionId];
    if (!section) return;
    
    setPermissions(prev => {
      const newPermissions = { ...prev };
      const allSelected = areAllSubmodulesSelected(sectionId);
      
      Object.keys(section.submodules).forEach(submoduleId => {
        const submodule = section.submodules[submoduleId];
        
        if (!newPermissions[submoduleId]) {
          newPermissions[submoduleId] = {};
        }
        
        // Select/deselect all actions for each submodule
        submodule.actions.forEach(action => {
          newPermissions[submoduleId][action] = !allSelected;
        });
      });
      
      return newPermissions;
    });
  };

  // Handle "Select All Modules" toggle
  const handleSelectAllToggle = () => {
    const allCurrentlySelected = Object.keys(permissionStructure).every(sectionId => 
      areAllSubmodulesSelected(sectionId)
    );
    
    setPermissions(prev => {
      const newPermissions = { ...prev };
      
      Object.values(permissionStructure).forEach(section => {
        Object.keys(section.submodules).forEach(submoduleId => {
          const submodule = section.submodules[submoduleId];
          
          if (!newPermissions[submoduleId]) {
            newPermissions[submoduleId] = {};
          }
          
          // Select/deselect all actions for each submodule
          submodule.actions.forEach(action => {
            newPermissions[submoduleId][action] = !allCurrentlySelected;
          });
        });
      });
      
      return newPermissions;
    });
  };

  // Check if all modules are selected
  const areAllModulesSelected = () => {
    return Object.keys(permissionStructure).every(sectionId => 
      areAllSubmodulesSelected(sectionId)
    );
  };

  // Check if some modules are selected
  const areSomeModulesSelected = () => {
    return Object.keys(permissionStructure).some(sectionId => 
      areSomeSubmodulesSelected(sectionId)
    );
  };

  // Handle clone permissions
  const handleClonePermissions = async () => {
    if (!cloningManager) {
      setError('Please select a manager to clone permissions from');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const response = await api.post(
        `/settings/managers/${manager._id}/clone-permissions`,
        { sourceManagerId: cloningManager }
      );
      
      // Update local permissions state
      setPermissions(response.data.permissions || {});
      setSuccess('Permissions cloned successfully!');
      
      // Clear selection after cloning
      setCloningManager('');
      
      // Call parent callback if provided
      if (onUpdatePermissions) {
        onUpdatePermissions(response.data);
      }
    } catch (err) {
      console.error('Failed to clone permissions', err);
      setError(err.response?.data?.message || 'Failed to clone permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle save permissions
  const handleSavePermissions = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      const response = await api.put(
        `/settings/managers/${manager._id}/module-access`,
        { permissions }
      );
      
      setSuccess('Permissions updated successfully!');
      
      // Call parent callback if provided
      if (onUpdatePermissions) {
        onUpdatePermissions(response.data);
      }
    } catch (err) {
      console.error('Failed to update permissions', err);
      setError(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // Get action label by action key
  const getActionLabel = (action) => {
    const actionLabels = {
      'view': 'View',
      'edit': 'Edit',
      'add': 'Add',
      'delete': 'Delete',
      'view-report': 'View Report',
      'record-usage': 'Record Usage',
      'add-stock': 'Add Stock',
      'create-po': 'Create PO',
      'cancel-po': 'Cancel PO',
      'create-grn': 'Create GRN',
      'new-invoice': 'New Invoice',
      'view-invoice': 'View Invoice',
      'send-material': 'Send Material'
    };
    
    return actionLabels[action] || action;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-dark-700">
              Granular Permissions for {manager.name}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes size={24} />
            </button>
          </div>
          
          {error && <p className="text-red-500 mb-4">{error}</p>}
          {success && <p className="text-green-500 mb-4">{success}</p>}
          
          {/* Clone Permissions Section */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-medium text-blue-800 mb-3 flex items-center">
              <FaClone className="mr-2" />
              Clone Permissions
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={cloningManager}
                onChange={(e) => setCloningManager(e.target.value)}
                className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a manager to clone permissions from</option>
                {managers.map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.username})
                  </option>
                ))}
              </select>
              <button
                onClick={handleClonePermissions}
                disabled={isLoading || !cloningManager}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 flex items-center justify-center"
              >
                {isLoading ? 'Cloning...' : 'Clone Permissions'}
              </button>
            </div>
          </div>
          
          {/* Select All Modules */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="select-all-modules"
                checked={areAllModulesSelected()}
                ref={ref => {
                  if (ref) {
                    ref.indeterminate = areSomeModulesSelected() && !areAllModulesSelected();
                  }
                }}
                onChange={handleSelectAllToggle}
                className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="select-all-modules" className="ml-2 text-lg font-medium text-gray-800">
                Select All Modules
              </label>
            </div>
          </div>
          
          {/* Permissions Sections */}
          <div className="space-y-4">
            {Object.entries(permissionStructure).map(([sectionId, section]) => {
              const isExpanded = expandedSections[sectionId];
              const allSelected = areAllSubmodulesSelected(sectionId);
              const someSelected = areSomeSubmodulesSelected(sectionId);
              
              return (
                <div key={sectionId} className="border border-gray-200 rounded-lg">
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(sectionId)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-t-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-800">{section.name}</span>
                    </div>
                    <div className="flex items-center">
                      {/* Section Select All Checkbox */}
                      <div className="relative flex items-center mr-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={ref => {
                            if (ref) {
                              ref.indeterminate = someSelected && !allSelected;
                            }
                          }}
                          onChange={() => handleSectionToggle(sectionId)}
                          className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </div>
                      <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </button>
                  
                  {/* Section Content */}
                  {isExpanded && (
                    <div className="p-4 bg-white border-t border-gray-200">
                      <div className="space-y-4">
                        {Object.entries(section.submodules).map(([submoduleId, submodule]) => {
                          const allActionsSelected = areAllActionsSelected(submoduleId, submodule.actions);
                          const someActionsSelected = areSomeActionsSelected(submoduleId, submodule.actions);
                          
                          return (
                            <div key={submoduleId} className="border border-gray-100 rounded-md p-3">
                              {/* Submodule Header */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-700">{submodule.name}</span>
                                <div className="relative flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={allActionsSelected}
                                    ref={ref => {
                                      if (ref) {
                                        ref.indeterminate = someActionsSelected && !allActionsSelected;
                                      }
                                    }}
                                    onChange={() => handleSubmoduleToggle(submoduleId, submodule.actions)}
                                    className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                                  />
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {submodule.actions.map(action => (
                                  <div key={action} className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`${submoduleId}-${action}`}
                                      checked={permissions[submoduleId]?.[action] || false}
                                      onChange={() => handleActionToggle(submoduleId, action)}
                                      className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                                    />
                                    <label 
                                      htmlFor={`${submoduleId}-${action}`} 
                                      className="ml-2 text-sm text-gray-600 whitespace-nowrap"
                                    >
                                      {getActionLabel(action)}
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePermissions}
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GranularPermissionsModal;