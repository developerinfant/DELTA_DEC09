const mongoose = require('mongoose');
const ProductDC = require('../models/ProductDC');
const FinishedGood = require('../models/FinishedGood');

// Helper function to generate invoice number
const generateInvoiceNo = async () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Format: S01060/25-26 (example)
    const financialYearStart = year.toString().slice(-2);
    const financialYearEnd = (year + 1).toString().slice(-2);
    
    // Find the last invoice number for this month
    const lastInvoice = await ProductDC.findOne({
        invoiceNo: new RegExp(`^S\\d+/${financialYearStart}-${financialYearEnd}$`)
    }).sort({ createdAt: -1 });
    
    let sequence = 1;
    if (lastInvoice) {
        const lastSequence = parseInt(lastInvoice.invoiceNo.match(/S(\d+)/)[1], 10);
        sequence = lastSequence + 1;
    }
    
    return `S${String(sequence).padStart(5, '0')}/${financialYearStart}-${financialYearEnd}`;
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

/**
 * @desc    Create a new Product DC (Dispatch Certificate) / Invoice
 * @route   POST /api/products/dc/create
 * @access  Private
 */
const createProductDC = async (req, res) => {
    const {
        customerName,
        customerAddress,
        customerGST,
        contactNo,
        transport,
        vehicleNo,
        destination,
        paymentTerms,
        items,
        remarks,
        generatedBy
    } = req.body;

    try {
        // Generate invoice number
        const invoiceNo = await generateInvoiceNo();
        const invoiceDate = new Date();

        // Validate items and check stock availability
        const dispatchedItems = [];
        let totalTaxable = 0;
        let totalGST = 0;
        let grandTotal = 0;

        // Process each item
        for (const item of items) {
            // Find the finished good
            const finishedGood = await FinishedGood.findOne({
                productCode: item.productCode,
                quantityAvailable: { $gte: item.qty }
            });

            if (!finishedGood) {
                return res.status(400).json({
                    message: `Insufficient stock for product ${item.productName} (${item.productCode})`
                });
            }

            // Calculate item amount
            const discountAmount = (item.rate * item.qty * item.discount) / 100;
            const taxableAmount = (item.rate * item.qty) - discountAmount;
            const gstAmount = (taxableAmount * item.gst) / 100;
            const itemAmount = taxableAmount + gstAmount;

            // Update item with calculated values
            item.amount = itemAmount;

            // Add to totals
            totalTaxable += taxableAmount;
            totalGST += gstAmount;
            grandTotal += itemAmount;

            // Track dispatched items for stock reduction
            dispatchedItems.push({
                finishedGood: finishedGood._id,
                qtySent: item.qty
            });
        }

        // Create Product DC entry
        const productDC = new ProductDC({
            invoiceNo,
            invoiceDate,
            customerName,
            customerAddress,
            customerGST,
            contactNo,
            transport,
            vehicleNo,
            destination,
            paymentTerms,
            items,
            totalTaxable,
            totalGST,
            grandTotal,
            remarks,
            generatedBy,
            dispatchedItems
        });

        const createdProductDC = await productDC.save();

        // Reduce stock for dispatched items
        for (const dispatchedItem of dispatchedItems) {
            const finishedGood = await FinishedGood.findById(dispatchedItem.finishedGood);
            if (finishedGood) {
                finishedGood.quantityAvailable -= dispatchedItem.qtySent;
                
                // Update status if quantity reaches zero
                if (finishedGood.quantityAvailable === 0) {
                    finishedGood.status = 'Dispatched';
                } else if (finishedGood.quantityAvailable < finishedGood.quantityProduced) {
                    finishedGood.status = 'Reserved';
                }
                
                await finishedGood.save();
            }
        }

        res.status(201).json({
            message: 'Product DC created successfully',
            productDC: createdProductDC
        });
    } catch (error) {
        console.error(`Error creating product DC: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating product DC' });
    }
};

/**
 * @desc    Get all Product DCs
 * @route   GET /api/products/dc/list
 * @access  Private
 */
const getProductDCs = async (req, res) => {
    try {
        const productDCs = await ProductDC.find().sort({ createdAt: -1 });
        res.json(productDCs);
    } catch (error) {
        console.error(`Error fetching product DCs: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product DCs' });
    }
};

/**
 * @desc    Get a specific Product DC by ID
 * @route   GET /api/products/dc/:id
 * @access  Private
 */
const getProductDCById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product DC ID' });
        }

        const productDC = await ProductDC.findById(id);
        if (!productDC) {
            return res.status(404).json({ message: 'Product DC not found' });
        }

        res.json(productDC);
    } catch (error) {
        console.error(`Error fetching product DC: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product DC' });
    }
};

/**
 * @desc    Generate PDF for a Product DC (placeholder - will be handled on client-side)
 * @route   GET /api/products/dc/:id/pdf
 * @access  Private
 */
const generateProductDCPDF = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid product DC ID' });
        }

        const productDC = await ProductDC.findById(id);
        if (!productDC) {
            return res.status(404).json({ message: 'Product DC not found' });
        }

        // Return the product DC data so the client can generate the PDF
        res.json({
            message: 'Product DC data retrieved successfully',
            productDC: productDC
        });
    } catch (error) {
        console.error(`Error fetching product DC for PDF: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching product DC for PDF' });
    }
};

module.exports = {
    createProductDC,
    getProductDCs,
    getProductDCById,
    generateProductDCPDF
};