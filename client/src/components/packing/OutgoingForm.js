import React, { useState, useMemo } from 'react';
import Card from '../common/Card';
import api from '../../api'; // 👈 MODIFY THIS LINE

const OutgoingForm = ({ materials, onRecordAdded }) => {
    // State for form fields
    const [selectedMaterialId, setSelectedMaterialId] = useState('');
    const [quantityUsed, setQuantityUsed] = useState('');
    const [notes, setNotes] = useState('');

    // State for loading and error handling
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Find the full object of the selected material.
    // useMemo ensures this only recalculates when the selectedMaterialId or materials list changes.
    const selectedMaterial = useMemo(() => {
        return materials.find(m => m._id === selectedMaterialId);
    }, [selectedMaterialId, materials]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // --- Client-side validation ---
        if (!selectedMaterialId) {
            setError('You must select a material.');
            return;
        }
        if (!quantityUsed || Number(quantityUsed) <= 0) {
            setError('Quantity must be a positive number.');
            return;
        }
        if (Number(quantityUsed) > selectedMaterial.quantity) {
            setError(`Cannot use ${quantityUsed}. Only ${selectedMaterial.quantity} available in stock.`);
            return;
        }

        setIsLoading(true);

        const recordData = {
            materialId: selectedMaterialId,
            quantityUsed: Number(quantityUsed),
            notes,
        };

        try {
            // --- This is the actual API call ---
            const { data } = await api.post('/materials/outgoing', recordData); // 👈 MODIFY THIS LINE

            // Call the function passed from the parent to notify it of the update
            onRecordAdded(data.updatedMaterial);
            
            // Reset form fields
            setSelectedMaterialId('');
            setQuantityUsed('');
            setNotes('');

        } catch (err) {
            const message = err.response?.data?.message || 'Failed to record outgoing material.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Card */}
            <div className="lg:col-span-2">
                <Card title="Record Outgoing Materials">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Material Selector */}
                        <div>
                            <label htmlFor="material" className="block text-sm font-medium text-gray-700">Select Material</label>
                            <select
                                id="material"
                                value={selectedMaterialId}
                                onChange={(e) => setSelectedMaterialId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="" disabled>-- Choose a material --</option>
                                {materials.map(material => (
                                    <option key={material._id} value={material._id}>
                                        {material.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Quantity Used */}
                        <div>
                            <label htmlFor="quantityUsed" className="block text-sm font-medium text-gray-700">Quantity Used</label>
                            <input
                                type="number"
                                id="quantityUsed"
                                value={quantityUsed}
                                onChange={(e) => setQuantityUsed(e.target.value)}
                                min="1"
                                max={selectedMaterial ? selectedMaterial.quantity : undefined} // Dynamically set max based on stock
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g., 10"
                                disabled={!selectedMaterialId} // Disable until a material is selected
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows="3"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Add any relevant notes here..."
                            />
                        </div>

                        {/* Error Display */}
                        {error && <p className="text-sm text-red-600">{error}</p>}
                        
                        {/* Submit Button */}
                        <div className="text-right">
                            <button
                                type="submit"
                                disabled={isLoading || !selectedMaterialId}
                                className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Recording...' : 'Record Usage'}
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
            
            {/* Stock Info Card */}
            <div className="lg:col-span-1">
                <Card title="Stock Information">
                    {selectedMaterial ? (
                        <div className="space-y-3">
                            <h3 className="text-lg font-bold text-gray-800">{selectedMaterial.name}</h3>
                            <p className="text-sm text-gray-600">
                                Current Stock: <span className="font-semibold text-2xl text-indigo-600">{selectedMaterial.quantity}</span>
                            </p>
                             <p className="text-sm text-gray-500">
                                Alert Threshold: <span className="font-medium">{selectedMaterial.stockAlertThreshold}</span>
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-500">Select a material to see its stock details.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default OutgoingForm;