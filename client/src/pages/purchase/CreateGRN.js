import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaInfoCircle, FaExclamationTriangle, FaRedo, FaBan, FaEdit, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

// This form can be its own component if it becomes more complex
const GRNForm = ({ purchaseOrders, deliveryChallans, onCreate, onRefreshPOs, returnPath }) => {
    const location = useLocation();
    // Set default source type to 'purchase_order' and remove jobber option
    const [sourceType, setSourceType] = useState('purchase_order'); // Always default to purchase order
    const [selectedPOId, setSelectedPOId] = useState('');
    const [selectedDCId, setSelectedDCId] = useState('');
    const [poDetails, setPoDetails] = useState(null);
    const [dcDetails, setDcDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isPOCancelled, setIsPOCancelled] = useState(false);
    const [hasExistingGRN, setHasExistingGRN] = useState(false);
    const [existingGRNStatus, setExistingGRNStatus] = useState(null);
    const [isGRNLocked, setIsGRNLocked] = useState(false);
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const [redirectId, setRedirectId] = useState(null);
    const [completedGRN, setCompletedGRN] = useState(null); // New state for completed GRN data
    const [partialGRN, setPartialGRN] = useState(null); // New state for partial GRN data
    const [isEditingPartialGRN, setIsEditingPartialGRN] = useState(false); // State to track if we're editing a partial GRN
    const [existingGRNId, setExistingGRNId] = useState(null); // Store the existing GRN ID
    const [cartonsReturned, setCartonsReturned] = useState(''); // Add cartonsReturned state for jobber DC
    const [status, setStatus] = useState(''); // Add status state for carton tracking
    const [materialUsage, setMaterialUsage] = useState([]); // Add state for material usage calculations
    const navigate = useNavigate();

    const selectedPO = purchaseOrders.find(po => po._id === selectedPOId);
    const selectedDC = deliveryChallans.find(dc => dc._id === selectedDCId);
    
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
        if (sourceType === 'jobber' && dcDetails && cartonsReturned !== '') {
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
    }, [cartonsReturned, dcDetails, sourceType, calculateMaterialUsage]);

    // Fetch full PO details when one is selected
    useEffect(() => {
        // Only handle purchase order logic since jobber option is removed
        if (sourceType === 'purchase_order' && selectedPOId) {
            const fetchPODetails = async () => {
                try {
                    setIsLoading(true);
                    const { data } = await api.get(`/purchase-orders/${selectedPOId}`);
                    setPoDetails(data);
                    setIsPOCancelled(data.status === 'Cancelled');
                    
                    // Check if there's already a GRN for this PO
                    try {
                        const response = await api.get(`/grn/check-po/${selectedPOId}`);
                        const checkResult = response.data;
                        
                        if (checkResult.action === 'redirect_to_edit') {
                            // Instead of redirecting, load the partial GRN data inline
                            try {
                                const grnResponse = await api.get(`/grn?purchaseOrder=${selectedPOId}`);
                                const existingGRNs = grnResponse.data.filter(grn => grn.isSubmitted);
                                
                                if (existingGRNs.length > 0) {
                                    const partialGRN = existingGRNs.find(grn => grn.status === 'Partial');
                                    if (partialGRN) {
                                        setPartialGRN(partialGRN);
                                        setExistingGRNId(partialGRN._id);
                                        setHasExistingGRN(true);
                                        setExistingGRNStatus('Partial');
                                        setIsGRNLocked(partialGRN.isLocked);
                                        
                                        // Map the partial GRN items to the items state for editing
                                        setItems(partialGRN.items.map(item => ({
                                            material: item.material._id || item.material,
                                            materialModel: item.materialModel,
                                            orderedQuantity: item.orderedQuantity || item.quantity || 0,
                                            receivedQuantity: String(item.receivedQuantity || 0),
                                            damagedQuantity: String(item.damagedQuantity || 0),
                                            unitPrice: item.unitPrice || 0,
                                            remarks: item.remarks || '',
                                        })));
                                        
                                        // Set other GRN details
                                        setReceivedBy(partialGRN.receivedBy || '');
                                        setDateReceived(partialGRN.dateReceived ? new Date(partialGRN.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                                    }
                                }
                            } catch (grnError) {
                                console.log('Error fetching partial GRN:', grnError);
                                setError('Error loading existing partial GRN data.');
                            }
                            return;
                        } else if (checkResult.action === 'block') {
                            // Show error and block creation
                            setError(checkResult.message);
                            
                            // Fetch the completed GRN to display its items
                            try {
                                const grnResponse = await api.get(`/grn?purchaseOrder=${selectedPOId}`);
                                const existingGRNs = grnResponse.data.filter(grn => grn.isSubmitted);
                                
                                if (existingGRNs.length > 0) {
                                    const completedGRN = existingGRNs.find(grn => grn.status === 'Completed');
                                    if (completedGRN) {
                                        setCompletedGRN(completedGRN);
                                        // Map the completed GRN items to the items state for display
                                        setItems(completedGRN.items.map(item => ({
                                            material: item.material._id || item.material,
                                            materialModel: item.materialModel,
                                            orderedQuantity: item.orderedQuantity || item.quantity || 0,
                                            receivedQuantity: item.receivedQuantity || 0,
                                            damagedQuantity: item.damagedQuantity || 0,
                                            unitPrice: item.unitPrice || 0,
                                            remarks: item.remarks || '',
                                        })));
                                    }
                                }
                            } catch (grnError) {
                                console.log('Error fetching completed GRN:', grnError);
                            }
                            
                            return;
                        }
                    } catch (checkError) {
                        console.log('Error checking PO status:', checkError);
                    }
                    
                    // Check if there's already a submitted GRN for this PO
                    try {
                        const grnResponse = await api.get(`/grn?purchaseOrder=${selectedPOId}`);
                        const existingGRNs = grnResponse.data.filter(grn => grn.isSubmitted);
                        
                        if (existingGRNs.length > 0) {
                            setHasExistingGRN(true);
                            setExistingGRNStatus(existingGRNs[0].status);
                            setIsGRNLocked(existingGRNs[0].isLocked);
                            
                            // If it's a partial GRN, load it for editing
                            if (existingGRNs[0].status === 'Partial') {
                                const partialGRN = existingGRNs[0];
                                setPartialGRN(partialGRN);
                                setExistingGRNId(partialGRN._id);
                                
                                // Map the partial GRN items to the items state for editing
                                setItems(partialGRN.items.map(item => ({
                                    material: item.material._id || item.material,
                                    materialModel: item.materialModel,
                                    orderedQuantity: item.orderedQuantity || item.quantity || 0,
                                    receivedQuantity: String(item.receivedQuantity || 0),
                                    damagedQuantity: String(item.damagedQuantity || 0),
                                    unitPrice: item.unitPrice || 0,
                                    remarks: item.remarks || '',
                                })));
                                
                                // Set other GRN details
                                setReceivedBy(partialGRN.receivedBy || '');
                                setDateReceived(partialGRN.dateReceived ? new Date(partialGRN.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                            }
                        } else {
                            setHasExistingGRN(false);
                            setExistingGRNStatus(null);
                            setIsGRNLocked(false);
                        }
                    } catch (grnError) {
                        // If we can't fetch GRNs, assume there are none
                        setHasExistingGRN(false);
                        setExistingGRNStatus(null);
                        setIsGRNLocked(false);
                    }
                    
                    // Initialize items with received quantities as empty strings for controlled inputs (only if not editing existing GRN)
                    if (!partialGRN && !completedGRN) {
                        setItems(data.items.map(item => ({
                            material: item.material._id,
                            materialModel: item.materialModel,
                            orderedQuantity: item.quantity,
                            receivedQuantity: '', // Keep as empty string for controlled input
                            damagedQuantity: '', // Keep as empty string for controlled input
                            unitPrice: item.price || 0, // Add unitPrice from PO item
                            remarks: '',
                        })));
                    }
                } catch (err) {
                    setError('Failed to fetch PO details.');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPODetails();
        } else {
            setPoDetails(null);
            setDcDetails(null);
            setItems([]);
            setIsPOCancelled(false);
            setHasExistingGRN(false);
            setExistingGRNStatus(null);
            setIsGRNLocked(false);
            setCompletedGRN(null); // Reset completed GRN data
            setPartialGRN(null); // Reset partial GRN data
            setExistingGRNId(null); // Reset existing GRN ID
            setIsEditingPartialGRN(false); // Reset editing state
            setCartonsReturned(''); // Reset cartonsReturned
            setMaterialUsage([]); // Reset material usage
        }
    }, [sourceType, selectedPOId, selectedDCId, navigate]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        // Keep values as strings for controlled inputs, convert to numbers only when submitting
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Prevent submission if PO is cancelled (only for PO-based GRNs)
        if (sourceType === 'purchase_order' && isPOCancelled) {
            setError('Cannot create GRN for a cancelled Purchase Order.');
            setIsLoading(false);
            return;
        }

        // Prevent submission if there's already a submitted GRN that is not Partial (only for PO-based GRNs)
        if (sourceType === 'purchase_order' && hasExistingGRN && existingGRNStatus !== 'Partial') {
            setError('A GRN has already been submitted for this Purchase Order. Only Partial status GRNs can be edited.');
            setIsLoading(false);
            return;
        }

        // Prevent submission if GRN is locked
        if (isGRNLocked) {
            setError('This GRN is locked and cannot be modified.');
            setIsLoading(false);
            return;
        }

        // For jobber delivery challans, validate carton quantities
        if (sourceType === 'jobber' && dcDetails) {
            const cartonsReturnedNum = parseInt(cartonsReturned);
            const cartonsSent = dcDetails.carton_qty || 0;
            
            if (cartonsReturned === '') {
                setError('Please enter the number of cartons returned.');
                setIsLoading(false);
                return;
            }
            
            if (cartonsReturnedNum > cartonsSent) {
                setError('Returned cartons cannot exceed sent cartons.');
                setIsLoading(false);
                return;
            }
            
            if (cartonsReturnedNum <= 0) {
                setError('Returned cartons must be greater than zero.');
                setIsLoading(false);
                return;
            }
            
            // Set status based on carton quantities
            let grnStatus = 'Partial';
            if (cartonsReturnedNum === cartonsSent) {
                grnStatus = 'Completed';
                toast.success("GRN and Delivery Challan marked as Completed.");
            } else {
                toast.warn("GRN saved as Partial.");
            }
            
            setStatus(grnStatus);
        }

        // Validate that at least one item has a received quantity > 0 (for PO-based GRNs)
        if (sourceType === 'purchase_order') {
            const hasReceivedItems = items.some(item => parseFloat(item.receivedQuantity) > 0);
            if (!hasReceivedItems) {
                setError('At least one item must have a received quantity greater than zero.');
                setIsLoading(false);
                return;
            }
        }

        // Prepare GRN data
        const grnData = {
            purchaseOrderId: sourceType === 'purchase_order' ? selectedPOId : undefined,
            deliveryChallanId: sourceType === 'jobber' ? selectedDCId : undefined,
            items: sourceType === 'purchase_order' ? 
                items.filter(item => parseFloat(item.receivedQuantity) > 0).map(item => ({
                    ...item,
                    receivedQuantity: parseFloat(item.receivedQuantity) || 0,
                    damagedQuantity: parseFloat(item.damagedQuantity) || 0,
                    unitPrice: parseFloat(item.unitPrice) || 0 // Ensure unitPrice is included and converted to number
                })) : 
                items.map(item => ({
                    ...item,
                    receivedQuantity: parseFloat(item.receivedQuantity) || 0,
                    damagedQuantity: parseFloat(item.damagedQuantity) || 0,
                    unitPrice: parseFloat(item.unitPrice) || 0
                })), // Convert to numbers when sending to backend
            receivedBy,
            dateReceived,
            cartonsReturned: sourceType === 'jobber' ? parseInt(cartonsReturned) : undefined // Add cartonsReturned for jobber DC
        };

        try {
            let response;
            
            // If we're editing an existing partial GRN, update it
            if (existingGRNId) {
                response = await api.put(`/grn/${existingGRNId}`, grnData);
                setSuccess('GRN updated successfully!');
            } else {
                // Otherwise, create a new GRN using the unified endpoint
                response = await api.post('/grn', grnData);
                setSuccess(sourceType === 'purchase_order' ? 'GRN created successfully!' : 'Jobber GRN created successfully!');
            }
            
            // Refresh all related data
            onCreate();
            onRefreshPOs();
            
            // Dispatch a custom event to notify other components of the update
            window.dispatchEvent(new CustomEvent('grnUpdated'));
            
            // Reset form after successful submission
            setSelectedPOId('');
            setSelectedDCId('');
            setPoDetails(null);
            setDcDetails(null);
            setItems([]);
            setReceivedBy('');
            setDateReceived(new Date().toISOString().split('T')[0]);
            setHasExistingGRN(false);
            setExistingGRNStatus(null);
            setIsGRNLocked(false);
            setCompletedGRN(null);
            setPartialGRN(null);
            setExistingGRNId(null);
            setIsEditingPartialGRN(false);
            setCartonsReturned(''); // Reset cartonsReturned
            setStatus(''); // Reset status
            
            // Navigate to the appropriate view after a short delay
            setTimeout(() => {
                navigate(returnPath || '/packing/grn/view');
            }, 2000);
        } catch (err) {
            console.error('Error creating GRN:', err);
            setError(err.response?.data?.message || 'Failed to create GRN. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Approved': 'bg-blue-100 text-blue-800',
            'Ordered': 'bg-indigo-100 text-indigo-800',
            'Partially Received': 'bg-purple-100 text-purple-800',
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
    const isFormDisabled = (sourceType === 'purchase_order' && (isPOCancelled || (hasExistingGRN && existingGRNStatus === 'Completed'))) || isGRNLocked || completedGRN !== null;

    return (
        <Card title="Create Goods Receipt Note (GRN)" className="shadow-xl">
            {success && (
                <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-xl flex items-center border border-green-200">
                    <FaInfoCircle className="mr-3 text-xl" />
                    <div>
                        <h3 className="font-bold">Success!</h3>
                        <p>{success}</p>
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Source Type Toggle - Only show Purchase Order option */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <label className="block text-sm font-semibold text-dark-700 mb-2">Source Type</label>
                    <div className="flex rounded-md shadow-sm">
                        {/* Only show Purchase Order button, always active */}
                        <button
                            type="button"
                            className="px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        >
                            Purchase Order
                        </button>
                    </div>
                </div>
                
                {/* Source Selection - Only show Purchase Order section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <label htmlFor="po-select" className="block text-sm font-semibold text-dark-700 mb-2">Select Purchase Order</label>
                        <div className="flex space-x-2">
                            <select 
                                id="po-select" 
                                value={selectedPOId} 
                                onChange={(e) => setSelectedPOId(e.target.value)} 
                                required 
                                className="flex-1 mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="" disabled>-- Choose a PO --</option>
                                {purchaseOrders.map(po => (
                                    <option 
                                        key={po._id} 
                                        value={po._id}
                                        className={po.status === 'Cancelled' ? 'text-red-600 font-bold' : ''}
                                    >
                                        {po.poNumber} ({po.supplier?.name || 'Unknown Supplier'})
                                        {po.status === 'Cancelled' && ' ❌ [Cancelled]'}
                                    </option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                onClick={onRefreshPOs}
                                className="px-4 py-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors flex items-center"
                                title="Refresh PO list"
                            >
                                <FaRedo />
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Select a purchase order to receive goods against</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <label className="block text-sm font-semibold text-dark-700 mb-2">Supplier Information</label>
                        <div className="mt-1 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                            <div className="flex justify-between items-start">
                                {poDetails ? (
                                    <>
                                        <div>
                                            <h4 className="font-bold text-dark-900">{poDetails.supplier?.name || 'Unknown Supplier'}</h4>
                                            <p className="text-sm text-dark-700 mt-1">
                                                {poDetails.supplier?.contactPerson && (
                                                    <span className="block">Contact: {poDetails.supplier.contactPerson}</span>
                                                )}
                                                {poDetails.supplier?.phoneNumber && (
                                                    <span className="block">Phone: {poDetails.supplier.phoneNumber}</span>
                                                )}
                                                {poDetails.supplier?.email && (
                                                    <span className="block">Email: {poDetails.supplier.email}</span>
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-dark-500">PO Status</div>
                                            <div className="mt-1">{getStatusBadge(poDetails.status)}</div>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-dark-500 italic">Select a purchase order to view supplier details</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Warning banner for cancelled PO */}
                {sourceType === 'purchase_order' && isPOCancelled && (
                    <div className="p-4 bg-red-100 text-red-800 rounded-xl border border-red-200 flex items-start">
                        <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">⚠️ Purchase Order Cancelled</h3>
                            <p>This Purchase Order has been cancelled. GRN creation and editing are disabled.</p>
                        </div>
                    </div>
                )}

                {/* Warning banner for existing GRN */}
                {sourceType === 'purchase_order' && hasExistingGRN && existingGRNStatus === 'Completed' && (
                    <div className="p-4 bg-green-100 text-green-800 rounded-xl border border-green-200 flex items-start">
                        <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">✅ Order Fully Received</h3>
                            <p>This Purchase Order has been fully received. GRN creation and editing are disabled.</p>
                        </div>
                    </div>
                )}

                {/* Warning banner for locked GRN */}
                {isGRNLocked && (
                    <div className="p-4 bg-yellow-100 text-yellow-800 rounded-xl border border-yellow-200 flex items-start">
                        <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">🔒 GRN Locked</h3>
                            <p>This GRN is locked and cannot be modified.</p>
                        </div>
                    </div>
                )}

                {/* Warning banner for existing GRN (Partial status) */}
                {sourceType === 'purchase_order' && hasExistingGRN && existingGRNStatus === 'Partial' && !isGRNLocked && (
                    <div className="p-4 bg-purple-100 text-purple-800 rounded-xl border border-purple-200 flex items-start">
                        <FaEdit className="mr-3 mt-1 text-xl flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">✏️ Editing Existing Partial GRN</h3>
                            <p>You are editing an existing Partial GRN. Changes will be saved to the same record.</p>
                        </div>
                    </div>
                )}

                {/* Warning banner for completed GRN (readonly view) */}
                {completedGRN && (
                    <div className="p-4 bg-blue-100 text-blue-800 rounded-xl border border-blue-200 flex items-start">
                        <FaBan className="mr-3 mt-1 text-xl flex-shrink-0" />
                        <div>
                            <h3 className="font-bold">📋 Completed GRN Details</h3>
                            <p>This Purchase Order has a completed GRN. The received items are displayed below in read-only mode.</p>
                        </div>
                    </div>
                )}

                {/* PO Details Summary */}
                {sourceType === 'purchase_order' && poDetails && (
                    <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-blue-800">Purchase Order Summary</h3>
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                {poDetails.poNumber}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Created Date</p>
                                <p className="font-semibold">{new Date(poDetails.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Expected Delivery</p>
                                <p className="font-semibold">{poDetails.expectedDeliveryDate ? new Date(poDetails.expectedDeliveryDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase">Items</p>
                                <p className="font-semibold">{poDetails.items.length}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Items Section */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-xl font-bold text-dark-700">
                            Received Items
                        </h3>
                        <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-medium">
                            {items.length} items
                        </span>
                    </div>
                    
                    {/* Material-based input for purchase orders */}
                    {items.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-500 text-lg">
                                No items found in this purchase order
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-dark-700">
                                                {sourceType === 'purchase_order' 
                                                    ? (completedGRN 
                                                        ? (item.material?.name || 'Unknown Material') 
                                                        : partialGRN
                                                        ? (item.material?.name || 'Unknown Material')
                                                        : (poDetails?.items[index]?.material?.name || 'Unknown Material'))
                                                    : (typeof item.material === 'string' ? item.material : (item.material?.name || 'Unknown Material'))}
                                            </h4>
                                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                                                {item.materialModel?.replace('Material', '') || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                            <div className="md:col-span-3 text-center bg-blue-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Ordered</p>
                                                <p className="font-bold text-lg text-blue-600">{item.orderedQuantity}</p>
                                            </div>
                                            <div className="md:col-span-3 text-center bg-green-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Received</p>
                                                <p className="font-bold text-lg text-green-600">{item.receivedQuantity || 0}</p>
                                            </div>
                                            <div className="md:col-span-3 text-center bg-orange-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Balance</p>
                                                <p className="font-bold text-lg text-orange-600">
                                                    {item.balanceQuantity !== undefined ? item.balanceQuantity : (item.orderedQuantity - (parseFloat(item.receivedQuantity) || 0))}
                                                </p>
                                            </div>
                                            <div className="md:col-span-3">
                                                <label htmlFor={`received-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Update Received Qty</label>
                                                <input 
                                                    id={`received-${index}`} 
                                                    type="text" 
                                                    value={item.receivedQuantity || ''} 
                                                    onChange={e => handleItemChange(index, 'receivedQuantity', e.target.value)} 
                                                    required 
                                                    disabled={isFormDisabled}
                                                    className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <label htmlFor={`damaged-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Damaged Qty</label>
                                            <input 
                                                id={`damaged-${index}`} 
                                                type="text" 
                                                value={item.damagedQuantity || ''} 
                                                onChange={e => handleItemChange(index, 'damagedQuantity', e.target.value)} 
                                                disabled={isFormDisabled}
                                                className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Receiver Details and Submit */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <label htmlFor="dateReceived" className="block text-sm font-semibold text-dark-700 mb-2">Date Received</label>
                        <input 
                            type="date" 
                            id="dateReceived" 
                            value={dateReceived} 
                            onChange={(e) => setDateReceived(e.target.value)} 
                            required 
                            disabled={isFormDisabled}
                            className={`mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <label htmlFor="receivedBy" className="block text-sm font-semibold text-dark-700 mb-2">Received By (Name)</label>
                        <input 
                            type="text" 
                            id="receivedBy" 
                            value={receivedBy} 
                            onChange={(e) => setReceivedBy(e.target.value)} 
                            required 
                            placeholder="Enter receiver's name"
                            disabled={isFormDisabled}
                            className={`mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        />
                    </div>
                </div>

                <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-6 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <button 
                            type="submit" 
                            disabled={isLoading || isFormDisabled} 
                            className={`px-8 py-4 text-white rounded-xl hover:from-green-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:from-gray-400 disabled:to-gray-500 flex items-center text-lg font-bold shadow-lg transform transition hover:scale-105 ${isFormDisabled ? 'cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? (
                                <>
                                    <FaSpinner className="animate-spin mr-3" />
                                    {existingGRNId ? 'Updating GRN...' : 'Submit GRN'}
                                </>
                            ) : (
                                <>
                                    <FaSave className="mr-3" />
                                    {existingGRNId ? 'Update GRN' : 'Submit GRN'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {(error || success) && (
                    <div className={`p-4 rounded-xl ${error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                        <div className="flex items-center">
                            {error ? <FaExclamationTriangle className="mr-3 text-xl" /> : <FaInfoCircle className="mr-3 text-xl" />}
                            <span className="font-medium">{error || success}</span>
                        </div>
                    </div>
                )}
            </form>
        </Card>
    );
};


const CreateGRN = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation(); // Added to determine which route was used
    const [lastUpdated, setLastUpdated] = useState(new Date());

    // Determine material type based on the current route
    const getMaterialType = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return 'raw';
        } else if (location.pathname.includes('/packing/')) {
            return 'packing';
        }
        // Default to packing materials
        return 'packing';
    };

    // Use useCallback to prevent unnecessary re-renders
    const fetchPOs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch ALL POs, including cancelled ones, filtered by material type
            const materialType = getMaterialType();
            const { data } = await api.get(`/purchase-orders?materialType=${materialType}`);
            setPurchaseOrders(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to load purchase orders.');
            console.error('Error fetching POs:', err);
        } finally {
            setIsLoading(false);
        }
    }, [location.pathname]);

    const fetchDeliveryChallans = useCallback(async () => {
        try {
            // Fetch pending delivery challans (both Own Unit and Jobber)
            const { data } = await api.get('/delivery-challan?status=Pending');
            setDeliveryChallans(data);
        } catch (err) {
            console.error('Error fetching delivery challans:', err);
        }
    }, []);

    useEffect(() => {
        fetchPOs();
        fetchDeliveryChallans();
        
        // Set up polling for real-time updates (every 30 seconds)
        const intervalId = setInterval(() => {
            fetchPOs();
            fetchDeliveryChallans();
        }, 30000);
        
        // Add a refresh handler for when component comes back into view
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchPOs();
                fetchDeliveryChallans();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId); // Clean up interval on unmount
        };
    }, [fetchPOs, fetchDeliveryChallans]);

    const handleGRNCreated = useCallback(() => {
        // Refresh POs and delivery challans after GRN creation
        fetchPOs();
        fetchDeliveryChallans();
    }, [fetchPOs, fetchDeliveryChallans]);

    // Determine where to navigate after GRN creation based on the current route
    const getReturnPath = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return '/stock/maintenance/grn/view';
        } else if (location.pathname.includes('/packing/')) {
            return '/packing/grn/view';
        }
        // Default to packing GRNs view
        return '/grn/view';
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-96">
            <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
                <FaSpinner className="animate-spin text-primary-500 mx-auto text-4xl" />
                <p className="mt-4 text-xl text-gray-700">Loading purchase orders...</p>
                <p className="mt-2 text-gray-500">Please wait while we fetch the latest data</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="max-w-2xl mx-auto">
            <div className="p-6 bg-red-100 text-red-800 rounded-2xl shadow-lg border border-red-200">
                <div className="flex items-center">
                    <FaExclamationTriangle className="mr-3 text-2xl" />
                    <div>
                        <h3 className="text-lg font-bold">Error Loading Data</h3>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
                <div className="mt-6 flex space-x-3">
                    <button 
                        onClick={fetchPOs}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center"
                    >
                        <FaRedo className="mr-2" />
                        Retry
                    </button>
                    <button 
                        onClick={() => navigate('/purchase-orders')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                        View All POs
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <GRNForm
            purchaseOrders={purchaseOrders}
            deliveryChallans={deliveryChallans}
            onCreate={handleGRNCreated}
            onRefreshPOs={() => {
                fetchPOs();
                fetchDeliveryChallans();
            }}
            returnPath={getReturnPath()} // Pass the return path to the form
        />
    );
};

export default CreateGRN;