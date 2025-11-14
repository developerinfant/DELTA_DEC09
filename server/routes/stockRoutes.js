const express = require('express');
const router = express.Router();

const {
    addRawMaterial,
    getRawMaterials,
    updateRawMaterial,
    deleteRawMaterial,
    sendToJobber,
    reconcileJobberRecord,
    getJobberRecords,
    getOutgoingRawHistory,
    getRawStockAlerts,
    getNextRawItemCode
    // Removed getPackingFinishedGoods
} = require('../controllers/stockController');

// Removed jobberBatchController import

const { protect } = require('../middleware/authMiddleware');

// RAW Materials Routes
router.route('/raw-materials/next-item-code').get(protect, getNextRawItemCode);

router.route('/raw-materials')
    .get(protect, getRawMaterials)
    .post(protect, addRawMaterial);

router.route('/raw-materials/:id')
    .put(protect, updateRawMaterial)
    .delete(protect, deleteRawMaterial);

// Jobber Unit Routes
router.route('/jobber/outgoing')
    .post(protect, sendToJobber);

router.route('/jobber/reconcile/:id')
    .put(protect, reconcileJobberRecord);

router.route('/jobber')
    .get(protect, getJobberRecords);

// Removed Jobber Batch Routes

// History and Alerts
router.route('/outgoing-history')
    .get(protect, getOutgoingRawHistory);

router.route('/alerts')
    .get(protect, getRawStockAlerts);

// Removed Packing Finished Goods route

module.exports = router;