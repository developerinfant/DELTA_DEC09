import React from 'react';
import { FaSpinner } from 'react-icons/fa';

/**
 * A table component to display the history of outgoing material records.
 *
 * @param {object} props - The component props.
 * @param {Array} props.records - The array of outgoing record objects.
 * @param {boolean} props.isLoading - A flag to indicate if the data is currently being fetched.
 * @returns {JSX.Element} The rendered history table component.
 */
const OutgoingHistoryTable = ({ records, isLoading }) => {

    // Helper function to format dates into a more readable format
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Helper function to format numbers as currency
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
                        <div className="flex justify-center items-center text-gray-500">
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
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                        No outgoing records found.
                    </td>
                </tr>
            );
        }

        return records.map((record) => {
            const materialName = record.material ? record.material.name : 'Deleted Material';
            const pricePerUnit = record.material ? record.material.perQuantityPrice : 0;
            const totalValue = record.quantityUsed * pricePerUnit;

            return (
                <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{materialName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.quantityUsed}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatPrice(pricePerUnit)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{formatPrice(totalValue)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.notes || 'N/A'}</td>
                </tr>
            );
        });
    };

    return (
        <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Outgoing Records History</h2>
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Used</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price per Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Used</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {renderTableBody()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OutgoingHistoryTable;