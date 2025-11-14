import React, { useState, useEffect } from 'react';

const SupplierForm = ({ onSave, initialData = {}, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState('');

    useEffect(() => {
        setFormData({
            name: initialData.name || '',
            address: initialData.address || '',
            contactPerson: initialData.contactPerson || '',
            phone: initialData.phone || '',
            email: initialData.email || '',
            gstin: initialData.gstin || '',
        });
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await onSave(formData);
            if (!initialData._id) { // Reset form only if it's for creating
                setFormData({ name: '', address: '', contactPerson: '', phone: '', email: '', gstin: '' });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const commonInputClass = "mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-dark-700">Supplier Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className={commonInputClass} />
                </div>
                <div>
                    <label htmlFor="contactPerson" className="block text-sm font-medium text-dark-700">Contact Person</label>
                    <input type="text" name="contactPerson" id="contactPerson" value={formData.contactPerson} onChange={handleChange} className={commonInputClass} />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-dark-700">Email</label>
                    <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className={commonInputClass} />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-dark-700">Phone Number</label>
                    <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={commonInputClass} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="address" className="block text-sm font-medium text-dark-700">Address</label>
                    <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className={commonInputClass} />
                </div>
                <div className="md:col-span-2">
                    <label htmlFor="gstin" className="block text-sm font-medium text-dark-700">GSTIN</label>
                    <input type="text" name="gstin" id="gstin" value={formData.gstin} onChange={handleChange} className={commonInputClass} />
                </div>
            </div>
             {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end space-x-3 pt-4">
                {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>}
                <button type="submit" disabled={isLoading} className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600">
                    {isLoading ? 'Saving...' : 'Save Supplier'}
                </button>
            </div>
        </form>
    );
};

export default SupplierForm;