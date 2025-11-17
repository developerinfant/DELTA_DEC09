import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import { FaSpinner, FaBan, FaRedo, FaPrint, FaBox, FaTruck, FaFileInvoice, FaUser, FaBuilding, FaMoneyBillWave, FaSignature, FaCheck, FaTimes } from 'react-icons/fa';

const PurchaseOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [po, setPo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [grns, setGrns] = useState([]);

    const fetchPO = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get(`/purchase-orders/${id}`);
            setPo(data);
            
            try {
                const grnResponse = await api.get(`/grn?purchaseOrder=${id}`);
                setGrns(grnResponse.data);
            } catch (grnError) {
                console.error('Error fetching GRNs:', grnError);
                setGrns([]);
            }
        } catch (err) {
            setError('Failed to fetch Purchase Order details.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPO();
    }, [id]);
    
    useEffect(() => {
        const handleGRNUpdate = () => {
            fetchPO();
        };

        window.addEventListener('grnUpdated', handleGRNUpdate);
        return () => {
            window.removeEventListener('grnUpdated', handleGRNUpdate);
        };
    }, []);
    
    const handleStatusUpdate = async (newStatus) => {
        setIsUpdating(true);
        try {
            const response = await api.put(`/purchase-orders/${id}/status`, { status: newStatus });
            
            if (response.data.message) {
                alert(response.data.message);
            }
            
            fetchPO();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleApprove = async () => {
        setIsUpdating(true);
        try {
            const response = await api.put(`/purchase-orders/${id}/approve`);
            
            if (response.data.message) {
                alert(response.data.message);
            }
            
            fetchPO();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to approve purchase order.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReject = async () => {
        setIsUpdating(true);
        try {
            const response = await api.put(`/purchase-orders/${id}/reject`);
            
            if (response.data.message) {
                alert(response.data.message);
            }
            
            fetchPO();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to reject purchase order.');
        } finally {
            setIsUpdating(false);
        }
    };

    const getNavigationPaths = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return {
                backPath: '/stock/maintenance/purchase-orders',
                grnCreatePath: '/stock/maintenance/grn/create',
                printPath: '/stock/maintenance/purchase-orders'
            };
        } else if (location.pathname.includes('/packing/')) {
            return {
                backPath: '/packing/purchase-orders',
                grnCreatePath: '/packing/grn/create',
                printPath: '/packing/purchase-orders'
            };
        }
        return {
            backPath: '/purchase-orders',
            grnCreatePath: '/grn/create',
            printPath: '/purchase-orders'
        };
    };

    const { backPath, grnCreatePath, printPath } = getNavigationPaths();

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB');
    };
    
    const formatCurrency = (amount) => {
        if (!amount) return '₹0.00';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const hasCompletedGRN = grns.some(grn => grn.status === 'Completed');
    const hasGRNs = grns.length > 0;
    const latestGRNStatus = grns.length > 0 ? grns[0].status : null;

    if (isLoading) return (
        <div className="flex justify-center items-center h-96">
            <div className="text-center">
                <FaSpinner className="animate-spin text-primary-500 mx-auto text-4xl" />
                <p className="mt-4 text-xl text-gray-700">Loading purchase order details...</p>
                <p className="mt-2 text-gray-500">Please wait while we fetch the information</p>
            </div>
        </div>
    );
    
    if (error) return (
        <Card className="max-w-4xl mx-auto">
            <div className="p-6 bg-red-100 text-red-800 rounded-xl border border-red-200">
                <div className="flex items-center">
                    <FaBan className="mr-3 text-2xl" />
                    <div>
                        <h3 className="text-lg font-bold">Error Loading Data</h3>
                        <p className="mt-1">{error}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
    
    if (!po) return (
        <Card className="max-w-4xl mx-auto">
            <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-4 inline-block mb-4">
                    <FaFileInvoice className="text-gray-400 text-2xl" />
                </div>
                <p className="text-gray-500 text-lg">Purchase Order not found.</p>
            </div>
        </Card>
    );

    const canCreateGRN = po.status === 'Approved' || po.status === 'Ordered' || po.status === 'Partially Received';

    const handlePrint = async () => {
        // Assuming generateDeltaPOPDF is defined elsewhere
        // await generateDeltaPOPDF(po, 'download');
    };

    const handleViewReport = () => {
        navigate(`${printPath}/${id}/print`);
    };

    // Get status badge class
    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-blue-100 text-blue-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Ordered': return 'bg-indigo-100 text-indigo-800';
            case 'Partially Received': return 'bg-purple-100 text-purple-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-dark-800 mb-2">Purchase Order Details</h1>
                        <div className="flex items-center gap-4">
                            <p className="text-lg font-semibold text-primary-600">{po.poNumber}</p>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(po.status)}`}>
                                {po.status}
                            </span>
                        </div>
                        <p className="text-gray-600 mt-2">Created on {formatDate(po.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {canCreateGRN && (
                            <button 
                                onClick={() => navigate(grnCreatePath)} 
                                className="flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 shadow-md transition-all"
                            >
                                <FaBox className="mr-2" /> Create GRN
                            </button>
                        )}
                        <button 
                            onClick={handleViewReport} 
                            className="flex items-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md transition-all"
                        >
                            <FaPrint className="mr-2" /> View Report
                        </button>
                        <Link 
                            to={backPath} 
                            className="flex items-center px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                        >
                            &larr; Back to List
                        </Link>
                    </div>
                </div>
            </div>

            {po.status === 'Cancelled' && (
                <div className="mb-8 p-5 bg-red-50 text-red-800 rounded-xl border border-red-200 shadow-sm flex items-start">
                    <FaBan className="mr-4 mt-1 text-xl flex-shrink-0 text-red-500" />
                    <div>
                        <h3 className="font-bold text-lg mb-1">Purchase Order Cancelled</h3>
                        <p className="text-red-700">This Purchase Order has been cancelled. GRN creation and editing are disabled.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Supplier Details Card */}
                <Card title="Supplier Information" className="shadow-lg" withShadow={true}>
                    <div className="space-y-5">
                        <div className="flex items-start">
                            <div className="bg-blue-100 p-3 rounded-lg mr-4">
                                <FaBuilding className="text-blue-600 text-xl" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Supplier Name</p>
                                <p className="font-semibold text-lg">{po.supplier?.name || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Contact Person</p>
                                <p className="font-medium">{po.supplier?.contactPerson || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Phone</p>
                                <p className="font-medium">{po.supplierPhone || po.supplier?.phone || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-sm text-gray-500 uppercase tracking-wide">Address</p>
                            <p className="font-medium">{po.supplierAddress || po.supplier?.address || 'N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Email</p>
                                <p className="font-medium">{po.supplierEmail || po.supplier?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">GSTIN</p>
                                <p className="font-medium">{po.supplierGSTIN || po.supplier?.gstin || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Order Details Card */}
                <Card title="Order Information" className="shadow-lg" withShadow={true}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">PO Number</p>
                                <p className="font-semibold text-lg">{po.poNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Date Created</p>
                                <p className="font-medium">{formatDate(po.createdAt)}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Expected Delivery</p>
                                <p className="font-medium">{formatDate(po.expectedDeliveryDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Payment Terms</p>
                                <p className="font-medium">{po.paymentTerms || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Prepared By</p>
                                <p className="font-medium">{po.preparedBy || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 uppercase tracking-wide">Approved By</p>
                                <p className="font-medium">{po.approvedBy?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Items Table Card */}
            <Card title="Order Items" className="mb-6 shadow-lg" withShadow={true}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Disc%</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">GST%</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">CGST (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SGST (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {po.items?.map((item, index) => (
                                <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.itemCode || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.material?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.hsn || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.uom || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.rate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.discountPercent}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.gstPercent}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.cgst)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.sgst)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.lineTotal)}</td>
                                </tr>
                            ))}
                            <tr className="bg-gray-50 font-bold">
                                <td colSpan="9" className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">Total</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(po.totalCGST)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(po.totalSGST)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(po.grandTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Card>
            
            {/* Financial Summary Card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card title="Financial Summary" className="shadow-lg" withShadow={true}>
                    <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Taxable Amount:</span>
                            <span className="font-medium">{formatCurrency(po.taxableAmount)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Total CGST:</span>
                            <span className="font-medium">{formatCurrency(po.totalCGST)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Total SGST:</span>
                            <span className="font-medium">{formatCurrency(po.totalSGST)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Round Off:</span>
                            <span className="font-medium">{formatCurrency(po.roundOff)}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-gray-300">
                            <span className="text-lg font-bold text-dark-800">Grand Total:</span>
                            <span className="text-xl font-extrabold text-primary-600">{formatCurrency(po.totalAmount)}</span>
                        </div>
                        <div className="pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600 uppercase tracking-wide">Amount in Words</p>
                            <p className="font-medium mt-1">{po.amountInWords || 'N/A'}</p>
                        </div>
                    </div>
                </Card>

                <Card title="Bank Details" className="shadow-lg" withShadow={true}>
                    <div className="space-y-4">
                        {po.supplier?.bankName ? (
                            <>
                                <div className="flex items-start">
                                    <div className="bg-green-100 p-3 rounded-lg mr-4">
                                        <FaMoneyBillWave className="text-green-600 text-xl" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-500 uppercase tracking-wide">Bank Name</p>
                                        <p className="font-medium">{po.supplier.bankName}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500 uppercase tracking-wide">Account Number</p>
                                        <p className="font-medium">{po.supplier.accountNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 uppercase tracking-wide">IFSC Code</p>
                                        <p className="font-medium">{po.supplier.ifscCode}</p>
                                    </div>
                                </div>
                                
                                {po.supplier?.panNumber && (
                                    <div>
                                        <p className="text-sm text-gray-500 uppercase tracking-wide">PAN Number</p>
                                        <p className="font-medium">{po.supplier.panNumber}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="bg-gray-100 rounded-full p-3 inline-block mb-3">
                                    <FaMoneyBillWave className="text-gray-400 text-xl" />
                                </div>
                                <p className="text-gray-500">No bank details provided</p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
            
            {/* Authorization Card */}
            <Card title="Authorization" className="mb-6 shadow-lg" withShadow={true}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="bg-blue-100 p-4 rounded-full mb-3">
                            <FaUser className="text-blue-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-gray-300 pt-4">
                            <p className="font-medium text-lg">Prepared By</p>
                            <p className="text-gray-600 mt-1">{po.preparedBy || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="bg-green-100 p-4 rounded-full mb-3">
                            <FaUser className="text-green-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-gray-300 pt-4">
                            <p className="font-medium text-lg">Approved By</p>
                            <p className="text-gray-600 mt-1">{po.approvedBy?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="bg-purple-100 p-4 rounded-full mb-3">
                            <FaSignature className="text-purple-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-gray-300 pt-4">
                            <p className="font-medium text-lg">Supplier Signature</p>
                            <p className="text-gray-600 mt-1">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </Card>
            
            {/* Admin Actions Card */}
            {user.role === 'Admin' && (
                <Card title="Admin Actions" className="shadow-lg" withShadow={true}>
                    <div className="flex flex-wrap items-center gap-4">
                        {po.status === 'Pending' ? (
                            <>
                                <p className="font-medium text-lg">Approval Actions:</p>
                                <button 
                                    onClick={handleApprove} 
                                    disabled={isUpdating} 
                                    className="flex items-center px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-md disabled:opacity-50 transition-all"
                                >
                                    {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                                    Approve
                                </button>
                                <button 
                                    onClick={handleReject} 
                                    disabled={isUpdating} 
                                    className="flex items-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 shadow-md disabled:opacity-50 transition-all"
                                >
                                    {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaTimes className="mr-2" />}
                                    Reject
                                </button>
                            </>
                        ) : (
                            <>
                                <p className="font-medium text-lg">Change Status:</p>
                                {po.status !== 'Cancelled' ? (
                                    <button 
                                        onClick={() => handleStatusUpdate('Cancelled')} 
                                        disabled={isUpdating || hasCompletedGRN} 
                                        className={`flex items-center px-4 py-2.5 rounded-lg transition-all ${
                                            hasCompletedGRN 
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md'
                                        }`}
                                        title={hasCompletedGRN ? "Cannot cancel — GRN fully completed." : "Cancel this purchase order"}
                                    >
                                        {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaBan className="mr-2" />}
                                        Cancel PO
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleStatusUpdate('Ordered')} 
                                        disabled={isUpdating} 
                                        className="flex items-center px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg hover:from-orange-600 hover:to-amber-700 shadow-md disabled:opacity-50 transition-all"
                                    >
                                        {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaRedo className="mr-2" />}
                                        Re-Order
                                    </button>
                                )}
                            </>
                        )}
                        
                        {hasGRNs && (
                            <div className="ml-4 px-4 py-2.5 bg-blue-50 text-blue-800 rounded-lg flex items-center">
                                <span className="font-medium mr-2">GRN Status:</span> 
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(latestGRNStatus)}`}>
                                    {latestGRNStatus}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {hasCompletedGRN && (
                        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center">
                            <FaBan className="mr-2" />
                            <span>Cannot cancel — GRN fully completed.</span>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default PurchaseOrderDetail;