import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaPrint, FaFilePdf } from 'react-icons/fa';
import { generateDeltaPOPDF } from '../../utils/pdfGenerator';

const PurchaseOrdersTable = ({ purchaseOrders }) => {
    const navigate = useNavigate();
    
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };
    
    const formatCurrency = (amount) => {
        // Using INR as a placeholder, you can change 'INR' to 'USD' or other currency codes.
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount);
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Approved': return 'bg-blue-100 text-blue-800';
            case 'Ordered': return 'bg-indigo-100 text-indigo-800';
            case 'Received': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Function to open report layout
    const handleViewReport = async (po) => {
        // Generate and view PDF
        await generateDeltaPOPDF(po, 'view');
    };

    // Function to download PDF
    const handleDownloadPDF = async (po) => {
        // Generate and download PDF
        await generateDeltaPOPDF(po, 'download');
    };

    // Function to print PDF
    const handlePrintPDF = async (po) => {
        // Generate and view PDF for printing
        await generateDeltaPOPDF(po, 'view');
    };

    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">PO Number</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Supplier</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Total Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {purchaseOrders.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-4 text-center text-secondary-500">No purchase orders found.</td>
                        </tr>
                    ) : (
                        purchaseOrders.map(po => (
                            <tr key={po._id} className="hover:bg-light-200">
                                <td className="px-6 py-4 text-sm font-medium text-dark-700">{po.poNumber}</td>
                                <td className="px-6 py-4 text-sm text-dark-700">{po.supplier?.name || 'N/A'}</td>
                                <td className="px-6 py-4 text-sm text-dark-700">{formatDate(po.createdAt)}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-dark-700">{formatCurrency(po.totalAmount)}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm space-x-2">
                                    <Link to={`/purchase-orders/${po._id}`} className="text-blue-500 hover:text-blue-700" title="View Details">
                                        <FaEye />
                                    </Link>
                                    <button 
                                        onClick={() => handleDownloadPDF(po)} 
                                        className="text-red-500 hover:text-red-700"
                                        title="Download PDF"
                                    >
                                        <FaFilePdf />
                                    </button>
                                    <button 
                                        onClick={() => handlePrintPDF(po)} 
                                        className="text-green-500 hover:text-green-700"
                                        title="Print PDF"
                                    >
                                        <FaPrint />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default PurchaseOrdersTable;