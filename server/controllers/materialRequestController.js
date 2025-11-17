const MaterialRequest = require('../models/MaterialRequest');
const ProductStock = require('../models/ProductStock');

// Helper function to generate unique request ID
const generateRequestId = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    // Get the count of requests for today
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const count = await MaterialRequest.countDocuments({
        createdAt: {
            $gte: today,
            $lt: tomorrow
        }
    });
    
    const counter = (count + 1).toString().padStart(3, '0');
    return `MR-${year}${month}${day}-${counter}`;
};

/**
 * @desc    Create a new material request
 * @route   POST /api/material-requests
 * @access  Private (Finished Goods)
 */
const createMaterialRequest = async (req, res) => {
    try {
        const { productId, requiredQty, remarks, priority } = req.body;
        
        // Get the requester from the authenticated user
        const requester = req.user.name; // Assuming user info is in req.user
        
        // Find the product
        const product = await ProductStock.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        // Generate unique request ID
        const requestId = await generateRequestId();
        
        // Create the material request
        const materialRequest = new MaterialRequest({
            requestId,
            productId,
            productName: product.productName,
            requiredQty,
            requester,
            remarks: remarks || '',
            priority
        });
        
        const createdRequest = await materialRequest.save();
        res.status(201).json(createdRequest);
    } catch (error) {
        console.error(`Error creating material request: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating material request' });
    }
};

/**
 * @desc    Get all material requests
 * @route   GET /api/material-requests
 * @access  Private (Packing)
 */
const getMaterialRequests = async (req, res) => {
    try {
        const requests = await MaterialRequest.find({}).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        console.error(`Error fetching material requests: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching material requests' });
    }
};

/**
 * @desc    Get material request by ID
 * @route   GET /api/material-requests/:id
 * @access  Private
 */
const getMaterialRequestById = async (req, res) => {
    try {
        const request = await MaterialRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Material request not found' });
        }
        res.json(request);
    } catch (error) {
        console.error(`Error fetching material request: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching material request' });
    }
};

/**
 * @desc    Update material request status
 * @route   PUT /api/material-requests/:id/status
 * @access  Private (Packing)
 */
const updateMaterialRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'Approved', 'Rejected', 'Completed'];
        
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        
        const request = await MaterialRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Material request not found' });
        }
        
        request.status = status;
        const updatedRequest = await request.save();
        res.json(updatedRequest);
    } catch (error) {
        console.error(`Error updating material request status: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating material request status' });
    }
};

/**
 * @desc    Delete material request
 * @route   DELETE /api/material-requests/:id
 * @access  Private (Admin)
 */
const deleteMaterialRequest = async (req, res) => {
    try {
        const request = await MaterialRequest.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: 'Material request not found' });
        }
        
        await request.remove();
        res.json({ message: 'Material request removed' });
    } catch (error) {
        console.error(`Error deleting material request: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting material request' });
    }
};

module.exports = {
    createMaterialRequest,
    getMaterialRequests,
    getMaterialRequestById,
    updateMaterialRequestStatus,
    deleteMaterialRequest
};