import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const ReconciliationModal = ({ isOpen, onClose, record, onSave }) => {
    const [formData, setFormData] = useState({
        quantityProduced: 0,
        quantityReturned: 0,
        notes: '',
        status: 'Pending'
    });

    useEffect(() => {
        if (record) {
            setFormData({
                quantityProduced: record.quantityProduced || 0,
                quantityReturned: record.quantityReturned || 0,
                notes: record.notes || '',
                status: record.status || 'Pending'
            });
        }
    }, [record]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };
    
    const quantityStillWithJobber = record ? record.quantitySent - (Number(formData.quantityProduced) + Number(formData.quantityReturned)) : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Reconcile: ${record?.jobberName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <strong>Material:</strong> {record?.rawMaterial.name}
                </div>
                <div>
                    <strong>Quantity Sent:</strong> {record?.quantitySent}
                </div>
                <hr/>
                <div>
                    <label className="block text-sm font-medium">Quantity Produced</label>
                    <input
                        type="number"
                        name="quantityProduced"
                        value={formData.quantityProduced}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Quantity Returned (unused)</label>
                    <input
                        type="number"
                        name="quantityReturned"
                        value={formData.quantityReturned}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="0"
                    />
                </div>
                <div>
                    <strong>Quantity Still With Jobber:</strong>
                    <span className={`font-bold ml-2 ${quantityStillWithJobber < 0 ? 'text-red-500' : ''}`}>
                         {quantityStillWithJobber}
                    </span>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Notes / QC Status</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="3"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Save Reconciliation</button>
                </div>
            </form>
        </Modal>
    );
};

export default ReconciliationModal;