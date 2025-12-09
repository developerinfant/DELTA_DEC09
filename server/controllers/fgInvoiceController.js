const mongoose = require('mongoose');
const FGInvoice = require('../models/FGInvoice');
const FGBuyer = require('../models/FGBuyer');
const ProductStock = require('../models/ProductStock');
const ProductMaterialMapping = require('../models/ProductMaterialMapping');

// Helper function to generate invoice number
const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const nextYear = (parseInt(year) + 1).toString().padStart(2, '0');
    const financialYear = `${year}-${nextYear}`;
    
    const lastInvoice = await FGInvoice.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    let nextNumber = 1;
    if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoiceNo.split('/')[0].substring(1));
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return `S${nextNumber.toString().padStart(5, '0')}/${financialYear}`;
};

// Helper function to generate IRN (placeholder)
const generateIRN = () => {
    return 'IRN' + Math.random().toString(36).substring(2, 15).toUpperCase();
};

// Helper function to convert number to words
const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    let words = '';
    
    if (Math.floor(num / 10000000) > 0) {
        words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
        num %= 10000000;
    }
    
    if (Math.floor(num / 100000) > 0) {
        words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
        num %= 100000;
    }
    
    if (Math.floor(num / 1000) > 0) {
        words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }
    
    if (Math.floor(num / 100) > 0) {
        words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
    }
    
    if (num > 0) {
        if (num < 10) {
            words += ones[num];
        } else if (num < 20) {
            words += teens[num - 10];
        } else {
            words += tens[Math.floor(num / 10)];
            if (num % 10 > 0) {
                words += ' ' + ones[num % 10];
            }
        }
    }
    
    return words.trim();
};

// Helper function to calculate invoice totals with dynamic GST based on buyer state
const calculateInvoiceTotals = (items, schemeDiscount, gstType) => {
    // Calculate total amount from items
    const totalAmount = items.reduce((sum, item) => {
        const itemAmount = (item.qty * item.rate) * (1 - item.discPercent / 100);
        return sum + itemAmount;
    }, 0);
    
    // Calculate taxable amount after scheme discount
    const taxableAmount = totalAmount - schemeDiscount;
    
    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    
    // Calculate GST based on buyer state
    if (gstType === 'CGST+SGST') {
        // Tamil Nadu - CGST 2.5% + SGST 2.5%
        cgstPercent = 2.5;
        sgstPercent = 2.5;
        cgstAmount = taxableAmount * (cgstPercent / 100);
        sgstAmount = taxableAmount * (sgstPercent / 100);
    } else if (gstType === 'IGST') {
        // Other states - IGST 5%
        igstPercent = 5;
        igstAmount = taxableAmount * (igstPercent / 100);
    }
    
    // Calculate total with taxes
    const totalWithTax = taxableAmount + cgstAmount + sgstAmount + igstAmount;
    
    // Round to nearest integer and calculate round off
    const roundedTotal = Math.round(totalWithTax);
    const roundOff = roundedTotal - totalWithTax;
    
    return {
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        taxableAmount: parseFloat(taxableAmount.toFixed(2)),
        gstType,
        cgstPercent,
        sgstPercent,
        igstPercent,
        cgstAmount: parseFloat(cgstAmount.toFixed(2)),
        sgstAmount: parseFloat(sgstAmount.toFixed(2)),
        igstAmount: parseFloat(igstAmount.toFixed(2)),
        roundOff: parseFloat(roundOff.toFixed(2)),
        grandTotal: parseFloat(roundedTotal.toFixed(2))
    };
};

