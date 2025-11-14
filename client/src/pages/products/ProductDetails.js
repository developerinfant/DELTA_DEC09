import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEdit, FaSyncAlt, FaFileExcel } from 'react-icons/fa';
import Modal from '../../components/common/Modal';

const ProductDetails = () => {
    const [finishedGoods, setFinishedGoods] = useState([]);
    const [productStocks, setProductStocks] = useState({}); // Add this line
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [productFilter, setProductFilter] = useState('');
    const [jobberFilter, setJobberFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    
    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [editFormData, setEditFormData] = useState({
        perUnitPrice: '',
        gst: '',
        remarks: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchFinishedGoods();
        fetchProductStocks(); // Add this line
    }, []);

    const fetchFinishedGoods = async () => {
        try {
            const params = new URLSearchParams();
            
            if (productFilter) params.append('product', productFilter);
            if (jobberFilter) params.append('jobber', jobberFilter);
            
            const { data } = await api.get(`/products/finished-goods?${params.toString()}`);
            setFinishedGoods(data);
        } catch (err) {
            setError('Failed to fetch finished goods');
        } finally {
            setLoading(false);
        }
    };

    // Add this function to fetch product stocks
    const fetchProductStocks = async () => {
        try {
            const { data } = await api.get('/product-stock');
            // Convert array to object for easier lookup
            const stockMap = {};
            data.forEach(stock => {
                stockMap[stock.productName.toLowerCase()] = stock;
            });
            setProductStocks(stockMap);
        } catch (err) {
            console.error('Failed to fetch product stocks:', err);
        }
    };

    // Get unique products and jobbers for filters
    const uniqueProducts = [...new Set(finishedGoods.map(item => item.productName))];
    const uniqueJobbers = [...new Set(finishedGoods.map(item => item.jobberName))];

    // Filter finished goods based on search term
    const filteredFinishedGoods = finishedGoods.filter(item => {
        const matchesSearch = 
            item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.jobberName.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesProduct = productFilter ? item.productName === productFilter : true;
        const matchesJobber = jobberFilter ? item.jobberName === jobberFilter : true;
        const matchesStatus = statusFilter ? item.status === statusFilter : true;
        
        return matchesSearch && matchesProduct && matchesJobber && matchesStatus;
    });

    const getStatusClass = (status) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-800';
            case 'Reserved': return 'bg-yellow-100 text-yellow-800';
            case 'Dispatched': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const handleEditClick = (product) => {
        setSelectedProduct(product);
        setEditFormData({
            perUnitPrice: product.perUnitPrice || '',
            gst: product.gst || '',
            remarks: product.remarks || ''
        });
        setIsEditModalOpen(true);
    };

    const handleEditFormChange = (e) => {
        setEditFormData({
            ...editFormData,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const updatedData = {
                perUnitPrice: Number(editFormData.perUnitPrice),
                gst: Number(editFormData.gst),
                remarks: editFormData.remarks
            };
            
            const response = await api.patch(`/products/finished-goods/${selectedProduct._id}`, updatedData);
            
            // Update the product in the list
            setFinishedGoods(finishedGoods.map(fg => 
                fg._id === selectedProduct._id ? response.data.finishedGood : fg
            ));
            
            setIsEditModalOpen(false);
            setSelectedProduct(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update product');
        } finally {
            setIsSaving(false);
        }
    };

    const exportToExcel = () => {
        // Create worksheet data
        const worksheetData = filteredFinishedGoods.map(item => ({
            'Product Code': item.productCode,
            'Product Name': item.productName,
            'Jobber': item.jobberName,
            'Qty Available': item.quantityAvailable,
            'Price/Unit': `₹${item.perUnitPrice || 0}`,
            'GST%': `${item.gst || 0}%`,
            'Total Value': `₹${item.totalValue || 0}`,
            'Status': item.status
        }));
        
        // Convert to CSV
        const headers = Object.keys(worksheetData[0]).join(',');
        const rows = worksheetData.map(row => Object.values(row).join(',')).join('\n');
        const csvContent = `${headers}\n${rows}`;
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'product_details.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-dark-700">Product Details Management</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => {
                                fetchFinishedGoods();
                                fetchProductStocks(); // Add this line
                            }}
                            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            <FaSyncAlt className="mr-2" /> Refresh Data
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                        >
                            <FaFileExcel className="mr-2" /> View Report
                        </button>
                    </div>
                </div>
                
                {/* Filters */}}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div>
                        <input
                            type="text"
                            placeholder="Search by product, code, jobber..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    
                    <div>
                        <select
                            value={productFilter}
                            onChange={(e) => setProductFilter(e.target.value)}
                            className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Products</option>
                            {uniqueProducts.map(product => (
                                <option key={product} value={product}>{product}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <select
                            value={jobberFilter}
                            onChange={(e) => setJobberFilter(e.target.value)}
                            className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Jobbers</option>
                            {uniqueJobbers.map(jobber => (
                                <option key={jobber} value={jobber}>{jobber}</option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="Available">Available</option>
                            <option value="Reserved">Reserved</option>
                            <option value="Dispatched">Dispatched</option>
                        </select>
                    </div>
                    
                    <div>
                        <button
                            onClick={() => {
                                setProductFilter('');
                                setJobberFilter('');
                                setStatusFilter('');
                                setSearchTerm('');
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
                
                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-200">
                        <thead className="bg-light-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Product Code</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Product Name</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Jobber</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Qty Available</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Price/Unit</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">GST%</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Total Value</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Stock Info</th> {/* Add this column */}
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-100 divide-y divide-light-200">
                            {filteredFinishedGoods.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-4 text-center text-secondary-500"> {/* Update colspan */}
                                        No finished goods found.
                                    </td>
                                </tr>
                            ) : (
                                filteredFinishedGoods.map(item => {
                                    // Get stock info for this product
                                    const stockInfo = productStocks[item.productName.toLowerCase()] || {};
                                    
                                    return (
                                        <tr key={item._id} className="hover:bg-light-200">
                                            <td className="px-6 py-4 text-sm font-bold text-dark-700">{item.productCode}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">{item.productName}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">{item.jobberName}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">{item.quantityAvailable}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">₹{item.perUnitPrice || 0}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">{item.gst || 0}%</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">₹{item.totalValue || 0}</td>
                                            <td className="px-6 py-4 text-sm text-dark-700">
                                                {/* Display stock info */}
                                                {stockInfo.productName ? (
                                                    <div>
                                                        <div>Total: {stockInfo.totalStock || 0}</div>
                                                        <div className="text-xs">
                                                            Own: {stockInfo.ownUnitStock || 0} | Jobber: {stockInfo.jobberStock || 0}
                                                        </div>
                                                        {stockInfo.lastProductionDetails && (
                                                            <div className="text-xs text-gray-500">
                                                                Last: {stockInfo.lastProductionDetails.unitType} ({stockInfo.lastProductionDetails.cartonQty} cartons)
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                <button
                                                    onClick={() => handleEditClick(item)}
                                                    className="flex items-center px-3 py-1 text-white bg-blue-500 rounded hover:bg-blue-600"
                                                >
                                                    <FaEdit className="mr-1" /> Edit
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="mt-4 text-sm text-secondary-500">
                    Showing {filteredFinishedGoods.length} of {finishedGoods.length} products
                </div>
            </Card>
            
            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Edit Product Details"
            >
                {selectedProduct && (
                    <form onSubmit={handleSaveChanges} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">Product Code</label>
                                <input
                                    type="text"
                                    value={selectedProduct.productCode}
                                    readOnly
                                    className="w-full px-3 py-2 text-dark-700 bg-gray-100 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">Product Name</label>
                                <input
                                    type="text"
                                    value={selectedProduct.productName}
                                    readOnly
                                    className="w-full px-3 py-2 text-dark-700 bg-gray-100 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">Jobber</label>
                                <input
                                    type="text"
                                    value={selectedProduct.jobberName}
                                    readOnly
                                    className="w-full px-3 py-2 text-dark-700 bg-gray-100 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">Quantity</label>
                                <input
                                    type="text"
                                    value={selectedProduct.quantityAvailable}
                                    readOnly
                                    className="w-full px-3 py-2 text-dark-700 bg-gray-100 border border-gray-300 rounded-md"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">Selling Price / Unit</label>
                                <input
                                    type="number"
                                    name="perUnitPrice"
                                    value={editFormData.perUnitPrice}
                                    onChange={handleEditFormChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-dark-700 mb-1">GST %</label>
                                <input
                                    type="number"
                                    name="gst"
                                    value={editFormData.gst}
                                    onChange={handleEditFormChange}
                                    min="0"
                                    step="0.01"
                                    className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-dark-700 mb-1">Remarks</label>
                            <textarea
                                name="remarks"
                                value={editFormData.remarks}
                                onChange={handleEditFormChange}
                                rows="3"
                                className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default ProductDetails;