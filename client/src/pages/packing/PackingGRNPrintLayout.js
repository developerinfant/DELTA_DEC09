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
                            margin: 15mm;
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
                            padding: 15mm; /* Match the page margin */
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
                            padding: 6px 8px !important;
                            font-size: 11px !important;
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
                <div className="flex justify-between items-start pb-6 border-b-2 border-black">
                    <div className="w-1/3">
                        <img src={logo} alt="Delta Logo" className="h-24" style={{ maxWidth: '60mm', height: 'auto' }} />
                    </div>
                    <div className="w-2/3 text-right">
                        <h1 className="text-3xl font-bold text-black">DELTA'S TRADE LINK</h1>
                        <p className="text-sm mt-1">4078, Thottanuthu Road, Reddiyapatti P.O,</p>
                        <p className="text-sm">Natham Road, Dindigul - 624003</p>
                        <p className="text-sm mt-2 font-bold">GOODS RECEIPT NOTE (GRN)</p>
                    </div>
                </div>

                {/* GRN Details */}
                <div className="grid grid-cols-2 gap-6 my-6 text-sm">
                    <div className="border border-black p-4">
                        <h3 className="font-bold mb-3 text-base">SUPPLIER DETAILS</h3>
                        <div className="space-y-1">
                            <p><span className="font-medium">Name:</span> {data.supplier?.name || 'N/A'}</p>
                            <p><span className="font-medium">Address:</span> {data.supplier?.address || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="border border-black p-4">
                        <h3 className="font-bold mb-3 text-base">GRN INFORMATION</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>GRN Number:</span>
                                <span className="font-semibold">{data.grnNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>PO Number:</span>
                                <span className="font-semibold">{data.purchaseOrder?.poNumber || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Date Received:</span>
                                <span className="font-semibold">{formatDate(data.dateReceived)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Prepared By:</span>
                                <span className="font-semibold">{data.receivedBy || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="min-w-full border border-black" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>Material</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>Ordered</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>Received</th>
                            <th className="px-4 py-3 text-right text-xs font-bold uppercase border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>Damaged</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {data.items?.map((item, index) => (
                            <tr key={item._id || index}>
                                <td className="px-4 py-3 text-sm border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>{item.material?.name || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-right border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>{item.orderedQuantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-right border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>{item.receivedQuantity || 0}</td>
                                <td className="px-4 py-3 text-sm text-right border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>{item.damagedQuantity || 0}</td>
                                <td className="px-4 py-3 text-sm border border-black" style={{ border: '1px solid #000', padding: '6px 8px', fontSize: '11px' }}>{item.remarks || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Summary */}
                <div className="grid grid-cols-3 gap-6 my-6 text-sm">
                    <div className="border border-black p-4">
                        <h3 className="font-bold mb-2">ITEM SUMMARY</h3>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Total Items:</span>
                                <span className="font-semibold">{data.items?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="border border-black p-4">
                        <h3 className="font-bold mb-2">STATUS</h3>
                        <div className="space-y-1">
                            <p><span className="font-medium">Current Status:</span> {data.status || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="border border-black p-4">
                        <h3 className="font-bold mb-2">APPROVAL</h3>
                        <div className="space-y-1">
                            {data.approvedBy ? (
                                <>
                                    <p><span className="font-medium">Approved By:</span> {data.approvedBy.name || 'N/A'}</p>
                                    <p><span className="font-medium">Date:</span> {formatDate(data.approvalDate)}</p>
                                </>
                            ) : (
                                <p>Pending Approval</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-12 pt-8 text-center text-sm">
                    <div className="w-1/3">
                        <p className="border-t border-black pt-2">Storekeeper Signature</p>
                        <p className="mt-1 text-xs">(Name: _____________________)</p>
                    </div>
                    <div className="w-1/3">
                        <p className="border-t border-black pt-2">Manager Signature</p>
                        <p className="mt-1 text-xs">(Name: _____________________)</p>
                    </div>
                    <div className="w-1/3">
                        <p className="border-t border-black pt-2">Admin Signature</p>
                        <p className="mt-1 text-xs">(Name: _____________________)</p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
                    <p>Generated on {new Date().toLocaleString('en-GB')} | Document ID: {data._id}</p>
                </div>
            </div>

             <div className="text-center mt-8 no-print">
                <button 
                    onClick={() => window.print()} 
                    className="px-6 py-3 text-white bg-F2C94C hover:bg-amber-500 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                    Print / Save as PDF
                </button>
            </div>
        </div>
    );
};

export default PackingGRNPrintLayout;