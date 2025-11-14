import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaPlus, FaTrash, FaPrint, FaFilePdf } from 'react-icons/fa';

const Invoice = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInvoices = async () => {
        try {
            const { data } = await api.get('/fg/invoices');
            setInvoices(data);
        } catch (err) {
            setError('Failed to fetch invoices.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, []);

    // Filter invoices based on search term
    const filteredInvoices = invoices.filter(invoice => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (invoice.invoiceNo && invoice.invoiceNo.toLowerCase().includes(term)) ||
            (invoice.buyerName && invoice.buyerName.toLowerCase().includes(term))
        );
    });

    const handleViewInvoice = (invoiceId) => {
        navigate(`/fg/invoice/${invoiceId}`);
    };

    const handlePrintInvoice = (invoiceId) => {
        // For now, navigate to the invoice detail page which will have print functionality
        navigate(`/fg/invoice/${invoiceId}`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark-700">Finished Goods Invoices</h1>
                <button 
                    onClick={() => navigate('/fg/invoice/create')}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FaPlus className="mr-2" /> Create New Invoice
                </button>
            </div>
            
            <Card>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by Invoice No or Buyer Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-80 px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-200">
                        <thead className="bg-light-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">INVOICE NO</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">DATE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">BUYER</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">AMOUNT</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">STATUS</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-100 divide-y divide-light-200">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-secondary-500">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map(invoice => (
                                    <tr key={invoice._id} className="hover:bg-light-200">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{invoice.invoiceNo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{formatDate(invoice.invoiceDate)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{invoice.buyerName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">₹{invoice.grandTotal.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                invoice.status === 'Generated' ? 'bg-green-100 text-green-800' : 
                                                invoice.status === 'Draft' ? 'bg-yellow-100 text-yellow-800' : 
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button 
                                                onClick={() => handleViewInvoice(invoice._id)}
                                                className="text-blue-500 hover:text-blue-700"
                                            >
                                                View
                                            </button>
                                            <button 
                                                onClick={() => handlePrintInvoice(invoice._id)}
                                                className="text-green-500 hover:text-green-700"
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
            </Card>
        </div>
    );
};

export default Invoice;