import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import { FaSpinner, FaPrint, FaFilePdf } from 'react-icons/fa';

const InvoiceDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [invoice, setInvoice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const { data } = await api.get(`/fg/invoices/${id}`);
                setInvoice(data);
            } catch (err) {
                setError('Failed to fetch invoice details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoice();
    }, [id]);

    const handlePrint = () => {
        // Navigate to the new print layout instead of using window.print()
        navigate(`/fg/invoice/${id}/print`);
    };

    const handleDownloadPDF = () => {
        // Navigate to the new print layout for PDF generation
        navigate(`/fg/invoice/${id}/print`);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    }

    if (error) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {error}
                <button 
                    onClick={() => navigate('/fg/invoice/view')}
                    className="ml-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                    Back to Invoices
                </button>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">
                Invoice not found.
                <button 
                    onClick={() => navigate('/fg/invoice/view')}
                    className="ml-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                    Back to Invoices
                </button>
            </div>
        );
    }

    // Convert number to words
    const numberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (num === 0) return 'Zero';
        
        let words = '';
        
        if (Math.floor(num / 10000000) > 0) {
            words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
            num %= 10000000;
        }
        
        if (Math.floor(num / 100000) > 0) {
            words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
            num %= 100000;
        }
        
        if (Math.floor(num / 1000) > 0) {
            words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
            num %= 1000;
        }
        
        if (Math.floor(num / 100) > 0) {
            words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
            num %= 100;
        }
        
        if (num > 0) {
            if (num < 10) {
                words += ones[num];
            } else if (num < 20) {
                words += teens[num - 10];
            } else {
                words += tens[Math.floor(num / 10)];
                if (num % 10 > 0) {
                    words += ' ' + ones[num % 10];
                }
            }
        }
        
        return words.trim();
    };

    return (
        <div className="max-w-4xl mx-auto p-4 print:p-0">
            {/* Screen Header */}
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-3xl font-bold text-dark-700">Invoice Details</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={() => navigate('/fg/invoice/view')}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handlePrint}
                        className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                        <FaPrint className="mr-2" /> VIEW 
                    </button>
                    
                </div>
            </div>
            
            {/* Main Invoice Container */}
            <div className="bg-white border border-light-300 rounded-lg p-6 print:border-0 print:p-0">
                {/* Company Header */}
                <div className="border-b border-light-300 pb-4 mb-4 print:border-b print:pb-4 print:mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-dark-700">DELTA S TRADE LINK</h2>
                            <p className="text-sm text-dark-700 mt-1">
                                No.2/225, MULLAKKADU, PALANI ROAD,<br />
                                DINDIGUL - 624 002
                            </p>
                            <p className="text-sm text-dark-700 mt-1">
                                GSTIN: 33AAHFD4739P1Z5
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-dark-700">TAX INVOICE</h3>
                            <p className="text-sm text-dark-700 mt-2">
                                SUBJECT TO DINDIGUL JURISDICTION
                            </p>
                        </div>
                        
                        <div className="text-right">
                            <div className="mb-1">
                                <span className="font-medium">Invoice No:</span> {invoice.invoiceNo}
                            </div>
                            <div className="mb-1">
                                <span className="font-medium">Date:</span> {formatDate(invoice.invoiceDate)}
                            </div>
                            <div className="mb-1">
                                <span className="font-medium">IRN:</span> {invoice.irn || 'N/A'}
                            </div>
                            <div className="mb-1">
                                <span className="font-medium">Ack. No:</span> {invoice.ackNo || 'N/A'}
                            </div>
                            <div className="mb-1">
                                <span className="font-medium">Ack. Date:</span> {formatDateTime(invoice.ackDate)}
                            </div>
                            <div className="mb-1">
                                <span className="font-medium">E-Way Bill No:</span> {invoice.eWayBillNo || 'N/A'}
                            </div>
                            <div>
                                <span className="font-medium">E-Way Bill Date:</span> {formatDateTime(invoice.eWayBillDate)}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Buyer Details */}
                <div className="border-b border-light-300 pb-4 mb-4 print:border-b print:pb-4 print:mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-dark-700 mb-2">Billed To:</h3>
                            <div className="border border-light-300 p-3 rounded print:border print:p-3">
                                <p className="text-sm text-dark-700">
                                    <strong>{invoice.buyerName}</strong><br />
                                    {invoice.billedTo.split('\n').map((line, i) => (
                                        <span key={i}>{line}<br /></span>
                                    ))}
                                    <span className="font-medium">GSTIN:</span> {invoice.buyerGstin || 'N/A'}
                                </p>
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="font-bold text-dark-700 mb-2">Shipped To:</h3>
                            <div className="border border-light-300 p-3 rounded print:border print:p-3">
                                <p className="text-sm text-dark-700">
                                    <strong>{invoice.buyerName}</strong><br />
                                    {(invoice.shippedTo ? invoice.shippedTo : invoice.billedTo).split('\n').map((line, i) => (
                                        <span key={i}>{line}<br /></span>
                                    ))}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Additional Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Dispatch From:</span>
                            <p className="text-sm text-dark-700">{invoice.dispatchFrom || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">No. of Packages:</span>
                            <p className="text-sm text-dark-700">{invoice.noOfPackages || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Transport Name:</span>
                            <p className="text-sm text-dark-700">{invoice.transportName || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Vehicle No:</span>
                            <p className="text-sm text-dark-700">{invoice.vehicleNo || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Terms of Payment:</span>
                            <p className="text-sm text-dark-700">{invoice.termsOfPayment || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Destination:</span>
                            <p className="text-sm text-dark-700">{invoice.destination || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">PO No. & Date:</span>
                            <p className="text-sm text-dark-700">{invoice.poNoDate || 'N/A'}</p>
                        </div>
                        <div className="border border-light-300 p-2 rounded print:border print:p-2">
                            <span className="font-medium text-xs">Salesman:</span>
                            <p className="text-sm text-dark-700">{invoice.salesman || 'N/A'}</p>
                        </div>
                    </div>
                </div>
                
                {/* Product Table */}
                <div className="border-b border-light-300 pb-4 mb-4 print:border-b print:pb-4 print:mb-4">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b border-light-300 bg-light-100 print:bg-light-100">
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">S.N</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">ITEM CODE</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">PRODUCT</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">HSN</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">GST%</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">SCHEME</th>
                                    <th className="text-left py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">UOM</th>
                                    <th className="text-right py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">QTY</th>
                                    <th className="text-right py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">RATE</th>
                                    <th className="text-right py-2 px-3 text-xs font-bold border-r border-light-300 print:border-r">DISC%</th>
                                    <th className="text-right py-2 px-3 text-xs font-bold">AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, index) => (
                                    <tr key={index} className="border-b border-light-200 print:border-b">
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.sn}</td>
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.itemCode || 'N/A'}</td>
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.product}</td>
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.hsn || 'N/A'}</td>
                                        <td className="py-2 px-3 text-sm text-right border-r border-light-200 print:border-r">
                                            {/* Display GST% based on invoice type */}
                                            {invoice.gstType === 'CGST+SGST' ? '5%' : '5%'}
                                        </td>
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.scheme || 'N/A'}</td>
                                        <td className="py-2 px-3 text-sm border-r border-light-200 print:border-r">{item.uom || 'NOS'}</td>
                                        <td className="py-2 px-3 text-sm text-right border-r border-light-200 print:border-r">{item.qty}</td>
                                        <td className="py-2 px-3 text-sm text-right border-r border-light-200 print:border-r">₹{item.rate.toFixed(2)}</td>
                                        <td className="py-2 px-3 text-sm text-right border-r border-light-200 print:border-r">{item.discPercent}%</td>
                                        <td className="py-2 px-3 text-sm text-right">₹{item.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Invoice Summary */}
                <div className="border-b border-light-300 pb-4 mb-4 print:border-b print:pb-4 print:mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border border-light-300 p-3 rounded print:border print:p-3">
                            <h3 className="font-bold text-dark-700 mb-2">Amount in Words:</h3>
                            <p className="text-sm text-dark-700">
                                {invoice.amountInWords || `INR ${numberToWords(Math.round(invoice.grandTotal))} Only`}
                            </p>
                        </div>
                        
                        <div className="border border-light-300 p-3 rounded print:border print:p-3">
                            <div className="flex justify-between mb-1">
                                <span className="font-medium">Scheme Discount:</span>
                                <span>₹{invoice.schemeDiscount?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between mb-1">
                                <span className="font-medium">Taxable Amount:</span>
                                <span>₹{invoice.taxableAmount?.toFixed(2) || '0.00'}</span>
                            </div>
                            
                            {/* Dynamic GST display based on buyer state */}
                            {invoice.gstType === 'CGST+SGST' ? (
                                <>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">CGST {invoice.cgstPercent || 2.5}%:</span>
                                        <span>₹{invoice.cgstAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between mb-1">
                                        <span className="font-medium">SGST {invoice.sgstPercent || 2.5}%:</span>
                                        <span>₹{invoice.sgstAmount?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex justify-between mb-1">
                                    <span className="font-medium">IGST {invoice.igstPercent || 5}%:</span>
                                    <span>₹{invoice.igstAmount?.toFixed(2) || '0.00'}</span>
                                </div>
                            )}
                            
                            <div className="flex justify-between mb-1">
                                <span className="font-medium">Round Off:</span>
                                <span>₹{invoice.roundOff?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-2 border-t border-light-300 print:border-t">
                                <span>Grand Total:</span>
                                <span>₹{invoice.grandTotal?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="border border-light-300 p-3 rounded print:border print:p-3">
                            <h3 className="font-bold text-dark-700 mb-2">BANK DETAILS:</h3>
                            <p className="text-sm text-dark-700">
                                Bank Name : KARUR VYSYA BANK<br />
                                A/c. Name : DELTA S TRADE LINK<br />
                                A/c. No. : 1128115000011983<br />
                                Branch & IFSC : DINDIGUL MAIN & KVBL0001128
                            </p>
                        </div>
                        
                        <div className="border border-light-300 p-3 rounded print:border print:p-3">
                            <h3 className="font-bold text-dark-700 mb-2">TERMS & CONDITIONS:</h3>
                            <p className="text-sm text-dark-700">
                                "Goods once sold will not be taken back."
                            </p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <p className="text-sm text-dark-700">Customer Signature</p>
                            <div className="border-t border-dark-700 mt-8 pt-2 print:border-t"></div>
                        </div>
                        
                        <div className="text-right">
                            <p className="text-sm text-dark-700">For DELTA S TRADE LINK</p>
                            <p className="text-sm text-dark-700 mt-8">Authorized Signatory</p>
                            <div className="border-t border-dark-700 mt-8 pt-2 print:border-t"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceDetail;