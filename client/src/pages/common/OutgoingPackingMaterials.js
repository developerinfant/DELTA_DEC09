import React, { useState, useEffect, useMemo } from 'react';
import apiWithOfflineSupport from '../../utils/apiWithOfflineSupport';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaExclamationTriangle, FaEye, FaPlus, FaTimes, FaTrash, FaFilePdf, FaPrint } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeliveryChallanDetailModal from '../../components/deliveryChallan/DeliveryChallanDetailModal';
import { useAuth } from '../../context/AuthContext';
import Select from 'react-select';

const OutgoingPackingMaterials = () => {
    // State for materials, product mappings, suppliers, and delivery challan records
    const [materials, setMaterials] = useState([]);
    const [productMappings, setProductMappings] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [records, setRecords] = useState([]);

    // Form state
    const [unitType, setUnitType] = useState('Own Unit');
    const [supplierId, setSupplierId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cartonQty, setCartonQty] = useState('');
    const [dcDate, setDcDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [personName, setPersonName] = useState('');
    
    // Add new states for person names functionality
    const [personNames, setPersonNames] = useState([]);
    const [isPersonNamePopupOpen, setIsPersonNamePopupOpen] = useState(false);
    const [newPersonName, setNewPersonName] = useState('');
    const [editingPersonName, setEditingPersonName] = useState(null);
    const [isPersonNamesLoading, setIsPersonNamesLoading] = useState(false);
    
    // Multi-product state
    const [selectedProducts, setSelectedProducts] = useState([]);
    
    // Calculated materials based on product mapping and carton quantity
    const [calculatedMaterials, setCalculatedMaterials] = useState([]);
    
    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Delivery Challan Detail Modal state
    const [isDCDetailModalOpen, setIsDCDetailModalOpen] = useState(false);
    const [selectedDCId, setSelectedDCId] = useState(null);
    
    // Add auth context to get logged-in user
    const { user } = useAuth();

    // Calculate materials when selected products change
    useEffect(() => {
        if (selectedProducts.length > 0) {
            const allMaterials = [];
            
            selectedProducts.forEach(product => {
                const mapping = productMappings.find(m => m.product_name === product.product_name);
                if (mapping) {
                    mapping.materials.forEach(material => {
                        const existingMaterial = allMaterials.find(m => m.material_name === material.material_name);
                        if (existingMaterial) {
                            existingMaterial.total_qty += material.qty_per_carton * product.carton_qty;
                        } else {
                            allMaterials.push({
                                material_name: material.material_name,
                                qty_per_carton: material.qty_per_carton,
                                total_qty: material.qty_per_carton * product.carton_qty
                            });
                        }
                    });
                }
            });
            
            setCalculatedMaterials(allMaterials);
        } else {
            setCalculatedMaterials([]);
        }
    }, [selectedProducts, productMappings]);

    // Initial data fetch
    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const [materialsResponse, mappingsResponse, suppliersResponse, historyResponse, personNamesResponse] = await Promise.all([
                    apiWithOfflineSupport.get('/materials'),
                    apiWithOfflineSupport.get('/product-mapping'),
                    apiWithOfflineSupport.getJobberSuppliers('packing'),
                    apiWithOfflineSupport.getDeliveryChallans(),
                    apiWithOfflineSupport.getPersonNames()
                ]);
                
                setMaterials(materialsResponse.data);
                setProductMappings(mappingsResponse.data);
                setSuppliers(suppliersResponse.data);
                setRecords(historyResponse.data);
                setPersonNames(personNamesResponse.data || []);
            } catch (err) {
                setError('Failed to load page data. Please try refreshing.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, []);

    // Add product to the selected products list
    const addProductToList = () => {
        if (!selectedProduct || !cartonQty || cartonQty <= 0) {
            toast.warn('⚠️ Please select a product and enter a valid carton quantity.');
            return;
        }
        
        const existingProduct = selectedProducts.find(p => p.product_name === selectedProduct.value);
        if (existingProduct) {
            toast.warn('⚠️ This product is already in the list.');
            return;
        }
        
        setSelectedProducts(prev => [
            ...prev,
            {
                product_name: selectedProduct.value,
                carton_qty: parseInt(cartonQty)
            }
        ]);
        
        setSelectedProduct(null);
        setCartonQty('');
    };

    // Remove product from the selected products list
    const removeProductFromList = (productName) => {
        setSelectedProducts(prev => prev.filter(p => p.product_name !== productName));
    };

    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (selectedProducts.length === 0) {
            toast.warn('⚠️ Please add at least one product to the list.');
            return;
        }
        
        if (unitType === 'Jobber' && !supplierId) {
            toast.warn('⚠️ Please select a supplier for Jobber unit type.');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const payload = {
                unit_type: unitType,
                products: selectedProducts,
                date: dcDate,
                remarks
            };
            
            if (unitType === 'Jobber') {
                payload.supplier_id = supplierId;
            }
            
            if (unitType === 'Own Unit') {
                payload.person_name = personName;
            }
            
            const response = await apiWithOfflineSupport.createDeliveryChallan(payload);
            
            if (response.queued) {
                toast.info('📋 Delivery Challan queued for sync. Will be created when online.');
            } else {
                toast.success('✅ Delivery Challan created and stock reserved.');
                
                // Reset form
                setUnitType('Own Unit');
                setSupplierId('');
                setSelectedProduct(null);
                setCartonQty('');
                setDcDate(new Date().toISOString().split('T')[0]);
                setRemarks('');
                setPersonName('');
                setSelectedProducts([]);
                setCalculatedMaterials([]);
                
                // Refresh history
                const historyResponse = await apiWithOfflineSupport.getDeliveryChallans();
                setRecords(historyResponse.data);
                
                // Refresh materials to show updated stock
                const materialsResponse = await apiWithOfflineSupport.get('/materials');
                setMaterials(materialsResponse.data);
            }
        } catch (err) {
            console.error('Error creating delivery challan:', err);
            if (err.response && err.response.data && err.response.data.message) {
                if (err.response.data.message.includes('Low Stock')) {
                    toast.warn(`⚠️ ${err.response.data.message}`);
                } else if (err.response.data.message.includes('Product mapping not found')) {
                    toast.warn('⚠️ No product mapping found. Please create mapping in Item Master.');
                } else {
                    toast.error(err.response.data.message);
                }
            } else {
                toast.error('❌ Failed to create delivery challan. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    
    // Function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-orange-100 text-orange-800',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };
    
    // Create options for react-select
    const productOptions = productMappings.map(mapping => ({
        value: mapping.product_name,
        label: mapping.product_name
    }));

    // Handler for DC detail modal
    const handleViewDCDetail = (dcId) => {
        setSelectedDCId(dcId);
        setIsDCDetailModalOpen(true);
    };
    
    // Handler for DC status update
    const handleDCStatusUpdate = (updatedDC) => {
        setRecords(prevRecords => 
            prevRecords.map(record => 
                record._id === updatedDC._id ? updatedDC : record
            )
        );
    };

    // ✅ NEW: Handle Direct PDF Download
    const handleDownloadPDF = async (dcNo) => {
        try {
            toast.info('📥 Downloading PDF...');
            const response = await apiWithOfflineSupport.get(`/api/delivery-challan/${dcNo}/pdf`, {
                responseType: 'blob'
            });
            
            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DC_${dcNo}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success('✅ PDF downloaded successfully!');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error('❌ Failed to download PDF. Please try again.');
        }
    };

    // ✅ NEW: Handle Direct Print Preview
    const handlePrintPDF = (dcNo) => {
        try {
            // Open PDF in new tab for printing
            const printUrl = `/api/delivery-challan/${dcNo}/pdf`;
            window.open(printUrl, '_blank');
            toast.info('🖨️ Opening print preview...');
        } catch (error) {
            console.error('Error opening print preview:', error);
            toast.error('❌ Failed to open print preview. Please try again.');
        }
    };
    
    // Functions for person name management
    const openPersonNamePopup = () => {
        setIsPersonNamePopupOpen(true);
        setNewPersonName('');
        setEditingPersonName(null);
    };
    
    const closePersonNamePopup = () => {
        setIsPersonNamePopupOpen(false);
        setNewPersonName('');
        setEditingPersonName(null);
    };
    
    const savePersonName = async () => {
        if (!newPersonName.trim()) {
            toast.warn('⚠️ Please enter a person name');
            return;
        }
        
        setIsPersonNamesLoading(true);
        
        try {
            if (editingPersonName !== null) {
                const response = await apiWithOfflineSupport.updatePersonName(
                    personNames[editingPersonName]._id,
                    { name: newPersonName.trim() }
                );
                
                const updatedPersonNames = [...personNames];
                updatedPersonNames[editingPersonName] = response.data;
                setPersonNames(updatedPersonNames);
                
                toast.success('✅ Person name updated successfully');
            } else {
                const response = await apiWithOfflineSupport.createPersonName({
                    name: newPersonName.trim()
                });
                
                setPersonNames(prev => [...prev, response.data]);
                toast.success('✅ Person name added successfully');
            }
            
            closePersonNamePopup();
        } catch (error) {
            console.error('Error saving person name:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('❌ Failed to save person name. Please try again.');
            }
        } finally {
            setIsPersonNamesLoading(false);
        }
    };
    
    const editPersonName = (index) => {
        setEditingPersonName(index);
        setNewPersonName(personNames[index].name);
        setIsPersonNamePopupOpen(true);
    };
    
    const deletePersonName = async (index) => {
        const personNameToDelete = personNames[index];
        
        try {
            await apiWithOfflineSupport.deletePersonName(personNameToDelete._id);
            
            const updatedPersonNames = personNames.filter((_, i) => i !== index);
            setPersonNames(updatedPersonNames);
            
            toast.success('✅ Person name deleted successfully');
        } catch (error) {
            console.error('Error deleting person name:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('❌ Failed to delete person name. Please try again.');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }
    
    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <ToastContainer position="top-right" autoClose={5000} />
            
            {/* Person Name Popup */}
            <Modal 
                isOpen={isPersonNamePopupOpen} 
                onClose={closePersonNamePopup} 
                title={editingPersonName !== null ? 'Edit Person Name' : 'Add Person Name'}
            >
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Person Name
                    </label>
                    <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter person name"
                    />
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={closePersonNamePopup}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={isPersonNamesLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={savePersonName}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        disabled={isPersonNamesLoading}
                    >
                        {isPersonNamesLoading ? 'Saving...' : (editingPersonName !== null ? 'Update' : 'Add')}
                    </button>
                </div>
                
                {/* List of existing person names */}
                {personNames.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Person Names</h4>
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {personNames.map((person, index) => (
                                    <li key={person._id} className="px-4 py-2 flex justify-between items-center">
                                        <span className="text-gray-700">{person.name}</span>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => editPersonName(index)}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                                                disabled={isPersonNamesLoading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deletePersonName(index)}
                                                className="text-red-600 hover:text-red-900 text-sm"
                                                disabled={isPersonNamesLoading}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Delivery Challan (Outgoing Packing Materials)
                </h1>
                <p className="text-gray-600 text-sm">
                    Manage material movement for both Own Unit and Jobber deliveries.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Delivery Challan Form */}
                <div className="lg:col-span-2">
                    <Card title="Create Delivery Challan">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Unit Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={unitType}
                                        onChange={(e) => setUnitType(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Own Unit">Own Unit</option>
                                        <option value="Jobber">Jobber</option>
                                    </select>
                                </div>
                                
                                {/* Supplier (only visible for Jobber) */}
                                {unitType === 'Jobber' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supplier <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={supplierId}
                                            onChange={(e) => setSupplierId(e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(supplier => (
                                                <option key={supplier._id} value={supplier._id}>
                                                    {supplier.name} ({supplier.supplierCode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                {/* Product Selection Section */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Selection
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-1">
                                            <Select
                                                value={selectedProduct}
                                                onChange={setSelectedProduct}
                                                options={productOptions}
                                                className="mt-1"
                                                placeholder="Select Product"
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={cartonQty}
                                                onChange={(e) => setCartonQty(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="Carton Quantity"
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-1">
                                            <button
                                                type="button"
                                                onClick={addProductToList}
                                                className="mt-1 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <FaPlus className="mr-2" /> Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Selected Products List */}
                                {selectedProducts.length > 0 && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Selected Products
                                        </label>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carton Quantity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedProducts.map((product, index) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {product.product_name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {product.carton_qty}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeProductFromList(product.product_name)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={dcDate}
                                        onChange={(e) => setDcDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                
                                {/* Remarks */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows="3"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Optional remarks"
                                    />
                                </div>
                                
                                {/* Person Name (only visible for Own Unit) */}
                                {unitType === 'Own Unit' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Person Name
                                        </label>
                                        <div className="flex space-x-2">
                                            <div className="flex-grow">
                                                <select
                                                    value={personName}
                                                    onChange={(e) => setPersonName(e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Select Person</option>
                                                    {personNames.map((person) => (
                                                        <option key={person._id} value={person.name}>
                                                            {person.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={openPersonNamePopup}
                                                className="mt-1 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center"
                                            >
                                                <FaPlus className="mr-1" /> Add
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Select or add a person to whom materials are being issued</p>
                                    </div>
                                )}
                                
                                {/* Issued By Field */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Issued By
                                    </label>
                                    <input
                                        type="text"
                                        value={user ? user.name : 'System'}
                                        readOnly
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">This field is automatically filled with your name</p>
                                </div>
                            </div>
                            
                            {/* Materials Table */}
                            {calculatedMaterials.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-700">Materials Required</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty per Carton</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {calculatedMaterials.map((material, index) => {
                                                    const materialInfo = materials.find(m => m.name === material.material_name);
                                                    const isLowStock = materialInfo && materialInfo.quantity < material.total_qty;
                                                    
                                                    return (
                                                        <tr key={index} className={isLowStock ? 'bg-red-50' : ''}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {material.material_name}
                                                                {isLowStock && (
                                                                    <span className="ml-2 text-xs text-red-600">
                                                                        <FaExclamationTriangle className="inline mr-1" />
                                                                        Low Stock
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.qty_per_carton}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.total_qty}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {/* Error Display */}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            
                            {/* Submit Button */}
                            <div className="text-right">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Delivery Challan'}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
                
                {/* Stock Information Card */}
                <div className="lg:col-span-1">
                    <Card title="Stock Information">
                        {calculatedMaterials.length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-gray-800">Total Material Required</h3>
                                <div className="space-y-2">
                                    {calculatedMaterials.map((material, index) => {
                                        const materialInfo = materials.find(m => m.name === material.material_name);
                                        const isLowStock = materialInfo && materialInfo.quantity < material.total_qty;
                                        
                                        return (
                                            <div key={index} className={`p-3 rounded-md ${isLowStock ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                                                <div className="flex justify-between">
                                                    <span className="font-medium text-gray-700">{material.material_name}</span>
                                                    <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {material.total_qty}
                                                    </span>
                                                </div>
                                                {materialInfo && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Available: <span className={isLowStock ? 'text-red-600 font-medium' : ''}>
                                                            {materialInfo.quantity}
                                                        </span>
                                                    </div>
                                                )}
                                                {isLowStock && (
                                                    <div className="text-xs text-red-600 mt-1 flex items-center">
                                                        <FaExclamationTriangle className="mr-1" />
                                                        Insufficient stock
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">Select a product and enter carton quantity to see material requirements.</p>
                        )}
                    </Card>
                </div>
            </div>
            
            {/* ✅ UPDATED: Delivery Challan History with PDF and Print Actions */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Delivery Challan History</h2>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cartons</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier / Person</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isHistoryLoading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center text-gray-500">
                                            <FaSpinner className="animate-spin mr-3" size={24} />
                                            <span>Loading History...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                        No delivery challan records found.
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.dc_no}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.unit_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {record.products && record.products.length > 0 ? (
                                                <div>
                                                    {record.products.map((product, index) => (
                                                        <div key={index}>
                                                            {product.product_name} ({product.carton_qty})
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                record.product_name
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {record.products && record.products.length > 0 ? (
                                                record.products.reduce((total, product) => total + (product.carton_qty || 0), 0)
                                            ) : (
                                                record.carton_qty
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {getStatusBadge(record.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {record.unit_type === 'Jobber' 
                                                ? (record.supplier_id ? record.supplier_id.name : 'N/A') 
                                                : (record.person_name || 'N/A')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.remarks || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {/* ✅ THREE ACTION BUTTONS - EXACTLY LIKE PURCHASE ORDER */}
                                            <div className="flex items-center space-x-3">
                                                {/* Eye Icon - View Details Modal */}
                                                <button
                                                    onClick={() => handleViewDCDetail(record._id)}
                                                    className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                                    title="View Details"
                                                >
                                                    <FaEye size={18} />
                                                </button>
                                                
                                                {/* Red PDF Icon - Direct Download */}
                                                <button
                                                    onClick={() => handleDownloadPDF(record.dc_no)}
                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <FaFilePdf size={18} />
                                                </button>
                                                
                                                {/* Green Print Icon - Direct Print Preview */}
                                                <button
                                                    onClick={() => handlePrintPDF(record.dc_no)}
                                                    className="text-green-600 hover:text-green-900 transition-colors"
                                                    title="Print PDF"
                                                >
                                                    <FaPrint size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Delivery Challan Detail Modal */}
            <DeliveryChallanDetailModal
                isOpen={isDCDetailModalOpen}
                onClose={() => setIsDCDetailModalOpen(false)}
                deliveryChallanId={selectedDCId}
                onStatusUpdate={handleDCStatusUpdate}
            />
        </div>
    );
};

export default OutgoingPackingMaterials;
