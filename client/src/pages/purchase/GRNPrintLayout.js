import React from 'react';
import logo from '../../assets/logo.png';

const GRNPrintLayout = ({ grnData }) => {
    if (!grnData) {
        return <div>Loading GRN...</div>;
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
                            padding: 1.5rem; /* Add some padding for printing */
                        }
                        .no-print {
                            display: none;
                        }
                    }
                `}
            </style>
            
            <div id="print-section">
                {/* Header */}
                <div className="flex justify-between items-start pb-4 border-b-2 border-black">
                    <div className="w-1/3">
                        <img src={logo} alt="Delta Logo" className="h-20" />
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
                        <p className="font-semibold">{grnData.supplier?.name}</p>
                        <p>{grnData.supplier?.address}</p>
                    </div>
                    <div className="border p-4 rounded-md space-y-1">
                         <div className="flex justify-between"><span>GRN Number:</span> <span className="font-semibold">{grnData.grnNumber}</span></div>
                         <div className="flex justify-between"><span>PO Number:</span> <span className="font-semibold">{grnData.purchaseOrder?.poNumber}</span></div>
                         <div className="flex justify-between"><span>Date Received:</span> <span className="font-semibold">{formatDate(grnData.dateReceived)}</span></div>
                    </div>
                </div>

                {/* Items Table */}
                <table className="min-w-full divide-y divide-gray-300 border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-bold uppercase">Material</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase">Ordered</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase">Received</th>
                            <th className="px-4 py-2 text-right text-xs font-bold uppercase">Damaged</th>
                            <th className="px-4 py-2 text-left text-xs font-bold uppercase">Remarks</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {grnData.items?.map((item, index) => (
                            <tr key={item._id || index}>
                                <td className="px-4 py-2 text-sm">{item.material?.name}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.orderedQuantity}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.receivedQuantity}</td>
                                <td className="px-4 py-2 text-sm text-right">{item.damagedQuantity}</td>
                                <td className="px-4 py-2 text-sm">{item.remarks}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {/* Approval Details */}
                <div className="mt-6 border p-4 rounded-md text-sm">
                    <h3 className="font-bold mb-2">Approval Details:</h3>
                    <div className="grid grid-cols-2 gap-x-4">
                        <p><strong>Prepared By:</strong> {grnData.receivedBy}</p>
                        <p><strong>Status:</strong> {grnData.status}</p>
                        {grnData.approvedBy && <p><strong>Approved By:</strong> {grnData.approvedBy.name}</p>}
                        {grnData.approvalDate && <p><strong>Approval Date:</strong> {formatDate(grnData.approvalDate)}</p>}
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
                <button onClick={() => window.print()} className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600">
                    Print / Save as PDF
                </button>
            </div>
        </div>
    );
};

export default GRNPrintLayout;