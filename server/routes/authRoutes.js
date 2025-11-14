const express = require('express');
const router = express.Router();

// 1. Import the necessary controller functions and middleware
const { loginUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');


router.post('/login', loginUser);


router.get('/profile', protect, getUserProfile);


// 3. Export the router
module.exports = router;