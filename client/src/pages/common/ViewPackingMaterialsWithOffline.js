import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiWithOfflineSupport from '../../utils/apiWithOfflineSupport';
import MaterialForm from '../../components/packing/MaterialForm';
import MaterialsTable from '../../components/packing/MaterialsTable';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import { FaSpinner, FaSearch, FaWifi, FaExclamationTriangle, FaEdit, FaTrash, FaPlus, FaFileImport, FaFileExport } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import AccessDisabledModal from '../../components/common/AccessDisabledModal';
import useAccessDisabled from '../../hooks/useAccessDisabled';
import useAccessControl from '../../hooks/useAccessControl';
import usePWA from '../../hooks/usePWA';
import CreateProductMappingModal from '../../components/packing/CreateProductMappingModal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';

// Create a context for refreshing materials
export const MaterialsRefreshContext = React.createContext({
  refreshMaterials: () => Promise.resolve()
});

// Helper function to detect unit from material name
const detectUnitFromName = (name) => {
  if (!name) return 'pcs';
  
  // Common unit patterns
  const unitPatterns = [
    { pattern: /\d+\s*(mm)/i, unit: 'mm' },
    { pattern: /\d+\s*(cm)/i, unit: 'cm' },
    { pattern: /\d+\s*(meter|m)/i, unit: 'm' },
    { pattern: /\d+\s*(kg|kilogram)/i, unit: 'kg' },
    { pattern: /\d+\s*(gm|gms|gram)/i, unit: 'gms' },
    { pattern: /\d+\s*(mg)/i, unit: 'mg' },
    { pattern: /\d+\s*(litre|liter|ltr)/i, unit: 'ltr' },
    { pattern: /\d+\s*(ml)/i, unit: 'ml' },
    { pattern: /\d+\s*(pcs|pieces|piece|nos)/i, unit: 'pcs' },
    { pattern: /\d+\s*(box|boxes)/i, unit: 'box' },
    { pattern: /\d+\s*(roll|rolls)/i, unit: 'roll' },
    { pattern: /\d+\s*(pkt|packets)/i, unit: 'pkt' },
    { pattern: /\d+\s*(set|sets)/i, unit: 'set' },
    { pattern: /\d+\s*(bundle|bundles)/i, unit: 'bundle' }
  ];
  
  for (const { pattern, unit } of unitPatterns) {
    if (pattern.test(name)) {
      return unit;
    }
  }
  
  return 'pcs'; // Default unit
};

