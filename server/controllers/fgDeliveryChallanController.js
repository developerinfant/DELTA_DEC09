const mongoose = require('mongoose');
const FinishedGoodsDC = require('../models/FinishedGoodsDC');
const GRN = require('../models/GRN');
const ProductStock = require('../models/ProductStock');
const ProductMaterialMapping = require('../models/ProductMaterialMapping');
const app = require('../server');

// Helper function to generate DC number
const generateDCNumber = async () => {
    const year = new Date().getFullYear();
    const lastChallan = await FinishedGoodsDC.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    let nextNumber = 1;
    if (lastChallan) {
        const lastNumber = parseInt(lastChallan.dc_no.split('-').pop());
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return `FGDC-${year}-${nextNumber.toString().padStart(4, '0')}`;
};

/**
 * @desc    Create a new Finished Goods Delivery Challan
 * @route   POST /api/fg/delivery-challan
 * @access  Private
 */
const createFGDeliveryChallan = async (req, res) => {
    const { 
        dispatch_type, 
        receiver_type, 
        receiver_name, 
        receiver_details, 
        product_name, 
        issue_type,
        quantity,
        carton_quantity,
        piece_quantity, 
        date, 
        remarks 
    } = req.body;

    try {
        console.log(`Creating FG delivery challan with request body:`, req.body);
        console.log(`Validating required fields`);
        // Validate required fields
        if (!dispatch_type || !receiver_type || !product_name || !issue_type) {
            return res.status(400).json({ 
                message: 'Dispatch type, receiver type, product, and issue type are required.' 
            });
        }
        
        // Validate quantities based on issue type
        console.log(`Validating quantities for issue_type: ${issue_type}`);
        if (issue_type === 'Carton' || issue_type === 'Pieces') {
            if (!quantity || quantity <= 0) {
                console.log(`Invalid quantity for ${issue_type}: ${quantity}`);
                return res.status(400).json({ 
                    message: 'Quantity is required and must be greater than 0.' 
                });
            }
        } else if (issue_type === 'Both') {
            console.log(`Validating 'Both' issue type: carton_quantity=${carton_quantity}, piece_quantity=${piece_quantity}`);
            if ((carton_quantity === undefined || carton_quantity === null || carton_quantity < 0) && 
                (piece_quantity === undefined || piece_quantity === null || piece_quantity < 0)) {
                console.log(`Both carton_quantity and piece_quantity are invalid`);
                return res.status(400).json({ 
                    message: 'Either carton quantity or piece quantity is required for "Both" issue type.' 
                });
            }
            
            // At least one of them should be greater than 0
            if ((!carton_quantity || carton_quantity <= 0) && (!piece_quantity || piece_quantity <= 0)) {
                console.log(`Both carton_quantity and piece_quantity are zero or negative`);
                return res.status(400).json({ 
                    message: 'Either carton quantity or piece quantity must be greater than 0.' 
                });
            }
        }
        console.log(`Validation passed`);

        // Validate receiver name is required for Sales and Courier
        if ((dispatch_type === 'Sales' || dispatch_type === 'Courier') && !receiver_name) {
            return res.status(400).json({ 
                message: 'Receiver name is required for Sales and Courier dispatch types.' 
            });
        }

        // Get product mapping to get units per carton
        const productMapping = await ProductMaterialMapping.findOne({ product_name });
        if (!productMapping) {
            return res.status(400).json({ 
                message: `Product mapping not found for ${product_name}` 
            });
        }

        const unitsPerCarton = productMapping.units_per_carton || 1;

        // Get current product stock
        let productStock = await ProductStock.findOne({ productName: product_name });
        if (!productStock) {
            return res.status(400).json({ 
                message: `Product stock not found for ${product_name}` 
            });
        }

        // Validate stock availability based on issue type
        if (issue_type === 'Carton') {
            const qty = quantity || 0;
            if (qty <= 0) {
                return res.status(400).json({ 
                    message: 'Quantity must be greater than 0 for Carton issue type.' 
                });
            }
            if (qty > productStock.available_cartons) {
                return res.status(400).json({ 
                    message: `Insufficient carton stock. Only ${productStock.available_cartons} cartons available.` 
                });
            }
        } else if (issue_type === 'Pieces') {
            const qty = quantity || 0;
            if (qty <= 0) {
                return res.status(400).json({ 
                    message: 'Quantity must be greater than 0 for Pieces issue type.' 
                });
            }
            // Check if we have enough pieces (including available pieces and broken carton pieces)
            const totalAvailablePieces = productStock.available_pieces + productStock.broken_carton_pieces + (productStock.available_cartons * unitsPerCarton);
            if (qty > totalAvailablePieces) {
                return res.status(400).json({ 
                    message: `Insufficient piece stock. Only ${totalAvailablePieces} pieces available.` 
                });
            }
        } else if (issue_type === 'Both') {
            const cartonQty = carton_quantity || 0;
            const pieceQty = piece_quantity || 0;
            
            // Check carton availability
            if (cartonQty > productStock.available_cartons) {
                return res.status(400).json({ 
                    message: `Insufficient carton stock. Only ${productStock.available_cartons} cartons available.` 
                });
            }
            
            // Check piece availability
            // For "Both" issue type, we need to check if we have enough pieces after deducting cartons
            // Available pieces include: available_pieces + broken_carton_pieces + pieces from remaining cartons after deduction
            const remainingCartonsAfterDeduction = productStock.available_cartons - cartonQty;
            const totalAvailablePieces = productStock.available_pieces + productStock.broken_carton_pieces + (remainingCartonsAfterDeduction * unitsPerCarton);
            if (pieceQty > totalAvailablePieces) {
                return res.status(400).json({ 
                    message: `Insufficient piece stock. Only ${totalAvailablePieces} pieces available after carton deduction.` 
                });
            }
        }

        // Generate DC number
        const dc_no = await generateDCNumber();

        // Create delivery challan record with status "Completed"
        const deliveryChallan = new FinishedGoodsDC({
            dc_no,
            dispatch_type,
            receiver_type,
            receiver_name: receiver_name || null,
            receiver_details: receiver_details || null,
            product_name,
            issue_type,
            // For "Both" issue type, we set quantity to the sum of carton equivalent and piece quantities
            // For other issue types, we use the quantity field as is
            quantity: issue_type === 'Both' ? ((carton_quantity || 0) * unitsPerCarton) + (piece_quantity || 0) : (quantity || 0),
            carton_quantity: carton_quantity || 0,
            piece_quantity: piece_quantity || 0,
            units_per_carton: unitsPerCarton,
            available_cartons: productStock.available_cartons || 0,
            available_pieces: productStock.available_pieces || 0,
            date: date ? new Date(date) : new Date(),
            remarks: remarks || null,
            created_by: req.user ? req.user.name : 'System',
            status: 'Dispatched',
            completed_date: new Date() // Set completion date
        });

        const createdChallan = await deliveryChallan.save();

        // Immediately deduct stock based on issue type
        if (issue_type === 'Carton') {
            // Deduct cartons
            productStock.available_cartons -= (quantity || 0);
        } else if (issue_type === 'Pieces') {
            // Handle piece issuance logic
            let piecesToDeduct = quantity || 0;
            
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
                return res.status(400).json({ 
                    message: `Insufficient piece stock. Need ${piecesToDeduct} more pieces.` 
                });
            }
        } else if (issue_type === 'Both') {
            // Handle both carton and piece issuance
            // Deduct cartons first
            productStock.available_cartons -= (carton_quantity || 0);
            
            // Handle piece issuance logic
            if (piece_quantity > 0) {
                let piecesToDeduct = piece_quantity || 0;
                
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
                    return res.status(400).json({ 
                        message: `Insufficient piece stock. Need ${piecesToDeduct} more pieces.` 
                    });
                }
            }
        }
        
        // Ensure no negative values
        productStock.available_cartons = Math.max(0, productStock.available_cartons);
        productStock.available_pieces = Math.max(0, productStock.available_pieces);
        productStock.broken_carton_pieces = Math.max(0, productStock.broken_carton_pieces);
        
        // Save updated stock
        await productStock.save();
        
        // Emit socket event to notify clients of stock update AFTER saving
        try {
            const io = req.app.get('io');
            if (io) {
                // Get updated product stock data
                const updatedProductStock = await ProductStock.findOne({ productName: product_name });
                if (updatedProductStock) {
                    io.emit('stockUpdate', {
                        product_name: product_name,
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

        res.status(201).json({
            message: 'Finished Goods Delivery Challan created successfully.',
            data: { 
                dc_no: createdChallan.dc_no, 
                status: createdChallan.status,
                issue_type: createdChallan.issue_type,
                carton_quantity: createdChallan.carton_quantity,
                piece_quantity: createdChallan.piece_quantity,
                total_quantity: createdChallan.quantity
            }
        });
    } catch (error) {
        console.error(`Error creating FG delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating FG delivery challan' });
    }
};

/**
 * @desc    Get FG delivery challans with filters
 * @route   GET /api/fg/delivery-challan
 * @access  Private
 */
const getFGDeliveryChallans = async (req, res) => {
    try {
        const { dispatchType, product, receiver, startDate, endDate } = req.query;
        let filter = {};

        if (dispatchType) {
            filter.dispatch_type = dispatchType;
        }

        if (product) {
            filter.product_name = { $regex: product, $options: 'i' };
        }

        if (receiver) {
            filter.receiver_name = { $regex: receiver, $options: 'i' };
        }

        if (startDate || endDate) {
            filter.date = {};
            if (startDate) {
                filter.date.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.date.$lte = new Date(endDate);
            }
        }

        const challans = await FinishedGoodsDC.find(filter)
            .sort({ createdAt: -1 });

        res.json(challans);
    } catch (error) {
        console.error(`Error fetching FG delivery challans: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG delivery challans' });
    }
};

/**
 * @desc    Get a single FG delivery challan by ID
 * @route   GET /api/fg/delivery-challan/:id
 * @access  Private
 */
const getFGDeliveryChallanById = async (req, res) => {
    try {
        const challan = await FinishedGoodsDC.findById(req.params.id);

        if (challan) {
            res.json(challan);
        } else {
            res.status(404).json({ message: 'FG Delivery challan not found' });
        }
    } catch (error) {
        console.error(`Error fetching FG delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG delivery challan' });
    }
};

/**
 * @desc    Update a FG delivery challan
 * @route   PUT /api/fg/delivery-challan/:id
 * @access  Private/Admin
 */
const updateFGDeliveryChallan = async (req, res) => {
    const { status } = req.body;

    try {
        const dc = await FinishedGoodsDC.findById(req.params.id);
        if (!dc) {
            return res.status(404).json({ message: 'FG Delivery Challan not found.' });
        }

        // Prevent editing if DC is already dispatched
        if (dc.status === 'Dispatched') {
            return res.status(400).json({ 
                message: 'Cannot modify a dispatched FG Delivery Challan.' 
            });
        }

        // Handle status update
        if (status && status !== dc.status) {
            // Only allow updating to Dispatched or Cancelled status
            if (status !== 'Dispatched' && status !== 'Cancelled') {
                return res.status(400).json({ 
                    message: 'Status can only be updated to Dispatched or Cancelled.' 
                });
            }
            
            dc.status = status;
            
            // If status is being updated to Dispatched, update product stock
            if (status === 'Dispatched') {
                // Get current product stock
                let productStock = await ProductStock.findOne({ productName: dc.product_name });
                if (productStock) {
                    // Apply carton/piece logic based on issue type
                    if (dc.issue_type === 'Carton') {
                        // Deduct cartons
                        productStock.available_cartons -= dc.quantity;
                    } else if (dc.issue_type === 'Pieces') {
                        // Handle piece issuance logic
                        let piecesToDeduct = dc.quantity;
                        
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
                        
                        // If we still need more pieces, break a new carton
                        while (piecesToDeduct > 0 && productStock.available_cartons > 0) {
                            // Break a carton
                            productStock.available_cartons -= 1;
                            productStock.broken_carton_pieces += dc.units_per_carton;
                            
                            // Use pieces from the broken carton
                            const brokenPiecesToUse = Math.min(productStock.broken_carton_pieces, piecesToDeduct);
                            productStock.broken_carton_pieces -= brokenPiecesToUse;
                            piecesToDeduct -= brokenPiecesToUse;
                        }
                        
                        // If we still need more pieces after breaking all cartons, it's an error
                        if (piecesToDeduct > 0) {
                            return res.status(400).json({ 
                                message: `Insufficient piece stock. Need ${piecesToDeduct} more pieces.` 
                            });
                        }
                    } else if (dc.issue_type === 'Both') {
                        // Handle both carton and piece issuance
                        // Deduct cartons
                        productStock.available_cartons -= dc.carton_quantity;
                        
                        // Handle piece issuance logic
                        if (dc.piece_quantity > 0) {
                            let piecesToDeduct = dc.piece_quantity;
                            
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
                            
                            // If we still need more pieces, break a new carton
                            while (piecesToDeduct > 0 && productStock.available_cartons > 0) {
                                // Break a carton
                                productStock.available_cartons -= 1;
                                productStock.broken_carton_pieces += dc.units_per_carton;
                                
                                // Use pieces from the broken carton
                                const brokenPiecesToUse = Math.min(productStock.broken_carton_pieces, piecesToDeduct);
                                productStock.broken_carton_pieces -= brokenPiecesToUse;
                                piecesToDeduct -= brokenPiecesToUse;
                            }
                            
                            // If we still need more pieces after breaking all cartons, it's an error
                            if (piecesToDeduct > 0) {
                                return res.status(400).json({ 
                                    message: `Insufficient piece stock. Need ${piecesToDeduct} more pieces.` 
                                });
                            }
                        }
                    }
                    
                    // Ensure no negative values
                    productStock.available_cartons = Math.max(0, productStock.available_cartons);
                    productStock.available_pieces = Math.max(0, productStock.available_pieces);
                    productStock.broken_carton_pieces = Math.max(0, productStock.broken_carton_pieces);
                    
                    // Save updated stock
                    await productStock.save();
                    
                    // Emit socket event to notify clients of stock update
                    try {
                        const io = req.app.get('io');
                        if (io) {
                            // Get updated product stock data
                            const updatedProductStock = await ProductStock.findOne({ productName: dc.product_name });
                            if (updatedProductStock) {
                                io.emit('stockUpdate', {
                                    product_name: dc.product_name,
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
            }
        }

        const updatedDC = await dc.save();

        res.json(updatedDC);
    } catch (error) {
        console.error(`Error updating FG delivery challan: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating FG delivery challan.' });
    }
};

module.exports = {
    createFGDeliveryChallan,
    getFGDeliveryChallans,
    getFGDeliveryChallanById,
    updateFGDeliveryChallan
};