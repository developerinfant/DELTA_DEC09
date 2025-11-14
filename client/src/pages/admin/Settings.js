import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaBoxOpen, FaWarehouse, FaBox, FaTimes, FaUserLock, FaSearch } from 'react-icons/fa';
import AccessDisabledModal from '../../components/common/AccessDisabledModal';
import useAccessDisabled from '../../hooks/useAccessDisabled';

// Define granular permissions structure
const permissionStructure = {
  packing: {
    name: 'Packing Materials',
    icon: FaBoxOpen,
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
    icon: FaWarehouse,
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
    icon: FaBox,
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

const Settings = () => {
    const [managers, setManagers] = useState([]);
    const [selectedManager, setSelectedManager] = useState(null);
    const [moduleAccess, setModuleAccess] = useState([]); // For backward compatibility
    const [permissions, setPermissions] = useState({}); // For granular permissions
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        packing: true,
        stock: true,
        product: true
    });
    const [searchTerm, setSearchTerm] = useState('');
    const { isAccessDisabledOpen, accessDisabledMessage, hideAccessDisabled } = useAccessDisabled();

    // Check if all actions in a submodule are selected
    const areAllActionsSelected = (submoduleId, actions) => {
        if (!permissions[submoduleId]) return false;
        return actions.every(action => permissions[submoduleId][action]);
    };

    // Check if some actions in a submodule are selected
    const areSomeActionsSelected = (submoduleId, actions) => {
        if (!permissions[submoduleId]) return false;
        return actions.some(action => permissions[submoduleId][action]);
    };

    // Check if all submodules in a section are fully selected
    const areAllSubmodulesSelected = (sectionId) => {
        const section = permissionStructure[sectionId];
        if (!section) return false;
        
        // Check if all submodules have all actions selected
        return Object.keys(section.submodules).every(submoduleId => {
            const submodule = section.submodules[submoduleId];
            return areAllActionsSelected(submoduleId, submodule.actions);
        });
    };

    // Check if some submodules in a section are selected
    const areSomeSubmodulesSelected = (sectionId) => {
        const section = permissionStructure[sectionId];
        if (!section) return false;
        
        // Check if any submodule has any action selected
        return Object.keys(section.submodules).some(submoduleId => {
            const submodule = section.submodules[submoduleId];
            return areSomeActionsSelected(submoduleId, submodule.actions);
        });
    };

    // Check if all modules are selected (for backward compatibility and granular permissions)
    const areAllModulesSelected = () => {
        // For granular permissions, check if all actions are enabled
        return Object.keys(permissionStructure).every(sectionId => {
            return areAllSubmodulesSelected(sectionId);
        });
    };

    // Check if some modules are selected
    const areSomeModulesSelected = () => {
        return Object.keys(permissionStructure).some(sectionId => {
            return areSomeSubmodulesSelected(sectionId);
        });
    };

    // Handle individual action toggle with parent state update
    const handleActionToggle = (submoduleId, action) => {
        setPermissions(prev => {
            // Create a deep copy of the permissions object
            const newPermissions = JSON.parse(JSON.stringify(prev));
            
            // Initialize submodule if it doesn't exist
            if (!newPermissions[submoduleId]) {
                newPermissions[submoduleId] = {};
            }
            
            // Toggle the specific action
            newPermissions[submoduleId][action] = !newPermissions[submoduleId][action];
            
            return newPermissions;
        });
    };

    // Handle submodule toggle (select/deselect all actions)
    const handleSubmoduleToggle = (submoduleId, actions) => {
        setPermissions(prev => {
            // Create a deep copy of the permissions object
            const newPermissions = JSON.parse(JSON.stringify(prev));
            
            // Check if all actions are currently selected
            const allSelected = areAllActionsSelected(submoduleId, actions);
            
            // Initialize submodule if it doesn't exist
            if (!newPermissions[submoduleId]) {
                newPermissions[submoduleId] = {};
            }
            
            // If all are selected, deselect all; otherwise, select all
            actions.forEach(action => {
                newPermissions[submoduleId][action] = !allSelected;
            });
            
            return newPermissions;
        });
    };

    // Handle section toggle (select/deselect all submodules)
    const handleSectionToggle = (sectionId) => {
        const section = permissionStructure[sectionId];
        if (!section) return;
        
        setPermissions(prev => {
            // Create a deep copy of the permissions object
            const newPermissions = JSON.parse(JSON.stringify(prev));
            const allSelected = areAllSubmodulesSelected(sectionId);
            
            Object.keys(section.submodules).forEach(submoduleId => {
                const submodule = section.submodules[submoduleId];
                
                // Initialize submodule if it doesn't exist
                if (!newPermissions[submoduleId]) {
                    newPermissions[submoduleId] = {};
                }
                
                submodule.actions.forEach(action => {
                    newPermissions[submoduleId][action] = !allSelected;
                });
            });
            
            return newPermissions;
        });
    };

    // Handle "Select All" toggle (for granular permissions)
    const handleSelectAllToggle = () => {
        const allCurrentlySelected = areAllModulesSelected();
        
        setPermissions(prev => {
            // Create a deep copy of the permissions object
            const newPermissions = JSON.parse(JSON.stringify(prev));
            
            // Set all permissions to the opposite of current state
            Object.values(permissionStructure).forEach(section => {
                Object.keys(section.submodules).forEach(submoduleId => {
                    const submodule = section.submodules[submoduleId];
                    
                    // Initialize submodule if it doesn't exist
                    if (!newPermissions[submoduleId]) {
                        newPermissions[submoduleId] = {};
                    }
                    
                    submodule.actions.forEach(action => {
                        newPermissions[submoduleId][action] = !allCurrentlySelected;
                    });
                });
            });
            
            return newPermissions;
        });
    };

    // Fetch all managers
    const fetchManagers = async () => {
        try {
            const { data } = await api.get('/settings/managers');
            setManagers(data);
        } catch (err) {
            console.error("Failed to fetch managers", err);
            setError('Failed to fetch managers');
        }
    };

    // Fetch module access for a selected manager
    const fetchManagerModuleAccess = async (managerId) => {
        // Validate managerId
        if (!managerId) {
            setError('Invalid manager ID');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const { data } = await api.get(`/settings/managers/${managerId}/module-access`);
            
            // Ensure permissions is properly structured
            const fetchedPermissions = data.permissions || {};
            
            // Initialize any missing submodule structures and actions
            Object.values(permissionStructure).forEach(section => {
                Object.keys(section.submodules).forEach(submoduleId => {
                    // Initialize submodule if it doesn't exist
                    if (fetchedPermissions[submoduleId] === undefined) {
                        fetchedPermissions[submoduleId] = {};
                    }
                    
                    // Initialize all actions for the submodule if they don't exist
                    section.submodules[submoduleId].actions.forEach(action => {
                        if (fetchedPermissions[submoduleId][action] === undefined) {
                          fetchedPermissions[submoduleId][action] = false;
                        }
                    });
                });
            });
            
            setModuleAccess(data.moduleAccess || []);
            setPermissions(fetchedPermissions);
        } catch (err) {
            console.error("Failed to fetch manager module access", err);
            setError('Failed to fetch manager module access: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // Handle manager selection - open modal
    const handleManagerSelect = (manager) => {
        setSelectedManager(manager);
        setError('');
        setSuccess('');
        fetchManagerModuleAccess(manager._id);
    };

    // Close modal
    const closeModal = () => {
        setSelectedManager(null);
        setModuleAccess([]);
        setPermissions({});
        setError('');
        setSuccess('');
    };

    // Toggle section expansion
    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    // Update module access settings
    const handleUpdateSettings = async () => {
        if (!selectedManager) return;

        try {
            setIsLoading(true);
            const response = await api.put(`/settings/managers/${selectedManager._id}/module-access`, { 
                moduleAccess,
                permissions 
            });
            setSuccess('Module access settings updated successfully!');
            
            // Update the manager in the list with new module access
            setManagers(prev => prev.map(m => 
                m._id === selectedManager._id 
                    ? { ...m, ...response.data } 
                    : m
            ));
            
            // Also update the selected manager to ensure it has the latest data
            setSelectedManager(prev => ({
                ...prev,
                ...response.data
            }));
        } catch (err) {
            console.error("Failed to update module access", err);
            setError('Failed to update module access settings: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    // Filter submodules based on search term
    const getFilteredSubmodules = (sectionId) => {
        const section = permissionStructure[sectionId];
        if (!section) return {};
        
        if (!searchTerm) return section.submodules;
        
        const filtered = {};
        Object.keys(section.submodules).forEach(submoduleId => {
            const submodule = section.submodules[submoduleId];
            if (submodule.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                filtered[submoduleId] = submodule;
            }
        });
        
        return filtered;
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-dark-700 mb-6">
                Managers & Module Access
            </h1>
            
            <div className="grid grid-cols-1 gap-6">
                {/* Managers List */}
                <Card>
                    <h2 className="text-xl font-semibold mb-4">Managers</h2>
                    <div className="space-y-2">
                        {managers.map(manager => (
                            <div 
                                key={manager._id}
                                className={`p-3 rounded-lg cursor-pointer transition-all ${
                                    selectedManager?._id === manager._id 
                                        ? 'bg-primary-100 border-l-4 border-primary-500' 
                                        : 'hover:bg-light-200'
                                }`}
                                onClick={() => handleManagerSelect(manager)}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{manager.name}</p>
                                        <p className="text-sm text-gray-600">{manager.username}</p>
                                    </div>
                                    {manager.permissions && Object.keys(manager.permissions).length > 0 && (
                                        <FaUserLock className="text-gray-400" title="Granular permissions enabled" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Module Access Modal */}
            {selectedManager && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-bold text-dark-700">
                                    Module Access for {selectedManager.name}
                                </h2>
                                <button 
                                    onClick={closeModal}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={24} />
                                </button>
                            </div>
                            
                            {error && <p className="text-red-500 mb-4">{error}</p>}
                            {success && <p className="text-green-500 mb-4">{success}</p>}
                            
                            {/* Loading indicator */}
                            {isLoading && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-center">
                                    <p>Loading permissions...</p>
                                </div>
                            )}
                            
                            {/* Search Bar */}
                            <div className="mb-4 flex justify-between items-center">
                                <div className="relative w-1/3">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaSearch className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search submodules..."
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>
                            
                            {/* Select All Option */}
                            {!isLoading && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="select-all"
                                            checked={areAllModulesSelected()}
                                            ref={ref => {
                                                if (ref) {
                                                    ref.indeterminate = areSomeModulesSelected() && !areAllModulesSelected();
                                                }
                                            }}
                                            onChange={handleSelectAllToggle}
                                            className="h-5 w-5 text-primary-600 rounded focus:ring-primary-500"
                                            disabled={isLoading}
                                        />
                                        <label htmlFor="select-all" className="ml-2 text-lg font-medium text-gray-800">
                                            Select All Modules
                                        </label>
                                    </div>
                                </div>
                            )}
                            
                            {!isLoading && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-medium text-gray-800 mb-4">Granular Permissions</h3>
                                    <div className="space-y-4">
                                        {Object.entries(permissionStructure).map(([sectionId, section]) => {
                                            const IconComponent = section.icon;
                                            const allSelected = areAllSubmodulesSelected(sectionId);
                                            const someSelected = areSomeSubmodulesSelected(sectionId);
                                            const filteredSubmodules = getFilteredSubmodules(sectionId);
                                            const isExpanded = expandedSections[sectionId];
                                            
                                            // Skip section if no submodules match search
                                            if (searchTerm && Object.keys(filteredSubmodules).length === 0) {
                                                return null;
                                            }
                                            
                                            return (
                                                <div key={sectionId} className="border border-gray-200 rounded-lg">
                                                    <button
                                                        onClick={() => toggleSection(sectionId)}
                                                        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-t-lg hover:bg-gray-100 transition-colors"
                                                        disabled={isLoading}
                                                    >
                                                        <div className="flex items-center">
                                                            <IconComponent className="text-primary-500 mr-3" />
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
                                                                    disabled={isLoading}
                                                                />
                                                            </div>
                                                            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                                                                ▼
                                                            </span>
                                                        </div>
                                                    </button>
                                                    
                                                    {isExpanded && (
                                                        <div className="p-4 bg-white border-t border-gray-200">
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full divide-y divide-gray-200">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submodule Name</th>
                                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                                        {Object.entries(filteredSubmodules).map(([submoduleId, submodule]) => {
                                                                            const allActionsSelected = areAllActionsSelected(submoduleId, submodule.actions);
                                                                            const someActionsSelected = areSomeActionsSelected(submoduleId, submodule.actions);
                                                                            
                                                                            return (
                                                                                <tr key={submoduleId} className="hover:bg-gray-50">
                                                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                                                        <div className="flex items-center">
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={allActionsSelected}
                                                                                                ref={ref => {
                                                                                                    if (ref) {
                                                                                                        ref.indeterminate = someActionsSelected && !allActionsSelected;
                                                                                                    }
                                                                                                }}
                                                                                                onChange={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleSubmoduleToggle(submoduleId, submodule.actions);
                                                                                                }}
                                                                                                className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500 mr-3"
                                                                                                disabled={isLoading}
                                                                                            />
                                                                                            <span className="text-sm font-medium text-gray-900">{submodule.name}</span>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-4 py-3">
                                                                                        <div className="flex flex-wrap gap-3">
                                                                                            {submodule.actions.map(action => (
                                                                                                <div key={`${submoduleId}-${action}`} className="flex items-center">
                                                                                                    <input
                                                                                                        type="checkbox"
                                                                                                        id={`${submoduleId}-${action}`}
                                                                                                        checked={permissions[submoduleId]?.[action] || false}
                                                                                                        onChange={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleActionToggle(submoduleId, action);
                                                                                                        }}
                                                                                                        className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                                                                                                        disabled={isLoading}
                                                                                                    />
                                                                                                    <label 
                                                                                                        htmlFor={`${submoduleId}-${action}`} 
                                                                                                        className="ml-2 text-sm text-gray-700 whitespace-nowrap"
                                                                                                    >
                                                                                                        {action.charAt(0).toUpperCase() + action.slice(1).replace(/-/g, ' ')}
                                                                                                    </label>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex justify-end space-x-3">
                                <button
                                    onClick={closeModal}
                                    className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateSettings}
                                    disabled={isLoading}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300"
                                >
                                    {isLoading ? 'Saving...' : 'Update Settings'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Access Disabled Modal */}
            <AccessDisabledModal 
                isOpen={isAccessDisabledOpen}
                onClose={hideAccessDisabled}
                message={accessDisabledMessage}
            />
        </div>
    );
};

export default Settings;