import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api';
import Card from '../../../components/common/Card';
import { FaSpinner, FaEye } from 'react-icons/fa';
import ViewReportTools from '../../../components/common/ViewReportTools';

// This component can be moved to its own file later if needed
const GRNTable = ({ grns }) => {
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
            default: return 'bg-gray-100 text-gray-800';
        }
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
                        <th className="th-style">Approved By</th>
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
                                <td className="td-style">{grn.purchaseOrder?.poNumber || 'N/A'}</td>
                                <td className="td-style">{grn.supplier?.name || 'N/A'}</td>
                                <td className="td-style">{formatDate(grn.dateReceived)}</td>
                                <td className="td-style">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                        {grn.status}
                                    </span>
                                </td>
                                <td className="td-style">{grn.receivedBy || 'N/A'}</td>
                                <td className="td-style">
                                    <Link to={`/stock/maintenance/grn/${grn._id}`} className="text-blue-500 hover:text-blue-700">
                                        <FaEye />
                                    </Link>
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

const ViewStockGRNs = () => {
    const [grns, setGrns] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        const fetchGRNs = async () => {
            try {
                const { data } = await api.get('/grn?materialType=raw');
                setGrns(data);
            } catch (err) {
                setError('Failed to fetch GRNs.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchGRNs();
    }, []);

    const filteredGRNs = useMemo(() => {
        return grns.filter(grn => {
            const supplierName = grn.supplier?.name || '';
            const poNumber = grn.purchaseOrder?.poNumber || '';
            const matchesSearch = grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  poNumber.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter ? grn.status === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [grns, searchTerm, statusFilter]);

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'GRN Number', key: 'grnNumber' },
        { header: 'PO Number', key: 'purchaseOrder', render: (value) => value?.poNumber || 'N/A' },
        { header: 'Supplier', key: 'supplier', render: (value) => value?.name || 'N/A' },
        { header: 'Date Received', key: 'dateReceived', render: (value) => new Date(value).toLocaleDateString() },
        { header: 'Status', key: 'status', render: (value) => (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                value === 'Pending Admin Approval' ? 'bg-yellow-100 text-yellow-800' :
                value === 'Approved' ? 'bg-green-100 text-green-800' :
                value === 'Rejected' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {value}
            </span>
        ) },
        { header: 'Approved By', key: 'receivedBy', render: (value) => value || 'N/A' }
    ];

    if (isLoading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-dark-700">Stock Maintenance Goods Receipt Notes</h2>
                <div className="flex space-x-3">
                    <ViewReportTools
                        data={filteredGRNs}
                        title="Stock Maintenance Goods Receipt Notes"
                        fileName="StockGRNs"
                        metaDetails={{ user: 'Current User' }}
                        columns={reportColumns}
                    />
                    <Link to="/stock/maintenance/grn/create" className="btn-primary">
                        Create New GRN
                    </Link>
                </div>
            </div>
            <div className="flex items-center space-x-4 mb-4">
                <input
                    type="text"
                    placeholder="Search by GRN#, PO#, or Supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 input-style"
                />
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full md:w-1/4 input-style"
                >
                    <option value="">All Statuses</option>
                    <option value="Approved">Approved</option>
                    <option value="Pending Admin Approval">Pending Admin Approval</option>
                    <option value="Rejected">Rejected</option>
                </select>
            </div>
            <GRNTable grns={filteredGRNs} />
             <style>{`.input-style { padding: 0.5rem 1rem; color: #212121; background-color: #F5F5F5; border-radius: 0.5rem; border: 1px solid transparent; } .input-style:focus { outline: none; ring: 2px; ring-color: #D32F2F; }`}</style>
        </Card>
    );
};

export default ViewStockGRNs;