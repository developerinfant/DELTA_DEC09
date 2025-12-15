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
        <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-[16px] p-6 border border-[#E7E2D8] shadow-sm">
            {/* Supplier and Date Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label htmlFor="supplier" className="block text-sm font-medium text-[#1A1A1A] mb-2">Supplier *</label>
                    <select 
                        id="supplier" 
                        value={supplier} 
                        onChange={(e) => setSupplier(e.target.value)} 
                        required 
                        className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                    >
                        <option value="" disabled>Select a supplier</option>
                        {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-[#1A1A1A] mb-2">Expected Delivery Date</label>
                    <input 
                        type="date" 
                        id="expectedDeliveryDate" 
                        value={expectedDeliveryDate} 
                        onChange={(e) => setExpectedDeliveryDate(e.target.value)} 
                        className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                    />
                </div>
                <div>
                    <label htmlFor="paymentTerms" className="block text-sm font-medium text-[#1A1A1A] mb-2">Payment Terms</label>
                    <input 
                        type="text" 
                        id="paymentTerms" 
                        value={paymentTerms} 
                        onChange={(e) => setPaymentTerms(e.target.value)} 
                        className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[14px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                    />
                </div>
            </div>

            {/* Items Section */}
            <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-[#E7E2D8]">
                    <h3 className="text-lg font-semibold text-[#1A1A1A]">Items</h3>
                    <button 
                        type="button" 
                        onClick={addItem}
                        className="flex items-center px-4 py-2.5 text-sm bg-[#F2C94C] text-[#1A1A1A] rounded-[14px] hover:bg-[#e0b840] transition-all duration-200 shadow-sm font-medium"
                    >
                        + Add Item
                    </button>
                </div>
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-[#FAF7F2] rounded-[14px] border border-[#E7E2D8]">
                            <div className="md:col-span-5">
                                <label className="block text-xs text-[#6A6A6A] mb-1">Material *</label>
                                <select 
                                    value={item.materialId} 
                                    onChange={(e) => handleItemChange(index, 'materialId', e.target.value)} 
                                    required 
                                    className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                                >
                                    <option value="" disabled>Select a material</option>
                                    {allMaterials.map(m => <option key={m._id} value={m._id}>{m.name} ({m.type.replace('Material', '')})</option>)}
                                </select>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-xs text-[#6A6A6A] mb-1">Quantity *</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    step="1"
                                    value={item.quantity} 
                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                                    required 
                                    className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-[#6A6A6A] mb-1">Unit Price (₹) *</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    min="0"
                                    value={item.price} 
                                    onChange={(e) => handleItemChange(index, 'price', e.target.value)} 
                                    required 
                                    className="w-full px-4 py-3 text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition-all duration-200"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs text-[#6A6A6A] mb-1">Total (₹)</label>
                                <p className="w-full px-4 py-3 font-bold text-[#1A1A1A] bg-white border border-[#E7E2D8] rounded-[12px]">
                                    {calculateTotal(item)}
                                </p>
                            </div>
                            <div className="md:col-span-1 flex items-end justify-center">
                                {items.length > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={() => removeItem(index)} 
                                        className="text-red-500 hover:text-red-700 text-2xl p-2 rounded-full hover:bg-red-50 transition-all duration-200"
                                        title="Remove item"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Grand Total and Submit */}
             <div className="flex justify-between items-center pt-6 border-t border-[#E7E2D8]">
                <div>
                    <span className="text-lg font-bold text-[#1A1A1A]">Grand Total:</span>
                    <span className="ml-2 text-xl font-extrabold text-[#6A7F3F]">₹{grandTotal.toFixed(2)}</span>
                </div>
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="px-6 py-3 text-[#1A1A1A] bg-[#F2C94C] rounded-[14px] hover:bg-[#e0b840] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F2C94C] disabled:opacity-50 shadow-md font-medium transition-all duration-200"
                >
                    {isLoading ? 'Creating...' : 'Create Purchase Order'}
                </button>
            </div>
             {error && <p className="text-red-500 text-sm mt-3 text-right">{error}</p>}
        </form>
    );
};

export default PurchaseOrderForm;