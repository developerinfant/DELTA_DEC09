import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaDownload, FaPrint, FaFilePdf, FaCheck, FaTimes } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import { exportPOToExcel } from '../../utils/excelExporter';
import { generateDeltaPOPDF } from '../../utils/pdfGenerator';
import Modal from '../../components/common/Modal';
import DeltaPOPrintLayout, { generatePDFfromDeltaPOPrintLayout, generatePDFBlobFromDeltaPOPrintLayout } from '../purchase/DeltaPOPrintLayout';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

// This component can be moved to its own file later if needed
const PurchaseOrdersTable = ({ purchaseOrders, onViewReport, onDownloadPDF, onPrintPDF, onStatusUpdate, user }) => {
    const navigate = useNavigate();
    
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
            case 'Ordered': return 'bg-indigo-100 text-indigo-800';
            case 'Received': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleApprove = async (poId) => {
        try {
            const response = await api.put(`/purchase-orders/${poId}/approve`);
            toast.success('Purchase Order Approved Successfully');
            onStatusUpdate();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to approve purchase order.');
        }
    };

    const handleReject = async (poId) => {
        try {
            const response = await api.put(`/purchase-orders/${poId}/reject`);
            toast.success('Purchase Order Rejected Successfully');
            onStatusUpdate();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reject purchase order.');
        }
    };

    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {purchaseOrders.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-4 text-center text-secondary-500">No purchase orders found.</td>
                        </tr>
                    ) : (
                        purchaseOrders.map(po => (
                            <tr key={po._id} className="hover:bg-light-200">
                                <td className="px-6 py-4 text-sm font-medium text-dark-700">{po.poNumber}</td>
                                <td className="px-6 py-4 text-sm text-dark-700">{po.supplier?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-dark-700">{formatDate(po.createdAt)}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-dark-700">{formatCurrency(po.totalAmount)}</td>
                                <td className="px-6 py-4 text-sm">
                                    {po.status === 'Pending' && user?.role === 'Admin' ? (
                                        <div className="flex space-x-2">
                                            <button 
                                                onClick={() => handleApprove(po._id)}
                                                className="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center text-xs"
                                            >
                                                <FaCheck className="mr-1" /> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReject(po._id)}
                                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center text-xs"
                                            >
                                                <FaTimes className="mr-1" /> Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                            {po.status}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}>
                                        <Link to={`/packing/purchase-orders/${po._id}`} className="text-blue-500 hover:text-blue-700" title="View Details">
                                            <FaEye />
                                        </Link>
                                        <button 
                                            onClick={() => onDownloadPDF(po)} 
                                            className="text-red-500 hover:text-red-700"
                                            title="Download PDF"
                                        >
                                            <FaFilePdf />
                                        </button>
                                        <button 
                                            onClick={() => onPrintPDF(po)} 
                                            className="text-green-500 hover:text-green-700"
                                            title="Print PDF"
                                        >
                                            <FaPrint />
                                        </button>
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

const ViewPackingPurchaseOrders = () => {
    const { user } = useAuth();
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedPO, setSelectedPO] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchPurchaseOrders = async () => {
            try {
                const { data } = await api.get('/purchase-orders?materialType=packing');
                setPurchaseOrders(data);
            } catch (err) {
                setError('Failed to fetch purchase orders.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchPurchaseOrders();
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
                value === 'Ordered' ? 'bg-indigo-100 text-indigo-800' :
                value === 'Received' ? 'bg-green-100 text-green-800' :
                value === 'Cancelled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {value}
            </span>
        ) }
    ];
    
    // Format data for export
    const formatDataForExport = (data) => {
        return data.map(po => ({
            poNumber: po.poNumber,
            supplier: po.supplier?.name || 'N/A',
            createdAt: new Date(po.createdAt).toLocaleDateString(),
            totalAmount: parseFloat(po.totalAmount).toFixed(2),
            status: po.status
        }));
    };

    // Function to handle View Report - opens modal
    const handleViewReport = async (po) => {
        // Fetch the full PO data if needed
        let poData = po;
        if (!po.items || !po.supplier) {
            try {
                // If the PO data is not complete, fetch the full data
                const response = await api.get(`/purchase-orders/${po._id}`);
                poData = response.data;
            } catch (error) {
                console.error('Error fetching full PO data:', error);
                alert('Failed to load full purchase order data. Please try again.');
                return;
            }
        }
        
        setSelectedPO(poData);
        setIsModalOpen(true);
    };

    // Function to handle Download PDF - using DeltaPOPrintLayout for consistent layout
    const handleDownloadPDF = async (po) => {
        try {
            // Fetch the full PO data if needed
            let poData = po;
            if (!po.items || !po.supplier) {
                // If the PO data is not complete, fetch the full data
                const response = await api.get(`/purchase-orders/${po._id}`);
                poData = response.data;
            }
            
            // Use the new generatePDFfromDeltaPOPrintLayout for exact layout matching
            await generatePDFfromDeltaPOPrintLayout(poData);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    // Function to handle Print PDF - using DeltaPOPrintLayout for consistent layout
    const handlePrintPDF = async (po) => {
        try {
            // Fetch the full PO data if needed
            let poData = po;
            if (!po.items || !po.supplier) {
                // If the PO data is not complete, fetch the full data
                const response = await api.get(`/purchase-orders/${po._id}`);
                poData = response.data;
            }
            
            // Generate PDF blob using the new function
            const result = await generatePDFBlobFromDeltaPOPrintLayout(poData);
            
            if (result.success) {
                // Create blob URL and open in new tab
                const blobUrl = URL.createObjectURL(result.blob);
                
                // Open PDF in new tab
                const newWindow = window.open(blobUrl, '_blank');
                
                // Auto-trigger print when the new window loads
                if (newWindow) {
                    newWindow.onload = function() {
                        // Small delay to ensure PDF is loaded
                        setTimeout(() => {
                            newWindow.print();
                        }, 1000);
                    };
                }
            } else {
                console.error('Error generating PDF for printing:', result.error);
                alert('Failed to generate PDF for printing. Please try again.');
            }
        } catch (error) {
            console.error('Error printing PDF:', error);
            alert('Failed to print PDF. Please try again.');
        }
    };

    // Close modals
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedPO(null);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark-700">Packing Materials Purchase Orders</h2>
                <div className="flex space-x-2">
                    <Link to="/packing/purchase-orders/create" className="px-4 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600">
                        Create New PO
                    </Link>
                    <ViewReportTools
                        data={filteredPurchaseOrders}
                        title="Packing Materials Purchase Orders"
                        fileName="PackingPurchaseOrders"
                        metaDetails={{ user: 'Current User' }}
                        columns={reportColumns}
                        formatDataForExport={formatDataForExport}
                    />
                </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
                <input
                    type="text"
                    placeholder="Search PO number or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow px-4 py-2 border border-light-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-light-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                    <option value="">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Ordered">Ordered</option>
                    <option value="Received">Received</option>
                    <option value="Cancelled">Cancelled</option>
                </select>
            </div>
            
            <PurchaseOrdersTable 
                purchaseOrders={filteredPurchaseOrders} 
                onViewReport={handleViewReport}
                onDownloadPDF={handleDownloadPDF}
                onPrintPDF={handlePrintPDF}
                onStatusUpdate={() => {
                    // Refresh the purchase orders list
                    const fetchPurchaseOrders = async () => {
                        try {
                            const { data } = await api.get('/purchase-orders?materialType=packing');
                            setPurchaseOrders(data);
                        } catch (err) {
                            setError('Failed to fetch purchase orders.');
                        }
                    };
                    fetchPurchaseOrders();
                }}
                user={user}
            />
            
            {/* Modal for View Report */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title="Purchase Order Report" size="large">
                <div className="p-4">
                    {selectedPO && (
                        <div className="bg-white">
                            <DeltaPOPrintLayout poData={selectedPO} />
                        </div>
                    )}
                </div>
            </Modal>
        </Card>
    );
};

export default ViewPackingPurchaseOrders;