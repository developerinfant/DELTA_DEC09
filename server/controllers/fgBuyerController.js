const mongoose = require('mongoose');
const FGBuyer = require('../models/FGBuyer');

/**
 * @desc    Create a new FG Buyer
 * @route   POST /api/fg/buyers
 * @access  Private
 */
const createFGBuyer = async (req, res) => {
    const { 
        name, 
        contactPerson, 
        phoneNumber,
        email,
        address, 
        city, 
        state, 
        pincode, 
        country,
        gstin, 
        panNumber,
        businessCategory,
        bankName,
        branch,
        accountNumber,
        ifscCode,
        upiId,
        transportName, 
        paymentTerms, 
        destination,
        notes,
        status
    } = req.body;

    try {
        // Validate required fields
        if (!name || !contactPerson || !phoneNumber || !email || !address || !city || !state || !pincode) {
            return res.status(400).json({ 
                message: 'Buyer name, contact person, phone number, email, address, city, state, and pincode are required.' 
            });
        }

        // Check if buyer with same name already exists
        const existingBuyer = await FGBuyer.findOne({ name: name.trim() });
        if (existingBuyer) {
            return res.status(400).json({ 
                message: 'A buyer with this name already exists.' 
            });
        }

        // Create buyer record
        const buyer = new FGBuyer({
            name: name.trim(),
            contactPerson: contactPerson.trim(),
            phoneNumber: phoneNumber.trim(),
            email: email.trim(),
            address: address.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            country: country || 'India',
            gstin: gstin ? gstin.trim() : null,
            panNumber: panNumber ? panNumber.trim() : null,
            businessCategory: businessCategory || null,
            bankName: bankName ? bankName.trim() : null,
            branch: branch ? branch.trim() : null,
            accountNumber: accountNumber ? accountNumber.trim() : null,
            ifscCode: ifscCode ? ifscCode.trim() : null,
            upiId: upiId ? upiId.trim() : null,
            transportName: transportName ? transportName.trim() : null,
            paymentTerms: paymentTerms || 'Net 30',
            destination: destination ? destination.trim() : null,
            notes: notes ? notes.trim() : null,
            status: status || 'Active'
        });

        const createdBuyer = await buyer.save();

        res.status(201).json({
            message: 'Buyer created successfully.',
            data: createdBuyer
        });
    } catch (error) {
        console.error(`Error creating FG buyer: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating FG buyer' });
    }
};

/**
 * @desc    Get FG buyers with filters
 * @route   GET /api/fg/buyers
 * @access  Private
 */
const getFGBuyers = async (req, res) => {
    try {
        const { status, search } = req.query;
        let filter = {};

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contactPerson: { $regex: search, $options: 'i' } },
                { gstin: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { buyerCode: { $regex: search, $options: 'i' } }
            ];
        }

        const buyers = await FGBuyer.find(filter)
            .sort({ createdAt: -1 });

        res.json(buyers);
    } catch (error) {
        console.error(`Error fetching FG buyers: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG buyers' });
    }
};

/**
 * @desc    Get a single FG buyer by ID
 * @route   GET /api/fg/buyers/:id
 * @access  Private
 */
const getFGBuyerById = async (req, res) => {
    try {
        const buyer = await FGBuyer.findById(req.params.id);

        if (buyer) {
            res.json(buyer);
        } else {
            res.status(404).json({ message: 'FG Buyer not found' });
        }
    } catch (error) {
        console.error(`Error fetching FG buyer: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG buyer' });
    }
};

/**
 * @desc    Update a FG buyer
 * @route   PUT /api/fg/buyers/:id
 * @access  Private/Admin
 */
const updateFGBuyer = async (req, res) => {
    const { 
        name, 
        contactPerson, 
        phoneNumber,
        email,
        address, 
        city, 
        state, 
        pincode, 
        country,
        gstin, 
        panNumber,
        businessCategory,
        bankName,
        branch,
        accountNumber,
        ifscCode,
        upiId,
        transportName, 
        paymentTerms, 
        destination,
        notes,
        status
    } = req.body;

    try {
        const buyer = await FGBuyer.findById(req.params.id);
        if (!buyer) {
            return res.status(404).json({ message: 'FG Buyer not found.' });
        }

        // Check if another buyer with same name already exists
        if (name && name.trim() !== buyer.name) {
            const existingBuyer = await FGBuyer.findOne({ 
                name: name.trim(),
                _id: { $ne: buyer._id }
            });
            if (existingBuyer) {
                return res.status(400).json({ 
                    message: 'A buyer with this name already exists.' 
                });
            }
        }

        // Update buyer fields
        if (name !== undefined) buyer.name = name.trim();
        if (contactPerson !== undefined) buyer.contactPerson = contactPerson.trim();
        if (phoneNumber !== undefined) buyer.phoneNumber = phoneNumber.trim();
        if (email !== undefined) buyer.email = email.trim();
        if (address !== undefined) buyer.address = address.trim();
        if (city !== undefined) buyer.city = city.trim();
        if (state !== undefined) buyer.state = state.trim();
        if (pincode !== undefined) buyer.pincode = pincode.trim();
        if (country !== undefined) buyer.country = country || 'India';
        if (gstin !== undefined) buyer.gstin = gstin ? gstin.trim() : null;
        if (panNumber !== undefined) buyer.panNumber = panNumber ? panNumber.trim() : null;
        if (businessCategory !== undefined) buyer.businessCategory = businessCategory || null;
        if (bankName !== undefined) buyer.bankName = bankName ? bankName.trim() : null;
        if (branch !== undefined) buyer.branch = branch ? branch.trim() : null;
        if (accountNumber !== undefined) buyer.accountNumber = accountNumber ? accountNumber.trim() : null;
        if (ifscCode !== undefined) buyer.ifscCode = ifscCode ? ifscCode.trim() : null;
        if (upiId !== undefined) buyer.upiId = upiId ? upiId.trim() : null;
        if (transportName !== undefined) buyer.transportName = transportName ? transportName.trim() : null;
        if (paymentTerms !== undefined) buyer.paymentTerms = paymentTerms || 'Net 30';
        if (destination !== undefined) buyer.destination = destination ? destination.trim() : null;
        if (notes !== undefined) buyer.notes = notes ? notes.trim() : null;
        if (status !== undefined) buyer.status = status;

        const updatedBuyer = await buyer.save();

        res.json({
            message: 'Buyer updated successfully.',
            data: updatedBuyer
        });
    } catch (error) {
        console.error(`Error updating FG buyer: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating FG buyer.' });
    }
};

/**
 * @desc    Delete a FG buyer
 * @route   DELETE /api/fg/buyers/:id
 * @access  Private/Admin
 */
const deleteFGBuyer = async (req, res) => {
    try {
        const buyer = await FGBuyer.findById(req.params.id);
        if (!buyer) {
            return res.status(404).json({ message: 'FG Buyer not found.' });
        }

        await buyer.remove();

        res.json({ message: 'Buyer deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting FG buyer: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting FG buyer.' });
    }
};

/**
 * @desc    Get next buyer code
 * @route   GET /api/fg/buyers/next-buyer-code
 * @access  Private
 */
const getNextBuyerCode = async (req, res) => {
    try {
        // Find the highest existing buyer code
        const lastBuyer = await FGBuyer.findOne({}, {}, { sort: { 'createdAt': -1 } });
        
        let nextNumber = 1;
        if (lastBuyer && lastBuyer.buyerCode) {
            const lastNumber = parseInt(lastBuyer.buyerCode.replace('B', ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        const nextBuyerCode = `B${nextNumber.toString().padStart(4, '0')}`;

        res.json({ nextBuyerCode });
    } catch (error) {
        console.error(`Error fetching next buyer code: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching next buyer code' });
    }
};

module.exports = {
    createFGBuyer,
    getFGBuyers,
    getFGBuyerById,
    updateFGBuyer,
    deleteFGBuyer,
    getNextBuyerCode
};