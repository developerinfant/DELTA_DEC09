import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import { 
  FaBoxOpen, 
  FaWarehouse, 
  FaBox, 
  FaTimes, 
  FaUserLock, 
  FaSearch,
  FaCog,
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaUser,
  FaShieldAlt,
  FaSave,
  FaSpinner
} from 'react-icons/fa';
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


// ============================================================
// CUSTOM CHECKBOX COMPONENT
// ============================================================
const CustomCheckbox = ({ checked, indeterminate, onChange, disabled, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className="relative inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        ref={ref => {
          if (ref) {
            ref.indeterminate = indeterminate;
          }
        }}
        onChange={onChange}
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          text-primary-600 
          bg-white
          border-2 border-gray-300
          rounded 
          focus:ring-2 focus:ring-primary-500 focus:ring-offset-1
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          transition-all duration-200
          checked:bg-primary-500 checked:border-primary-500
          hover:border-primary-400
        `}
      />
    </div>
  );
};


// ============================================================
// ACTION BADGE COMPONENT
// ============================================================
const ActionBadge = ({ action, checked, onChange, disabled }) => {
  const formatAction = (action) => {
    return action.charAt(0).toUpperCase() + action.slice(1).replace(/-/g, ' ');
  };

  return (
    <label 
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
        border transition-all duration-200 cursor-pointer select-none
        ${checked 
          ? 'bg-primary-50 border-primary-200 text-primary-700' 
          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-sm'}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <span className={`
        w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200
        ${checked 
          ? 'bg-primary-500 border-primary-500' 
          : 'bg-white border-gray-300'
        }
      `}>
        {checked && <FaCheck className="text-white text-[10px]" />}
      </span>
      <span>{formatAction(action)}</span>
    </label>
  );
};


// ============================================================
// MANAGER CARD COMPONENT
// ============================================================
const ManagerCard = ({ manager, isSelected, onClick }) => {
  const hasPermissions = manager.permissions && Object.keys(manager.permissions).length > 0;
  
  return (
    <div 
      onClick={onClick}
      className={`
        relative p-4 rounded-xl cursor-pointer
        transition-all duration-300 ease-out
        border-2
        ${isSelected 
          ? 'bg-primary-50 border-primary-500 shadow-md shadow-primary-100' 
          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
            <FaCheck className="text-white text-xs" />
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${isSelected ? 'bg-primary-500' : 'bg-gray-100'}
          transition-colors duration-300
        `}>
          <FaUser className={`text-lg ${isSelected ? 'text-white' : 'text-gray-500'}`} />
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${isSelected ? 'text-primary-700' : 'text-gray-800'}`}>
              {manager.name}
            </h3>
            {hasPermissions && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                <FaShieldAlt className="text-[10px]" />
                Configured
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 truncate mt-0.5">
            @{manager.username}
          </p>
        </div>
      </div>
    </div>
  );
};