// Helper function to deduct stock based on UOM and quantity
const deductStock = async (productName, uom, quantity) => {
    // Get product mapping to get units per carton
    const productMapping = await ProductMaterialMapping.findOne({ product_name: productName });
    if (!productMapping) {
        throw new Error(`Product mapping not found for ${productName}`);
    }
    
    const unitsPerCarton = productMapping.units_per_carton || 1;
    
    // Get current product stock
    let productStock = await ProductStock.findOne({ productName: productName });
    if (!productStock) {
        throw new Error(`Product stock not found for ${productName}`);
    }
    
    // Validate stock availability based on UOM
    if (uom === 'Cartons') {
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0 for Cartons UOM.');
        }
        if (quantity > productStock.available_cartons) {
            throw new Error(`Insufficient carton stock. Only ${productStock.available_cartons} cartons available.`);
        }
        // Deduct cartons
        productStock.available_cartons -= quantity;
    } else if (uom === 'Pieces') {
        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0 for Pieces UOM.');
        }
        // Check if we have enough pieces (including available pieces and broken carton pieces)
        const totalAvailablePieces = productStock.available_pieces + productStock.broken_carton_pieces + (productStock.available_cartons * unitsPerCarton);
        if (quantity > totalAvailablePieces) {
            throw new Error(`Insufficient piece stock. Only ${totalAvailablePieces} pieces available.`);
        }
        
        // Handle piece deduction logic
        let piecesToDeduct = quantity;
        
        // First, try to deduct from broken carton pieces (loose pieces from broken cartons)
        if (productStock.broken_carton_pieces > 0) {
            const brokenPiecesToUse = Math.min(productStock.broken_carton_pieces, piecesToDeduct);
            productStock.broken_carton_pieces -= brokenPiecesToUse;
            piecesToDeduct -= brokenPiecesToUse;
        }
        
        // If we still need more pieces, use available_pieces (loose pieces)
        if (piecesToDeduct > 0 && productStock.available_pieces > 0) {
            const loosePiecesToUse = Math.min(productStock.available_pieces, piecesToDeduct);
            productStock.available_pieces -= loosePiecesToUse;
            piecesToDeduct -= loosePiecesToUse;
        }
        
        // If we still need more pieces, break new cartons
        while (piecesToDeduct > 0 && productStock.available_cartons > 0) {
            // Break a carton
            productStock.available_cartons -= 1;
            productStock.broken_carton_pieces += unitsPerCarton;
            
            // Use pieces from the broken carton
            const brokenPiecesToUse = Math.min(productStock.broken_carton_pieces, piecesToDeduct);
            productStock.broken_carton_pieces -= brokenPiecesToUse;
            piecesToDeduct -= brokenPiecesToUse;
        }
        
        // If we still need more pieces after breaking all cartons, it's an error
        if (piecesToDeduct > 0) {
            throw new Error(`Insufficient piece stock. Need ${piecesToDeduct} more pieces.`);
        }
    }
    
    // Ensure no negative values
    productStock.available_cartons = Math.max(0, productStock.available_cartons);
    productStock.available_pieces = Math.max(0, productStock.available_pieces);
    productStock.broken_carton_pieces = Math.max(0, productStock.broken_carton_pieces);
    
    // Save updated stock
    await productStock.save();
    
    return productStock;
};

/**
 * @desc    Create a new FG Invoice
 * @route   POST /api/fg/invoices
 * @access  Private
 */
