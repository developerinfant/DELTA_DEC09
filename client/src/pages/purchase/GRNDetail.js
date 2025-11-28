import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaArrowLeft, FaCheck, FaTimes, FaEdit, FaBan, FaPrint } from 'react-icons/fa';

// Add a helper function to validate ObjectId
const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
};

const GRNDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [grn, setGrn] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    // Keep editedItems and cartonsReturned for display purposes, but they won't be used for editing
    const [editedItems, setEditedItems] = useState([]);
    const [cartonsReturned, setCartonsReturned] = useState('');
    
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const fetchGRN = useCallback(async () => {
        // Validate that the ID is a valid ObjectId before making the API call
        if (!id || !isValidObjectId(id)) {
            setError('Invalid GRN ID format.');
            setIsLoading(false);
            return;
        }
        
        setIsLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/grn/${id}`);
            setGrn(data);
            // Initialize edited items with current values, ensuring items exist
            if (data && data.items) {
                setEditedItems(data.items.map(item => ({ ...item })));
            } else {
                setEditedItems([]);
            }
            // Initialize cartons returned for carton-based GRNs
            if (data && data.cartonsReturned !== undefined) {
                setCartonsReturned(data.cartonsReturned.toString());
            }
        } catch (err) {
            console.error('Failed to fetch GRN details:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to fetch GRN details. Please try again.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            // Validate that the ID is a valid ObjectId before proceeding
            if (!id || !isValidObjectId(id)) {
                if (isMounted) {
                    setError('Invalid GRN ID format.');
                    setIsLoading(false);
                }
                return;
            }
            
            if (isMounted && id) {
                await fetchGRN();
            }
        };
        
        fetchData();
        
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [fetchGRN, id]);

    const handleApproval = async (status) => {
        // Safety check for ID
        if (!id) {
            alert('GRN ID is missing.');
            return;
        }
        
        // Validate that the ID is a valid ObjectId
        if (!isValidObjectId(id)) {
            alert('Invalid GRN ID format.');
            return;
        }
        
        setIsProcessing(true);
        try {
            await api.put(`/grn/${id}/approve`, { status, rejectionReason });
            setIsRejectModalOpen(false);
            await fetchGRN(); // Re-fetch to show updated status
        } catch (err) {
            console.error('Failed to process the GRN:', err);
            alert(err.response?.data?.message || 'Failed to process the GRN.');
        } finally {
            setIsProcessing(false);
        }
    };
    
    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending Admin Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Partial': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
    };

    // Determine the correct back path based on the current route
    const getBackPath = () => {
        if (location?.pathname?.includes('/stock/maintenance/')) {
            return '/stock/maintenance/grn/view';
        } else if (location?.pathname?.includes('/packing/')) {
            return '/packing/grn/view';
        }
        // Default to packing GRN view
        return '/packing/grn/view';
    };

    const backPath = getBackPath();

    // Handle print functionality
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) return (
        <div className="flex justify-center items-center h-96">
            <div className="text-center">
                <FaSpinner className="animate-spin text-primary-500 mx-auto text-3xl" />
                <p className="mt-4 text-gray-600">Loading GRN details...</p>
            </div>
        </div>
    );
    if (error) return (
        <Card>
            <div className="p-6 bg-red-50 text-red-800 rounded-lg">
                <p>{error}</p>
                <button 
                    onClick={fetchGRN}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                    Retry
                </button>
            </div>
        </Card>
    );
    if (!grn) return <Card><p className="text-center py-8">GRN not found.</p></Card>;

    // Determine the reference label and value based on source type
    const getReferenceInfo = () => {
        if (grn?.sourceType === 'jobber') {
            return {
                label: 'DC Number',
                value: grn?.dcNumber || grn?.deliveryChallan?.dc_no || grn?.referenceNumber || 'N/A'
            };
        } else {
            return {
                label: 'PO Number',
                value: grn?.purchaseOrder?.poNumber || 'N/A'
            };
        }
    };

    const referenceInfo = getReferenceInfo();

    // Get supplier name based on source type
    const getSupplierInfo = () => {
        if (grn?.sourceType === 'jobber') {
            return grn?.supplierName || grn?.supplier?.name || grn?.deliveryChallan?.supplier_id?.name || 'N/A';
        } else {
            return grn?.supplier?.name || 'N/A';
        }
    };

    const supplierInfo = getSupplierInfo();

    // Calculate carton balance for carton-based GRNs
    const cartonBalance = grn && grn.cartonsSent !== undefined && cartonsReturned !== '' 
        ? grn.cartonsSent - parseInt(cartonsReturned) 
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">GRN Details</h1>
                    <p className="text-gray-600 mt-1">View detailed information about this goods receipt note</p>
                </div>
                <div className="flex space-x-2">
                    {location?.pathname?.includes('/packing/') && (
                        <button 
                            onClick={handlePrint}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            <FaPrint className="mr-2" />
                            Print
                        </button>
                    )}
                    <Link to={backPath} className="flex items-center px-4 py-2 text-primary-600 hover:text-primary-800 font-medium bg-gray-100 rounded-md hover:bg-gray-200">
                        <FaArrowLeft className="mr-2" />
                        Back to GRN List
                    </Link>
                </div>
            </div>

            {/* Status Banner */}
            {grn && grn.status === 'Partial' && (
                <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500">
                    <div className="flex items-center">
                        <FaEdit className="mr-3 text-xl text-purple-700" />
                        <div>
                            <h3 className="font-bold text-lg text-purple-800">
                                {grn.sourceType === 'jobber' && grn.cartonsReturned !== undefined 
                                    ? 'Partial Delivery Challan' 
                                    : 'Partial GRN'}
                            </h3>
                            <p className="text-purple-700">
                                This record is partially completed. To make changes, please use the Create GRN page.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {grn && grn.status === 'Completed' && (
                <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500">
                    <div className="flex items-center">
                        <FaCheck className="mr-3 text-xl text-gray-700" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Completed GRN</h3>
                            <p className="text-gray-700">This GRN is Completed.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Lock Status Banner */}
            {grn && grn.isLocked && (
                <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500">
                    <div className="flex items-center">
                        <FaBan className="mr-3 text-xl text-gray-700" />
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">Locked GRN</h3>
                            <p className="text-gray-700">This GRN is locked.</p>
                        </div>
                    </div>
                </Card>
            )}

            {/* GRN Info */}
            <Card className="shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">GRN Number</p>
                        <p className="font-bold text-lg">{grn?.grnNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">{referenceInfo.label}</p>
                        <p className="font-bold text-lg">{referenceInfo.value}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">
                            {grn?.sourceType === 'jobber' ? (grn?.unitType === 'Own Unit' ? 'Issued To' : 'Supplier') : 'Supplier'}
                        </p>
                        <p className="font-bold text-lg">{supplierInfo}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Status</p>
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusClass(grn?.status || '')}`}>
                            {grn?.status || 'N/A'}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Date Received</p>
                        <p className="font-bold text-lg">{formatDate(grn?.dateReceived)}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Received By</p>
                        <p className="font-bold text-lg">{grn?.receivedBy || 'N/A'}</p>
                    </div>
                    {grn?.approvedBy && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Approved By</p>
                            <p className="font-bold text-lg">{grn.approvedBy?.name || 'N/A'}</p>
                        </div>
                    )}
                    {grn?.rejectionReason && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <p className="text-sm text-red-500 uppercase tracking-wider">Rejection Reason</p>
                            <p className="font-medium text-red-800">{grn.rejectionReason}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Items Table - Show carton-based table for Delivery Challan GRNs */}
            {grn && grn.sourceType === 'jobber' && grn.cartonsReturned !== undefined ? (
                <Card title="Carton Return Details" className="shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cartons Sent</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Cartons Returned</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{grn.productName || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm font-bold text-blue-600">{grn.cartonsSent || 0}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="text-sm font-bold text-green-600">{grn.cartonsReturned || 0}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className={`text-sm font-bold ${cartonBalance > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {cartonBalance}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            grn.cartonsReturned === grn.cartonsSent 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-orange-100 text-orange-800'
                                        }`}>
                                            {grn.cartonsReturned === grn.cartonsSent ? 'Completed' : 'Partial'}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                // Show material-based table for Purchase Order GRNs
                <Card title="Items Received" className="shadow-lg">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material Name</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Previous Received</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Qty</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Received Qty</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Damaged</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {editedItems.map((item, index) => {
                                    // Calculate item status and quantities based on the actual GRN record data
                                    let itemStatus = 'Completed';
                                    let itemStatusClass = 'bg-green-100 text-green-800';
                                    
                                    // Use the actual values from the GRN record
                                    const orderedQty = item?.orderedQuantity || 0;
                                    const receivedQty = item?.receivedQuantity || 0;
                                    const previousReceived = item?.previousReceived || 0;
                                    const pendingQty = orderedQty - previousReceived;  // Pending is based on previous received
                                    // Use the balanceQuantity from the GRN record if available, otherwise calculate it
                                    const balanceQty = item?.balanceQuantity !== undefined ? item.balanceQuantity : (orderedQty - (previousReceived + receivedQty));
                                    
                                    // Status logic based on the actual GRN record
                                    if (balanceQty > 0) {
                                        itemStatus = 'Partial';
                                        itemStatusClass = 'bg-orange-100 text-orange-800';
                                    } else {
                                        itemStatus = 'Completed';
                                        itemStatusClass = 'bg-green-100 text-green-800';
                                    }
                                    
                                    return (
                                        <tr key={item._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{item.material?.name || item.material || 'N/A'}</div>
                                                <div className="text-xs text-gray-500">{item.material?.itemCode ? `(${item.material.itemCode})` : ''} {item.material?.unit ? `(${item.material.unit})` : ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-blue-600">{orderedQty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-yellow-600">{previousReceived}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-orange-600">{pendingQty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-green-600">{receivedQty}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className={`text-sm font-bold ${balanceQty > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {balanceQty}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${itemStatusClass}`}>
                                                    {itemStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="text-sm font-bold text-red-600">{item?.damagedQuantity || 0}</div>
                                            </td>
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
                                    <span className="text-gray-500">Total Ordered: </span>
                                    <span className="font-bold text-blue-600">
                                        {editedItems.reduce((sum, item) => sum + (item?.orderedQuantity || 0), 0)}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Total Previous Received: </span>
                                    <span className="font-bold text-yellow-600">
                                        {editedItems.reduce((sum, item) => sum + (item?.previousReceived || 0), 0)}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Total Pending: </span>
                                    <span className="font-bold text-orange-600">
                                        {editedItems.reduce((sum, item) => sum + ((item?.orderedQuantity || 0) - (item?.previousReceived || 0)), 0)}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Total Received: </span>
                                    <span className="font-bold text-green-600">
                                        {editedItems.reduce((sum, item) => sum + (item?.receivedQuantity || 0), 0)}
                                    </span>
                                </div>
                                <div className="text-sm">
                                    <span className="text-gray-500">Total Balance: </span>
                                    <span className="font-bold text-red-600">
                                        {editedItems.reduce((sum, item) => sum + ((item?.orderedQuantity || 0) - ((item?.previousReceived || 0) + (item?.receivedQuantity || 0))), 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {/* Action Buttons - Remove all edit buttons, keep only approval buttons for admins */}
            <div className="flex flex-wrap gap-3 justify-end">
                {grn?.status === 'Pending Admin Approval' && user?.role === 'Admin' && (
                    <>
                        <button
                            onClick={() => handleApproval('Approved')}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <FaSpinner className="animate-spin mr-2" />
                            ) : (
                                <FaCheck className="mr-2" />
                            )}
                            Approve
                        </button>
                        <button
                            onClick={() => setIsRejectModalOpen(true)}
                            disabled={isProcessing}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            <FaTimes className="mr-2" />
                            Reject
                        </button>
                    </>
                )}
            </div>

            {/* Reject Modal */}
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject GRN">
                <div className="space-y-4">
                    <p className="text-gray-700">Please provide a reason for rejecting this GRN:</p>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter rejection reason..."
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={() => setIsRejectModalOpen(false)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleApproval('Rejected')}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <FaSpinner className="animate-spin" />
                            ) : (
                                'Reject GRN'
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GRNDetail;