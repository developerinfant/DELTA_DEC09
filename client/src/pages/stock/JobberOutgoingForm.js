import React, { useState, useMemo } from 'react';
import Card from '../../components/common/Card';
import api from '../../api';

const JobberOutgoingForm = ({ materials, onRecordAdded }) => {
    const [formData, setFormData] = useState({
        materialId: '',
        quantitySent: '',
        jobberName: '',
        notes: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const selectedMaterial = useMemo(() => {
        return materials.find(m => m._id === formData.materialId);
    }, [formData.materialId, materials]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.materialId || !formData.quantitySent || !formData.jobberName) {
            setError('Please fill out all required fields.');
            return;
        }

        if (Number(formData.quantitySent) > selectedMaterial.quantity) {
            setError(`Cannot send ${formData.quantitySent}. Only ${selectedMaterial.quantity} available.`);
            return;
        }

        setIsLoading(true);
        try {
            const { data } = await api.post('/stock/jobber/outgoing', {
                ...formData,
                quantitySent: Number(formData.quantitySent),
            });
            onRecordAdded(data.jobberRecord, data.updatedMaterial);
            setFormData({ materialId: '', quantitySent: '', jobberName: '', notes: '' });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send material.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Send Raw Material to Jobber">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="materialId" className="block text-sm font-medium">Select Raw Material</label>
                        <select
                            name="materialId"
                            id="materialId"
                            value={formData.materialId}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        >
                            <option value="" disabled>-- Choose a material --</option>
                            {materials.map(material => (
                                <option key={material._id} value={material._id}>
                                    {material.itemCode} - {material.name} (In Stock: {material.quantity})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="quantitySent" className="block text-sm font-medium">Quantity Sent</label>
                        <input
                            type="number"
                            name="quantitySent"
                            id="quantitySent"
                            value={formData.quantitySent}
                            onChange={handleChange}
                            min="1"
                            max={selectedMaterial ? selectedMaterial.quantity : undefined}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            disabled={!formData.materialId}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="jobberName" className="block text-sm font-medium">Jobber Name / ID</label>
                        <input
                            type="text"
                            name="jobberName"
                            id="jobberName"
                            value={formData.jobberName}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium">Notes (Optional)</label>
                    <textarea
                        name="notes"
                        id="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="2"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <div className="text-right">
                    <button type="submit" disabled={isLoading} className="btn-primary">
                        {isLoading ? 'Sending...' : 'Send to Jobber'}
                    </button>
                </div>
            </form>
        </Card>
    );
};

export default JobberOutgoingForm;