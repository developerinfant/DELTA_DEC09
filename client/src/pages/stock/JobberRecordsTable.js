import React from 'react';
import { FaEdit } from 'react-icons/fa';

const JobberRecordsTable = ({ records, onReconcile }) => {
    
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Jobber Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Material</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qty Sent</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qty Produced</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Qty Returned</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Still with Jobber</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Date</th>
                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{record.jobberName || 'Unknown Jobber'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.rawMaterial?.itemCode ? `${record.rawMaterial.itemCode} - ` : ''}{record.rawMaterial?.name || 'Unknown Material'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.quantitySent || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.quantityProduced || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{record.quantityReturned || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{record.quantityStillWithJobber !== undefined ? record.quantityStillWithJobber : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    record.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {record.status || 'Pending'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.createdAt ? formatDate(record.createdAt) : 'Unknown Date'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button onClick={() => onReconcile(record)} className="text-indigo-600 hover:text-indigo-900" title="Reconcile">
                                    <FaEdit />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default JobberRecordsTable;