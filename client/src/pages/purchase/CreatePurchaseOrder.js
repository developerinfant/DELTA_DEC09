import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaExchangeAlt, FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

// This component can be moved to its own file later if needed
const PurchaseOrderForm = ({ suppliers, materials, rawMaterials, onOrderCreated, returnPath }) => {
    const [supplier, setSupplier] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('Net 30');
    const [items, setItems] = useState([{ 
        materialId: '', 
        materialModel: '', 
        itemCode: '',
        hsn: '',
        quantity: '', 
        uom: '',
        rate: '', 
        discountPercent: 0,
        gstPercent: 0
    }]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [comparisonData, setComparisonData] = useState([]);
    const [showComparisonPanel, setShowComparisonPanel] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [comparisonSupplier, setComparisonSupplier] = useState(''); // New state for supplier filter in comparison
    const [selectedSupplierDetails, setSelectedSupplierDetails] = useState(null);
    const [previousPOData, setPreviousPOData] = useState([]); // Store previously fetched PO data
    const navigate = useNavigate();

    const allMaterials = [
        ...materials.map(m => ({ ...m, type: 'PackingMaterial' })),
        ...rawMaterials.map(m => ({ ...m, type: 'RawMaterial' }))
    ];

    // Calculate line item values
    const calculateLineItem = useCallback((item) => {
        const quantity = parseFloat(item.quantity) || 0;
        const rate = parseFloat(item.rate) || 0;
        const discountPercent = parseFloat(item.discountPercent) || 0;
        const gstPercent = parseFloat(item.gstPercent) || 0;
        
        const gross = quantity * rate;
        const discountAmt = gross * (discountPercent / 100);
        const taxable = gross - discountAmt;
        const gstAmt = taxable * (gstPercent / 100);
        const cgst = gstAmt / 2;
        const sgst = gstAmt / 2;
        const lineTotal = taxable + gstAmt;
        
        return {
            gross: parseFloat(gross.toFixed(2)),
            discountAmt: parseFloat(discountAmt.toFixed(2)),
            taxable: parseFloat(taxable.toFixed(2)),
            gstAmt: parseFloat(gstAmt.toFixed(2)),
            cgst: parseFloat(cgst.toFixed(2)),
            sgst: parseFloat(sgst.toFixed(2)),
            lineTotal: parseFloat(lineTotal.toFixed(2))
        };
    }, []);

    // Calculate totals for all items
    const calculateTotals = useCallback(() => {
        let taxableAmount = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        
        items.forEach(item => {
            const lineItem = calculateLineItem(item);
            taxableAmount += lineItem.taxable;
            totalCGST += lineItem.cgst;
            totalSGST += lineItem.sgst;
        });
        
        const grandTotal = taxableAmount + totalCGST + totalSGST;
        const roundOff = Math.round(grandTotal) - grandTotal;
        const finalTotal = grandTotal + roundOff;
        
        return {
            taxableAmount: parseFloat(taxableAmount.toFixed(2)),
            totalCGST: parseFloat(totalCGST.toFixed(2)),
            totalSGST: parseFloat(totalSGST.toFixed(2)),
            grandTotal: parseFloat(grandTotal.toFixed(2)),
            roundOff: parseFloat(roundOff.toFixed(2)),
            finalTotal: parseFloat(finalTotal.toFixed(2))
        };
    }, [items, calculateLineItem]);

    const totals = calculateTotals();

    // Update comparison data when items change
    useEffect(() => {
        if (showComparisonPanel && previousPOData.length > 0) {
            updateComparisonData();
        }
    }, [items]);

    const updateComparisonData = () => {
        if (previousPOData.length === 0) return;
        
        // Get all materials from current items
        const materialIds = items
            .filter(item => item.materialId)
            .map(item => item.materialId);
        
        if (materialIds.length === 0) return;
        
        // Filter POs based on date range and supplier if provided
        let filteredPOs = previousPOData;
        if (dateFrom || dateTo || comparisonSupplier) {
            filteredPOs = previousPOData.filter(po => {
                const poDate = new Date(po.createdAt);
                // Date filtering
                if (dateFrom && poDate < new Date(dateFrom)) return false;
                if (dateTo && poDate > new Date(dateTo)) return false;
                // Supplier filtering
                if (comparisonSupplier && po.supplier?._id !== comparisonSupplier) return false;
                return true;
            });
        }
        
        // Group previous POs by material
        const materialComparisonData = [];
        
        materialIds.forEach(materialId => {
            const currentMaterial = allMaterials.find(m => m._id === materialId);
            if (!currentMaterial) return;
            
            // Find all POs that contain this material
            const matchingPOs = filteredPOs.filter(po => 
                po.items && po.items.some(item => 
                    item.material && item.material.toString() === materialId.toString()
                )
            );
            
            // Extract price history for this material
            const priceHistory = matchingPOs.map(po => {
                const poItem = po.items.find(item => 
                    item.material && item.material.toString() === materialId.toString()
                );
                
                return {
                    poNumber: po.poNumber,
                    poDate: po.createdAt,
                    supplier: po.supplier?.name || 'Unknown Supplier',
                    material: currentMaterial.name,
                    orderedQty: poItem?.quantity || 0,
                    previousPrice: poItem?.rate || poItem?.price || 0,
                    currentPrice: items.find(item => item.materialId === materialId)?.rate || 0
                };
            }).filter(record => record.previousPrice > 0); // Only include records with valid previous prices
            
            // Calculate differences and percentages
            const processedHistory = priceHistory.map(record => {
                const currentPrice = parseFloat(record.currentPrice) || 0;
                const previousPrice = parseFloat(record.previousPrice) || 0;
                const difference = currentPrice - previousPrice;
                const percentage = previousPrice !== 0 ? (difference / previousPrice) * 100 : 0;
                
                return {
                    ...record,
                    difference,
                    percentage
                };
            });
            
            if (processedHistory.length > 0) {
                materialComparisonData.push({
                    materialName: currentMaterial.name,
                    records: processedHistory
                });
            }
        });
        
        setComparisonData(materialComparisonData);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        
        // If the materialId changes, update the materialModel, rate, and HSN
        if (field === 'materialId') {
            const selectedMaterial = allMaterials.find(m => m._id === value);
            if(selectedMaterial) {
                newItems[index]['materialModel'] = selectedMaterial.type;
                newItems[index]['rate'] = selectedMaterial.price || '';
                newItems[index]['hsn'] = selectedMaterial.hsn || '';
                newItems[index]['uom'] = selectedMaterial.uom || '';
                newItems[index]['itemCode'] = selectedMaterial.itemCode || '';
            }
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { 
            materialId: '', 
            materialModel: '', 
            itemCode: '',
            hsn: '',
            quantity: '', 
            uom: '',
            rate: '', 
            discountPercent: 0,
            gstPercent: 0
        }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return; // Prevent removing the last item
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };
    
    // Function to compare prices with previous POs
    const comparePrices = async () => {
        if (items.length === 0) return;
        
        try {
            // Get all materials from current items
            const materialIds = items
                .filter(item => item.materialId)
                .map(item => item.materialId);
            
            if (materialIds.length === 0) return;
            
            // Fetch all POs that contain any of these materials
            const response = await api.get(`/purchase-orders`);
            const allPOs = response.data || [];
            
            // Store the fetched data for future updates
            setPreviousPOData(allPOs);
            
            // Filter POs based on date range and supplier if provided
            let filteredPOs = allPOs;
            if (dateFrom || dateTo || comparisonSupplier) {
                filteredPOs = allPOs.filter(po => {
                    const poDate = new Date(po.createdAt);
                    // Date filtering
                    if (dateFrom && poDate < new Date(dateFrom)) return false;
                    if (dateTo && poDate > new Date(dateTo)) return false;
                    // Supplier filtering
                    if (comparisonSupplier && po.supplier?._id !== comparisonSupplier) return false;
                    return true;
                });
            }
            
            // Group previous POs by material
            const materialComparisonData = [];
            
            materialIds.forEach(materialId => {
                const currentMaterial = allMaterials.find(m => m._id === materialId);
                if (!currentMaterial) return;
                
                // Find all POs that contain this material
                const matchingPOs = filteredPOs.filter(po => 
                    po.items && po.items.some(item => 
                        item.material && item.material.toString() === materialId.toString()
                    )
                );
                
                // Extract price history for this material
                const priceHistory = matchingPOs.map(po => {
                    const poItem = po.items.find(item => 
                        item.material && item.material.toString() === materialId.toString()
                    );
                    
                    return {
                        poNumber: po.poNumber,
                        poDate: po.createdAt,
                        supplier: po.supplier?.name || 'Unknown Supplier',
                        material: currentMaterial.name,
                        orderedQty: poItem?.quantity || 0,
                        previousPrice: poItem?.rate || poItem?.price || 0,
                        currentPrice: items.find(item => item.materialId === materialId)?.rate || 0
                    };
                }).filter(record => record.previousPrice > 0); // Only include records with valid previous prices
                
                // Calculate differences and percentages
                const processedHistory = priceHistory.map(record => {
                    const currentPrice = parseFloat(record.currentPrice) || 0;
                    const previousPrice = parseFloat(record.previousPrice) || 0;
                    const difference = currentPrice - previousPrice;
                    const percentage = previousPrice !== 0 ? (difference / previousPrice) * 100 : 0;
                    
                    return {
                        ...record,
                        difference,
                        percentage
                    };
                });
                
                if (processedHistory.length > 0) {
                    materialComparisonData.push({
                        materialName: currentMaterial.name,
                        records: processedHistory
                    });
                }
            });
            
            setComparisonData(materialComparisonData);
            setShowComparisonPanel(true);
            
            // Scroll to comparison panel
            setTimeout(() => {
                const panel = document.getElementById('comparison-panel');
                if (panel) {
                    panel.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
            
        } catch (err) {
            setError('Failed to fetch previous purchase orders for comparison.');
            console.error('Error fetching previous POs:', err);
        }
    };

    // Function to clear price comparison
    const clearComparison = () => {
        setComparisonData([]);
        setShowComparisonPanel(false);
        setDateFrom('');
        setDateTo('');
        setComparisonSupplier(''); // Clear supplier filter
        setPreviousPOData([]);
    };

    // Function to apply date filter
    const applyDateFilter = () => {
        updateComparisonData(); // Use existing data instead of re-fetching
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Validate items
        for (let item of items) {
            if (!item.materialId || !item.quantity || !item.rate) {
                setError('Please fill in all required fields for all items.');
                setIsLoading(false);
                return;
            }
            if (parseFloat(item.quantity) <= 0 || parseFloat(item.rate) <= 0) {
                setError('Quantity and rate must be greater than zero.');
                setIsLoading(false);
                return;
            }
        }

        const orderData = {
            supplier,
            items: items.map(item => ({
                material: item.materialId,
                materialModel: item.materialModel,
                itemCode: item.itemCode,
                hsn: item.hsn,
                quantity: Number(item.quantity),
                uom: item.uom,
                rate: Number(item.rate),
                discountPercent: Number(item.discountPercent),
                gstPercent: Number(item.gstPercent),
            })),
            expectedDeliveryDate,
            paymentTerms,
        };

        try {
            await api.post('/purchase-orders', orderData);
            onOrderCreated();
            // Navigate to the appropriate view based on where the user came from
            navigate(returnPath || '/purchase-orders');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create purchase order.');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to get price difference color
    const getPriceDifferenceColor = (difference, percentage) => {
        if (difference > 0) return 'text-red-600'; // Price increased
        if (difference < 0) return 'text-green-600'; // Price decreased
        return 'text-gray-500'; // No change
    };

    // Function to format date
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB');
    };

    // Handle supplier selection
    const handleSupplierChange = async (e) => {
        const supplierId = e.target.value;
        setSupplier(supplierId);
        
        // Find the selected supplier and auto-fill details
        const selectedSupplier = suppliers.find(s => s._id === supplierId);
        if (selectedSupplier) {
            // Fetch full supplier details from the backend
            try {
                const response = await api.get(`/suppliers/${supplierId}`);
                setSelectedSupplierDetails(response.data);
                
                // Auto-fill payment terms if available
                if (response.data.paymentTerms) {
                    setPaymentTerms(response.data.paymentTerms);
                }
            } catch (err) {
                console.error('Failed to fetch supplier details:', err);
            }
        } else {
            setSelectedSupplierDetails(null);
        }
    };

    return (
        <Card title="Create New Purchase Order" className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-dark-700">Purchase Order Details</h2>
                <button 
                    type="button" 
                    onClick={comparePrices}
                    disabled={items.filter(item => item.materialId).length === 0}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                        items.filter(item => item.materialId).length > 0
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-md' 
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    <FaExchangeAlt className="mr-2" />
                    Compare Prices
                </button>
            </div>
            
            {/* Supplier Details Preview */}
            {selectedSupplierDetails && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">Supplier Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <span className="font-medium text-blue-700 block">GSTIN:</span> 
                            <span className="text-gray-700">{selectedSupplierDetails.gstin || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <span className="font-medium text-blue-700 block">Phone:</span> 
                            <span className="text-gray-700">{selectedSupplierDetails.phoneNumber || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <span className="font-medium text-blue-700 block">Email:</span> 
                            <span className="text-gray-700">{selectedSupplierDetails.email || 'N/A'}</span>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <span className="font-medium text-blue-700 block">Payment Terms:</span> 
                            <span className="text-gray-700">{selectedSupplierDetails.paymentTerms || 'N/A'}</span>
                        </div>
                    </div>
                    <div className="mt-3 bg-white p-3 rounded-lg shadow-sm">
                        <span className="font-medium text-blue-700 block">Address:</span> 
                        <span className="text-gray-700">{selectedSupplierDetails.address || 'N/A'}</span>
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Supplier and Date Section */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                            <select 
                                id="supplier" 
                                value={supplier} 
                                onChange={handleSupplierChange} 
                                required 
                                className="w-full px-4 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="" disabled>Select a supplier</option>
                                {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expectedDeliveryDate" className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date</label>
                            <input 
                                type="date" 
                                id="expectedDeliveryDate" 
                                value={expectedDeliveryDate} 
                                onChange={(e) => setExpectedDeliveryDate(e.target.value)} 
                                className="w-full px-4 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label htmlFor="paymentTerms" className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                            <select 
                                id="paymentTerms" 
                                value={paymentTerms} 
                                onChange={(e) => setPaymentTerms(e.target.value)} 
                                className="w-full px-4 py-2.5 text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="Net 30">Net 30</option>
                                <option value="Net 15">Net 15</option>
                                <option value="Net 45">Net 45</option>
                                <option value="Cash on Delivery">Cash on Delivery</option>
                                <option value="Immediate">Immediate</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Items Section */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-800">Items</h3>
                        <button 
                            type="button" 
                            onClick={addItem}
                            className="flex items-center px-3 py-1.5 text-sm bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition shadow-sm"
                        >
                            <FaPlus className="mr-1" /> Add Item
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate (₹)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc%</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST%</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map((item, index) => {
                                    const lineItem = calculateLineItem(item);
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{index + 1}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="text" 
                                                    value={item.itemCode || ''} 
                                                    onChange={(e) => handleItemChange(index, 'itemCode', e.target.value)} 
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <select 
                                                    value={item.materialId} 
                                                    onChange={(e) => handleItemChange(index, 'materialId', e.target.value)} 
                                                    required 
                                                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                >
                                                    <option value="" disabled>Select material</option>
                                                    {allMaterials.map(m => (
                                                        <option key={m._id} value={m._id}>
                                                            {m.name} ({m.type.replace('Material', '')})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="text" 
                                                    value={item.hsn} 
                                                    onChange={(e) => handleItemChange(index, 'hsn', e.target.value)} 
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    step="1"
                                                    value={item.quantity} 
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
                                                    required 
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="text" 
                                                    value={item.uom} 
                                                    onChange={(e) => handleItemChange(index, 'uom', e.target.value)} 
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0"
                                                    value={item.rate} 
                                                    onChange={(e) => handleItemChange(index, 'rate', e.target.value)} 
                                                    required 
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0"
                                                    max="100"
                                                    value={item.discountPercent} 
                                                    onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)} 
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0"
                                                    max="100"
                                                    value={item.gstPercent} 
                                                    onChange={(e) => handleItemChange(index, 'gstPercent', e.target.value)} 
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {lineItem.lineTotal.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                                {items.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeItem(index)} 
                                                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition"
                                                        title="Remove item"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                {/* Totals Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-3"></div>
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Taxable Amount:</span>
                                        <span className="font-medium">₹{totals.taxableAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total CGST:</span>
                                        <span className="font-medium">₹{totals.totalCGST.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total SGST:</span>
                                        <span className="font-medium">₹{totals.totalSGST.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Round Off:</span>
                                        <span className="font-medium">₹{totals.roundOff.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t border-gray-200">
                                        <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                                        <span className="text-lg font-extrabold text-blue-600">₹{totals.finalTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-gray-200">
                                        <span className="text-sm text-gray-600">Amount in Words: </span>
                                        <span className="text-sm font-medium">
                                            Rupees {totals.finalTotal > 0 ? 
                                                // Convert number to words (simplified version)
                                                `${Math.floor(totals.finalTotal).toLocaleString('en-IN')} and ${Math.round((totals.finalTotal - Math.floor(totals.finalTotal)) * 100)}/100 Only` : 
                                                'Zero Only'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Price Comparison Section */}
                {showComparisonPanel && (
                    <div id="comparison-panel" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ease-in-out">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-xl">
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                <h3 className="text-lg font-bold flex items-center">
                                    <FaExchangeAlt className="mr-2" />
                                    Purchase Order Comparison
                                </h3>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    {/* Supplier Filter - Added before date filters */}
                                    <div className="flex items-center">
                                        <label className="text-sm mr-2 whitespace-nowrap">Supplier:</label>
                                        <select 
                                            value={comparisonSupplier} 
                                            onChange={(e) => setComparisonSupplier(e.target.value)}
                                            className="text-sm px-2 py-1 rounded text-gray-800 min-w-[120px]"
                                        >
                                            <option value="">All Suppliers</option>
                                            {suppliers.map(supplier => (
                                                <option key={supplier._id} value={supplier._id}>
                                                    {supplier.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-sm mr-2">From:</label>
                                        <input 
                                            type="date" 
                                            value={dateFrom} 
                                            onChange={(e) => setDateFrom(e.target.value)}
                                            className="text-sm px-2 py-1 rounded text-gray-800"
                                        />
                                    </div>
                                    <div className="flex items-center">
                                        <label className="text-sm mr-2">To:</label>
                                        <input 
                                            type="date" 
                                            value={dateTo} 
                                            onChange={(e) => setDateTo(e.target.value)}
                                            className="text-sm px-2 py-1 rounded text-gray-800"
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={applyDateFilter}
                                        className="px-3 py-1 bg-white text-blue-600 text-sm rounded hover:bg-gray-100 font-medium whitespace-nowrap"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={clearComparison}
                                    className="px-3 py-1 bg-white text-blue-600 text-sm rounded hover:bg-gray-100 flex items-center font-medium whitespace-nowrap"
                                >
                                    <FaTimes className="mr-1" /> Clear
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            {comparisonData.length > 0 ? (
                                <div className="space-y-6">
                                    {comparisonData.map((materialData, index) => (
                                        <div key={index} className="bg-gray-50 rounded-lg shadow-sm overflow-hidden">
                                            <div className="bg-white px-4 py-3 border-b border-gray-200">
                                                <h4 className="font-semibold text-gray-800 text-lg">{materialData.materialName}</h4>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Date</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered Qty</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Previous Price (₹)</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price (₹)</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Difference (₹)</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change (%)</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {materialData.records.map((record, recordIndex) => (
                                                            <tr key={recordIndex} className="hover:bg-gray-50">
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.poNumber}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(record.poDate)}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{record.supplier}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{record.orderedQty}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">₹{parseFloat(record.previousPrice).toFixed(2)}</td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">₹{parseFloat(record.currentPrice).toFixed(2)}</td>
                                                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${getPriceDifferenceColor(record.difference, record.percentage)}`}>
                                                                    {record.difference >= 0 ? '+' : ''}{record.difference.toFixed(2)}
                                                                </td>
                                                                <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${getPriceDifferenceColor(record.difference, record.percentage)}`}>
                                                                    {record.percentage >= 0 ? '+' : ''}{record.percentage.toFixed(2)}%
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                    <p>No previous purchase records found for the selected materials{comparisonSupplier ? ` from supplier ${suppliers.find(s => s._id === comparisonSupplier)?.name || ''}` : ''}{dateFrom || dateTo ? ' within the selected date range' : ''}.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Submit */}
                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="px-6 py-3 text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-gray-400 disabled:to-gray-500 shadow-md font-medium transition"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <FaSpinner className="animate-spin mr-2" />
                                Creating...
                            </span>
                        ) : 'Create Purchase Order'}
                    </button>
                </div>
                 {error && <p className="text-red-500 text-sm mt-2 text-right">{error}</p>}
            </form>
        </Card>
    );
};


const CreatePurchaseOrder = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Determine material type based on the current route
    const getMaterialType = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return 'raw';
        } else if (location.pathname.includes('/packing/')) {
            return 'packing';
        }
        // Default to packing materials
        return 'packing';
    };

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Determine material type based on route
                const materialType = location.pathname.includes('/stock/maintenance/') ? 'raw' : 'packing';
                
                let suppliersRes, materialsRes, rawMaterialsRes;
                
                // Fetch all suppliers and filter on client side
                const allSuppliersRes = await api.get('/suppliers');
                const allSuppliers = allSuppliersRes.data;
                
                // Filter suppliers based on material type
                // Suppliers with no materialType are considered suitable for both types
                const filteredSuppliers = allSuppliers.filter(supplier => 
                    !supplier.materialType || supplier.materialType === materialType || supplier.materialType === 'both'
                );
                
                // Fetch materials based on material type
                if (materialType === 'raw') {
                    // For raw materials, fetch only raw materials
                    rawMaterialsRes = await api.get('/stock/raw-materials');
                    setSuppliers(filteredSuppliers);
                    setRawMaterials(rawMaterialsRes.data);
                    setMaterials([]); // No packing materials for raw material POs
                } else {
                    // For packing materials, fetch only packing materials
                    materialsRes = await api.get('/materials');
                    setSuppliers(filteredSuppliers);
                    setMaterials(materialsRes.data);
                    setRawMaterials([]); // No raw materials for packing material POs
                }
            } catch (err) {
                setError('Failed to load necessary data. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [location.pathname]);
    
    const handleOrderCreated = () => {
        // This function can be used to show a success message or clear some global state if needed
        console.log("Purchase order created successfully!");
    }

    // Determine where to navigate after PO creation based on the current route
    const getReturnPath = () => {
        if (location.pathname.includes('/stock/maintenance/')) {
            return '/stock/maintenance/purchase-orders';
        } else if (location.pathname.includes('/packing/')) {
            return '/packing/purchase-orders';
        }
        // Default to packing POs view
        return '/purchase-orders';
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <PurchaseOrderForm 
            suppliers={suppliers}
            materials={materials}
            rawMaterials={rawMaterials}
            onOrderCreated={handleOrderCreated}
            returnPath={getReturnPath()}
        />
    );
};

export default CreatePurchaseOrder;