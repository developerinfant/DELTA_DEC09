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
        <div className="flex justify-center items-center h-96 bg-[#FAF7F2]">
            <div className="text-center">
                <FaSpinner className="animate-spin text-[#F2C94C] mx-auto text-4xl" />
                <p className="mt-5 text-xl text-[#1A1A1A]">Loading purchase order details...</p>
                <p className="mt-2 text-[#6A6A6A]">Please wait while we fetch the information</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="max-w-4xl mx-auto bg-[#FAF7F2] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                <div className="p-6 bg-red-50 text-red-800 rounded-[14px] border border-red-200">
                    <div className="flex items-center">
                        <FaBan className="mr-4 text-2xl" />
                        <div>
                            <h3 className="text-lg font-bold">Error Loading Data</h3>
                            <p className="mt-1">{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    
    if (!po) return (
        <div className="max-w-4xl mx-auto bg-[#FAF7F2] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                <div className="text-center py-12">
                    <div className="bg-[#FAF7F2] rounded-full p-5 inline-block mb-5">
                        <FaFileInvoice className="text-[#6A6A6A] text-3xl" />
                    </div>
                    <p className="text-[#6A6A6A] text-lg">Purchase Order not found.</p>
                </div>
            </div>
        </div>
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
        <div className="max-w-7xl mx-auto bg-[#FAF7F2] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">Purchase Order Details</h1>
                        <div className="flex items-center gap-4 flex-wrap">
                            <p className="text-lg font-semibold text-[#6A7F3F]">{po.poNumber}</p>
                            <span className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${getStatusBadgeClass(po.status)}`}>
                                {po.status}
                            </span>
                        </div>
                        <p className="text-[#6A6A6A] mt-2">Created on {formatDate(po.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {canCreateGRN && (
                            <button 
                                onClick={() => navigate(grnCreatePath)} 
                                className="flex items-center px-5 py-2.5 bg-gradient-to-r from-[#6A7F3F] to-[#5a6d35] text-white rounded-[14px] hover:from-[#5a6d35] hover:to-[#4a5d25] shadow-md transition-all duration-200 font-medium"
                            >
                                <FaBox className="mr-2" /> Create GRN
                            </button>
                        )}
                        <button 
                            onClick={handleViewReport} 
                            className="flex items-center px-5 py-2.5 bg-gradient-to-r from-[#F2C94C] to-[#e0b840] text-[#1A1A1A] rounded-[14px] hover:from-[#e0b840] hover:to-[#d0a830] shadow-md transition-all duration-200 font-medium"
                        >
                            <FaPrint className="mr-2" /> View Report
                        </button>
                        <Link 
                            to={backPath} 
                            className="flex items-center px-5 py-2.5 bg-gray-100 text-gray-700 rounded-[14px] hover:bg-gray-200 transition-all duration-200 font-medium"
                        >
                            &larr; Back to List
                        </Link>
                    </div>
                </div>
            </div>

            {po.status === 'Cancelled' && (
                <div className="mb-8 p-5 bg-red-50 text-red-800 rounded-[16px] border border-red-200 shadow-sm flex items-start">
                    <FaBan className="mr-5 mt-1 text-2xl flex-shrink-0 text-red-500" />
                    <div>
                        <h3 className="font-bold text-lg mb-2">Purchase Order Cancelled</h3>
                        <p className="text-red-700">This Purchase Order has been cancelled. GRN creation and editing are disabled.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Supplier Details Card */}
                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Supplier Information</h3>
                    <div className="space-y-5">
                        <div className="flex items-start">
                            <div className="bg-blue-100 p-4 rounded-[14px] mr-5">
                                <FaBuilding className="text-blue-600 text-2xl" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Supplier Name</p>
                                <p className="font-semibold text-lg">{po.supplier?.name || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Contact Person</p>
                                <p className="font-medium">{po.supplier?.contactPerson || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Phone</p>
                                <p className="font-medium">{po.supplierPhone || po.supplier?.phone || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div>
                            <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Address</p>
                            <p className="font-medium">{po.supplierAddress || po.supplier?.address || 'N/A'}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Email</p>
                                <p className="font-medium">{po.supplierEmail || po.supplier?.email || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">GSTIN</p>
                                <p className="font-medium">{po.supplierGSTIN || po.supplier?.gstin || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order Details Card */}
                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Order Information</h3>
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">PO Number</p>
                                <p className="font-semibold text-lg">{po.poNumber}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Date Created</p>
                                <p className="font-medium">{formatDate(po.createdAt)}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Expected Delivery</p>
                                <p className="font-medium">{formatDate(po.expectedDeliveryDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Payment Terms</p>
                                <p className="font-medium">{po.paymentTerms || 'N/A'}</p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Prepared By</p>
                                <p className="font-medium">{po.preparedBy || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Approved By</p>
                                <p className="font-medium">{po.approvedByName || po.approvedBy?.name || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items Table Card */}
            <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6 mb-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Order Items</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E7E2D8]">
                        <thead className="bg-[#FAF7F2]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">S.No</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Item Code</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Material</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">HSN</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Qty</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">UOM</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Rate (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Disc%</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">GST%</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">CGST (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">SGST (₹)</th>
                                <th scope="col" className="px-6 py-4 text-right text-xs font-medium text-[#1A1A1A] uppercase tracking-wider">Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-[#E7E2D8]">
                            {po.items?.map((item, index) => (
                                <tr key={item._id} className="hover:bg-[#FAF7F2] transition-colors duration-150">
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A]">{index + 1}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">{item.itemCode || 'N/A'}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">{item.material?.name || 'N/A'}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A]">{item.hsn || 'N/A'}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{item.quantity}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A]">{item.uom || 'N/A'}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{formatCurrency(item.rate)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{item.discountPercent}%</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{item.gstPercent}%</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{formatCurrency(item.cgst)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A] text-right">{formatCurrency(item.sgst)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-[#1A1A1A] text-right">{formatCurrency(item.lineTotal)}</td>
                                </tr>
                            ))}
                            <tr className="bg-[#FAF7F2] font-bold">
                                <td colSpan="9" className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A] text-right">Total</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A] text-right">{formatCurrency(po.totalCGST)}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A] text-right">{formatCurrency(po.totalSGST)}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A] text-right">{formatCurrency(po.grandTotal)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Financial Summary Card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Financial Summary</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-[#E7E2D8]">
                            <span className="text-[#6A6A6A]">Taxable Amount:</span>
                            <span className="font-medium">{formatCurrency(po.taxableAmount)}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-[#E7E2D8]">
                            <span className="text-[#6A6A6A]">Total CGST:</span>
                            <span className="font-medium">{formatCurrency(po.totalCGST)}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-[#E7E2D8]">
                            <span className="text-[#6A6A6A]">Total SGST:</span>
                            <span className="font-medium">{formatCurrency(po.totalSGST)}</span>
                        </div>
                        <div className="flex justify-between py-3 border-b border-[#E7E2D8]">
                            <span className="text-[#6A6A6A]">Round Off:</span>
                            <span className="font-medium">{formatCurrency(po.roundOff)}</span>
                        </div>
                        <div className="flex justify-between pt-4 border-t border-[#1A1A1A]">
                            <span className="text-lg font-bold text-[#1A1A1A]">Grand Total:</span>
                            <span className="text-xl font-extrabold text-[#6A7F3F]">{formatCurrency(po.totalAmount)}</span>
                        </div>
                        <div className="pt-4 border-t border-[#E7E2D8]">
                            <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Amount in Words</p>
                            <p className="font-medium mt-1">{po.amountInWords || 'N/A'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Bank Details</h3>
                    <div className="space-y-5">
                        {po.supplier?.bankName ? (
                            <>
                                <div className="flex items-start">
                                    <div className="bg-green-100 p-4 rounded-[14px] mr-5">
                                        <FaMoneyBillWave className="text-green-600 text-2xl" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Bank Name</p>
                                        <p className="font-medium">{po.supplier.bankName}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">Account Number</p>
                                        <p className="font-medium">{po.supplier.accountNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">IFSC Code</p>
                                        <p className="font-medium">{po.supplier.ifscCode}</p>
                                    </div>
                                </div>
                                
                                {po.supplier?.panNumber && (
                                    <div>
                                        <p className="text-sm text-[#6A6A6A] uppercase tracking-wide mb-1">PAN Number</p>
                                        <p className="font-medium">{po.supplier.panNumber}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8">
                                <div className="bg-[#FAF7F2] rounded-full p-5 inline-block mb-4">
                                    <FaMoneyBillWave className="text-[#6A6A6A] text-2xl" />
                                </div>
                                <p className="text-[#6A6A6A]">No bank details provided</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Authorization Card */}
            <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6 mb-6">
                <h3 className="text-lg font-semibold text-[#1A1A1A] mb-6 pb-3 border-b border-[#E7E2D8]">Authorization</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="flex flex-col items-center">
                        <div className="bg-blue-100 p-5 rounded-full mb-4">
                            <FaUser className="text-blue-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-[#E7E2D8] pt-5">
                            <p className="font-medium text-lg">Prepared By</p>
                            <p className="text-[#6A6A6A] mt-2">{po.preparedBy || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="bg-green-100 p-5 rounded-full mb-4">
                            <FaUser className="text-green-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-[#E7E2D8] pt-5">
                            <p className="font-medium text-lg">Approved By</p>
                            <p className="text-[#6A6A6A] mt-2">{po.approvedByName || po.approvedBy?.name || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="bg-purple-100 p-5 rounded-full mb-4">
                            <FaSignature className="text-purple-600 text-2xl" />
                        </div>
                        <div className="border-t-2 border-[#E7E2D8] pt-5">
                            <p className="font-medium text-lg">Supplier Signature</p>
                            <p className="text-[#6A6A6A] mt-2">Authorized Signatory</p>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Admin Actions Card */}
            {user.role === 'Admin' && (
                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                    <h3 className="text-lg font-semibold text-[#1A1A1A] mb-5 pb-3 border-b border-[#E7E2D8]">Admin Actions</h3>
                    <div className="flex flex-wrap items-center gap-4">
                        {po.status === 'Pending' ? (
                            <>
                                <p className="font-medium text-lg">Approval Actions:</p>
                                <button 
                                    onClick={handleApprove} 
                                    disabled={isUpdating} 
                                    className="flex items-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-[14px] hover:from-green-600 hover:to-emerald-700 shadow-md disabled:opacity-50 transition-all duration-200 font-medium"
                                >
                                    {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
                                    Approve
                                </button>
                                <button 
                                    onClick={handleReject} 
                                    disabled={isUpdating} 
                                    className="flex items-center px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-[14px] hover:from-red-600 hover:to-red-700 shadow-md disabled:opacity-50 transition-all duration-200 font-medium"
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
                                        className={`flex items-center px-5 py-2.5 rounded-[14px] transition-all duration-200 font-medium ${
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
                                        className="flex items-center px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-[14px] hover:from-orange-600 hover:to-amber-700 shadow-md disabled:opacity-50 transition-all duration-200 font-medium"
                                    >
                                        {isUpdating ? <FaSpinner className="animate-spin mr-2" /> : <FaRedo className="mr-2" />}
                                        Re-Order
                                    </button>
                                )}
                            </>
                        )}
                        
                        {hasGRNs && (
                            <div className="ml-4 px-5 py-2.5 bg-blue-50 text-blue-800 rounded-[14px] flex items-center">
                                <span className="font-medium mr-2">GRN Status:</span> 
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(latestGRNStatus)}`}>
                                    {latestGRNStatus}
                                </span>
                            </div>
                        )}
                    </div>
                    
                    {hasCompletedGRN && (
                        <div className="mt-5 p-4 bg-red-50 text-red-700 rounded-[12px] flex items-center">
                            <FaBan className="mr-3" />
                            <span>Cannot cancel — GRN fully completed.</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderDetail;