const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 1. Define the User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true, // Ensures every username is unique in the database
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true, // Ensures every email is unique
        match: [ // Regular expression to validate email format
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email address',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6, // Enforce a minimum password length
    },
    phone: { // Added phone number field
        type: String,
        trim: true,
    },
    role: {
        type: String,
        enum: ['Manager', 'Admin'], // The role must be one of these values
        default: 'Manager', // New users will be 'Manager' by default
    },
    shop: {
        type: String,
        required: false, // Shop is no longer required for managers
        trim: true,
    },
    // Module access permissions for managers - OLD FORMAT (for backward compatibility)
    moduleAccess: {
        type: [String],
        default: [],
    },
    // Granular permissions for managers - NEW FORMAT
    // Using Mixed type instead of nested Map to avoid Mongoose issues
    permissions: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Clone permissions from another manager
    clonedFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    // Automatically add 'createdAt' and 'updatedAt' fields
    timestamps: true,
});

// 2. Mongoose Middleware to Hash Password Before Saving
// This 'pre-save' hook runs automatically every time a new user is created or a password is modified.
userSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Generate a "salt" to add randomness to the hash
        const salt = await bcrypt.genSalt(10);
        // Hash the password with the salt and update the password field
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 3. Custom Method to Compare Passwords for Login
// This method can be called on any user document instance (e.g., `user.matchPassword()`)
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Use bcrypt to securely compare the plain-text password with the stored hashed password
    return await bcrypt.compare(enteredPassword, this.password);
};

// 4. Create and Export the User Model
// The model is what we use to interact with the 'users' collection in the database.
module.exports = mongoose.model('User', userSchema);