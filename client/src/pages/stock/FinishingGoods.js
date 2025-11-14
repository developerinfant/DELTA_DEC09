import React, { useState, useEffect } from 'react';
import api from '../../api';
import { FaSpinner, FaSearch } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';

const FinishingGoods = () => {
    const [finishedGoods, setFinishedGoods] = useState([]);
    const [filteredGoods, setFilteredGoods] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch finishing goods data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/products/finished-goods');
            setFinishedGoods(response.data);
            setFilteredGoods(response.data);
        } catch (err) {
            setError('Failed to load finishing goods data. Please refresh.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Filter finished goods based on search term
    useEffect(() => {
        if (!searchTerm) {
            setFilteredGoods(finishedGoods);
        } else {
            const term = searchTerm.toLowerCase();
            const filtered = finishedGoods.filter(good => 
                good.productName.toLowerCase().includes(term) || 
                good.jobberName.toLowerCase().includes(term)
            );
            setFilteredGoods(filtered);
        }
    }, [searchTerm, finishedGoods]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const getStatusBadge = (status) => {
        const baseClasses = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        switch (status) {
            case 'Available':
                return `${baseClasses} bg-green-100 text-green-800`;
            case 'Reserved':
                return `${baseClasses} bg-yellow-100 text-yellow-800`;
            case 'Dispatched':
                return `${baseClasses} bg-gray-100 text-gray-800`;
            default:
                return `${baseClasses} bg-gray-100 text-gray-800`;
        }
    };

    // Format materials used for display
    const formatMaterialsUsed = (materialsUsed) => {
        if (!materialsUsed || materialsUsed.length === 0) return 'N/A';
        return materialsUsed.map(material => 
            `${material.materialName || 'Unknown Material'}(${material.quantityUsed || 0})`
        ).join(', ');
    };

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'Product Name', key: 'productName' },
        { header: 'Jobber', key: 'jobberName' },
        { header: 'Materials Used', key: 'materialsUsed', render: (value) => formatMaterialsUsed(value) },
        { header: 'Total Product Produced', key: 'quantityProduced' },
        { header: 'Date Completed', key: 'producedDate', render: (value) => formatDate(value) },
        { header: 'Status', key: 'status', render: (value) => (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                value === 'Available' ? 'bg-green-100 text-green-800' : 
                value === 'Reserved' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'
            }`}>
                {value}
            </span>
        ) },
        { header: 'Remarks', key: 'remarks' }
    ];

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Finishing Goods</h1>
                <ViewReportTools
                    data={filteredGoods}
                    title="Finishing Goods"
                    fileName="FinishingGoods"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                />
            </div>
            
            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Search by product name or jobber name"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Finishing Goods Table */}
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jobber</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials Used</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Product Produced</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Completed</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredGoods.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                                    No finishing goods found.
                                </td>
                            </tr>
                        ) : (
                            filteredGoods.map((good) => (
                                <tr key={good._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {good.productName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {good.jobberName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={formatMaterialsUsed(good.materialsUsed)}>
                                        {formatMaterialsUsed(good.materialsUsed)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {good.quantityProduced}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {good.producedDate ? formatDate(good.producedDate) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={getStatusBadge(good.status)}>
                                            {good.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={good.remarks}>
                                        {good.remarks || 'N/A'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinishingGoods;