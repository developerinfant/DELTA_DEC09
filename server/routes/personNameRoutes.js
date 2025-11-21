const express = require('express');
const router = express.Router();
const { 
    getPersonNames,
    createPersonName,
    updatePersonName,
    deletePersonName
} = require('../controllers/personNameController');
const { protect, admin } = require('../middleware/authMiddleware');

// All routes are protected
router.route('/')
    .get(protect, getPersonNames)
    .post(protect, admin, createPersonName);

router.route('/:id')
    .put(protect, admin, updatePersonName)
    .delete(protect, admin, deletePersonName);

module.exports = router;