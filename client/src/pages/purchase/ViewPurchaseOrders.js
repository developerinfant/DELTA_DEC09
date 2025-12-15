import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaRedo, FaCheck, FaTimes } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import { exportPOToExcel } from '../../utils/excelExporter';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

// This component can be moved to its own file later if needed
const PurchaseOrdersTable = ({ purchaseOrders, user, onStatusUpdate }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };
    
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    }

    const getStatusClass = (status) => {
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

    // Get associated GRN status for a PO
    const getGRNStatus = (po) => {
        // This would typically come from the backend, but for now we'll simulate
        // In a real implementation, this data would be included in the PO object
        return null;
    };

    const handleApprove = async (poId) => {
        try {
            const response = await api.put(`/purchase-orders/${poId}/approve`);
            if (response.data.success) {
                toast.success('Purchase Order Approved Successfully');
                onStatusUpdate();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve purchase order.');
        }
    };

    const handleReject = async (poId) => {
        try {
            const response = await api.put(`/purchase-orders/${poId}/reject`);
            if (response.data.success) {
                toast.success('Purchase Order Rejected Successfully');
                onStatusUpdate();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject purchase order.');
        }
    };

    return (
        <div className="overflow-x-auto bg-white rounded-[16px] shadow-lg border border-[#E7E2D8]">
            <table className="min-w-full divide-y divide-[#E7E2D8]">
                <thead className="bg-[#FAF7F2]">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E7E2D8]">
                    {purchaseOrders.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-[#6A6A6A]">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-[#FAF7F2] rounded-full p-5 mb-4">
                                        <FaEye className="text-[#6A6A6A] text-3xl" />
                                    </div>
                                    <p className="text-lg font-medium">No purchase orders found</p>
                                    <p className="text-sm mt-2">Create a new purchase order to get started</p>
                                    <Link to="/purchase-orders/create" className="mt-4 px-5 py-2.5 bg-[#F2C94C] text-[#1A1A1A] rounded-[14px] hover:bg-[#e0b840] text-sm font-medium transition-all duration-200 shadow-sm">
                                        Create New PO
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        purchaseOrders.map(po => (
                            <tr key={po._id} className="hover:bg-[#FAF7F2] transition-colors duration-150">
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="text-sm font-medium text-[#1A1A1A]">{po.poNumber}</div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="text-sm text-[#1A1A1A]">{po.supplier?.name || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="text-sm text-[#6A6A6A]">{formatDate(po.createdAt)}</div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-[#1A1A1A]">{formatCurrency(po.totalAmount)}</div>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap">
                                    <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-3">
                                        <Link to={`/purchase-orders/${po._id}`} className="text-[#6A7F3F] hover:text-[#5a6d35] flex items-center transition-colors duration-200">
                                            <FaEye className="mr-1.5" /> View
                                        </Link>
                                        {po.status === 'Pending' && (
                                            <>
                                                <button 
                                                    onClick={() => handleApprove(po._id)}
                                                    className="text-green-600 hover:text-green-800 flex items-center transition-colors duration-200"
                                                    title="Approve Purchase Order"
                                                >
                                                    <FaCheck className="mr-1.5" /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(po._id)}
                                                    className="text-red-600 hover:text-red-800 flex items-center transition-colors duration-200"
                                                    title="Reject Purchase Order"
                                                >
                                                    <FaTimes className="mr-1.5" /> Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

const ViewPurchaseOrders = () => {
    const { user } = useAuth();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchPurchaseOrders = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch only packing material POs for this view to maintain separation
            const { data } = await api.get('/purchase-orders?materialType=packing');
            setPurchaseOrders(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to fetch purchase orders.');
            console.error('Error fetching POs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchaseOrders();
        
        // Set up polling for real-time updates (every 30 seconds)
        const intervalId = setInterval(fetchPurchaseOrders, 30000);
        
        // Add event listener for when the tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchPurchaseOrders();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId); // Clean up interval on unmount
        };
    }, []);

    const filteredPurchaseOrders = useMemo(() => {
        return purchaseOrders.filter(po => {
            const supplierName = po.supplier?.name || '';
            const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || supplierName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter ? po.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [purchaseOrders, searchTerm, statusFilter]);

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'PO Number', key: 'poNumber' },
        { header: 'Supplier', key: 'supplier', render: (value) => value?.name || 'N/A' },
        { header: 'Date', key: 'createdAt', render: (value) => new Date(value).toLocaleDateString() },
        { header: 'Total Amount', key: 'totalAmount', render: (value) => `₹${parseFloat(value).toFixed(2)}` },
        { header: 'Status', key: 'status', render: (value) => (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                value === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                value === 'Approved' ? 'bg-blue-100 text-blue-800' :
                value === 'Rejected' ? 'bg-red-100 text-red-800' :
                value === 'Ordered' ? 'bg-indigo-100 text-indigo-800' :
                value === 'Partially Received' ? 'bg-purple-100 text-purple-800' :
                value === 'Completed' ? 'bg-green-100 text-green-800' :
                value === 'Cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {value}
            </span>
        ) }
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-[#F2C94C] mx-auto text-4xl" />
                    <p className="mt-5 text-[#1A1A1A] text-lg">Loading purchase orders...</p>
                    <p className="mt-2 text-[#6A6A6A]">Please wait while we fetch the information</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6">
                <div className="p-6 bg-red-50 text-red-800 rounded-[14px] border border-red-200">
                    <div className="flex items-center">
                        <FaSpinner className="mr-4 text-2xl" />
                        <span>{error}</span>
                    </div>
                    <button 
                        onClick={fetchPurchaseOrders}
                        className="mt-5 px-5 py-2.5 bg-red-600 text-white rounded-[12px] hover:bg-red-700 flex items-center transition-all duration-200"
                    >
                        <FaRedo className="mr-2" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FAF7F2] min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-[16px] shadow-lg border border-[#E7E2D8] p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8">
                        <div>
                            <h2 className="text-2xl font-bold text-[#1A1A1A]">Packing Materials Purchase Orders</h2>
                            <p className="text-[#6A6A6A] mt-2">Manage and view all packing materials purchase orders</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <Link to="/purchase-orders/create" className="px-5 py-2.5 bg-[#F2C94C] text-[#1A1A1A] rounded-[14px] hover:bg-[#e0b840] flex items-center transition-all duration-200 shadow-sm font-medium">
                                <span className="mr-2 text-lg">+</span> Create New PO
                            </Link>
                            <ViewReportTools
                                data={filteredPurchaseOrders}
                                title="Packing Materials Purchase Orders"
                                fileName="PackingPOs"
                                metaDetails={{ user: 'Current User' }}
                                columns={reportColumns}
                            />
                            <button 
                                onClick={fetchPurchaseOrders}
                                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-[14px] hover:bg-gray-200 flex items-center transition-all duration-200"
                                title="Refresh purchase orders"
                            >
                                <FaRedo className="mr-2" />
                                Refresh
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by PO# or Supplier..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-5 py-3.5 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                                />
                            </div>
                        </div>
                        <div>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full px-5 py-3.5 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Ordered">Ordered</option>
                                <option value="Partially Received">Partially Received</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    
                    <PurchaseOrdersTable purchaseOrders={filteredPurchaseOrders} user={user} onStatusUpdate={fetchPurchaseOrders} />
                    
                    <div className="mt-6 text-sm text-[#6A6A6A] flex justify-between items-center">
                        <div>
                            Showing {filteredPurchaseOrders.length} of {purchaseOrders.length} purchase orders
                        </div>
                        <div>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewPurchaseOrders;