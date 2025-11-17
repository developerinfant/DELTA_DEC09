import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaInfoCircle, FaExclamationTriangle, FaRedo, FaBan } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { ArrowLeft } from 'lucide-react';

const CreateFGGRN = () => {
    const location = useLocation();
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [dcOptions, setDcOptions] = useState([]);
    const [selectedDCOption, setSelectedDCOption] = useState(null);
    const [dcDetails, setDcDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [damagedStock, setDamagedStock] = useState([]);
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasExistingGRN, setHasExistingGRN] = useState(false);
    const [existingGRNStatus, setExistingGRNStatus] = useState(null);
    const [isGRNLocked, setIsGRNLocked] = useState(false);
    const [completedGRN, setCompletedGRN] = useState(null);
    const [partialGRN, setPartialGRN] = useState(null);
    const [isEditingPartialGRN, setIsEditingPartialGRN] = useState(false);
    const [existingGRNId, setExistingGRNId] = useState(null);
    const [cartonsReturned, setCartonsReturned] = useState('');
    const [status, setStatus] = useState('');
    const [materialUsage, setMaterialUsage] = useState([]);
    const [isDamagedStockSaved, setIsDamagedStockSaved] = useState(false); // New state to track if damaged stock has been saved
    const navigate = useNavigate();

    const selectedDC = deliveryChallans.find(dc => dc._id === selectedDCOption?.value);
    
    // Create options for react-select dropdown
    useEffect(() => {
        const options = deliveryChallans.map(dc => ({
            value: dc._id,
            label: `${dc.dc_no} - ${dc.unit_type === 'Own Unit' ? (dc.person_name || 'N/A') : (dc.supplier_id?.name || 'N/A')} / ${dc.unit_type}`
        }));
        setDcOptions(options);
    }, [deliveryChallans]);
    
    // Function to calculate material usage based on cartons returned
    const calculateMaterialUsage = useCallback((dc, cartonsReturnedValue) => {
        if (!dc || !dc.materials) return [];
        
        const cartonsSent = dc.carton_qty || 0;
        const cartonsReturnedNum = parseInt(cartonsReturnedValue) || 0;
        
        return dc.materials.map(material => {
            const sentQty = material.total_qty || 0;
            // UsedQty = (CartonsReturned / CartonsSent) * SentQty
            const usedQty = cartonsSent > 0 ? (cartonsReturnedNum / cartonsSent) * sentQty : 0;
            // RemainingQty = SentQty - UsedQty
            const remainingQty = sentQty - usedQty;
            
            return {
                materialName: material.material_name,
                sentQty,
                usedQty: usedQty.toFixed(2),
                remainingQty: remainingQty.toFixed(2)
            };
        });
    }, []);

    // Update material usage when cartons returned changes
    useEffect(() => {
        if (dcDetails && cartonsReturned !== '') {
            const usage = calculateMaterialUsage(dcDetails, cartonsReturned);
            setMaterialUsage(usage);
            
            // Update status based on carton quantities
            const cartonsSent = dcDetails.carton_qty || 0;
            const cartonsReturnedNum = parseInt(cartonsReturned) || 0;
            
            if (cartonsReturnedNum > cartonsSent) {
                toast.error("Returned cartons cannot exceed sent cartons");
                setStatus("Error");
            } else if (cartonsReturnedNum < cartonsSent) {
                setStatus("Partial");
            } else {
                setStatus("Completed");
            }
        } else {
            setMaterialUsage([]);
        }
    }, [cartonsReturned, dcDetails, calculateMaterialUsage]);
    
    // Initialize damaged stock when dcDetails changes
    useEffect(() => {
        if (dcDetails) {
            const initialDamagedStock = dcDetails.materials.map(material => ({
                material_name: material.material_name,
                received_qty: material.received_qty !== undefined ? material.received_qty : (material.total_qty || 0),
                damaged_qty: 0
            }));
            setDamagedStock(initialDamagedStock);
        } else {
            setDamagedStock([]);
        }
    }, [dcDetails]);

    // Fetch all jobber delivery challans on component mount
    useEffect(() => {
        const fetchDeliveryChallans = async () => {
            try {
                setIsLoading(true);
                // Fetch all delivery challans for FG module (both Jobber and Own Unit)
                const response = await api.get('/delivery-challan');
                setDeliveryChallans(response.data);
            } catch (err) {
                setError('Failed to fetch Delivery Challans.');
                console.error('Error fetching Delivery Challans:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeliveryChallans();
    }, []);

    // Fetch DC details when one is selected
    useEffect(() => {
        if (selectedDCOption?.value) {
            const fetchDCDetails = async () => {
                try {
                    setIsLoading(true);
                    
                    // Fetch DC details
                    const dcResponse = await api.get(`/delivery-challan/${selectedDCOption.value}`);
                    const dcData = dcResponse.data;
                    setDcDetails(dcData);
                    
                    // Fetch existing GRNs for this DC to check for partial receipts
                    const grnResponse = await api.get(`/grn?deliveryChallan=${selectedDCOption.value}`);
                    const existingGRNs = grnResponse.data;
                    
                    // Filter to only jobber GRNs
                    const jobberGRNs = existingGRNs.filter(grn => grn.sourceType === 'jobber');
                    
                    // Calculate total sent quantity from DC
                    const totalSentQty = dcData.carton_qty || 0;
                    
                    // Calculate total received quantity from all existing GRNs for this DC
                    const totalReceivedQty = jobberGRNs.reduce((sum, grn) => sum + (grn.cartonsReturned || 0), 0);
                    
                    // Calculate pending quantity
                    const pendingQty = totalSentQty - totalReceivedQty;
                    
                    // Set initial values based on existing GRNs
                    if (jobberGRNs.length > 0) {
                        // Get the latest GRN
                        const latestGRN = jobberGRNs.reduce((latest, current) => 
                            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                        );
                        
                        // Show previous data section
                        setHasExistingGRN(true);
                        setExistingGRNStatus(latestGRN.status);
                        
                        // If the latest GRN is partial, we're editing it
                        setExistingGRNId(null);
                        setIsEditingPartialGRN(false);

                        // This logic correctly calculates and displays the pending quantity.
                        setPartialGRN({
                            totalSent: totalSentQty,
                            totalReceived: totalReceivedQty,
                            pending: pendingQty,
                            currentGRNReceived: 0
                        });
                        
                        // Always start with an empty input for the new receipt.
                        setCartonsReturned('');
                    } else {
                        // No existing GRNs
                        setCartonsReturned('');
                        setHasExistingGRN(false);
                        setExistingGRNStatus(null);
                        setExistingGRNId(null);
                        setIsEditingPartialGRN(false);
                        setPartialGRN({
                            totalSent: totalSentQty,
                            totalReceived: 0,
                            pending: totalSentQty,
                            currentGRNReceived: 0
                        });
                    }
                    
                    setStatus('');
                    setMaterialUsage([]);
                    
                    // Initialize items with received quantities from existing partial GRN if available
                    // For jobber delivery challans, we need to look up the material IDs
                    const initializedItems = [];
                    for (const material of dcData.materials) {
                        // Look up the material by name to get its ID
                        try {
                            // Use the updated API endpoint that supports name search
                            const materialResponse = await api.get(`/materials?name=${encodeURIComponent(material.material_name)}`);
                            const materialData = materialResponse.data.find(m => m.name === material.material_name);
                            
                            // If we're editing a partial GRN, use the received quantity from the latest GRN
                            let receivedQuantity = '';
                            if (jobberGRNs.length > 0) {
                                // Get the latest GRN
                                const latestGRN = jobberGRNs.reduce((latest, current) => 
                                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                                );
                                
                                if (latestGRN && latestGRN.items) {
                                    const grnItem = latestGRN.items.find(item => 
                                        typeof item.material === 'string' ? item.material === material.material_name : item.material.name === material.material_name
                                    );
                                    if (grnItem) {
                                        receivedQuantity = grnItem.receivedQuantity;
                                    }
                                }
                            }
                            
                            initializedItems.push({
                                material: materialData ? materialData._id : material.material_name, // Use ID if found, otherwise name
                                materialModel: 'PackingMaterial', // Jobber is always packing materials
                                orderedQuantity: material.total_qty,
                                receivedQuantity: receivedQuantity, // Use existing quantity if editing partial GRN
                                damagedQuantity: '', // Keep as empty string for controlled input
                                unitPrice: 0, // No price info for delivery challans
                                remarks: '',
                            });
                        } catch (materialError) {
                            // If we can't find the material, just use the name
                            console.error('Error looking up material:', materialError);
                            
                            // If we're editing a partial GRN, use the received quantity from the latest GRN
                            let receivedQuantity = '';
                            if (jobberGRNs.length > 0) {
                                // Get the latest GRN
                                const latestGRN = jobberGRNs.reduce((latest, current) => 
                                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                                );
                                
                                if (latestGRN && latestGRN.items) {
                                    const grnItem = latestGRN.items.find(item => 
                                        typeof item.material === 'string' ? item.material === material.material_name : item.material.name === material.material_name
                                    );
                                    if (grnItem) {
                                        receivedQuantity = grnItem.receivedQuantity;
                                    }
                                }
                            }
                            
                            initializedItems.push({
                                material: material.material_name,
                                materialModel: 'PackingMaterial', // Jobber is always packing materials
                                orderedQuantity: material.total_qty,
                                receivedQuantity: receivedQuantity, // Use existing quantity if editing partial GRN
                                damagedQuantity: '', // Keep as empty string for controlled input
                                unitPrice: 0, // No price info for delivery challans
                                remarks: '',
                            });
                        }
                    }
                    
                    setItems(initializedItems);
                    
                    // Initialize damaged stock with received quantities from DC
                    const initialDamagedStock = dcData.materials.map(material => ({
                        material_name: material.material_name,
                        received_qty: material.received_qty !== undefined ? material.received_qty : (material.total_qty || 0),
                        damaged_qty: 0
                    }));
                    setDamagedStock(initialDamagedStock);
                } catch (err) {
                    setError('Failed to fetch Delivery Challan details.');
                    console.error('Error fetching DC details:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDCDetails();
        } else {
            setDcDetails(null);
            setItems([]);
            setHasExistingGRN(false);
            setExistingGRNStatus(null);
            setIsGRNLocked(false);
            setCompletedGRN(null);
            setPartialGRN(null);
            setExistingGRNId(null);
            setIsEditingPartialGRN(false);
            setCartonsReturned('');
            setMaterialUsage([]);
            setDamagedStock([]);
        }
    }, [selectedDCOption]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        // Keep values as strings for controlled inputs, convert to numbers only when submitting
        newItems[index][field] = value;
        setItems(newItems);
    };
    
    const handleDamagedQtyChange = (index, value) => {
        const newDamagedStock = [...damagedStock];
        const receivedQty = newDamagedStock[index].received_qty;
        const damagedQty = Math.max(0, Math.min(receivedQty, parseInt(value) || 0));
        newDamagedStock[index].damaged_qty = damagedQty;
        setDamagedStock(newDamagedStock);
        setIsDamagedStockSaved(false); // Reset saved state when user makes changes
    };

    // New function to handle saving damaged stock
    const handleSaveDamagedStock = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // Filter items with damaged quantity > 0
            const itemsWithDamage = damagedStock.filter(item => item.damaged_qty > 0);
            
            if (itemsWithDamage.length === 0) {
                toast.warn('No damaged items to record');
                return;
            }
            
            // Since we're creating a new GRN, we can't save damaged stock to the database yet
            // We'll just mark it as saved and include it in the GRN submission
            setIsDamagedStockSaved(true);
            toast.success('Damaged stock entries saved. They will be recorded when you create the GRN.');
        } catch (err) {
            console.error('Failed to save damaged stock entries:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to save damaged stock entries. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // New function to reset damaged stock
    const handleResetDamagedStock = () => {
        if (dcDetails) {
            const resetDamagedStock = dcDetails.materials.map(material => ({
                material_name: material.material_name,
                received_qty: material.received_qty !== undefined ? material.received_qty : (material.total_qty || 0),
                damaged_qty: 0
            }));
            setDamagedStock(resetDamagedStock);
            setIsDamagedStockSaved(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Prevent submission if GRN is locked
        if (isGRNLocked) {
            setError('This GRN is locked and cannot be modified.');
            setIsLoading(false);
            return;
        }

        // Validate carton quantities
        if (dcDetails) {
            const cartonsReturnedNum = parseInt(cartonsReturned);
            const cartonsSent = dcDetails.carton_qty || 0;
            
            // Calculate total received quantity from all existing GRNs for this DC (excluding current GRN if editing)
            let totalReceived = 0;
            if (hasExistingGRN && partialGRN) {
                totalReceived = partialGRN.totalReceived;
                // If we're editing a partial GRN, subtract the current GRN's cartonsReturned
                if (isEditingPartialGRN && partialGRN.currentGRNReceived) {
                    totalReceived = totalReceived - partialGRN.currentGRNReceived;
                }
            }
            
            // Calculate pending cartons based on existing GRNs
            const pendingCartons = cartonsSent - totalReceived;
            
            if (cartonsReturned === '') {
                setError('Please enter the number of cartons returned.');
                setIsLoading(false);
                return;
            }
            
            // Validate that newReceivedQty > 0 and ≤ pendingQty
            if (cartonsReturnedNum <= 0) {
                setError('Returned cartons must be greater than zero.');
                setIsLoading(false);
                return;
            }
            
            if (cartonsReturnedNum > pendingCartons) {
                setError(`Returned cartons cannot exceed pending cartons. Pending: ${pendingCartons}`);
                setIsLoading(false);
                return;
            }
            
            // Validate receiver name
            if (!receivedBy || receivedBy.trim() === '') {
                setError('Receiver name is required.');
                setIsLoading(false);
                return;
            }
            
            // Validate damaged stock quantities
            if (damagedStock && Array.isArray(damagedStock)) {
                for (const item of damagedStock) {
                    const receivedQty = item.received_qty || 0;
                    const damagedQty = item.damaged_qty || 0;
                    
                    if (damagedQty > receivedQty) {
                        setError(`Damaged quantity for ${item.material_name} cannot exceed received quantity.`);
                        setIsLoading(false);
                        return;
                    }
                }
            }
            
            // Set status based on carton quantities
            let grnStatus = 'Partial';
            if (cartonsReturnedNum === pendingCartons) {
                grnStatus = 'Completed';
                toast.success("GRN and Delivery Challan marked as Completed.");
            } else {
                toast.warn("GRN saved as Partial.");
            }
            
            setStatus(grnStatus);
        }
        
        // Prepare GRN data - only for jobber DCs
        const grnData = {
            deliveryChallanId: selectedDCOption?.value,
            cartonsReturned: parseInt(cartonsReturned),
            receivedBy,
            dateReceived,
            damagedStock, // Include damaged stock data
        };

        
        try {
            // We are now ALWAYS creating a new GRN, so we only need the api.post call.
            const response = await api.post('/grn', grnData);
            toast.success('GRN created successfully!');
            
            setSuccess('GRN created successfully!');
            // Redirect to FG GRN view page
            setTimeout(() => {
                navigate('/fg/grn/view');
            }, 2000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create/update GRN.';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('Error creating/updating GRN:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedDCOption(null);
        setDcDetails(null);
        setItems([]);
        setReceivedBy('');
        setDateReceived(new Date().toISOString().split('T')[0]);
        setCartonsReturned('');
        setStatus('');
        setMaterialUsage([]);
        setError('');
        setSuccess('');
        setHasExistingGRN(false);
        setExistingGRNStatus(null);
        setIsGRNLocked(false);
        setCompletedGRN(null);
        setPartialGRN(null);
        setExistingGRNId(null);
        setIsEditingPartialGRN(false);
        setIsDamagedStockSaved(false); // Reset damaged stock saved state
    };

    if (isLoading && !dcDetails) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-3xl text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                    <Link 
                        to="/fg/grn/view"
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
                    >
                        <ArrowLeft size={18} /> Back to GRN List
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Finished Goods GRN (DC-based)</h1>
                        <p className="text-gray-600 text-sm mt-1">Create a new GRN entry based on a Delivery Challan</p>
                    </div>
                </div>
            </div>

            <Card>
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
                        <FaExclamationTriangle className="mr-2" />
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* DC Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Delivery Challan *
                            </label>
                            <Select
                                options={dcOptions}
                                placeholder="Search or Select Delivery Challan..."
                                isSearchable
                                isClearable
                                menuPlacement="auto"
                                value={selectedDCOption}
                                onChange={(selected) => setSelectedDCOption(selected)}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderColor: "#ff7f00",
                                        boxShadow: "none",
                                        "&:hover": { borderColor: "#ff7f00" },
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isFocused ? "#fff3e0" : "white",
                                        color: "#000",
                                    }),
                                }}
                                isDisabled={isLoading}
                            />
                            {selectedDCOption && (
                                <div className="mt-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="font-medium text-blue-800">
                                        {selectedDCOption.label}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DC Details */}
                    {dcDetails && (
                        <div className="space-y-6">
                            {/* Previous Data Section */}
                            {hasExistingGRN && partialGRN && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <h3 className="font-medium text-orange-800 mb-3">Previous GRN Data</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Total Sent:</span> {partialGRN.totalSent}
                                        </div>
                                        <div>
                                            <span className="font-medium">Total Received:</span> {partialGRN.totalReceived}
                                        </div>
                                        <div>
                                            <span className="font-medium">Pending:</span> {partialGRN.pending}
                                        </div>
                                        {isEditingPartialGRN && partialGRN.currentGRNReceived !== undefined && (
                                            <div>
                                                <span className="font-medium">Current GRN Received:</span> {partialGRN.currentGRNReceived}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-medium text-blue-800 mb-3">Delivery Challan Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">DC Number:</span> {dcDetails.dc_no}
                                    </div>
                                    <div>
                                        <span className="font-medium">Issued To:</span> {dcDetails.unit_type === 'Own Unit' ? (dcDetails.person_name || 'N/A') : (dcDetails.supplier_id?.name || 'N/A')} / {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                    </div>
                                    <div>
                                        <span className="font-medium">Date:</span> {new Date(dcDetails.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                                    </div>
                                    <div>
                                        <span className="font-medium">Cartons Sent:</span> {dcDetails.carton_qty || 0}
                                    </div>
                                    <div>
                                        <span className="font-medium">Unit Type:</span> {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                    </div>
                                    <div>
                                        <span className="font-medium">Status:</span> 
                                        <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            dcDetails.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                            dcDetails.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                                            dcDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {dcDetails.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Carton Information */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cartons Received *
                                    </label>
                                    <input
                                        type="number"
                                        value={cartonsReturned}
                                        onChange={(e) => setCartonsReturned(e.target.value)}
                                        className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        min="0"
                                        disabled={isLoading || isGRNLocked}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Receiver Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isLoading || isGRNLocked}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date Received *
                                    </label>
                                    <input
                                        type="date"
                                        value={dateReceived}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isLoading || isGRNLocked}
                                    />
                                </div>
                            </div>

                            {/* Material Usage Calculation */}
                            {/* {materialUsage.length > 0 && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-medium text-gray-800 mb-3">Material Usage Calculation</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used Qty</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {materialUsage.map((usage, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.materialName}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.sentQty}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.usedQty}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.remainingQty}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )} */}
                            
                            {/* Record Damaged Stock */}
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h3 className="font-medium text-gray-900 mb-3">Record Damaged Stock</h3>
                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
                                        {error}
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {damagedStock.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                        {item.material_name}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                                        {item.received_qty}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.received_qty}
                                                            value={item.damaged_qty}
                                                            onChange={(e) => handleDamagedQtyChange(index, e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                <div className="flex justify-end space-x-3 mt-4">
                                    <button
                                        type="button"
                                        onClick={handleResetDamagedStock}
                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                        disabled={isLoading}
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveDamagedStock}
                                        className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <FaSpinner className="animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Damaged Stock'
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="px-6 py-2.5 text-sm font-medium text-dark-700 bg-light-200 rounded-lg hover:bg-light-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-500"
                                    disabled={isLoading}
                                >
                                    Reset
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
                                    disabled={isLoading || isGRNLocked}
                                >
                                    {isLoading ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FaRedo className="mr-2" />
                                            Create GRN
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
};

export default CreateFGGRN;