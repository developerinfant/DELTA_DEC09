import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner } from 'react-icons/fa';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { Plus, Eye } from 'lucide-react';

// This component can be moved to its own file later if needed
const GRNTable = ({ grns, onRecordDamagedStock }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending Admin Approval': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-green-100 text-green-600';
            case 'Rejected': return 'bg-red-100 text-red-600';
            case 'Completed': return 'bg-green-100 text-green-600';
            case 'Partial': return 'bg-orange-100 text-orange-600';
            case 'Pending': return 'bg-yellow-100 text-yellow-600';
            case 'Damage Pending': return 'bg-amber-100 text-amber-600';
            case 'Damage Completed': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-600';
            case 'Partial': return 'bg-orange-100 text-orange-600';
            case 'Pending': return 'bg-yellow-100 text-yellow-600';
            case 'Pending Admin Approval': return 'bg-yellow-100 text-yellow-600';
            case 'Approved': return 'bg-green-100 text-green-600';
            case 'Rejected': return 'bg-red-100 text-red-600';
            case 'Damage Pending': return 'bg-amber-100 text-amber-600';
            case 'Damage Completed': return 'bg-red-100 text-red-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    // Function to get the delivery challan number
    const getReferenceNumber = (grn) => {
        return grn.dcNumber || grn.referenceNumber || grn.deliveryChallan?.dc_no || 'N/A';
    };

    // Function to get the supplier name
    const getSupplierName = (grn) => {
        return grn.supplierName || grn.supplier?.name || 'N/A';
    };
    
    // Function to get the unit type badge
    const getUnitTypeBadge = (grn) => {
        const unitType = grn.unitType || grn.deliveryChallan?.unit_type || 'N/A';
        const bgColor = unitType === 'Jobber' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800';
        return (
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
                {unitType}
            </span>
        );
    };

    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">GRN Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Item Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">DC Number</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Unit Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Supplier / Issued To</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Date Received</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Received By</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider bg-gray-100">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {grns.length === 0 ? (
                        <tr>
                            <td colSpan="9" className="px-6 py-4 text-center text-gray-500">No GRNs found.</td>
                        </tr>
                    ) : (
                        grns.map(grn => (
                            <tr key={grn._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grn.itemCode || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getReferenceNumber(grn)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getUnitTypeBadge(grn)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getSupplierName(grn)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(grn.dateReceived)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-3 py-1 text-sm rounded-full font-medium ${getStatusBadgeClass(grn.status)}`}>
                                        {grn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{grn.receivedBy || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex space-x-2">
                                    <Link to={`/fg/grn/${grn._id}`} className="text-blue-600 hover:text-blue-900">
                                        <Eye size={18} />
                                    </Link>
                                    {(grn.status === 'Completed' || grn.status === 'Partial') && (
                                        <button 
                                            onClick={() => onRecordDamagedStock(grn)}
                                            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full hover:bg-red-200 focus:outline-none focus:ring-1 focus:ring-red-500"
                                        >
                                            Damaged
                                        </button>
                                    )}
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

// Modal component for displaying jobber GRN details
const JobberGRNDetailsModal = ({ isOpen, onClose, grn }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    if (!grn) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="GRN Details">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.grnNumber}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Item Code</label> {/* Add Item Code field */}
                        <p className="mt-1 text-sm text-gray-900">{grn.itemCode || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Delivery Challan No</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.dcNumber || grn.deliveryChallan?.dc_no || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Unit Type</label>
                        <p className="mt-1 text-sm text-gray-900">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                grn.unitType === 'Jobber' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                                {grn.unitType || 'N/A'}
                            </span>
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            {grn.unitType === 'Own Unit' ? 'Issued To' : 'Supplier'}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">{grn.supplierName || grn.supplier?.name || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date Received</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate(grn.dateReceived)}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GRN Status</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.status}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">DC Status</label>
                        <p className="mt-1 text-sm text-gray-900">
                            {grn.deliveryChallan ? (
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    grn.deliveryChallan.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                    grn.deliveryChallan.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                                    grn.deliveryChallan.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {grn.deliveryChallan.status}
                                </span>
                            ) : 'N/A'}
                        </p>
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
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {grn.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {item.material?.name || item.material || 'N/A'}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {item.orderedQuantity}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {item.receivedQuantity}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            {item.balanceQuantity}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                ${item.receivedQuantity === item.orderedQuantity ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {item.receivedQuantity === item.orderedQuantity ? 'Completed' : 'Partial'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// Modal component for recording damaged stock
const RecordDamagedStockModal = ({ isOpen, onClose, grn, onRecord }) => {
    const [damagedItems, setDamagedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (grn && isOpen) {
            // Initialize damaged items with GRN items
            const initialItems = grn.items.map(item => ({
                material_name: typeof item.material === 'string' ? item.material : item.material?.name || 'N/A',
                received_qty: item.receivedQuantity || 0,
                damaged_qty: 0
            }));
            setDamagedItems(initialItems);
        }
    }, [grn, isOpen]);

    const handleDamagedQtyChange = (index, value) => {
        const updatedItems = [...damagedItems];
        const receivedQty = updatedItems[index].received_qty;
        const damagedQty = Math.max(0, Math.min(receivedQty, parseInt(value) || 0));
        updatedItems[index].damaged_qty = damagedQty;
        setDamagedItems(updatedItems);
    };

    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            // Filter items with damaged quantity > 0
            const itemsWithDamage = damagedItems.filter(item => item.damaged_qty > 0);
            
            if (itemsWithDamage.length === 0) {
                toast.warn('No damaged items to record');
                onClose();
                return;
            }
            
            // Create damaged stock entries for each item
            const promises = itemsWithDamage.map(item => {
                return api.post('/damaged-stock', {
                    grn_id: grn._id,
                    dc_no: grn.dcNumber || grn.deliveryChallan?.dc_no || 'N/A',
                    product_name: grn.productName || 'N/A',
                    material_name: item.material_name,
                    received_qty: item.received_qty,
                    damaged_qty: item.damaged_qty,
                    remarks: 'Recorded from FG GRN'
                });
            });
            
            await Promise.all(promises);
            
            toast.success('Damaged stock entries recorded successfully');
            onRecord();
            onClose();
        } catch (err) {
            console.error('Failed to save damaged stock entries:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to save damaged stock entries. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (!grn) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Record Damaged Stock">
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md">
                        {error}
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.grnNumber}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">DC Number</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.dcNumber || grn.deliveryChallan?.dc_no || 'N/A'}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <p className="mt-1 text-sm text-gray-900">{grn.productName || 'N/A'}</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Received Qty</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {damagedItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                        {item.material_name}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                        {item.received_qty}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.received_qty}
                                            value={item.damaged_qty}
                                            onChange={(e) => handleDamagedQtyChange(index, e.target.value)}
                                            className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <FaSpinner className="animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            'Save Damaged Stock'
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const ViewFGGRNs = () => {
    const navigate = useNavigate();
    const [grns, setGrns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedGRN, setSelectedGRN] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDamagedStockModalOpen, setIsDamagedStockModalOpen] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchGRNs = async () => {
        try {
            setIsLoading(true);
            setError('');
            // Fetch all jobber GRNs for FG module (includes both Jobber and Own Unit DCs)
            const { data } = await api.get('/grn?sourceType=jobber');
            setGrns(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError('Failed to fetch GRNs. Please try refreshing.');
            console.error('Error fetching GRNs:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGRNs();

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
            const matchesSearch = 
                (grn.grnNumber && grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.itemCode && grn.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) || // Add itemCode to search
                (grn.dcNumber && grn.dcNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.supplierName && grn.supplierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.deliveryChallan?.person_name && grn.deliveryChallan.person_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (grn.person_name && grn.person_name.toLowerCase().includes(searchTerm.toLowerCase()));

            // Apply status filter
            const matchesStatus = !statusFilter || grn.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [grns, searchTerm, statusFilter]);

    const handleRecordDamagedStock = (grn) => {
        setSelectedGRN(grn);
        setIsDamagedStockModalOpen(true);
    };

    const handleDamagedStockRecorded = () => {
        // Refresh GRNs to show updated status
        fetchGRNs();
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                    <Link 
                        to="/fg/grn/create"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
                    >
                        <Plus size={18} /> Create New GRN
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Finished Goods GRN (DC-based)</h1>
                        <p className="text-gray-600 text-sm mt-1">Manage and track Finished Goods GRN entries generated from Delivery Challans.</p>
                    </div>
                </div>
            </div>

            <Card>
                <div className="mb-6 bg-gray-50 border border-gray-300 rounded-xl p-4">
                    <div className="flex items-center mb-4">
                        <span className="px-3 py-1 bg-accent-100 text-accent-800 rounded-full text-sm font-medium">
                            Delivery Challan (Jobber & Own Unit)
                        </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by GRN#, Item Code, DC#, Supplier, or Issued To..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending Admin Approval">Pending Admin Approval</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Completed">Completed</option>
                                <option value="Partial">Partial</option>
                                <option value="Pending">Pending</option>
                                <option value="Damage Pending">Damage Pending</option>
                                <option value="Damage Completed">Damage Completed</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
                
                <GRNTable 
                    grns={filteredGRNs} 
                    onRecordDamagedStock={handleRecordDamagedStock}
                />
                
                <div className="mt-6 text-sm text-gray-500 flex justify-between items-center">
                    <div>
                        Showing {filteredGRNs.length} of {grns.length} GRNs
                    </div>
                    <div>
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </Card>
            
            <JobberGRNDetailsModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                grn={selectedGRN}
            />
            
            <RecordDamagedStockModal
                isOpen={isDamagedStockModalOpen}
                onClose={() => setIsDamagedStockModalOpen(false)}
                grn={selectedGRN}
                onRecord={handleDamagedStockRecorded}
            />
        </div>
    );
};

export default ViewFGGRNs;