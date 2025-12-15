import React, { useState, useEffect, useMemo } from 'react';
import apiWithOfflineSupport from '../../utils/apiWithOfflineSupport';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaExclamationTriangle, FaEye, FaPlus, FaTimes, FaTrash, FaFilePdf, FaPrint } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DeliveryChallanDetailModal from '../../components/deliveryChallan/DeliveryChallanDetailModal';
import { useAuth } from '../../context/AuthContext';
import Select from 'react-select';
import { useNavigate } from 'react-router-dom';
import logoPO from '../../assets/logo-po.png';

// === PDF GENERATION IMPORTS ===
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

// === FIX FOR VFS FONT IMPORT ERROR ===
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && pdfFonts.vfs) {
    pdfMake.vfs = pdfFonts.vfs;
}

// === HELPER FUNCTIONS FOR PDF GENERATION ===
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

const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateForPdf = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
};

// === CORE PDF DEFINITION GENERATOR (VECTOR) ===
const createDCPdfDefinition = (deliveryChallan, logoBase64) => {
    const settings = DEFAULT_SETTINGS;
    
    // 1. Calculate Data / Extract Lists
    // Handle materials for both single and multiple products (matching DeliveryChallanDetailModal logic)
    let materials = [];
    if (deliveryChallan && deliveryChallan.products && deliveryChallan.products.length > 0) {
        // For multiple products, collect all materials from all products
        deliveryChallan.products.forEach(product => {
            if (product.materials && Array.isArray(product.materials)) {
                materials = materials.concat(product.materials);
            }
        });
    } else if (deliveryChallan && deliveryChallan.materials && Array.isArray(deliveryChallan.materials)) {
        // For single product (backward compatibility)
        materials = deliveryChallan.materials;
    }
    // Resolve Name for "Issued To"
    const issuedToName = deliveryChallan.unit_type === 'Jobber'
        ? (deliveryChallan.supplier_id?.name || '')
        : (deliveryChallan.person_name || '');

    // === SIMPLIFIED TOTAL CALCULATION BASED ON BACKEND FIELDS ===
    const totalSent = materials.reduce((sum, item) => sum + (item.total_qty || 0), 0);    // === PDF BORDER STYLES ===
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

    // Column Widths for Materials Table (7 Columns)
    // S.N | ITEM CODE | MATERIAL NAME | HSN | UOM | QTY/CTN | ISSUED QTY
    const materialTableWidths = ['5%', '15%', '*', '10%', '8%', '12%', '15%'];

    // --- Construct Material Table Body ---
    const materialBody = [
        [
            { text: 'S.N', style: 'thCenter' },
            { text: 'ITEM CODE', style: 'thCenter' },
            { text: 'MATERIAL NAME', style: 'thCenter' },
            { text: 'HSN', style: 'thCenter' },
            { text: 'UOM', style: 'thCenter' },
            { text: 'QTY/CTN', style: 'thCenter' },
            { text: 'ISSUED QTY', style: 'thCenter' }
        ]
    ];

    // === FIXED LOOP USING DIRECT BACKEND FIELDS ===
    materials.forEach((item, index) => {
        materialBody.push([
            { text: index + 1, alignment: 'center' },
            { text: item.material_code || '', alignment: 'center' },
            { text: item.material_name || '', alignment: 'left' },
            { text: item.hsn || '48191010', alignment: 'center' },
            { text: item.uom || 'Nos', alignment: 'center' },
            { text: formatCurrency(item.qty_per_carton || 0), alignment: 'right' },
            { text: formatCurrency(item.total_qty || 0), alignment: 'right' }
        ]);
    });

    // Fill Empty Rows to maintain height
    const rowsToFill = Math.max(10 - materials.length, 0);
    const emptyCellStyle = { text: ' ', style: 'tdEmpty', border: [true, false, true, false] };

    for (let i = 0; i < rowsToFill; i++) {
        materialBody.push([
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle, emptyCellStyle, emptyCellStyle,
            emptyCellStyle
        ]);
    }

    // Material Total Row
    materialBody.push([
        { text: '', colSpan: 6, border: [true, true, true, true] }, {}, {}, {}, {}, {},
        { text: formatCurrency(totalSent), style: 'thRight', border: [true, true, true, true] }
    ]);
    // --- Construct HSN/Tax Table Body ---
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

    const row = [
        { text: '48191010', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' },
        { text: '2.5 %', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' },
        { text: '2.5 %', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'tdRight' },
        { text: 'Input-CGST-2.5%\nInput-SGST-2.5%', style: 'tdLeft' },
        { text: '0.00\n0.00', style: 'tdRight' }
    ];
    hsnBody.push(row);

    hsnBody.push([
        { text: 'Total', style: 'thCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', style: 'tdCenter' },
        { text: formatCurrency(0), style: 'thRight' },
        { text: '', colSpan: 2, style: 'tdCenter' }, {}
    ]);

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
                                                [{ text: 'Date', bold: true }, { text: `: ${formatDateForPdf(deliveryChallan.date)}` }],
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

const OutgoingPackingMaterials = () => {
    // State for materials, product mappings, suppliers, and delivery challan records
    const [materials, setMaterials] = useState([]);
    const [productMappings, setProductMappings] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [records, setRecords] = useState([]);

    // Form state
    const [unitType, setUnitType] = useState('Own Unit');
    const [supplierId, setSupplierId] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cartonQty, setCartonQty] = useState('');
    const [dcDate, setDcDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [personName, setPersonName] = useState('');
    
    // Add new states for person names functionality
    const [personNames, setPersonNames] = useState([]);
    const [isPersonNamePopupOpen, setIsPersonNamePopupOpen] = useState(false);
    const [newPersonName, setNewPersonName] = useState('');
    const [editingPersonName, setEditingPersonName] = useState(null);
    const [isPersonNamesLoading, setIsPersonNamesLoading] = useState(false);
    
    // Multi-product state
    const [selectedProducts, setSelectedProducts] = useState([]);
    
    // Calculated materials based on product mapping and carton quantity
    const [calculatedMaterials, setCalculatedMaterials] = useState([]);
    
    // UI states
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Delivery Challan Detail Modal state
    const [isDCDetailModalOpen, setIsDCDetailModalOpen] = useState(false);
    const [selectedDCId, setSelectedDCId] = useState(null);
    
    // Add auth context to get logged-in user
    const { user } = useAuth();
    const navigate = useNavigate();

    // Calculate materials when selected products change
    useEffect(() => {
        if (selectedProducts.length > 0) {
            const allMaterials = [];
            
            selectedProducts.forEach(product => {
                const mapping = productMappings.find(m => m.product_name === product.product_name);
                if (mapping) {
                    mapping.materials.forEach(material => {
                        const existingMaterial = allMaterials.find(m => m.material_name === material.material_name);
                        if (existingMaterial) {
                            existingMaterial.total_qty += material.qty_per_carton * product.carton_qty;
                        } else {
                            allMaterials.push({
                                material_name: material.material_name,
                                qty_per_carton: material.qty_per_carton,
                                total_qty: material.qty_per_carton * product.carton_qty
                            });
                        }
                    });
                }
            });
            
            setCalculatedMaterials(allMaterials);
        } else {
            setCalculatedMaterials([]);
        }
    }, [selectedProducts, productMappings]);

    // Initial data fetch
    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const [materialsResponse, mappingsResponse, suppliersResponse, historyResponse, personNamesResponse] = await Promise.all([
                    apiWithOfflineSupport.get('/materials'),
                    apiWithOfflineSupport.get('/product-mapping'),
                    apiWithOfflineSupport.getJobberSuppliers('packing'),
                    apiWithOfflineSupport.getDeliveryChallans(),
                    apiWithOfflineSupport.getPersonNames()
                ]);
                
                setMaterials(materialsResponse.data);
                setProductMappings(mappingsResponse.data);
                setSuppliers(suppliersResponse.data);
                setRecords(historyResponse.data);
                setPersonNames(personNamesResponse.data || []);
            } catch (err) {
                setError('Failed to load page data. Please try refreshing.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, []);

    // Add product to the selected products list
    const addProductToList = () => {
        if (!selectedProduct || !cartonQty || cartonQty <= 0) {
            toast.warn('⚠️ Please select a product and enter a valid carton quantity.');
            return;
        }
        
        const existingProduct = selectedProducts.find(p => p.product_name === selectedProduct.value);
        if (existingProduct) {
            toast.warn('⚠️ This product is already in the list.');
            return;
        }
        
        setSelectedProducts(prev => [
            ...prev,
            {
                product_name: selectedProduct.value,
                carton_qty: parseInt(cartonQty)
            }
        ]);
        
        setSelectedProduct(null);
        setCartonQty('');
    };

    // Remove product from the selected products list
    const removeProductFromList = (productName) => {
        setSelectedProducts(prev => prev.filter(p => p.product_name !== productName));
    };

    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (selectedProducts.length === 0) {
            toast.warn('⚠️ Please add at least one product to the list.');
            return;
        }
        
        if (unitType === 'Jobber' && !supplierId) {
            toast.warn('⚠️ Please select a supplier for Jobber unit type.');
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            const payload = {
                unit_type: unitType,
                products: selectedProducts,
                date: dcDate,
                remarks
            };
            
            if (unitType === 'Jobber') {
                payload.supplier_id = supplierId;
            }
            
            if (unitType === 'Own Unit') {
                payload.person_name = personName;
            }
            
            const response = await apiWithOfflineSupport.createDeliveryChallan(payload);
            
            if (response.queued) {
                toast.info('📋 Delivery Challan queued for sync. Will be created when online.');
            } else {
                toast.success('✅ Delivery Challan created and stock reserved.');
                
                // Reset form
                setUnitType('Own Unit');
                setSupplierId('');
                setSelectedProduct(null);
                setCartonQty('');
                setDcDate(new Date().toISOString().split('T')[0]);
                setRemarks('');
                setPersonName('');
                setSelectedProducts([]);
                setCalculatedMaterials([]);
                
                // Refresh history
                const historyResponse = await apiWithOfflineSupport.getDeliveryChallans();
                setRecords(historyResponse.data);
                
                // Refresh materials to show updated stock
                const materialsResponse = await apiWithOfflineSupport.get('/materials');
                setMaterials(materialsResponse.data);
            }
        } catch (err) {
            console.error('Error creating delivery challan:', err);
            if (err.response && err.response.data && err.response.data.message) {
                if (err.response.data.message.includes('Low Stock')) {
                    toast.warn(`⚠️ ${err.response.data.message}`);
                } else if (err.response.data.message.includes('Product mapping not found')) {
                    toast.warn('⚠️ No product mapping found. Please create mapping in Item Master.');
                } else {
                    toast.error(err.response.data.message);
                }
            } else {
                toast.error('❌ Failed to create delivery challan. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date for display
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };
    
    // Function to get status badge
    const getStatusBadge = (status) => {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800',
            'Partial': 'bg-orange-100 text-orange-800',
            'Completed': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800'
        };
        
        return (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };
    
    // Create options for react-select
    const productOptions = productMappings.map(mapping => ({
        value: mapping.product_name,
        label: mapping.product_name
    }));

    // Handler for DC detail modal
    const handleViewDCDetail = (dcId) => {
        setSelectedDCId(dcId);
        setIsDCDetailModalOpen(true);
    };
    
    // Handler for DC status update
    const handleDCStatusUpdate = (updatedDC) => {
        setRecords(prevRecords => 
            prevRecords.map(record => 
                record._id === updatedDC._id ? updatedDC : record
            )
        );
    };

    // ✅ FIXED: Handle Direct PDF Download - Generate and download Vector PDF directly
    const handleDownloadPDF = async (dcId) => {
        try {
            toast.info('📥 Generating PDF...');
            
            // Fetch the delivery challan data directly
            const response = await apiWithOfflineSupport.getDeliveryChallanById(dcId);
            const deliveryChallan = response.data;

            // Load logo
            let logoBase64 = null;
            if (logoPO) {
                try {
                    logoBase64 = await getBase64ImageFromURL(logoPO);
                } catch (e) {
                    console.warn("Logo failed to load for PDF generation", e);
                }
            }
            
            // Generate PDF Definition (Vector)
            const docDefinition = createDCPdfDefinition(deliveryChallan, logoBase64);

            // Create filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            const filename = `DeliveryChallan_${deliveryChallan.dc_no}_${timestamp}.pdf`;
            
            // Generate and Download
            pdfMake.createPdf(docDefinition).download(filename);
            
            toast.success('✅ PDF downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('❌ Failed to generate PDF. Please try again.');
        }
    };

    // ✅ UPDATED: Handle Print Preview - Uses createDCPdfDefinition directly instead of navigating
    const handlePrintPDF = async (dcId) => {
        try {
            toast.info('🖨️ Preparing print...');
            
            // Fetch data
            const response = await apiWithOfflineSupport.getDeliveryChallanById(dcId);
            const deliveryChallan = response.data;
            
            // Load logo
            let logoBase64 = null;
            if (logoPO) {
                try {
                    logoBase64 = await getBase64ImageFromURL(logoPO);
                } catch (e) {
                    console.warn("Logo failed to load for PDF print", e);
                }
            }
            
            // Generate PDF and Print
            const docDefinition = createDCPdfDefinition(deliveryChallan, logoBase64);
            pdfMake.createPdf(docDefinition).print();
            
        } catch (error) {
            console.error('Error opening print preview:', error);
            toast.error('❌ Failed to open print preview. Please try again.');
        }
    };
    
    // Functions for person name management
    const openPersonNamePopup = () => {
        setIsPersonNamePopupOpen(true);
        setNewPersonName('');
        setEditingPersonName(null);
    };
    
    const closePersonNamePopup = () => {
        setIsPersonNamePopupOpen(false);
        setNewPersonName('');
        setEditingPersonName(null);
    };
    
    const savePersonName = async () => {
        if (!newPersonName.trim()) {
            toast.warn('⚠️ Please enter a person name');
            return;
        }
        
        setIsPersonNamesLoading(true);
        
        try {
            if (editingPersonName !== null) {
                const response = await apiWithOfflineSupport.updatePersonName(
                    personNames[editingPersonName]._id,
                    { name: newPersonName.trim() }
                );
                
                const updatedPersonNames = [...personNames];
                updatedPersonNames[editingPersonName] = response.data;
                setPersonNames(updatedPersonNames);
                
                toast.success('✅ Person name updated successfully');
            } else {
                const response = await apiWithOfflineSupport.createPersonName({
                    name: newPersonName.trim()
                });
                
                setPersonNames(prev => [...prev, response.data]);
                toast.success('✅ Person name added successfully');
            }
            
            closePersonNamePopup();
        } catch (error) {
            console.error('Error saving person name:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('❌ Failed to save person name. Please try again.');
            }
        } finally {
            setIsPersonNamesLoading(false);
        }
    };
    
    const editPersonName = (index) => {
        setEditingPersonName(index);
        setNewPersonName(personNames[index].name);
        setIsPersonNamePopupOpen(true);
    };
    
    const deletePersonName = async (index) => {
        const personNameToDelete = personNames[index];
        
        try {
            await apiWithOfflineSupport.deletePersonName(personNameToDelete._id);
            
            const updatedPersonNames = personNames.filter((_, i) => i !== index);
            setPersonNames(updatedPersonNames);
            
            toast.success('✅ Person name deleted successfully');
        } catch (error) {
            console.error('Error deleting person name:', error);
            if (error.response && error.response.data && error.response.data.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('❌ Failed to delete person name. Please try again.');
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-indigo-600" size={48} />
            </div>
        );
    }
    
    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="w-full px-4 py-6">
            <ToastContainer position="top-right" autoClose={5000} />
            
            {/* Person Name Popup */}
            <Modal 
                isOpen={isPersonNamePopupOpen} 
                onClose={closePersonNamePopup} 
                title={editingPersonName !== null ? 'Edit Person Name' : 'Add Person Name'}
            >
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Person Name
                    </label>
                    <input
                        type="text"
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Enter person name"
                    />
                </div>
                
                <div className="flex justify-end space-x-3">
                    <button
                        onClick={closePersonNamePopup}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        disabled={isPersonNamesLoading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={savePersonName}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        disabled={isPersonNamesLoading}
                    >
                        {isPersonNamesLoading ? 'Saving...' : (editingPersonName !== null ? 'Update' : 'Add')}
                    </button>
                </div>
                
                {/* List of existing person names */}
                {personNames.length > 0 && (
                    <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Existing Person Names</h4>
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {personNames.map((person, index) => (
                                    <li key={person._id} className="px-4 py-2 flex justify-between items-center">
                                        <span className="text-gray-700">{person.name}</span>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => editPersonName(index)}
                                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                                                disabled={isPersonNamesLoading}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => deletePersonName(index)}
                                                className="text-red-600 hover:text-red-900 text-sm"
                                                disabled={isPersonNamesLoading}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </Modal>
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Delivery Challan (Outgoing Packing Materials)
                </h1>
                <p className="text-gray-600 text-sm">
                    Manage material movement for both Own Unit and Jobber deliveries.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 w-full">
                {/* Delivery Challan Form */}
                <div className="lg:col-span-8">
                    <Card title="Create Delivery Challan" className="w-full">
                        <form onSubmit={handleSubmit} className="space-y-5 w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Unit Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={unitType}
                                        onChange={(e) => setUnitType(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="Own Unit">Own Unit</option>
                                        <option value="Jobber">Jobber</option>
                                    </select>
                                </div>
                                
                                {/* Supplier (only visible for Jobber) */}
                                {unitType === 'Jobber' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supplier <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={supplierId}
                                            onChange={(e) => setSupplierId(e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value="">Select Supplier</option>
                                            {suppliers.map(supplier => (
                                                <option key={supplier._id} value={supplier._id}>
                                                    {supplier.name} ({supplier.supplierCode})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                
                                {/* Product Selection Section */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Selection
                                    </label>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="md:col-span-1">
                                            <Select
                                                value={selectedProduct}
                                                onChange={setSelectedProduct}
                                                options={productOptions}
                                                className="mt-1"
                                                placeholder="Select Product"
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={cartonQty}
                                                onChange={(e) => setCartonQty(e.target.value)}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                placeholder="Carton Quantity"
                                            />
                                        </div>
                                        
                                        <div className="md:col-span-1">
                                            <button
                                                type="button"
                                                onClick={addProductToList}
                                                className="mt-1 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                <FaPlus className="mr-2" /> Add Item
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Selected Products List */}
                                {selectedProducts.length > 0 && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Selected Products
                                        </label>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="min-w-full divide-y divide-gray-200 w-full">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Carton Quantity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedProducts.map((product, index) => (
                                                        <tr key={index}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {product.product_name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {product.carton_qty}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeProductFromList(product.product_name)}
                                                                    className="text-red-600 hover:text-red-900"
                                                                >
                                                                    <FaTrash />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={dcDate}
                                        onChange={(e) => setDcDate(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                
                                {/* Remarks */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows="3"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Optional remarks"
                                    />
                                </div>
                                
                                {/* Person Name (only visible for Own Unit) */}
                                {unitType === 'Own Unit' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Person Name
                                        </label>
                                        <div className="flex space-x-2">
                                            <div className="flex-grow">
                                                <select
                                                    value={personName}
                                                    onChange={(e) => setPersonName(e.target.value)}
                                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                                >
                                                    <option value="">Select Person</option>
                                                    {personNames.map((person) => (
                                                        <option key={person._id} value={person.name}>
                                                            {person.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={openPersonNamePopup}
                                                className="mt-1 px-3 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center"
                                            >
                                                <FaPlus className="mr-1" /> Add
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Select or add a person to whom materials are being issued</p>
                                    </div>
                                )}
                                
                                {/* Issued By Field */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Issued By
                                    </label>
                                    <input
                                        type="text"
                                        value={user ? user.name : 'System'}
                                        readOnly
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm focus:outline-none"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">This field is automatically filled with your name</p>
                                </div>
                            </div>
                            
                            {/* Materials Table */}
                            {calculatedMaterials.length > 0 && (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h3 className="text-sm font-semibold text-gray-700">Materials Required</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty per Carton</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Qty</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {calculatedMaterials.map((material, index) => {
                                                    const materialInfo = materials.find(m => m.name === material.material_name);
                                                    const isLowStock = materialInfo && materialInfo.quantity < material.total_qty;
                                                    
                                                    return (
                                                        <tr key={index} className={isLowStock ? 'bg-red-50' : ''}>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {material.material_name}
                                                                {isLowStock && (
                                                                    <span className="ml-2 text-xs text-red-600">
                                                                        <FaExclamationTriangle className="inline mr-1" />
                                                                        Low Stock
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.qty_per_carton}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{material.total_qty}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {/* Error Display */}
                            {error && <p className="text-sm text-red-600">{error}</p>}
                            
                            {/* Submit Button */}
                            <div className="text-right">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Delivery Challan'}
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
                
                {/* Stock Information Card */}
                <div className="lg:col-span-4">
                    <Card title="Stock Information" className="w-full">
                        {calculatedMaterials.length > 0 ? (
                            <div className="space-y-3">
                                <h3 className="text-lg font-bold text-gray-800">Total Material Required</h3>
                                <div className="space-y-2">
                                    {calculatedMaterials.map((material, index) => {
                                        const materialInfo = materials.find(m => m.name === material.material_name);
                                        const isLowStock = materialInfo && materialInfo.quantity < material.total_qty;
                                        
                                        return (
                                            <div key={index} className={`p-3 rounded-md ${isLowStock ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                                                <div className="flex justify-between">
                                                    <span className="font-medium text-gray-700">{material.material_name}</span>
                                                    <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {material.total_qty}
                                                    </span>
                                                </div>
                                                {materialInfo && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Available: <span className={isLowStock ? 'text-red-600 font-medium' : ''}>
                                                            {materialInfo.quantity}
                                                        </span>
                                                    </div>
                                                )}
                                                {isLowStock && (
                                                    <div className="text-xs text-red-600 mt-1 flex items-center">
                                                        <FaExclamationTriangle className="mr-1" />
                                                        Insufficient stock
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500">Select a product and enter carton quantity to see material requirements.</p>
                        )}
                    </Card>
                </div>
            </div>
            
            {/* ✅ UPDATED: Delivery Challan History with PDF and Print Actions */}
            <div className="mt-8 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Delivery Challan History</h2>
                <div className="overflow-x-auto bg-white rounded-lg shadow-md w-full">
                    <table className="min-w-full divide-y divide-gray-200 w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DC No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cartons</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier / Person</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isHistoryLoading ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center text-gray-500">
                                            <FaSpinner className="animate-spin mr-3" size={24} />
                                            <span>Loading History...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                                        No delivery challan records found.
                                    </td>
                                </tr>
                            ) : (
                                records.map((record) => (
                                    <tr key={record._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.dc_no}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{record.unit_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {record.products && record.products.length > 0 ? (
                                                <div>
                                                    {record.products.map((product, index) => (
                                                        <div key={index}>
                                                            {product.product_name} ({product.carton_qty})
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                record.product_name
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {record.products && record.products.length > 0 ? (
                                                record.products.reduce((total, product) => total + (product.carton_qty || 0), 0)
                                            ) : (
                                                record.carton_qty
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                            {getStatusBadge(record.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(record.date)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {record.unit_type === 'Jobber' 
                                                ? (record.supplier_id ? record.supplier_id.name : 'N/A') 
                                                : (record.person_name || 'N/A')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.remarks || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {/* ✅ THREE ACTION BUTTONS - EXACTLY LIKE PURCHASE ORDER */}
                                            <div className="flex items-center space-x-3">
                                                {/* Eye Icon - View Details Modal */}
                                                <button
                                                    onClick={() => handleViewDCDetail(record._id)}
                                                    className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                                    title="View Details"
                                                >
                                                    <FaEye size={18} />
                                                </button>
                                                
                                                {/* Red PDF Icon - Direct Download */}
                                                <button
                                                    onClick={() => handleDownloadPDF(record._id)}
                                                    className="text-red-600 hover:text-red-900 transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <FaFilePdf size={18} />
                                                </button>
                                                
                                                {/* Green Print Icon - Direct Print Preview */}
                                                <button
                                                    onClick={() => handlePrintPDF(record._id)}
                                                    className="text-green-600 hover:text-green-900 transition-colors"
                                                    title="Print PDF"
                                                >
                                                    <FaPrint size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Delivery Challan Detail Modal */}
            <DeliveryChallanDetailModal
                isOpen={isDCDetailModalOpen}
                onClose={() => setIsDCDetailModalOpen(false)}
                deliveryChallanId={selectedDCId}
                onStatusUpdate={handleDCStatusUpdate}
            />
        </div>
    );
};

export default OutgoingPackingMaterials;