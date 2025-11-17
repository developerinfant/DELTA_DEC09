import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../api';
import MaterialForm from '../../components/packing/MaterialForm';
import MaterialsTable from '../../components/packing/MaterialsTable';
import Modal from '../../components/common/Modal';
import Card from '../../components/common/Card';
import { FaSpinner, FaSearch, FaFileImport, FaFileExport } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import AccessDisabledModal from '../../components/common/AccessDisabledModal';
import useAccessDisabled from '../../hooks/useAccessDisabled';
import useAccessControl from '../../hooks/useAccessControl';
import CreateProductMappingModal from '../../components/packing/CreateProductMappingModal';
import * as XLSX from 'xlsx';

// Create a context for refreshing materials
export const MaterialsRefreshContext = React.createContext({
  refreshMaterials: () => Promise.resolve()
});


const ViewPackingMaterials = () => {
    console.log('ViewPackingMaterials component rendering...');
    const { user } = useAuth();
    const { isAccessDisabledOpen, accessDisabledMessage, showAccessDisabled, hideAccessDisabled } = useAccessDisabled();
    const { checkPermission, withAccessControl } = useAccessControl();
    
    // Debug: Log user info to console
    console.log('Current user:', user);
    console.log('User role:', user?.role);
    console.log('canAddMaterials permission:', checkPermission('view-materials', 'add'));
    console.log('Window width:', window.innerWidth);
    
    // Data states
    const [materials, setMaterials] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // UI/State management states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Import/Export states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    
    // Duplicate confirmation states
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [duplicateMaterials, setDuplicateMaterials] = useState([]);
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [isProductMappingModalOpen, setIsProductMappingModalOpen] = useState(false);


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


    // Initial data fetch
    const fetchMaterials = useCallback(async () => {
        if (!canViewMaterials) {
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        try {
            const { data } = await api.get('/materials');
            // Debug: Log the raw data from API
            console.log('Raw materials data from API:', data);
            
            // Debug: Check specific material fields
            if (data && data.length > 0) {
                console.log('First material details:', {
                    _id: data[0]._id,
                    name: data[0].name,
                    quantity: data[0].quantity,
                    perQuantityPrice: data[0].perQuantityPrice,
                    typeOfQuantity: typeof data[0].quantity,
                    typeOfPrice: typeof data[0].perQuantityPrice
                });
            }
            
            setMaterials(data);
        } catch (err) {
            setError('Failed to fetch materials. Please try refreshing the page.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [canViewMaterials]);


    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);


    // --- CRUD Handlers ---


    // CREATE: Called from MaterialForm after a successful API call
    const handleAddMaterial = (newMaterial) => {
        setMaterials(prevMaterials => [...prevMaterials, newMaterial]);
    };
    
    // UPDATE: Called from the Edit Modal
    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        
        if (!canEditMaterials) {
            showAccessDisabled("You don't have permission to edit materials.");
            return;
        }
        
        try {
            // Ensure numeric values are properly converted
            const updatedMaterialData = {
                ...selectedMaterial,
                quantity: Number(selectedMaterial.quantity) || 0,
                perQuantityPrice: Number(selectedMaterial.perQuantityPrice) || 0,
                stockAlertThreshold: Number(selectedMaterial.stockAlertThreshold) || 0,
                hsnCode: selectedMaterial.hsnCode || '' // Include HSN Code in update
            };
            
            const { data: updatedMaterial } = await api.put(`/materials/${selectedMaterial._id}`, updatedMaterialData);
            setMaterials(materials.map(m => m._id === updatedMaterial._id ? updatedMaterial : m));
            closeEditModal();
        } catch (err) {
            console.error("Failed to update material", err);
            // Here you could set an error message within the modal
        }
    };


    // DELETE: Called from the Delete Confirmation Modal
    const handleDeleteMaterial = async () => {
        if (!canDeleteMaterials) {
            showAccessDisabled("You don't have permission to delete materials.");
            return;
        }
        
        if (!selectedMaterial) return;
        try {
            await api.delete(`/materials/${selectedMaterial._id}`);
            setMaterials(materials.filter(m => m._id !== selectedMaterial._id));
            closeDeleteModal();
        } catch (err) {
            console.error("Failed to delete material", err);
        }
    };


    // --- Import/Export Handlers ---

    const handleImportClick = () => {
        // Debug: Always open the modal
        console.log('Import button clicked');
        setIsImportModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check file type
            const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
            if (!validTypes.includes(file.type)) {
                alert('Please upload a valid Excel or CSV file.');
                return;
            }
            setImportFile(file);
        }
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (!importFile) {
            alert('Please select a file to import.');
            return;
        }

        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', importFile);

        try {
            const response = await api.post('/materials/import', formData, {
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
                setImportResult(response.data);
                // Refresh materials list
                fetchMaterials();
            }
        } catch (err) {
            console.error("Failed to import materials", err);
            setImportResult({ error: 'Failed to import materials. Please try again.' });
        } finally {
            setIsImporting(false);
        }
    };

    // Handle duplicate confirmation
    const handleDuplicateConfirmation = async (action) => {
        setIsDuplicateModalOpen(false);
        
        try {
            // Send confirmation to server
            const response = await api.post('/materials/import-with-duplicates', {
                duplicates: duplicateMaterials,
                action: action // 'add' or 'skip'
            });
            
            setImportResult(response.data);
            // Refresh materials list
            fetchMaterials();
        } catch (err) {
            console.error("Failed to process duplicates", err);
            setImportResult({ error: 'Failed to process duplicates. Please try again.' });
        }
    };

    const handleExportExcel = async () => {
        try {
            const response = await api.get('/materials/export?format=excel', {
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Packing_Materials_Report_${dateStr}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to export materials", err);
            alert('Failed to export materials. Please try again.');
        }
    };

    const handleExportPDF = async () => {
        try {
            const response = await api.get('/materials/export?format=pdf');
            const data = response.data;
            
            // For now, we'll just show an alert since PDF generation is more complex
            // In a real implementation, you would use a library like jsPDF
            alert('PDF export functionality would be implemented here. For now, please use Excel export.');
        } catch (err) {
            console.error("Failed to export materials", err);
            alert('Failed to export materials. Please try again.');
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
        { header: 'Unit Price', key: 'perQuantityPrice', render: (value) => `₹${parseFloat(value).toFixed(2)}` },
        { header: 'Total Price', key: 'totalValue', render: (value, row) => `₹${(parseFloat(row.quantity) * parseFloat(row.perQuantityPrice)).toFixed(2)}` },
        { header: 'Stock Alert Threshold', key: 'stockAlertThreshold' },
        { header: 'HSN Code', key: 'hsnCode' },
        { header: 'Last Updated', key: 'updatedAt', render: (value) => new Date(value).toLocaleDateString() }
    ];


    // --- Render Logic ---
    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 space-y-4">
                <FaSpinner className="animate-spin text-indigo-600" size={48} />
                <p className="text-gray-600 text-sm font-medium">Loading materials...</p>
            </div>
        );
    }


    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-8">
                <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow-sm">
                    <p className="font-medium">{error}</p>
                </div>
            </div>
        );
    }


    // Check if user has any permissions in this module
    const hasAnyPermission = checkPermission('view-materials', 'view') || 
        checkPermission('view-materials', 'add') || 
        checkPermission('view-materials', 'edit') || 
        checkPermission('view-materials', 'delete') || 
        checkPermission('view-materials', 'view-report');
        
    console.log('Has any permission:', hasAnyPermission);
    
    if (!hasAnyPermission) {
        // Instead of showing access denied message, hide the component entirely
        console.log('Hiding component due to lack of permissions');
        return null;
    }


    return (
        <MaterialsRefreshContext.Provider value={{ refreshMaterials: fetchMaterials }}>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
                {/* Header Section - Improved spacing and alignment */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Packing Materials</h1>
                        <p className="text-gray-600 mt-1 text-sm">Manage your packing materials inventory</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleImportClick}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                            title="Import Excel"
                        >
                            <FaFileImport className="mr-2" />
                            <span className="hidden sm:inline">Import Excel</span>
                            <span className="sm:hidden">Import</span>
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                            title="Export Excel"
                        >
                            <FaFileExport className="mr-2" />
                            <span className="hidden sm:inline">Export Excel</span>
                            <span className="sm:hidden">Export</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                            title="Export PDF"
                        >
                            <FaFileExport className="mr-2" />
                            <span className="hidden sm:inline">Export PDF</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                        <button
                            onClick={() => setIsProductMappingModalOpen(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition"
                            title="Add Product Mapping"
                        >
                            <span className="hidden md:inline">Add Product Mapping</span>
                            <span className="md:hidden">Mapping</span>
                        </button>
                        {canViewReports && (
                            <ViewReportTools
                                data={filteredMaterials}
                                title="Packing Material Stock"
                                fileName="ViewMaterials"
                                metaDetails={{ user: 'Current User' }}
                                columns={reportColumns}
                                searchFilter={searchTerm}
                            />
                        )}
                    </div>
                </div>
                
                {/* Add Material Form - Enhanced card styling */}
                {canAddMaterials && (
                    <div className="mb-6">
                        <MaterialForm onMaterialAdded={handleAddMaterial} />
                    </div>
                )}

                {/* Search and Table Section - Better visual separation */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Search Bar - Enhanced styling with icon */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="relative max-w-md">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by item code or material name..."
                                className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg 
                                         bg-white text-gray-900 placeholder-gray-500
                                         focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                         transition-all duration-200 ease-in-out
                                         hover:border-gray-400 text-sm"
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
                                onViewHistory={(materialId) => {
                                    // This function is passed to the table but we're handling it internally
                                    // The table component manages its own state for history expansion
                                }}
                            />
                        ) : (
                            <div className="text-center py-12 px-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                    <FaSearch className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No materials found</h3>
                                <p className="text-gray-600 text-sm">
                                    {searchTerm 
                                        ? "Try adjusting your search terms" 
                                        : "Get started by adding your first material"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Import Modal */}
                <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Materials from Excel">
                    <form onSubmit={handleImportSubmit} className="space-y-5">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center">
                            <input 
                                type="file" 
                                accept=".xlsx,.xls,.csv" 
                                onChange={handleFileChange} 
                                className="hidden" 
                                id="import-file"
                            />
                            <label htmlFor="import-file" className="cursor-pointer">
                                <div className="flex flex-col items-center justify-center">
                                    <FaFileImport className="h-10 w-10 text-gray-400 mb-3" />
                                    <p className="text-base font-medium text-gray-700 mb-1">
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
                                        <ul className="mt-2 text-green-700 text-sm">
                                            <li className="flex justify-between py-1">
                                                <span>Imported:</span>
                                                <span className="font-medium">{importResult.imported} rows</span>
                                            </li>
                                            {importResult.updated !== undefined && (
                                                <li className="flex justify-between py-1">
                                                    <span>Updated:</span>
                                                    <span className="font-medium">{importResult.updated} materials</span>
                                                </li>
                                            )}
                                            {importResult.skipped !== undefined && (
                                                <li className="flex justify-between py-1">
                                                    <span>Skipped:</span>
                                                    <span className="font-medium">{importResult.skipped} duplicates</span>
                                                </li>
                                            )}
                                            <li className="flex justify-between py-1">
                                                <span>Errors:</span>
                                                <span className="font-medium">{importResult.errors}</span>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-5 py-2.5 border border-gray-300 rounded-lg 
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
                                className="px-5 py-2.5 border border-transparent rounded-lg 
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
                    <div className="space-y-5">
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
                                            <td className="px-4 py-2 text-sm font-medium text-gray-900 truncate max-w-[120px]" title={material.name}>{material.name}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{material.existingQuantity}</td>
                                            <td className="px-4 py-2 text-sm text-gray-500">{material.quantity}</td>
                                            <td className="px-4 py-2 text-sm font-medium text-indigo-600">{material.existingQuantity + material.quantity}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => handleDuplicateConfirmation('skip')}
                                className="px-5 py-2.5 border border-gray-300 rounded-lg 
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
                                className="px-5 py-2.5 border border-transparent rounded-lg 
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
                
                {/* Edit Material Modal - Enhanced form styling */}
                <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Material">
                    {selectedMaterial && (
                        <form onSubmit={handleUpdateMaterial} className="space-y-5">
                            {/* Form Grid for better organization */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Item Code - Read only with distinct styling */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-itemCode" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Item Code
                                    </label>
                                    <input 
                                        id="edit-itemCode" 
                                        type="text" 
                                        value={selectedMaterial?.itemCode || ''} 
                                        readOnly 
                                        className="block w-full px-3 py-2.5 border border-gray-200 rounded-lg 
                                                 bg-gray-50 text-gray-600 cursor-not-allowed text-sm
                                                 focus:outline-none"
                                    />
                                </div>
                                
                                {/* Material Name */}
                                <div className="md:col-span-2">
                                    <label htmlFor="edit-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Material Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        id="edit-name" 
                                        type="text" 
                                        value={selectedMaterial?.name || ''} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, name: e.target.value})} 
                                        required
                                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400 text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* Quantity */}
                                <div>
                                    <label htmlFor="edit-quantity" className="block text-sm font-semibold text-gray-700 mb-1.5">
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
                                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400 text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* Unit Price */}
                                <div>
                                    <label htmlFor="edit-perQuantityPrice" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Unit Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                                        <input 
                                            id="edit-perQuantityPrice" 
                                            type="number" 
                                            min="0"
                                            step="0.01"
                                            value={selectedMaterial?.perQuantityPrice || 0} 
                                            onChange={e => setSelectedMaterial({...selectedMaterial, perQuantityPrice: Number(e.target.value) || 0})} 
                                            required
                                            className="block w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg 
                                                     bg-white text-gray-900 placeholder-gray-400 text-sm
                                                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                     transition-all duration-200 hover:border-gray-400"
                                        />
                                    </div>
                                </div>
                                
                                {/* Total Price - Highlighted */}
                                <div>
                                    <label htmlFor="edit-totalPrice" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Total Value (₹)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">₹</span>
                                        <input 
                                            id="edit-totalPrice" 
                                            type="text" 
                                            value={editModalTotalPrice} 
                                            readOnly 
                                            className="block w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-lg 
                                                     bg-indigo-50 text-indigo-900 font-semibold cursor-not-allowed text-sm
                                                     focus:outline-none"
                                        />
                                    </div>
                                </div>
                                
                                {/* Alert Threshold */}
                                <div>
                                    <label htmlFor="edit-threshold" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Stock Alert Threshold
                                    </label>
                                    <input 
                                        id="edit-threshold" 
                                        type="number" 
                                        min="0"
                                        value={selectedMaterial?.stockAlertThreshold || 0} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, stockAlertThreshold: Number(e.target.value) || 0})} 
                                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400 text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                                
                                {/* HSN Code */}
                                <div>
                                    <label htmlFor="edit-hsnCode" className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        HSN Code
                                    </label>
                                    <input 
                                        id="edit-hsnCode" 
                                        type="text" 
                                        value={selectedMaterial?.hsnCode || ''} 
                                        onChange={e => setSelectedMaterial({...selectedMaterial, hsnCode: e.target.value})} 
                                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                                                 bg-white text-gray-900 placeholder-gray-400 text-sm
                                                 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                                 transition-all duration-200 hover:border-gray-400"
                                    />
                                </div>
                            </div>
                            
                            {/* Action Buttons - Enhanced with better spacing */}
                            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-5 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-5 py-2.5 border border-gray-300 rounded-lg 
                                             text-sm font-medium text-gray-700 bg-white 
                                             hover:bg-gray-50 hover:border-gray-400
                                             focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                                             transition-all duration-200 ease-in-out"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 border border-transparent rounded-lg 
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
                
                {/* Delete Confirmation Modal - Enhanced design */}
                <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Deletion">
                    <div className="space-y-5">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-gray-800 font-medium mb-1">Are you sure you want to delete this material?</p>
                            <p className="text-gray-600 text-sm">This action cannot be undone and will permanently remove this material from your inventory.</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
                            <button
                                type="button"
                                onClick={closeDeleteModal}
                                className="px-5 py-2.5 border border-gray-300 rounded-lg 
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
                                className="px-5 py-2.5 border border-transparent rounded-lg 
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
                    onClose={() => setIsProductMappingModalOpen(false)}
                    onMappingCreated={(mapping) => {
                        // Show success message or handle as needed
                        console.log('Product mapping created:', mapping);
                    }}
                />
            </div>
        </MaterialsRefreshContext.Provider>
    );
};


export default ViewPackingMaterials;