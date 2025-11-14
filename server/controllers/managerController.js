const User = require('../models/User');

// Import the permission structure initialization function
const { initializePermissionStructure } = require('./settingsController');

/**
 * @desc    Create a new manager
 * @route   POST /api/managers
 * @access  Private/Admin
 */
const createManager = async (req, res) => {
    // 1. Get manager details from the request body
    const { name, username, email, password, phone } = req.body;

    try {
        // 2. Check if a user with the same email or username already exists
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            return res.status(400).json({ message: 'A user with this username already exists' });
        }

        // 3. Create a new user instance with the role 'Manager'
        const manager = new User({
            name,
            username,
            email,
            password,
            phone, // Add phone field
            role: 'Manager',
            moduleAccess: [], // Initialize with empty module access (old format)
            permissions: initializePermissionStructure({}) // Initialize with proper permission structure (new format)
        });

        // 4. Save the new manager to the database
        const createdManager = await manager.save();

        // 5. Respond with the created manager's data (excluding the password)
        res.status(201).json({
            _id: createdManager._id,
            name: createdManager.name,
            username: createdManager.username,
            email: createdManager.email,
            phone: createdManager.phone, // Include phone in response
            role: createdManager.role,
            moduleAccess: createdManager.moduleAccess, // Include module access in response (old format)
            permissions: createdManager.permissions, // Include permissions in response (new format)
        });

    } catch (error) {
        console.error(`Error creating manager: ${error.message}`);
        res.status(500).json({ message: 'Server error while creating manager' });
    }
};

/**
 * @desc    Get all managers
 * @route   GET /api/managers
 * @access  Private/Admin
 */
const getManagers = async (req, res) => {
    try {
        const managers = await User.find({ role: 'Manager' }).select('-password');
        res.json(managers);
    } catch (error) {
        console.error(`Error fetching managers: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching managers' });
    }
};


/**
 * @desc    Get a single manager by ID
 * @route   GET /api/managers/:id
 * @access  Private/Admin
 */
const getManagerById = async (req, res) => {
    try {
        const manager = await User.findById(req.params.id).select('-password');
        
        if (manager && manager.role === 'Manager') {
            res.json({
                ...manager.toObject(),
                moduleAccess: manager.moduleAccess || [], // Include module access (old format)
                permissions: initializePermissionStructure(manager.permissions || {}) // Include properly structured permissions (new format)
            });
        } else {
            res.status(404).json({ message: 'Manager not found' });
        }
    } catch (error) {
        console.error(`Error fetching manager by ID: ${error.message}`);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * @desc    Update a manager's details
 * @route   PUT /api/managers/:id
 * @access  Private/Admin
 */
const updateManager = async (req, res) => {
    try {
        const manager = await User.findById(req.params.id);

        if (manager && manager.role === 'Manager') {
            // Update fields if they are provided in the request body
            manager.name = req.body.name || manager.name;
            manager.username = req.body.username || manager.username;
            manager.email = req.body.email || manager.email;
            manager.phone = req.body.phone || manager.phone; // Add phone field

            if (req.body.password) {
                manager.password = req.body.password;
            }

            // Update permissions if provided
            if (req.body.permissions !== undefined) {
                manager.permissions = initializePermissionStructure(req.body.permissions);
            }

            const updatedManager = await manager.save();

            // Respond with the updated data
            res.json({
                _id: updatedManager._id,
                name: updatedManager.name,
                username: updatedManager.username,
                email: updatedManager.email,
                phone: updatedManager.phone, // Include phone in response
                role: updatedManager.role,
                moduleAccess: updatedManager.moduleAccess, // Include module access in response (old format)
                permissions: updatedManager.permissions, // Include permissions in response (new format)
            });
        } else {
            res.status(404).json({ message: 'Manager not found' });
        }
    } catch (error) {
        console.error(`Error updating manager: ${error.message}`);
        res.status(500).json({ message: 'Server error while updating manager' });
    }
};

/**
 * @desc    Delete a manager
 * @route   DELETE /api/managers/:id
 * @access  Private/Admin
 */
const deleteManager = async (req, res) => {
    try {
        const manager = await User.findById(req.params.id);

        if (manager && manager.role === 'Manager') {
            await manager.deleteOne();
            res.json({ message: 'Manager account removed successfully' });
        } else {
            res.status(404).json({ message: 'Manager not found' });
        }
    } catch (error) {
        console.error(`Error deleting manager: ${error.message}`);
        res.status(500).json({ message: 'Server error while deleting manager' });
    }
};


// Export all the controller functions
module.exports = {
    createManager,
    getManagers,
    getManagerById,
    updateManager,
    deleteManager,
};