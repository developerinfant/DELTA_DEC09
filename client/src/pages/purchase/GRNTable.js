import React from 'react';
import { Link } from 'react-router-dom';
import { FaEye } from 'react-icons/fa';

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
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">GRN Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Date Received</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Approved By</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {grns.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-secondary-500">No GRNs found.</td>
                        </tr>
                    ) : (
                        grns.map(grn => {
                            return (
                                <tr key={grn._id} className="hover:bg-light-200">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{grn.grnNumber}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{grn.purchaseOrder?.poNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{grn.supplier?.name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{formatDate(grn.dateReceived)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(grn.status)}`}>
                                            {grn.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{grn.receivedBy || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <Link to={`/grn/${grn._id}`} className="text-blue-500 hover:text-blue-700">
                                            <FaEye />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default GRNTable;