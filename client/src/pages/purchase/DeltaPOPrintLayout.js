import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../api';
import logoPO from '../../assets/logo-po.png';
import { FaEye } from 'react-icons/fa';

// === PDF GENERATION IMPORTS ===
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// === FIX FOR VFS FONT IMPORT ERROR ===
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
}

// === DEFAULT SETTINGS CONSTANT ===
const DEFAULT_SETTINGS = {
    companyName: 'DELTA S TRADE LINK',
    companyAddress: 'NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST), NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA',
    companyEmail: 'deltastradelink@gmail.com',
    companyGstin: '33BFDPS0871J1ZC',
    bankName: 'KARUR VYSYA BANK',
    accountName: 'DELTA S TRADE LINK',
    accountNumber: '1128115000011983',
    branchIfsc: 'DINDIGUL MAIN & KVBL0001128'
};

const useLocationSafe = () => {
  try {
    return useLocation();
  } catch (e) {
    return null;
  }
};

// --- HELPER: CONVERT IMAGE TO BASE64 ---
const getBase64ImageFromURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = error => {
            console.warn('Could not load logo for PDF', error);
            resolve(null);
        };
        img.src = url;
    });
};

// --- HELPER: NUMBER TO WORDS ---
const numberToWords = (num) => {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const num_to_words = (n) => {
        if (n === 0) return 'Zero';
        else if (n < 20) return a[n];
        else if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        else if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + num_to_words(n % 100) : '');
        else if (n < 100000) return num_to_words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + num_to_words(n % 1000) : '');
        else if (n < 10000000) return num_to_words(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + num_to_words(n % 100000) : '');
        else return num_to_words(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + num_to_words(n % 10000000) : '');
    };
    
    return num_to_words(Math.floor(num)) + ' Only';
};

// --- HELPER: FORMAT DATE ---
const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

