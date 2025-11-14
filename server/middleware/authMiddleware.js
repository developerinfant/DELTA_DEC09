const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Middleware to protect routes that require authentication.
 * It verifies the JWT from the Authorization header.
 */
const protect = async (req, res, next) => {
    let token;

    // 1. Check if the Authorization header exists and is correctly formatted
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Extract the token from the header (format: "Bearer <token>")
            token = req.headers.authorization.split(' ')[1];

            // 3. Verify the token using the secret key
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Handle the special case for the hardcoded Admin user
            if (decoded.id === 'admin_user_id' && decoded.role === 'Admin') {
                 // The admin is not in the DB, so we manually attach a user object
                req.user = {
                    _id: decoded.id,
                    role: 'Admin',
                    name: 'Admin User'
                };
            } else {
                 // For regular Managers, find the user in the DB by the ID from the token
                 // We exclude the password from the user object attached to the request
                req.user = await User.findById(decoded.id).select('-password');
            }
            
            // If user is not found for a valid token (e.g., deleted user), block access
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // 5. Proceed to the next middleware or route handler
            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            // Check if the error is specifically due to token expiration
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expired, please log in again' });
            }
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // If no token is found in the header at all
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

/**
 * @desc    Middleware to restrict access to Admins only.
 * This should be used *after* the `protect` middleware.
 */
const admin = (req, res, next) => {
    // Check if the user object was attached by the `protect` middleware and if their role is 'Admin'
    if (req.user && req.user.role === 'Admin') {
        next(); // User is an admin, allow access
    } else {
        // User is authenticated but does not have the required permissions
        res.status(403).json({ message: 'Not authorized as an Admin' });
    }
};

module.exports = {
    protect,
    admin,
};