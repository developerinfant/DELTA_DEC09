import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaEdit, FaSave, FaBan } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';

const DeliveryChallanDetailModal = ({ isOpen, onClose, deliveryChallanId, onStatusUpdate }) => {
    const { user } = useAuth();
    const [dc, setDc] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedItems, setEditedItems] = useState([]);

    const fetchDeliveryChallan = useCallback(async () => {
        if (!deliveryChallanId) return;
        
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/delivery-challan/${deliveryChallanId}`);
            setDc(data);
            // Initialize edited items with current values
            if (data && data.materials) {
                setEditedItems(data.materials.map(item => ({ ...item })));
            } else {
                setEditedItems([]);
            }
        } catch (err) {
            console.error('Failed to fetch Delivery Challan details:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to fetch Delivery Challan details. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [deliveryChallanId]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            if (isMounted && isOpen && deliveryChallanId) {
                await fetchDeliveryChallan();
            }
        };
        
        fetchData();
        
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [isOpen, deliveryChallanId, fetchDeliveryChallan]);

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing, reset to original values
            if (dc && dc.materials) {
                setEditedItems(dc.materials.map(item => ({ ...item })));
            }
        }
        setIsEditing(!isEditing);
    };
    
    const handleItemChange = useCallback((index, field, value) => {
        setEditedItems(prevItems => {
            const newItems = [...prevItems];
            // Ensure the item exists and create a new object reference
            if (newItems[index]) {
                newItems[index] = { ...newItems[index] };
                
                // Validate that received quantity doesn't exceed sent quantity
                if (field === 'total_qty') {
                    const sentQty = newItems[index].qty_per_carton * dc.carton_qty;
                    const receivedQty = Number(value);
                    const validatedQty = Math.min(Math.max(0, receivedQty), sentQty);
                    newItems[index][field] = validatedQty;
                } else {
                    newItems[index][field] = value;
                }
            }
            return newItems;
        });
    }, [dc]);
    
    const handleSaveEdit = async (e) => {
        e.preventDefault(); // Prevent any default form behavior
        setIsProcessing(true);
        try {
            // Prevent saving if DC is completed
            if (dc?.status === 'Completed') {
                alert('This Delivery Challan is completed and cannot be modified.');
                setIsProcessing(false);
                return;
            }
            
            // Ensure we have the required data
            if (!dc || !editedItems || !deliveryChallanId) {
                alert('Missing required data.');
                setIsProcessing(false);
                return;
            }
            
            // Check if user is admin
            if (!user || user.role !== 'Admin') {
                alert('Editing allowed for Admin users only.');
                setIsProcessing(false);
                return;
            }
            
            // Check if any quantities have changed
            let hasChanges = false;
            for (let i = 0; i < editedItems.length; i++) {
                if (editedItems[i].total_qty !== dc.materials[i].total_qty) {
                    hasChanges = true;
                    break;
                }
            }
            
            if (!hasChanges) {
                alert('No changes detected.');
                setIsProcessing(false);
                return;
            }
            
            // Update the delivery challan
            const updateData = {
                materials: editedItems
            };
            
            const response = await api.put(`/delivery-challan/${deliveryChallanId}`, updateData);
            
            // Update the local state with the response
            setDc(response.data);
            setEditedItems(response.data.materials.map(item => ({ ...item })));
            setIsEditing(false);
            
            // Notify parent component of status update
            if (onStatusUpdate) {
                onStatusUpdate(response.data);
            }
            
            alert('Delivery Challan updated successfully!');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update the Delivery Challan.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Partial': return 'bg-orange-100 text-orange-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };

    // Check if DC can be edited (Partial status and user is Admin)
    const canEditDC = dc && dc.status === 'Partial' && user && user.role === 'Admin';

    // Determine modal title based on unit type
    const getModalTitle = () => {
        if (!dc) return "Delivery Challan Details";
        return dc.unit_type === 'Jobber' 
            ? "Jobber Delivery Challan Details" 
            : "Own Unit Delivery Challan Details";
    };

    if (isLoading) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-primary-500 mx-auto text-3xl" />
                    <p className="mt-4 text-gray-600">Loading Delivery Challan details...</p>
                </div>
            </div>
        </Modal>
    );
    
    if (error) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <Card>
                <div className="p-6 bg-red-50 text-red-800 rounded-lg">
                    <p>{error}</p>
                    <button 
                        onClick={fetchDeliveryChallan}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Retry
                    </button>
                </div>
            </Card>
        </Modal>
    );
    
    if (!dc) return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()}>
            <Card><p className="text-center py-8">Delivery Challan not found.</p></Card>
        </Modal>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} size="xl">
            {/* Edit Mode Banner for Partial DCs */}
            {canEditDC && (
                <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-500 mb-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-purple-800">Editable Partial Delivery Challan</h3>
                            <p className="text-purple-700">Update quantities to complete this record.</p>
                        </div>
                        <div className="flex space-x-3">
                            {isEditing ? (
                                <>
                                    <button 
                                        onClick={handleEditToggle} 
                                        disabled={isProcessing} 
                                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveEdit} 
                                        disabled={isProcessing} 
                                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <FaSpinner className="animate-spin mr-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="mr-2" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <button 
                                    onClick={handleEditToggle} 
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center"
                                >
                                    <FaEdit className="mr-2" />
                                    Edit Quantities
                                </button>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Completed DC Banner */}
            {dc && dc.status === 'Completed' && (
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 mb-6">
                    <div className="flex items-center">
                        <FaBan className="mr-3 text-xl text-green-700" />
                        <div>
                            <h3 className="font-bold text-lg text-green-800">Completed Delivery Challan</h3>
                            <p className="text-green-700">This Delivery Challan is marked as Completed and cannot be edited.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* DC Info */}
            <Card className="shadow-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">DC Number</p>
                        <p className="font-bold text-lg">{dc?.dc_no || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Unit Type</p>
                        <p className="font-bold text-lg">{dc?.unit_type || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">
                            {dc?.unit_type === 'Jobber' ? 'Supplier' : 'Issued To'}
                        </p>
                        <p className="font-bold text-lg">
                            {dc?.unit_type === 'Jobber' 
                                ? (dc.supplier_id?.name || 'N/A') 
                                : (dc.person_name || 'N/A')}
                        </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Status</p>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(dc?.status || '')}`}>
                            {dc?.status || 'N/A'}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Product Name</p>
                        <p className="font-bold text-lg">{dc?.product_name || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Carton Quantity</p>
                        <p className="font-bold text-lg">{dc?.carton_qty || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Date</p>
                        <p className="font-bold text-lg">{formatDate(dc?.date)}</p>
                    </div>
                    {dc?.remarks && (
                        <div className="bg-gray-50 p-4 rounded-lg md:col-span-2 lg:col-span-4">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Remarks</p>
                            <p className="font-medium text-gray-800">{dc.remarks}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Materials Table */}
            <Card title="Materials" className="shadow-lg">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material Name</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Qty per Carton</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Received Qty</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                {isEditing && (
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {editedItems.map((item, index) => {
                                const sentQty = item.qty_per_carton * dc.carton_qty;
                                // Use the received_qty and balance_qty from the database if available, otherwise calculate
                                const receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
                                const balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
                                
                                // Calculate item status based on quantities
                                let itemStatus = 'Completed';
                                let itemStatusClass = 'bg-green-100 text-green-800';
                                // Use the balance quantity to determine status
                                if (balance > 0) {
                                    itemStatus = 'Pending';
                                    itemStatusClass = 'bg-yellow-100 text-yellow-800';
                                } else if (balance < 0) {
                                    // This shouldn't happen, but just in case
                                    itemStatus = 'Over Received';
                                    itemStatusClass = 'bg-red-100 text-red-800';
                                }
                                
                                return (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.material_name || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm font-bold text-blue-600">{item?.qty_per_carton || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="text-sm font-bold text-gray-900">{sentQty}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={sentQty}
                                                    value={receivedQty}
                                                    onChange={(e) => {
                                                        const value = Math.min(parseFloat(e.target.value) || 0, sentQty);
                                                        handleItemChange(index, 'total_qty', value);
                                                    }}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                                                />
                                            ) : (
                                                <div className="text-sm font-bold text-green-600">{receivedQty}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                {balance}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${itemStatusClass}`}>
                                                {itemStatus}
                                            </span>
                                        </td>
                                        {isEditing && (
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button 
                                                    onClick={() => {
                                                        const newItems = [...editedItems];
                                                        newItems[index] = { ...dc.materials[index] }; // Reset to original
                                                        setEditedItems(newItems);
                                                    }}
                                                    className="text-red-500 hover:text-red-700"
                                                    title="Reset to original"
                                                >
                                                    <FaBan />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Table Footer with Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Total Items: {editedItems.length}
                        </div>
                        <div className="flex space-x-4">
                            <div className="text-sm">
                                <span className="text-gray-500">Total Sent: </span>
                                <span className="font-bold text-gray-900">
                                    {editedItems.reduce((sum, item) => sum + (item.qty_per_carton * dc.carton_qty), 0)}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Total Received: </span>
                                <span className="font-bold text-green-600">
                                    {editedItems.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0)}
                                </span>
                            </div>
                            <div className="text-sm">
                                <span className="text-gray-500">Total Balance: </span>
                                <span className="font-bold text-red-600">
                                    {editedItems.reduce((sum, item) => {
                                        return sum + (item.balance_qty !== undefined ? item.balance_qty : ((item.qty_per_carton * dc.carton_qty) - (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0))));
                                    }, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
                {canEditDC && !isEditing && (
                    <button
                        onClick={handleEditToggle}
                        className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                    >
                        <FaEdit className="mr-2" />
                        Edit Quantities
                    </button>
                )}
                
                {isEditing && (
                    <>
                        <button
                            onClick={handleEditToggle}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveEdit}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center"
                        >
                            {isProcessing ? (
                                <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FaSave className="mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </>
                )}
                
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
};

export default DeliveryChallanDetailModal;