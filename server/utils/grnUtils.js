const GRN = require('../models/GRN');

// Helper function to generate next GRN number
const getNextGRNNumber = async () => {
    const year = new Date().getFullYear();
    const lastGRN = await GRN.findOne({}, {}, { sort: { 'createdAt': -1 } });
    
    let nextNumber = 1;
    if (lastGRN) {
        const lastNumber = parseInt(lastGRN.grnNumber.split('-').pop());
        if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
        }
    }
    
    return `GRN-${year}-${nextNumber.toString().padStart(3, '0')}`;
};

module.exports = {
    getNextGRNNumber
};