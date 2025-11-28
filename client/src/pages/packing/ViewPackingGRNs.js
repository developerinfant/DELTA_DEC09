import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaDownload } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import Modal from '../../components/common/Modal';
import PackingGRNPrintLayout from './PackingGRNPrintLayout'; // Import our new print layout

const GRNTable = ({ grns, onDownloadOptions }) => {
    const navigate = useNavigate();

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending Admin Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Partial': return 'bg-orange-100 text-orange-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Function to get the PO number
    const getReferenceNumber = (grn) => {
        return grn.purchaseOrder?.poNumber || 'N/A';
    };

    // Function to get the supplier name
    const getSupplierName = (grn) => {
        return grn.supplier?.name || 'N/A';
    };

    // Handle View Report
    const handleViewReport = (grn) => {
        navigate(`/packing/grn/${grn._id}`);
    };

    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200">
                    <tr>
                        <th className="th-style">GRN Number</th>
                        <th className="th-style">PO Number</th>
                        <th className="th-style">Supplier</th>
                        <th className="th-style">Date Received</th>
                        <th className="th-style">Status</th>
                        <th className="th-style">Received By</th>
                        <th className="th-style">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {grns.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-secondary-500">No GRNs found.</td>
                        </tr>
                    ) : (
                        grns.map(grn => (
                            <tr key={grn._id} className="hover:bg-light-200">
                                <td className="td-style font-medium">{grn.grnNumber}</td>
                                <td className="td-style">{getReferenceNumber(grn)}</td>
                                <td className="td-style">{getSupplierName(grn)}</td>
                                <td className="td-style">{formatDate(grn.dateReceived)}</td>
                                <td className="td-style">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                        {grn.status}
                                    </span>
                                </td>
                                <td className="td-style">{grn.receivedBy || 'N/A'}</td>
                                <td className="td-style">
                                    <div className="flex items-center space-x-2">
                                        <Link to={`/packing/grn/${grn._id}`} className="text-blue-500 hover:text-blue-700">
                                            <FaEye />
                                        </Link>
                                        <button 
                                            onClick={() => onDownloadOptions(grn)}
                                            className="text-blue-500 hover:text-blue-700 focus:outline-none"
                                        >
                                            <FaDownload />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            <style>{`.th-style { padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 700; color: #757575; text-transform: uppercase; } .td-style { padding: 1rem 1.5rem; white-space: nowrap; font-size: 0.875rem; color: #212121; }`}</style>
        </div>
    );
};

const ViewPackingGRNs = () => {
    const [grns, setGrns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false); // State for download options modal
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const sourceType = 'purchase_order'; // Permanently set to purchase_order for Packing Materials
    const navigate = useNavigate();

    const fetchGRNs = async () => {
        try {
            setIsLoading(true);
            // Only fetch purchase order (PO-based) GRNs for Packing Materials module
            const response = await api.get(`/grn?sourceType=purchase_order`);
            setGrns(response.data);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to fetch GRNs. Please try again.');
            console.error('Error fetching GRNs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGRNs();
        // Removed sourceType dependency since it's now constant
    }, []);

    const handleRefresh = () => {
        fetchGRNs();
    };

    const handleViewDetails = (grn) => {
        navigate(`/packing/grn/${grn._id}`);
    };

    // Filter GRNs based on search term and status filter - only for PO-based GRNs
    const filteredGRNs = useMemo(() => {
        return grns.filter(grn => {
            // Apply search filter - only for PO GRNs
            const matchesSearch = !searchTerm || 
                (grn.grnNumber && grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.purchaseOrder?.poNumber && grn.purchaseOrder.poNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.supplier?.name && grn.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()));

            // Apply status filter
            const matchesStatus = !statusFilter || grn.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [grns, searchTerm, statusFilter]);

    // Function to handle View Report - opens modal
    const handleViewReport = async (grn) => {
        // Fetch the full GRN data if needed
        let grnData = grn;
        if (!grn.items || !grn.supplier) {
            try {
                // If the GRN data is not complete, fetch the full data
                const response = await api.get(`/grn/${grn._id}`);
                grnData = response.data;
            } catch (error) {
                console.error('Error fetching full GRN data:', error);
                alert('Failed to load full GRN data. Please try again.');
                return;
            }
        }
        
        setSelectedGRN(grnData);
        setIsModalOpen(true);
        setIsDownloadModalOpen(false); // Close download options modal
    };

    // Function to handle Download PDF - opens GRN detail page with print option
    const handleDownloadPDF = async (grn) => {
        // Open in a new tab with download parameter
        const printUrl = `${window.location.origin}/#/packing/grn/${grn._id}/print?download=true`;
        window.open(printUrl, '_blank');
        setIsDownloadModalOpen(false); // Close download options modal
    };

    // Function to handle Print PDF - opens GRN detail page with print option
    const handlePrintPDF = async (grn) => {
        // Open in a new tab without download parameter
        const printUrl = `${window.location.origin}/#/packing/grn/${grn._id}/print`;
        window.open(printUrl, '_blank');
        setIsDownloadModalOpen(false); // Close download options modal
    };

    // Function to open download options modal
    const handleDownloadOptions = (grn) => {
        setSelectedGRN(grn);
        setIsDownloadModalOpen(true);
    };

    // Close modals
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedGRN(null);
    };

    const closeDownloadModal = () => {
        setIsDownloadModalOpen(false);
        setSelectedGRN(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-3xl text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">|
                   <Link
    to="/packing/grn/create"
    className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow-md whitespace-nowrap"
>
    <span className="mr-2">
        <i className="bi bi-plus-circle"></i>
    </span>
    Create New GRN
</Link>


                    <h1 className="text-3xl font-bold text-dark-700">Packing Materials GRN </h1>
                    
                </div>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    {/* Only show Purchase Order option - DC-based options removed */}
                    <div className="flex items-center">
                        <span className="px-4 py-2 rounded-lg font-medium bg-primary-500 text-white">
                            Purchase Order (PO-based)
                        </span>
                    </div>
                    
                    <ViewReportTools 
                        onRefresh={handleRefresh}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                        <input
                            type="text"
                            placeholder="Search by GRN number, reference, or supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="">All Statuses</option>
                            <option value="Pending Admin Approval">Pending Admin Approval</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Completed">Completed</option>
                            <option value="Partial">Partial</option>
                            <option value="Pending">Pending</option>
                        </select>
                    </div>
                </div>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
                
                <GRNTable grns={filteredGRNs} onDownloadOptions={handleDownloadOptions} />
                
                <div className="mt-6 text-sm text-gray-500 flex justify-between items-center">
                    <div>
                        Showing {filteredGRNs.length} of {grns.length} GRNs
                    </div>
                    <div>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </Card>
            
            {/* Modal for View Report */}
            <Modal isOpen={isModalOpen} onClose={closeModal} title="GRN Report" size="large">
                <div className="p-4">
                    {selectedGRN && (
                        <div className="bg-white">
                            <PackingGRNPrintLayout grnData={selectedGRN} />
                        </div>
                    )}
                </div>
            </Modal>
            
            {/* Modal for Download Options */}
            <Modal isOpen={isDownloadModalOpen} onClose={closeDownloadModal} title="Download Options">
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => handleViewReport(selectedGRN)}
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-light-200"
                        >
                            <div className="bg-blue-100 p-3 rounded-full mb-3">
                                <FaEye className="text-blue-600 text-xl" />
                            </div>
                            <span className="font-medium text-dark-700">View Report</span>
                            <span className="text-sm text-light-500 mt-1">Preview in browser</span>
                        </button>
                        
                        <button
                            onClick={() => handleDownloadPDF(selectedGRN)}
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-light-200"
                        >
                            <div className="bg-green-100 p-3 rounded-full mb-3">
                                <FaDownload className="text-green-600 text-xl" />
                            </div>
                            <span className="font-medium text-dark-700">Download PDF</span>
                            <span className="text-sm text-light-500 mt-1">Save to device</span>
                        </button>
                        
                        <button
                            onClick={() => handlePrintPDF(selectedGRN)}
                            className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-light-200"
                        >
                            <div className="bg-purple-100 p-3 rounded-full mb-3">
                                <FaDownload className="text-purple-600 text-xl" />
                            </div>
                            <span className="font-medium text-dark-700">Print PDF</span>
                            <span className="text-sm text-light-500 mt-1">Send to printer</span>
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ViewPackingGRNs;