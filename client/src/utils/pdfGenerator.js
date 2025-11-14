import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/logo-po.png'; // Import the DELTA logo

/**
 * Generate a PDF for a Purchase Order that matches the DELTA PO.pdf layout exactly
 * @param {Object} poData - The purchase order data
 * @param {string} type - 'view' or 'download'
 */
export const generateDeltaPOPDF = async (poData, type = 'download') => {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const marginLeft = 10;
    const marginRight = 10;
    const pageWidth = 210;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let currentY = 8;

    // Helper functions
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const formatCurrency = (amount) => {
      if (!amount) return '0.00';
      return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // ========== HEADER SECTION ==========
    // Top border line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
    currentY += 2;

    // "SUBJECT TO JURISDICTION" text at top right
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('SUBJECT TO JURISDICTION', pageWidth - marginRight - 2, currentY + 3, { align: 'right' });

    // GSTIN and PURCHASE ORDER on same line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('GSTIN : 33BFDPS0871J1ZC', marginLeft + 2, currentY + 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('PURCHASE ORDER', pageWidth / 2, currentY + 3, { align: 'center' });

    currentY += 5;

    // Logo and Company Header
    const logoWidth = 22;
    const logoHeight = 22;
    doc.addImage(logo, 'PNG', marginLeft + 2, currentY, logoWidth, logoHeight);

    // Company name and details (right side of logo)
    const textStartX = marginLeft + logoWidth + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('DELTA S TRADE LINK', textStartX, currentY + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text("India's No 1  Pooja Products Manufacturer", textStartX, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),', textStartX, currentY + 14);
    doc.text('NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA', textStartX, currentY + 17);
    doc.setFont('helvetica', 'bold');
    doc.text('E-Mail : deltastradelink@gmail.com', textStartX, currentY + 20);

    currentY += 24;

    // ========== INFO GRID SECTION (Top 6 boxes) ==========
    const boxHeight = 7;
    const col1Width = 45;
    const col2Width = 70;
    const col3Width = contentWidth - col1Width - col2Width;

    // Row 1: Shipped To | Vehicle No.
    let boxY = currentY;
    
    // Shipped To (spans across middle)
    doc.rect(marginLeft, boxY, col1Width + col2Width, boxHeight * 3); // Tall box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Shipped To :', marginLeft + 1, boxY + 3);
    
    // Shipped To details
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let shippedY = boxY + 6.5;
    doc.text('Delivery Address : [ Lulu I 2025-2026 ]', marginLeft + 1, shippedY);
    shippedY += 3.5;
    doc.text('DELTA S TRADE LINK, NO: 4078, THOTTANUTHU ROAD,', marginLeft + 1, shippedY);
    shippedY += 3.5;
    doc.text('REDDIYAPATTI (POST), NATHAM ROAD, DINDIGUL-624003,', marginLeft + 1, shippedY);
    shippedY += 3.5;
    doc.text('TAMIL NADU, INDIA.   E-Mail : deltastradelink@gmail.com', marginLeft + 1, shippedY);

    // Vehicle No.
    doc.rect(marginLeft + col1Width + col2Width, boxY, col3Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Vehicle No. :', marginLeft + col1Width + col2Width + 1, boxY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.vehicleNo || ''), marginLeft + col1Width + col2Width + 1, boxY + 6);

    boxY += boxHeight;

    // Row 2: Order No.
    doc.rect(marginLeft, boxY, col1Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Order No.  :', marginLeft + 1, boxY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.poNumber || ''), marginLeft + 1, boxY + 6);

    doc.rect(marginLeft + col1Width, boxY, col2Width + col3Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Date  :', marginLeft + col1Width + 1, boxY + 3);
    doc.setFontSize(8);
    doc.text(formatDate(poData.createdAt) || '', marginLeft + col1Width + 1, boxY + 6);

    boxY += boxHeight;

    // Row 3: GSTIN | Disp.From
    doc.rect(marginLeft, boxY, col1Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('GSTIN  :', marginLeft + 1, boxY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.supplierGSTIN || '33BFDPS0871J1ZC'), marginLeft + 1, boxY + 6);

    doc.rect(marginLeft + col1Width, boxY, col2Width + col3Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Disp.From  :', marginLeft + col1Width + 1, boxY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.dispatchFrom || 'Main'), marginLeft + col1Width + 1, boxY + 6);

    currentY = boxY + boxHeight + 2;

    // ========== BILLING FROM SECTION ==========
    const billingHeight = 20;
    doc.rect(marginLeft, currentY, col1Width, billingHeight);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Billing From', marginLeft + 1, currentY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let billingY = currentY + 6;
    const supplierName = String(poData.supplier?.name || 'Supplier Name');
    const supplierAddr = String(poData.supplier?.address || 'SP103, P.K.M. Road, Sivakasi - 626189, Tamilnadu, Ph : 04562-273203, 274569');
    
    doc.text(supplierName, marginLeft + 1, billingY);
    billingY += 3.5;
    
    // Split address into lines
    const addrLines = doc.splitTextToSize(supplierAddr, col1Width - 2);
    addrLines.forEach(line => {
      doc.text(line, marginLeft + 1, billingY);
      billingY += 3.5;
    });

    // Right side boxes (next to Billing From)
    const rightBoxWidth = (col2Width + col3Width) / 3;
    
    // Terms of Payment
    doc.rect(marginLeft + col1Width, currentY, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Terms of Payment :', marginLeft + col1Width + 1, currentY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.paymentTerms || ''), marginLeft + col1Width + 1, currentY + 6);

    // Destination
    doc.rect(marginLeft + col1Width + rightBoxWidth, currentY, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Destination :', marginLeft + col1Width + rightBoxWidth + 1, currentY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.destination || ''), marginLeft + col1Width + rightBoxWidth + 1, currentY + 6);

    // P.O No & Date
    doc.rect(marginLeft + col1Width + 2 * rightBoxWidth, currentY, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('P.O No & Date :', marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + 3);
    doc.setFontSize(8);
    doc.text(String(poData.poNumber || ''), marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + 6);

    // D.C No & Date
    doc.rect(marginLeft + col1Width, currentY + boxHeight, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('D.C No & Date :', marginLeft + col1Width + 1, currentY + boxHeight + 3);

    // Salesman
    doc.rect(marginLeft + col1Width + rightBoxWidth, currentY + boxHeight, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Salesman :', marginLeft + col1Width + rightBoxWidth + 1, currentY + boxHeight + 3);
    doc.setFontSize(8);
    doc.text(String(poData.salesman || '<None>'), marginLeft + col1Width + rightBoxWidth + 1, currentY + boxHeight + 6);

    // Transport
    doc.rect(marginLeft + col1Width + 2 * rightBoxWidth, currentY + boxHeight, rightBoxWidth, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Transport :', marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + boxHeight + 3);

    // No.of Pack
    doc.rect(marginLeft + col1Width, currentY + 2 * boxHeight, col2Width + col3Width - col1Width, boxHeight);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('No.of Pack  :', marginLeft + col1Width + 1, currentY + 2 * boxHeight + 3);
    doc.setFontSize(8);
    doc.text(String(poData.noOfPacks || '1'), marginLeft + col1Width + 1, currentY + 2 * boxHeight + 6);

    currentY += billingHeight + 3;

    // ========== ITEMS TABLE ==========
    const tableHead = [
      ['S.NO', 'ITEM CODE', 'PRODUCT', 'HSN', 'GST%', 'Nos', 'UOM', 'QTY', 'RATE', 'DISC%', 'AMOUNT']
    ];

    const tableBody = poData.items?.map((item, index) => [
      index + 1,
      item.itemCode || item.material?.code || 'PM0002',
      item.material?.name || 'Product Name',
      item.hsn || '44191010',
      item.gstPercent ? `${item.gstPercent}%` : '5 %',
      'Nos',
      item.uom || '6.00',
      item.quantity || '3.80',
      formatCurrency(item.rate) || '0.00',
      item.discountPercent || '',
      formatCurrency(item.lineTotal) || '0.00'
    ]) || [
      [1, 'PM0002', 'Aaradhana Printing Benific Grey Pack - 350gms', '44191010', '5 %', 'Nos', '6.00', '3.80', '1,90,000.00', '', '1,90,000.00'],
      [2, 'PM0070', 'Gururamani Printing Benific Grey Pack - 350gms', '44191010', '5 %', 'Nos', '6.00', '3.80', '1,90,000.00', '', '1,90,000.00']
    ];

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: currentY,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineColor: [150, 150, 150],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 45, halign: 'left' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 10, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 12, halign: 'right' },
        8: { cellWidth: 15, halign: 'right' },
        9: { cellWidth: 12, halign: 'center' },
        10: { cellWidth: 20, halign: 'right' }
      },
      didDrawPage: function(data) {
        currentY = data.cursor.y;
      }
    });

    currentY += 2;

    // ========== HSN/SAC TABLE & TOTALS ==========
    const hsnTableHead = [['HSN/SAC', 'Taxable\nValue', 'CGST\nRate', 'CGST\nAmount', 'SGST\nRate', 'SGST\nAmount']];
    
    const taxableAmount = poData.taxableAmount || 380000.00;
    const cgstAmount = poData.totalCGST || 9500.00;
    const sgstAmount = poData.totalSGST || 9500.00;
    
    const hsnTableBody = [[
      '70180090',
      formatCurrency(taxableAmount),
      '2.50 %',
      formatCurrency(cgstAmount),
      '2.50 %',
      formatCurrency(sgstAmount)
    ]];

    autoTable(doc, {
      head: hsnTableHead,
      body: hsnTableBody,
      startY: currentY,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
        lineColor: [150, 150, 150],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });

    currentY += 12;

    // Total row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Total', marginLeft + 25, currentY, { align: 'center' });
    doc.text(formatCurrency(taxableAmount), marginLeft + 60, currentY, { align: 'right' });
    doc.text(formatCurrency(cgstAmount), marginLeft + 105, currentY, { align: 'right' });
    doc.text(formatCurrency(sgstAmount), marginLeft + 150, currentY, { align: 'right' });

    currentY += 5;

    // Grand Total
    const grandTotal = poData.totalAmount || 399000.00;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Grand Total', marginLeft + 130, currentY);
    doc.text(`₹ ${formatCurrency(grandTotal)}`, pageWidth - marginRight - 2, currentY, { align: 'right' });

    currentY += 2;
    doc.setLineWidth(0.3);
    doc.line(marginLeft + 125, currentY, pageWidth - marginRight, currentY);

    currentY += 5;

    // Amount in words
    const numberToWords = (num) => {
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      
      const num_to_words = (n) => {
        if (n === 0) return '';
        else if (n < 20) return a[n];
        else if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        else if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + num_to_words(n % 100) : '');
        else if (n < 100000) return num_to_words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + num_to_words(n % 1000) : '');
        else if (n < 10000000) return num_to_words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + num_to_words(n % 100000) : '');
        else return num_to_words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + num_to_words(n % 10000000) : '');
      };
      
      return num_to_words(Math.floor(num)) + ' Only';
    };

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(`Amount Chargeable(in words) :  INR Three Lakh Ninety Nine Thousand Only`, marginLeft, currentY);

    currentY += 5;

    // ========== BANK DETAILS ==========
    doc.setLineWidth(0.2);
    doc.rect(marginLeft, currentY, contentWidth, 18);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BANK DETAILS :-', marginLeft + 1, currentY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let bankY = currentY + 6.5;
    doc.text('Bank Name         :  KARUR VYSYA BANK', marginLeft + 1, bankY);
    bankY += 3.5;
    doc.text('A/c. Name         :  DELTA S TRADE LINK', marginLeft + 1, bankY);
    bankY += 3.5;
    doc.text('A/c. No.          :  1128115000011983', marginLeft + 1, bankY);
    bankY += 3.5;
    doc.text('Branch & IFSC     :  DINDIGUL MAIN & KVBL0001128', marginLeft + 1, bankY);

    // "For DELTA S TRADE LINK" on right side of bank details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('For DELTA S TRADE LINK', pageWidth - marginRight - 2, currentY + 3, { align: 'right' });

    currentY += 20;

    // ========== TERMS & CONDITIONS ==========
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TERMS & CONDITIONS', marginLeft, currentY);

    currentY += 5;

    // ========== FOOTER ==========
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Customer Signature', marginLeft + 30, currentY, { align: 'center' });
    doc.text('Authorised Signatory', pageWidth - marginRight - 30, currentY, { align: 'center' });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `DELTA_PO_${String(poData.poNumber || 'DRAFT')}_${dateStr}.pdf`;

    if (type === 'download') {
      doc.save(filename);
    } else {
      window.open(doc.output('bloburl'), '_blank');
    }

    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};
