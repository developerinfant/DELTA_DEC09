import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

const PackingGRNPrintLayout = ({ grnData }) => {
    const location = useLocation();
    const [loading, setLoading] = useState(!grnData);
    const [data, setData] = useState(grnData);

    // If grnData is not provided, we're in router context and need to fetch the data
    useEffect(() => {
        if (!grnData) {
            // In a real implementation, we would fetch the GRN data here
            // For now, we'll just set loading to false
            setLoading(false);
        }
    }, [grnData]);

    // Check if we should automatically download
    const shouldAutoDownload = location.search.includes('download=true');

    // Handle auto-download
    useEffect(() => {
        // Wait a bit for the page to render, then trigger print which will show the save dialog
        const timer = setTimeout(() => {
            if (shouldAutoDownload && data) {
                window.print();
            }
        }, 1000);
        
        return () => clearTimeout(timer);
    }, [shouldAutoDownload, data]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading GRN...</div>;
    }

    if (!data) {
        return <div className="flex justify-center items-center h-screen">No GRN data available</div>;
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-GB', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="bg-white p-8">
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 10mm;
                        }
                        
                        body * {
                            visibility: hidden;
                        }
                        #print-section, #print-section * {
                            visibility: visible;
                        }
                        #print-section {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 10mm; /* Match the page margin */
                        }
                        .no-print {
                            display: none;
                        }
                        
                        /* Ensure crisp single borders */
                        table {
                            border-collapse: collapse !important;
                            table-layout: fixed !important;
                        }
                        
                        th, td {
                            border: 1px solid #000 !important;
                            padding: 4px 6px !important;
                            font-size: 10px !important;
                        }
                        
                        /* Limit image size */
                        img {
                            max-width: 60mm !important;
                            height: auto !important;
                        }
                        
                        /* Hide UI elements during print */
                        nav, header, aside, footer, .sidebar, .header {
                            display: none !important;
                        }
                    }
                `}
            </style>
            
            <div id="print-section">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                    <div className="w-1/3">
                        <img src={logo} alt="Delta Logo" className="h-20" style={{ maxWidth: '60mm', height: 'auto' }} />
                    </div>
                    <div className="w-2/3 text-right">
                        <h1 className="text-3xl font-bold text-black">DELTA'S TRADE LINK</h1>
                        <p className="text-sm">4078, Thottanuthu Road, Reddiyapatti P.O,</p>
                        <p className="text-sm">Natham Road, Dindigul - 624003</p>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-center text-2xl font-bold my-6 uppercase underline">Goods Receipt Note (GRN)</h2>

                {/* Supplier and GRN Details */}
                <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div className="border p-4 rounded-md">
                        <h3 className="font-bold mb-2">Supplier Details:</h3>
                        <p className="font-semibold">{data.supplier?.name || 'N/A'}</p>
                        <p>{data.supplier?.address || 'N/A'}</p>
                    </div>
                    <div className="border p-4 rounded-md space-y-1">
                         <div className="flex justify-between"><span>GRN Number:</span> <span className="font-semibold">{data.grnNumber || 'N/A'}</span></div>
                         <div className="flex justify-between"><span>PO Number:</span> <span className="font-semibold">{data.purchaseOrder?.poNumber || 'N/A'}</span></div>
                         <div className="flex justify-between"><span>Date Received:</span> <span className="font-semibold">{formatDate(data.dateReceived)}</span></div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="min-w-full divide-y divide-gray-300 border" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-bold uppercase" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>Material</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>Ordered</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>Received</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>Damaged</th>
                            <th className="px-4 py-2 text-left text-xs font-bold uppercase" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.items?.map((item, index) => (
                            <tr key={item._id || index}>
                                <td className="px-4 py-2 text-sm" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>{item.material?.name || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm text-right" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>{item.orderedQuantity || 0}</td>
                                <td className="px-4 py-2 text-sm text-right" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>{item.receivedQuantity || 0}</td>
                                <td className="px-4 py-2 text-sm text-right" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>{item.damagedQuantity || 0}</td>
                                <td className="px-4 py-2 text-sm" style={{ border: '1px solid #000', padding: '4px 6px', fontSize: '10px' }}>{item.remarks || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Approval Details */}
                <div className="mt-6 border p-4 rounded-md text-sm">
                    <h3 className="font-bold mb-2">Approval Details:</h3>
                    <div className="grid grid-cols-2 gap-x-4">
                        <p><strong>Prepared By:</strong> {data.receivedBy || 'N/A'}</p>
                        <p><strong>Status:</strong> {data.status || 'N/A'}</p>
                        {data.approvedBy && <p><strong>Approved By:</strong> {data.approvedBy.name || 'N/A'}</p>}
                        {data.approvalDate && <p><strong>Approval Date:</strong> {formatDate(data.approvalDate)}</p>}
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-16 pt-8 text-center text-sm">
                    <div>
                        <p className="border-t pt-2 w-48">Storekeeper Signature</p>
                    </div>
                    <div>
                        <p className="border-t pt-2 w-48">Manager Signature</p>
                    </div>
                    <div>
                        <p className="border-t pt-2 w-48">Admin Signature</p>
                    </div>
                </div>
            </div>

             <div className="text-center mt-6 no-print">
                <button 
                    onClick={() => window.print()} 
                    className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                >
                    Print / Save as PDF
                </button>
            </div>
        </div>
    );
};

export default PackingGRNPrintLayout;