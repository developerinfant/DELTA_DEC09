import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaPlus, FaList, FaSave, FaFilePdf } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ProductDC = () => {
    const [activeTab, setActiveTab] = useState('new'); // 'new' or 'list'
    const [finishedGoods, setFinishedGoods] = useState([]);
    const [productDCs, setProductDCs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state for new invoice
    const [formData, setFormData] = useState({
        customerName: '',
        customerAddress: '',
        customerGST: '',
        contactNo: '',
        transport: '',
        vehicleNo: '',
        destination: '',
        paymentTerms: '',
        remarks: ''
    });
    
    const [items, setItems] = useState([
        { productCode: '', productName: '', qtyAvailable: 0, qty: '', rate: '', discount: 0, gst: 0, amount: 0 }
    ]);
    
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchFinishedGoods();
        fetchProductDCs();
    }, []);

    const fetchFinishedGoods = async () => {
        try {
            const { data } = await api.get('/products/finished-goods');
            setFinishedGoods(data.filter(fg => fg.status === 'Available' && fg.quantityAvailable > 0));
        } catch (err) {
            setError('Failed to fetch finished goods');
        }
    };

    const fetchProductDCs = async () => {
        try {
            const { data } = await api.get('/products/dc/list');
            setProductDCs(data);
        } catch (err) {
            setError('Failed to fetch invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...items];
        
        if (field === 'productCode') {
            // Find the selected product
            const selectedProduct = finishedGoods.find(fg => fg.productCode === value);
            if (selectedProduct) {
                updatedItems[index] = {
                    ...updatedItems[index],
                    productCode: value,
                    productName: selectedProduct.productName,
                    qtyAvailable: selectedProduct.quantityAvailable,
                    rate: selectedProduct.perUnitPrice || 0,
                    gst: selectedProduct.gst || 0
                };
            }
        } else {
            updatedItems[index][field] = value;
        }
        
        // Recalculate amount if qty or rate or discount or gst changes
        if (['qty', 'rate', 'discount', 'gst'].includes(field)) {
            const item = updatedItems[index];
            const qty = Number(item.qty) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const gst = Number(item.gst) || 0;
            
            const discountAmount = (rate * qty * discount) / 100;
            const taxableAmount = (rate * qty) - discountAmount;
            const gstAmount = (taxableAmount * gst) / 100;
            const amount = taxableAmount + gstAmount;
            
            updatedItems[index].amount = amount;
        }
        
        setItems(updatedItems);
    };

    const addItemRow = () => {
        setItems([
            ...items,
            { productCode: '', productName: '', qtyAvailable: 0, qty: '', rate: '', discount: 0, gst: 0, amount: 0 }
        ]);
    };

    const removeItemRow = (index) => {
        if (items.length > 1) {
            const updatedItems = [...items];
            updatedItems.splice(index, 1);
            setItems(updatedItems);
        }
    };

    const calculateTotals = () => {
        let totalTaxable = 0;
        let totalGST = 0;
        let grandTotal = 0;
        
        items.forEach(item => {
            const qty = Number(item.qty) || 0;
            const rate = Number(item.rate) || 0;
            const discount = Number(item.discount) || 0;
            const gst = Number(item.gst) || 0;
            
            const discountAmount = (rate * qty * discount) / 100;
            const taxableAmount = (rate * qty) - discountAmount;
            const gstAmount = (taxableAmount * gst) / 100;
            const amount = taxableAmount + gstAmount;
            
            totalTaxable += taxableAmount;
            totalGST += gstAmount;
            grandTotal += amount;
        });
        
        return { totalTaxable, totalGST, grandTotal };
    };

    const handleSaveInvoice = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setError('');
        
        try {
            // Validate items
            const validItems = items.filter(item => item.productCode && Number(item.qty) > 0);
            if (validItems.length === 0) {
                throw new Error('Please add at least one product to the invoice');
            }
            
            // Check if any item has insufficient quantity
            for (const item of validItems) {
                if (Number(item.qty) > item.qtyAvailable) {
                    throw new Error(`Insufficient quantity for ${item.productName}. Available: ${item.qtyAvailable}`);
                }
            }
            
            const { totalTaxable, totalGST, grandTotal } = calculateTotals();
            
            const invoiceData = {
                ...formData,
                items: validItems,
                totalTaxable,
                totalGST,
                grandTotal,
                generatedBy: 'Admin' // In a real app, this would come from the logged-in user
            };
            
            await api.post('/products/dc/create', invoiceData);
            
            // Reset form
            setFormData({
                customerName: '',
                customerAddress: '',
                customerGST: '',
                contactNo: '',
                transport: '',
                vehicleNo: '',
                destination: '',
                paymentTerms: '',
                remarks: ''
            });
            
            setItems([
                { productCode: '', productName: '', qtyAvailable: 0, qty: '', rate: '', discount: 0, gst: 0, amount: 0 }
            ]);
            
            // Refresh invoices list
            fetchProductDCs();
            
            alert('Invoice created successfully!');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to create invoice');
        } finally {
            setIsSaving(false);
        }
    };

    // Helper function to convert number to words
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

    // Helper functions for PDF generation
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

    const handleGeneratePDF = async (invoiceId) => {
        try {
            // Fetch the product DC data
            const response = await api.get(`/products/dc/${invoiceId}`);
            const productDC = response.data;
            
            // Create PDF
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

            // GSTIN and DELTA INVOICE on same line
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('GSTIN : 33BFDPS0871J1ZC', marginLeft + 2, currentY + 3);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('DELTA INVOICE', pageWidth / 2, currentY + 3, { align: 'center' });

            currentY += 5;

            // Company name and details
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('DELTA S TRADE LINK', pageWidth / 2, currentY + 5, { align: 'center' });

            doc.setFont('helvetica', 'italic');
            doc.setFontSize(9);
            doc.text("India's No 1  Pooja Products Manufacturer", pageWidth / 2, currentY + 10, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text('NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),', pageWidth / 2, currentY + 14, { align: 'center' });
            doc.text('NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA', pageWidth / 2, currentY + 17, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text('E-Mail : deltastradelink@gmail.com', pageWidth / 2, currentY + 20, { align: 'center' });

            currentY += 24;

            // ========== INFO GRID SECTION ==========
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
            doc.text(productDC.customerName, marginLeft + 1, shippedY);
            shippedY += 3.5;
            
            // Split address into lines
            const addrLines = doc.splitTextToSize(productDC.customerAddress, col1Width + col2Width - 2);
            addrLines.forEach(line => {
                doc.text(line, marginLeft + 1, shippedY);
                shippedY += 3.5;
            });

            // Vehicle No.
            doc.rect(marginLeft + col1Width + col2Width, boxY, col3Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Vehicle No. :', marginLeft + col1Width + col2Width + 1, boxY + 3);
            doc.setFontSize(8);
            doc.text(productDC.vehicleNo || '', marginLeft + col1Width + col2Width + 1, boxY + 6);

            boxY += boxHeight;

            // Row 2: Invoice No.
            doc.rect(marginLeft, boxY, col1Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Invoice No.  :', marginLeft + 1, boxY + 3);
            doc.setFontSize(8);
            doc.text(productDC.invoiceNo, marginLeft + 1, boxY + 6);

            doc.rect(marginLeft + col1Width, boxY, col2Width + col3Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Date  :', marginLeft + col1Width + 1, boxY + 3);
            doc.setFontSize(8);
            doc.text(formatDate(productDC.invoiceDate) || '', marginLeft + col1Width + 1, boxY + 6);

            boxY += boxHeight;

            // Row 3: GSTIN | Disp.From
            doc.rect(marginLeft, boxY, col1Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('GSTIN  :', marginLeft + 1, boxY + 3);
            doc.setFontSize(8);
            doc.text(productDC.customerGST || '33BFDPS0871J1ZC', marginLeft + 1, boxY + 6);

            doc.rect(marginLeft + col1Width, boxY, col2Width + col3Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Disp.From  :', marginLeft + col1Width + 1, boxY + 3);
            doc.setFontSize(8);
            doc.text('Main', marginLeft + col1Width + 1, boxY + 6);

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
            doc.text('DELTA S TRADE LINK', marginLeft + 1, billingY);
            billingY += 3.5;
            doc.text('NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),', marginLeft + 1, billingY);
            billingY += 3.5;
            doc.text('NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA', marginLeft + 1, billingY);
            billingY += 3.5;
            doc.text('E-Mail : deltastradelink@gmail.com', marginLeft + 1, billingY);

            // Right side boxes (next to Billing From)
            const rightBoxWidth = (col2Width + col3Width) / 3;
            
            // Terms of Payment
            doc.rect(marginLeft + col1Width, currentY, rightBoxWidth, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Terms of Payment :', marginLeft + col1Width + 1, currentY + 3);
            doc.setFontSize(8);
            doc.text(productDC.paymentTerms || '', marginLeft + col1Width + 1, currentY + 6);

            // Destination
            doc.rect(marginLeft + col1Width + rightBoxWidth, currentY, rightBoxWidth, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Destination :', marginLeft + col1Width + rightBoxWidth + 1, currentY + 3);
            doc.setFontSize(8);
            doc.text(productDC.destination || '', marginLeft + col1Width + rightBoxWidth + 1, currentY + 6);

            // P.O No & Date
            doc.rect(marginLeft + col1Width + 2 * rightBoxWidth, currentY, rightBoxWidth, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('P.O No & Date :', marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + 3);
            doc.setFontSize(8);
            doc.text(productDC.invoiceNo, marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + 6);

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
            doc.text('<None>', marginLeft + col1Width + rightBoxWidth + 1, currentY + boxHeight + 6);

            // Transport
            doc.rect(marginLeft + col1Width + 2 * rightBoxWidth, currentY + boxHeight, rightBoxWidth, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('Transport :', marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + boxHeight + 3);
            doc.setFontSize(8);
            doc.text(productDC.transport || '', marginLeft + col1Width + 2 * rightBoxWidth + 1, currentY + boxHeight + 6);

            // No.of Pack
            doc.rect(marginLeft + col1Width, currentY + 2 * boxHeight, col2Width + col3Width - col1Width, boxHeight);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text('No.of Pack  :', marginLeft + col1Width + 1, currentY + 2 * boxHeight + 3);
            doc.setFontSize(8);
            doc.text('1', marginLeft + col1Width + 1, currentY + 2 * boxHeight + 6);

            currentY += billingHeight + 3;

            // ========== ITEMS TABLE ==========
            const tableHead = [
                ['S.N', 'ITEM CODE', 'PRODUCT', 'RATE', 'QTY', 'DISC%', 'GST%', 'AMOUNT']
            ];

            const tableBody = productDC.items.map((item, index) => [
                index + 1,
                item.productCode,
                item.productName,
                formatCurrency(item.rate),
                item.qty,
                item.discount || '0',
                item.gst || '0',
                formatCurrency(item.amount)
            ]);

            // Generate the items table using the autoTable method
            let currentYAfterItemsTable;
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
                    1: { cellWidth: 25, halign: 'center' },
                    2: { cellWidth: 45, halign: 'left' },
                    3: { cellWidth: 15, halign: 'right' },
                    4: { cellWidth: 12, halign: 'center' },
                    5: { cellWidth: 12, halign: 'center' },
                    6: { cellWidth: 12, halign: 'center' },
                    7: { cellWidth: 20, halign: 'right' }
                },
                didDrawPage: function(data) {
                    currentYAfterItemsTable = data.cursor.y;
                }
            });

            currentY = currentYAfterItemsTable + 2;

            // ========== HSN/SAC TABLE & TOTALS ==========
            const hsnTableHead = [['HSN/SAC', 'Taxable\nValue', 'CGST\nRate', 'CGST\nAmount', 'SGST\nRate', 'SGST\nAmount']];
            
            const taxableAmount = productDC.totalTaxable;
            const cgstAmount = productDC.totalGST / 2;
            const sgstAmount = productDC.totalGST / 2;
            
            const hsnTableBody = [[
                '70180090',
                formatCurrency(taxableAmount),
                '2.50 %',
                formatCurrency(cgstAmount),
                '2.50 %',
                formatCurrency(sgstAmount)
            ]];

            // Generate the HSN/SAC table using the autoTable method
            let currentYAfterHSNTable;
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
                },
                didDrawPage: function(data) {
                    currentYAfterHSNTable = data.cursor.y;
                }
            });

            currentY = currentYAfterHSNTable + 2;

            // Total row
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.text('Total', marginLeft + 25, currentY, { align: 'center' });
            doc.text(formatCurrency(taxableAmount), marginLeft + 60, currentY, { align: 'right' });
            doc.text(formatCurrency(cgstAmount), marginLeft + 105, currentY, { align: 'right' });
            doc.text(formatCurrency(sgstAmount), marginLeft + 150, currentY, { align: 'right' });

            currentY += 5;

            // Grand Total
            const grandTotal = productDC.grandTotal;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text('Grand Total', marginLeft + 130, currentY);
            doc.text(`₹ ${formatCurrency(grandTotal)}`, pageWidth - marginRight - 2, currentY, { align: 'right' });

            currentY += 2;
            doc.setLineWidth(0.3);
            doc.line(marginLeft + 125, currentY, pageWidth - marginRight, currentY);

            currentY += 5;

            // Amount in words
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(`Amount Chargeable(in words) :  INR ${numberToWords(grandTotal)}`, marginLeft, currentY);

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

            // Save PDF
            doc.save(`INV_${productDC.invoiceNo}.pdf`);
        } catch (err) {
            console.error('PDF Generation Error:', err);
            setError('Failed to generate PDF: ' + err.message);
        }
    };

    const { totalTaxable, totalGST, grandTotal } = calculateTotals();

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-primary-500" size={48} />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-dark-700">Product Dispatch / Delivery (Product DC)</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setActiveTab('new')}
                            className={`flex items-center px-4 py-2 rounded-lg ${activeTab === 'new' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            <FaPlus className="mr-2" /> New Invoice
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex items-center px-4 py-2 rounded-lg ${activeTab === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            <FaList className="mr-2" /> View All Invoices
                        </button>
                    </div>
                </div>
                
                {activeTab === 'new' ? (
                    <form onSubmit={handleSaveInvoice} className="space-y-6">
                        {error && <div className="p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                        
                        {/* Customer Details Section */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-dark-700 mb-4">Customer Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Customer Name *</label>
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Address *</label>
                                    <textarea
                                        name="customerAddress"
                                        value={formData.customerAddress}
                                        onChange={handleFormChange}
                                        rows="2"
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">GSTIN</label>
                                    <input
                                        type="text"
                                        name="customerGST"
                                        value={formData.customerGST}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Contact No.</label>
                                    <input
                                        type="text"
                                        name="contactNo"
                                        value={formData.contactNo}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Transport & Invoice Info */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-dark-700 mb-4">Transport & Invoice Info</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Invoice Date</label>
                                    <input
                                        type="date"
                                        value={new Date().toISOString().split('T')[0]}
                                        readOnly
                                        className="w-full px-3 py-2 text-dark-700 bg-gray-100 border border-gray-300 rounded-md"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Transport Name</label>
                                    <input
                                        type="text"
                                        name="transport"
                                        value={formData.transport}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Vehicle No.</label>
                                    <input
                                        type="text"
                                        name="vehicleNo"
                                        value={formData.vehicleNo}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Destination</label>
                                    <input
                                        type="text"
                                        name="destination"
                                        value={formData.destination}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Terms of Payment</label>
                                    <select
                                        name="paymentTerms"
                                        value={formData.paymentTerms}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="">Select Terms</option>
                                        <option value="Advance">Advance</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>
                                
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-sm font-medium text-dark-700 mb-1">Remarks</label>
                                    <input
                                        type="text"
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleFormChange}
                                        className="w-full px-3 py-2 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        {/* Product Selection Table */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-dark-700">Product Selection</h3>
                                <button
                                    type="button"
                                    onClick={addItemRow}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Add Row
                                </button>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Select Product</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FG Code</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty Available</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty to Send</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2">
                                                    <select
                                                        value={item.productCode}
                                                        onChange={(e) => handleItemChange(index, 'productCode', e.target.value)}
                                                        className="w-full px-2 py-1 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    >
                                                        <option value="">Select Product</option>
                                                        {finishedGoods.map(fg => (
                                                            <option key={fg._id} value={fg.productCode}>
                                                                {fg.productName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2 text-sm">{item.productCode}</td>
                                                <td className="px-4 py-2 text-sm">{item.qtyAvailable}</td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        min="1"
                                                        max={item.qtyAvailable}
                                                        className="w-20 px-2 py-1 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.rate}
                                                        onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-20 px-2 py-1 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.discount}
                                                        onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                                                        step="0.01"
                                                        min="0"
                                                        max="100"
                                                        className="w-20 px-2 py-1 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.gst}
                                                        onChange={(e) => handleItemChange(index, 'gst', e.target.value)}
                                                        step="0.01"
                                                        min="0"
                                                        className="w-20 px-2 py-1 text-dark-700 bg-light-200 border border-transparent rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-sm">₹{item.amount.toFixed(2)}</td>
                                                <td className="px-4 py-2">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItemRow(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Invoice Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-dark-700 mb-4">Invoice Summary</h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white p-3 rounded-md">
                                    <div className="text-sm text-gray-500">Taxable Value</div>
                                    <div className="text-lg font-semibold">₹{totalTaxable.toFixed(2)}</div>
                                </div>
                                <div className="bg-white p-3 rounded-md">
                                    <div className="text-sm text-gray-500">CGST (2.5%)</div>
                                    <div className="text-lg font-semibold">₹{(totalGST / 2).toFixed(2)}</div>
                                </div>
                                <div className="bg-white p-3 rounded-md">
                                    <div className="text-sm text-gray-500">SGST (2.5%)</div>
                                    <div className="text-lg font-semibold">₹{(totalGST / 2).toFixed(2)}</div>
                                </div>
                                <div className="bg-white p-3 rounded-md">
                                    <div className="text-sm text-gray-500">Grand Total</div>
                                    <div className="text-lg font-semibold text-blue-600">₹{grandTotal.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Bank Details */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-dark-700 mb-4">Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="text-sm">
                                    <div className="font-medium">Bank Name:</div>
                                    <div>KARUR VYSYA BANK</div>
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium">A/c No:</div>
                                    <div>1128115000011983</div>
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium">IFSC:</div>
                                    <div>KVBL0001128</div>
                                </div>
                                <div className="text-sm">
                                    <div className="font-medium">Branch:</div>
                                    <div>Dindigul Main</div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({
                                        customerName: '',
                                        customerAddress: '',
                                        customerGST: '',
                                        contactNo: '',
                                        transport: '',
                                        vehicleNo: '',
                                        destination: '',
                                        paymentTerms: '',
                                        remarks: ''
                                    });
                                    setItems([
                                        { productCode: '', productName: '', qtyAvailable: 0, qty: '', rate: '', discount: 0, gst: 0, amount: 0 }
                                    ]);
                                }}
                                className="px-6 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                            >
                                Reset
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="flex items-center px-6 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:opacity-50"
                            >
                                <FaSave className="mr-2" />
                                {isSaving ? 'Saving...' : 'Save Invoice'}
                            </button>
                        </div>
                    </form>
                ) : (
                    // List of invoices
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No.</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {productDCs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                            No invoices found.
                                        </td>
                                    </tr>
                                ) : (
                                    productDCs.map(dc => (
                                        <tr key={dc._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{dc.invoiceNo}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(dc.invoiceDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{dc.customerName}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">{dc.items.length} items</td>
                                            <td className="px-6 py-4 text-sm text-gray-500">₹{dc.grandTotal.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm text-right">
                                                <button
                                                    onClick={() => handleGeneratePDF(dc._id)}
                                                    className="flex items-center px-3 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                                                >
                                                    <FaFilePdf className="mr-1" /> PDF
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ProductDC;