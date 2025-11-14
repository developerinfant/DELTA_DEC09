import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const BatchReconciliationModal = ({ isOpen, onClose, batch, onSave }) => {
    const [formData, setFormData] = useState({
        rawMaterials: [],
        packingMaterials: [],
        productName: '',
        totalProductsProduced: '',
        status: 'Pending',
        notes: ''
    });

    useEffect(() => {
        if (batch) {
            setFormData({
                rawMaterials: batch.rawMaterials ? batch.rawMaterials.map(material => ({
                    id: material._id,
                    materialId: material.materialId,
                    name: material.name,
                    itemCode: material.itemCode,
                    qtySent: material.qtySent || 0,
                    used: material.used || 0,
                    notUsed: material.notUsed || 0,
                    stillWithJobber: material.stillWithJobber !== undefined 
                        ? material.stillWithJobber 
                        : (material.qtySent - (material.used + material.notUsed))
                })) : [],
                packingMaterials: batch.packingMaterials ? batch.packingMaterials.map(material => ({
                    id: material._id,
                    materialId: material.materialId,
                    name: material.name,
                    itemCode: material.itemCode,
                    qtySent: material.qtySent || 0,
                    used: material.used || 0,
                    notUsed: material.notUsed || 0,
                    stillWithJobber: material.stillWithJobber !== undefined 
                        ? material.stillWithJobber 
                        : (material.qtySent - (material.used + material.notUsed))
                })) : [],
                productName: batch.productName || '',
                totalProductsProduced: '',
                status: batch.status || 'Pending',
                notes: batch.notes || ''
            });
        }
    }, [batch]);

    const handleRawMaterialChange = (materialId, field, value) => {
        setFormData(prev => ({
            ...prev,
            rawMaterials: prev.rawMaterials.map(material => 
                material.id === materialId 
                    ? { 
                        ...material, 
                        [field]: Number(value),
                        stillWithJobber: field === 'used' || field === 'notUsed' 
                            ? material.qtySent - (field === 'used' ? Number(value) : material.used) - (field === 'notUsed' ? Number(value) : material.notUsed)
                            : material.stillWithJobber
                    } 
                    : material
            )
        }));
    };

    const handlePackingMaterialChange = (materialId, field, value) => {
        setFormData(prev => ({
            ...prev,
            packingMaterials: prev.packingMaterials.map(material => 
                material.id === materialId 
                    ? { 
                        ...material, 
                        [field]: Number(value),
                        stillWithJobber: field === 'used' || field === 'notUsed' 
                            ? material.qtySent - (field === 'used' ? Number(value) : material.used) - (field === 'notUsed' ? Number(value) : material.notUsed)
                            : material.stillWithJobber
                    } 
                    : material
            )
        }));
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validation: Check if any material fields are empty
        const hasEmptyRawFields = formData.rawMaterials.some(material => 
            material.used === '' || material.notUsed === ''
        );
        
        const hasEmptyPackingFields = formData.packingMaterials.some(material => 
            material.used === '' || material.notUsed === ''
        );
        
        if (hasEmptyRawFields || hasEmptyPackingFields) {
            alert('Please fill in all material quantity fields before saving.');
            return;
        }
        
        onSave({
            rawMaterials: formData.rawMaterials.map(material => ({
                id: material.id,
                used: material.used,
                notUsed: material.notUsed
            })),
            packingMaterials: formData.packingMaterials.map(material => ({
                id: material.id,
                used: material.used,
                notUsed: material.notUsed
            })),
            productName: formData.productName,
            totalProductsProduced: formData.totalProductsProduced,
            status: formData.status,
            notes: formData.notes
        });
    };

    const isFormValid = () => {
        // Check raw materials validation
        const rawMaterialsValid = formData.rawMaterials.every(material => 
            material.used >= 0 && 
            material.notUsed >= 0 &&
            (material.used + material.notUsed) <= material.qtySent
        );
        
        // Check packing materials validation
        const packingMaterialsValid = formData.packingMaterials.every(material => 
            material.used >= 0 && 
            material.notUsed >= 0 &&
            (material.used + material.notUsed) <= material.qtySent
        );
        
        // If status is Completed, product name and total products produced are required
        if (formData.status === 'Completed') {
            return rawMaterialsValid && packingMaterialsValid &&
                   formData.productName.trim() !== '' && 
                   formData.totalProductsProduced !== '' && 
                   Number(formData.totalProductsProduced) > 0;
        }
        
        return rawMaterialsValid && packingMaterialsValid;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reconcile: ${batch?.jobberName} - ${batch?.productName}`}>
            <div className="max-h-[85vh] overflow-y-auto min-w-[950px] max-w-[1000px] p-6 rounded-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Raw Materials Section */}
                    {formData.rawMaterials.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center">
                                <span>Raw Materials 🧱</span>
                            </h3>
                            <div className="space-y-5">
                                {formData.rawMaterials.map((material) => (
                                    <div key={material.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold text-lg text-gray-800">
                                                {material.itemCode} - {material.name}
                                            </h4>
                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                                Sent: {material.qtySent}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Used</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={material.qtySent}
                                                    value={material.used}
                                                    onChange={(e) => handleRawMaterialChange(material.id, 'used', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Not Used</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={material.qtySent}
                                                    value={material.notUsed}
                                                    onChange={(e) => handleRawMaterialChange(material.id, 'notUsed', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Still with Jobber</label>
                                                <input
                                                    type="number"
                                                    value={material.stillWithJobber}
                                                    readOnly
                                                    className={`w-full px-4 py-2 border rounded-lg ${
                                                        material.stillWithJobber > 0 
                                                            ? 'border-red-500 bg-red-50 text-red-700' 
                                                            : 'border-gray-300 bg-gray-100 text-gray-600'
                                                    } cursor-not-allowed`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Packing Materials Section */}
                    {formData.packingMaterials.length > 0 && (
                        <div className="bg-gray-50 p-5 rounded-xl shadow-sm">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200 flex items-center">
                                <span>Packing Materials 📦</span>
                            </h3>
                            <div className="space-y-5">
                                {formData.packingMaterials.map((material) => (
                                    <div key={material.id} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="font-semibold text-lg text-gray-800">
                                                {material.itemCode} - {material.name}
                                            </h4>
                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                                Sent: {material.qtySent}
                                            </span>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Used</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={material.qtySent}
                                                    value={material.used}
                                                    onChange={(e) => handlePackingMaterialChange(material.id, 'used', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Not Used</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={material.qtySent}
                                                    value={material.notUsed}
                                                    onChange={(e) => handlePackingMaterialChange(material.id, 'notUsed', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                                />
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="block text-sm font-medium text-gray-700">Still with Jobber</label>
                                                <input
                                                    type="number"
                                                    value={material.stillWithJobber}
                                                    readOnly
                                                    className={`w-full px-4 py-2 border rounded-lg ${
                                                        material.stillWithJobber > 0 
                                                            ? 'border-red-500 bg-red-50 text-red-700' 
                                                            : 'border-gray-300 bg-gray-100 text-gray-600'
                                                    } cursor-not-allowed`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Final Product Details Section */}
                    <div className="bg-gray-50 p-5 rounded-xl shadow-sm">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">FINAL PRODUCT DETAILS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                                <input
                                    type="text"
                                    value={formData.productName}
                                    onChange={(e) => handleInputChange('productName', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Enter product name"
                                    required={formData.status === 'Completed'}
                                />
                            </div>
                            
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Total Products Produced</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={formData.totalProductsProduced}
                                    onChange={(e) => handleInputChange('totalProductsProduced', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    placeholder="Enter total products produced"
                                    required={formData.status === 'Completed'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Section */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            value={formData.status}
                            onChange={(e) => handleInputChange('status', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                        >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>

                    {/* Notes Section */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Notes / QC Comments</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            rows="4"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                            placeholder="Quality remarks or inspection notes"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isFormValid()}
                            className={`px-6 py-2 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition ${
                                isFormValid() 
                                    ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' 
                                    : 'bg-gray-400 cursor-not-allowed'
                            }`}
                        >
                            Save Reconciliation
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default BatchReconciliationModal;