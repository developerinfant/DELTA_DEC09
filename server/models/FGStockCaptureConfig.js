const mongoose = require('mongoose');

const fgStockCaptureConfigSchema = new mongoose.Schema({
    openingTime: {
        type: String,
        required: true,
        default: '0 9 * * *' // 9:00 AM daily
    },
    closingTime: {
        type: String,
        required: true,
        default: '0 21 * * *' // 9:00 PM daily
    }
}, {
    timestamps: true
});

// Ensure only one configuration document exists
fgStockCaptureConfigSchema.statics.getConfig = async function() {
    let config = await this.findOne();
    if (!config) {
        config = new this();
        await config.save();
    }
    return config;
};

module.exports = mongoose.model('FGStockCaptureConfig', fgStockCaptureConfigSchema);