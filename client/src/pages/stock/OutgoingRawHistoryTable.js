import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const OutgoingRawHistoryTable = ({ records, isLoading }) => {

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(price);
    };

    const renderTableBody = () => {
        if (isLoading) {
            return (
                <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex justify-center items-center text-neutral-500">
                            <FaSpinner className="animate-spin mr-3" size={24} />
                            <span>Loading History...</span>
                        </div>
                    </td>
                </tr>
            );
        }

        if (records.length === 0) {
            return (
                <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-neutral-500">
                        No outgoing raw material records found.
                    </td>
                </tr>
            );
        }

        return records.map((record) => {
            const materialName = record.material ? record.material.name : 'Deleted Material';
            const pricePerUnit = record.material ? record.material.perQuantityPrice : 0;
            const totalValue = record.quantitySent * pricePerUnit;

            return (
                <tr key={record._id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{materialName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{record.quantitySent}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatPrice(pricePerUnit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-neutral-800">{formatPrice(totalValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{formatDate(record.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">{record.notes || 'N/A'}</td>
                </tr>
            );
        });
    };

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Outgoing Records History</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Material Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Quantity Sent</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Price per Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Total Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200">
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OutgoingRawHistoryTable;