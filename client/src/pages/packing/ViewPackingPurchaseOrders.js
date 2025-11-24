import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaDownload } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import { exportPOToExcel } from '../../utils/excelExporter';
import { generateDeltaPOPDF } from '../../utils/pdfGenerator';
import Modal from '../../components/common/Modal'; // Import Modal component
import DeltaPOPrintLayout, { generatePDFfromDeltaPOPrintLayout } from '../purchase/DeltaPOPrintLayout'; // Import DeltaPOPrintLayout component and new PDF generator

// This component can be moved to its own file later if needed
const PurchaseOrdersTable = ({ purchaseOrders, onViewReport, onDownloadPDF, onPrintPDF }) => {
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

    // State for dropdown visibility
    const [openDropdownId, setOpenDropdownId] = useState(null);

    // Toggle dropdown visibility
    const toggleDropdown = (id) => {
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setOpenDropdownId(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    // Function to handle View Report
    const handleViewReportClick = async (po) => {
        await onViewReport(po);
        setOpenDropdownId(null);
    };

    // Function to handle Download PDF
    const handleDownloadPDFClick = async (po) => {
        await onDownloadPDF(po);
        setOpenDropdownId(null);
    };

    // Function to handle Print PDF
    const handlePrintPDFClick = async (po) => {
        await onPrintPDF(po);
        setOpenDropdownId(null);
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
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                        <Link to={`/packing/purchase-orders/${po._id}`} className="text-blue-500 hover:text-blue-700">
                                            <FaEye />
                                        </Link>
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleDropdown(po._id);
                                                }}
                                                className="text-blue-500 hover:text-blue-700 focus:outline-none"
                                            >
                                                <FaDownload />
                                            </button>
                                        
                                            {openDropdownId === po._id && (
                                                <div 
                                                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="py-1" role="menu">
                                                        <button
                                                            onClick={() => handleViewReportClick(po)}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                                            role="menuitem"
                                                        >
                                                            View Report
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadPDFClick(po)}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                                            role="menuitem"
                                                        >
                                                            Download PDF
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintPDFClick(po)}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                                            role="menuitem"
                                                        >
                                                            Print PDF
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
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
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedPO, setSelectedPO] = useState(null); // State for selected PO for modal
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

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

    // Report columns configuration
    const reportColumns = [
        { header: 'PO Number', key: 'poNumber' },
        { header: 'Supplier', key: 'supplier.name' },
        { header: 'Date', key: 'createdAt', render: (value) => new Date(value).toLocaleDateString() },
        { header: 'Total Amount', key: 'totalAmount', render: (value) => `₹${parseFloat(value).toFixed(2)}` },
        { header: 'Status', key: 'status' }
    ];

    // Format data for export
    const formatDataForExport = (data) => {
        return data.map(po => ({
            'PO Number': po.poNumber,
            'Supplier': po.supplier?.name || 'N/A',
            'Date': po.createdAt ? new Date(po.createdAt).toLocaleDateString() : 'N/A',
            'Total Amount': `₹${parseFloat(po.totalAmount).toFixed(2)}`,
            'Status': po.status
        }));
    };

    // Function to handle View Report - opens modal
    const handleViewReport = async (po) => {
        setSelectedPO(po);
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
            
            // Use the existing generateDeltaPOPDF for printing
            await generateDeltaPOPDF(poData, 'view');
        } catch (error) {
            console.error('Error printing PDF:', error);
            alert('Failed to print PDF. Please try again.');
        }
    };

    // Close modal
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
                    placeholder="Search by PO# or Supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-1/4 px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            />
            
            {/* Modal for View Report */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title="Purchase Order Report">
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