// ============================================================
// SECTION ACCORDION COMPONENT
// ============================================================
const SectionAccordion = ({ 
  sectionId, 
  section, 
  isExpanded, 
  onToggle, 
  allSelected, 
  someSelected, 
  onSectionToggle, 
  children, 
  disabled 
}) => {
  const IconComponent = section.icon;
  
  return (
    <div className={`
      border border-gray-200 rounded-xl overflow-hidden
      transition-all duration-300
      ${isExpanded ? 'shadow-sm' : ''}
    `}>
      {/* Header */}
      <div 
        className={`
          flex items-center justify-between p-4 
          bg-gray-50 hover:bg-gray-100
          transition-colors duration-200 cursor-pointer
          ${isExpanded ? 'border-b border-gray-200' : ''}
        `}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <IconComponent className="text-primary-600 text-lg" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-800">{section.name}</h4>
            <p className="text-xs text-gray-500">
              {Object.keys(section.submodules).length} submodules
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Section checkbox */}
          <div 
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm text-gray-600">Select All</span>
            <CustomCheckbox
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={onSectionToggle}
              disabled={disabled}
            />
          </div>
          
          {/* Expand icon */}
          <div className={`
            w-8 h-8 rounded-lg bg-white border border-gray-200
            flex items-center justify-center
            transition-transform duration-300
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            <FaChevronDown className="text-gray-500 text-sm" />
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className={`
        transition-all duration-300 ease-out
        ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}
      `}>
        <div className="p-4 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
};


// ============================================================
// SUBMODULE ROW COMPONENT
// ============================================================
const SubmoduleRow = ({ 
  submoduleId, 
  submodule, 
  permissions, 
  onSubmoduleToggle, 
  onActionToggle, 
  disabled 
}) => {
  const allActionsSelected = submodule.actions.every(action => permissions[submoduleId]?.[action]);
  const someActionsSelected = submodule.actions.some(action => permissions[submoduleId]?.[action]);
  
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-4">
        {/* Submodule checkbox and name */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <CustomCheckbox
            checked={allActionsSelected}
            indeterminate={someActionsSelected && !allActionsSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSubmoduleToggle(submoduleId, submodule.actions);
            }}
            disabled={disabled}
            size="sm"
          />
          <span className="font-medium text-gray-800">{submodule.name}</span>
        </div>
        
        {/* Actions */}
        <div className="flex-1 flex flex-wrap gap-2">
          {submodule.actions.map(action => (
            <ActionBadge
              key={`${submoduleId}-${action}`}
              action={action}
              checked={permissions[submoduleId]?.[action] || false}
              onChange={(e) => {
                e.stopPropagation();
                onActionToggle(submoduleId, action);
              }}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
};


// ============================================================
// LOADING OVERLAY COMPONENT
// ============================================================
const LoadingOverlay = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-gray-200"></div>
      <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">{message}</p>
  </div>
);


// ============================================================
// EMPTY STATE COMPONENT
// ============================================================
const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
      <Icon className="text-2xl text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
    <p className="text-sm text-gray-500 max-w-sm">{description}</p>
  </div>
);


// ============================================================
// MAIN SETTINGS COMPONENT
// ============================================================
const Settings = () => {
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState(null);
  const [moduleAccess, setModuleAccess] = useState([]);
  const [permissions, setPermissions] = useState({});
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


  // Check if all modules are selected
  const areAllModulesSelected = () => {
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


  // Handle individual action toggle
  const handleActionToggle = (submoduleId, action) => {
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev));
      
      if (!newPermissions[submoduleId]) {
        newPermissions[submoduleId] = {};
      }
      
      newPermissions[submoduleId][action] = !newPermissions[submoduleId][action];
      
      return newPermissions;
    });
  };


  // Handle submodule toggle
  const handleSubmoduleToggle = (submoduleId, actions) => {
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev));
      const allSelected = areAllActionsSelected(submoduleId, actions);
      
      if (!newPermissions[submoduleId]) {
        newPermissions[submoduleId] = {};
      }
      
      actions.forEach(action => {
        newPermissions[submoduleId][action] = !allSelected;
      });
      
      return newPermissions;
    });
  };


  // Handle section toggle
  const handleSectionToggle = (sectionId) => {
    const section = permissionStructure[sectionId];
    if (!section) return;
    
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev));
      const allSelected = areAllSubmodulesSelected(sectionId);
      
      Object.keys(section.submodules).forEach(submoduleId => {
        const submodule = section.submodules[submoduleId];
        
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


  // Handle "Select All" toggle
  const handleSelectAllToggle = () => {
    const allCurrentlySelected = areAllModulesSelected();
    
    setPermissions(prev => {
      const newPermissions = JSON.parse(JSON.stringify(prev));
      
      Object.values(permissionStructure).forEach(section => {
        Object.keys(section.submodules).forEach(submoduleId => {
          const submodule = section.submodules[submoduleId];
          
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
    if (!managerId) {
      setError('Invalid manager ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data } = await api.get(`/settings/managers/${managerId}/module-access`);
      
      const fetchedPermissions = data.permissions || {};
      
      Object.values(permissionStructure).forEach(section => {
        Object.keys(section.submodules).forEach(submoduleId => {
          if (fetchedPermissions[submoduleId] === undefined) {
            fetchedPermissions[submoduleId] = {};
          }
          
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


  // Handle manager selection
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
      
      setManagers(prev => prev.map(m => 
        m._id === selectedManager._id 
          ? { ...m, ...response.data } 
          : m
      ));
      
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <FaCog className="text-primary-600 text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Settings
              </h1>
              <p className="text-sm text-gray-500">
                Manage user permissions and module access
              </p>
            </div>
          </div>
        </div>
        
        {/* Managers Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Managers</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select a manager to configure their module access permissions
              </p>
            </div>
            <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
              {managers.length} {managers.length === 1 ? 'Manager' : 'Managers'}
            </span>
          </div>
          
          {managers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {managers.map(manager => (
                <ManagerCard
                  key={manager._id}
                  manager={manager}
                  isSelected={selectedManager?._id === manager._id}
                  onClick={() => handleManagerSelect(manager)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FaUser}
              title="No Managers Found"
              description="There are no managers configured in the system yet."
            />
          )}
        </div>
      </div>


      {/* Module Access Modal */}
      {selectedManager && (
        <div 
          className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 flex justify-center items-center modal-backdrop animate-fadeIn p-4"
          style={{ backdropFilter: 'blur(6px)', zIndex: 999 }}
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{ zIndex: 1000 }}
          >
            {/* Modal Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <FaShieldAlt className="text-primary-600 text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">
                      Module Access
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Configure permissions for <span className="font-medium text-primary-600">{selectedManager.name}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeModal}
                  className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <FaTimes size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}
              {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <FaCheck className="text-green-600 text-sm" />
                  </div>
                  <p className="text-sm text-green-700 font-medium">{success}</p>
                </div>
              )}
              
              {/* Loading State */}
              {isLoading && <LoadingOverlay message="Loading permissions..." />}
              
              {!isLoading && (
                <>
                  {/* Search & Select All Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search submodules..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    
                    {/* Select All */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <CustomCheckbox
                        checked={areAllModulesSelected()}
                        indeterminate={areSomeModulesSelected() && !areAllModulesSelected()}
                        onChange={handleSelectAllToggle}
                        disabled={isLoading}
                      />
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Select All Modules
                      </span>
                    </div>
                  </div>
                  
                  {/* Permissions Sections */}
                  <div className="space-y-4">
                    {Object.entries(permissionStructure).map(([sectionId, section]) => {
                      const filteredSubmodules = getFilteredSubmodules(sectionId);
                      
                      // Skip section if no submodules match search
                      if (searchTerm && Object.keys(filteredSubmodules).length === 0) {
                        return null;
                      }
                      
                      return (
                        <SectionAccordion
                          key={sectionId}
                          sectionId={sectionId}
                          section={section}
                          isExpanded={expandedSections[sectionId]}
                          onToggle={() => toggleSection(sectionId)}
                          allSelected={areAllSubmodulesSelected(sectionId)}
                          someSelected={areSomeSubmodulesSelected(sectionId)}
                          onSectionToggle={() => handleSectionToggle(sectionId)}
                          disabled={isLoading}
                        >
                          {Object.entries(filteredSubmodules).map(([submoduleId, submodule]) => (
                            <SubmoduleRow
                              key={submoduleId}
                              submoduleId={submoduleId}
                              submodule={submodule}
                              permissions={permissions}
                              onSubmoduleToggle={handleSubmoduleToggle}
                              onActionToggle={handleActionToggle}
                              disabled={isLoading}
                            />
                          ))}
                        </SectionAccordion>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={closeModal}
                  disabled={isLoading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSettings}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-xl hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave />
                      <span>Save Changes</span>
                    </>
                  )}
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
