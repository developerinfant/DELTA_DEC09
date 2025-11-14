import React from 'react';
import { generateDeltaPOPDF } from '../../utils/pdfGenerator';
import { exportPOToExcel } from '../../utils/excelExporter';

const TestPDFGenerator = () => {
  // Sample PO data for testing
  const samplePOData = {
    poNumber: 'PO-004/25-10',
    createdAt: '2025-10-15T00:00:00.000Z',
    expectedDeliveryDate: '2025-10-16T00:00:00.000Z',
    status: 'Ordered',
    paymentTerms: 'Advance',
    preparedBy: 'Admin User',
    dispatchFrom: '12',
    destination: '312',
    vehicleNo: '213',

    transport: '13',
    noOfPacks: 32,
    salesman: '213',
    dcNo: '32',
    dcDate: '1970-01-01T00:00:00.000Z',
    deliveryTerms: '321',
    supplier: {
      name: 'Pencil Box',
      address: 'a',
      contactPerson: 'agent08',
      phone: '9500638858',
      email: 'techvaseegrah@gmail.com',
      gstin: 'N/A',
      bankName: 'KARUR VYSYA BANK',
      accountNumber: '1128115000011983',
      ifscCode: 'KVBL0001128',
      branch: 'DINDIGUL MAIN'
    },
    supplierAddress: 'a',
    supplierPhone: '9500638858',
    supplierEmail: 'techvaseegrah@gmail.com',
    supplierGSTIN: 'N/A',
    items: [
      {
        _id: '1',
        itemCode: 'PM-00006',
        material: { name: 'box23' },
        hsn: '2',
        quantity: 32,
        uom: '2',
        rate: 2.00,
        discountPercent: 32,
        gstPercent: 2,
        cgst: 0.44,
        sgst: 0.44,
        lineTotal: 44.39
      }
    ],
    taxableAmount: 44.39,
    totalCGST: 0.44,
    totalSGST: 0.44,
    grandTotal: 44.39,
    roundOff: 0.00,
    totalAmount: 45.27,
    amountInWords: 'INR Forty-Five Only'
  };

  const handleTestPDF = async () => {
    try {
      const result = await generateDeltaPOPDF(samplePOData, 'download');
      if (result.success) {
        console.log('PDF generated successfully');
      } else {
        console.error('Error generating PDF:', result.error);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleTestExcel = async () => {
    try {
      const result = await exportPOToExcel([samplePOData], 'TestPO');
      if (result.success) {
        console.log('Excel exported successfully');
      } else {
        console.error('Error exporting Excel:', result.error);
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test PDF & Excel Generation</h1>
      <div className="space-x-4">
        <button 
          onClick={handleTestPDF}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Generate Test PDF
        </button>
        <button 
          onClick={handleTestExcel}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Export Test Excel
        </button>
      </div>
    </div>
  );
};

export default TestPDFGenerator;