const ViewPackingMaterialsWithOffline = () => {
    const { user } = useAuth();
    const { isOnline } = usePWA();
    const { isAccessDisabledOpen, accessDisabledMessage, showAccessDisabled, hideAccessDisabled } = useAccessDisabled();
    const { checkPermission, withAccessControl } = useAccessControl();
    const [searchParams, setSearchParams] = useSearchParams(); // Add this line
    
    // Data states
    const [materials, setMaterials] = useState([]);
    const [productMappings, setProductMappings] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [brandType, setBrandType] = useState('own'); // 'own' or 'other'

    // UI/State management states
    const [isLoading, setIsLoading] = useState(true);
    const [isMappingsLoading, setIsMappingsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [isProductMappingModalOpen, setIsProductMappingModalOpen] = useState(false);
    const [editingProductMapping, setEditingProductMapping] = useState(null);
    
    // Import/Export states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    
    // Duplicate confirmation states
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateMaterials, setDuplicateMaterials] = useState([]);

    // Check permissions
    const canViewMaterials = checkPermission('view-materials', 'view');
    const canAddMaterials = checkPermission('view-materials', 'add');
    const canEditMaterials = checkPermission('view-materials', 'edit');
    const canDeleteMaterials = checkPermission('view-materials', 'delete');
    const canViewReports = checkPermission('view-materials', 'view-report');

    // Calculate total price for selected material in edit modal
    const editModalTotalPrice = useMemo(() => {
        if (selectedMaterial && selectedMaterial.quantity && selectedMaterial.perQuantityPrice) {
            const total = parseFloat(selectedMaterial.quantity) * parseFloat(selectedMaterial.perQuantityPrice);
            return total.toFixed(2);
        }
        return '';
    }, [selectedMaterial]);

    // Initial data fetch with offline support
    const fetchMaterials = useCallback(async () => {
        if (!canViewMaterials) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            const response = await apiWithOfflineSupport.get(`/materials?brandType=${brandType}`);
            setMaterials(response.data);
            
            // Show offline status message
            if (response.fromCache) {
                toast.info('Showing cached data. Connect to the internet for latest updates.', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            }
        } catch (err) {
            setError('Failed to fetch materials. Please check your connection and try again.');
            console.error(err);
            
            // Show error toast
            toast.error('Failed to fetch materials. Please check your connection.', {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        } finally {
            setIsLoading(false);
        }
    }, [canViewMaterials, brandType]);

    // Fetch product mappings
    const fetchProductMappings = useCallback(async () => {
        setIsMappingsLoading(true);
        try {
            const response = await apiWithOfflineSupport.get('/product-mapping');
            setProductMappings(response.data);
        } catch (err) {
            console.error('Failed to fetch product mappings:', err);
            toast.error('Failed to fetch product mappings.');
        } finally {
            setIsMappingsLoading(false);
        }
    }, []);

    
    useEffect(() => {
        fetchMaterials();
        fetchProductMappings();
    }, [fetchMaterials, fetchProductMappings]);

    // Add this useEffect to handle editId parameter
    useEffect(() => {
        const editId = searchParams.get('editId');
        if (editId && materials.length > 0) {
            const materialToEdit = materials.find(material => material.itemCode === editId);
            if (materialToEdit) {
                openEditModal(materialToEdit);
                // Remove the editId parameter from URL
                setSearchParams({});
            }
        }
    }, [searchParams, materials]);

    // --- CRUD Handlers with Offline Support ---

    // CREATE: Called from MaterialForm after a successful API call
    const handleAddMaterial = (newMaterial) => {
        // Ensure the new material has the correct brandType
        const materialWithBrand = { ...newMaterial, brandType };
        setMaterials(prevMaterials => [...prevMaterials, materialWithBrand]);
        
        // Show success message based on online status
        if (isOnline) {
            toast.success('Material added successfully!', {
                position: "top-right",
                autoClose: 3000,
            });
        } else {
            toast.info('Material queued for sync. Will be added when online.', {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    // Handle product mapping creation/update
    const handleProductMappingSaved = (mapping) => {
        // Refresh the product mappings list
        fetchProductMappings();
        
        // Show success message
        if (isOnline) {
            toast.success('Product mapping saved successfully!', {
                position: "top-right",
                autoClose: 3000,
            });
        } else {
            toast.info('Product mapping queued for sync. Will be saved when online.', {
                position: "top-right",
                autoClose: 3000,
            });
        }
    };

    // Handle product mapping deletion
    const handleDeleteProductMapping = async (mappingId) => {
        try {
            await apiWithOfflineSupport.delete(`/product-mapping/${mappingId}`);
            
            // Remove the mapping from the list
            setProductMappings(prev => prev.filter(mapping => mapping._id !== mappingId));
            
            // Show success message
            if (isOnline) {
                toast.success('Product mapping deleted successfully!', {
                    position: "top-right",
                    autoClose: 3000,
                });
            } else {
                toast.info('Product mapping deletion queued for sync. Will be applied when online.', {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        } catch (err) {
            console.error('Failed to delete product mapping:', err);
            toast.error('Failed to delete product mapping.');
        }
    };

    // Open the product mapping modal for editing
    const openEditProductMappingModal = (mapping) => {
        setEditingProductMapping(mapping);
        setIsProductMappingModalOpen(true);
    };

    // Close the product mapping modal
    const closeProductMappingModal = () => {
        setIsProductMappingModalOpen(false);
        setEditingProductMapping(null);
    };

    // Confirm deletion of product mapping
    const confirmDeleteProductMapping = (mappingId) => {
        if (window.confirm('Are you sure you want to delete this product mapping?')) {
            handleDeleteProductMapping(mappingId);
        }
    };
    
    // UPDATE: Called from the Edit Modal
    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        
        if (!canEditMaterials) {
            showAccessDisabled("You don't have permission to edit materials.");
            return;
        }
        
        try {
            // Ensure numeric values are properly converted and brandType is included
            const updatedMaterialData = {
                ...selectedMaterial,
                quantity: Number(selectedMaterial.quantity) || 0,
                perQuantityPrice: Number(selectedMaterial.perQuantityPrice) || 0,
                stockAlertThreshold: Number(selectedMaterial.stockAlertThreshold) || 0,
                unit: selectedMaterial.unit || 'pcs',
                brandType: selectedMaterial.brandType || brandType
            };
            
            const response = await apiWithOfflineSupport.put(`/materials/${selectedMaterial._id}`, updatedMaterialData);
            setMaterials(materials.map(m => m._id === response.data._id ? response.data : m));
            closeEditModal();
            
            // Show success message based on online status
            if (response.queued) {
                toast.info('Update queued for sync. Will be applied when online.', {
                    position: "top-right",
                    autoClose: 3000,
                });
            } else {
                toast.success('Material updated successfully!', {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        } catch (err) {
            console.error("Failed to update material", err);
            toast.error('Failed to update material. Please try again.', {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };

    // --- Product Mapping Handlers ---

    // DELETE: Called from the Delete Confirmation Modal
    const handleDeleteMaterial = async () => {
        if (!canDeleteMaterials) {
            showAccessDisabled("You don't have permission to delete materials.");
            return;
        }
        
        if (!selectedMaterial) return;
        try {
            const response = await apiWithOfflineSupport.delete(`/materials/${selectedMaterial._id}`);
            setMaterials(materials.filter(m => m._id !== selectedMaterial._id));
            closeDeleteModal();
            
            // Show success message based on online status
            if (response.queued) {
                toast.info('Deletion queued for sync. Will be applied when online.', {
                    position: "top-right",
                    autoClose: 3000,
                });
            } else {
                toast.success('Material deleted successfully!', {
                    position: "top-right",
                    autoClose: 3000,
                });
            }
        } catch (err) {
            console.error("Failed to delete material", err);
            toast.error('Failed to delete material. Please try again.', {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };

    // --- Modal Control ---

    const openEditModal = withAccessControl(
        'view-materials', 
        'edit', 
        (material) => {
            setSelectedMaterial(material);
            setIsEditModalOpen(true);
        },
        showAccessDisabled,
        "You don't have permission to edit materials."
    );
    
    const closeEditModal = () => setIsEditModalOpen(false);

    const openDeleteModal = withAccessControl(
        'view-materials', 
        'delete', 
        (materialId) => {
            setSelectedMaterial({ _id: materialId }); // Only need ID for delete
            setIsDeleteModalOpen(true);
        },
        showAccessDisabled,
        "You don't have permission to delete materials."
    );
    
    const closeDeleteModal = () => setIsDeleteModalOpen(false);
    
    // --- Import/Export Handlers ---
    
    // Handle import click with permission check
    const handleImportClick = (...args) => {
        // Allow Admin users to import materials regardless of permissions
        if (user?.role === 'Admin') {
            return setIsImportModalOpen(true);
        }
        // For non-admin users, use the standard permission check
        return withAccessControl(
            'view-materials', 
            'add', 
            () => setIsImportModalOpen(true),
            showAccessDisabled,
            "You don't have permission to import materials."
        )(...args);
    };
    
    // Handle file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImportFile(file);
        }
    };
    
    // Handle import submission
    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            alert('Please select a file to import.');
            return;
        }

        setIsImporting(true);
        setImportResult(null);
        
        try {
            // Send file directly to API for processing with brandType
            const formData = new FormData();
            formData.append('file', importFile);
            formData.append('brandType', brandType); // Include brandType in the import
            
            const response = await apiWithOfflineSupport.post('/materials/import', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            // Check if duplicates were found
            if (response.data.duplicates && response.data.duplicates.length > 0) {
                // Show duplicate confirmation modal
                setDuplicateMaterials(response.data.duplicates);
                setIsDuplicateModalOpen(true);
                setImportResult(null); // Clear previous result
            } else {
                // No duplicates, show result normally
                // Refresh materials list
                fetchMaterials();
                
                // Show result
                setImportResult({
                    message: response.data.message,
                    imported: response.data.imported,
                    duplicates: response.data.duplicates,
                    errors: response.data.errors
                });
                
                // Show detailed toast message
                if (response.data.imported > 0) {
                    toast.success(`✅ Imported ${response.data.imported} materials successfully`);
                }
                if (response.data.duplicates > 0) {
                    toast.warn(`⚠️ Skipped ${response.data.duplicates} duplicate materials`);
                }
                if (response.data.errors > 0) {
                    toast.error(`❌ Encountered ${response.data.errors} errors during import`);
                }
            }
            
            // Reset file input
            setImportFile(null);
        } catch (err) {
            console.error("Failed to import materials", err);
            toast.error('Failed to import materials. Please try again.', {
                position: "top-right",
                autoClose: 5000,
            });
        } finally {
            setIsImporting(false);
        }
    };

    // Handle duplicate confirmation
    const handleDuplicateConfirmation = async (action) => {
        setIsDuplicateModalOpen(false);
        
        try {
            // Send confirmation to server with brandType
            const response = await apiWithOfflineSupport.post('/materials/import-with-duplicates', {
                duplicates: duplicateMaterials,
                action: action, // 'add' or 'skip'
                brandType: brandType // Include brandType in the request
            });
            
            // Refresh materials list
            fetchMaterials();
            
            // Show result
            setImportResult({
                message: response.data.message,
                imported: response.data.imported,
                updated: response.data.updated,
                skipped: response.data.skipped,
                errors: response.data.errors
            });
            
            // Show detailed toast message
            if (response.data.imported > 0) {
                toast.success(`✅ Imported ${response.data.imported} materials successfully`);
            }
            if (response.data.updated > 0) {
                toast.success(`🔄 Updated quantities for ${response.data.updated} existing materials`);
            }
            if (response.data.skipped > 0) {
                toast.warn(`⚠️ Skipped ${response.data.skipped} duplicate materials`);
            }
            if (response.data.errors > 0) {
                toast.error(`❌ Encountered ${response.data.errors} errors during import`);
            }
            
            // Reset file input
            setImportFile(null);
        } catch (err) {
            console.error("Failed to process duplicates", err);
            toast.error('Failed to process duplicates. Please try again.', {
                position: "top-right",
                autoClose: 5000,
            });
        }
    };
    
    // Handle Excel export
    const handleExportExcel = () => {
        setIsLoading(true);
        try {
            // Prepare data for export
            const exportData = filteredMaterials.map(material => ({
                'Item Code': material.itemCode,
                'Material Name': material.name,
                'Quantity': material.quantity,
                'Unit': material.unit || 'pcs',
                'Unit Price (₹)': material.perQuantityPrice,
                'Total Price (₹)': (parseFloat(material.quantity) * parseFloat(material.perQuantityPrice)).toFixed(2),
                'Alert Threshold': material.stockAlertThreshold,
                'Brand Type': material.brandType === 'own' ? 'Own Brand' : 'Other Brand',
                'Date Added': material.createdAt ? new Date(material.createdAt).toLocaleDateString() : new Date(material.date).toLocaleDateString()
            }));
            
            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Packing Materials');
            
            // Export to file with proper filename format
            const dateStr = new Date().toISOString().split('T')[0];
            const brandLabel = brandType === 'own' ? 'OwnBrand' : 'OtherBrand';
            XLSX.writeFile(wb, `Packing_Materials_${brandLabel}_${dateStr}.xlsx`);
            
            toast.success('Materials exported successfully!');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export materials');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Handle PDF export
    const handleExportPDF = async () => {
        setIsLoading(true);
        try {
            const response = await apiWithOfflineSupport.get(`/materials/export?format=pdf&brandType=${brandType}`, {
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const dateStr = new Date().toISOString().split('T')[0];
            const brandLabel = brandType === 'own' ? 'OwnBrand' : 'OtherBrand';
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Packing_Materials_${brandLabel}_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export materials as PDF');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Filtering Logic ---
    const filteredMaterials = materials.filter(material =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.itemCode && material.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'Item Code', key: 'itemCode' },
        { header: 'Material Name', key: 'name' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit', key: 'unit' },
        { header: 'Unit Price (₹)', key: 'perQuantityPrice', render: (value) => `₹${parseFloat(value).toFixed(2)}` },
        { header: 'Total Value (₹)', key: 'totalValue', render: (value, row) => `₹${(parseFloat(row.quantity) * parseFloat(row.perQuantityPrice)).toFixed(2)}` },
        { header: 'Alert Threshold', key: 'stockAlertThreshold' },
        { header: 'Brand Type', key: 'brandType', render: (value) => value === 'own' ? 'Own Brand' : 'Other Brand' },
        { header: 'Last Updated', key: 'updatedAt', render: (value) => new Date(value).toLocaleDateString() }
    ];

    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <FaSpinner className="animate-spin text-indigo-600" size={48} />
                <p className="text-gray-600 text-sm font-medium">Loading materials...</p>
                {!isOnline && (
                    <div className="flex items-center text-yellow-600">
                        <FaExclamationTriangle className="mr-2" />
                        <span>Working offline</span>
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm">
                    <p className="font-medium">{error}</p>
                    {!isOnline && (
                        <div className="mt-3 flex items-center text-yellow-600">
                            <FaExclamationTriangle className="mr-2" />
                            <span>You are currently offline. Some features may be limited.</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Check if user has any permissions in this module
    if (!checkPermission('view-materials', 'view') && 
        !checkPermission('view-materials', 'add') && 
        !checkPermission('view-materials', 'edit') && 
        !checkPermission('view-materials', 'delete') && 
        !checkPermission('view-materials', 'view-report')) {
        // Instead of showing access denied message, hide the component entirely
        return null;
    }

    return (
        <MaterialsRefreshContext.Provider value={{ refreshMaterials: fetchMaterials }}>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Offline status indicator */}
                {!isOnline && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center">
                        <FaExclamationTriangle className="text-yellow-600 mr-2" />
                        <span className="text-yellow-800 font-medium">Working Offline</span>
                        <span className="text-yellow-700 ml-2 text-sm">Changes will sync when you're back online</span>
                    </div>
                )}
                
                {/* Brand Toggle Switch */}
                <div className="mb-6 flex justify-center">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                            type="button"
                            className={`px-6 py-3 text-sm font-medium rounded-l-lg border ${
                                brandType === 'own'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => setBrandType('own')}
                        >
                            Own Brand
                        </button>
                        <button
                            type="button"
                            className={`px-6 py-3 text-sm font-medium rounded-r-lg border ${
                                brandType === 'other'
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => setBrandType('other')}
                        >
                            Other Brand
                        </button>
                    </div>
                </div>
                
                {/* Header Section - Add Delivery Challan button */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                            Packing Materials - {brandType === 'own' ? 'Own Brand' : 'Other Brand'}
                        </h1>
                        <p className="text-gray-600 mt-1 text-sm">Manage your packing materials inventory</p>
                    </div>
                    <div className="flex space-x-2 self-end sm:self-auto">
                        {(canAddMaterials || user?.role === 'Admin') && (
                            <button
                                onClick={handleImportClick}
                                className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                                title="Import Excel"
                            >
                                <FaFileImport className="mr-2" />
                                <span>Import Excel</span>
                            </button>
                        )}
                        <button
                            onClick={handleExportExcel}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50"
                            title="Export Excel"
                        >
                            {isLoading ? (
                                <FaSpinner className="mr-2 animate-spin" />
                            ) : (
                                <FaFileExport className="mr-2" />
                            )}
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition disabled:opacity-50"
                            title="Export PDF"
                        >
                            {isLoading ? (
                                <FaSpinner className="mr-2 animate-spin" />
                            ) : (
                                <FaFileExport className="mr-2" />
                            )}
                            <span>Export PDF</span>
                        </button>
                        <button
                            onClick={() => setIsProductMappingModalOpen(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition"
                            title="Add Product Mapping"
                        >
                            <span>Add Product Mapping</span>
                        </button>
                        {canViewReports && (
                            <ViewReportTools
                                data={filteredMaterials}
                                title={`Packing Material Stock - ${brandType === 'own' ? 'Own Brand' : 'Other Brand'}`}
                                fileName={`ViewMaterials_${brandType === 'own' ? 'OwnBrand' : 'OtherBrand'}`}
                                metaDetails={{ user: 'Current User' }}
                                columns={reportColumns}
                                searchFilter={searchTerm}
                            />
                        )}
                    </div>
                </div>
                
                {/* Online/Offline Status Indicator */}
                <div className="flex items-center">
                    {isOnline ? (
                        <div className="flex items-center text-green-600">
                            <FaWifi className="mr-2" />
                            <span className="text-sm font-medium">Online</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-yellow-600">
                            <FaExclamationTriangle className="mr-2" />
                            <span className="text-sm font-medium">Offline</span>
                        </div>
                    )}
                </div>
                
                {/* Add Material Form - Enhanced card styling */}
                {canAddMaterials && (
                    <div className="mb-8">
                        <MaterialForm onMaterialAdded={handleAddMaterial} brandType={brandType} />
                    </div>
                )}

                {/* Product Mappings Section */}
                <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-xl font-bold text-gray-900">Product Mappings</h2>
                        <p className="text-gray-600 text-sm mt-1">Manage product to material mappings</p>
                    </div>
                    
                    {/* Product Mappings Table */}
                    <div className="overflow-x-auto">
                        {isMappingsLoading ? (
                            <div className="flex justify-center items-center py-8">
                                <FaSpinner className="animate-spin text-indigo-600" size={24} />
                                <span className="ml-2 text-gray-600">Loading product mappings...</span>
                            </div>
                        ) : productMappings.length > 0 ? (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units per Carton</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials Mapped</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {productMappings.map((mapping, index) => (
                                        <tr key={mapping._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{mapping.product_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{mapping.units_per_carton || 1}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                <div className="flex flex-wrap gap-1">
                                                    {mapping.materials.map((material, idx) => (
                                                        <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                            {material.material_name} ({material.qty_per_carton})
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => openEditProductMappingModal(mapping)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                                <button
                                                    onClick={() => confirmDeleteProductMapping(mapping._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No product mappings found.</p>
                                <button
                                    onClick={() => setIsProductMappingModalOpen(true)}
                                    className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                                >
                                    Create Your First Mapping
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Search and Table Section - Better visual separation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Search Bar - Enhanced styling with icon */}
                    <div className="p-6 border-b border-gray-200 bg-gray-50">
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <FaSearch className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by item code or material name..."
                                className="block w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg 
                                         bg-white text-gray-900 placeholder-gray-500
                                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                         transition-all duration-200 ease-in-out
                                         hover:border-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {searchTerm && (
                            <p className="mt-2 text-sm text-gray-600">
                                Found {filteredMaterials.length} {filteredMaterials.length === 1 ? 'result' : 'results'}
                            </p>
                        )}
                    </div>
                    
                    {/* Table Container */}
                    <div className="materials-table-container">
                        {filteredMaterials.length > 0 ? (
                            <MaterialsTable 
                                materials={filteredMaterials} 
                                onEdit={canEditMaterials ? openEditModal : null} 
                                onDelete={canDeleteMaterials ? openDeleteModal : null}
                            />
                        ) : (
                            <div className="text-center py-16 px-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    {isOnline ? <FaSearch className="h-8 w-8 text-gray-400" /> : <FaExclamationTriangle className="h-8 w-8 text-yellow-500" />}
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No materials found</h3>
                                <p className="text-gray-600 text-sm">
                                    {searchTerm 
                                        ? "Try adjusting your search terms" 
                                        : isOnline 
                                            ? "Get started by adding your first material" 
                                            : "Connect to the internet to view materials"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Edit Material Modal - Enhanced form styling */}
                <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Material">
                    {selectedMaterial && (
                        <form onSubmit={handleUpdateMaterial} className="space-y-6">
                            {/* Form Grid for better organization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Item Code - Read only with distinct styling */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-itemCode" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Item Code
                                    </label>
                                    <input 
                                        id="edit-itemCode" 
                                        type="text" 
                                        value={selectedMaterial?.itemCode || ''} 
                                        readOnly 
                                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg 
                                                 bg-gray-50 text-gray-600 cursor-not-allowed
                                                 focus:outline-none"
                                    />
                                </div>
                                
                                {/* Material Name */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-name" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Material Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        id="edit-name" 
                                        type="text" 
                                        value={selectedMaterial?.name || ''} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, name: e.target.value})} 
                                        required
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* Quantity */}
                                <div>
                                    <label htmlFor="edit-quantity" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Quantity <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        id="edit-quantity" 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        value={selectedMaterial?.quantity || 0} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, quantity: Number(e.target.value) || 0})} 
                                        required
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* Unit */}
                                <div>
                                    <label htmlFor="edit-unit" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Unit <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="edit-unit"
                                        value={selectedMaterial?.unit || 'pcs'}
                                        onChange={e => setSelectedMaterial({...selectedMaterial, unit: e.target.value})}
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                        required
                                    >
                                        <option value="pcs">pcs</option>
                                        <option value="kg">kg</option>
                                        <option value="gms">gms</option>
                                        <option value="mg">mg</option>
                                        <option value="cm">cm</option>
                                        <option value="m">m</option>
                                        <option value="mm">mm</option>
                                        <option value="ltr">ltr</option>
                                        <option value="ml">ml</option>
                                        <option value="box">box</option>
                                        <option value="roll">roll</option>
                                        <option value="pkt">pkt</option>
                                        <option value="set">set</option>
                                        <option value="nos">nos</option>
                                        <option value="bundle">bundle</option>
                                    </select>
                                </div>
                                
                                {/* Unit Price */}
                                <div>
                                    <label htmlFor="edit-perQuantityPrice" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Unit Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                        <input 
                                            id="edit-perQuantityPrice" 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={selectedMaterial?.perQuantityPrice || 0} 
                                            onChange={e => setSelectedMaterial({...selectedMaterial, perQuantityPrice: Number(e.target.value) || 0})} 
                                            required
                                            className="block w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg 
                                                     bg-white text-gray-900 placeholder-gray-400
                                                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                     transition-all duration-200 hover:border-gray-400"
                                        />
                                    </div>
                                </div>
                                
                                {/* Total Price - Highlighted */}
                                <div>
                                    <label htmlFor="edit-totalPrice" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Total Value (₹)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                        <input 
                                            id="edit-totalPrice" 
                                            type="text" 
                                            value={editModalTotalPrice} 
                                            readOnly 
                                            className="block w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg 
                                                     bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed
                                                     focus:outline-none"
                                        />
                                    </div>
                                </div>
                                
                                {/* Alert Threshold */}
                                <div>
                                    <label htmlFor="edit-threshold" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Stock Alert Threshold
                                    </label>
                                    <input 
                                        id="edit-threshold" 
                                        type="number" 
                                        min="0"
                                        value={selectedMaterial?.stockAlertThreshold || 0} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, stockAlertThreshold: Number(e.target.value) || 0})} 
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* Brand Type - Read only in edit mode */}
                                <div>
                                    <label htmlFor="edit-brandType" className="block text-sm font-semibold text-gray-700 mb-2">
                                        Brand Type
                                    </label>
                                    <input 
                                        id="edit-brandType" 
                                        type="text" 
                                        value={selectedMaterial?.brandType === 'own' ? 'Own Brand' : 'Other Brand'} 
                                        readOnly 
                                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg 
                                                 bg-gray-50 text-gray-600 cursor-not-allowed
                                                 focus:outline-none"
                                    />
                                </div>
                            </div>
                            
                            {/* Action Buttons - Enhanced with better spacing */}
                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg 
                                             text-sm font-medium text-gray-700 bg-white 
                                             hover:bg-gray-50 hover:border-gray-400
                                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                             transition-all duration-200 ease-in-out"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 border border-transparent rounded-lg 
                                             text-sm font-medium text-white bg-indigo-600 
                                             hover:bg-indigo-700 hover:shadow-md
                                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                             transition-all duration-200 ease-in-out
                                             transform hover:scale-105"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}
                </Modal>
                
                {/* Import Modal */}
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Materials from Excel">
                    <form onSubmit={handleImportSubmit} className="space-y-6">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input 
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                onChange={handleFileChange} 
                                className="hidden" 
                                id="import-file"
                            />
                            <label htmlFor="import-file" className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center">
                                    <FaFileImport className="h-12 w-12 text-gray-400 mb-3" />
                                    <p className="text-lg font-medium text-gray-700 mb-1">
                                        {importFile ? importFile.name : 'Click to upload Excel file'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Supported formats: .xlsx, .xls, .csv
                                    </p>
                                </div>
                            </label>
                        </div>
                        
                        {importResult && (
                            <div className={`p-4 rounded-lg ${importResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                                {importResult.error ? (
                                    <p className="text-red-700">{importResult.error}</p>
                                ) : (
                                    <div>
                                        <p className="text-green-700 font-medium">{importResult.message}</p>
                                        <ul className="mt-2 text-green-700">
                                            <li>✅ Imported: {importResult.imported} rows</li>
                                            {importResult.updated !== undefined && (
                                                <li>🔄 Updated: {importResult.updated} materials</li>
                                            )}
                                            {importResult.skipped !== undefined && (
                                                <li>⚠️ Skipped: {importResult.skipped} duplicates</li>
                                            )}
                                            <li>❌ Errors: {importResult.errors}</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg 
                                         text-sm font-medium text-gray-700 bg-white 
                                         hover:bg-gray-50 hover:border-gray-400
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                         transition-all duration-200 ease-in-out"
                                disabled={isImporting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2.5 border border-transparent rounded-lg 
                                         text-sm font-medium text-white bg-indigo-600 
                                         hover:bg-indigo-700 hover:shadow-md
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                         transition-all duration-200 ease-in-out
                                         transform hover:scale-105 disabled:opacity-50"
                                disabled={isImporting || !importFile}
                            >
                                {isImporting ? (
                                    <span className="flex items-center">
                                        <FaSpinner className="animate-spin mr-2" />
                                        Importing...
                                    </span>
                                ) : (
                                    'Import Materials'
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
                
                {/* Duplicate Confirmation Modal */}
                <Modal isOpen={isDuplicateModalOpen} onClose={() => setIsDuplicateModalOpen(false)} title="Duplicate Materials Found">
                    <div className="space-y-6">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <p className="text-yellow-800 font-medium mb-2">⚠️ Duplicate materials detected</p>
                            <p className="text-yellow-700 text-sm">
                                The following materials already exist in your inventory. What would you like to do?
                            </p>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Existing Qty</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Qty</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {duplicateMaterials.map((material, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900">{material.name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{material.existingQuantity}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{material.quantity}</td>
                                            <td className="px-4 py-2 text-sm font-medium text-indigo-600">{material.existingQuantity + material.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => handleDuplicateConfirmation('skip')}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg 
                                         text-sm font-medium text-gray-700 bg-white 
                                         hover:bg-gray-50 hover:border-gray-400
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                         transition-all duration-200 ease-in-out"
                            >
                                Skip Duplicates
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDuplicateConfirmation('add')}
                                className="px-6 py-2.5 border border-transparent rounded-lg 
                                         text-sm font-medium text-white bg-indigo-600 
                                         hover:bg-indigo-700 hover:shadow-md
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                         transition-all duration-200 ease-in-out
                                         transform hover:scale-105"
                            >
                                Add Quantities to Existing
                            </button>
                        </div>
                    </div>
                </Modal>
                
                {/* Delete Confirmation Modal - Enhanced design */}
                <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Deletion">
                    <div className="space-y-5">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-gray-800 font-medium mb-1">Are you sure you want to delete this material?</p>
                            <p className="text-gray-600 text-sm">This action cannot be undone and will permanently remove this material from your inventory.</p>
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="px-6 py-2.5 border border-gray-300 rounded-lg 
                                         text-sm font-medium text-gray-700 bg-white 
                                         hover:bg-gray-50 hover:border-gray-400
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                         transition-all duration-200 ease-in-out"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteMaterial}
                                className="px-6 py-2.5 border border-transparent rounded-lg 
                                         text-sm font-medium text-white bg-red-600 
                                         hover:bg-red-700 hover:shadow-md
                                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                                         transition-all duration-200 ease-in-out
                                         transform hover:scale-105"
                            >
                                Delete Material
                            </button>
                        </div>
                    </div>
                </Modal>
                
                {/* Access Disabled Modal */}
                <AccessDisabledModal 
                    isOpen={isAccessDisabledOpen}
                    onClose={hideAccessDisabled}
                    message={accessDisabledMessage}
                />
                <CreateProductMappingModal
                    isOpen={isProductMappingModalOpen}
                    onClose={closeProductMappingModal}
                    onMappingCreated={handleProductMappingSaved}
                    editingMapping={editingProductMapping}
                />
            </div>
        </MaterialsRefreshContext.Provider>
    );
};

// Delivery Challan Modal Component


export default ViewPackingMaterialsWithOffline;