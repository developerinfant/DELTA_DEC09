import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Select from 'react-select';
import { useAuth } from '../../context/AuthContext'; // Import the useAuth hook

const GRNForm = ({ purchaseOrders, onCreate, existingGRN, navigate }) => {
    const [selectedPOId, setSelectedPOId] = useState(existingGRN?.purchaseOrder?._id || '');
    const [poDetails, setPoDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [poSummary, setPoSummary] = useState({});
    
    const [summaryLoaded, setSummaryLoaded] = useState(false); 
    const [receivedBy, setReceivedBy] = useState(''); // Will be auto-filled and locked
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // New states for Invoice/DC selection
    const [referenceType, setReferenceType] = useState(existingGRN?.referenceType || ''); // 'invoice' or 'dc'
    const [invoiceNo, setInvoiceNo] = useState(existingGRN?.invoiceNo || '');
    const [invoiceDate, setInvoiceDate] = useState(existingGRN?.invoiceDate ? new Date(existingGRN.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [dcNo, setDcNo] = useState(existingGRN?.dcNo || '');
    const [dcDate, setDcDate] = useState(existingGRN?.dcDate ? new Date(existingGRN.dcDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]); // Add DC date state
    
    const navigation = useNavigate();
    const { user } = useAuth(); // Get the logged-in user from context

    // Auto-fill the receivedBy field with the logged-in user's name
    useEffect(() => {
        if (user && user.name) {
            setReceivedBy(user.name);
        }
    }, [user]);

    // Initialize form with existing GRN data
    useEffect(() => {
        if (existingGRN) {
            // Set reference document fields
            setReferenceType(existingGRN.referenceType || '');
            setInvoiceNo(existingGRN.invoiceNo || '');
            setInvoiceDate(existingGRN.invoiceDate ? new Date(existingGRN.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setDcNo(existingGRN.dcNo || '');
            setDcDate(existingGRN.dcDate ? new Date(existingGRN.dcDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            
            // Set date received
            setDateReceived(existingGRN.dateReceived ? new Date(existingGRN.dateReceived).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            
            // Set received by
            setReceivedBy(existingGRN.receivedBy || (user?.name || ''));
        }
    }, [existingGRN, user]);

    const selectedPO = useMemo(() => {
        return purchaseOrders.find(po => po._id === selectedPOId);
    }, [selectedPOId, purchaseOrders]);
    
    // Fetch full PO details when one is selected
    useEffect(() => {
        if (selectedPOId) {
            const fetchPODetails = async () => {
                try {
                    const { data } = await api.get(`/purchase-orders/${selectedPOId}`);
                    setPoDetails(data);
                    
                    // Fetch existing GRNs for this PO to calculate previous received quantities
                    
                    
                    // Pre-fill items based on PO details and calculate previous received quantities
                   const updatedItems = data.items.map(poItem => {
                    // Per-material summary
const itemMaterialId =
    typeof poItem.material === "object" ? poItem.material._id : poItem.material;

let previousReceived = 0;
let previousExtraReceived = 0;

const grns = poSummary[selectedPOId]?.grns || [];

grns.forEach(g => {
    g.items.forEach(grnItem => {
        const grnMaterialId =
            typeof grnItem.material === "object" ? grnItem.material._id : grnItem.material;

        if (grnMaterialId === itemMaterialId) {
            previousReceived += grnItem.receivedQuantity || 0;
            previousExtraReceived += grnItem.extraReceivedQty || 0;
        }
    });
});

    return {
        material: poItem.material._id,
        materialModel: poItem.materialModel,
        orderedQuantity: poItem.quantity,
        previousReceived,
        previousExtraReceived,
        extraAllowedQty: poItem.extraAllowedQty || 0,
        grnHistory: [], // history removed since summary is used
        receivedQuantity: Math.max(0, poItem.quantity - previousReceived),
        extraReceivedQty: Math.max(0, (poItem.extraAllowedQty || 0) - previousExtraReceived),
        remarks: '',
    };
});

                    
                    setItems(updatedItems);
                } catch (err) {
                    setError('Failed to fetch PO details.');
                }
            };
            fetchPODetails();
        } else {
            setPoDetails(null);
            setItems([]);
        }
   }, [selectedPOId, poSummary]);
    // Fetch GRN Summary for each PO so dropdown can show correct status
useEffect(() => {
    const fetchSummary = async () => {
        let result = {};

        for (let po of purchaseOrders) {
            const res = await api.get(`/grn?purchaseOrder=${po._id}`);
            const grns = res.data;

            let prev = 0;
            let prevExtra = 0;

            grns.forEach(g => {
                g.items.forEach(item => {
                    prev += item.receivedQuantity || 0;
                    prevExtra += item.extraReceivedQty || 0;
                });
            });

           result[po._id] = {
    prev,
    prevExtra,
    grns    // store full GRN response
};

        }

        setPoSummary(result);
        setSummaryLoaded(true); 
    };

    if (purchaseOrders.length > 0) {
        fetchSummary();
    }
}, [purchaseOrders]);


    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        // Treat numeric fields explicitly
        if (field === 'receivedQuantity' || field === 'extraReceivedQty') {
            const num = Number(value);
            newItems[index][field] = Number.isFinite(num) && num >= 0 ? num : 0;
        } else {
            newItems[index][field] = value;
        }
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Validate that at least one item has a received quantity > 0
        const hasReceivedItems = items.some(item => item.receivedQuantity > 0 || item.extraReceivedQty > 0);
        if (!hasReceivedItems) {
            setError('At least one item must have a received quantity greater than zero.');
            setIsLoading(false);
            return;
        }

        // Validate that received quantities don't exceed limits
        for (const item of items) {
            const totalNormalReceived = (item.previousReceived || 0) + (item.receivedQuantity || 0);
            if (totalNormalReceived > item.orderedQuantity) {
                setError(`Received quantity for ${poDetails.items[items.indexOf(item)]?.material?.name || 'item'} cannot exceed ordered quantity.`);
                setIsLoading(false);
                return;
            }
            
            // Validate extra received quantity if provided
           if (item.extraReceivedQty > 0 && item.extraAllowedQty === 0) {
                setError(`Extra receiving not configured for ${poDetails.items[items.indexOf(item)]?.material?.name || 'item'}.`);
                setIsLoading(false);
                return;
            }
            
            const totalExtraReceived = (item.previousExtraReceived || 0) + (item.extraReceivedQty || 0);
            if (item.extraAllowedQty !== undefined && totalExtraReceived > item.extraAllowedQty) {
                setError(`Extra received quantity for ${poDetails.items[items.indexOf(item)]?.material?.name || 'item'} cannot exceed allowed extra quantity.`);
                setIsLoading(false);
                return;
            }
        }

        // Validate reference fields based on selection
        if (referenceType === 'invoice' && (!invoiceNo || !invoiceDate)) {
            setError('Please provide both Invoice No and Invoice Date.');
            setIsLoading(false);
            return;
        }
        
        if (referenceType === 'dc' && !dcNo) {
            setError('Please provide DC No.');
            setIsLoading(false);
            return;
        }

        // Prepare GRN data
        const grnData = {
            purchaseOrderId: selectedPOId,
            items: items.map(item => ({
                material: item.material,
                materialModel: item.materialModel,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.receivedQuantity,
                extraReceivedQty: item.extraReceivedQty,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                damagedQuantity: item.damagedQuantity,
                remarks: item.remarks,
                balanceQuantity: item.orderedQuantity - (item.previousReceived + item.receivedQuantity)
            })),
            receivedBy: receivedBy.trim(),
            dateReceived: new Date(dateReceived).toISOString(),
            referenceType,
            invoiceNo,
            invoiceDate: referenceType === 'invoice' ? new Date(invoiceDate).toISOString() : null,
            dcNo,
            dcDate: referenceType === 'dc' ? new Date(dcDate).toISOString() : null
        };

        try {
            let response;
            if (existingGRN && existingGRN._id) {
                // Update existing GRN
                response = await api.put(`/grn/${existingGRN._id}`, grnData);
            } else {
                // Create new GRN
                response = await api.post('/grn', grnData);
            }
            
            setSuccess(existingGRN ? 'GRN updated successfully!' : 'GRN created successfully!');
            if (onCreate) onCreate();
            
            // Redirect to GRN Details page after successful creation
            if (!existingGRN && response?.data?._id) {
                setTimeout(() => {
                    navigation(`/packing/grn/${response.data._id}`);
                }, 1500);
            }
            
            // Reset form after successful submission (only for new GRNs)
            if (!existingGRN) {
                setSelectedPOId('');
                setItems([]);
                setReferenceType('');
                setInvoiceNo('');
                setDcNo('');
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create/update GRN.';
            setError(errorMessage);
            console.error('Error creating/updating GRN:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Function to check if form should be disabled (for completed GRNs)
    const isFormDisabled = existingGRN && existingGRN.status === 'Completed';

    // Helper class for form inputs
    const inputStyle = "mt-1 block w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";
    
    // Custom styles for React Select to match the theme
    const customSelectStyles = {
        control: (provided, state) => ({
            ...provided,
            minHeight: '42px',
            borderColor: state.isFocused ? '#6366f1' : '#e5e7eb',
            boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
            '&:hover': {
                borderColor: state.isFocused ? '#6366f1' : '#d1d5db'
            },
            borderRadius: '0.5rem',
            backgroundColor: '#f9fafb',
            fontSize: '0.875rem'
        }),
        menu: (provided) => ({
            ...provided,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 9999
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#e0e7ff' : state.isFocused ? '#eef2ff' : 'white',
            color: state.isSelected ? '#4f46e5' : '#374151',
            '&:hover': {
                backgroundColor: '#e0e7ff',
                color: '#4f46e5'
            }
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#9ca3af'
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#374151'
        })
    };

    // Function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Approved': 'bg-blue-100 text-blue-800',
            'Ordered': 'bg-indigo-100 text-indigo-800',
            'Completed': 'bg-green-100 text-green-800',
            'Received': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="po-select" className="block text-sm font-medium text-dark-700 mb-1">Select Purchase Order</label>
                    {!summaryLoaded ? (
    <div className="p-3 text-sm text-gray-500">
        Loading PO status…
    </div>
) : (
                    <Select
                        id="po-select"
                        value={purchaseOrders.find(po => po._id === selectedPOId) ? 
                               { value: selectedPOId, label: `${purchaseOrders.find(po => po._id === selectedPOId).poNumber} (${purchaseOrders.find(po => po._id === selectedPOId).supplier?.name || 'Unknown Supplier'})` } : 
                               null}
                        onChange={(selectedOption) => setSelectedPOId(selectedOption ? selectedOption.value : '')}
                       options={purchaseOrders.map(po => {
  let totalOrdered = 0;
let totalExtraAllowed = 0;

// Sum ordered & extra allowed from PO
po.items.forEach(i => {
    totalOrdered += i.quantity || 0;
    totalExtraAllowed += i.extraAllowedQty || 0;
});

// Read GRN summary for this PO
const summary = poSummary[po._id] || { prev: 0, prevExtra: 0 };

const totalPrevReceived = summary.prev;
const totalExtraPrev = summary.prevExtra;
    // Compute dynamic status
    const normalPending = totalOrdered - totalPrevReceived;
const extraPending = totalExtraAllowed - totalExtraPrev;

let status = "New";

if (normalPending === 0 && extraPending === 0) {
    status = "Completed";         // FULL completed
} else if (totalPrevReceived > 0 || totalExtraPrev > 0) {
    status = "Pending";           // Partially received
}

    return {
        value: po._id,
        label: `${po.poNumber} - ${status}`
    };
})}

                        placeholder="-- Choose a PO --"
                        isSearchable={true}
                        className="basic-single"
                        classNamePrefix="select"
                        isClearable={true}
                        required
                        styles={customSelectStyles}
                    />)}
                    <p className="mt-1 text-xs text-gray-500">Select a purchase order to receive goods against (type to search)</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-dark-700 mb-1">Supplier</label>
                    <div className="mt-1 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{poDetails?.supplier?.name || 'N/A'}</p>
                                <p className="text-sm text-gray-600 mt-1">Supplier Details</p>
                            </div>
                            {poDetails && (
                                <div className="flex items-center bg-white px-3 py-1 rounded-full">
                                    <span className="text-xs font-medium">Status: </span>
                                    <span className="ml-2">
    {getStatusBadge(
        (() => {
            // Read GRN summary for this PO
            const summary = poSummary[poDetails._id] || { prev: 0, prevExtra: 0 };

            // Sum total ordered + extra allowed
            const totalOrdered = poDetails.items.reduce((sum, i) => sum + (i.quantity || 0), 0);
            const totalExtraAllowed = poDetails.items.reduce((sum, i) => sum + (i.extraAllowedQty || 0), 0);

            // Previous received values from summary
            const normalPending = totalOrdered - summary.prev;
            const extraPending = totalExtraAllowed - summary.prevExtra;

            // Status logic
            if (normalPending === 0 && extraPending === 0) return "Completed";   // FULL completed
            if (summary.prev > 0 || summary.prevExtra > 0) return "Pending";     // Partially received

            return "New"; // Nothing received yet
        })()
    )}
</span>

                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reference Type Selection */}
            {poDetails && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                    <label className="block text-sm font-semibold text-dark-700 mb-2">Reference Document</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <select
                                value={referenceType}
                                onChange={(e) => setReferenceType(e.target.value)}
                                className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                disabled={isFormDisabled}
                            >
                                <option value="">-- Select Reference Type --</option>
                                <option value="invoice">Invoice</option>
                                <option value="dc">Delivery Challan (DC)</option>
                            </select>
                        </div>
                        
                        {referenceType === 'invoice' && (
                            <>
                                <div>
                                    <label htmlFor="invoiceNo" className="block text-xs font-medium text-dark-700 mb-1">Invoice No</label>
                                    <input
                                        type="text"
                                        id="invoiceNo"
                                        value={invoiceNo}
                                        onChange={(e) => setInvoiceNo(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter Invoice No"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="invoiceDate" className="block text-xs font-medium text-dark-700 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        id="invoiceDate"
                                        value={invoiceDate}
                                        onChange={(e) => setInvoiceDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </>
                        )}
                        
                        {referenceType === 'dc' && (
                            <>
                                <div>
                                    <label htmlFor="dcNo" className="block text-xs font-medium text-dark-700 mb-1">DC No</label>
                                    <input
                                        type="text"
                                        id="dcNo"
                                        value={dcNo}
                                        onChange={(e) => setDcNo(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter DC No"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dcDate" className="block text-xs font-medium text-dark-700 mb-1">DC Date</label>
                                    <input
                                        type="date"
                                        id="dcDate"
                                        value={dcDate}
                                        onChange={(e) => setDcDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {poDetails && (
                <>
                    {/* PO Details Summary */}
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

                    {/* Items Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-dark-700">Received Items</h3>
                            <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-medium">
                                {items.length} items
                            </span>
                        </div>
                        
                        {items.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <p className="text-gray-500 text-lg">No items found in this purchase order</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {items.map((item, index) => {
                                    // Determine if normal and extra parts are fully received
                                    const normalPending = Math.max(0, item.orderedQuantity - (item.previousReceived || 0));
                                    const extraPending = Math.max(0, (item.extraAllowedQty || 0) - (item.previousExtraReceived || 0));
                                    const isFullyReceived = normalPending === 0 && extraPending === 0;

                                    return (
                                    <div key={index} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-dark-700">
                                                    {poDetails.items[index]?.material?.name || 'Unknown Material'}
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
                                                    <p className="font-bold text-lg">{item.orderedQuantity}</p>
                                                </div>
                                                <div className="md:col-span-3 text-center bg-yellow-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase">Previous Received</p>
                                                    <p className="font-bold text-lg">{item.previousReceived || 0}</p>
                                                </div>
                                                <div className="md:col-span-3 text-center bg-orange-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase">Pending</p>
                                                    <p className="font-bold text-lg">{normalPending}</p>
                                                </div>

                                                {/* Normal Received Quantity - show input only if pending > 0 */}
                                                { normalPending > 0 ? (
                                                    <div className="md:col-span-3">
                                                        <label htmlFor={`received-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Normal Received Quantity</label>
                                                        <input 
                                                            id={`received-${index}`} 
                                                            type="number" 
                                                            min="0"
                                                            max={normalPending}
                                                            value={item.receivedQuantity} 
                                                            onChange={e => handleItemChange(index, 'receivedQuantity', e.target.value)} 
                                                            required 
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="md:col-span-3 flex items-center justify-center">
                                                        <div className="text-green-600 font-medium">✔ Fully Received</div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                                                {/* Extra receiving fields - show input only if extraPending > 0 */}
                                                <div className="md:col-span-3 text-center bg-purple-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase">Extra Allowed</p>
                                                    <p className="font-bold text-lg">{item.extraAllowedQty || 0}</p>
                                                </div>
                                                <div className="md:col-span-3 text-center bg-yellow-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase">Extra Previous</p>
                                                    <p className="font-bold text-lg">{item.previousExtraReceived || 0}</p>
                                                </div>
                                                <div className="md:col-span-3 text-center bg-orange-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-500 uppercase">Extra Pending</p>
                                                    <p className="font-bold text-lg">{extraPending}</p>
                                                </div>

                                                { extraPending > 0 ? (
                                                    <div className="md:col-span-3">
                                                        <label htmlFor={`extra-received-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Extra Received Quantity</label>
                                                        <input 
                                                            id={`extra-received-${index}`} 
                                                            type="number" 
                                                            min="0"
                                                            max={extraPending}
                                                            value={item.extraReceivedQty} 
                                                            onChange={e => handleItemChange(index, 'extraReceivedQty', e.target.value)} 
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="md:col-span-3 flex items-center justify-center">
                                                        <div className="text-green-600 font-medium">✔ Extra Fully Received</div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* If fully received, show a green banner */}
                                            { isFullyReceived && (
                                                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700">
                                                    <strong>✓ This item has been fully received</strong>
                                                </div>
                                            )}

                                            {/* Dropdown history view for previous GRNs */}
                                            {item.previousReceived > 0 && (
                                                <div className="mt-4">
                                                    <details className="bg-gray-50 rounded-lg border border-gray-200">
                                                        <summary className="p-3 font-medium text-sm cursor-pointer hover:bg-gray-100 flex justify-between items-center">
                                                            <span>View Previous GRN History</span>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                                            </svg>
                                                        </summary>
                                                        <div className="p-3 border-t border-gray-200">
                                                            <div className="text-xs text-gray-600 mb-2">
                                                                <div className="grid grid-cols-4 gap-2 font-semibold py-2 border-b">
                                                                    <span>Date</span>
                                                                    <span>GRN #</span>
                                                                    <span className="text-right">Received Qty</span>
                                                                    <span className="text-right">Pending Qty</span>
                                                                </div>
                                                                {item.grnHistory && item.grnHistory.map((historyItem, historyIndex) => (
                                                                    <div key={historyIndex} className="grid grid-cols-4 gap-2 py-2 border-b border-gray-100 last:border-0">
                                                                        <span>{historyItem.date ? new Date(historyItem.date).toLocaleDateString() : 'N/A'}</span>
                                                                        <span>{historyItem.grnNumber || 'N/A'}</span>
                                                                        <span className="text-right">{historyItem.receivedQuantity}</span>
                                                                        <span className="text-right">
                                                                            {item.orderedQuantity - 
                                                                            item.grnHistory.slice(0, historyIndex + 1).reduce((sum, h) => sum + h.receivedQuantity, 0)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-2">
                                                                <p><span className="font-semibold">Total Ordered:</span> {item.orderedQuantity}</p>
                                                                <p><span className="font-semibold">Total Received:</span> {item.previousReceived}</p>
                                                                <p><span className="font-semibold">Pending Qty:</span> {item.orderedQuantity - item.previousReceived}</p>
                                                                {item.extraAllowedQty > 0 && (
                                                                    <>
                                                                        <p><span className="font-semibold">Extra Allowed:</span> {item.extraAllowedQty}</p>
                                                                        <p><span className="font-semibold">Extra Received:</span> {item.previousExtraReceived}</p>
                                                                        <p><span className="font-semibold">Extra Pending:</span> {item.extraAllowedQty - item.previousExtraReceived}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )})}
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
                                className="mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                                readOnly // Make the field read-only
                                disabled // Disable the field visually
                                className="mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                            />
                        </div>
                    </div>
<div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
    <div className="flex flex-col md:flex-row justify-end items-center">
        <button 
            type="submit" 
            disabled={isLoading} 
            className="
                relative
                inline-flex items-center justify-center
                px-8 py-3 
                bg-blue-600 hover:bg-blue-700
                disabled:bg-gray-400 
                text-white font-semibold text-lg
                rounded-lg
                shadow-md hover:shadow-lg
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
            "
        >
            {isLoading ? (
                <>
                    <span className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                    Processing...
                </>
            ) : (
                <>
                    <i className="bi bi-check-circle mr-2 text-xl"></i>
                    Submit GRN
                </>
            )}
        </button>
    </div>
</div>


                    {(error || success) && (
                        <div className={`p-4 rounded-xl ${error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                            <div className="flex items-center">
                                <span className="font-medium">{error || success}</span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </form>
    );
};

export default GRNForm;