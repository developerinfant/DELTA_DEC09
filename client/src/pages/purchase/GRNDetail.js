import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import ReceivedItemsDisplay from '../../components/purchase/ReceivedItemsDisplay';
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
        <div className="flex justify-center items-center min-h-[70vh]">
            <div className="text-center bg-white rounded-xl p-8 shadow-sm border border-gray-200 max-w-md w-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-F2C94C/10 mb-6">
                    <FaSpinner className="animate-spin text-F2C94C mx-auto text-3xl" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading GRN Details</h3>
                <p className="text-gray-600">Please wait while we fetch the goods receipt note information...</p>
            </div>
        </div>
    );
    if (error) return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="p-6 bg-red-50 text-red-800 rounded-lg border border-red-200">
                <div className="flex items-center mb-3">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <h3 className="text-lg font-medium">Error Loading GRN</h3>
                </div>
                <p className="mb-4">{error}</p>
                <button 
                    onClick={fetchGRN}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                >
                    Retry
                </button>
            </div>
        </div>
    );
    if (!grn) return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="text-center py-12">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">GRN Not Found</h3>
                <p className="mt-2 text-gray-500">The requested goods receipt note could not be found.</p>
                <div className="mt-6">
                    <Link to={backPath} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-F2C94C hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-F2C94C">
                        <FaArrowLeft className="mr-2 -ml-1 h-4 w-4" />
                        Back to GRN List
                    </Link>
                </div>
            </div>
        </div>
    );

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

    // Get reference document info (Invoice or DC) for PO-based GRNs
    const getReferenceDocumentInfo = () => {
        if (grn?.sourceType === 'purchase_order') {
            if (grn?.referenceType === 'invoice') {
                return {
                    label: 'Invoice No',
                    value: grn?.invoiceNo || 'N/A',
                    dateLabel: 'Invoice Date',
                    dateValue: grn?.invoiceDate ? formatDate(grn.invoiceDate) : 'N/A'
                };
            } else if (grn?.referenceType === 'dc') {
                return {
                    label: 'DC No',
                    value: grn?.dcNo || 'N/A',
                    dateLabel: 'DC Date',
                    dateValue: grn?.dcDate ? formatDate(grn.dcDate) : 'N/A'
                };
            }
        }
        return null;
    };

    const referenceDocumentInfo = getReferenceDocumentInfo();

    // Calculate carton balance for carton-based GRNs
    const cartonBalance = grn && grn.cartonsSent !== undefined && cartonsReturned !== '' 
        ? grn.cartonsSent - parseInt(cartonsReturned) 
        : 0;

    return (
        <div className="space-y-6 bg-FAF7F2 min-h-screen">
            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">GRN Details</h1>
                        <p className="text-gray-600 mt-1">View detailed information about this goods receipt note</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {location?.pathname?.includes('/packing/') && (
                            <button 
                                onClick={handlePrint}
                                className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-F2C94C transition-all duration-200"
                            >
                                <FaPrint className="mr-2" />
                                Print
                            </button>
                        )}
                        <Link to={backPath} className="inline-flex items-center px-4 py-2 bg-F2C94C hover:bg-amber-500 text-gray-900 font-medium rounded-lg shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-F2C94C transition-all duration-200">
                            <FaArrowLeft className="mr-2" />
                            Back to GRN List
                        </Link>
                    </div>
                </div>
            </div>

            {/* Status Banner */}
            {grn && grn.status === 'Partial' && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-500 rounded-lg p-4">
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
                    </div>
                </div>
            )}

            {grn && grn.status === 'Completed' && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500 rounded-lg p-4">
                        <div className="flex items-center">
                            <FaCheck className="mr-3 text-xl text-gray-700" />
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Completed GRN</h3>
                                <p className="text-gray-700">This GRN is Completed.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock Status Banner */}
            {grn && grn.isLocked && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-500 rounded-lg p-4">
                        <div className="flex items-center">
                            <FaBan className="mr-3 text-xl text-gray-700" />
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Locked GRN</h3>
                                <p className="text-gray-700">This GRN is locked.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* GRN Info */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="border-b border-gray-200 pb-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-900">GRN Information</h2>
                    <p className="text-gray-600 mt-1">Basic details and status of this goods receipt note</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">GRN Number</p>
                        <p className="font-bold text-lg text-gray-900">{grn?.grnNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">{referenceInfo.label}</p>
                        <p className="font-bold text-lg text-gray-900">{referenceInfo.value}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">
                            {grn?.sourceType === 'jobber' ? (grn?.unitType === 'Own Unit' ? 'Issued To' : 'Supplier') : 'Supplier'}
                        </p>
                        <p className="font-bold text-lg text-gray-900">{supplierInfo}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Status</p>
                        <span className={`px-3 py-1.5 text-sm font-semibold rounded-full ${getStatusClass(grn?.status || '')}`}>
                            {grn?.status || 'N/A'}
                        </span>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Date Received</p>
                        <p className="font-bold text-lg text-gray-900">{formatDate(grn?.dateReceived)}</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wider">Received By</p>
                        <p className="font-bold text-lg text-gray-900">{grn?.receivedBy || 'N/A'}</p>
                    </div>
                    {/* Add Reference Document Information for PO-based GRNs */}
                    {referenceDocumentInfo && (
                        <>
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 uppercase tracking-wider">{referenceDocumentInfo.label}</p>
                                <p className="font-bold text-lg text-gray-900">{referenceDocumentInfo.value}</p>
                            </div>
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 uppercase tracking-wider">{referenceDocumentInfo.dateLabel}</p>
                                <p className="font-bold text-lg text-gray-900">{referenceDocumentInfo.dateValue}</p>
                            </div>
                        </>
                    )}
                    {grn?.approvedBy && (
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                            <p className="text-sm text-gray-500 uppercase tracking-wider">Approved By</p>
                            <p className="font-bold text-lg text-gray-900">{grn.approvedBy?.name || 'N/A'}</p>
                        </div>
                    )}
                    {grn?.rejectionReason && (
                        <div className="bg-red-50 p-5 rounded-lg border border-red-100 md:col-span-2 lg:col-span-4">
                            <p className="text-sm text-red-500 uppercase tracking-wider">Rejection Reason</p>
                            <p className="font-medium text-red-800 mt-1">{grn.rejectionReason}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Items Table - Show carton-based table for Delivery Challan GRNs */}
            {grn && grn.sourceType === 'jobber' && grn.cartonsReturned !== undefined ? (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="border-b border-gray-200 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Carton Return Details</h2>
                        <p className="text-gray-600 mt-1">Information about cartons sent and returned</p>
                    </div>
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
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
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
                </div>
            ) : (
                // Show material-based table for Purchase Order GRNs
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="border-b border-gray-200 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Items Received</h2>
                        <p className="text-gray-600 mt-1">List of items received in this goods receipt note</p>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Received Items</h3>
                            <span className="bg-F2C94C text-gray-900 px-3 py-1 rounded-full font-medium">
                                {editedItems.length} items
                            </span>
                        </div>
                        <ReceivedItemsDisplay items={editedItems} />
                    </div>
                </div>
            )}

            {/* Action Buttons - Remove all edit buttons, keep only approval buttons for admins */}
            {(grn?.status === 'Pending Admin Approval' && user?.role === 'Admin') && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="border-b border-gray-200 pb-4 mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Actions</h2>
                        <p className="text-gray-600 mt-1">Approve or reject this goods receipt note</p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-end">
                        <button
                            onClick={() => handleApproval('Approved')}
                            disabled={isProcessing}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
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
                            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                            <FaTimes className="mr-2" />
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            <Modal isOpen={isRejectModalOpen} onClose={() => setIsRejectModalOpen(false)} title="Reject GRN">
                <div className="space-y-4">
                    <p className="text-gray-700">Please provide a reason for rejecting this GRN:</p>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-F2C94C focus:border-transparent"
                        placeholder="Enter rejection reason..."
                    />
                    <div className="flex justify-end space-x-3 pt-2">
                        <button
                            onClick={() => setIsRejectModalOpen(false)}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-F2C94C transition-colors duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleApproval('Rejected')}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                        >
                            {isProcessing ? (
                                <FaSpinner className="animate-spin mr-2" />
                            ) : (
                                <FaTimes className="mr-2" />
                            )}
                            Reject GRN
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default GRNDetail;