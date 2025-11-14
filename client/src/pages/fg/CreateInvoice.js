import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaTrash, FaPlus, FaInfoCircle, FaExclamationTriangle } from 'react-icons/fa';

const CreateInvoice = () => {
    const navigate = useNavigate();
    const [buyers, setBuyers] = useState([]);
    const [products, setProducts] = useState([]); // Add products state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        invoiceDate: new Date().toISOString().split('T')[0],
        buyerId: '',
        billedTo: '',
        shippedTo: '',
        dispatchFrom: '',
        noOfPackages: '',
        transportName: '',
        termsOfPayment: '',
        destination: '',
        poNoDate: '',
        deliveryChallanNoDate: '',
        salesman: ''
    });
    
    const [items, setItems] = useState([
        { 
            id: Date.now(), // Unique ID for each item
            sn: 1, 
            itemCode: '', 
            product: '', 
            hsn: '', 
            gstPercent: 5, 
            scheme: '', 
            uom: 'Cartons', // Default to Cartons
            qty: 0, 
            rate: 0, 
            discPercent: 0, 
            amount: 0,
            available_cartons: 0,
            available_pieces: 0,
            broken_carton_pieces: 0,
            units_per_carton: 1
        }
    ]);
    
    // Financial calculations
    const [schemeDiscount, setSchemeDiscount] = useState(0);
    const [taxableAmount, setTaxableAmount] = useState(0);
    const [gstType, setGstType] = useState('CGST+SGST'); // Default to CGST+SGST
    const [cgstPercent, setCgstPercent] = useState(2.5);
    const [sgstPercent, setSgstPercent] = useState(2.5);
    const [igstPercent, setIgstPercent] = useState(5);
    const [cgstAmount, setCgstAmount] = useState(0);
    const [sgstAmount, setSgstAmount] = useState(0);
    const [igstAmount, setIgstAmount] = useState(0);
    const [roundOff, setRoundOff] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);
    const [amountInWords, setAmountInWords] = useState('');

    // Fetch buyers and products on component mount
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch buyers
                const buyersRes = await api.get('/fg/buyers');
                setBuyers(buyersRes.data);
                
                // Fetch products from stock report
                const productsRes = await api.get('/fg/stock-report');
                const availableProducts = productsRes.data.filter(stock => 
                    stock.available_cartons > 0 || stock.broken_carton_pieces > 0
                );
                setProducts(availableProducts);
            } catch (err) {
                setError('Failed to load data.');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchData();
    }, []);

    // Update buyer details and GST type when buyer is selected
    useEffect(() => {
        if (formData.buyerId) {
            const selectedBuyer = buyers.find(b => b._id === formData.buyerId);
            if (selectedBuyer) {
                const address = `${selectedBuyer.address}, ${selectedBuyer.city}, ${selectedBuyer.state} - ${selectedBuyer.pincode}`;
                setFormData(prev => ({
                    ...prev,
                    billedTo: address,
                    shippedTo: address,
                    transportName: selectedBuyer.transportName || '',
                    termsOfPayment: selectedBuyer.paymentTerms || '',
                    destination: selectedBuyer.destination || ''
                }));
                
                // Set GST type and percentages based on buyer state
                if (selectedBuyer.state && selectedBuyer.state.trim().toLowerCase() === 'tamil nadu') {
                    setGstType('CGST+SGST');
                    setCgstPercent(2.5);
                    setSgstPercent(2.5);
                    setIgstPercent(0);
                    // Update all items with 5% GST (2.5% CGST + 2.5% SGST)
                    setItems(prevItems => prevItems.map(item => ({
                        ...item,
                        gstPercent: 5
                    })));
                } else {
                    setGstType('IGST');
                    setCgstPercent(0);
                    setSgstPercent(0);
                    setIgstPercent(5);
                    // Update all items with 5% GST (IGST)
                    setItems(prevItems => prevItems.map(item => ({
                        ...item,
                        gstPercent: 5
                    })));
                }
            }
        }
    }, [formData.buyerId, buyers]);

    // Calculate totals when items, scheme discount, or GST type change
    useEffect(() => {
        // Calculate item amounts
        const updatedItems = items.map(item => {
            const amount = (item.qty * item.rate) * (1 - item.discPercent / 100);
            return { ...item, amount: parseFloat(amount.toFixed(2)) };
        });
        
        setItems(updatedItems);
        
        // Calculate totals based on GST type
        const totalAmount = updatedItems.reduce((sum, item) => sum + item.amount, 0);
        const taxable = totalAmount - schemeDiscount;
        
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        
        if (gstType === 'CGST+SGST') {
            // Tamil Nadu - CGST 2.5% + SGST 2.5%
            cgst = taxable * (2.5 / 100);
            sgst = taxable * (2.5 / 100);
        } else if (gstType === 'IGST') {
            // Other states - IGST 5%
            igst = taxable * (5 / 100);
        }
        
        const totalWithTax = taxable + cgst + sgst + igst;
        const roundedTotal = Math.round(totalWithTax);
        const roundOffValue = roundedTotal - totalWithTax;
        
        setTaxableAmount(parseFloat(taxable.toFixed(2)));
        setCgstAmount(parseFloat(cgst.toFixed(2)));
        setSgstAmount(parseFloat(sgst.toFixed(2)));
        setIgstAmount(parseFloat(igst.toFixed(2)));
        setRoundOff(parseFloat(roundOffValue.toFixed(2)));
        setGrandTotal(parseFloat(roundedTotal.toFixed(2)));
        
        // Update GST percentages
        setCgstPercent(gstType === 'CGST+SGST' ? 2.5 : 0);
        setSgstPercent(gstType === 'CGST+SGST' ? 2.5 : 0);
        setIgstPercent(gstType === 'IGST' ? 5 : 0);
        
        // Convert to words
        setAmountInWords(convertNumberToWords(roundedTotal));
    }, [items, schemeDiscount, gstType]);

    // Convert number to words
    const convertNumberToWords = (num) => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        
        if (num === 0) return 'Zero';
        
        let words = '';
        
        if (Math.floor(num / 10000000) > 0) {
            words += convertNumberToWords(Math.floor(num / 10000000)) + ' Crore ';
            num %= 10000000;
        }
        
        if (Math.floor(num / 100000) > 0) {
            words += convertNumberToWords(Math.floor(num / 100000)) + ' Lakh ';
            num %= 100000;
        }
        
        if (Math.floor(num / 1000) > 0) {
            words += convertNumberToWords(Math.floor(num / 1000)) + ' Thousand ';
            num %= 1000;
        }
        
        if (Math.floor(num / 100) > 0) {
            words += convertNumberToWords(Math.floor(num / 100)) + ' Hundred ';
            num %= 100;
        }
        
        if (num > 0) {
            if (num < 10) {
                words += ones[num];
            } else if (num < 20) {
                words += teens[num - 10];
            } else {
                words += tens[Math.floor(num / 10)];
                if (num % 10 > 0) {
                    words += ' ' + ones[num % 10];
                }
            }
        }
        
        return words.trim() + ' Only';
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle item change
    const handleItemChange = (id, field, value) => {
        setItems(prevItems => 
            prevItems.map(item => {
                if (item.id === id) {
                    const updatedItem = { ...item, [field]: value };
                    
                    // If product changes, auto-fill itemCode, HSN, and stock details
                    if (field === 'product') {
                        const selectedProduct = products.find(p => p.productName === value);
                        if (selectedProduct) {
                            updatedItem.itemCode = selectedProduct.itemCode || '';
                            updatedItem.hsn = ''; // HSN would need to be stored in the product data
                            updatedItem.available_cartons = selectedProduct.available_cartons;
                            updatedItem.available_pieces = selectedProduct.available_pieces;
                            updatedItem.broken_carton_pieces = selectedProduct.broken_carton_pieces;
                            updatedItem.units_per_carton = selectedProduct.units_per_carton || 1;
                            // Reset quantities when changing product
                            updatedItem.qty = 0;
                        }
                    }
                    
                    // Auto-calculate amount when qty or rate changes
                    if (field === 'qty' || field === 'rate' || field === 'discPercent') {
                        const qty = field === 'qty' ? parseFloat(value) || 0 : updatedItem.qty;
                        const rate = field === 'rate' ? parseFloat(value) || 0 : updatedItem.rate;
                        const discPercent = field === 'discPercent' ? parseFloat(value) || 0 : updatedItem.discPercent;
                        const amount = (qty * rate) * (1 - discPercent / 100);
                        updatedItem.amount = parseFloat(amount.toFixed(2));
                    }
                    
                    return updatedItem;
                }
                return item;
            })
        );
    };

    // Add new item
    const addItem = () => {
        setItems(prevItems => [
            ...prevItems,
            { 
                id: Date.now(),
                sn: prevItems.length + 1, 
                itemCode: '', 
                product: '', 
                hsn: '', 
                gstPercent: gstType === 'IGST' ? 5 : 5, // 5% for both IGST and CGST+SGST (2.5% + 2.5%)
                scheme: '', 
                uom: 'Cartons', 
                qty: 0, 
                rate: 0, 
                discPercent: 0, 
                amount: 0,
                available_cartons: 0,
                available_pieces: 0,
                broken_carton_pieces: 0,
                units_per_carton: 1
            }
        ]);
    };

    // Remove item
    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(prevItems => {
                const filteredItems = prevItems.filter(item => item.id !== id);
                // Renumber serial numbers
                return filteredItems.map((item, index) => ({
                    ...item,
                    sn: index + 1
                }));
            });
        }
    };

    // Validate quantity against available stock
    const validateQuantity = (item) => {
        const selectedProduct = products.find(p => p.productName === item.product);
        if (!selectedProduct) return '';
        
        const qty = parseFloat(item.qty) || 0;
        
        if (item.uom === 'Cartons') {
            if (qty > selectedProduct.available_cartons) {
                return `You entered quantity above available stock. Maximum available: ${selectedProduct.available_cartons} cartons.`;
            }
        } else if (item.uom === 'Pieces') {
            // Calculate total available pieces including cartons that can be broken
            const totalAvailablePieces = selectedProduct.available_pieces + 
                                        selectedProduct.broken_carton_pieces + 
                                        (selectedProduct.available_cartons * item.units_per_carton);
            
            if (qty > totalAvailablePieces) {
                return `You entered quantity above available stock. Maximum available: ${totalAvailablePieces} pieces.`;
            }
        }
        
        return '';
    };

    // Handle quantity validation and auto-correction
    const handleQuantityValidation = (id) => {
        setItems(prevItems => 
            prevItems.map(item => {
                if (item.id === id) {
                    const errorMessage = validateQuantity(item);
                    if (errorMessage) {
                        // Extract maximum available quantity from error message
                        const match = errorMessage.match(/Maximum available: ([\d.]+)/);
                        if (match) {
                            const maxAvailable = parseFloat(match[1]);
                            // Auto-correct quantity to maximum available
                            return { ...item, qty: maxAvailable };
                        }
                    }
                }
                return item;
            })
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Validate quantities before submission
            let hasValidationError = false;
            for (const item of items) {
                const errorMessage = validateQuantity(item);
                if (errorMessage) {
                    hasValidationError = true;
                    alert(errorMessage);
                    break;
                }
            }
            
            if (hasValidationError) {
                return;
            }

            const invoiceData = {
                ...formData,
                items: items.map(item => ({
                    sn: item.sn,
                    itemCode: item.itemCode,
                    product: item.product,
                    hsn: item.hsn,
                    gstPercent: item.gstPercent,
                    scheme: item.scheme,
                    uom: item.uom,
                    qty: item.qty,
                    rate: item.rate,
                    discPercent: item.discPercent,
                    amount: item.amount
                })),
                schemeDiscount,
                // Add GST calculation data
                gstType,
                taxableAmount,
                cgstAmount: gstType === 'CGST+SGST' ? cgstAmount : 0,
                sgstAmount: gstType === 'CGST+SGST' ? sgstAmount : 0,
                igstAmount: gstType === 'IGST' ? igstAmount : 0,
                cgstPercent: gstType === 'CGST+SGST' ? cgstPercent : 0,
                sgstPercent: gstType === 'CGST+SGST' ? sgstPercent : 0,
                igstPercent: gstType === 'IGST' ? igstPercent : 0,
                roundOff,
                grandTotal,
                amountInWords
            };

            await api.post('/fg/invoices', invoiceData);
            navigate('/fg/invoice/view'); // Fixed the navigation path
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create invoice.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && items.length === 1 && items[0].product === '') {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-3xl text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-dark-700">Create New Invoice</h1>
            </div>

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                </div>
            )}

            <Card>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Invoice Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice Date *
                            </label>
                            <input
                                type="date"
                                name="invoiceDate"
                                value={formData.invoiceDate}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Buyer *
                            </label>
                            <select
                                name="buyerId"
                                value={formData.buyerId}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            >
                                <option value="">Select a Buyer</option>
                                {buyers.map(buyer => (
                                    <option key={buyer._id} value={buyer._id}>
                                        {buyer.name} ({buyer.buyerCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                GST Type
                            </label>
                            <input
                                type="text"
                                value={gstType}
                                readOnly
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {gstType === 'CGST+SGST' 
                                    ? 'CGST 2.5% + SGST 2.5% (Tamil Nadu)' 
                                    : 'IGST 5% (Other States)'}
                            </p>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Billed To *
                            </label>
                            <textarea
                                name="billedTo"
                                value={formData.billedTo}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Shipped To
                            </label>
                            <textarea
                                name="shippedTo"
                                value={formData.shippedTo}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                No. of Packages
                            </label>
                            <input
                                type="number"
                                name="noOfPackages"
                                value={formData.noOfPackages}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Transport Name
                            </label>
                            <input
                                type="text"
                                name="transportName"
                                value={formData.transportName}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Terms of Payment
                            </label>
                            <select
                                name="termsOfPayment"
                                value={formData.termsOfPayment}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Select Terms</option>
                                <option value="Advance">Advance</option>
                                <option value="Credit">Credit</option>
                                <option value="Partial">Partial</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Destination
                            </label>
                            <input
                                type="text"
                                name="destination"
                                value={formData.destination}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST%</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheme</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disc%</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {items.map((item, index) => {
                                    const quantityError = validateQuantity(item);
                                    return (
                                        <tr key={item.id}>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                {item.sn}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="text"
                                                    value={item.itemCode}
                                                    readOnly
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <select
                                                    value={item.product}
                                                    onChange={(e) => handleItemChange(item.id, 'product', e.target.value)}
                                                    className="w-40 px-2 py-1 text-sm border border-gray-300 rounded"
                                                    required
                                                >
                                                    <option value="">Select Product</option>
                                                    {products.map(p => (
                                                        <option key={p.productName} value={p.productName}>
                                                            {p.productName} - {p.available_cartons} Cartons / {p.broken_carton_pieces} Pieces
                                                        </option>
                                                    ))}
                                                </select>
                                                {quantityError && (
                                                    <div className="flex items-center mt-1 text-red-500 text-xs">
                                                        <FaExclamationTriangle className="mr-1" />
                                                        {quantityError}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="text"
                                                    value={item.hsn}
                                                    onChange={(e) => handleItemChange(item.id, 'hsn', e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    value={item.gstPercent}
                                                    readOnly
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="text"
                                                    value={item.scheme}
                                                    onChange={(e) => handleItemChange(item.id, 'scheme', e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <select
                                                    value={item.uom}
                                                    onChange={(e) => handleItemChange(item.id, 'uom', e.target.value)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                >
                                                    <option value="Cartons">Cartons</option>
                                                    <option value="Pieces">Pieces</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    value={item.qty}
                                                    onChange={(e) => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)}
                                                    onBlur={() => handleQuantityValidation(item.id)}
                                                    className={`w-16 px-2 py-1 text-sm border border-gray-300 rounded ${quantityError ? 'border-red-500' : ''}`}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    value={item.rate}
                                                    onChange={(e) => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    value={item.discPercent}
                                                    onChange={(e) => handleItemChange(item.id, 'discPercent', parseFloat(e.target.value) || 0)}
                                                    className="w-16 px-2 py-1 text-sm border border-gray-300 rounded"
                                                    min="0"
                                                    max="100"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <input
                                                    type="number"
                                                    value={item.amount}
                                                    readOnly
                                                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100"
                                                />
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    disabled={items.length === 1}
                                                >
                                                    <FaTrash />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                <FaPlus className="mr-2" />
                                Add Item
                            </button>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Scheme Discount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Scheme Discount
                            </label>
                            <input
                                type="number"
                                value={schemeDiscount}
                                onChange={(e) => setSchemeDiscount(parseFloat(e.target.value) || 0)}
                                className="w-full md:w-1/2 px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        
                        {/* Tax Summary */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Tax Summary</h3>
                            
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Taxable Amount:</span>
                                    <span className="font-medium">₹{taxableAmount.toFixed(2)}</span>
                                </div>
                                
                                {gstType === 'CGST+SGST' ? (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">CGST ({cgstPercent}%):</span>
                                            <span className="font-medium">₹{cgstAmount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">SGST ({sgstPercent}%):</span>
                                            <span className="font-medium">₹{sgstAmount.toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">IGST ({igstPercent}%):</span>
                                        <span className="font-medium">₹{igstAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Round Off:</span>
                                    <span className="font-medium">₹{roundOff.toFixed(2)}</span>
                                </div>
                                
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-medium text-gray-900">Grand Total:</span>
                                        <span className="text-lg font-medium text-gray-900">₹{grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-2">
                                    <span className="text-gray-600">Amount in Words: </span>
                                    <span className="font-medium">{amountInWords}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <button
                            type="button"
                            onClick={() => navigate('/fg/invoice/view')} // Fixed the navigation path
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 flex items-center"
                            disabled={isLoading}
                        >
                            {isLoading && <FaSpinner className="animate-spin mr-2" />}
                            Create Invoice
                        </button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateInvoice;