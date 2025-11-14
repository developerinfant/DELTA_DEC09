import * as XLSX from 'xlsx';

/**
 * Export purchase order data to Excel format
 * @param {Array} data - Array of purchase order data
 * @param {string} fileName - Name of the Excel file
 */
export const exportPOToExcel = (data, fileName) => {
  try {
    // Format the data for Excel
    const formattedData = data.map(po => ({
      'PO Number': po.poNumber,
      'Supplier Name': po.supplier?.name || 'N/A',
      'Supplier Address': po.supplierAddress || po.supplier?.address || 'N/A',
      'Contact Person': po.supplier?.contactPerson || 'N/A',
      'Phone': po.supplierPhone || po.supplier?.phone || 'N/A',
      'Email': po.supplierEmail || po.supplier?.email || 'N/A',
      'GSTIN': po.supplierGSTIN || po.supplier?.gstin || 'N/A',
      'Date Created': formatDate(po.createdAt),
      'Expected Delivery': formatDate(po.expectedDeliveryDate) || 'N/A',
      'Status': po.status,
      'Payment Terms': po.paymentTerms || 'N/A',
      'Prepared By': po.preparedBy || 'N/A',
      'Dispatch From': po.dispatchFrom || 'N/A',
      'Destination': po.destination || 'N/A',
      'Vehicle No': po.vehicleNo || 'N/A',

      'Transport': po.transport || 'N/A',
      'No. of Packs': po.noOfPacks || 'N/A',
      'Salesman': po.salesman || 'N/A',
      'DC No': po.dcNo || 'N/A',
      'DC Date': formatDate(po.dcDate) || 'N/A',
      'Delivery Terms': po.deliveryTerms || 'N/A',
      'Taxable Amount': formatCurrency(po.taxableAmount),
      'Total CGST': formatCurrency(po.totalCGST),
      'Total SGST': formatCurrency(po.totalSGST),
      'Round Off': formatCurrency(po.roundOff),
      'Grand Total': formatCurrency(po.totalAmount),
      'Amount in Words': po.amountInWords || 'N/A'
    }));

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');
    
    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Export purchase order items to Excel format
 * @param {Object} poData - Purchase order data
 * @param {string} fileName - Name of the Excel file
 */
export const exportPOItemsToExcel = (poData, fileName) => {
  try {
    // Format the items data for Excel
    const formattedData = poData.items?.map((item, index) => ({
      'S.No': index + 1,
      'Item Code': item.itemCode || 'N/A',
      'Material': item.material?.name || 'N/A',
      'HSN': item.hsn || 'N/A',
      'Quantity': item.quantity,
      'UOM': item.uom || 'N/A',
      'Rate (₹)': formatCurrency(item.rate),
      'Discount %': `${item.discountPercent}%`,
      'GST %': `${item.gstPercent}%`,
      'CGST (₹)': formatCurrency(item.cgst),
      'SGST (₹)': formatCurrency(item.sgst),
      'Total (₹)': formatCurrency(item.lineTotal)
    })) || [];

    // Add total row
    formattedData.push({
      'S.No': '',
      'Item Code': '',
      'Material': '',
      'HSN': '',
      'Quantity': '',
      'UOM': '',
      'Rate (₹)': '',
      'Discount %': '',
      'GST %': 'Total',
      'CGST (₹)': formatCurrency(poData.totalCGST),
      'SGST (₹)': formatCurrency(poData.totalSGST),
      'Total (₹)': formatCurrency(poData.grandTotal)
    });

    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Create a worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'PO Items');
    
    // Generate buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}_Items.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    return { success: true };
  } catch (error) {
    console.error('Error exporting items to Excel:', error);
    return { success: false, error: error.message };
  }
};

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
};

const formatCurrency = (amount) => {
  return `₹${parseFloat(amount).toFixed(2)}`;
};