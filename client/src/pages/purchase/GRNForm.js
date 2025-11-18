import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const GRNForm = ({ purchaseOrders, onCreate }) => {
    const [selectedPOId, setSelectedPOId] = useState('');
    const [poDetails, setPoDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

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
                    const grnResponse = await api.get(`/grn?purchaseOrder=${selectedPOId}`);
                    const existingGRNs = grnResponse.data;
                    
                    // Pre-fill items based on PO details and calculate previous received quantities
                    const updatedItems = data.items.map(poItem => {
                        // Calculate total received quantity for this material from all existing GRNs
                        let previousReceived = 0;
                        const grnHistory = [];
                        
                        existingGRNs.forEach(grn => {
                            grn.items.forEach(grnItem => {
                                // Match by material ID and model
                                const poMaterialId = typeof poItem.material === 'object' ? poItem.material._id : poItem.material;
                                const grnMaterialId = typeof grnItem.material === 'object' ? grnItem.material._id : grnItem.material;
                                
                                if (grnMaterialId === poMaterialId && grnItem.materialModel === poItem.materialModel) {
                                    previousReceived += grnItem.receivedQuantity || 0;
                                    
                                    // Add to history
                                    grnHistory.push({
                                        date: grn.dateReceived,
                                        receivedQuantity: grnItem.receivedQuantity || 0,
                                        grnNumber: grn.grnNumber
                                    });
                                }
                            });
                        });
                        
                        // Sort history by date (newest first)
                        grnHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
                        
                        return {
                            material: poItem.material._id,
                            materialModel: poItem.materialModel,
                            orderedQuantity: poItem.quantity,
                            previousReceived: previousReceived,
                            grnHistory: grnHistory, // Add history to item
                            receivedQuantity: poItem.quantity - previousReceived, // Default to remaining quantity
                            damagedQuantity: 0,
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
    }, [selectedPOId]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = field.includes('Quantity') ? 
            (Number(value) >= 0 ? Number(value) : 0) : value;
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Validate that at least one item has a received quantity > 0
        const hasReceivedItems = items.some(item => item.receivedQuantity > 0);
        if (!hasReceivedItems) {
            setError('At least one item must have a received quantity greater than zero.');
            setIsLoading(false);
            return;
        }

        const grnData = {
            purchaseOrderId: selectedPOId,
            items: items.filter(item => item.receivedQuantity > 0), // Only send items with received quantity
            receivedBy,
            dateReceived,
        };

        try {
            await api.post('/grn', grnData);
            setSuccess('GRN created successfully!');
            if (onCreate) onCreate();
            // Redirect to the GRN list after a short delay
            setTimeout(() => {
                navigate('/packing/grn/view');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create GRN.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Helper class for form inputs
    const inputStyle = "mt-1 block w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

    // Function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Approved': 'bg-blue-100 text-blue-800',
            'Ordered': 'bg-indigo-100 text-indigo-800',
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
                    <select 
                        id="po-select" 
                        value={selectedPOId} 
                        onChange={(e) => setSelectedPOId(e.target.value)} 
                        required 
                        className={inputStyle}
                    >
                        <option value="" disabled>-- Choose a PO --</option>
                        {purchaseOrders.map(po => (
                            <option key={po._id} value={po._id}>
                                {po.poNumber} ({po.supplier?.name || 'Unknown Supplier'})
                            </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Select a purchase order to receive goods against</p>
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
                                        {getStatusBadge(poDetails.status)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {poDetails && (
                <>
                    {/* PO Details Summary */}
                    <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-bold text-blue-800">Purchase Order Summary</h3>
                            <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                {poDetails.poNumber}
                            </span>2
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
                                {items.map((item, index) => (
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
                                                    <p className="font-bold text-lg">{(item.orderedQuantity - (item.previousReceived || 0))}</p>
                                                </div>
                                                <div className="md:col-span-3">
                                                    <label htmlFor={`received-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Received Quantity</label>
                                                    <input 
                                                        id={`received-${index}`} 
                                                        type="text" 
                                                        min="0"
                                                        max={item.orderedQuantity - (item.previousReceived || 0)}
                                                        value={item.receivedQuantity} 
                                                        onChange={e => handleItemChange(index, 'receivedQuantity', e.target.value)} 
                                                        required 
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
                                                <div className="md:col-span-9"></div>
                                                <div className="md:col-span-3">
                                                    <label htmlFor={`damaged-${index}`} className="block text-xs font-medium text-dark-700 mb-1">Damaged Qty</label>
                                                    <input 
                                                        id={`damaged-${index}`} 
                                                        type="text" 
                                                        min="0"
                                                        max={item.receivedQuantity}
                                                        value={item.damagedQuantity} 
                                                        onChange={e => handleItemChange(index, 'damagedQuantity', e.target.value)} 
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                </div>
                                            </div>
                                            
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
                                                            </div>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
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
                                className="mt-1 block w-full px-4 py-3 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl p-6 shadow-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="px-8 py-4 text-white bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl hover:from-green-700 hover:to-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:from-gray-400 disabled:to-gray-500 flex items-center text-lg font-bold shadow-lg transform transition hover:scale-105"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin mr-3">↻</span>
                                        Creating GRN...
                                    </>
                                ) : (
                                    'Submit GRN'
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