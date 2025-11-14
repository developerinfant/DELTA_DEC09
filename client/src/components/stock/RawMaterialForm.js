import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import api from '../../api';

const RawMaterialForm = ({ onMaterialAdded }) => {
    // --- State for form fields ---
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [perQuantityPrice, setPerQuantityPrice] = useState('');
    const [totalPrice, setTotalPrice] = useState('');
    const [stockAlertThreshold, setStockAlertThreshold] = useState('');
    const [itemCode, setItemCode] = useState(''); // Add itemCode state
    
    // --- State for loading and error handling ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch the next item code when the component mounts
    useEffect(() => {
        const fetchNextItemCode = async () => {
            try {
                const response = await api.get('/stock/raw-materials/next-item-code');
                setItemCode(response.data.nextItemCode);
            } catch (err) {
                console.error('Failed to fetch next item code', err);
            }
        };

        fetchNextItemCode();
    }, []);

    // Calculate total price when quantity or per-quantity price changes
    useEffect(() => {
        if (quantity && perQuantityPrice) {
            const total = parseFloat(quantity) * parseFloat(perQuantityPrice);
            setTotalPrice(total.toFixed(2));
        } else {
            setTotalPrice('');
        }
    }, [quantity, perQuantityPrice]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // --- Client-side validation ---
        if (!name || !quantity || !perQuantityPrice || !stockAlertThreshold) {
            setError('All fields are required.');
            return;
        }

        setIsLoading(true);
        const newMaterial = {
            itemCode, // Include itemCode in the material data
            name,
            quantity: Number(quantity),
            perQuantityPrice: Number(perQuantityPrice),
            stockAlertThreshold: Number(stockAlertThreshold),
        };
        
        try {
            // --- Real API Call ---
            const { data } = await api.post('/stock/raw-materials', newMaterial);
            onMaterialAdded(data);
            
            // --- Reset form fields ---
            setName('');
            setQuantity('');
            setPerQuantityPrice('');
            setTotalPrice('');
            setStockAlertThreshold('');
            
            // Fetch the next item code for the next material
            try {
                const response = await api.get('/stock/raw-materials/next-item-code');
                setItemCode(response.data.nextItemCode);
            } catch (err) {
                console.error('Failed to fetch next item code', err);
            }
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to add material.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card title="Add New Raw Material">
            <form onSubmit={handleSubmit}>
                {/* Form layout using CSS Grid for responsiveness */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 items-end">
                    {/* Item Code */}
                    <div>
                        <label htmlFor="itemCode" className="block text-sm font-medium text-dark-700">Item Code</label>
                        <input
                            type="text"
                            id="itemCode"
                            value={itemCode}
                            readOnly
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Auto-generated (e.g., RM-00012)"
                            title="System-generated code for this material type"
                        />
                    </div>

                    {/* Material Name */}
                    <div className="lg:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-dark-700">Raw Material Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., Cardboard Boxes"
                        />
                    </div>

                    {/* Quantity */}
                    <div>
                        <label htmlFor="quantity" className="block text-sm font-medium text-dark-700">Quantity</label>
                        <input
                            type="number"
                            id="quantity"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="0"
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., 100"
                        />
                    </div>

                    {/* Per Quantity Price */}
                    <div>
                        <label htmlFor="perQuantityPrice" className="block text-sm font-medium text-dark-700">Per Quantity Price (₹)</label>
                        <input
                            type="number"
                            id="perQuantityPrice"
                            value={perQuantityPrice}
                            onChange={(e) => setPerQuantityPrice(e.target.value)}
                            min="0"
                            step="0.01"
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., 5.00"
                        />
                    </div>

                    {/* Total Price (Calculated) */}
                    <div>
                        <label htmlFor="totalPrice" className="block text-sm font-medium text-dark-700">Total Price (₹)</label>
                        <input
                            type="text"
                            id="totalPrice"
                            value={totalPrice}
                            readOnly
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Calculated"
                        />
                    </div>

                    {/* Stock Alert Threshold */}
                    <div className="lg:col-span-2">
                        <label htmlFor="threshold" className="block text-sm font-medium text-dark-700">Alert Threshold</label>
                        <input
                            type="number"
                            id="threshold"
                            value={stockAlertThreshold}
                            onChange={(e) => setStockAlertThreshold(e.target.value)}
                            min="0"
                            className="mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., 20"
                        />
                    </div>
                
                    {/* Submit Button */}
                    <div className="text-right lg:col-span-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-red-300"
                        >
                            {isLoading ? 'Adding...' : 'Add Raw Material'}
                        </button>
                    </div>
                </div>

                {/* Display submission error, if any */}
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                
            </form>
        </Card>
    );
};

export default RawMaterialForm;