const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');

/**
 * @desc    Generate next supplier code
 * @access  Private
 */
const generateSupplierCode = async () => {
  let nextNumber = 1;
  let supplierCode = `SUP-${String(nextNumber).padStart(5, '0')}`;
  
  // Keep incrementing until we find a unique code
  while (await Supplier.exists({ supplierCode })) {
    nextNumber++;
    supplierCode = `SUP-${String(nextNumber).padStart(5, '0')}`;
  }
  
  return supplierCode;
};

/**
 * @desc    Create a new supplier
 * @route   POST /api/suppliers
 * @access  Private
 */
const createSupplier = async (req, res) => {
    const { 
        name, 
        supplierType,
        contactPerson, 
        phoneNumber,
        email, 
        address, 
        gstin,
        panNumber,
        businessCategory,
        state,
        country,
        bankName,
        branch,
        accountNumber,
        ifscCode,
        upiId,
        paymentTerms,
        notes,
        materialType 
    } = req.body;

    try {
        console.log('Creating supplier with data:', req.body);
        const supplierExists = await Supplier.findOne({ name });
        if (supplierExists) {
            console.log('Supplier already exists:', name);
            return res.status(400).json({ message: 'A supplier with this name already exists' });
        }

        const supplierCode = await generateSupplierCode();
        console.log('Generated supplier code:', supplierCode);

        // Validate email format before saving
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (email && !emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please provide a valid email address' });
        }

        // Handle materialType validation - convert empty string to undefined
        let validatedMaterialType = materialType;
        if (materialType === '') {
            validatedMaterialType = undefined;
        }

        const supplier = new Supplier({
            name,
            supplierCode,
            supplierType,
            contactPerson,
            phoneNumber,
            email,
            address,
            gstin,
            panNumber,
            businessCategory,
            state,
            country,
            bankName,
            branch,
            accountNumber,
            ifscCode,
            upiId,
            paymentTerms,
            notes,
            materialType: validatedMaterialType
        });

        console.log('Saving supplier:', supplier);
        const createdSupplier = await supplier.save();
        console.log('Supplier created successfully:', createdSupplier);
        res.status(201).json(createdSupplier);

    } catch (error) {
        console.error(`Error creating supplier: ${error.message}`);
        console.error('Error stack:', error.stack);
        
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: 'Server error while creating supplier' });
    }
};

/**
 * @desc    Get all suppliers with filtering based on supplier type
 * @route   GET /api/suppliers
 * @access  Private
 */
const getSuppliers = async (req, res) => {
    try {
        const { supplierType } = req.query;
        
        // If no supplier type filter is specified, return all suppliers
        if (!supplierType) {
            const suppliers = await Supplier.find({});
            res.json(suppliers);
            return;
        }
        
        // Filter suppliers based on supplier type
        let filter = {};
        
        switch(supplierType) {
            case 'Packing Material Purchase Order':
                filter = { 
                    $or: [
                        { supplierType: 'Packing Material Purchase Order' },
                        { supplierType: 'Both (Packing + Raw) PO' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            case 'Raw Material Purchase Order':
                filter = { 
                    $or: [
                        { supplierType: 'Raw Material Purchase Order' },
                        { supplierType: 'Both (Packing + Raw) PO' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            case 'Jobber Packing Material':
                filter = { 
                    $or: [
                        { supplierType: 'Jobber Packing Material' },
                        { supplierType: 'Both Jobber (Packing + Raw)' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            case 'Jobber Raw Material':
                filter = { 
                    $or: [
                        { supplierType: 'Jobber Raw Material' },
                        { supplierType: 'Both Jobber (Packing + Raw)' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            default:
                filter = { supplierType };
        }
        
        const suppliers = await Supplier.find(filter);
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching suppliers' });
    }
};

/**
 * @desc    Get a single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private
 */
const getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        
        if (supplier) {
            res.json(supplier);
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update a supplier's details
 * @route   PUT /api/suppliers/:id
 * @access  Private
 */
const updateSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (supplier) {
            supplier.name = req.body.name || supplier.name;
            supplier.supplierType = req.body.supplierType || supplier.supplierType;
            supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
            supplier.phoneNumber = req.body.phoneNumber || supplier.phoneNumber;
            supplier.email = req.body.email || supplier.email;
            supplier.address = req.body.address || supplier.address;
            supplier.gstin = req.body.gstin || supplier.gstin;
            supplier.panNumber = req.body.panNumber || supplier.panNumber;
            supplier.businessCategory = req.body.businessCategory || supplier.businessCategory;
            supplier.state = req.body.state || supplier.state;
            supplier.country = req.body.country || supplier.country;
            supplier.bankName = req.body.bankName || supplier.bankName;
            supplier.branch = req.body.branch || supplier.branch;
            supplier.accountNumber = req.body.accountNumber || supplier.accountNumber;
            supplier.ifscCode = req.body.ifscCode || supplier.ifscCode;
            supplier.upiId = req.body.upiId || supplier.upiId;
            supplier.paymentTerms = req.body.paymentTerms || supplier.paymentTerms;
            supplier.notes = req.body.notes || supplier.notes;
            
            // Handle materialType validation for updates
            if (req.body.materialType === '') {
                supplier.materialType = undefined;
            } else {
                supplier.materialType = req.body.materialType || supplier.materialType;
            }

            const updatedSupplier = await supplier.save();
            res.json(updatedSupplier);
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error) {
        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        
        res.status(500).json({ message: 'Server error while updating supplier' });
    }
};

/**
 * @desc    Delete a supplier
 * @route   DELETE /api/suppliers/:id
 * @access  Private/Admin
 */
const deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);

        if (supplier) {
            await supplier.deleteOne();
            res.json({ message: 'Supplier removed successfully' });
        } else {
            res.status(404).json({ message: 'Supplier not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting supplier' });
    }
};

/**
 * @desc    Get next supplier code
 * @route   GET /api/suppliers/next-supplier-code
 * @access  Private
 */
const getNextSupplierCode = async (req, res) => {
    try {
        console.log('getNextSupplierCode called');
        const nextCode = await generateSupplierCode();
        console.log('Next code:', nextCode);
        res.json({ nextSupplierCode: nextCode });
    } catch (err) {
        console.error('Error generating next supplier code:', err);
        res.status(500).json({ error: 'Failed to generate next supplier code', details: err.message });
    }
};

/**
 * @desc    Get suppliers filtered by specific supplier type for jobber use
 * @route   GET /api/suppliers/jobber/:type
 * @access  Private
 */
const getSuppliersByJobberType = async (req, res) => {
    try {
        const { type } = req.params;
        
        let filter = {};
        
        switch(type) {
            case 'packing':
                filter = { 
                    $or: [
                        { supplierType: 'Jobber Packing Material' },
                        { supplierType: 'Both Jobber (Packing + Raw)' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            case 'raw':
                filter = { 
                    $or: [
                        { supplierType: 'Jobber Raw Material' },
                        { supplierType: 'Both Jobber (Packing + Raw)' },
                        { supplierType: 'All (Global)' }
                    ]
                };
                break;
            default:
                return res.status(400).json({ message: 'Invalid supplier type' });
        }
        
        const suppliers = await Supplier.find(filter);
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching suppliers' });
    }
};

module.exports = {
    createSupplier,
    getSuppliers,
    getSupplierById,
    updateSupplier,
    deleteSupplier,
    getNextSupplierCode,
    getSuppliersByJobberType
};