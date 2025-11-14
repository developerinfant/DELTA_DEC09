import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaExclamationTriangle, FaChartLine, FaBalanceScale, FaBell, FaFilePdf, FaFileExcel } from 'react-icons/fa';

const Reports = () => {
    const [activeTab, setActiveTab] = useState('priceHistory');
    const [materials, setMaterials] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [priceHistory, setPriceHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [supplierComparison, setSupplierComparison] = useState([]);
    const [priceFluctuationAlerts, setPriceFluctuationAlerts] = useState([]);

    const navigate = useNavigate();

    // Fetch all materials (packing and raw)
    useEffect(() => {
        const fetchMaterials = async () => {
            try {
                const [packingMaterials, rawMaterials] = await Promise.all([
                    api.get('/materials/packing'),
                    api.get('/materials/raw')
                ]);

                const allMaterials = [
                    ...packingMaterials.data.map(m => ({ ...m, model: 'PackingMaterial' })),
                    ...rawMaterials.data.map(m => ({ ...m, model: 'RawMaterial' }))
                ];

                setMaterials(allMaterials);
            } catch (err) {
                setError('Failed to load materials.');
            }
        };

        fetchMaterials();
    }, []);

    // Fetch suppliers
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const response = await api.get('/suppliers');
                setSuppliers(response.data);
            } catch (err) {
                setError('Failed to load suppliers.');
            }
        };

        fetchSuppliers();
    }, []);

    // Fetch purchase orders for PO reports
    useEffect(() => {
        const fetchPurchaseOrders = async () => {
            try {
                const response = await api.get('/purchase-orders');
                setPurchaseOrders(response.data);
            } catch (err) {
                setError('Failed to load purchase orders.');
            }
        };

        fetchPurchaseOrders();
    }, []);

    // Fetch price history when a material is selected
    useEffect(() => {
        if (selectedMaterial) {
            const [materialId, materialModel] = selectedMaterial.split('|');
            fetchPriceHistory(materialId, materialModel);
            fetchSupplierComparison(materialId, materialModel);
        }
    }, [selectedMaterial]);

    // Fetch price fluctuation alerts on component mount
    useEffect(() => {
        fetchPriceFluctuationAlerts();
    }, []);

    const fetchPriceHistory = async (materialId, materialModel) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/grn/price-history/${materialId}/${materialModel}`);
            setPriceHistory(response.data);
        } catch (err) {
            setError('Failed to load price history.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSupplierComparison = async (materialId, materialModel) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get(`/grn/supplier-comparison/${materialId}/${materialModel}`);
            setSupplierComparison(response.data);
        } catch (err) {
            setError('Failed to load supplier comparison.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPriceFluctuationAlerts = async () => {
        try {
            const response = await api.get('/grn?status=Pending Admin Approval');
            setPriceFluctuationAlerts(response.data);
        } catch (err) {
            setError('Failed to load price fluctuation alerts.');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    // Function to get price difference color
    const getPriceDifferenceColor = (percentage) => {
        if (percentage > 10) return 'text-red-600 font-bold'; // Significant increase
        if (percentage > 0) return 'text-orange-500'; // Small increase
        if (percentage < -10) return 'text-green-600 font-bold'; // Significant decrease
        if (percentage < 0) return 'text-green-500'; // Small decrease
        return 'text-gray-500';
    };

    // Filter purchase orders based on selected criteria
    const filteredPurchaseOrders = purchaseOrders.filter(po => {
        // Date filter
        if (dateFrom && new Date(po.createdAt) < new Date(dateFrom)) return false;
        if (dateTo && new Date(po.createdAt) > new Date(dateTo)) return false;
        
        // Supplier filter
        if (selectedSupplier && po.supplier?._id !== selectedSupplier) return false;
        
        // Status filter
        if (statusFilter && po.status !== statusFilter) return false;
        
        // Material filter
        if (selectedMaterial) {
            const [materialId, materialModel] = selectedMaterial.split('|');
            const hasMaterial = po.items?.some(item => 
                item.material?._id === materialId && item.materialModel === materialModel
            );
            if (!hasMaterial) return false;
        }
        
        return true;
    });

    // Function to export data to PDF
    const exportToPDF = () => {
        // In a real implementation, this would generate a PDF
        alert('PDF export functionality would be implemented here');
    };

    // Function to export data to Excel
    const exportToExcel = () => {
        // In a real implementation, this would generate an Excel file
        alert('Excel export functionality would be implemented here');
    };

    // Function to view PO details
    const viewPODetails = (poId) => {
        navigate(`/purchase-orders/${poId}`);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Purchase Reports</h1>
                    <p className="text-gray-600 mt-1">Analyze price trends, supplier performance, and purchase orders</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex flex-wrap -mb-px">
                    <button
                        onClick={() => setActiveTab('priceHistory')}
                        className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'priceHistory'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <FaChartLine className="mr-2" />
                        Material Price History
                    </button>
                    <button
                        onClick={() => setActiveTab('supplierComparison')}
                        className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'supplierComparison'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <FaBalanceScale className="mr-2" />
                        Supplier Price Comparison
                    </button>
                    <button
                        onClick={() => setActiveTab('purchaseOrders')}
                        className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'purchaseOrders'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <FaFilePdf className="mr-2" />
                        Purchase Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('priceAlerts')}
                        className={`flex items-center py-4 px-6 border-b-2 font-medium text-sm ${
                            activeTab === 'priceAlerts'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <FaBell className="mr-2" />
                        Price Fluctuation Alerts
                    </button>
                </nav>
            </div>

            {/* Filters for Purchase Orders Tab */}
            {activeTab === 'purchaseOrders' && (
                <Card title="Filters" className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                id="dateFrom"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                id="dateTo"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label htmlFor="supplierFilter" className="block text-sm font-medium text-gray-700 mb-1">
                                Supplier
                            </label>
                            <select
                                id="supplierFilter"
                                value={selectedSupplier}
                                onChange={(e) => setSelectedSupplier(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">All Suppliers</option>
                                {suppliers.map(supplier => (
                                    <option key={supplier._id} value={supplier._id}>
                                        {supplier.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="materialFilter" className="block text-sm font-medium text-gray-700 mb-1">
                                Material
                            </label>
                            <select
                                id="materialFilter"
                                value={selectedMaterial}
                                onChange={(e) => setSelectedMaterial(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">All Materials</option>
                                {materials.map(material => (
                                    <option key={`${material._id}|${material.model}`} value={`${material._id}|${material.model}`}>
                                        {material.name} ({material.model === 'PackingMaterial' ? 'Packing' : 'Raw'})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                id="statusFilter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Ordered">Ordered</option>
                                <option value="Partially Received">Partially Received</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4 space-x-3">
                        <button 
                            onClick={exportToExcel}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                            <FaFileExcel className="mr-2" /> Export to Excel
                        </button>
                        <button 
                            onClick={exportToPDF}
                            className="flex items-center px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                            <FaFilePdf className="mr-2" /> Export to PDF
                        </button>
                    </div>
                </Card>
            )}

            {/* Material Selection for other tabs */}
            {(activeTab === 'priceHistory' || activeTab === 'supplierComparison') && (
                <div className="mb-6">
                    <label htmlFor="material-select" className="block text-sm font-medium text-gray-700 mb-2">
                        Select Material
                    </label>
                    <select
                        id="material-select"
                        value={selectedMaterial}
                        onChange={(e) => setSelectedMaterial(e.target.value)}
                        className="mt-1 block w-full md:w-1/2 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                        <option value="">-- Choose a material --</option>
                        {materials.map(material => (
                            <option key={`${material._id}|${material.model}`} value={`${material._id}|${material.model}`}>
                                {material.name} ({material.model === 'PackingMaterial' ? 'Packing' : 'Raw'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <FaExclamationTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Material Price History Tab */}
            {activeTab === 'priceHistory' && (
                <Card title="Material Price History" className="shadow-lg">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <FaSpinner className="animate-spin text-primary-500 text-3xl" />
                        </div>
                    ) : priceHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full p-4 inline-block mb-4">
                                <FaChartLine className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg">
                                {selectedMaterial ? 'No price history found for this material.' : 'Please select a material to view its price history.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GRN Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Received</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price Difference</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {priceHistory.map((entry, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.grnNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(entry.dateReceived)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.supplier?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">₹{entry.unitPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={getPriceDifferenceColor(entry.priceDifferencePercentage)}>
                                                    {entry.priceDifference !== 0 ? 
                                                        `${entry.priceDifference > 0 ? '+' : ''}₹${entry.priceDifference.toFixed(2)} (${entry.priceDifferencePercentage > 0 ? '+' : ''}${entry.priceDifferencePercentage.toFixed(2)}%)` : 
                                                        '0%'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Supplier Price Comparison Tab */}
            {activeTab === 'supplierComparison' && (
                <Card title="Supplier Price Comparison" className="shadow-lg">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <FaSpinner className="animate-spin text-primary-500 text-3xl" />
                        </div>
                    ) : supplierComparison.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full p-4 inline-block mb-4">
                                <FaBalanceScale className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg">
                                {selectedMaterial ? 'No supplier comparison data found for this material.' : 'Please select a material to view supplier comparison.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Latest Price (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Average Price (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Min Price (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Max Price (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price Range (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GRN Count</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {supplierComparison.map((supplier, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.supplierName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-600">₹{supplier.latestPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{supplier.avgPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{supplier.minPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{supplier.maxPrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{supplier.priceRange.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{supplier.grnCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Purchase Orders Tab */}
            {activeTab === 'purchaseOrders' && (
                <Card title="Purchase Orders Report" className="shadow-lg">
                    {filteredPurchaseOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full p-4 inline-block mb-4">
                                <FaFilePdf className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg">No purchase orders found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PO Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GST%</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total (₹)</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredPurchaseOrders.map(po => 
                                        po.items?.map((item, index) => (
                                            <tr key={`${po._id}-${index}`} className="hover:bg-gray-50">
                                                {index === 0 ? (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" rowSpan={po.items.length}>
                                                            {po.poNumber}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" rowSpan={po.items.length}>
                                                            {formatDate(po.createdAt)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" rowSpan={po.items.length}>
                                                            {po.supplier?.name || 'N/A'}
                                                        </td>
                                                    </>
                                                ) : null}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {item.material?.name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatCurrency(item.rate)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {item.gstPercent}%
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                    {formatCurrency(item.lineTotal)}
                                                </td>
                                                {index === 0 ? (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm" rowSpan={po.items.length}>
                                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                            po.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            po.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                                                            po.status === 'Ordered' ? 'bg-indigo-100 text-indigo-800' :
                                                            po.status === 'Partially Received' ? 'bg-purple-100 text-purple-800' :
                                                            po.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                            po.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {po.status}
                                                        </span>
                                                    </td>
                                                ) : null}
                                                {index === 0 ? (
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm" rowSpan={po.items.length}>
                                                        <button
                                                            onClick={() => viewPODetails(po._id)}
                                                            className="text-primary-600 hover:text-primary-900 font-medium"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                ) : null}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}

            {/* Price Fluctuation Alerts Tab */}
            {activeTab === 'priceAlerts' && (
                <Card title="Price Fluctuation Alerts" className="shadow-lg">
                    {priceFluctuationAlerts.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="bg-gray-100 rounded-full p-4 inline-block mb-4">
                                <FaBell className="text-gray-400 text-2xl" />
                            </div>
                            <p className="text-gray-500 text-lg">No price fluctuation alerts found.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">GRN Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PO Number</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price Difference</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {priceFluctuationAlerts.map(grn => (
                                        <tr key={grn._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grn.grnNumber}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grn.purchaseOrder?.poNumber || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {grn.items.map(item => item.material?.name).join(', ')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{grn.supplier?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {grn.items.map((item, index) => (
                                                    <div key={index} className={getPriceDifferenceColor(item.priceDifferencePercentage)}>
                                                        {item.priceDifference !== 0 ? 
                                                            `${item.priceDifference > 0 ? '+' : ''}₹${item.priceDifference.toFixed(2)} (${item.priceDifferencePercentage > 0 ? '+' : ''}${item.priceDifferencePercentage.toFixed(2)}%)` : 
                                                            '0%'}
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                    {grn.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <button
                                                    onClick={() => navigate(`/grn/${grn._id}`)}
                                                    className="text-primary-600 hover:text-primary-900 font-medium"
                                                >
                                                    Review
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default Reports;