import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaEye, FaFilePdf, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ViewFGDCs = () => {
    const navigate = useNavigate();
    
    // State
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [filteredChallans, setFilteredChallans] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Filter state
    const [filters, setFilters] = useState({
        dispatchType: '',
        product: '',
        receiver: '',
        startDate: '',
        endDate: ''
    });
    
    // Fetch delivery challans on component mount
    useEffect(() => {
        const fetchDeliveryChallans = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/fg/delivery-challan');
                setDeliveryChallans(response.data);
                setFilteredChallans(response.data);
            } catch (err) {
                setError('Failed to load delivery challans. Please try refreshing.');
                console.error('Error fetching delivery challans:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchDeliveryChallans();
    }, []);
    
    // Apply filters when they change
    useEffect(() => {
        let result = [...deliveryChallans];
        
        // Apply dispatch type filter
        if (filters.dispatchType) {
            result = result.filter(dc => dc.dispatch_type === filters.dispatchType);
        }
        
        // Apply product filter
        if (filters.product) {
            const searchTerm = filters.product.toLowerCase();
            result = result.filter(dc => 
                dc.product_name.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply receiver filter
        if (filters.receiver) {
            const searchTerm = filters.receiver.toLowerCase();
            result = result.filter(dc => 
                (dc.receiver_name && dc.receiver_name.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply date range filters
        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            result = result.filter(dc => new Date(dc.date) >= startDate);
        }
        
        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            result = result.filter(dc => new Date(dc.date) <= endDate);
        }
        
        setFilteredChallans(result);
    }, [filters, deliveryChallans]);
    
    // Handle filter input changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Reset filters
    const resetFilters = () => {
        setFilters({
            dispatchType: '',
            product: '',
            receiver: '',
            startDate: '',
            endDate: ''
        });
    };
    
    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString();
    };
    
    // Get status badge class
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Dispatched': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        
        // All DCs are automatically "Completed" (Dispatched), so show them as such
        if (status === 'Pending') {
            status = 'Dispatched';
        }
        
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status === 'Dispatched' ? 'Completed' : status}
            </span>
        );
    };
    
    // Generate PDF for delivery challan
    const generatePDF = async (dcId) => {
        try {
            // Fetch the delivery challan details
            const response = await api.get(`/fg/delivery-challan/${dcId}`);
            const dc = response.data;
            
            // Create PDF
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            
            const marginLeft = 15;
            const marginRight = 15;
            const pageWidth = 210;
            const contentWidth = pageWidth - marginLeft - marginRight;
            let currentY = 15;
            
            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(18);
            doc.text('DELIVERY CHALLAN', pageWidth / 2, currentY, { align: 'center' });
            
            currentY += 10;
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(12);
            doc.text(`DC No: ${dc.dc_no}`, marginLeft, currentY);
            
            doc.text(`Date: ${formatDate(dc.date)}`, pageWidth - marginRight - 40, currentY, { align: 'right' });
            
            currentY += 15;
            
            // Receiver details
            doc.setFont('helvetica', 'bold');
            doc.text('Receiver Details:', marginLeft, currentY);
            
            currentY += 7;
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${dc.receiver_name || 'N/A'}`, marginLeft, currentY);
            currentY += 7;
            doc.text(`Type: ${dc.receiver_type || 'N/A'}`, marginLeft, currentY);
            currentY += 7;
            if (dc.receiver_details) {
                doc.text(`Details: ${dc.receiver_details}`, marginLeft, currentY);
                currentY += 7;
            }
            
            currentY += 10;
            
            // Product details
            doc.setFont('helvetica', 'bold');
            doc.text('Product Details:', marginLeft, currentY);
            
            currentY += 7;
            
            doc.setFont('helvetica', 'normal');
            doc.text(`Product: ${dc.product_name}`, marginLeft, currentY);
            currentY += 7;
            
            // Handle different issue types for quantity display
            if (dc.issue_type === 'Both') {
                doc.text(`Carton Quantity: ${dc.carton_quantity}`, marginLeft, currentY);
                currentY += 7;
                doc.text(`Piece Quantity: ${dc.piece_quantity}`, marginLeft, currentY);
                currentY += 7;
                // Show equivalent in cartons and pieces
                const totalPieces = (dc.carton_quantity * dc.units_per_carton) + dc.piece_quantity;
                const equivalentCartons = Math.floor(totalPieces / dc.units_per_carton);
                const equivalentPieces = totalPieces % dc.units_per_carton;
                doc.text(`Equivalent: ${equivalentCartons} cartons, ${equivalentPieces} pieces`, marginLeft, currentY);
            } else {
                doc.text(`Quantity: ${dc.quantity} ${dc.issue_type === 'Carton' ? 'cartons' : 'pieces'}`, marginLeft, currentY);
                currentY += 7;
                if (dc.issue_type === 'Pieces') {
                    // Show equivalent in cartons and pieces
                    const equivalentCartons = Math.floor(dc.quantity / dc.units_per_carton);
                    const equivalentPieces = dc.quantity % dc.units_per_carton;
                    doc.text(`Equivalent: ${equivalentCartons} cartons, ${equivalentPieces} pieces`, marginLeft, currentY);
                }
            }
            currentY += 7;
            doc.text(`Dispatch Type: ${dc.dispatch_type}`, marginLeft, currentY);
            
            currentY += 15;
            
            // Remarks
            if (dc.remarks) {
                doc.setFont('helvetica', 'bold');
                doc.text('Remarks:', marginLeft, currentY);
                currentY += 7;
                doc.setFont('helvetica', 'normal');
                doc.text(dc.remarks, marginLeft, currentY, { maxWidth: contentWidth });
            }
            
            currentY += 15;
            
            // Status
            doc.setFont('helvetica', 'bold');
            doc.text(`Status: ${dc.status}`, marginLeft, currentY);
            
            currentY += 15;
            
            // Footer
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.text('Generated by Delta Inventory Management System', pageWidth / 2, 280, { align: 'center' });
            
            // Save PDF
            doc.save(`FGDC_${dc.dc_no}.pdf`);
        } catch (err) {
            console.error('PDF Generation Error:', err);
            toast.error('Failed to generate PDF: ' + (err.message || 'Unknown error'));
        }
    };
    
    // Delete delivery challan (placeholder - would require backend implementation)
    const handleDelete = async (dcId) => {
        if (window.confirm('Are you sure you want to delete this delivery challan?')) {
            toast.warn('Delete functionality not implemented yet.');
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Finished Goods Delivery Challans
                </h1>
                <p className="text-gray-600 text-sm">
                    View and manage all finished goods delivery challans.
                </p>
            </div>
            
            {/* Filters */}
            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dispatch Type
                        </label>
                        <select
                            name="dispatchType"
                            value={filters.dispatchType}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                            <option value="">All Types</option>
                            <option value="Free Sample">Free Sample</option>
                            <option value="Courier">Courier</option>
                            <option value="E-Commerce">E-Commerce</option>
                            <option value="Sales">Sales</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                        </label>
                        <input
                            type="text"
                            name="product"
                            value={filters.product}
                            onChange={handleFilterChange}
                            placeholder="Product name"
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Receiver
                        </label>
                        <input
                            type="text"
                            name="receiver"
                            value={filters.receiver}
                            onChange={handleFilterChange}
                            placeholder="Receiver name"
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            name="startDate"
                            value={filters.startDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                        </label>
                        <input
                            type="date"
                            name="endDate"
                            value={filters.endDate}
                            onChange={handleFilterChange}
                            className="w-full px-3 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
                    >
                        <FaSearch className="mr-2" />
                        Reset Filters
                    </button>
                    
                    <button
                        onClick={() => navigate('/fg/delivery-challan/create')}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex items-center"
                    >
                        <FaPlus className="mr-2" />
                        Create New DC
                    </button>
                </div>
            </Card>
            
            {/* Delivery Challans Table */}
            <Card title={`Delivery Challans (${filteredChallans.length})`}>
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <FaSpinner className="animate-spin text-primary-500" size={48} />
                    </div>
                ) : error ? (
                    <div className="p-4 bg-red-100 text-red-700 rounded-md">
                        {error}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receiver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredChallans.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No delivery challans found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredChallans.map(dc => (
                                        <tr key={dc._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{dc.dc_no}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{dc.dispatch_type}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={dc.product_name}>
                                                {dc.product_name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {dc.issue_type === 'Both' 
                                                    ? `${dc.carton_quantity}C + ${dc.piece_quantity}P` 
                                                    : `${dc.quantity} ${dc.issue_type === 'Carton' ? 'C' : 'P'}`}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={dc.receiver_name}>
                                                {dc.receiver_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {formatDate(dc.date)}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {getStatusBadge(dc.status)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-right space-x-2">
                                                <button
                                                    onClick={() => generatePDF(dc._id)}
                                                    className="p-2 text-blue-600 hover:text-blue-900"
                                                    title="Download PDF"
                                                >
                                                    <FaFilePdf />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(dc._id)}
                                                    className="p-2 text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ViewFGDCs;