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
        <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {purchaseOrders.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-gray-100 rounded-full p-4 mb-3">
                                        <FaEye className="text-gray-400 text-2xl" />
                                    </div>
                                    <p className="text-lg font-medium">No purchase orders found</p>
                                    <p className="text-sm mt-1">Create a new purchase order to get started</p>
                                    <Link to="/purchase-orders/create" className="mt-3 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm font-medium">
                                        Create New PO
                                    </Link>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        purchaseOrders.map(po => (
                            <tr key={po._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{po.supplier?.name || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{formatDate(po.createdAt)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(po.totalAmount)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex items-center space-x-2">
                                        <Link to={`/purchase-orders/${po._id}`} className="text-primary-600 hover:text-primary-900 flex items-center">
                                            <FaEye className="mr-1" /> View
                                        </Link>
                                        {po.status === 'Pending' && (
                                            <>
                                                <button 
                                                    onClick={() => handleApprove(po._id)}
                                                    className="text-green-600 hover:text-green-900 flex items-center"
                                                    title="Approve Purchase Order"
                                                >
                                                    <FaCheck className="mr-1" /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleReject(po._id)}
                                                    className="text-red-600 hover:text-red-900 flex items-center"
                                                    title="Reject Purchase Order"
                                                >
                                                    <FaTimes className="mr-1" /> Reject
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
                    <FaSpinner className="animate-spin text-primary-500 mx-auto text-3xl" />
                    <p className="mt-4 text-gray-600">Loading purchase orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <div className="p-6 bg-red-50 text-red-800 rounded-lg">
                    <div className="flex items-center">
                        <FaSpinner className="mr-3 text-xl" />
                        <span>{error}</span>
                    </div>
                    <button 
                        onClick={fetchPurchaseOrders}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                    >
                        <FaRedo className="mr-2" />
                        Retry
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Packing Materials Purchase Orders</h2>
                    <p className="text-gray-600 mt-1">Manage and view all packing materials purchase orders</p>
                </div>
                <div className="flex space-x-3">
                    <ViewReportTools
                        data={filteredPurchaseOrders}
                        title="Packing Materials Purchase Orders"
                        fileName="PackingPOs"
                        metaDetails={{ user: 'Current User' }}
                        columns={reportColumns}
                    />
                    <button 
                        onClick={fetchPurchaseOrders}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
                        title="Refresh purchase orders"
                    >
                        <FaRedo className="mr-2" />
                        Refresh
                    </button>
                    <Link to="/purchase-orders/create" className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center">
                        <span className="mr-2">+</span> Create New PO
                    </Link>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="md:col-span-2">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by PO# or Supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            
            <div className="mt-6 text-sm text-gray-500 flex justify-between items-center">
                <div>
                    Showing {filteredPurchaseOrders.length} of {purchaseOrders.length} purchase orders
                </div>
                <div>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
            </div>
        </Card>
    );
};

export default ViewPurchaseOrders;