import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../../api';
import logoPO from '../../assets/logo-po.png';
import { FaEye } from 'react-icons/fa';

// === PDF GENERATION IMPORTS (VECTOR BASED) ===
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
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- CORE PDF DEFINITION GENERATOR (VECTOR) ---
const createDCPdfDefinition = (deliveryChallan, settings, logoBase64) => {
    // 1. Calculate Data / Extract Lists
    const materials = deliveryChallan.materials || [];

    // Resolve Name for "Issued To"
    const issuedToName = deliveryChallan.unit_type === 'Jobber'
        ? (deliveryChallan.supplier_id?.name || '')
        : (deliveryChallan.person_name || '');

    // Logic to handle Multi-product vs Single Product Totals
    let totalSent = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    if (deliveryChallan.products && deliveryChallan.products.length > 0) {
        // Multiple products
        totalSent = materials.reduce((sum, item) => sum + (item.total_qty || 0), 0);
        totalReceived = materials.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0);
        totalBalance = materials.reduce((sum, item) => {
            const receivedQty = item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0);
            const totalQty = item.total_qty || 0;
            return sum + (totalQty - receivedQty);
        }, 0);
    } else {
        // Single product
        totalSent = materials.reduce((sum, item) => sum + (item.qty_per_carton * deliveryChallan.carton_qty), 0);
        totalReceived = materials.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0);
        totalBalance = materials.reduce((sum, item) => {
            return sum + (item.balance_qty !== undefined ? item.balance_qty : ((item.qty_per_carton * deliveryChallan.carton_qty) - (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0))));
        }, 0);
    }

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

    // --- UPDATED COLUMN WIDTHS FOR MATERIALS TABLE (9 COLUMNS) ---
    // S.N | MATERIAL CODE | MATERIAL NAME | HSN | UOM | QTY/CTN | SENT QTY | RECEIVED QTY | BALANCE
    const materialTableWidths = ['5%', '13%', '*', '10%', '6%', '10%', '10%', '10%', '10%'];

    // --- Construct Material Table Body ---
    const materialBody = [
        [
            { text: 'S.N', style: 'thCenter' },
            { text: 'MATERIAL CODE', style: 'thCenter' },
            { text: 'MATERIAL NAME', style: 'thCenter' },
            { text: 'HSN', style: 'thCenter' },
            { text: 'UOM', style: 'thCenter' },
            { text: 'QTY/CTN', style: 'thCenter' },
            { text: 'SENT QTY', style: 'thCenter' },
            { text: 'RECEIVED QTY', style: 'thCenter' },
            { text: 'BALANCE', style: 'thRight' }
        ]
    ];

    materials.forEach((item, index) => {
        // Calculation Logic Per Row
        let sentQty, receivedQty, balance;
        if (deliveryChallan.products && deliveryChallan.products.length > 0) {
            sentQty = item.total_qty || 0;
            receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
            balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
        } else {
            sentQty = item.qty_per_carton * deliveryChallan.carton_qty;
            receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
            balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
        }

        materialBody.push([
            { text: index + 1, style: 'tdCenter' },
            { text: item.material?.code || '', style: 'tdCenter' },
            { text: item.material?.name || item.material_name || '', style: 'tdCenter' },
            { text: '48191010', style: 'tdCenter' }, // Static HSN
            { text: 'Nos', style: 'tdCenter' }, // Static UOM
            { text: formatCurrency(item.qty_per_carton || 0), style: 'tdRight' },
            { text: formatCurrency(sentQty), style: 'tdRight' },
            { text: formatCurrency(receivedQty), style: 'tdRight' },
            { text: formatCurrency(balance), style: 'tdRight' }
        ]);
    });

    // Fill Empty Rows to maintain height
    const rowsToFill = Math.max(10 - materials.length, 0);
    const emptyCellStyle = { text: ' ', style: 'tdEmpty', border: [true, false, true, false] };

    for (let i = 0; i < rowsToFill; i++) {
        materialBody.push([
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle, emptyCellStyle, emptyCellStyle
        ]);
    }

    // Material Total Row
    materialBody.push([
        { text: '', colSpan: 5, border: [true, true, true, true] }, {}, {}, {}, {},
        { text: '', style: 'thRight', border: [true, true, true, true] }, // Total Qty Per Carton not usually summed
        { text: formatCurrency(totalSent), style: 'thRight', border: [true, true, true, true] },
        { text: formatCurrency(totalReceived), style: 'thRight', border: [true, true, true, true] },
        { text: formatCurrency(totalBalance), style: 'thRight', border: [true, true, true, true] }
    ]);

    // --- Construct HSN/Tax Table Body (Static/Dummy as per original DC logic) ---
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

    // Static Row from original logic
    const row = [
        { text: '48191010', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' }, // Taxable Value 0
        { text: '2.5 %', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' },
        { text: '2.5 %', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' },
        { text: 'Input-CGST-2.5%\nInput-SGST-2.5%', style: 'tdLeft' },
        { text: '0.00\n0.00', style: 'tdRight' }
    ];
    hsnBody.push(row);

    // Total Row
    hsnBody.push([
        { text: 'Total', style: 'thCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', colSpan: 2, style: 'tdCenter' }, {}
    ]);

    // Grand Total
    hsnBody.push([
        { text: 'Grand Total', colSpan: 6, style: 'grandTotalLabel' }, {}, {}, {}, {}, {},
        { text: `₹ ${formatCurrency(0)}`, colSpan: 2, style: 'grandTotalValue' }, {}
    ]);

    // --- NEW PRODUCT DETAILS BLOCK CONSTRUCTION ---
    // This will go below Header and before Materials
    let productBlockContent = [];
    if (deliveryChallan.products && deliveryChallan.products.length > 0) {
        // Multi Product Table
        const productRows = deliveryChallan.products.map(p => ([
            { text: p.product_name, style: 'stdCell', border: [true, true, true, true] },
            { text: p.carton_qty || 0, style: 'stdCell', alignment: 'right', border: [true, true, true, true] }
        ]));

        productBlockContent = [
            { text: 'PRODUCT DETAILS', style: 'sectionHeader', margin: [0, 5, 0, 2] },
            {
                table: {
                    widths: ['70%', '30%'],
                    body: [
                        [
                            { text: 'Product Name', style: 'thCenter', fillColor: '#f0f0f0' },
                            { text: 'Carton Qty', style: 'thCenter', fillColor: '#f0f0f0' }
                        ],
                        ...productRows
                    ]
                },
                layout: tableLayout,
                margin: [0, 0, 0, 5]
            }
        ];
    } else {
        // Single Product Display
        productBlockContent = [
            { text: 'PRODUCT DETAILS', style: 'sectionHeader', margin: [0, 5, 0, 2] },
            {
                table: {
                    widths: ['30%', '70%'],
                    body: [
                        [{ text: 'Product Name', bold: true, style: 'stdCell' }, { text: `: ${deliveryChallan.product_name || ''}`, style: 'stdCell' }],
                        [{ text: 'Carton Quantity', bold: true, style: 'stdCell' }, { text: `: ${deliveryChallan.carton_qty || ''}`, style: 'stdCell' }]
                    ]
                },
                layout: noBorderTableLayout,
                margin: [0, 0, 0, 5]
            }
        ];
    }


    // === DOCUMENT DEFINITION ===
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
                            { text: [{ text: 'GSTIN : ', bold: true }, { text: settings.companyGstin }], style: 'stdCell' },
                            { text: 'DELIVERY CHALLAN', style: 'titleCell' }
                        ]
                    ]
                },
                layout: noInternalVerticalsLayout
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
                            { text: `E-Way Bill No. : `, style: 'stdCell' },
                            { text: `E-Way Bill Date : `, style: 'stdCell' },
                            { text: `Vehicle No : `, style: 'stdCell' }
                        ]
                    ]
                },
                layout: noInternalVerticalsLayout
            },
            // === ADDRESS & DETAILS BLOCK ===
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['33%', '33%', '34%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'Unit Type', bold: true, margin: [0, 0, 0, 4] },
                                    { text: deliveryChallan.unit_type || '', bold: true, fontSize: 8.5 },
                                    { text: '\n\n', fontSize: 8 }, // Spacer
                                    { text: [{ text: 'Contact No. : ', bold: true }, { text: '' }], fontSize: 8 },
                                    { text: [{ text: 'GSTIN : ', bold: true }, { text: settings.companyGstin }], fontSize: 8, margin: [0, 2, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [true, false, true, true]
                            },
                            {
                                stack: [
                                    { text: deliveryChallan.unit_type === 'Jobber' ? 'Supplier:' : 'Issued To:', bold: true, margin: [0, 0, 0, 2] },
                                    {
                                        text: issuedToName,
                                        bold: true, fontSize: 8.5, margin: [0, 0, 0, 2], textTransform: 'uppercase'
                                    },
                                    {
                                        text: deliveryChallan.unit_type === 'Jobber'
                                            ? (deliveryChallan.supplier_id?.address || '')
                                            : '',
                                        fontSize: 8, margin: [0, 0, 0, 5]
                                    },
                                    { text: [{ text: 'GSTIN          : ', bold: true }, { text: settings.companyGstin }], fontSize: 8 }
                                ],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            },
                            {
                                // === RIGHT COLUMN: CLEAN DC DETAILS ONLY ===
                                stack: [
                                    {
                                        table: {
                                            widths: ['40%', '60%'],
                                            body: [
                                                [{ text: 'DC No.', bold: true }, { text: `: ${deliveryChallan.dc_no || ''}` }],
                                                [{ text: 'Date', bold: true }, { text: `: ${formatDate(deliveryChallan.date)}` }],
                                                [{ text: 'Issued To', bold: true }, { text: `: ${issuedToName}` }],
                                                [{ text: 'Unit Type', bold: true }, { text: `: ${deliveryChallan.unit_type || ''}` }],
                                                [{ text: 'Status', bold: true }, { text: `: ${deliveryChallan.status || ''}` }]
                                            ]
                                        },
                                        layout: noBorderTableLayout
                                    }
                                ],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            }
                        ]
                    ]
                },
                layout: tableLayout
            },
            // === REFERENCE BLOCK (Terms, PO, Salesman) ===
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    widths: ['33%', '33%', '34%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: [{ text: 'Terms of Payment : ', bold: true }, { text: '' }] },
                                    { text: [{ text: 'Destination : ', bold: true }, { text: '' }], margin: [0, 10, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [true, false, true, true]
                            },
                            {
                                stack: [
                                    { text: [{ text: 'P.O No & Date : ', bold: true }, { text: '' }] },
                                    { text: [{ text: 'D.C No & Date : ', bold: true }, { text: deliveryChallan.dc_no || '' }], margin: [0, 10, 0, 0] }
                                ],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            },
                            {
                                text: [{ text: 'Salesman : ', bold: true }, { text: '' }],
                                style: 'stdCell',
                                border: [false, false, true, true]
                            }
                        ]
                    ]
                },
                layout: tableLayout
            },
            
            // === NEW PRODUCT DETAILS BLOCK (Inserted Here) ===
            ...productBlockContent,

            // === MATERIALS TABLE ===
            {
                style: 'tableExample',
                margin: [0, -1, 0, 0],
                table: {
                    headerRows: 1,
                    widths: materialTableWidths,
                    body: materialBody
                },
                layout: tableLayout
            },
            // === TAX TABLE ===
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
            // === FOOTER (Amount Words, Bank, Signatures) ===
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
                                        { text: [{ text: 'Amount Chargeable (in words): ', fontSize: 9 }, { text: `INR ${numberToWords(0)}`, bold: true, fontSize: 9 }] },
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
            sectionHeader: { fontSize: 9, bold: true, decoration: 'underline' },
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

