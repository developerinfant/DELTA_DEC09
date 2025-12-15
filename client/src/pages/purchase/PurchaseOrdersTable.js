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
        <div className="overflow-x-auto bg-white rounded-[16px] shadow-lg border border-[#E7E2D8]">
            <table className="min-w-full divide-y divide-[#E7E2D8]">
                <thead className="bg-[#FAF7F2]">
                    <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">PO Number</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Supplier</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Total Amount</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-[#1A1A1A] uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-[#E7E2D8]">
                    {purchaseOrders.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-[#6A6A6A]">No purchase orders found.</td>
                        </tr>
                    ) : (
                        purchaseOrders.map(po => (
                            <tr key={po._id} className="hover:bg-[#FAF7F2] transition-colors duration-150">
                                <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">{po.poNumber}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-[#1A1A1A]">{po.supplier?.name || 'N/A'}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm text-[#6A6A6A]">{formatDate(po.createdAt)}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-[#1A1A1A]">{formatCurrency(po.totalAmount)}</td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm">
                                    <span className={`px-3 py-1.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(po.status)}`}>
                                        {po.status}
                                    </span>
                                </td>
                                <td className="px-6 py-5 whitespace-nowrap text-sm space-x-3">
                                    <Link to={`/purchase-orders/${po._id}`} className="text-[#6A7F3F] hover:text-[#5a6d35] transition-colors duration-200" title="View Details">
                                        <FaEye />
                                    </Link>
                                    <button 
                                        onClick={() => handleDownloadPDF(po)} 
                                        className="text-red-500 hover:text-red-700 transition-colors duration-200"
                                        title="Download PDF"
                                    >
                                        <FaFilePdf />
                                    </button>
                                    <button 
                                        onClick={() => handlePrintPDF(po)} 
                                        className="text-green-500 hover:text-green-700 transition-colors duration-200"
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