console.log('Eway bill routes loaded');

const express = require('express');
const router = express.Router();
const { getDocumentNumbers, getDocumentData } = require('../controllers/ewayBillController');

// Get document numbers by type
router.get('/documents/:type', getDocumentNumbers);

// Get document data by type and number
// Use a more flexible route to capture document numbers with special characters
router.get('/documents/:type/*', (req, res, next) => {
  // Extract the document number from the wildcard parameter
  const type = req.params.type;
  // req.params[0] contains everything after /documents/:type/
  const number = req.params[0];
  
  // Call the controller with the extracted parameters
  req.params = { type, number };
  getDocumentData(req, res, next);
});

module.exports = router;