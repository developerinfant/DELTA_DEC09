import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';

const PurchaseOrderForm = ({ suppliers, materials, rawMaterials, onOrderCreated }) => {
    const navigate = useNavigate();
    const location = useLocation(); // To get state from navigation

    const [supplier, setSupplier] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('Net 30');
    const [items, setItems] = useState([{ materialId: '', materialModel: '', quantity: '', price: '' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const allMaterials = useMemo(() => [
        ...materials.map(m => ({ ...m, type: 'PackingMaterial' })),
        ...rawMaterials.map(m => ({ ...m, type: 'RawMaterial' }))
    ], [materials, rawMaterials]);

    // Effect to pre-fill the form if navigating from a stock alert
    useEffect(() => {
        if (location.state?.materialId && allMaterials.length > 0) {
            const { materialId } = location.state;
            const material = allMaterials.find(m => m._id === materialId);
            if (material) {
                setItems([{
                    materialId: material._id,
                    materialModel: material.type,
                    quantity: '', // User can fill this in
                    price: material.price
                }]);
            }
        }
    }, [location.state, allMaterials]);

    const calculateTotal = useCallback((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.price) || 0;
        return (quantity * price).toFixed(2);
    }, []);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        if (field === 'materialId') {
            const selectedMaterial = allMaterials.find(m => m._id === value);
            if(selectedMaterial) {
                newItems[index]['materialModel'] = selectedMaterial.type;
                newItems[index]['price'] = selectedMaterial.price || '';
            }
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { materialId: '', materialModel: '', quantity: '', price: '' }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return; // Prevent removing the last item
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };
    
    const grandTotal = items.reduce((total, item) => total + parseFloat(calculateTotal(item)), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate items
        for (let item of items) {
            if (!item.materialId || !item.quantity || !item.price) {
                setError('Please fill in all fields for all items.');
                return;
            }
            if (parseFloat(item.quantity) <= 0 || parseFloat(item.price) <= 0) {
                setError('Quantity and price must be greater than zero.');
                return;
            }
        }

        if (!supplier) {
            setError('Please select a supplier.');
            return;
        }

        setIsLoading(true);

        const orderData = {
            supplier,
            items: items.map(item => ({
                material: item.materialId,
                materialModel: item.materialModel,
                quantity: Number(item.quantity),
                price: Number(item.price),
            })),
            expectedDeliveryDate,
            paymentTerms,
        };

        try {
            await api.post('/purchase-orders', orderData);
            if(onOrderCreated) onOrderCreated();
            navigate('/purchase-orders'); // Navigate to the list view after creation
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create purchase order.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Supplier and Date Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label htmlFor="supplier" className="block text-sm font-medium text-dark-700">Supplier</label>
                    <select id="supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} required className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="" disabled>Select a supplier</option>
                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-dark-700">Expected Delivery Date</label>
                    <input type="date" id="expectedDeliveryDate" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                    <label htmlFor="paymentTerms" className="block text-sm font-medium text-dark-700">Payment Terms</label>
                    <input type="text" id="paymentTerms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-dark-700">Items</h3>
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-3 bg-light-200 rounded-lg">
                        <div className="md:col-span-5">
                            <label className="text-xs text-secondary-500">Material</label>
                            <select value={item.materialId} onChange={(e) => handleItemChange(index, 'materialId', e.target.value)} required className="mt-1 block w-full px-4 py-2 text-dark-700 bg-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                                <option value="" disabled>Select a material</option>
                                {allMaterials.map(m => <option key={m._id} value={m._id}>{m.name} ({m.type.replace('Material', '')})</option>)}
                            </select>
                        </div>
                         <div className="md:col-span-2">
                            <label className="text-xs text-secondary-500">Quantity</label>
                            <input 
                                type="number" 
                                min="1" 
                                step="1"
                                value={item.quantity} 
                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                                required 
                                className="mt-1 block w-full px-4 py-2 text-dark-700 bg-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-secondary-500">Unit Price (₹)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                min="0"
                                value={item.price} 
                                onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                required 
                                className="mt-1 block w-full px-4 py-2 text-dark-700 bg-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" 
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-secondary-500">Total (₹)</label>
                            <p className="mt-1 w-full px-4 py-2 font-bold text-dark-700 bg-white border border-transparent rounded-lg">
                                {calculateTotal(item)}
                            </p>
                        </div>
                        <div className="md:col-span-1 flex items-end justify-center">
                            {items.length > 1 && (
                                <button 
                                    type="button" 
                                    onClick={() => removeItem(index)} 
                                    className="text-red-500 hover:text-red-700 text-2xl"
                                    title="Remove item"
                                >
                                    &times;
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <button type="button" onClick={addItem} className="text-sm font-medium text-primary-500 hover:text-primary-600">+ Add Item</button>
            </div>
            
            {/* Grand Total and Submit */}
             <div className="flex justify-between items-center pt-4 border-t border-light-200">
                <div>
                    <span className="text-lg font-bold text-dark-700">Grand Total:</span>
                    <span className="ml-2 text-xl font-extrabold text-primary-500">₹{grandTotal.toFixed(2)}</span>
                </div>
                <button type="submit" disabled={isLoading} className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-red-300">
                    {isLoading ? 'Creating...' : 'Create Purchase Order'}
                </button>
            </div>
             {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
        </form>
    );
};

export default PurchaseOrderForm;