const mongoose = require('mongoose');
const FGDriver = require('../models/FGDriver');

/**
 * @desc    Create a new FG Driver
 * @route   POST /api/fg/drivers
 * @access  Private
 */
const createFGDriver = async (req, res) => {
    const { 
        name,
        transportName,
        vehicleNo,
        vehicleType,
        phone,
        destination,
        notes,
        status
    } = req.body;

    try {
        // Validate required fields
        if (!name) {
            return res.status(400).json({ 
                message: 'Driver name is required.' 
            });
        }

        // Check if driver with same name already exists
        const existingDriver = await FGDriver.findOne({ name: name.trim() });
        if (existingDriver) {
            return res.status(400).json({ 
                message: 'A driver with this name already exists.' 
            });
        }

        // Create driver record
        const driver = new FGDriver({
            name: name.trim(),
            transportName: transportName ? transportName.trim() : null,
            vehicleNo: vehicleNo ? vehicleNo.trim() : null,
            vehicleType: vehicleType ? vehicleType.trim() : null,
            phone: phone ? phone.trim() : null,
            destination: destination ? destination.trim() : null,
            notes: notes ? notes.trim() : null,
            status: status || 'Active'
        });

        const createdDriver = await driver.save();

        res.status(201).json({
            message: 'Driver created successfully.',
            data: createdDriver
        });
    } catch (error) {
        console.error(`Error creating FG driver: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating FG driver' });
    }
};

/**
 * @desc    Get FG drivers with filters
 * @route   GET /api/fg/drivers
 * @access  Private
 */
const getFGDrivers = async (req, res) => {
    try {
        const { status, search } = req.query;
        let filter = {};

        if (status) {
            filter.status = status;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { transportName: { $regex: search, $options: 'i' } },
                { vehicleNo: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
                { driverCode: { $regex: search, $options: 'i' } }
            ];
        }

        const drivers = await FGDriver.find(filter)
            .sort({ createdAt: -1 });

        res.json(drivers);
    } catch (error) {
        console.error(`Error fetching FG drivers: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG drivers' });
    }
};

/**
 * @desc    Get a single FG driver by ID
 * @route   GET /api/fg/drivers/:id
 * @access  Private
 */
const getFGDriverById = async (req, res) => {
    try {
        const driver = await FGDriver.findById(req.params.id);

        if (driver) {
            res.json(driver);
        } else {
            res.status(404).json({ message: 'FG Driver not found' });
        }
    } catch (error) {
        console.error(`Error fetching FG driver: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching FG driver' });
    }
};

/**
 * @desc    Update a FG driver
 * @route   PUT /api/fg/drivers/:id
 * @access  Private/Admin
 */
const updateFGDriver = async (req, res) => {
    const { 
        name,
        transportName,
        vehicleNo,
        vehicleType,
        phone,
        destination,
        notes,
        status
    } = req.body;

    try {
        const driver = await FGDriver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ message: 'FG Driver not found.' });
        }

        // Check if another driver with same name already exists
        if (name && name.trim() !== driver.name) {
            const existingDriver = await FGDriver.findOne({ 
                name: name.trim(),
                _id: { $ne: driver._id }
            });
            if (existingDriver) {
                return res.status(400).json({ 
                    message: 'A driver with this name already exists.' 
                });
            }
        }

        // Update driver fields
        if (name !== undefined) driver.name = name.trim();
        if (transportName !== undefined) driver.transportName = transportName ? transportName.trim() : null;
        if (vehicleNo !== undefined) driver.vehicleNo = vehicleNo ? vehicleNo.trim() : null;
        if (vehicleType !== undefined) driver.vehicleType = vehicleType ? vehicleType.trim() : null;
        if (phone !== undefined) driver.phone = phone ? phone.trim() : null;
        if (destination !== undefined) driver.destination = destination ? destination.trim() : null;
        if (notes !== undefined) driver.notes = notes ? notes.trim() : null;
        if (status !== undefined) driver.status = status;

        const updatedDriver = await driver.save();

        res.json({
            message: 'Driver updated successfully.',
            data: updatedDriver
        });
    } catch (error) {
        console.error(`Error updating FG driver: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating FG driver.' });
    }
};

/**
 * @desc    Delete a FG driver
 * @route   DELETE /api/fg/drivers/:id
 * @access  Private/Admin
 */
const deleteFGDriver = async (req, res) => {
    try {
        const driver = await FGDriver.findById(req.params.id);
        if (!driver) {
            return res.status(404).json({ message: 'FG Driver not found.' });
        }

        await driver.remove();

        res.json({ message: 'Driver deleted successfully.' });
    } catch (error) {
        console.error(`Error deleting FG driver: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting FG driver.' });
    }
};

/**
 * @desc    Get next driver code
 * @route   GET /api/fg/drivers/next-driver-code
 * @access  Private
 */
const getNextDriverCode = async (req, res) => {
    try {
        // Find the highest existing driver code
        const lastDriver = await FGDriver.findOne({}, {}, { sort: { 'createdAt': -1 } });
        
        let nextNumber = 1;
        if (lastDriver && lastDriver.driverCode) {
            const lastNumber = parseInt(lastDriver.driverCode.replace('D', ''));
            if (!isNaN(lastNumber)) {
                nextNumber = lastNumber + 1;
            }
        }
        
        const nextDriverCode = `D${nextNumber.toString().padStart(4, '0')}`;

        res.json({ nextDriverCode });
    } catch (error) {
        console.error(`Error fetching next driver code: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching next driver code' });
    }
};

module.exports = {
    createFGDriver,
    getFGDrivers,
    getFGDriverById,
    updateFGDriver,
    deleteFGDriver,
    getNextDriverCode
};