const createFGInvoice = async (req, res) => {
    const { 
        invoiceDate,
        buyerId,
        billedTo,
        shippedTo,
        dispatchFrom,
        noOfPackages,
        transportName,
        termsOfPayment,
        destination,
        poNoDate,
        deliveryChallanNoDate,
        salesman,
        items,
        schemeDiscount
    } = req.body;

    try {
        // Validate required fields
        if (!invoiceDate || !buyerId || !billedTo || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                message: 'Invoice date, buyer, billed to address, and items are required.' 
            });
        }

        // Validate buyer exists and get GST type
        const buyer = await FGBuyer.findById(buyerId);
        if (!buyer) {
            return res.status(404).json({ 
                message: 'Buyer not found.' 
            });
        }

        // Validate stock availability for all items before creating invoice
        const stockUpdates = [];
        for (const item of items) {
            try {
                // Validate item fields
                if (!item.product || !item.uom || item.qty === undefined) {
                    return res.status(400).json({ 
                        message: 'Product, UOM, and quantity are required for all items.' 
                    });
                }
                
                // Validate stock availability
                const productMapping = await ProductMaterialMapping.findOne({ product_name: item.product });
                if (!productMapping) {
                    return res.status(400).json({ 
                        message: `Product mapping not found for ${item.product}` 
                    });
                }
                
                const unitsPerCarton = productMapping.units_per_carton || 1;
                const productStock = await ProductStock.findOne({ productName: item.product });
                if (!productStock) {
                    return res.status(400).json({ 
                        message: `Product stock not found for ${item.product}` 
                    });
                }
                
                if (item.uom === 'Cartons') {
                    if (item.qty > productStock.available_cartons) {
                        return res.status(400).json({ 
                            message: `Insufficient carton stock for ${item.product}. Only ${productStock.available_cartons} cartons available.` 
                        });
                    }
                } else if (item.uom === 'Pieces') {
                    const totalAvailablePieces = productStock.available_pieces + productStock.broken_carton_pieces + (productStock.available_cartons * unitsPerCarton);
                    if (item.qty > totalAvailablePieces) {
                        return res.status(400).json({ 
                            message: `Insufficient piece stock for ${item.product}. Only ${totalAvailablePieces} pieces available.` 
                        });
                    }
                }
            } catch (stockError) {
                return res.status(400).json({ 
                    message: stockError.message 
                });
            }
        }

        // Calculate financial values with dynamic GST based on buyer state
        const calculatedTotals = calculateInvoiceTotals(items, schemeDiscount || 0, buyer.gstType);
        
        // Generate invoice number
        const invoiceNo = await generateInvoiceNumber();
        
        // Generate E-Invoice details
        const irn = generateIRN();
        const ackNo = 'ACK' + Math.floor(Math.random() * 1000000000);
        const ackDate = new Date();
        const eWayBillNo = 'EWB' + Math.floor(Math.random() * 1000000000);
        const eWayBillDate = new Date();
        const vehicleNo = 'TN' + Math.floor(Math.random() * 100) + 'XX' + Math.floor(Math.random() * 10000);

        // Convert grand total to words
        const amountInWords = `INR ${numberToWords(Math.round(calculatedTotals.grandTotal))} Only`;

        // Create invoice record
        const invoice = new FGInvoice({
            invoiceNo,
            invoiceDate: new Date(invoiceDate),
            buyerId,
            buyerName: buyer.name,
            buyerGstin: buyer.gstin || null,
            buyerContactNo: buyer.phoneNumber || null,
            billedTo,
            shippedTo: shippedTo || billedTo,
            dispatchFrom: dispatchFrom || null,
            noOfPackages: noOfPackages || null,
            transportName: transportName || buyer.transportName || null,
            // Map buyer payment terms to invoice terms
            termsOfPayment: (() => {
                if (termsOfPayment) return termsOfPayment; // Use explicitly provided terms
                // Map buyer's paymentTerms to invoice terms
                if (buyer.paymentTerms === 'Net 15' || buyer.paymentTerms === 'Net 30') {
                    return 'Credit';
                } else if (buyer.paymentTerms === 'Advance') {
                    return 'Advance';
                }
                return null;
            })(),
            destination: destination || buyer.destination || null,
            poNoDate: poNoDate || null,
            deliveryChallanNoDate: deliveryChallanNoDate || null,
            salesman: salesman || null,
            items,
            schemeDiscount: schemeDiscount || 0,
            taxableAmount: calculatedTotals.taxableAmount,
            gstType: calculatedTotals.gstType,
            cgstPercent: calculatedTotals.cgstPercent,
            sgstPercent: calculatedTotals.sgstPercent,
            igstPercent: calculatedTotals.igstPercent,
            cgstAmount: calculatedTotals.cgstAmount,
            sgstAmount: calculatedTotals.sgstAmount,
            igstAmount: calculatedTotals.igstAmount,
            roundOff: calculatedTotals.roundOff,
            grandTotal: calculatedTotals.grandTotal,
            amountInWords,
            irn,
            ackNo,
            ackDate,
            eWayBillNo,
            eWayBillDate,
            vehicleNo,
            createdBy: req.user ? req.user.name : 'System'
        });

        const createdInvoice = await invoice.save();

        // Deduct stock for all items after successful invoice creation
        for (const item of items) {
            const updatedStock = await deductStock(item.product, item.uom, item.qty);
            stockUpdates.push(updatedStock);
            
            // Emit socket event to notify clients of stock update
            try {
                const io = req.app.get('io');
                if (io) {
                    // Get updated product stock data
                    const updatedProductStock = await ProductStock.findOne({ productName: item.product });
                    if (updatedProductStock) {
                        io.emit('stockUpdate', {
                            product_name: item.product,
                            available_cartons: updatedProductStock.available_cartons,
                            available_pieces: updatedProductStock.available_pieces,
                            broken_carton_pieces: updatedProductStock.broken_carton_pieces,
                            units_per_carton: updatedProductStock.units_per_carton,
                            totalAvailable: updatedProductStock.totalAvailable,
                            lastUpdated: updatedProductStock.lastUpdated
                        });
                    }
                }
            } catch (socketError) {
                console.error('Error emitting socket event:', socketError.message);
                // Don't fail the request if socket emission fails
            }
        }

        res.status(201).json({
            message: 'Invoice created successfully.',
            data: createdInvoice
        });
    } catch (error) {
        console.error(`Error creating FG invoice: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating FG invoice' });
    }
};

/**
 * @desc    Get FG invoices with filters
 * @route   GET /api/fg/invoices
 * @access  Private
 */
const getFGInvoices = async (req, res) => {
    try {
        const { status, search } = req.query;
        let filter = {};

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { invoiceNo: { $regex: search, $options: 'i' } },
                { buyerName: { $regex: search, $options: 'i' } }
            ];
        }

        const invoices = await FGInvoice.find(filter)
            .populate('buyerId', 'name gstin')
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (error) {
        console.error(`Error fetching FG invoices: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG invoices' });
    }
};

/**
 * @desc    Get a single FG invoice by ID
 * @route   GET /api/fg/invoices/:id
 * @access  Private
 */
