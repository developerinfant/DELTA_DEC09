import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';
import Modal from '../../components/common/Modal';
import PackingGRNPrintLayout from './PackingGRNPrintLayout'; // Import our new print layout

const GRNTable = ({ grns }) => {
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
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Received</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {grns.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                <div className="flex flex-col items-center justify-center">
                                    <div className="bg-gray-100 rounded-full p-3 mb-3">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                    </div>
                                    <p className="text-gray-500">No GRNs found</p>
                                    <p className="text-sm text-gray-400 mt-1">There are no packing material GRNs recorded yet</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        grns.map(grn => (
                            <tr key={grn._id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getReferenceNumber(grn)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{getSupplierName(grn)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(grn.dateReceived)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                        {grn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{grn.receivedBy || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                    <div className="flex items-center space-x-3">
                                        <Link to={`/packing/grn/${grn._id}`} className="text-blue-600 hover:text-blue-900 transition-colors duration-150">
                                            <FaEye />
                                        </Link>
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

const ViewPackingGRNs = () => {
    const [grns, setGrns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
    };

    // Close modals
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedGRN(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <FaSpinner className="animate-spin text-3xl text-primary-500 mx-auto" />
                    <p className="mt-4 text-gray-600">Loading GRNs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-FAF7F2 min-h-screen">
            {/* Page Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Packing Materials GRN</h1>
                        <p className="text-gray-600 mt-1">Manage and track goods receipt notes for packing materials</p>
                    </div>
                    <Link
                        to="/packing/grn/create"
                        className="inline-flex items-center bg-F2C94C hover:bg-amber-500 text-gray-900 font-semibold px-5 py-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 whitespace-nowrap"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Create New GRN
                    </Link>
                </div>
            </div>

            {/* Filters Card */}
            <Card className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    {/* Only show Purchase Order option - DC-based options removed */}
                    <div className="flex items-center">
                        
                    </div>
                    
                    <ViewReportTools 
                        onRefresh={handleRefresh}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <input
                            id="search"
                            type="text"
                            placeholder="Search by GRN number, reference, or supplier..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-F2C94C focus:border-transparent transition-all duration-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Status</label>
                        <select 
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-F2C94C focus:border-transparent transition-all duration-200"
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
                    <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
            </Card>
            
            {/* GRN Table */}
            <Card className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <GRNTable grns={filteredGRNs} />
                
                <div className="mt-6 text-sm text-gray-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
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
        </div>
    );
};

export default ViewPackingGRNs;