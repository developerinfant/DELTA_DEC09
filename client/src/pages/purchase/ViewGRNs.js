import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaRedo, FaSearch, FaFilter } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import Modal from '../../components/common/Modal';

// Modern, premium GRN table component with Apple-style design
const GRNTable = ({ grns, onOpenDetail, sourceType }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending Admin Approval': 
                return 'bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 border border-amber-200 shadow-sm';
            case 'Approved': 
                return 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm';
            case 'Rejected': 
                return 'bg-gradient-to-r from-rose-100 to-rose-50 text-rose-800 border border-rose-200 shadow-sm';
            case 'Completed': 
                return 'bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200 shadow-sm';
            case 'Partial': 
                return 'bg-gradient-to-r from-violet-100 to-violet-50 text-violet-800 border border-violet-200 shadow-sm';
            default: 
                return 'bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200 shadow-sm';
        }
    };

    return (
        <div className="overflow-hidden bg-white rounded-[var(--radius-lg)] shadow-lg border border-light-200/50 backdrop-blur-sm transition-all duration-300">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-light-200">
                    <thead className="bg-gradient-to-r from-light-100 to-light-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">GRN Number</th>
                            {sourceType === 'purchase_order' ? (
                                <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">PO Number</th>
                            ) : (
                                <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Delivery Challan No</th>
                            )}
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Supplier</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Date Received</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Received By</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-dark-600 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-light-200">
                        {grns.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-16 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="bg-gradient-to-r from-light-100 to-light-50 rounded-full p-6 mb-6 border-2 border-dashed border-light-300">
                                            <FaEye className="text-light-400 text-4xl" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-dark-800 mb-3">No GRNs Found</h3>
                                        <p className="text-light-600 mb-8 max-w-md text-lg">There are currently no packing materials goods receipt notes in the system. Get started by creating your first GRN.</p>
                                        <Link 
                                            to="/grn/create" 
                                            className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full hover:from-primary-600 hover:to-primary-700 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center"
                                        >
                                            <span className="mr-3 text-2xl font-bold">+</span> Create New GRN
                                        </Link>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            grns.map((grn, index) => (
                                <tr 
                                    key={grn._id} 
                                    className={`hover:bg-light-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-light-25'}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-semibold text-dark-900">{grn.grnNumber}</div>
                                    </td>
                                    {sourceType === 'purchase_order' ? (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-dark-700">{grn.purchaseOrder?.poNumber || 'N/A'}</div>
                                        </td>
                                    ) : (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-dark-700">{grn.deliveryChallan?.dc_no || 'N/A'}</div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-dark-700">{grn.supplier?.name || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-light-600">{formatDate(grn.dateReceived)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1.5 inline-flex text-xs leading-4 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                            {grn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-dark-700">{grn.receivedBy || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => onOpenDetail(grn)}
                                            className="text-primary-600 hover:text-primary-800 flex items-center px-3 py-2 rounded-lg hover:bg-primary-50 transition-colors duration-200"
                                        >
                                            <FaEye className="mr-2" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Modal component for displaying jobber GRN details
const JobberGRNDetailsModal = ({ isOpen, onClose, grn }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (!grn) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Jobber GRN Details">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.grnNumber}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Delivery Challan No</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.deliveryChallan?.dc_no || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.supplier?.name || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date Received</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(grn.dateReceived)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.status}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Approved By</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.receivedBy || grn.approvedBy?.name || 'N/A'}</p>
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Items</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Received</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {grn.items.map((item, index) => {
                                    const orderedQty = item.orderedQuantity || 0;
                                    const previousReceived = item.previousReceived || 0;
                                    const pendingQty = orderedQty - previousReceived;
                                    const receivedQty = item.receivedQuantity || 0;
                                    const balanceQty = pendingQty - receivedQty;
                                    
                                    return (
                                        <tr key={index}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.material?.name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {orderedQty}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {previousReceived}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {pendingQty}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {receivedQty}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {balanceQty}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${receivedQty === pendingQty ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {receivedQty === pendingQty ? 'Completed' : 'Partial'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

const ViewGRNs = () => {
    const navigate = useNavigate();
    const [grns, setGrns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sourceType, setSourceType] = useState('purchase_order'); // Default to purchase order
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchGRNs = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch only packing material GRNs for this view to maintain separation
            const { data } = await api.get(`/grn?materialType=packing&sourceType=${sourceType}`);
            setGrns(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to fetch GRNs.');
            console.error('Error fetching GRNs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGRNs();
        
        // Set up polling for real-time updates (every 30 seconds)
        const intervalId = setInterval(fetchGRNs, 30000);
        
        // Add event listener for when the tab becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchGRNs();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(intervalId); // Clean up interval on unmount
        };
    }, [sourceType]);

    // Add event listener for custom refresh event
    useEffect(() => {
        const handleGRNUpdate = () => {
            fetchGRNs();
        };

        window.addEventListener('grnUpdated', handleGRNUpdate);
        return () => {
            window.removeEventListener('grnUpdated', handleGRNUpdate);
        };
    }, []);

    const filteredGRNs = useMemo(() => {
        return grns.filter(grn => {
            const supplierName = grn.supplier?.name || '';
            const referenceNumber = sourceType === 'purchase_order' 
                ? (grn.purchaseOrder?.poNumber || '') 
                : (grn.deliveryChallan?.dc_no || '');
            const matchesSearch = grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter ? grn.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [grns, searchTerm, statusFilter, sourceType]);

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'GRN Number', key: 'grnNumber' },
        { 
            header: sourceType === 'purchase_order' ? 'PO Number' : 'Delivery Challan No', 
            key: sourceType === 'purchase_order' ? 'purchaseOrder.poNumber' : 'deliveryChallan.dc_no' 
        },
        { header: 'Supplier', key: 'supplier.name' },
        { header: 'Date Received', key: 'dateReceived', render: (value) => new Date(value).toLocaleDateString() },
        { header: 'Status', key: 'status' },
        { header: 'Received By', key: 'receivedBy' }
    ];

    // Format data for export
    const formatDataForExport = (data) => {
        return data.map(grn => ({
            'GRN Number': grn.grnNumber,
            [sourceType === 'purchase_order' ? 'PO Number' : 'Delivery Challan No']: 
                sourceType === 'purchase_order' 
                    ? (grn.purchaseOrder?.poNumber || 'N/A') 
                    : (grn.deliveryChallan?.dc_no || 'N/A'),
            'Supplier': grn.supplier?.name || 'N/A',
            'Date Received': grn.dateReceived ? new Date(grn.dateReceived).toLocaleDateString() : 'N/A',
            'Status': grn.status,
            'Received By': grn.receivedBy || 'N/A'
        }));
    };

    // Add a detailed report function for GRN items
    const generateDetailedReport = (grns) => {
        const rows = [];
        grns.forEach(grn => {
            grn.items.forEach(item => {
                rows.push({
                    'GRN Number': grn.grnNumber,
                    [sourceType === 'purchase_order' ? 'PO Number' : 'Delivery Challan No']: 
                        sourceType === 'purchase_order' 
                            ? (grn.purchaseOrder?.poNumber || 'N/A') 
                            : (grn.deliveryChallan?.dc_no || 'N/A'),
                    'Supplier': grn.supplier?.name || 'N/A',
                    'Date Received': new Date(grn.dateReceived).toLocaleDateString(),
                    'Material': item.material?.name || 'N/A',
                    'Material Type': item.materialModel?.replace('Material', '') || 'N/A',
                    'Ordered Quantity': item.orderedQuantity,
                    'Received Quantity': item.receivedQuantity,
                    'Balance Quantity': item.balanceQuantity !== undefined ? item.balanceQuantity : (item.orderedQuantity - item.receivedQuantity),
                    'Damaged Quantity': item.damagedQuantity,
                    'Unit Price': item.unitPrice,
                    'Total Amount': item.totalPrice,
                    'Status': grn.status
                });
            });
        });
        return rows;
    };

    // Define detailed report columns
    const detailedReportColumns = [
        'GRN Number',
        sourceType === 'purchase_order' ? 'PO Number' : 'Delivery Challan No',
        'Supplier',
        'Date Received',
        'Material',
        'Material Type',
        'Ordered Quantity',
        'Received Quantity',
        'Balance Quantity',
        'Damaged Quantity',
        'Unit Price',
        'Total Amount',
        'Status'
    ];

    const handleOpenDetail = (grn) => {
        if (sourceType === 'jobber') {
            // For jobber GRNs, show the custom modal
            setSelectedGRN(grn);
            setIsDetailModalOpen(true);
        } else {
            // For PO-based GRNs, navigate to the existing detail page
            navigate(`/grn/${grn._id}`);
        }
    };

    const handleCloseDetail = () => {
        setIsDetailModalOpen(false);
        setSelectedGRN(null);
    };

    const handleCreateGRN = () => {
        // Navigate to create GRN page with the selected source type
        navigate('/grn/create', { state: { sourceType } });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[70vh]">
                <div className="text-center bg-white rounded-[var(--radius-lg)] p-8 shadow-lg border border-light-200/50 max-w-md w-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-6">
                        <FaSpinner className="animate-spin text-primary-500 text-3xl" />
                    </div>
                    <h3 className="text-xl font-semibold text-dark-800 mb-2">Loading GRN Records</h3>
                    <p className="text-light-600">Please wait while we fetch your packing materials goods receipt notes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-[70vh]">
                <div className="text-center bg-white rounded-[var(--radius-lg)] p-8 shadow-lg border border-light-200/50 max-w-md w-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                        <FaSpinner className="text-red-500 text-3xl" />
                    </div>
                    <h3 className="text-xl font-semibold text-dark-800 mb-2">Unable to Load GRNs</h3>
                    <p className="text-light-600 mb-6">{error}</p>
                    <button 
                        onClick={fetchGRNs}
                        className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full hover:from-red-600 hover:to-red-700 flex items-center shadow-md hover:shadow-lg transition-all duration-300"
                    >
                        <FaRedo className="mr-2" />
                        Retry Loading
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section with Modern Gradient Background */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-[var(--radius-lg)] p-6 shadow-lg backdrop-blur-sm border border-primary-300/30">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                    <div className="text-white">
                        <h1 className="text-3xl font-bold mb-2">Packing Materials Goods Receipt Notes</h1>
                        <p className="text-primary-100 max-w-2xl">Manage and view all packing materials goods receipt notes with real-time updates and comprehensive tracking</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <ViewReportTools
                            data={filteredGRNs}
                            title="Packing Materials Goods Receipt Notes"
                            fileName="PackingGRNs"
                            metaDetails={{ user: 'Current User' }}
                            columns={reportColumns}
                            formatDataForExport={formatDataForExport}
                            detailedData={generateDetailedReport(filteredGRNs)}
                            detailedTitle="Packing Materials GRN Items Detailed Report"
                            detailedFileName="PackingGRNItemsDetailed"
                            detailedColumns={detailedReportColumns}
                        />
                        <button 
                            onClick={fetchGRNs}
                            className="px-5 py-3 bg-white/20 text-white rounded-full hover:bg-white/30 flex items-center backdrop-blur-sm border border-white/20 transition-all duration-300 shadow-md hover:shadow-lg"
                            title="Refresh GRNs"
                        >
                            <FaRedo className="mr-2" />
                            Refresh
                        </button>
                        <button 
                            onClick={handleCreateGRN}
                            className="px-5 py-3 bg-white text-primary-600 rounded-full hover:bg-light-100 flex items-center shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                        >
                            <span className="mr-2 text-xl font-bold">+</span> Create New GRN
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Search and Filter Section with Modern Design */}
            <Card className="p-0 rounded-[var(--radius-lg)] border border-light-200/50 shadow-sm">
                <div className="p-6 border-b border-light-200/50 bg-gradient-to-r from-light-50 to-white rounded-t-[var(--radius-lg)]">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <h2 className="text-xl font-bold text-dark-800">GRN Records</h2>
                        <div className="flex items-center text-sm text-light-600">
                            <span className="flex items-center mr-4">
                                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                                Real-time Updates
                            </span>
                            <span>
                                Showing {filteredGRNs.length} of {grns.length} records
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="md:col-span-2">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-light-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Search by GRN#, ${sourceType === 'purchase_order' ? 'PO#' : 'DC#'}, or Supplier...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 text-dark-700 bg-white border border-light-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all duration-300"
                                />
                            </div>
                        </div>
                        <div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaFilter className="text-light-400" />
                                </div>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 text-dark-700 bg-white border border-light-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm appearance-none transition-all duration-300"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Completed">Completed</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Pending Admin Approval">Pending Admin Approval</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    {/* Source Type Toggle */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">Source Type:</span>
                            <div className="flex rounded-md shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setSourceType('purchase_order')}
                                    className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                                        sourceType === 'purchase_order'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500`}
                                >
                                    Purchase Order
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSourceType('jobber')}
                                    className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                                        sourceType === 'jobber'
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500`}
                                >
                                    Jobber Delivery Challan
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <GRNTable 
                        grns={filteredGRNs} 
                        onOpenDetail={handleOpenDetail}
                        sourceType={sourceType}
                    />
                </div>
            </Card>
            
            {/* Footer with Last Updated Information */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center text-sm text-light-600 bg-white rounded-[var(--radius-lg)] p-4 shadow-sm border border-light-200/50">
                <div className="mb-2 md:mb-0">
                    <span className="font-medium">Records Displayed:</span> {filteredGRNs.length} of {grns.length} total GRNs
                </div>
                <div>
                    <span className="font-medium">Last Updated:</span> {lastUpdated.toLocaleTimeString()} • Auto-refresh every 30 seconds
                </div>
            </div>
            
            {/* Jobber GRN Details Modal */}
            <JobberGRNDetailsModal 
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetail}
                grn={selectedGRN}
            />
        </div>
    );
};

export default ViewGRNs;