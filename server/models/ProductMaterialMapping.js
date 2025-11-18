const mongoose = require('mongoose');

const productMaterialMappingSchema = new mongoose.Schema({
    product_name: {
        type: String,
        required: [true, 'Product name is required'],
        unique: true,
        trim: true,
    },
    units_per_carton: {
        type: Number,
        required: [true, 'Units per carton is required'],
        min: [1, 'Units per carton must be at least 1'],
        default: 1
    },
    materials: [{
        material_name: {
            type: String,
            required: true,
            trim: true,
        },
        qty_per_carton: {
            type: Number,
            required: true,
            min: [1, 'Quantity per carton must be at least 1'],
        }
    }]
}, {
    timestamps: true,
});

module.exports = mongoose.model('ProductMaterialMapping', productMaterialMappingSchema, 'product_material_mapping');