const DeltaDCPrintLayout = () => {
    const { id } = useParams();
    const location = useLocationSafe();
    const isRouterContext = location !== null;

    const [deliveryChallan, setDeliveryChallan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // === UI BORDER CONSTANTS (MATCHING PO) ===
    const BORDER_COLOR = '#000000';
    const BORDER_WIDTH = '1px';
    const THIN_BORDER = `${BORDER_WIDTH} solid ${BORDER_COLOR}`;
    // Updated widths for 9 columns
    const columnWidths = ['5%', '13%', '25%', '10%', '6%', '10%', '10%', '11%', '10%'];

    useEffect(() => {
        const fetchDCData = async () => {
            try {
                setLoading(true);
                const dcResponse = await api.get(`/delivery-challan/${id}`);
                const dcData = dcResponse.data;

                setDeliveryChallan(dcData);
                setLoading(false);

                if (isRouterContext && location && location.search) {
                    const queryParams = new URLSearchParams(location.search);
                    if (queryParams.get('print') === 'true') {
                        // Just open preview
                    }
                }
            } catch (err) {
                setError('Failed to load delivery challan data');
                setLoading(false);
                console.error('Error fetching DC data:', err);
            }
        };

        if (id) {
            fetchDCData();
        }
    }, [id, location, isRouterContext]);


    const downloadPDF = async () => {
        try {
            let logoBase64 = null;
            if (logoPO) {
                logoBase64 = await getBase64ImageFromURL(logoPO);
            }

            const docDefinition = createDCPdfDefinition(deliveryChallan, DEFAULT_SETTINGS, logoBase64);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `DeliveryChallan_${deliveryChallan.dc_no}_${timestamp}.pdf`;

            pdfMake.createPdf(docDefinition).download(filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading delivery challan data...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
    }

    if (!deliveryChallan) {
        return <div className="flex justify-center items-center h-screen">No delivery challan data available</div>;
    }

    // === CALCULATE UI TOTALS (Identical Logic to PDF) ===
    const materials = deliveryChallan.materials || [];
    let totalSent = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    if (deliveryChallan.products && deliveryChallan.products.length > 0) {
        // Multiple products
        totalSent = materials.reduce((sum, item) => sum + (item.total_qty || 0), 0);
        totalReceived = materials.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0);
        totalBalance = materials.reduce((sum, item) => {
            const receivedQty = item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0);
            const totalQty = item.total_qty || 0;
            return sum + (totalQty - receivedQty);
        }, 0);
    } else {
        // Single product
        totalSent = materials.reduce((sum, item) => sum + (item.qty_per_carton * deliveryChallan.carton_qty), 0);
        totalReceived = materials.reduce((sum, item) => sum + (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0)), 0);
        totalBalance = materials.reduce((sum, item) => {
            return sum + (item.balance_qty !== undefined ? item.balance_qty : ((item.qty_per_carton * deliveryChallan.carton_qty) - (item.received_qty !== undefined ? item.received_qty : (item.total_qty || 0))));
        }, 0);
    }

    const issuedToName = deliveryChallan.unit_type === 'Jobber'
        ? (deliveryChallan.supplier_id?.name || '')
        : (deliveryChallan.person_name || '');

    return (
        <div className="min-h-screen bg-gray-100 p-4">
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

            {/* === PRINT STYLES (MATCHING PO) === */}
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

            <div className="invoice-container" style={{
                width: '210mm', minHeight: '297mm', padding: '12mm', fontFamily: 'Arial, sans-serif', fontSize: '11.5px',
                backgroundColor: 'white', boxSizing: 'border-box', margin: '0 auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', border: THIN_BORDER
            }}>

                <div style={{ textAlign: 'center', fontSize: '8pt', textDecoration: 'underline', marginTop: '2mm', marginBottom: '1.5mm', fontWeight: '800', letterSpacing: '0.2px' }}>
                    SUBJECT TO JURISDICTION
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginBottom: '0', border: THIN_BORDER }}>
                    <tbody>
                        <tr>
                            <td style={{ border: THIN_BORDER, borderRight: 'none', padding: '1mm 1.5mm', width: '35%', fontSize: '8pt', fontWeight: '800', verticalAlign: 'middle' }}>
                                <strong>GSTIN : </strong>{DEFAULT_SETTINGS.companyGstin}
                            </td>
                            <td style={{ border: THIN_BORDER, borderLeft: 'none', textAlign: 'left', width: '52%', verticalAlign: 'middle', padding: '1mm 1.5mm', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800', fontSize: '8pt' }}>
                                DELIVERY CHALLAN
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
                            <td style={{ border: THIN_BORDER, borderTop: 'none', borderRight: 'none', padding: '1mm 1.5mm', width: '33.33%', fontWeight: 'bold', fontSize: '8pt' }}>
                                E-Way Bill No. :
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '1mm 1.5mm', width: '33.33%', fontWeight: 'bold', fontSize: '8pt' }}>
                                E-Way Bill Date :
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', borderLeft: 'none', padding: '1mm 1.5mm', width: '33.34%', fontWeight: '700', fontSize: '8pt' }}>
                                Vehicle No :
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* === ADDRESS & DETAILS BLOCK === */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', marginTop: '0', marginBottom: '0', border: THIN_BORDER, borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '3mm', width: '33%', verticalAlign: 'top', lineHeight: '1.45' }}>
                                <div style={{ fontWeight: '800', marginBottom: '1mm' }}>Unit Type</div>
                                <div style={{ marginBottom: '8.60mm' }}>
                                    <div style={{ fontWeight: '600', fontSize: '8.5pt' }}>{deliveryChallan.unit_type || ''}</div>
                                </div>
                                <div style={{ marginTop: '4mm' }}>
                                    <div style={{ fontWeight: '800' }}><b>Contact No. :</b> </div>
                                    <div style={{ marginTop: '1.5mm', fontWeight: '800' }}><b>GSTIN :</b> {DEFAULT_SETTINGS.companyGstin}</div>
                                </div>
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '3mm', width: '33%', verticalAlign: 'top', lineHeight: '1.45' }}>
                                <div style={{ fontWeight: '800', marginBottom: '0.5mm' }}>
                                    {deliveryChallan.unit_type === 'Jobber' ? 'Supplier:' : 'Issued To:'}
                                </div>
                                <div style={{ fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5mm', fontSize: '8.5pt' }}>
                                    {issuedToName}
                                </div>
                                <div style={{ marginBottom: '1.9mm', fontWeight: '400' }}>
                                    {deliveryChallan.unit_type === 'Jobber'
                                        ? (deliveryChallan.supplier_id?.address || '')
                                        : ''}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', fontWeight: '800', marginTop: '1mm' }}>
                                    <span style={{ width: '15mm' }}>GSTIN</span><span>: {DEFAULT_SETTINGS.companyGstin}</span>
                                </div>
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '2mm 3mm', width: '34%', verticalAlign: 'top' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', lineHeight: '2.2', border: 'none' }}>
                                    <tbody>
                                        <tr><td style={{ width: '40%', fontWeight: '800', verticalAlign: 'top', border: 'none' }}>DC No.</td><td style={{ fontWeight: '400', border: 'none' }}>: {deliveryChallan.dc_no || ''}</td></tr>
                                        <tr><td style={{ fontWeight: '800', border: 'none' }}>Date</td><td style={{ fontWeight: '400', border: 'none' }}>: {formatDate(deliveryChallan.date)}</td></tr>
                                        <tr><td style={{ fontWeight: '800', border: 'none' }}>Issued To</td><td style={{ fontWeight: '400', border: 'none' }}>: {issuedToName}</td></tr>
                                        <tr><td style={{ fontWeight: '800', border: 'none' }}>Unit Type</td><td style={{ fontWeight: '400', border: 'none' }}>: {deliveryChallan.unit_type || ''}</td></tr>
                                        <tr><td style={{ fontWeight: '800', border: 'none' }}>Status</td><td style={{ fontWeight: '400', border: 'none' }}>: {deliveryChallan.status || ''}</td></tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* === REFERENCE BLOCK === */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Arial', 'Helvetica', sans-serif", fontSize: '8pt', marginTop: '0mm', border: THIN_BORDER, borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', fontWeight: '600', padding: '1mm', width: '33%', verticalAlign: 'top' }}>
                                <div><b>Terms of Payment :</b> </div>
                                <div style={{ marginTop: '3mm' }}><b>Destination :</b> </div>
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm', width: '33%', fontWeight: '600', verticalAlign: 'top' }}>
                                <div><b>P.O No & Date :</b> </div>
                                <div style={{ marginTop: '3mm' }}><b>D.C No & Date :</b> {deliveryChallan.dc_no || ''}</div>
                            </td>
                            <td style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm', width: '34%', verticalAlign: 'top', fontWeight: '600' }}>
                                <div><b>Salesman :</b> </div>
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* === NEW PRODUCT DETAILS BLOCK (Below Header, Before Materials) === */}
                <div style={{ marginTop: '2mm', marginBottom: '2mm' }}>
                    <div style={{ fontWeight: 'bold', textDecoration: 'underline', fontSize: '9pt', marginBottom: '1mm' }}>PRODUCT DETAILS</div>
                    {deliveryChallan.products && deliveryChallan.products.length > 0 ? (
                         <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', border: THIN_BORDER }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <th style={{ border: THIN_BORDER, padding: '1mm', textAlign: 'center' }}>Product Name</th>
                                    <th style={{ border: THIN_BORDER, padding: '1mm', textAlign: 'center' }}>Carton Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deliveryChallan.products.map((p, idx) => (
                                    <tr key={idx}>
                                        <td style={{ border: THIN_BORDER, padding: '1mm' }}>{p.product_name}</td>
                                        <td style={{ border: THIN_BORDER, padding: '1mm', textAlign: 'right' }}>{p.carton_qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                         </table>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt' }}>
                            <tbody>
                                <tr><td style={{ width: '30%', fontWeight: 'bold' }}>Product Name</td><td>: {deliveryChallan.product_name || ''}</td></tr>
                                <tr><td style={{ width: '30%', fontWeight: 'bold' }}>Carton Quantity</td><td>: {deliveryChallan.carton_qty || ''}</td></tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {/* === MATERIALS TABLE === */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginTop: '0', border: THIN_BORDER, borderTop: 'none', tableLayout: 'fixed' }}>
                    <colgroup>{columnWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                    <thead>
                        <tr>
                            {['S.N', 'MATERIAL CODE', 'MATERIAL NAME', 'HSN', 'UOM', 'QTY/CTN', 'SENT QTY', 'RECEIVED QTY', 'BALANCE'].map((header, index) => (
                                <th key={index} style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm 1.5mm', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#fff', width: columnWidths[index] }}>
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {materials.map((item, index) => {
                            let sentQty, receivedQty, balance;

                            if (deliveryChallan.products && deliveryChallan.products.length > 0) {
                                sentQty = item.total_qty || 0;
                                receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
                                balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
                            } else {
                                sentQty = item.qty_per_carton * deliveryChallan.carton_qty;
                                receivedQty = item.received_qty !== undefined ? item.received_qty : item.total_qty;
                                balance = item.balance_qty !== undefined ? item.balance_qty : (sentQty - receivedQty);
                            }

                            return (
                                <tr key={item._id || index}>
                                    {[
                                        index + 1,
                                        item.material?.code || '',
                                        item.material?.name || item.material_name || '',
                                        '48191010',
                                        'Nos',
                                        formatCurrency(item.qty_per_carton || 0),
                                        formatCurrency(sentQty),
                                        formatCurrency(receivedQty),
                                        formatCurrency(balance),
                                    ].map((val, i) => (
                                        <td key={i} style={{ border: THIN_BORDER, textAlign: [5, 6, 7, 8].includes(i) ? 'right' : 'center', padding: '1mm 1.5mm' }}>{val}</td>
                                    ))}
                                </tr>
                            );
                        })}
                        {/* Empty Rows */}
                        {Array.from({ length: Math.max(10 - materials.length, 0) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <td key={j} style={{ border: THIN_BORDER, borderTop: 'none', borderBottom: 'none', borderLeft: THIN_BORDER, borderRight: THIN_BORDER, height: '10px', padding: '2mm 1.5mm' }}></td>
                                ))}
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr>
                            {Array.from({ length: 9 }).map((_, j) => {
                                const cellStyle = { border: THIN_BORDER, padding: '1mm 1.5mm', fontWeight: 'bold' };
                                if (j === 5) return <td key={j} style={{ ...cellStyle, textAlign: 'right' }}></td>;
                                if (j === 6) return <td key={j} style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalSent)}</td>;
                                if (j === 7) return <td key={j} style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalReceived)}</td>;
                                if (j === 8) return <td key={j} style={{ ...cellStyle, textAlign: 'right' }}>{formatCurrency(totalBalance)}</td>;
                                return <td key={j} style={{ ...cellStyle }}></td>;
                            })}
                        </tr>
                    </tbody>
                </table>

                {/* === TAX TABLE (Static/Dummy Data as per original) === */}
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
                        <tr>
                            <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>48191010</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>2.5 %</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'center', padding: '1.5mm' }}>2.5 %</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td style={{ borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRight: THIN_BORDER, textAlign: 'left', verticalAlign: 'top', padding: '1.5mm 2mm', fontSize: '8.5pt', lineHeight: '1.6' }}>
                                Input-CGST-2.5%<br />
                                Input-SGST-2.5%
                            </td>
                            <td style={{ borderTop: 'none', borderBottom: 'none', borderLeft: 'none', borderRight: THIN_BORDER, textAlign: 'right', verticalAlign: 'top', padding: '1.5mm 2mm', fontSize: '8.5pt', lineHeight: '1.6' }}>
                                {formatCurrency(0)}<br />
                                {formatCurrency(0)}
                            </td>
                        </tr>
                        {/* Total Row */}
                        <tr>
                            <td style={{ border: THIN_BORDER, textAlign: 'center', fontWeight: 'bold', padding: '1.5mm' }}>Total</td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td style={{ border: THIN_BORDER }}></td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td style={{ border: THIN_BORDER }}></td>
                            <td style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '1.5mm' }}>{formatCurrency(0)}</td>
                            <td colSpan="2" style={{ border: THIN_BORDER, padding: '1.5mm' }}></td>
                        </tr>
                        {/* Grand Total Row */}
                        <tr>
                            <td colSpan="5" style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '2mm', fontSize: '10pt' }}>Grand Total</td>
                            <td colSpan="2" style={{ border: THIN_BORDER, textAlign: 'right', fontWeight: 'bold', padding: '2mm', fontSize: '10pt' }}>₹ {formatCurrency(0)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                {/* === FOOTER (Words & Signatures) === */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Arial, sans-serif', fontSize: '9pt', marginTop: '0', border: THIN_BORDER, borderTop: 'none' }}>
                    <tbody>
                        <tr>
                            <td colSpan="2" style={{ border: THIN_BORDER, borderTop: 'none', padding: '1mm 1.5mm', width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1mm' }}>
                                    <div>Amount Chargeable (in words): <strong>INR {numberToWords(0)}</strong></div>
                                    <div style={{ fontWeight: 'bold' }}>E. & O.E</div>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginTop: '2mm', border: 'none' }}>
                                    <tbody>
                                        <tr>
                                            <td style={{ width: '70%', verticalAlign: 'top', borderTop: THIN_BORDER, padding: '3mm' }}>
                                                <strong>BANK DETAILS :-</strong>
                                                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '1.5mm' }}>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>Bank Name</span><span>: {DEFAULT_SETTINGS.bankName}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>A/c. Name</span><span>: {DEFAULT_SETTINGS.accountName}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>A/c. No.</span><span>: {DEFAULT_SETTINGS.accountNumber}</span></div>
                                                    <div style={{ display: 'flex' }}><span style={{ width: '33mm' }}>Branch & IFSC</span><span>: {DEFAULT_SETTINGS.branchIfsc}</span></div>
                                                </div>
                                                <div style={{ marginTop: '4mm', fontWeight: 'bold', fontSize: '9pt' }}>TERMS & CONDITIONS</div>
                                            </td>
                                            <td style={{ width: '30%', textAlign: 'center', verticalAlign: 'middle', borderTop: THIN_BORDER, borderLeft: THIN_BORDER, padding: '3mm', fontWeight: 'bold' }}>
                                                For {DEFAULT_SETTINGS.companyName}
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

export default DeltaDCPrintLayout;