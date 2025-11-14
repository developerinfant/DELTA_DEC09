import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const BatchReconciliationModal = ({ isOpen, onClose, batch, onSave }) => {
    const [reconciliationData, setReconciliationData] = useState({
        productName: batch?.productName || '',
        packingMaterials: [],
        totalProductsProduced: '',
        status: batch?.status || 'Pending',
        notes: batch?.notes || ''
    });
    const [error, setError] = useState('');

    // Initialize reconciliation data when batch changes
    useEffect(() => {
        if (batch) {
            setReconciliationData({
                productName: batch.productName,
                packingMaterials: batch.packingMaterials.map(material => ({
                    id: material._id,
                    name: material.name,
                    itemCode: material.itemCode,
                    qtySent: material.qtySent || 0,
                    used: material.used || 0,
                    notUsed: material.notUsed || 0,
                    stillWithJobber: material.stillWithJobber || 0
                })),
                totalProductsProduced: '',
                status: batch.status,
                notes: batch.notes || ''
            });
        }
    }, [batch]);

    const handleMaterialChange = (materialId, field, value) => {
        setReconciliationData(prev => ({
            ...prev,
            packingMaterials: prev.packingMaterials.map(material => 
                material.id === materialId 
                    ? { ...material, [field]: Number(value) }
                    : material
            )
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setReconciliationData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!reconciliationData.productName.trim()) {
            setError('Product name is required.');
            return;
        }

        // Validate that used + notUsed doesn't exceed qtySent for each material
        for (const material of reconciliationData.packingMaterials) {
            const totalUsed = (material.used || 0) + (material.notUsed || 0);
            if (totalUsed > material.qtySent) {
                setError(`For material ${material.itemCode} - ${material.name}, used (${material.used}) + not used (${material.notUsed}) cannot exceed sent quantity (${material.qtySent}).`);
                return;
            }
        }

        // Validate total products produced when status is completed
        if (reconciliationData.status === 'Completed' && (!reconciliationData.totalProductsProduced || Number(reconciliationData.totalProductsProduced) <= 0)) {
            setError('Total products produced is required when marking batch as completed.');
            return;
        }

        // Prepare data for submission
        const submitData = {
            productName: reconciliationData.productName,
            packingMaterials: reconciliationData.packingMaterials.map(material => ({
                id: material.id,
                used: material.used,
                notUsed: material.notUsed
            })),
            totalProductsProduced: reconciliationData.totalProductsProduced,
            status: reconciliationData.status,
            notes: reconciliationData.notes
        };

        onSave(submitData);
    };

    // Calculate still with jobber for each material
    const calculateStillWithJobber = (material) => {
        return (material.qtySent || 0) - ((material.used || 0) + (material.notUsed || 0));
    };

    if (!batch) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reconcile Job Work: ${batch.productName}`}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input
                            type="text"
                            name="productName"
                            id="productName"
                            value={reconciliationData.productName}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    
                    {batch.jobberName && batch.jobberName !== 'Own Unit' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Supplier</label>
                            <input
                                type="text"
                                value={batch.jobberName}
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                            />
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Packing Materials Used</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Not Used</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Still With Jobber</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reconciliationData.packingMaterials.map((material) => (
                                    <tr key={material.id}>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {material.itemCode} - {material.name}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {material.qtySent}
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="0"
                                                max={material.qtySent}
                                                value={material.used}
                                                onChange={(e) => handleMaterialChange(material.id, 'used', e.target.value)}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <input
                                                type="number"
                                                min="0"
                                                max={material.qtySent}
                                                value={material.notUsed}
                                                onChange={(e) => handleMaterialChange(material.id, 'notUsed', e.target.value)}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded-md text-center"
                                            />
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {calculateStillWithJobber(material)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="totalProductsProduced" className="block text-sm font-medium text-gray-700">
                            Total Produced Quantity
                        </label>
                        <input
                            type="number"
                            name="totalProductsProduced"
                            id="totalProductsProduced"
                            value={reconciliationData.totalProductsProduced}
                            onChange={handleInputChange}
                            min="0"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                        <select
                            name="status"
                            id="status"
                            value={reconciliationData.status}
                            onChange={handleInputChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="Pending">Pending</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Remarks / QC Notes</label>
                    <textarea
                        name="notes"
                        id="notes"
                        value={reconciliationData.notes}
                        onChange={handleInputChange}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {error && <div className="text-red-500 text-sm py-2">{error}</div>}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600"
                    >
                        Save Reconciliation
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default BatchReconciliationModal;