// --- HELPER: FORMAT CURRENCY ---
const formatCurrency = (amount) => {
    if (!amount) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- HELPER: AGGREGATE GST DATA ---
// Groups items by HSN and GST Rate to create a consolidated summary
const getConsolidatedGstData = (items) => {
    const summaryMap = new Map();

    items.forEach(item => {
        const hsn = item.hsn || '48191010';
        const rate = parseFloat(item.gstPercent) || 5;
        const taxable = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
        
        // Key to group by
        const key = `${hsn}-${rate}`;

        if (!summaryMap.has(key)) {
            summaryMap.set(key, {
                hsn: hsn,
                gstRate: rate,
                taxableValue: 0,
                cgstAmount: 0,
                sgstAmount: 0
            });
        }

        const entry = summaryMap.get(key);
        entry.taxableValue += taxable;
        // Calculate tax based on total taxable to avoid rounding errors per item
        entry.cgstAmount = (entry.taxableValue * (rate / 2)) / 100;
        entry.sgstAmount = (entry.taxableValue * (rate / 2)) / 100;
    });

    return Array.from(summaryMap.values());
};

// --- CORE PDF DEFINITION GENERATOR ---
const createOrderPdfDefinition = (purchaseOrder, settings, logoBase64) => {
    const supplier = purchaseOrder.supplier || {};
    
    // 1. Calculate Aggregated Data
    const consolidatedGstList = getConsolidatedGstData(purchaseOrder.items);
    
    // Calculate Grand Totals
    const totalTaxableValue = consolidatedGstList.reduce((acc, item) => acc + item.taxableValue, 0);
    const totalCgstAmount = consolidatedGstList.reduce((acc, item) => acc + item.cgstAmount, 0);
    const totalSgstAmount = consolidatedGstList.reduce((acc, item) => acc + item.sgstAmount, 0);
    const grandTotal = totalTaxableValue + totalCgstAmount + totalSgstAmount;
    
    const totalQty = purchaseOrder.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);

    // === PDF BORDER STYLES ===
    const BORDER_COLOR = '#000000';
    const LINE_WIDTH = 1;

    // Standard Grid Layout
    const tableLayout = {
        hLineWidth: () => LINE_WIDTH,
        vLineWidth: () => LINE_WIDTH,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2,
    };

    // Layout that removes internal vertical lines (For Header Sections)
    const noInternalVerticalsLayout = {
        hLineWidth: () => LINE_WIDTH,
        vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length) ? LINE_WIDTH : 0,
        hLineColor: () => BORDER_COLOR,
        vLineColor: () => BORDER_COLOR,
        paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2,
    };

    const noBorderTableLayout = {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 1, paddingBottom: () => 1,
    };

    // Column Widths
    const productTableWidths = ['5%', '13%', '*', '10%', '6%', '6%', '9%', '9%', '5%', '13%'];

    // --- Construct Product Table Body ---
    const productBody = [
        [
            { text: 'S.N', style: 'thCenter' },
            { text: 'ITEM CODE', style: 'thCenter' },
            { text: 'PRODUCT', style: 'thCenter' },
            { text: 'HSN', style: 'thCenter' },
            { text: 'GST%', style: 'thCenter' },
            { text: 'UOM', style: 'thCenter' },
            { text: 'QTY', style: 'thCenter' },
            { text: 'RATE', style: 'thCenter' },
            { text: 'DISC%', style: 'thCenter' },
            { text: 'AMOUNT', style: 'thRight' }
        ]
    ];

    purchaseOrder.items.forEach((item, index) => {
        const productName = item.material?.name || item.productName || item.name || item.description || '';
        const hasData = item.itemCode || productName || item.hsn || item.quantity || item.rate;
        if(hasData) {
            productBody.push([
                { text: index + 1, style: 'tdCenter' },
                { text: item.itemCode || item.material?.code || '', style: 'tdCenter' },
                { text: productName, style: 'tdCenter' }, 
                { text: item.hsn || '48191010', style: 'tdCenter' },
                { text: `${item.gstPercent || 5}%`, style: 'tdCenter' },
                { text: 'Nos', style: 'tdCenter' },
                { text: formatCurrency(item.quantity || 0), style: 'tdCenter' },
                { text: item.rate ? formatCurrency(item.rate) : '3.80', style: 'tdCenter' },
                { text: item.discountPercent || '', style: 'tdCenter' },
                { text: formatCurrency((item.quantity * item.rate) || 0), style: 'tdRight' }
            ]);
        }
    });

    // Fill Empty Rows
    const rowsToFill = Math.max(10 - purchaseOrder.items.length, 0);
    const emptyCellStyle = { text: ' ', style: 'tdEmpty', border: [true, false, true, false] };

    for (let i = 0; i < rowsToFill; i++) {
        productBody.push([
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle
        ]);
    }

    // Product Total Row
    productBody.push([
        { text: '', colSpan: 6, border: [true, true, true, true] }, {}, {}, {}, {}, {},
        { text: formatCurrency(totalQty), style: 'thCenter', border: [true, true, true, true] },
        { text: '', colSpan: 2, border: [true, true, true, true] }, {},
        { text: formatCurrency(totalTaxableValue), style: 'thRight', border: [true, true, true, true] }
    ]);

    // --- Construct HSN Summary Body (Consolidated) ---
    const hsnBody = [
        [
            { text: 'HSN/SAC', rowSpan: 2, style: 'thCenter' },
            { text: 'Taxable Value', rowSpan: 2, style: 'thCenter' },
            { text: 'CGST', colSpan: 2, style: 'thCenter' }, {},
            { text: 'SGST/UTGST', colSpan: 2, style: 'thCenter' }, {},
            { text: '', rowSpan: 2, style: 'thCenter' },
            { text: '', rowSpan: 2, style: 'thCenter' }
        ],
        [
            {}, {}, 
            { text: 'Rate', style: 'thCenter' }, { text: 'Amount', style: 'thCenter' },
            { text: 'Rate', style: 'thCenter' }, { text: 'Amount', style: 'thCenter' },
            {}, {}
        ]
    ];

    // Build the Right Side Text (Input Tax)
    // We assume the first entry's rate for the label, or generic text if mixed.
    const firstRate = consolidatedGstList.length > 0 ? consolidatedGstList[0].gstRate : 5;
    const inputTaxText = consolidatedGstList.length > 0 
        ? `Input-CGST-${firstRate/2}%\nInput-SGST-${firstRate/2}%` 
        : '';
    const taxTotalsText = consolidatedGstList.length > 0 
        ? `${formatCurrency(totalCgstAmount)}\n${formatCurrency(totalSgstAmount)}` 
        : '';

    consolidatedGstList.forEach((item, idx) => {
        const row = [
            { text: item.hsn, style: 'tdCenter' },
            { text: formatCurrency(item.taxableValue), style: 'tdRight' },
            { text: `${item.gstRate/2} %`, style: 'tdCenter' },
            { text: formatCurrency(item.cgstAmount), style: 'tdRight' },
            { text: `${item.gstRate/2} %`, style: 'tdCenter' },
            { text: formatCurrency(item.sgstAmount), style: 'tdRight' }
        ];

        // Add the spanning columns only on the first row
        if (idx === 0) {
            row.push({ text: inputTaxText, rowSpan: consolidatedGstList.length, style: 'tdLeft' });
            row.push({ text: taxTotalsText, rowSpan: consolidatedGstList.length, style: 'tdRight' });
        } else {
            row.push({});
            row.push({});
        }
        hsnBody.push(row);
    });

    // Total Row
    hsnBody.push([
        { text: 'Total', style: 'thCenter' },
        { text: formatCurrency(totalTaxableValue), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(totalCgstAmount), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(totalSgstAmount), style: 'thRight' },
        { text: '', colSpan: 2, style: 'tdCenter' }, {}
    ]);

    // Grand Total
    hsnBody.push([
        { text: 'Grand Total', colSpan: 6, style: 'grandTotalLabel' }, {}, {}, {}, {}, {},
        { text: `₹ ${formatCurrency(grandTotal)}`, colSpan: 2, style: 'grandTotalValue' }, {}
    ]);

    return {
        pageSize: 'A4',
        pageMargins: [28, 28, 28, 28],
        content: [
            { text: 'SUBJECT TO JURISDICTION', style: 'topHeader', decoration: 'underline' },
            {
                style: 'tableExample',
                table: {
                    widths: ['35%', '65%'],
                    body: [
                        [
                            { text: [{ text: 'GSTIN : ', bold: true }, { text: purchaseOrder.companyGstin || settings.companyGstin }], style: 'stdCell' },
                            { text: 'PURCHASE ORDER', style: 'titleCell' }
                        ]
                    ]
                },
                layout: noInternalVerticalsLayout // FIX 1: Removed vertical separator
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0], // Merge border
                table: {
                    widths: ['30%', '70%'],
                    body: [
                        [
                            {
                                stack: [
                                    logoBase64 ? { image: logoBase64, width: 100, alignment: 'center' } : {},
                                    { text: "DELTA'S TRADE LINK", bold: true, fontSize: 9, margin: [0, 5, 0, 0], alignment: 'center' }
                                ],
                                alignment: 'center',
                                border: [true, false, true, true]
                            },
                            {
                                stack: [
                                    { text: 'DELTA S TRADE LINK', style: 'companyName' },
                                    { text: "India's No 1 Pooja Products Manufacturer", style: 'tagline' },
                                    { text: `NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),\nNATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.`, style: 'address' },
                                    { text: `E-Mail : ${settings.companyEmail}`, style: 'email' }
                                ],
                                alignment: 'center',
                                margin: [0, 5, 0, 5],
                                border: [false, false, true, true]
                            }
                        ]
                    ]
                },
                layout: tableLayout
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['33.33%', '33.33%', '33.34%'],
                    body: [
                        [
                            { text: `E-Way Bill No. : ${purchaseOrder.eWayBillNo || ''}`, style: 'stdCell' },
                            { text: `E-Way Bill Date : ${purchaseOrder.eWayBillDate ? formatDate(purchaseOrder.eWayBillDate) : ''}`, style: 'stdCell' },
                            { text: `Vehicle No : ${purchaseOrder.vehicleNo || ''}`, style: 'stdCell' }
                        ]
                    ]
                },
                layout: noInternalVerticalsLayout // FIX 1: Removed vertical separator
            },
            // ... (Rest of the tables use standard layout)
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['33%', '33%', '34%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'Billing From', bold: true, margin: [0, 0, 0, 4] },
                                    { text: supplier.name, bold: true, fontSize: 8.5 },
                                    { text: supplier.address, fontSize: 8, margin: [0, 0, 0, 20] },
                                    { text: [{ text: 'Contact No. : ', bold: true }, { text: supplier.contact || '' }], fontSize: 8 },
                                    { text: [{ text: 'GSTIN : ', bold: true }, { text: purchaseOrder.supplierGSTIN || settings.companyGstin }], fontSize: 8, margin: [0, 2, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [true, false, true, true]
                            },
                            {
                                stack: [
                                    { text: 'Shipped To:', bold: true, margin: [0, 0, 0, 2] },
                                    { text: `Delta's Trade Link [${new Date(purchaseOrder.createdAt).getFullYear()}–${new Date(purchaseOrder.createdAt).getFullYear() + 1}]`, bold: true, fontSize: 8.5, margin: [0, 0, 0, 2] },
                                    { text: `NO: 4078, THOTTANUTHU ROAD,\nREDDIYAPATTI (POST), NATHAM ROAD,\nDINDIGUL-624003, TAMIL NADU, INDIA.\nE-Mail : ${settings.companyEmail}`, fontSize: 8, margin: [0, 0, 0, 5] },
                                    { text: [{ text: 'GSTIN          : ', bold: true }, { text: settings.companyGstin, bold: true }], fontSize: 8 }
                                ],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            },
                            {
                                table: {
                                    widths: ['40%', '60%'],
                                    body: [
                                        [{ text: 'Order No.', bold: true }, { text: `: ${purchaseOrder.poNumber}` }],
                                        [{ text: 'Date', bold: true }, { text: `: ${formatDate(purchaseOrder.createdAt)}` }],
                                        [{ text: 'Disp.From', bold: true }, { text: `: ${purchaseOrder.dispatchFrom || 'Main'}` }],
                                        [{ text: 'No.of Pack', bold: true }, { text: `: ${purchaseOrder.noOfPacks || ''}` }],
                                        [{ text: 'Transport', bold: true }, { text: `: ${purchaseOrder.transport || ''}` }]
                                    ]
                                },
                                layout: noBorderTableLayout,
                                style: 'stdCell',
                                border: [false, false, true, true]
                            }
                        ]
                    ]
                },
                layout: tableLayout
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['33%', '33%', '34%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: [{ text: 'Terms of Payment : ', bold: true }, { text: purchaseOrder.paymentTerms || '' }] },
                                    { text: [{ text: 'Destination : ', bold: true }, { text: purchaseOrder.destination || '' }], margin: [0, 10, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [true, false, true, true]
                            },
                            {
                                stack: [
                                    { text: [{ text: 'P.O No & Date : ', bold: true }, { text: `${purchaseOrder.poNumber} / ${formatDate(purchaseOrder.createdAt)}` }] },
                                    { text: [{ text: 'D.C No & Date : ', bold: true }, { text: purchaseOrder.dcNo || '' }], margin: [0, 10, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            },
                            {
                                text: [{ text: 'Salesman : ', bold: true }, { text: purchaseOrder.salesman || '<None>' }],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            }
                        ]
                    ]
                },
                layout: tableLayout
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    headerRows: 1,
                    widths: productTableWidths,
                    body: productBody
                },
                layout: tableLayout
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    headerRows: 2,
                    widths: ['15%', '16%', '8%', '15%', '8%', '15%', '13%', '10%'],
                    body: hsnBody
                },
                layout: tableLayout
            },
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['70%', '30%'],
                    body: [
                        [{
                            colSpan: 2,
                            border: [true, false, true, true],
                            stack: [
                                {
                                    columns: [
                                        { text: [{ text: 'Amount Chargeable (in words): ', fontSize: 9 }, { text: `INR ${numberToWords(grandTotal)}`, bold: true, fontSize: 9 }] },
                                        { text: 'E. & O.E', bold: true, alignment: 'right', fontSize: 9 }
                                    ]
                                }
                            ],
                            margin: [0, 2, 0, 2]
                        }, {}],
                        [
                            {
                                stack: [
                                    { text: 'BANK DETAILS :-', bold: true, fontSize: 9, decoration: 'underline', margin: [0, 5, 0, 2] },
                                    {
                                        table: {
                                            widths: ['auto', '*'],
                                            body: [
                                                [{ text: 'Bank Name', width: 80 }, { text: `: ${settings.bankName}` }],
                                                [{ text: 'A/c. Name', width: 80 }, { text: `: ${settings.accountName}` }],
                                                [{ text: 'A/c. No.', width: 80 }, { text: `: ${settings.accountNumber}` }],
                                                [{ text: 'Branch & IFSC', width: 80 }, { text: `: ${settings.branchIfsc}` }]
                                            ]
                                        },
                                        layout: noBorderTableLayout
                                    },
                                    { text: 'TERMS & CONDITIONS', bold: true, fontSize: 9, margin: [0, 10, 0, 0] },
                                    { text: '\n\n\n\nCustomer Signature', alignment: 'center', margin: [0, 10, 0, 0] }
                                ],
                                border: [true, true, true, true]
                            },
                            {
                                stack: [
                                    { text: `For ${settings.companyName}`, bold: true, alignment: 'center', margin: [0, 5, 0, 30] },
                                    { text: 'Authorised Signatory', alignment: 'center' }
                                ],
                                border: [false, true, true, true],
                                alignment: 'center',
                                valign: 'center'
                            }
                        ]
                    ]
                },
                layout: tableLayout
            }
        ],
        styles: {
            topHeader: { fontSize: 8, bold: true, alignment: 'center', margin: [0, 5, 0, 5], letterSpacing: 0.2 },
            stdCell: { fontSize: 8, color: '#000000' },
            titleCell: { fontSize: 8, bold: true, alignment: 'left', margin: [0, 2, 0, 2] },
            companyName: { fontSize: 25, bold: true, font: 'Roboto', alignment: 'center' },
            tagline: { fontSize: 12, bold: true, italics: true, alignment: 'center', margin: [0, 2, 0, 2] },
            address: { fontSize: 10, bold: true, alignment: 'center', lineHeight: 1.2 },
            email: { fontSize: 9, bold: true, alignment: 'center', margin: [0, 2, 0, 0] },
            thCenter: { fontSize: 9, bold: true, alignment: 'center', fillColor: '#ffffff' },
            thRight: { fontSize: 9, bold: true, alignment: 'right', fillColor: '#ffffff' },
            tdCenter: { fontSize: 9, alignment: 'center' },
            tdRight: { fontSize: 9, alignment: 'right' },
            tdLeft: { fontSize: 8.5, alignment: 'left' },
            tdEmpty: { fontSize: 9, height: 10 },
            grandTotalLabel: { fontSize: 10, bold: true, alignment: 'right' },
            grandTotalValue: { fontSize: 10, bold: true, alignment: 'right' }
        },
        defaultStyle: {
            font: 'Roboto',
            fontSize: 8,
            color: '#000000'
        }
    };
};

const DeltaPOPrintLayout = ({ poData, onDownloadComplete }) => {
    const { id } = useParams();
    const location = useLocationSafe();
    const isRouterContext = location !== null;
    
    const [purchaseOrder, setPurchaseOrder] = useState(poData || null);
    const [supplier, setSupplier] = useState(poData?.supplier || null);
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(!poData);
    const [error, setError] = useState('');
    const [autoDownloadTriggered, setAutoDownloadTriggered] = useState(false);
    const reportRef = useRef(null);

    // === UI BORDER CONSTANTS ===
    const BORDER_COLOR = '#000000';
    const BORDER_WIDTH = '1px';
    const THIN_BORDER = `${BORDER_WIDTH} solid ${BORDER_COLOR}`;

    const columnWidths = [
        '5%', '13%', '24%', '10%', '6%', '6%', '9%', '9%', '5%', '13%'
    ];

    useEffect(() => {
        if (poData) {
            setPurchaseOrder(poData);
            setSupplier(poData.supplier);
            setLoading(false);
            
            if (isRouterContext && location && location.search) {
                const queryParams = new URLSearchParams(location.search);
                if (queryParams.get('download') === 'true') {
                    setAutoDownloadTriggered(true);
                    setTimeout(() => {
                        downloadPDF();
                    }, 1000);
                }
            }
            return;
        }
        
        const fetchPOData = async () => {
            try {
                setLoading(true);
                const poResponse = await api.get(`/purchase-orders/${id}`);
                const data = poResponse.data;
                
                setPurchaseOrder(data);
                setSupplier(data.supplier);
                setLoading(false);
                
                if (isRouterContext && location && location.search) {
                    const queryParams = new URLSearchParams(location.search);
                    if (queryParams.get('download') === 'true') {
                        setAutoDownloadTriggered(true);
                        setTimeout(() => {
                            downloadPDF();
                        }, 1000);
                    }
                }
            } catch (err) {
                setError('Failed to load purchase order data');
                setLoading(false);
                console.error('Error fetching PO data:', err);
            }
        };

        if (id) {
            fetchPOData();
        }
    }, [id, poData, location, isRouterContext]);

    const downloadPDF = async () => {
        try {
            let logoBase64 = null;
            if (logoPO) {
                logoBase64 = await getBase64ImageFromURL(logoPO);
            }

            const docDefinition = createOrderPdfDefinition(purchaseOrder, settings, logoBase64);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `PurchaseOrder_${purchaseOrder.poNumber}_${timestamp}.pdf`;
            
            pdfMake.createPdf(docDefinition).download(filename);

            if (isRouterContext && location && location.search) {
                const queryParams = new URLSearchParams(location.search);
                if (queryParams.get('download') === 'true') {
                    setTimeout(() => {
                        window.close();
                    }, 2000);
                }
            }
            
            if (onDownloadComplete) {
                onDownloadComplete();
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen">Loading purchase order data...</div>;
    if (error) return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    if (!purchaseOrder || !supplier) return <div className="flex justify-center items-center h-screen">No purchase order data available</div>;

    if (autoDownloadTriggered) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-xl text-gray-700">Preparing your PDF download...</p>
                    <p className="mt-2 text-gray-500">The download will start automatically</p>
                </div>
            </div>
        );
    }

    const isInModal = !!poData;

    // === RE-CALCULATE AGGREGATED DATA FOR UI DISPLAY ===
    const consolidatedGstList = getConsolidatedGstData(purchaseOrder.items);
    const totalTaxableValue = consolidatedGstList.reduce((acc, item) => acc + item.taxableValue, 0);
    const totalCgstAmount = consolidatedGstList.reduce((acc, item) => acc + item.cgstAmount, 0);
    const totalSgstAmount = consolidatedGstList.reduce((acc, item) => acc + item.sgstAmount, 0);
    const grandTotal = totalTaxableValue + totalCgstAmount + totalSgstAmount;

    
    return (
        <div className={isInModal ? "" : "min-h-screen bg-gray-100 p-4"}>
            {!isInModal && (
                <div className="flex justify-end mb-4 no-print">
                    <button
                        onClick={downloadPDF}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                        title="Download PDF Report"
                    >
                        <FaEye className="mr-2" />
                        <span>Download PDF</span>
                    </button>
                </div>
            )}
            
            <style>{`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    * { margin: 0 !important; padding: 0 !important; box-shadow: none !important; outline: none !important; }
                    body { background: white !important; }
                    .no-print { display: none !important; }
                    .invoice-container { width: 190mm !important; max-width: 190mm !important; margin: 0 !important; padding: 10mm !important; box-shadow: none !important; outline: none !important; border: 1px solid #000000 !important; background: white !important; }
                    table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; border-spacing: 0 !important; border-color: #000000 !important; }
                    th, td { border-width: 1px !important; border-style: solid !important; border-color: #000000 !important; }
                    td table, td table th, td table td { border: none !important; }
                }
            `}</style>

            <div ref={reportRef} className="invoice-container" style={{ 
                width: '210mm', minHeight: '297mm', padding: '12mm', fontFamily: 'Arial, sans-serif', fontSize: '11.5px',
                backgroundColor: 'white', boxSizing: 'border-box', margin: '0 auto', boxShadow: isInModal ? 'none' : '0 0 10px rgba(0,0,0,0.1)', border: THIN_BORDER
            }}>
                
                <div style={{ textAlign: 'center', fontSize: '8pt', textDecoration: 'underline', marginTop: '2mm', marginBottom: '1.5mm', fontWeight: '800', letterSpacing: '0.2px' }}>
                    SUBJECT TO JURISDICTION
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginBottom: '0', border: THIN_BORDER }}>
                    <tbody>
                        <tr>
                            {/* FIX 1: Removed Vertical Border Right */}
                            <td style={{ border: THIN_BORDER, borderRight: 'none', padding: '1mm 1.5mm', width: '35%', fontSize: '8pt', fontWeight: '800', verticalAlign: 'middle' }}>
                                <strong>GSTIN : </strong>{purchaseOrder.companyGstin || settings.companyGstin}
                            </td>
                            {/* FIX 1: Removed Vertical Border Left */}
                            <td style={{ border: THIN_BORDER, borderLeft: 'none', textAlign: 'left', width: '52%', verticalAlign: 'middle', padding: '1mm 1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800', fontSize: '8pt' }}>
                                PURCHASE ORDER
                            </td>
                        </tr>
                    </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', border: THIN_BORDER, borderTop: 'none', fontFamily: 'Arial, sans-serif', marginBottom: '0' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '30%', border: THIN_BORDER, borderTop: 'none', textAlign: 'center', verticalAlign: 'middle', paddingRight: '2mm' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <img src={logoPO} alt="Company Logo" style={{ width: '75%', height: 'auto', objectFit: 'contain' }} />
                          <div style={{ fontSize: '9pt', fontWeight: '800', marginTop: '1mm' }}>DELTA'S TRADE LINK</div>
                        </div>
                      </td>
                     <td style={{ width: '70%', textAlign: 'center', verticalAlign: 'middle', padding: '2.5mm 2mm', border: THIN_BORDER, borderTop: 'none' }}>
                        <div style={{ fontFamily: 'Times New Roman, Times, serif', fontWeight: '900', fontSize: '25pt', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.1', color: '#000' }}>DELTA S TRADE LINK</div>
                        <div style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '12pt', marginBottom: '1mm' }}>India's No 1 Pooja Products Manufacturer</div>
                        <div style={{ fontSize: '10pt', fontWeight: 'bold', lineHeight: '1.4', marginBottom: '0.5mm' }}>
                          NO: 4078, THOTTANUTHU ROAD, REDDIYAPATTI (POST),<br />NATHAM ROAD, DINDIGUL-624003, TAMIL NADU, INDIA.
                        </div>
                        <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>E-Mail : deltastradelink@gmail.com</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontWeight: 'bold', fontSize: '8pt', letterSpacing: '0.2px', marginBottom: '0', border: THIN_BORDER, borderTop: 'none' }}>
                  <tbody>
                    <tr>
                      {/* FIX 1: Removed Vertical Borders between headers */}
                      <td style={{ border: THIN_BORDER, borderTop: 'none', borderRight: 'none', padding: '1mm 1.5mm', width: '33.33%', fontWeight: 'bold', fontSize: '8pt' }}>
                        E-Way Bill No. : {purchaseOrder.eWayBillNo || ''}
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '1mm 1.5mm', width: '33.33%', fontWeight: 'bold', fontSize: '8pt' }}>
                        E-Way Bill Date : {purchaseOrder.eWayBillDate ? formatDate(purchaseOrder.eWayBillDate) : ''}
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', borderLeft: 'none', padding: '1mm 1.5mm', width: '33.34%', fontWeight: '700', fontSize: '8pt' }}>
                        Vehicle No : {purchaseOrder.vehicleNo || ''}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ... Address/Details Tables (Unchanged Logic, just formatting) ... */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', marginTop: '0', marginBottom: '0', border: THIN_BORDER, borderTop: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '3mm', width: '33%', verticalAlign: 'top', lineHeight: '1.45' }}>
                        <div style={{ fontWeight: '800', marginBottom: '1mm' }}>Billing From</div>
                        <div style={{ marginBottom: '8.60mm' }}>
                          <div style={{ fontWeight: '600', fontSize: '8.5pt' }}>{supplier.name}</div>
                          <div style={{ fontWeight: '400' }}>{supplier.address}</div>
                        </div>
                        <div style={{ marginTop: '4mm' }}>
                          <div style={{ fontWeight: '800' }}><b>Contact No. :</b> {supplier.contact || ''}</div>
                          <div style={{ marginTop: '1.5mm', fontWeight: '800' }}><b>GSTIN :</b> {purchaseOrder.supplierGSTIN || settings.companyGstin}</div>
                        </div>
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '3mm', width: '33%', verticalAlign: 'top', lineHeight: '1.45' }}>
                        <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>Shipped To:</div>
                        <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5mm', fontSize: '8.5pt' }}>
                          Delta's Trade Link [{new Date(purchaseOrder.createdAt).getFullYear()}–{new Date(purchaseOrder.createdAt).getFullYear() + 1}]
                        </div>
                        <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
                          NO: 4078, THOTTANUTHU ROAD,<br />REDDIYAPATTI (POST), NATHAM ROAD,<br />DINDIGUL-624003, TAMIL NADU, INDIA.<br />E-Mail : {settings.companyEmail}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', fontWeight: '800', marginTop: '1mm' }}>
                          <span style={{ width: '15mm' }}>GSTIN</span><span>: {settings.companyGstin}</span>
                        </div>
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '2mm 3mm', width: '34%', verticalAlign: 'top' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', lineHeight: '2.2', border: 'none' }}>
                          <tbody>
                            <tr><td style={{ width: '40%', fontWeight: '800', verticalAlign: 'top', border: 'none' }}>Order No.</td><td style={{ fontWeight: '400', border: 'none' }}>: {purchaseOrder.poNumber}</td></tr>
                            <tr><td style={{ fontWeight: '800', border: 'none' }}>Date</td><td style={{ fontWeight: '400', border: 'none' }}>: {formatDate(purchaseOrder.createdAt)}</td></tr>
                            <tr><td style={{ fontWeight: '800', border: 'none' }}>Disp.From</td><td style={{ fontWeight: '400', border: 'none' }}>: {purchaseOrder.dispatchFrom || 'Main'}</td></tr>
                            <tr><td style={{ fontWeight: '800', border: 'none' }}>No.of Pack</td><td style={{ fontWeight: '400', border: 'none' }}>: {purchaseOrder.noOfPacks || ''}</td></tr>
                            <tr><td style={{ fontWeight: '800', border: 'none' }}>Transport</td><td style={{ fontWeight: '400', border: 'none' }}>: {purchaseOrder.transport || ''}</td></tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', marginTop: '0mm', border: THIN_BORDER, borderTop: 'none' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', fontWeight: '600', padding: '1mm', width: '33%', verticalAlign: 'top' }}>
                        <div><b>Terms of Payment :</b> {purchaseOrder.paymentTerms || ''}</div>
                        <div style={{ marginTop: '3mm' }}><b>Destination :</b> {purchaseOrder.destination || ''}</div>
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm', width: '33%', fontWeight: '600', verticalAlign: 'top' }}>
                        <div><b>P.O No & Date :</b> {purchaseOrder.poNumber} / {formatDate(purchaseOrder.createdAt)}</div>
                        <div style={{ marginTop: '3mm' }}><b>D.C No & Date :</b> {purchaseOrder.dcNo || ''}</div>
                      </td>
                      <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm', width: '34%', verticalAlign: 'top', fontWeight: '600' }}>
                        <div><b>Salesman :</b> {purchaseOrder.salesman || '<None>'}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginTop: '0', border: THIN_BORDER, borderTop: 'none', tableLayout: 'fixed' }}>
                  <colgroup>{columnWidths.map((w, i) => <col key={i} style={{width: w}} />)}</colgroup>
                  <thead>
                    <tr>
                      {['S.N','ITEM CODE','PRODUCT','HSN','GST%','UOM','QTY','RATE','DISC%','AMOUNT'].map((header, index) => (
                        <th key={index} style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm 1.5mm', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fff', width: columnWidths[index] }}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrder.items.map((item, index) => {
                      const productName = item.material?.name || item.productName || item.name || item.description || '';
                      const hasData = item.itemCode || productName || item.hsn || item.quantity || item.rate;
                      if (!hasData) return null;
                      
                      return (
                        <tr key={item._id || index}>
                          {[index + 1, item.itemCode || item.material?.code || '', productName, item.hsn || '48191010', `${item.gstPercent || 5}%`, 'Nos', formatCurrency(item.quantity || 0), item.rate ? formatCurrency(item.rate) : '3.80', item.discountPercent || '', formatCurrency((item.quantity * item.rate) || 0)].map((val, i) => (
                            <td key={i} style={{ border: THIN_BORDER, textAlign: i === 9 ? 'right' : 'center', padding: '1mm 1.5mm' }}>{val}</td>
                          ))}
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(10 - purchaseOrder.items.length, 0) }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <td key={j} style={{ border: THIN_BORDER, borderTop: 'none', borderBottom: 'none', borderLeft: THIN_BORDER, borderRight: THIN_BORDER, height: '10px', padding: '2mm 1.5mm' }}></td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      {Array.from({ length: 10 }).map((_, j) => {
                        const cellStyle = { border: THIN_BORDER, padding: '1mm 1.5mm', fontWeight: 'bold' };
                        if (j === 6) return <td key={j} style={{...cellStyle, textAlign: 'center'}}>{formatCurrency(purchaseOrder.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0))}</td>;
                        if (j === 9) return <td key={j} style={{...cellStyle, textAlign: 'right'}}>{formatCurrency(purchaseOrder.items.reduce((sum, item) => sum + (item.quantity * item.rate || 0), 0))}</td>;
                        return <td key={j} style={{...cellStyle}}></td>;
                      })}
                    </tr>
                  </tbody>
                </table>

                {/* === FIX 2: CONSOLIDATED GST SUMMARY (UI) === */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '0', border: THIN_BORDER, borderTop: 'none' }}>
                  <thead>
                    <tr>
                      <th rowSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', textAlign: 'center', padding: '2mm', fontWeight: 'bold' }}>HSN/SAC</th>
                      <th rowSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', textAlign: 'center', padding: '2mm', fontWeight: 'bold' }}>Taxable Value</th>
                      <th colSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', textAlign: 'center', padding: '2mm', fontWeight: 'bold' }}>CGST</th>
                      <th colSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', textAlign: 'center', padding: '2mm', fontWeight: 'bold' }}>SGST/UTGST</th>
                      <th rowSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', width: '22%', textAlign: 'left', padding: '2mm', fontWeight: 'bold' }}></th>
                      <th rowSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', width: '10%', textAlign: 'right', padding: '2mm', fontWeight: 'bold' }}></th>
                    </tr>
                    <tr>
                      <th style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm', fontWeight: 'bold' }}>Rate</th>
                      <th style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm', fontWeight: 'bold' }}>Amount</th>
                      <th style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm', fontWeight: 'bold' }}>Rate</th>
                      <th style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm', fontWeight: 'bold' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Render Consolidated Rows instead of Items */}
                    {consolidatedGstList.map((item, index) => {
                      return (
                        <tr key={index}>
                          <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>{item.hsn}</td>
                          <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(item.taxableValue)}</td>
                          <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>{item.gstRate/2} %</td>
                          <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(item.cgstAmount)}</td>
                          <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>{item.gstRate/2} %</td>
                          <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(item.sgstAmount)}</td>
                          {index === 0 && (
                            <>
                              <td rowSpan={consolidatedGstList.length} style={{ border: THIN_BORDER, textAlign: 'left', verticalAlign: 'top', padding: '1.5mm 2mm', fontSize: '8.5pt', lineHeight: '1.6' }}>
                                Input-CGST-{consolidatedGstList.length > 0 ? consolidatedGstList[0].gstRate/2 : 2.5}%<br />
                                Input-SGST-{consolidatedGstList.length > 0 ? consolidatedGstList[0].gstRate/2 : 2.5}%
                              </td>
                              <td rowSpan={consolidatedGstList.length} style={{ border: THIN_BORDER, textAlign: 'right', verticalAlign: 'top', padding: '1.5mm 2mm', fontSize: '8.5pt', lineHeight: '1.6' }}>
                                {formatCurrency(totalCgstAmount)}<br />
                                {formatCurrency(totalSgstAmount)}
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    <tr>
                      <td style={{ border: THIN_BORDER, textAlign: 'center', fontWeight: 'bold', padding: '1.5mm' }}>Total</td>
                      <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(totalTaxableValue)}</td>
                      <td style={{ border: THIN_BORDER }}></td>
                      <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(totalCgstAmount)}</td>
                      <td style={{ border: THIN_BORDER }}></td>
                      <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(totalSgstAmount)}</td>
                      <td colSpan="2" style={{ border: THIN_BORDER, padding: '1.5mm' }}></td>
                    </tr>
                    <tr>
                      <td colSpan="6" style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '2mm', fontSize: '10pt' }}>Grand Total</td>
                      <td colSpan="2" style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '2mm', fontSize: '10pt' }}>₹ {formatCurrency(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginTop: '0', border: THIN_BORDER, borderTop: 'none' }}>
                  <tbody>
                    <tr>
                      <td colSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm 1.5mm', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1mm' }}>
                          <div>Amount Chargeable (in words): <strong>INR {numberToWords(grandTotal)}</strong></div>
                          <div style={{ fontWeight: 'bold' }}>E. & O.E</div>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '2mm', border: 'none' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '70%', verticalAlign: 'top', borderTop: THIN_BORDER, padding: '3mm' }}>
                               <strong>BANK DETAILS :-</strong>
                                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5mm' }}>
                                  <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>Bank Name</span><span>: {settings.bankName}</span></div>
                                  <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>A/c. Name</span><span>: {settings.accountName}</span></div>
                                  <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>A/c. No.</span><span>: {settings.accountNumber}</span></div>
                                  <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>Branch & IFSC</span><span>: {settings.branchIfsc}</span></div>
                                </div>
                                <div style={{ marginTop: '4mm', fontWeight: 'bold', fontSize: '9pt' }}>TERMS & CONDITIONS</div>
                              </td>
                              <td style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle', borderTop: THIN_BORDER, borderLeft: THIN_BORDER, padding: '3mm', fontWeight: 'bold' }}>
                                For {settings.companyName}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ textAlign: 'center', borderTop: 'none', paddingTop: '6mm', paddingBottom: '3mm' }}>Customer Signature</td>
                              <td style={{ textAlign: 'center', borderTop: 'none', borderLeft: THIN_BORDER, paddingTop: '6mm', paddingBottom: '3mm' }}>Authorised Signatory</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
            </div>
        </div>
    );
};

// === EXPORTED FUNCTIONS (Fully Vector-Based Now) ===

export const generatePDFfromDeltaPOPrintLayout = async (poData) => {
    try {
        let logoBase64 = null;
        if (logoPO) {
            logoBase64 = await getBase64ImageFromURL(logoPO);
        }
        
        const settings = DEFAULT_SETTINGS;
        const docDefinition = createOrderPdfDefinition(poData, settings, logoBase64);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `PurchaseOrder_${poData.poNumber}_${timestamp}.pdf`;
        
        pdfMake.createPdf(docDefinition).download(filename);
        return { success: true };
    } catch (error) {
        console.error('Error generating PDF:', error);
        return { success: false, error: error.message };
    }
};

export const generatePDFBlobFromDeltaPOPrintLayout = async (poData) => {
    try {
        let logoBase64 = null;
        if (logoPO) {
            logoBase64 = await getBase64ImageFromURL(logoPO);
        }

        const settings = DEFAULT_SETTINGS;
        const docDefinition = createOrderPdfDefinition(poData, settings, logoBase64);
        
        const pdfDocGenerator = pdfMake.createPdf(docDefinition);
        
        return new Promise((resolve) => {
            pdfDocGenerator.getBlob((blob) => {
                resolve({ success: true, blob: blob, pdf: pdfDocGenerator });
            });
        });
    } catch (error) {
        console.error('Error generating PDF Blob:', error);
        return { success: false, error: error.message };
    }
};

export default DeltaPOPrintLayout;