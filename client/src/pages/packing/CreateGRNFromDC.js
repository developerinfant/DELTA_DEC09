import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import apiWithOfflineSupport from '../../utils/apiWithOfflineSupport';
import Card from '../../components/common/Card';
import { FaSpinner, FaInfoCircle, FaExclamationTriangle, FaBan, FaRedo, FaPlus, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

const CreateGRNFromDC = () => {
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [selectedDCId, setSelectedDCId] = useState('');
    const [dcDetails, setDcDetails] = useState(null);
    const [cartonsReturned, setCartonsReturned] = useState('');
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isDCCompleted, setIsDCCompleted] = useState(false);
    const [hasExistingGRN, setHasExistingGRN] = useState(false);
    const [existingGRNStatus, setExistingGRNStatus] = useState(null);
    const [showDamagedStockModal, setShowDamagedStockModal] = useState(false);
    const [damagedStockItems, setDamagedStockItems] = useState([]);
    const [damagedStockData, setDamagedStockData] = useState({
        grn_id: '',
        dc_no: '',
        product_name: ''
    });
    const navigate = useNavigate();

    // Prevent accidental page refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (selectedDCId || dcDetails || cartonsReturned || receivedBy) {
                e.preventDefault();
                e.returnValue = ''; // Prevent accidental reload
                return '';
            }
        };
        
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [selectedDCId, dcDetails, cartonsReturned, receivedBy]);

    // Fetch all jobber delivery challans (both Partial and Completed)
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates after component unmount
        
        const fetchDCs = async () => {
            try {
                setIsLoading(true);
                setError('');
                
                const { data } = await apiWithOfflineSupport.getDeliveryChallans({
                    unitType: 'Jobber'
                    // Removed status filter to fetch all DCs (Partial and Completed)
                });
                
                // Only update state if component is still mounted
                if (isMounted) {
                    // Sort by date descending (latest first)
                    const sortedDCs = data.sort((a, b) => new Date(b.date) - new Date(a.date));
                    setDeliveryChallans(sortedDCs);
                }
            } catch (err) {
                // Only update state if component is still mounted
                if (isMounted) {
                    console.error('Failed to fetch delivery challans:', err);
                    const errorMessage = err.response?.data?.message || 
                                        err.message || 
                                        'Failed to fetch delivery challans. Please refresh the page.';
                    setError(errorMessage);
                    toast.error(errorMessage);
                    setDeliveryChallans([]); // Set to empty array on error
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        
        fetchDCs();
        
        // Cleanup function to set isMounted to false when component unmounts
        return () => {
            isMounted = false;
        };
    }, []); // Keep this empty since we only want to fetch once on mount

    // Handle DC selection with useCallback to prevent unnecessary re-renders
    const handleDCSelect = useCallback(async (dcId) => {
        if (!dcId) {
            setDcDetails(null);
            setCartonsReturned('');
            setSelectedDCId('');
            return;
        }

        setSelectedDCId(dcId);
        setIsLoading(true);
        setError('');
        
        try {
            // Fetch DC details
            const { data: dc } = await apiWithOfflineSupport.getDeliveryChallanById(dcId);
            
            // Check if there's already a GRN for this DC
            const grnResponse = await api.get(`/grn?deliveryChallan=${dcId}`);
            const existingGRNs = grnResponse.data;
            
            if (existingGRNs.length > 0) {
                const latestGRN = existingGRNs[0];
                setHasExistingGRN(true);
                setExistingGRNStatus(latestGRN.status);
                
                // If GRN is completed, show completed data
                if (latestGRN.status === 'Completed' || latestGRN.status === 'Damage Completed') {
                    setIsDCCompleted(true);
                    setCartonsReturned(latestGRN.cartonsReturned || '');
                    setReceivedBy(latestGRN.receivedBy || '');
                    setDateReceived(latestGRN.dateReceived ? new Date(latestGRN.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                    setDcDetails(dc);
                    return;
                } else if (latestGRN.status === 'Damage Pending') {
                    // If GRN is in damage pending status, still allow editing
                    setIsDCCompleted(false);
                    setCartonsReturned(latestGRN.cartonsReturned || '');
                    setReceivedBy(latestGRN.receivedBy || '');
                    setDateReceived(latestGRN.dateReceived ? new Date(latestGRN.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                    setDcDetails(dc);
                    return;
                }
            } else {
                setHasExistingGRN(false);
                setExistingGRNStatus(null);
                setIsDCCompleted(false);
            }
            
            // Initialize cartons returned with default value
            setCartonsReturned('');
            setDcDetails(dc);
        } catch (err) {
            console.error('Failed to fetch delivery challan details:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to fetch delivery challan details. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
            setDcDetails(null);
            setCartonsReturned('');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch GRN items for damaged stock recording
    const fetchGRNItemsForDamagedStock = async () => {
        if (!selectedDCId || !dcDetails) return;
        
        // Check if GRN exists
        if (!hasExistingGRN) {
            toast.info('Please create the GRN first before recording damaged stock');
            return;
        }
        
        try {
            // Get the existing GRN ID
            const grnResponse = await api.get(`/grn?deliveryChallan=${selectedDCId}`);
            const existingGRNs = grnResponse.data;
            
            if (existingGRNs.length === 0) {
                toast.error('No existing GRN found for this Delivery Challan');
                return;
            }
            
            const latestGRN = existingGRNs[0];
            const grn_id = latestGRN._id;
            const dc_no = dcDetails.dc_no;
            const product_name = dcDetails.product_name;
            
            // Format items for damaged stock recording
            const damagedItems = latestGRN.items.map(item => ({
                material_name: typeof item.material === 'string' ? item.material : item.material.name,
                sent_qty: item.orderedQuantity || item.receivedQuantity,
                received_qty: item.receivedQuantity,
                damaged_qty: 0, // Will be entered by user
                available_stock: 0 // Will be fetched from PackingMaterial
            }));
            
            // Fetch available stock for each material
            const itemsWithStock = await Promise.all(damagedItems.map(async (item) => {
                try {
                    const stockResponse = await api.get(`/packing/material-stock/${encodeURIComponent(item.material_name)}`);
                    return {
                        ...item,
                        available_stock: stockResponse.data.quantity || 0
                    };
                } catch (err) {
                    console.error(`Failed to fetch stock for ${item.material_name}:`, err);
                    return {
                        ...item,
                        available_stock: 0
                    };
                }
            }));
            
            setDamagedStockData({
                grn_id,
                dc_no,
                product_name
            });
            
            setDamagedStockItems(itemsWithStock);
            setShowDamagedStockModal(true);
        } catch (err) {
            console.error('Failed to fetch GRN items for damaged stock:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to fetch GRN items for damaged stock. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    // Handle damaged stock item change
    const handleDamagedStockItemChange = (index, field, value) => {
        const updatedItems = [...damagedStockItems];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };
        
        // Validate that damaged quantity doesn't exceed received quantity
        if (field === 'damaged_qty') {
            const receivedQty = updatedItems[index].received_qty;
            if (value > receivedQty) {
                toast.error(`Damaged quantity cannot exceed received quantity (${receivedQty})`);
                updatedItems[index][field] = receivedQty;
            }
        }
        
        setDamagedStockItems(updatedItems);
    };

    // Save damaged stock entries
    const saveDamagedStockEntries = async () => {
        try {
            // Filter items with damaged quantity > 0
            const itemsWithDamage = damagedStockItems.filter(item => item.damaged_qty > 0);
            
            if (itemsWithDamage.length === 0) {
                toast.warn('No damaged items to record');
                setShowDamagedStockModal(false);
                return;
            }
            
            // Create damaged stock entries for each item
            const promises = itemsWithDamage.map(item => {
                return api.post('/damaged-stock', {
                    grn_id: damagedStockData.grn_id,
                    dc_no: damagedStockData.dc_no,
                    product_name: damagedStockData.product_name,
                    material_name: item.material_name,
                    received_qty: item.received_qty,
                    damaged_qty: item.damaged_qty,
                    remarks: 'Recorded during GRN creation'
                });
            });
            
            await Promise.all(promises);
            
            // Update the GRN status to "Damage Pending"
            try {
                await api.put(`/grn/${damagedStockData.grn_id}`, {
                    status: 'Damage Pending'
                });
                toast.success('GRN status updated to Damage Pending');
            } catch (updateErr) {
                console.error('Failed to update GRN status:', updateErr);
                // Don't fail the whole operation if we can't update the GRN status
            }
            
            toast.success('Damaged stock entries recorded successfully');
            setShowDamagedStockModal(false);
            
            // Refresh the GRN data
            if (selectedDCId) {
                handleDCSelect(selectedDCId);
            }
        } catch (err) {
            console.error('Failed to save damaged stock entries:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to save damaged stock entries. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        // Clear previous messages
        setError('');
        setSuccess('');
        
        // Validate form
        if (!selectedDCId) {
            const errorMessage = 'Please select a delivery challan.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        if (!receivedBy.trim()) {
            const errorMessage = 'Please enter who received the materials.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        if (cartonsReturned === '') {
            const errorMessage = 'Please enter the number of cartons returned.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        const cartonsReturnedNum = parseInt(cartonsReturned);
        const cartonsSent = dcDetails?.carton_qty || 0;
        
        if (cartonsReturnedNum > cartonsSent) {
            const errorMessage = 'Returned cartons cannot exceed sent cartons.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        if (cartonsReturnedNum <= 0) {
            const errorMessage = 'Returned cartons must be greater than zero.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Prepare GRN data
            const grnData = {
                deliveryChallanId: selectedDCId,
                cartonsReturned: cartonsReturnedNum,
                receivedBy,
                dateReceived,
            };
            
            // Create GRN from delivery challan
            const response = await apiWithOfflineSupport.createGRNFromDeliveryChallan(grnData);
            
            if (response.queued) {
                setSuccess('GRN creation queued for sync. Will be created when online.');
                toast.info('GRN creation queued for sync. Will be created when online.');
                // Keep the form data so user can see what was queued
            } else {
                setSuccess('GRN created successfully from Delivery Challan!');
                toast.success('GRN created successfully from Delivery Challan!');
                
                // Update state to reflect that GRN now exists
                setHasExistingGRN(true);
                setExistingGRNStatus('Completed');
                
                // Reset form after a delay to let user see success message
                setTimeout(() => {
                    // Reset all form state
                    setSelectedDCId('');
                    setDcDetails(null);
                    setCartonsReturned('');
                    setReceivedBy('');
                    setDateReceived(new Date().toISOString().split('T')[0]);
                    setHasExistingGRN(false);
                    setExistingGRNStatus(null);
                    setIsDCCompleted(false);
                    setSuccess('');
                    // Navigate to GRN list
                    navigate('/packing/grn/view');
                }, 2000);
            }
        } catch (err) {
            console.error('GRN creation error:', err); // Log for debugging
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to create GRN from delivery challan. Please try again.';
            setError(errorMessage);
            toast.error(`Server Error: GRN could not be created. Please check Delivery Challan data and retry.`);
        } finally {
            setIsLoading(false);
        }
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
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    // Determine if form should be disabled
    const isFormDisabled = isDCCompleted || (hasExistingGRN && existingGRNStatus === 'Completed');

    // Calculate carton balance
    const cartonBalance = dcDetails ? (dcDetails.carton_qty || 0) - (parseInt(cartonsReturned) || 0) : 0;

    // Retry fetching delivery challans
    const retryFetchDCs = async () => {
        try {
            setIsLoading(true);
            setError('');
            const { data } = await apiWithOfflineSupport.getDeliveryChallans({
                unitType: 'Jobber'
            });
            const sortedDCs = data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setDeliveryChallans(sortedDCs);
            toast.success('Delivery challan list refreshed successfully');
        } catch (err) {
            const errorMessage = 'Failed to fetch delivery challans. Please refresh the page.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Create GRN from Delivery Challan</h1>
                <p className="text-gray-600 mt-2">Create a Goods Receipt Note based on a Jobber Delivery Challan</p>
            </div>
            
            {success && (
                <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-xl flex items-center border border-green-200">
                    <FaInfoCircle className="mr-3 text-xl" />
                    <div>
                        <h3 className="font-bold">Success!</h3>
                        <p>{success}</p>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-xl flex items-center border border-red-200">
                    <FaExclamationTriangle className="mr-3 text-xl flex-shrink-0" />
                    <div className="flex-1">
                        <h3 className="font-bold">Error</h3>
                        <p>{error}</p>
                    </div>
                    <button 
                        onClick={retryFetchDCs}
                        className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center"
                    >
                        <FaRedo className="mr-1" /> Retry
                    </button>
                </div>
            )}
            
            <Card title="Delivery Challan Selection" className="mb-6 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Delivery Challan <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedDCId}
                            onChange={(e) => handleDCSelect(e.target.value)}
                            className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            disabled={isLoading}
                        >
                            <option value="">Select a Delivery Challan</option>
                            {deliveryChallans
                                // Show all DCs (both Partial and Completed) with clear labeling
                                .map(dc => (
                                    <option key={dc._id} value={dc._id}>
                                        {dc.dc_no} ({dc.status}) - {dc.supplier_id?.name || 'N/A'} - {dc.product_name}
                                    </option>
                                ))}
                        </select>
                    </div>
                    
                    {dcDetails && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-bold text-lg mb-2">Delivery Challan Details</h3>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-gray-500">DC Number</p>
                                    <p className="font-medium">{dcDetails.dc_no}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Supplier</p>
                                    <p className="font-medium">{dcDetails.supplier_id?.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Product</p>
                                    <p className="font-medium">{dcDetails.product_name}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Cartons</p>
                                    <p className="font-medium">{dcDetails.carton_qty}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Date</p>
                                    <p className="font-medium">
                                        {new Date(dcDetails.date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Status</p>
                                    <p className="font-medium">
                                        {getStatusBadge(dcDetails.status)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            
            {dcDetails && (
                <>
                    {/* Warning banners */}
                    {isDCCompleted && (
                        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-xl border border-green-200 flex items-start">
                            <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                            <div>
                                <h3 className="font-bold">✅ Delivery Challan Fully Received</h3>
                                <p>This Delivery Challan has been fully received. GRN creation is disabled.</p>
                            </div>
                        </div>
                    )}
                    
                    {hasExistingGRN && existingGRNStatus === 'Completed' && (
                        <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-xl border border-green-200 flex items-start">
                            <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                            <div>
                                <h3 className="font-bold">✅ GRN Already Completed</h3>
                                <p>A GRN has already been completed for this Delivery Challan. Creation is disabled.</p>
                            </div>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Card title="GRN Details" className="shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Received By <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Name of person who received materials"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Date Received <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={dateReceived}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </div>
                        </Card>
                        
                        <Card title="Carton Return Details" className="shadow-xl">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cartons Sent</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cartons Received</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                            <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{dcDetails.product_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-blue-600">{dcDetails.carton_qty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={dcDetails.carton_qty}
                                                    value={cartonsReturned}
                                                    onChange={(e) => {
                                                        // Prevent returning more than sent
                                                        const value = Math.min(parseInt(e.target.value) || 0, dcDetails.carton_qty);
                                                        setCartonsReturned(value.toString());
                                                    }}
                                                    className="w-24 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-center"
                                                    disabled={isFormDisabled}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className={`text-sm font-bold ${cartonBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {cartonBalance}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                {cartonsReturned !== '' && (
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                        parseInt(cartonsReturned) === dcDetails.carton_qty 
                                                            ? 'bg-green-100 text-green-800' 
                                                            : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                        {parseInt(cartonsReturned) === dcDetails.carton_qty ? 'Completed' : 'Partial'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                        
                        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                            <button
                                type="button"
                                onClick={() => navigate('/packing/grn/view')}
                                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={fetchGRNItemsForDamagedStock}
                                className="px-6 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 flex items-center transition-colors shadow-sm hover:shadow-md"
                                disabled={isFormDisabled || !hasExistingGRN}
                            >
                                <FaPlus className="mr-2" />
                                Record Damaged Stock
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || isFormDisabled}
                                className="px-6 py-2 text-white bg-primary-600 hover:bg-primary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed flex items-center transition-colors shadow-sm hover:shadow-md"
                            >
                                {isLoading ? (
                                    <>
                                        <FaSpinner className="animate-spin mr-2" />
                                        Creating GRN...
                                    </>
                                ) : (
                                    'Create GRN from Delivery Challan'
                                )}
                            </button>
                        </div>

                    </form>
                </>
            )}
            
            {/* Damaged Stock Modal */}
            {showDamagedStockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Record Damaged Stock</h3>
                            <button
                                onClick={() => setShowDamagedStockModal(false)}
                                className="text-gray-400 hover:text-gray-500 rounded-full p-1 hover:bg-gray-100 transition-colors"
                            >
                                <FaTimes className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="p-6">
                            <div className="mb-6 bg-gray-50 rounded-lg p-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">DC No</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900">{damagedStockData.dc_no}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Product</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900">{damagedStockData.product_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">GRN ID</label>
                                        <p className="mt-1 text-sm font-medium text-gray-900">{damagedStockData.grn_id}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Available Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {damagedStockItems.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {item.material_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {item.sent_qty || item.received_qty}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {item.received_qty}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.received_qty}
                                                        value={item.damaged_qty}
                                                        onChange={(e) => handleDamagedStockItemChange(index, 'damaged_qty', parseInt(e.target.value) || 0)}
                                                        className="w-24 px-3 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                                    {item.available_stock}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDamagedStockModal(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveDamagedStockEntries}
                                    className="px-4 py-2 text-white bg-amber-600 hover:bg-amber-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors"
                                >
                                    Save Damaged Stock
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateGRNFromDC;