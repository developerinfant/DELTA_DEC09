const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Supplier = require('../models/Supplier');
const PackingMaterial = require('../models/PackingMaterial');
const RawMaterial = require('../models/RawMaterial');
const GRN = require('../models/GRN');

// A helper function to generate the next PO number
const getNextPONumber = async () => {
    const lastPO = await PurchaseOrder.findOne().sort({ createdAt: -1 });
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    if (!lastPO) {
        return `PO-001/${year.toString().substr(-2)}-${month}`;
    }

    // Extract the sequence number from the last PO number
    const lastPONumber = lastPO.poNumber;
    const lastSequence = parseInt(lastPONumber.split('/')[0].split('-')[1], 10);

    let newSequence = 1;
    if (lastPONumber.includes(`/${year.toString().substr(-2)}-${month}`)) {
        newSequence = lastSequence + 1;
    }

    return `PO-${String(newSequence).padStart(3, '0')}/${year.toString().substr(-2)}-${month}`;
};

// Helper function to convert number to words
const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const numStr = num.toString();
    let result = '';
    
    // Handle thousands
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        result += numberToWords(thousands) + ' Thousand ';
        num = num % 1000;
    }
    
    // Handle hundreds
    if (num >= 100) {
        const hundreds = Math.floor(num / 100);
        result += ones[hundreds] + ' Hundred ';
        num = num % 100;
    }
    
    // Handle tens and ones
    if (num >= 20) {
        const tensDigit = Math.floor(num / 10);
        const onesDigit = num % 10;
        result += tens[tensDigit];
        if (onesDigit > 0) {
            result += ' ' + ones[onesDigit];
        }
    } else if (num >= 10) {
        result += teens[num - 10];
    } else if (num > 0) {
        result += ones[num];
    }
    
    return result.trim();
};

/**
 * @desc    Create a new Purchase Order
 * @route   POST /api/purchase-orders
 * @access  Private
 */
const createPurchaseOrder = async (req, res) => {
    const { 
        supplier, 
        items, 
        expectedDeliveryDate, 
        paymentTerms,
        dispatchFrom,
        destination,
        vehicleNo,
        noOfPacks,
        transport,
        salesman,
        dcNo,
        dcDate,
        deliveryTerms
    } = req.body;

    try {
        if (!supplier || !items || items.length === 0) {
            return res.status(400).json({ message: 'Supplier and at least one item are required.' });
        }

        // Get supplier details
        const supplierDetails = await Supplier.findById(supplier);
        if (!supplierDetails) {
            return res.status(400).json({ message: 'Supplier not found.' });
        }

        const poNumber = await getNextPONumber();

        // Calculate item totals and PO totals
        let taxableAmount = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        
        const processedItems = items.map(item => {
            // Calculate line item values
            const gross = item.quantity * item.rate;
            const discountAmt = gross * (item.discountPercent / 100);
            const taxable = gross - discountAmt;
            const gstAmt = taxable * (item.gstPercent / 100);
            const cgst = gstAmt / 2;
            const sgst = gstAmt / 2;
            const lineTotal = taxable + gstAmt;
            
            // Update totals
            taxableAmount += taxable;
            totalCGST += cgst;
            totalSGST += sgst;
            
            return {
                ...item,
                cgst: parseFloat(cgst.toFixed(2)),
                sgst: parseFloat(sgst.toFixed(2)),
                lineTotal: parseFloat(lineTotal.toFixed(2))
            };
        });
        
        const grandTotal = taxableAmount + totalCGST + totalSGST;
        const roundOff = Math.round(grandTotal) - grandTotal;
        const finalTotal = grandTotal + roundOff;
        const amountInWords = `Rupees ${numberToWords(Math.round(finalTotal))} Only`;

        const poData = {
            poNumber,
            supplier,
            supplierGSTIN: supplierDetails.gstin || '',
            supplierAddress: supplierDetails.address || '',
            supplierPhone: supplierDetails.phoneNumber || '',
            supplierEmail: supplierDetails.email || '',
            dispatchFrom: dispatchFrom || '',
            destination: destination || '',

            vehicleNo: vehicleNo || '',
            noOfPacks: noOfPacks || null,
            transport: transport || '',
            salesman: salesman || '',
            dcNo: dcNo || '',
            dcDate: dcDate || null,
            deliveryTerms: deliveryTerms || '',
            items: processedItems,
            taxableAmount: parseFloat(taxableAmount.toFixed(2)),
            totalCGST: parseFloat(totalCGST.toFixed(2)),
            totalSGST: parseFloat(totalSGST.toFixed(2)),
            grandTotal: parseFloat(grandTotal.toFixed(2)),
            roundOff: parseFloat(roundOff.toFixed(2)),
            amountInWords,
            totalAmount: parseFloat(finalTotal.toFixed(2)),
            expectedDeliveryDate,
            paymentTerms: paymentTerms || 'Net 30',
            status: 'Ordered',
            preparedBy: req.user.name || ''
        };

        if (mongoose.Types.ObjectId.isValid(req.user._id)) {
            poData.createdBy = req.user._id;
        }

        const newPurchaseOrder = new PurchaseOrder(poData);

        const createdPurchaseOrder = await newPurchaseOrder.save();
        res.status(201).json(createdPurchaseOrder);

    } catch (error) {
        console.error(`Error creating PO: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating purchase order.' });
    }
};

/**
 * @desc    Get all Purchase Orders
 * @route   GET /api/purchase-orders
 * @access  Private
 */
const getPurchaseOrders = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) {
            filter.status = { $in: req.query.status.split(',') };
        }
        
        // Filter by material type if specified
        if (req.query.materialType) {
            if (req.query.materialType === 'packing') {
                filter['items.materialModel'] = 'PackingMaterial';
            } else if (req.query.materialType === 'raw') {
                filter['items.materialModel'] = 'RawMaterial';
            }
        }

        const purchaseOrders = await PurchaseOrder.find(filter)
            .populate('supplier', 'name')
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });
        res.json(purchaseOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching purchase orders.' });
    }
};

/**
 * @desc    Get a single Purchase Order by ID
 * @route   GET /api/purchase-orders/:id
 * @access  Private
 */
const getPurchaseOrderById = async (req, res) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id)
            .populate('supplier')
            .populate('items.material')
            .populate('createdBy', 'name')
            .populate('approvedBy', 'name');

        if (purchaseOrder) {
            res.json(purchaseOrder);
        } else {
            res.status(404).json({ message: 'Purchase Order not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

/**
 * @desc    Update a Purchase Order
 * @route   PUT /api/purchase-orders/:id
 * @access  Private
 */
const updatePurchaseOrder = async (req, res) => {
    const { 
        supplier, 
        items, 
        expectedDeliveryDate, 
        paymentTerms, 
        status,
        dispatchFrom,
        destination,
        vehicleNo,
        noOfPacks,
        transport,
        salesman,
        dcNo,
        dcDate,
        deliveryTerms
    } = req.body;

    try {
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found.' });
        }

        // Handle status update specifically
        if (status && status !== po.status) {
            // Update PO status
            po.status = status;
            
            // Sync with GRNs
            await GRN.updateMany(
                { purchaseOrder: po._id },
                { isLocked: status === 'Cancelled' }
            );
        }

        // Update basic details if provided
        if (supplier) po.supplier = supplier;
        if (expectedDeliveryDate) po.expectedDeliveryDate = expectedDeliveryDate;
        if (paymentTerms) po.paymentTerms = paymentTerms;
        if (dispatchFrom) po.dispatchFrom = dispatchFrom;
        if (destination) po.destination = destination;
        if (vehicleNo) po.vehicleNo = vehicleNo;
        if (noOfPacks) po.noOfPacks = noOfPacks;
        if (transport) po.transport = transport;
        if (salesman) po.salesman = salesman;
        if (dcNo) po.dcNo = dcNo;
        if (dcDate) po.dcDate = dcDate;
        if (deliveryTerms) po.deliveryTerms = deliveryTerms;
        
        // If items are being updated
        if (items) {
            // Get supplier details for updated supplier
            const supplierDetails = await Supplier.findById(supplier || po.supplier);
            
            // Calculate item totals and PO totals
            let taxableAmount = 0;
            let totalCGST = 0;
            let totalSGST = 0;
            
            po.items = items.map(item => {
                // Calculate line item values
                const gross = item.quantity * item.rate;
                const discountAmt = gross * (item.discountPercent / 100);
                const taxable = gross - discountAmt;
                const gstAmt = taxable * (item.gstPercent / 100);
                const cgst = gstAmt / 2;
                const sgst = gstAmt / 2;
                const lineTotal = taxable + gstAmt;
                
                // Update totals
                taxableAmount += taxable;
                totalCGST += cgst;
                totalSGST += sgst;
                
                return {
                    ...item,
                    cgst: parseFloat(cgst.toFixed(2)),
                    sgst: parseFloat(sgst.toFixed(2)),
                    lineTotal: parseFloat(lineTotal.toFixed(2))
                };
            });
            
            const grandTotal = taxableAmount + totalCGST + totalSGST;
            const roundOff = Math.round(grandTotal) - grandTotal;
            const finalTotal = grandTotal + roundOff;
            const amountInWords = `Rupees ${numberToWords(Math.round(finalTotal))} Only`;
            
            po.taxableAmount = parseFloat(taxableAmount.toFixed(2));
            po.totalCGST = parseFloat(totalCGST.toFixed(2));
            po.totalSGST = parseFloat(totalSGST.toFixed(2));
            po.grandTotal = parseFloat(grandTotal.toFixed(2));
            po.roundOff = parseFloat(roundOff.toFixed(2));
            po.amountInWords = amountInWords;
            po.totalAmount = parseFloat(finalTotal.toFixed(2));
            
            // Update supplier details
            if (supplierDetails) {
                po.supplierGSTIN = supplierDetails.gstin || '';
                po.supplierAddress = supplierDetails.address || '';
                po.supplierPhone = supplierDetails.phoneNumber || '';
                po.supplierEmail = supplierDetails.email || '';
            }
        }

        const updatedPO = await po.save();
        res.json(updatedPO);

    } catch (error) {
        console.error(`Error updating PO: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating purchase order.' });
    }
};

/**
 * @desc    Update PO status (cancel/re-order) with smart logic based on GRN status
 * @route   PUT /api/purchase-orders/:id/status
 * @access  Private/Admin
 */
const updatePurchaseOrderStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const po = await PurchaseOrder.findById(req.params.id);

        if (!po) {
            return res.status(404).json({ message: 'Purchase Order not found.' });
        }

        // Validate status
        if (!['Ordered', 'Cancelled'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Must be "Ordered" or "Cancelled".' });
        }

        // Smart Cancel Logic based on GRN status
        if (status === 'Cancelled') {
            // Check if there are any GRNs for this PO
            const grns = await GRN.find({ purchaseOrder: po._id });
            
            // If there are GRNs, check their status
            if (grns.length > 0) {
                // Check if any GRN is Completed
                const completedGRN = grns.find(grn => grn.status === 'Completed');
                
                if (completedGRN) {
                    // If any GRN is Completed, prevent cancellation
                    return res.status(400).json({ 
                        message: 'Cannot cancel — GRN fully completed.',
                        grnStatus: 'Completed'
                    });
                }
                
                // If no GRN is Completed, proceed with cancellation
                // Lock all existing GRNs
                await GRN.updateMany(
                    { purchaseOrder: po._id },
                    { isLocked: true }
                );
            }
        } 
        // Re-Order Logic
        else if (status === 'Ordered' && po.status === 'Cancelled') {
            // When re-ordering, unlock any locked GRNs
            await GRN.updateMany(
                { purchaseOrder: po._id, isLocked: true },
                { isLocked: false }
            );
        }

        // Update PO status
        po.status = status;
        const updatedPO = await po.save();
        
        res.json({ 
            success: true, 
            status: updatedPO.status,
            message: status === 'Ordered' && po.status === 'Cancelled' 
                ? `PO ${po.poNumber} has been re-ordered successfully. GRN entry unlocked.` 
                : `PO ${po.poNumber} marked as ${po.status}`
        });

    } catch (error) {
        console.error(`Error updating PO status: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating purchase order status.' });
    }
};

/**
 * @desc    Delete a Purchase Order
 * @route   DELETE /api/purchase-orders/:id
 * @access  Private/Admin
 */
const deletePurchaseOrder = async (req, res) => {
    try {
        const po = await PurchaseOrder.findById(req.params.id);
        if (po) {
            await po.deleteOne();
            res.json({ message: 'Purchase Order removed successfully.' });
        } else {
            res.status(404).json({ message: 'Purchase Order not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error.' });
    }
};

/**
 * @desc    Get weekly PO statistics
 * @route   GET /api/purchase-orders/weekly-stats
 * @access  Private
 */
const getWeeklyPOStats = async (req, res) => {
    try {
        // Get the date 7 days ago
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Get all POs from the last week
        const pos = await PurchaseOrder.find({
            createdAt: { $gte: oneWeekAgo }
        }).select('createdAt status');
        
        // Initialize data structure for each day of the week
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const stats = {};
        
        // Initialize each day with default values
        for (let i = 0; i < 7; i++) {
            const date = new Date(oneWeekAgo);
            date.setDate(date.getDate() + i);
            const dayName = days[date.getDay()];
            stats[dayName] = {
                date: dayName,
                created: 0,
                approved: 0,
                pending: 0
            };
        }
        
        // Process POs and populate stats
        pos.forEach(po => {
            const dayName = days[po.createdAt.getDay()];
            if (stats[dayName]) {
                stats[dayName].created += 1;
                if (po.status === 'Approved') {
                    stats[dayName].approved += 1;
                } else if (po.status === 'Ordered' || po.status === 'Pending') {
                    stats[dayName].pending += 1;
                }
            }
        });
        
        // Convert to array and sort by day order
        const result = Object.values(stats);
        res.json(result);
    } catch (error) {
        console.error(`Error fetching weekly PO stats: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching PO statistics.' });
    }
};

module.exports = {
    createPurchaseOrder,
    getPurchaseOrders,
    getPurchaseOrderById,
    updatePurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    getWeeklyPOStats,
};