const getFGInvoiceById = async (req, res) => {
    try {
        const invoice = await FGInvoice.findById(req.params.id)
            .populate('buyerId', 'name gstin state');

        if (invoice) {
            res.json(invoice);
        } else {
            res.status(404).json({ message: 'FG Invoice not found' });
        }
    } catch (error) {
        console.error(`Error fetching FG invoice: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG invoice' });
    }
};

/**
 * @desc    Update a FG invoice
 * @route   PUT /api/fg/invoices/:id
 * @access  Private/Admin
 */
const updateFGInvoice = async (req, res) => {
    const { 
        invoiceDate,
        buyerId,
        billedTo,
        shippedTo,
        dispatchFrom,
        noOfPackages,
        transportName,
        termsOfPayment,
        destination,
        poNoDate,
        deliveryChallanNoDate,
        salesman,
        items,
        schemeDiscount,
        status
    } = req.body;

    try {
        const invoice = await FGInvoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'FG Invoice not found.' });
        }

        // Validate buyer exists and get GST type if buyer is being changed
        let buyer = null;
        let gstType = invoice.gstType; // Default to existing GST type
        
        if (buyerId && buyerId !== invoice.buyerId.toString()) {
            buyer = await FGBuyer.findById(buyerId);
            if (!buyer) {
                return res.status(404).json({ 
                    message: 'Buyer not found.' 
                });
            }
            gstType = buyer.gstType; // Use new buyer's GST type
        } else if (buyerId) {
            buyer = await FGBuyer.findById(buyerId);
            if (buyer) {
                gstType = buyer.gstType; // Use existing buyer's GST type
            }
        }

        // Calculate financial values with dynamic GST based on buyer state
        const calculatedTotals = calculateInvoiceTotals(items, schemeDiscount || 0, gstType);

        // Update invoice fields
        if (invoiceDate !== undefined) invoice.invoiceDate = new Date(invoiceDate);
        if (buyerId !== undefined) invoice.buyerId = buyerId;
        if (billedTo !== undefined) invoice.billedTo = billedTo;
        if (shippedTo !== undefined) invoice.shippedTo = shippedTo;
        if (dispatchFrom !== undefined) invoice.dispatchFrom = dispatchFrom;
        if (noOfPackages !== undefined) invoice.noOfPackages = noOfPackages;
        if (transportName !== undefined) invoice.transportName = transportName;
        if (termsOfPayment !== undefined) {
            invoice.termsOfPayment = termsOfPayment;
        } else if (buyer && buyer.paymentTerms !== undefined) {
            // Map buyer payment terms to invoice terms if not explicitly provided
            if (buyer.paymentTerms === 'Net 15' || buyer.paymentTerms === 'Net 30') {
                invoice.termsOfPayment = 'Credit';
            } else if (buyer.paymentTerms === 'Advance') {
                invoice.termsOfPayment = 'Advance';
            }
        }
        if (destination !== undefined) invoice.destination = destination;
        if (poNoDate !== undefined) invoice.poNoDate = poNoDate;
        if (deliveryChallanNoDate !== undefined) invoice.deliveryChallanNoDate = deliveryChallanNoDate;
        if (salesman !== undefined) invoice.salesman = salesman;
        if (items !== undefined) invoice.items = items;
        if (schemeDiscount !== undefined) invoice.schemeDiscount = schemeDiscount;
        if (status !== undefined) invoice.status = status;
        
        // Update calculated financial fields
        invoice.taxableAmount = calculatedTotals.taxableAmount;
        invoice.gstType = calculatedTotals.gstType;
        invoice.cgstPercent = calculatedTotals.cgstPercent;
        invoice.sgstPercent = calculatedTotals.sgstPercent;
        invoice.igstPercent = calculatedTotals.igstPercent;
        invoice.cgstAmount = calculatedTotals.cgstAmount;
        invoice.sgstAmount = calculatedTotals.sgstAmount;
        invoice.igstAmount = calculatedTotals.igstAmount;
        invoice.roundOff = calculatedTotals.roundOff;
        invoice.grandTotal = calculatedTotals.grandTotal;
        
        // Update amount in words
        invoice.amountInWords = `INR ${numberToWords(Math.round(calculatedTotals.grandTotal))} Only`;

        const updatedInvoice = await invoice.save();

        res.json({
            message: 'Invoice updated successfully.',
            data: updatedInvoice
        });
    } catch (error) {
        console.error(`Error updating FG invoice: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating FG invoice.' });
    }
};

/**
 * @desc    Delete a FG invoice
 * @route   DELETE /api/fg/invoices/:id
 * @access  Private/Admin
 */
const deleteFGInvoice = async (req, res) => {
    try {
        const invoice = await FGInvoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ message: 'FG Invoice not found.' });
        }

        await invoice.remove();

        res.json({ message: 'Invoice deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting FG invoice: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting FG invoice.' });
    }
};

module.exports = {
    createFGInvoice,
    getFGInvoices,
    getFGInvoiceById,
    updateFGInvoice,
    deleteFGInvoice
};