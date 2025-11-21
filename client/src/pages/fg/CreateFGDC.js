import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaExclamationTriangle, FaInfoCircle, FaPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { io } from 'socket.io-client';

const CreateFGDC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Form state
    const [formData, setFormData] = useState({
        dispatch_type: '',
        date: new Date().toISOString().split('T')[0],
        receiver_type: '',
        receiver_name: '',
        receiver_details: '',
        remarks: ''
    });
    
    // UI state
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    // Socket connection
    const [socket, setSocket] = useState(null);
    
    // Fetch available products with carton/piece details
    useEffect(() => {
        const fetchProductStocks = async () => {
            setIsLoading(true);
            try {
                // Fetch all product stocks
                const response = await api.get('/fg/stock-report');
                const stocks = response.data;
                
                // Filter out products with no available stock
                // Include products with 0 cartons but broken pieces > 0
                const availableProducts = stocks.filter(stock => 
                    stock.available_cartons > 0 || stock.available_pieces > 0 || stock.broken_carton_pieces > 0
                );
                
                setProducts(availableProducts);
            } catch (err) {
                setError('Failed to load product stocks. Please try refreshing.');
                console.error('Error fetching product stocks:', err);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchProductStocks();
        
        // Initialize socket connection
        const newSocket = io();
        setSocket(newSocket);
        
        // Listen for stock updates
        newSocket.on('stockUpdate', (updatedStock) => {
            setProducts(prevProducts => 
                prevProducts.map(product => 
                    product.productName === updatedStock.product_name 
                        ? { ...product, ...updatedStock }
                        : product
                )
            );
        });
        
        // Clean up socket connection
        return () => {
            newSocket.close();
        };
    }, []);
    
    // Add a new product to the selection
    const addProduct = () => {
        setSelectedProducts(prev => [
            ...prev,
            {
                id: Date.now(), // Unique ID for this product entry
                product_name: '',
                issue_type: 'Carton', // Default to Carton
                quantity: '',
                carton_quantity: '',
                piece_quantity: '',
                units_per_carton: 1,
                available_cartons: 0,
                available_pieces: 0,
                broken_carton_pieces: 0
            }
        ]);
    };
    
    // Remove a product from the selection
    const removeProduct = (id) => {
        setSelectedProducts(prev => prev.filter(product => product.id !== id));
    };
    
    // Update a product field
    const updateProduct = (id, field, value) => {
        setSelectedProducts(prev => 
            prev.map(product => {
                if (product.id === id) {
                    const updatedProduct = { ...product, [field]: value };
                    
                    // If product name changes, update related fields
                    if (field === 'product_name') {
                        const selectedProduct = products.find(p => p.productName === value);
                        if (selectedProduct) {
                            // Set initial values including units per carton from stock data
                            updatedProduct.units_per_carton = selectedProduct.units_per_carton || 1;
                            updatedProduct.available_cartons = selectedProduct.available_cartons;
                            updatedProduct.available_pieces = selectedProduct.available_pieces;
                            updatedProduct.broken_carton_pieces = selectedProduct.broken_carton_pieces;
                            // Reset quantities when changing product
                            updatedProduct.quantity = '';
                            updatedProduct.carton_quantity = '';
                            updatedProduct.piece_quantity = '';
                            
                            // Fetch the correct units per carton from product mapping
                            fetchProductMapping(value, id);
                        }
                    }
                    
                    // Reset quantities when changing issue type
                    if (field === 'issue_type') {
                        updatedProduct.quantity = '';
                        updatedProduct.carton_quantity = '';
                        updatedProduct.piece_quantity = '';
                    }
                    
                    return updatedProduct;
                }
                return product;
            })
        );
    };

    // Fetch product mapping to get units per carton
    const fetchProductMapping = async (productName, productId) => {
        try {
            const response = await api.get(`/product-mapping/name/${encodeURIComponent(productName)}`);
            if (response.data && response.data.units_per_carton) {
                setSelectedProducts(prev => 
                    prev.map(product => {
                        if (product.id === productId) {
                            return {
                                ...product,
                                units_per_carton: response.data.units_per_carton
                            };
                        }
                        return product;
                    })
                );
            }
        } catch (error) {
            console.error('Error fetching product mapping:', error);
            // Check if it's a 404 error (product mapping not found)
            if (error.response && error.response.status === 404) {
                toast.info(`Product mapping not found for ${productName}. Using units per carton from stock data.`);
            } else {
                toast.warn(`Error fetching product mapping for ${productName}. Using units per carton from stock data.`);
            }
        }
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Clear receiver name if dispatch type is not Sales or Courier
        if (name === 'dispatch_type' && value !== 'Sales' && value !== 'Courier') {
            setFormData(prev => ({
                ...prev,
                receiver_name: ''
            }));
        }
    };
    
    // Validate form
    const validateForm = () => {
        if (!formData.dispatch_type) {
            toast.warn('Please select a dispatch type.');
            return false;
        }
        
        if (selectedProducts.length === 0) {
            toast.warn('Please add at least one product.');
            return false;
        }
        
        for (const product of selectedProducts) {
            if (!product.product_name) {
                toast.warn('Please select a product for all entries.');
                return false;
            }
            
            if (!product.issue_type) {
                toast.warn('Please select an issue type for all products.');
                return false;
            }
            
            if (product.issue_type === 'Carton' || product.issue_type === 'Pieces') {
                if (!product.quantity || product.quantity <= 0) {
                    toast.warn('Please enter a valid quantity for all products.');
                    return false;
                }
            } else if (product.issue_type === 'Both') {
                if ((!product.carton_quantity && product.carton_quantity !== 0) || (!product.piece_quantity && product.piece_quantity !== 0)) {
                    toast.warn('Please enter valid carton and piece quantities for all products.');
                    return false;
                }
                
                if (product.carton_quantity < 0 || product.piece_quantity < 0) {
                    toast.warn('Carton and piece quantities must be non-negative.');
                    return false;
                }
                
                if (product.carton_quantity === 0 && product.piece_quantity === 0) {
                    toast.warn('Either carton quantity or piece quantity must be greater than zero.');
                    return false;
                }
            }
            
            // Validate quantity based on issue type
            const selectedProduct = products.find(p => p.productName === product.product_name);
            if (selectedProduct) {
                if (product.issue_type === 'Carton') {
                    if (product.quantity > selectedProduct.available_cartons) {
                        toast.warn(`Quantity for ${product.product_name} cannot exceed available cartons: ${selectedProduct.available_cartons}`);
                        return false;
                    }
                } else if (product.issue_type === 'Pieces') {
                    // Calculate total available pieces including cartons that can be broken
                    const totalAvailablePieces = selectedProduct.available_pieces + 
                                                selectedProduct.broken_carton_pieces + 
                                                (selectedProduct.available_cartons * product.units_per_carton);
                    if (product.quantity > totalAvailablePieces) {
                        toast.warn(`Quantity for ${product.product_name} cannot exceed available pieces: ${totalAvailablePieces}`);
                        return false;
                    }
                } else if (product.issue_type === 'Both') {
                    // Validate carton quantity
                    if (product.carton_quantity > selectedProduct.available_cartons) {
                        toast.warn(`Carton quantity for ${product.product_name} cannot exceed available cartons: ${selectedProduct.available_cartons}`);
                        return false;
                    }
                    
                    // Validate piece quantity
                    // Calculate total available pieces after carton deduction
                    const remainingCartons = selectedProduct.available_cartons - product.carton_quantity;
                    const totalAvailablePieces = selectedProduct.available_pieces + 
                                                selectedProduct.broken_carton_pieces + 
                                                (remainingCartons * product.units_per_carton);
                    if (product.piece_quantity > totalAvailablePieces) {
                        toast.warn(`Piece quantity for ${product.product_name} cannot exceed available pieces: ${totalAvailablePieces}`);
                        return false;
                    }
                }
            }
        }
        
        if (!formData.receiver_type) {
            toast.warn('Please select a receiver type.');
            return false;
        }
        
        // Receiver name is required for Sales and Courier
        if ((formData.dispatch_type === 'Sales' || formData.dispatch_type === 'Courier') && 
            !formData.receiver_name) {
            toast.warn('Receiver name is required for Sales and Courier dispatch types.');
            return false;
        }
        
        return true;
    };
    
    // Calculate remaining stock after dispatch for a product
    const calculateRemainingStock = (product) => {
        const selectedProduct = products.find(p => p.productName === product.product_name);
        if (!selectedProduct) return null;
        
        if (product.issue_type === 'Carton') {
            const quantity = parseInt(product.quantity) || 0;
            return {
                cartons: selectedProduct.available_cartons - quantity,
                pieces: selectedProduct.available_pieces,
                broken_pieces: selectedProduct.broken_carton_pieces
            };
        } else if (product.issue_type === 'Pieces') {
            const quantity = parseInt(product.quantity) || 0;
            // For pieces, we need to simulate the carton breaking logic
            let remainingCartons = selectedProduct.available_cartons;
            let remainingPieces = selectedProduct.available_pieces;
            let remainingBrokenPieces = selectedProduct.broken_carton_pieces;
            
            let piecesToDeduct = quantity;
            
            // First, try to deduct from broken carton pieces (loose pieces from broken cartons)
            if (remainingBrokenPieces > 0) {
                const brokenPiecesToUse = Math.min(remainingBrokenPieces, piecesToDeduct);
                remainingBrokenPieces -= brokenPiecesToUse;
                piecesToDeduct -= brokenPiecesToUse;
            }
            
            // If we still need more pieces, use available_pieces (loose pieces)
            if (piecesToDeduct > 0 && remainingPieces > 0) {
                const loosePiecesToUse = Math.min(remainingPieces, piecesToDeduct);
                remainingPieces -= loosePiecesToUse;
                piecesToDeduct -= loosePiecesToUse;
            }
            
            // If we still need more pieces, break new cartons
            while (piecesToDeduct > 0 && remainingCartons > 0) {
                // Break a carton
                remainingCartons -= 1;
                remainingBrokenPieces += product.units_per_carton;
                
                // Use pieces from the broken carton
                const brokenPiecesToUse = Math.min(remainingBrokenPieces, piecesToDeduct);
                remainingBrokenPieces -= brokenPiecesToUse;
                piecesToDeduct -= brokenPiecesToUse;
            }
            
            return {
                cartons: remainingCartons,
                pieces: remainingPieces,
                broken_pieces: remainingBrokenPieces
            };
        } else if (product.issue_type === 'Both') {
            const cartonQuantity = parseInt(product.carton_quantity) || 0;
            const pieceQuantity = parseInt(product.piece_quantity) || 0;
            
            // For "Both" type, we need to handle both cartons and pieces
            let remainingCartons = selectedProduct.available_cartons - cartonQuantity;
            let remainingPieces = selectedProduct.available_pieces;
            let remainingBrokenPieces = selectedProduct.broken_carton_pieces;
            
            if (pieceQuantity > 0) {
                let piecesToDeduct = pieceQuantity;
                
                // First, try to deduct from broken carton pieces (loose pieces from broken cartons)
                if (remainingBrokenPieces > 0) {
                    const brokenPiecesToUse = Math.min(remainingBrokenPieces, piecesToDeduct);
                    remainingBrokenPieces -= brokenPiecesToUse;
                    piecesToDeduct -= brokenPiecesToUse;
                }
                
                // If we still need more pieces, use available_pieces (loose pieces)
                if (piecesToDeduct > 0 && remainingPieces > 0) {
                    const loosePiecesToUse = Math.min(remainingPieces, piecesToDeduct);
                    remainingPieces -= loosePiecesToUse;
                    piecesToDeduct -= loosePiecesToUse;
                }
                
                // If we still need more pieces, break new cartons
                while (piecesToDeduct > 0 && remainingCartons > 0) {
                    // Break a carton
                    remainingCartons -= 1;
                    remainingBrokenPieces += product.units_per_carton;
                    
                    // Use pieces from the broken carton
                    const brokenPiecesToUse = Math.min(remainingBrokenPieces, piecesToDeduct);
                    remainingBrokenPieces -= brokenPiecesToUse;
                    piecesToDeduct -= brokenPiecesToUse;
                }
            }
            
            return {
                cartons: remainingCartons,
                pieces: remainingPieces,
                broken_pieces: remainingBrokenPieces
            };
        }
        
        return null;
    };

    // Get stock alert message for a product
    const getStockAlertMessage = (product) => {
        const selectedProduct = products.find(p => p.productName === product.product_name);
        if (!selectedProduct) return '';
        
        if (product.issue_type === 'Carton') {
            const quantity = parseInt(product.quantity) || 0;
            if (quantity > selectedProduct.available_cartons) {
                return `Dispatch quantity cannot exceed available cartons: ${selectedProduct.available_cartons}`;
            }
        } else if (product.issue_type === 'Pieces') {
            const quantity = parseInt(product.quantity) || 0;
            // Calculate total available pieces including cartons that can be broken
            const totalAvailablePieces = selectedProduct.available_pieces + 
                                        selectedProduct.broken_carton_pieces + 
                                        (selectedProduct.available_cartons * product.units_per_carton);
            
            if (quantity > totalAvailablePieces) {
                return `Dispatch quantity cannot exceed available pieces: ${totalAvailablePieces}`;
            }
            
            // Check if carton will be broken
            const availablePieces = selectedProduct.broken_carton_pieces + selectedProduct.available_pieces;
            if (quantity > availablePieces && (selectedProduct.available_cartons > 0 || selectedProduct.broken_carton_pieces > 0)) {
                return `1 carton will be broken to issue pieces. Remaining pieces available after breaking: ${product.units_per_carton + availablePieces - quantity}`;
            }
        } else if (product.issue_type === 'Both') {
            const cartonQuantity = parseInt(product.carton_quantity) || 0;
            const pieceQuantity = parseInt(product.piece_quantity) || 0;
            
            if (cartonQuantity > selectedProduct.available_cartons) {
                return `Carton quantity cannot exceed available cartons: ${selectedProduct.available_cartons}`;
            }
            
            // Calculate total available pieces after carton deduction
            const remainingCartons = selectedProduct.available_cartons - cartonQuantity;
            const totalAvailablePieces = selectedProduct.available_pieces + 
                                        selectedProduct.broken_carton_pieces + 
                                        (remainingCartons * product.units_per_carton);
            
            if (pieceQuantity > totalAvailablePieces) {
                return `Piece quantity cannot exceed available pieces: ${totalAvailablePieces}`;
            }
            
            // Check if carton will be broken
            const availablePieces = selectedProduct.broken_carton_pieces + selectedProduct.available_pieces;
            if (pieceQuantity > availablePieces && (remainingCartons > 0 || selectedProduct.broken_carton_pieces > 0)) {
                return `1 carton will be broken to issue pieces. Remaining pieces available after breaking: ${product.units_per_carton + availablePieces - pieceQuantity}`;
            }
        }
        
        return '';
    };

    // Get equivalent cartons and pieces for display
    const getEquivalentCartonsPieces = (quantity, unitsPerCarton) => {
        const cartons = Math.floor(quantity / unitsPerCarton);
        const pieces = quantity % unitsPerCarton;
        return `${cartons} cartons, ${pieces} pieces`;
    };
    
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) {
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Create delivery challan for each product
            const createdDCs = [];
            for (const product of selectedProducts) {
                const payload = {
                    ...formData,
                    product_name: product.product_name,
                    issue_type: product.issue_type,
                    quantity: product.issue_type === 'Both' ? undefined : parseInt(product.quantity),
                    carton_quantity: product.issue_type === 'Both' ? parseInt(product.carton_quantity) : undefined,
                    piece_quantity: product.issue_type === 'Both' ? parseInt(product.piece_quantity) : undefined,
                    units_per_carton: product.units_per_carton
                };
                
                // Remove undefined fields
                Object.keys(payload).forEach(key => {
                    if (payload[key] === undefined) {
                        delete payload[key];
                    }
                });
                
                const response = await api.post('/fg/delivery-challan', payload);
                
                if (!response.data || !response.data.data || !response.data.data.dc_no) {
                    throw new Error('Invalid response from server');
                }
                
                createdDCs.push(response.data.data);
            }
            
            toast.success('✅ Finished Goods Delivery Challans created successfully.');
            
            // Reset form
            setFormData({
                dispatch_type: '',
                date: new Date().toISOString().split('T')[0],
                receiver_type: '',
                receiver_name: '',
                receiver_details: '',
                remarks: ''
            });
            
            setSelectedProducts([]);
            
            // Note: We don't need to manually refresh products here because
            // the socket.io update will automatically update the products state
            // when the backend emits the stockUpdate event
        } catch (err) {
            console.error('Error creating FG delivery challan:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
                toast.error(err.response.data.message);
            } else {
                setError('Failed to create delivery challan. Please try again.');
                toast.error('Failed to create delivery challan. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                    Create Finished Goods Delivery Challan
                </h1>
                <p className="text-gray-600 text-sm">
                    Create delivery challan for dispatching finished goods for Free Samples, Courier, E-Commerce, or Sales.
                </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Delivery Challan Form */}
                <div className="lg:col-span-2">
                    <Card title="Create Delivery Challan">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Product Selection Section */}
                            <div className="border-t border-gray-200 pt-5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium text-gray-800">Products</h3>
                                    <button
                                        type="button"
                                        onClick={addProduct}
                                        className="flex items-center px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <FaPlus className="mr-1" /> Add Product
                                    </button>
                                </div>
                                
                                {selectedProducts.length === 0 ? (
                                    <div className="text-center py-4 text-gray-500">
                                        <p>No products added yet. Click "Add Product" to start.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {selectedProducts.map((product, index) => (
                                            <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-medium text-gray-700">Product {index + 1}</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeProduct(product.id)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Product Selection */}
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Product Name <span className="text-red-500">*</span>
                                                        </label>
                                                        <select
                                                            value={product.product_name}
                                                            onChange={(e) => updateProduct(product.id, 'product_name', e.target.value)}
                                                            className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            disabled={isSubmitting || isLoading}
                                                        >
                                                            <option value="">Select Product</option>
                                                            {products.map(p => (
                                                                <option key={p.productName} value={p.productName}>
                                                                    {p.productName} - {p.available_cartons} cartons, {p.available_pieces + p.broken_carton_pieces} pieces ({p.broken_carton_pieces} broken)
                                                                </option>
                                                            ))}
                                                        </select>
                                                        
                                                        {isLoading && (
                                                            <div className="mt-2 flex items-center text-sm text-gray-500">
                                                                <FaSpinner className="animate-spin mr-2" />
                                                                Loading products...
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Issue Type */}
                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Issue Type <span className="text-red-500">*</span>
                                                        </label>
                                                        <div className="flex space-x-4">
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`issue_type_${product.id}`}
                                                                    checked={product.issue_type === 'Carton'}
                                                                    onChange={() => updateProduct(product.id, 'issue_type', 'Carton')}
                                                                    disabled={isSubmitting}
                                                                    className="text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <span className="ml-2">Carton</span>
                                                            </label>
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`issue_type_${product.id}`}
                                                                    checked={product.issue_type === 'Pieces'}
                                                                    onChange={() => updateProduct(product.id, 'issue_type', 'Pieces')}
                                                                    disabled={isSubmitting}
                                                                    className="text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <span className="ml-2">Pieces</span>
                                                            </label>
                                                            <label className="inline-flex items-center">
                                                                <input
                                                                    type="radio"
                                                                    name={`issue_type_${product.id}`}
                                                                    checked={product.issue_type === 'Both'}
                                                                    onChange={() => updateProduct(product.id, 'issue_type', 'Both')}
                                                                    disabled={isSubmitting}
                                                                    className="text-primary-600 focus:ring-primary-500"
                                                                />
                                                                <span className="ml-2">Both</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Quantity Inputs based on Issue Type */}
                                                    {product.issue_type === 'Carton' || product.issue_type === 'Pieces' ? (
                                                        <>
                                                            {/* Units per Carton (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Units per Carton (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={product.units_per_carton || ''}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Available Cartons (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Available Cartons (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={product.available_cartons || ''}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Available Pieces (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Available Pieces (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(product.available_pieces || 0) + (product.broken_carton_pieces || 0)}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Dispatch Quantity */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Dispatch Quantity <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={product.quantity}
                                                                    onChange={(e) => updateProduct(product.id, 'quantity', e.target.value)}
                                                                    min="1"
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    disabled={isSubmitting}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : product.issue_type === 'Both' ? (
                                                        <>
                                                            {/* Units per Carton (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Units per Carton (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={product.units_per_carton || ''}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Available Cartons (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Available Cartons (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={product.available_cartons || ''}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Available Pieces (Auto) */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Available Pieces (Auto)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={(product.available_pieces || 0) + (product.broken_carton_pieces || 0)}
                                                                    readOnly
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                />
                                                            </div>
                                                            
                                                            {/* Carton Quantity */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Carton Quantity <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={product.carton_quantity}
                                                                    onChange={(e) => updateProduct(product.id, 'carton_quantity', e.target.value)}
                                                                    min="0"
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    disabled={isSubmitting}
                                                                />
                                                            </div>
                                                            
                                                            {/* Piece Quantity */}
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Piece Quantity <span className="text-red-500">*</span>
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    value={product.piece_quantity}
                                                                    onChange={(e) => updateProduct(product.id, 'piece_quantity', e.target.value)}
                                                                    min="0"
                                                                    className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                                    disabled={isSubmitting}
                                                                />
                                                            </div>
                                                        </>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Dispatch Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dispatch Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="dispatch_type"
                                        value={formData.dispatch_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Dispatch Type</option>
                                        <option value="Free Sample">Free Sample</option>
                                        <option value="Courier">Courier</option>
                                        <option value="E-Commerce">E-Commerce</option>
                                        <option value="Sales">Sales</option>
                                    </select>
                                </div>
                                
                                {/* Date */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                {/* Receiver Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Receiver Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="receiver_type"
                                        value={formData.receiver_type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Receiver Type</option>
                                        <option value="Customer">Customer</option>
                                        <option value="Dealer">Dealer</option>
                                        <option value="E-Commerce Platform">E-Commerce Platform</option>
                                        <option value="Internal Transfer">Internal Transfer</option>
                                    </select>
                                </div>
                                
                                {/* Receiver Name */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Receiver / Consignee Name {((formData.dispatch_type === 'Sales' || formData.dispatch_type === 'Courier') && <span className="text-red-500">*</span>) || '(Optional)'}
                                    </label>
                                    <input
                                        type="text"
                                        name="receiver_name"
                                        value={formData.receiver_name}
                                        onChange={handleInputChange}
                                        placeholder="Enter receiver/consignee name"
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                {/* Receiver Details */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Receiver Details (Optional)
                                    </label>
                                    <textarea
                                        name="receiver_details"
                                        value={formData.receiver_details}
                                        onChange={handleInputChange}
                                        placeholder="Enter receiver address or contact information"
                                        rows="3"
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                {/* Remarks */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Remarks (Optional)
                                    </label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        placeholder="Enter any additional remarks"
                                        rows="2"
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        disabled={isSubmitting}
                                    />
                                </div>
                                
                                {/* Created By (Auto) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Created By (Auto)
                                    </label>
                                    <input
                                        type="text"
                                        value={user ? user.name : 'System'}
                                        readOnly
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                
                                {/* Status (Auto) */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Status (Auto)
                                    </label>
                                    <input
                                        type="text"
                                        value="Completed"
                                        readOnly
                                        className="w-full px-4 py-2 text-dark-700 bg-light-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            
                            
                            {/* Error message */}
                            {error && (
                                <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-lg">
                                    <FaExclamationTriangle className="mr-2" />
                                    {error}
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allow flex items-center"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FaSpinner className="animate-spin mr-2" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Delivery Challan'
                                    )}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => navigate('/fg/delivery-challan/view')}
                                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                >
                                    View All DCs
                                </button>
                            </div>
                        </form>
                    </Card>
                </div>
                
                {/* Stock Info Panel (Right Side) */}
                <div>
                    <Card title="Stock Information">
                        {selectedProducts.length > 0 ? (
                            <div className="space-y-4">
                                {selectedProducts.map((product, index) => {
                                    const selectedProduct = products.find(p => p.productName === product.product_name);
                                    const remainingStock = selectedProduct ? calculateRemainingStock(product) : null;
                                    const stockAlertMessage = getStockAlertMessage(product);
                                    
                                    return (
                                        <div key={product.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                                            <h3 className="font-semibold text-gray-800 mb-2">Product {index + 1}: {product.product_name || 'Not selected'}</h3>
                                            
                                            {selectedProduct && (
                                                <>
                                                    <div className="space-y-3">
                                                        {/* Current Stock Section */}
                                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                                            <h4 className="font-medium text-blue-800 mb-2">Current Stock</h4>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Available Cartons:</span>
                                                                    <span className="font-medium">{selectedProduct.available_cartons}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Available Pieces:</span>
                                                                    <span className="font-medium">{selectedProduct.available_pieces}</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Broken Carton Pieces:</span>
                                                                    <span className="font-medium">{selectedProduct.broken_carton_pieces}</span>
                                                                </div>
                                                                <div className="flex justify-between pt-1 border-t border-blue-200">
                                                                    <span className="text-gray-600 font-medium">Total Available Pieces:</span>
                                                                    <span className="font-bold">
                                                                        {selectedProduct.available_pieces + selectedProduct.broken_carton_pieces + (selectedProduct.available_cartons * product.units_per_carton)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Stock After Dispatch Section */}
                                                        {(product.quantity || product.carton_quantity || product.piece_quantity) ? (
                                                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                                                <h4 className="font-medium text-green-800 mb-2">Stock After Dispatch</h4>
                                                                <div className="space-y-1 text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Remaining Cartons:</span>
                                                                        <span className={`font-medium ${remainingStock?.cartons < 0 ? 'text-red-600' : ''}`}>
                                                                            {remainingStock?.cartons ?? 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Remaining Pieces:</span>
                                                                        <span className={`font-medium ${remainingStock?.pieces < 0 ? 'text-red-600' : ''}`}>
                                                                            {remainingStock?.pieces ?? 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Broken Carton Pieces:</span>
                                                                        <span className="font-medium">
                                                                            {remainingStock?.broken_pieces ?? 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        
                                                        {/* Dispatch Details Section */}
                                                        {(product.quantity || product.carton_quantity || product.piece_quantity) ? (
                                                            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                                                <h4 className="font-medium text-purple-800 mb-2">Dispatch Details</h4>
                                                                <div className="space-y-1 text-sm">
                                                                    <div className="flex justify-between">
                                                                        <span className="text-gray-600">Issue Type:</span>
                                                                        <span className="font-medium">{product.issue_type}</span>
                                                                    </div>
                                                                    {product.issue_type === 'Carton' && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Quantity:</span>
                                                                            <span className="font-medium">
                                                                                {product.quantity} cartons
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {product.issue_type === 'Pieces' && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Quantity:</span>
                                                                            <span className="font-medium">
                                                                                {product.quantity} pieces
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {product.issue_type === 'Both' && (
                                                                        <>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Carton Quantity:</span>
                                                                                <span className="font-medium">
                                                                                    {product.carton_quantity} cartons
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span className="text-gray-600">Piece Quantity:</span>
                                                                                <span className="font-medium">
                                                                                    {product.piece_quantity} pieces
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                    {(product.issue_type === 'Pieces' || product.issue_type === 'Both') && (
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-600">Equivalent:</span>
                                                                            <span className="font-medium">
                                                                                {product.issue_type === 'Pieces' 
                                                                                    ? getEquivalentCartonsPieces(product.quantity, product.units_per_carton)
                                                                                    : getEquivalentCartonsPieces(product.piece_quantity, product.units_per_carton)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        
                                                        {/* Stock Alert Section */}
                                                        {stockAlertMessage && (
                                                            <div className={`p-3 rounded-lg border ${
                                                                stockAlertMessage.includes('cannot exceed') 
                                                                    ? 'bg-red-50 border-red-200' 
                                                                    : 'bg-yellow-50 border-yellow-200'
                                                            }`}>
                                                                <div className="flex items-start">
                                                                    <FaExclamationTriangle className={`mt-0.5 mr-2 flex-shrink-0 ${
                                                                        stockAlertMessage.includes('cannot exceed') 
                                                                            ? 'text-red-500' 
                                                                            : 'text-yellow-500'
                                                                    }`} />
                                                                    <div>
                                                                        <h4 className={`font-medium ${
                                                                            stockAlertMessage.includes('cannot exceed') 
                                                                                ? 'text-red-800' 
                                                                                : 'text-yellow-800'
                                                                        }`}>
                                                                            {stockAlertMessage.includes('cannot exceed') 
                                                                                ? 'Stock Alert' 
                                                                                : 'Information'}
                                                                        </h4>
                                                                        <p className={`text-sm mt-1 ${
                                                                            stockAlertMessage.includes('cannot exceed') 
                                                                                ? 'text-red-700' 
                                                                                : 'text-yellow-700'
                                                                        }`}>
                                                                            {stockAlertMessage}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                            
                                            {!selectedProduct && product.product_name && (
                                                <div className="text-center py-4 text-gray-500">
                                                    <p>Product not found in stock</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Add products to view stock information</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CreateFGDC;