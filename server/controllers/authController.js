const User = require('../models/User');
const jwt = require('jsonwebtoken');

// A utility function to sign and generate a JSON Web Token (JWT)
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '1d' // Token expires in 1 day
    });
};

/**
 * @desc    Authenticate user (Admin or Manager) & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide an email and password' });
    }

    try {
        // --- Step 1: Check for hardcoded Admin credentials ---
        if (email === process.env.ADMIN_EMAIL) {
            if (password === process.env.ADMIN_PASSWORD) {
                // Credentials match the .env file, it's the Admin
                const token = generateToken('admin_user_id', 'Admin'); // Use a placeholder ID for the admin
                return res.json({
                    _id: 'admin_user_id',
                    name: 'Admin User',
                    email: process.env.ADMIN_EMAIL,
                    role: 'Admin',
                    token,
                });
            } else {
                // Email matches admin, but password is wrong
                return res.status(401).json({ message: 'Invalid email or password' });
            }
        }

        // --- Step 2: If not admin, check for a Manager in the database ---
        const manager = await User.findOne({ email });

        // Check if a manager exists and if the password matches
        // The `matchPassword` method is defined in our User model
        if (manager && (await manager.matchPassword(password))) {
            const token = generateToken(manager._id, manager.role);
            res.json({
                _id: manager._id,
                name: manager.name,
                username: manager.username,
                email: manager.email,
                role: manager.role,
                moduleAccess: manager.moduleAccess || [], // Include module access (old format)
                permissions: manager.permissions || {}, // Include granular permissions (new format)
                token,
            });
        } else {
            // No user found or password did not match
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error(`Error during login: ${error.message}`);
        res.status(500).json({ message: 'Server error during login process' });
    }
};


/**
 * @desc    Get the profile of the logged-in user
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
    try {
        // req.user is populated by the authMiddleware after decoding the token

        // Handle the special case for the hardcoded Admin user
        if (req.user.id === 'admin_user_id') {
            return res.json({
                _id: req.user.id,
                name: 'Admin User',
                email: process.env.ADMIN_EMAIL,
                role: 'Admin',
            });
        }

        const user = await User.findById(req.user.id).select('-password');

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                moduleAccess: user.moduleAccess || [], // Include module access (old format)
                permissions: user.permissions || {}, // Include granular permissions (new format)
            });
        } else {
            // This case handles if a user was deleted but their token is still being used
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(`Error fetching user profile: ${error.message}`);
        res.status(500).json({ message: 'Server error while fetching profile' });
    }
};


module.exports = {
    loginUser,
    getUserProfile,
};