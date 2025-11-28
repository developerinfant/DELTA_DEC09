import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import api from '../../api';
import Card from '../../components/common/Card';
import { FaSpinner, FaInfoCircle, FaExclamationTriangle, FaRedo, FaBan, FaTrash, FaCheck, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Select from 'react-select';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CreateFGGRN = () => {
    const { user } = useAuth(); // Get user from AuthContext
    const location = useLocation();
    const [deliveryChallans, setDeliveryChallans] = useState([]);
    const [dcOptions, setDcOptions] = useState([]);
    const [selectedDCOption, setSelectedDCOption] = useState(null);
    const [dcDetails, setDcDetails] = useState(null);
    const [items, setItems] = useState([]);
    const [damagedStock, setDamagedStock] = useState([]);
    const [savedDamagedStock, setSavedDamagedStock] = useState([]); // New state for saved damaged stock entries
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [hasExistingGRN, setHasExistingGRN] = useState(false);
    const [existingGRNStatus, setExistingGRNStatus] = useState(null);
    const [isGRNLocked, setIsGRNLocked] = useState(false);
    const [completedGRN, setCompletedGRN] = useState(null);
    const [partialGRN, setPartialGRN] = useState(null);
    const [isEditingPartialGRN, setIsEditingPartialGRN] = useState(false);
    const [existingGRNId, setExistingGRNId] = useState(null);
    const [status, setStatus] = useState('');
    const [materialUsage, setMaterialUsage] = useState([]);
    const [isDamagedStockSaved, setIsDamagedStockSaved] = useState(false); // New state to track if damaged stock has been saved
    const [showDamagedStockSection, setShowDamagedStockSection] = useState(false); // New state to control visibility of damaged stock section
    // Add state for product-wise carton quantities
    const [productCartonsReceived, setProductCartonsReceived] = useState([]);
    const [productPendingQuantities, setProductPendingQuantities] = useState([]); // New state for product pending quantities
    const navigate = useNavigate();

    const selectedDC = deliveryChallans.find(dc => dc._id === selectedDCOption?.value);
    
    // Create options for react-select dropdown
    useEffect(() => {
        const options = deliveryChallans.map(dc => ({
            value: dc._id,
            label: `${dc.dc_no} - ${dc.unit_type === 'Own Unit' ? (dc.person_name || 'N/A') : (dc.supplier_id?.name || 'N/A')} / ${dc.unit_type}`
        }));
        setDcOptions(options);
    }, [deliveryChallans]);
    
    // Function to calculate material usage based on cartons returned
    const calculateMaterialUsage = useCallback((dc, cartonsReturnedValue) => {
        if (!dc) return [];
        
        // Handle both single product (backward compatibility) and multiple products
        let materialsToProcess = [];
        let cartonsSent = 0;
        
        if (dc.products && dc.products.length > 0) {
            // For multiple products, collect all materials from all products
            dc.products.forEach(product => {
                if (product.materials && Array.isArray(product.materials)) {
                    materialsToProcess = materialsToProcess.concat(product.materials);
                }
            });
            // For multiple products, we need to calculate total cartons sent
            cartonsSent = dc.products.reduce((total, product) => total + (product.carton_qty || 0), 0);
        } else if (dc.materials && Array.isArray(dc.materials)) {
            // For single product (backward compatibility)
            materialsToProcess = dc.materials;
            cartonsSent = dc.carton_qty || 0;
        }
        
        // If no materials to process, return empty array
        if (materialsToProcess.length === 0) return [];
        
        const cartonsReturnedNum = parseInt(cartonsReturnedValue) || 0;
        
        return materialsToProcess.map(material => {
            const sentQty = material.total_qty || 0;
            // UsedQty = (CartonsReturned / CartonsSent) * SentQty
            const usedQty = cartonsSent > 0 ? (cartonsReturnedNum / cartonsSent) * sentQty : 0;
            // RemainingQty = SentQty - UsedQty
            const remainingQty = sentQty - usedQty;
            
            return {
                materialName: material.material_name,
                sentQty,
                usedQty: usedQty.toFixed(2),
                remainingQty: remainingQty.toFixed(2)
            };
        });
    }, []);
    
    // Initialize damaged stock when dcDetails changes
    useEffect(() => {
        if (dcDetails) {
            // Initialize damaged stock with materials from DC and their sent quantities
            // Handle both single product (backward compatibility) and multiple products
            let materialsToProcess = [];
            
            if (dcDetails.products && dcDetails.products.length > 0) {
                // For multiple products, collect all materials from all products
                dcDetails.products.forEach(product => {
                    if (product.materials && Array.isArray(product.materials)) {
                        materialsToProcess = materialsToProcess.concat(product.materials);
                    }
                });
            } else if (dcDetails.materials && Array.isArray(dcDetails.materials)) {
                // For single product (backward compatibility)
                materialsToProcess = dcDetails.materials;
            }
            
            const initialDamagedStock = materialsToProcess.map(material => ({
                material_name: material.material_name,
                received_qty: material.total_qty || 0, // Use sent quantity as received quantity
                damaged_qty: 0
            }));
            setDamagedStock(initialDamagedStock);
        } else {
            setDamagedStock([]);
        }
    }, [dcDetails]);

    // Fetch all jobber delivery challans on component mount
    useEffect(() => {
        const fetchDeliveryChallans = async () => {
            try {
                setIsLoading(true);
                // Fetch all delivery challans for FG module (both Jobber and Own Unit)
                const response = await api.get('/delivery-challan');
                setDeliveryChallans(response.data);
            } catch (err) {
                setError('Failed to fetch Delivery Challans.');
                console.error('Error fetching Delivery Challans:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDeliveryChallans();
    }, []);

    // Fetch DC details when one is selected
    useEffect(() => {
        if (selectedDCOption?.value) {
            const fetchDCDetails = async () => {
                try {
                    setIsLoading(true);
                    
                    // Fetch DC details
                    const dcResponse = await api.get(`/delivery-challan/${selectedDCOption.value}`);
                    const dcData = dcResponse.data;
                    setDcDetails(dcData);
                    
                    // Initialize product-wise carton quantities for multiple products
                    if (dcData.products && dcData.products.length > 0) {
                        // Initialize with empty values for each product
                        const initialProductCartons = dcData.products.map(() => '');
                        setProductCartonsReceived(initialProductCartons);
                        
                        // Fetch pending quantities per product
                        try {
                            const pendingResponse = await api.get(`/grn/pending-quantities/${selectedDCOption.value}`);
                            setProductPendingQuantities(pendingResponse.data);
                        } catch (pendingError) {
                            console.error('Error fetching product pending quantities:', pendingError);
                            setProductPendingQuantities([]);
                        }
                    } else {
                        // Reset for single product
                        setProductCartonsReceived([]);
                        setProductPendingQuantities([]);
                    }
                    
                    // Fetch existing GRNs for this DC to check for partial receipts
                    const grnResponse = await api.get(`/grn?deliveryChallan=${selectedDCOption.value}`);
                    const existingGRNs = grnResponse.data;
                    
                    // Filter to only jobber GRNs
                    const jobberGRNs = existingGRNs.filter(grn => grn.sourceType === 'jobber');
                    
                    // Calculate total sent quantity from DC
                    const totalSentQty = dcData.carton_qty || 0;
                    
                    // Calculate total received quantity from all existing GRNs for this DC
                    const totalReceivedQty = jobberGRNs.reduce((sum, grn) => sum + (grn.cartonsReturned || 0), 0);
                    
                    // Calculate pending quantity
                    const pendingQty = totalSentQty - totalReceivedQty;
                    
                    // Set initial values based on existing GRNs
                    if (jobberGRNs.length > 0) {
                        // Get the latest GRN
                        const latestGRN = jobberGRNs.reduce((latest, current) => 
                            new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                        );
                        
                        // Show previous data section
                        setHasExistingGRN(true);
                        setExistingGRNStatus(latestGRN.status);
                        
                        // If the latest GRN is partial, we're editing it
                        setExistingGRNId(null);
                        setIsEditingPartialGRN(false);

                        // This logic correctly calculates and displays the pending quantity.
                        setPartialGRN({
                            totalSent: totalSentQty,
                            totalReceived: totalReceivedQty,
                            pending: pendingQty,
                            currentGRNReceived: 0
                        });
                    } else {
                        // No existing GRNs
                        setHasExistingGRN(false);
                        setExistingGRNStatus(null);
                        setExistingGRNId(null);
                        setIsEditingPartialGRN(false);
                        setPartialGRN({
                            totalSent: totalSentQty,
                            totalReceived: 0,
                            pending: totalSentQty,
                            currentGRNReceived: 0
                        });
                    }
                    
                    setStatus('');
                    setMaterialUsage([]);
                    
                    // Initialize items with received quantities from existing partial GRN if available
                    // For jobber delivery challans, we need to look up the material IDs
                    const initializedItems = [];
                    
                    // Handle both single product (backward compatibility) and multiple products
                    let materialsToProcess = [];
                    
                    if (dcData.products && dcData.products.length > 0) {
                        // For multiple products, collect all materials from all products
                        dcData.products.forEach(product => {
                            if (product.materials && Array.isArray(product.materials)) {
                                materialsToProcess = materialsToProcess.concat(product.materials);
                            }
                        });
                    } else if (dcData.materials && Array.isArray(dcData.materials)) {
                        // For single product (backward compatibility)
                        materialsToProcess = dcData.materials;
                    }
                    
                    for (const material of materialsToProcess) {
                        // Look up the material by name to get its ID
                        try {
                            // Use the updated API endpoint that supports name search
                            const materialResponse = await api.get(`/materials?name=${encodeURIComponent(material.material_name)}`);
                            const materialData = materialResponse.data.find(m => m.name === material.material_name);
                            
                            // If we're editing a partial GRN, use the received quantity from the latest GRN
                            let receivedQuantity = '';
                            if (jobberGRNs.length > 0) {
                                // Get the latest GRN
                                const latestGRN = jobberGRNs.reduce((latest, current) => 
                                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                                );
                                
                                if (latestGRN && latestGRN.items) {
                                    const grnItem = latestGRN.items.find(item => 
                                        typeof item.material === 'string' ? item.material === material.material_name : item.material.name === material.material_name
                                    );
                                    if (grnItem) {
                                        receivedQuantity = grnItem.receivedQuantity;
                                    }
                                }
                            }
                            
                            initializedItems.push({
                                material: materialData ? materialData._id : material.material_name, // Use ID if found, otherwise name
                                materialModel: 'PackingMaterial', // Jobber is always packing materials
                                orderedQuantity: material.total_qty,
                                receivedQuantity: receivedQuantity, // Use existing quantity if editing partial GRN
                                damagedQuantity: '', // Keep as empty string for controlled input
                                unitPrice: 0, // No price info for delivery challans
                                remarks: '',
                            });
                        } catch (materialError) {
                            // If we can't find the material, just use the name
                            console.error('Error looking up material:', materialError);
                            
                            // If we're editing a partial GRN, use the received quantity from the latest GRN
                            let receivedQuantity = '';
                            if (jobberGRNs.length > 0) {
                                // Get the latest GRN
                                const latestGRN = jobberGRNs.reduce((latest, current) => 
                                    new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
                                );
                                
                                if (latestGRN && latestGRN.items) {
                                    const grnItem = latestGRN.items.find(item => 
                                        typeof item.material === 'string' ? item.material === material.material_name : item.material.name === material.material_name
                                    );
                                    if (grnItem) {
                                        receivedQuantity = grnItem.receivedQuantity;
                                    }
                                }
                            }
                            
                            initializedItems.push({
                                material: material.material_name,
                                materialModel: 'PackingMaterial', // Jobber is always packing materials
                                orderedQuantity: material.total_qty,
                                receivedQuantity: receivedQuantity, // Use existing quantity if editing partial GRN
                                damagedQuantity: '', // Keep as empty string for controlled input
                                unitPrice: 0, // No price info for delivery challans
                                remarks: '',
                            });
                        }
                    }
                    
                    setItems(initializedItems);
                    
                    // Initialize damaged stock with materials from DC and their sent quantities
                    // Handle both single product (backward compatibility) and multiple products
                    let materialsToProcessForDamaged = [];
                    
                    if (dcData.products && dcData.products.length > 0) {
                        // For multiple products, collect all materials from all products
                        dcData.products.forEach(product => {
                            if (product.materials && Array.isArray(product.materials)) {
                                materialsToProcessForDamaged = materialsToProcessForDamaged.concat(product.materials);
                            }
                        });
                    } else if (dcData.materials && Array.isArray(dcData.materials)) {
                        // For single product (backward compatibility)
                        materialsToProcessForDamaged = dcData.materials;
                    }
                    
                    const initialDamagedStock = materialsToProcessForDamaged.map(material => ({
                        material_name: material.material_name,
                        received_qty: material.total_qty || 0, // Use sent quantity as received quantity
                        damaged_qty: 0
                    }));
                    setDamagedStock(initialDamagedStock);
                    
                    // Fetch saved damaged stock entries for this DC
                    try {
                        const damagedStockResponse = await api.get(`/damaged-stock?dc_no=${dcData.dc_no}`);
                        setSavedDamagedStock(damagedStockResponse.data.data || []);
                    } catch (err) {
                        console.error('Error fetching saved damaged stock:', err);
                        setSavedDamagedStock([]);
                    }
                } catch (err) {
                    setError('Failed to fetch Delivery Challan details.');
                    console.error('Error fetching DC details:', err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDCDetails();
        } else {
            setDcDetails(null);
            setItems([]);
            setHasExistingGRN(false);
            setExistingGRNStatus(null);
            setIsGRNLocked(false);
            setCompletedGRN(null);
            setPartialGRN(null);
            setExistingGRNId(null);
            setIsEditingPartialGRN(false);
            setMaterialUsage([]);
            setDamagedStock([]);
            setSavedDamagedStock([]);
        }
    }, [selectedDCOption]);

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        // Keep values as strings for controlled inputs, convert to numbers only when submitting
        newItems[index][field] = value;
        setItems(newItems);
    };
    
    // Handler for product-wise carton quantities
    const handleProductCartonsReceivedChange = (index, value) => {
        // Get the product and its pending quantity
        if (dcDetails && dcDetails.products && dcDetails.products[index]) {
            const product = dcDetails.products[index];
            const productPending = productPendingQuantities.find(p => p.productName === product.product_name);
            const pendingQty = productPending ? productPending.pendingQty : (product.carton_qty || 0);
            
            // Parse the input value
            const inputValue = parseFloat(value) || 0;
            
            // Validate that the input doesn't exceed pending quantity
            if (inputValue > pendingQty) {
                toast.error(`You can only receive up to ${pendingQty} cartons for this product.`);
                return;
            }
            
            // Validate that the input is not negative
            if (inputValue < 0) {
                toast.error('Received quantity must be greater than or equal to 0.');
                return;
            }
        }
        
        const newProductCartonsReceived = [...productCartonsReceived];
        newProductCartonsReceived[index] = value;
        setProductCartonsReceived(newProductCartonsReceived);
    };

    // Calculate remaining quantity for each material based on saved damaged stock entries
    const calculateRemainingQty = (materialName, sentQty) => {
        const savedEntries = savedDamagedStock.filter(entry => entry.material_name === materialName);
        const totalDamaged = savedEntries.reduce((sum, entry) => sum + (entry.damaged_qty || 0), 0);
        return sentQty - totalDamaged;
    };
    
    // Handle damaged quantity change with validation
    const handleDamagedQtyChange = (index, value) => {
        const newDamagedStock = [...damagedStock];
        const materialName = newDamagedStock[index].material_name;
        const sentQty = newDamagedStock[index].received_qty;
        
        // Calculate remaining quantity for this material
        const remainingQty = calculateRemainingQty(materialName, sentQty);
        
        // Parse the input value
        const inputValue = parseInt(value) || 0;
        
        // Validate that the input doesn't exceed remaining quantity
        if (inputValue > remainingQty) {
            toast.error(`Damaged quantity cannot exceed remaining quantity (${remainingQty}) for ${materialName}.`);
            return;
        }
        
        // Update the damaged quantity
        newDamagedStock[index].damaged_qty = inputValue;
        setDamagedStock(newDamagedStock);
        setIsDamagedStockSaved(false); // Reset saved state when user makes changes
    };

    // New function to handle saving damaged stock
    const handleSaveDamagedStock = async () => {
        if (!dcDetails) {
            toast.error('Please select a Delivery Challan first');
            return;
        }
        
        setIsLoading(true);
        setError('');
        
        try {
            // Filter items with damaged quantity > 0
            const itemsWithDamage = damagedStock.filter(item => item.damaged_qty > 0);
            
            if (itemsWithDamage.length === 0) {
                toast.warn('No damaged items to record');
                return;
            }
            
            // Validate each item against remaining quantities
            for (const item of itemsWithDamage) {
                const remainingQty = calculateRemainingQty(item.material_name, item.received_qty);
                if (item.damaged_qty > remainingQty) {
                    toast.error(`Damaged quantity for ${item.material_name} cannot exceed remaining quantity (${remainingQty}).`);
                    return;
                }
            }
            
            // Create damaged stock entries for each item
            const promises = itemsWithDamage.map(item => {
                // For multiple products, we need to determine the correct product name
                let productName = dcDetails.product_name;
                if (dcDetails.products && dcDetails.products.length > 0) {
                    // For multiple products, find the product that contains this material
                    const product = dcDetails.products.find(p => 
                        p.materials && p.materials.some(m => m.material_name === item.material_name)
                    );
                    if (product) {
                        productName = product.product_name;
                    }
                }
                
                return api.post('/damaged-stock', {
                    grn_id: null, // Will be updated when GRN is created
                    dc_no: dcDetails.dc_no,
                    product_name: productName,
                    material_name: item.material_name,
                    received_qty: item.received_qty,
                    damaged_qty: item.damaged_qty,
                    remarks: 'Recorded during GRN creation'
                });
            });
            
            const results = await Promise.all(promises);
            
            toast.success('Damaged stock entries saved successfully');
            setIsDamagedStockSaved(true);
            
            // Refresh saved damaged stock entries
            try {
                const damagedStockResponse = await api.get(`/damaged-stock?dc_no=${dcDetails.dc_no}`);
                setSavedDamagedStock(damagedStockResponse.data.data || []);
            } catch (err) {
                console.error('Error fetching saved damaged stock:', err);
                setSavedDamagedStock([]);
            }
            
            // Reset damaged stock form
            // Handle both single product (backward compatibility) and multiple products
            let materialsToProcess = [];
            
            if (dcDetails.products && dcDetails.products.length > 0) {
                // For multiple products, collect all materials from all products
                dcDetails.products.forEach(product => {
                    if (product.materials && Array.isArray(product.materials)) {
                        materialsToProcess = materialsToProcess.concat(product.materials);
                    }
                });
            } else if (dcDetails.materials && Array.isArray(dcDetails.materials)) {
                // For single product (backward compatibility)
                materialsToProcess = dcDetails.materials;
            }
            
            const resetDamagedStock = materialsToProcess.map(material => ({
                material_name: material.material_name,
                received_qty: material.total_qty || 0,
                damaged_qty: 0
            }));
            setDamagedStock(resetDamagedStock);
            
            // Hide the damaged stock section after saving
            setShowDamagedStockSection(false);
        } catch (err) {
            console.error('Failed to save damaged stock entries:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to save damaged stock entries. Please try again.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // New function to reset damaged stock
    const handleResetDamagedStock = () => {
        if (dcDetails) {
            // Handle both single product (backward compatibility) and multiple products
            let materialsToProcess = [];
            
            if (dcDetails.products && dcDetails.products.length > 0) {
                // For multiple products, collect all materials from all products
                dcDetails.products.forEach(product => {
                    if (product.materials && Array.isArray(product.materials)) {
                        materialsToProcess = materialsToProcess.concat(product.materials);
                    }
                });
            } else if (dcDetails.materials && Array.isArray(dcDetails.materials)) {
                // For single product (backward compatibility)
                materialsToProcess = dcDetails.materials;
            }
            
            const resetDamagedStock = materialsToProcess.map(material => ({
                material_name: material.material_name,
                received_qty: material.total_qty || 0,
                damaged_qty: 0
            }));
            setDamagedStock(resetDamagedStock);
            setIsDamagedStockSaved(false);
        }
    };
    
    // New function to delete a saved damaged stock entry
    const handleDeleteSavedDamagedStock = async (id) => {
        try {
            await api.delete(`/damaged-stock/${id}`);
            toast.success('Damaged stock entry deleted successfully');
            
            // Refresh saved damaged stock entries
            if (dcDetails) {
                const damagedStockResponse = await api.get(`/damaged-stock?dc_no=${dcDetails.dc_no}`);
                setSavedDamagedStock(damagedStockResponse.data.data || []);
            }
        } catch (err) {
            console.error('Failed to delete damaged stock entry:', err);
            const errorMessage = err.response?.data?.message || 
                                err.message || 
                                'Failed to delete damaged stock entry. Please try again.';
            toast.error(errorMessage);
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        // Clear previous messages
        setError('');
        setSuccess('');
        
        // Validate form
        if (!selectedDCOption) {
            const errorMessage = 'Please select a delivery challan.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        if (!receivedBy.trim()) {
            const errorMessage = 'Please enter who received the materials.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        // Handle multiple products vs single product
        let cartonsReturnedNum = 0;
        let pendingCartons = 0;
        
        if (dcDetails.products && dcDetails.products.length > 0) {
            // Handle multiple products
            // Calculate total cartons sent
            const totalCartonsSent = dcDetails.products.reduce((total, product) => total + (product.carton_qty || 0), 0);
            
            // Check if all products are fully received
            const allProductsFullyReceived = productPendingQuantities.every(productPending => productPending.pendingQty <= 0);
            
            if (allProductsFullyReceived) {
                const errorMessage = 'All quantities for this DC have been received.';
                setError(errorMessage);
                toast.error(errorMessage);
                return;
            }
            
            // Calculate total cartons received from product inputs
            cartonsReturnedNum = productCartonsReceived.reduce((total, cartons, index) => {
                const product = dcDetails.products[index];
                const cartonsSent = product ? product.carton_qty || 0 : 0;
                const cartonsReceived = parseInt(cartons) || 0;
                
                // Validate that received doesn't exceed sent
                if (cartonsReceived > cartonsSent) {
                    toast.error(`Cartons received for ${product.product_name} cannot exceed cartons sent (${cartonsSent})`);
                    throw new Error('Invalid carton quantity');
                }
                
                return total + cartonsReceived;
            }, 0);
            
            // Calculate pending cartons from existing GRNs
            const grnResponse = await api.get(`/grn?deliveryChallan=${selectedDCOption.value}`);
            const existingGRNs = grnResponse.data;
            const jobberGRNs = existingGRNs.filter(grn => grn.sourceType === 'jobber');
            const totalReceivedQty = jobberGRNs.reduce((sum, grn) => sum + (grn.cartonsReturned || 0), 0);
            pendingCartons = totalCartonsSent - totalReceivedQty;
            
            // Set the main cartonsReturned field for the API call
        }
        
        // Validate carton quantities
        if (cartonsReturnedNum > pendingCartons) {
            const errorMessage = `Returned cartons cannot exceed pending cartons. Pending: ${pendingCartons}`;
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        if (cartonsReturnedNum <= 0) {
            const errorMessage = 'Returned cartons must be greater than zero.';
            setError(errorMessage);
            toast.error(errorMessage);
            return;
        }
        
        // Validate receiver name
        if (!receivedBy || receivedBy.trim() === '') {
            setError('Receiver name is required.');
            return;
        }
        
        // Validate damaged stock quantities
        if (damagedStock && Array.isArray(damagedStock)) {
            for (const item of damagedStock) {
                const receivedQty = item.received_qty || 0;
                const damagedQty = item.damaged_qty || 0;
                
                if (damagedQty > receivedQty) {
                    setError(`Damaged quantity for ${item.material_name} cannot exceed received quantity.`);
                    return;
                }
            }
        }
        
        // Set status based on carton quantities
        let grnStatus = 'Partial';
        if (cartonsReturnedNum === pendingCartons) {
            grnStatus = 'Completed';
            toast.success("GRN and Delivery Challan marked as Completed.");
        } else {
            toast.warn("GRN saved as Partial.");
        }
        
        setStatus(grnStatus);
        
        // Prepare GRN data - only for jobber DCs
        const grnData = {
            deliveryChallanId: selectedDCOption?.value,
            cartonsReturned: cartonsReturnedNum.toString(), // Send as string to match server expectations
            receivedBy: receivedBy.trim(), // Ensure no leading/trailing whitespace
            dateReceived: new Date(dateReceived).toISOString(), // Ensure proper date format
            damagedStock: damagedStock && Array.isArray(damagedStock) ? damagedStock : [], // Ensure it's always an array
            // Add individual product carton quantities for multiple products
            productCartonsReceived: dcDetails.products && dcDetails.products.length > 0 ? productCartonsReceived : undefined
        };

        
        try {
            setIsLoading(true);
            // We are now ALWAYS creating a new GRN, so we only need the api.post call.
            const response = await api.post('/grn', grnData);
            toast.success('GRN created successfully!');
            
            setSuccess('GRN created successfully!');
            // Redirect to FG GRN view page
            setTimeout(() => {
                navigate('/fg/grn/view');
            }, 2000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to create/update GRN.';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('Error creating/updating GRN:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setSelectedDCOption(null);
        setDcDetails(null);
        setItems([]);
        setReceivedBy('');
        setDateReceived(new Date().toISOString().split('T')[0]);
        setStatus('');
        setMaterialUsage([]);
        setError('');
        setSuccess('');
        setHasExistingGRN(false);
        setExistingGRNStatus(null);
        setIsGRNLocked(false);
        setCompletedGRN(null);
        setPartialGRN(null);
        setExistingGRNId(null);
        setIsEditingPartialGRN(false);
        setIsDamagedStockSaved(false); // Reset damaged stock saved state
        setDamagedStock([]);
        setSavedDamagedStock([]);
        setShowDamagedStockSection(false); // Hide damaged stock section on reset
        // Reset product-wise carton quantities
        setProductCartonsReceived([]);
    };

    // Initialize receivedBy with user's name when component mounts
    useEffect(() => {
        if (user) {
            if (user.role === 'Admin') {
                setReceivedBy('Admin');
            } else {
                setReceivedBy(user.name || '');
            }
        }
    }, [user]);

    if (isLoading && !dcDetails) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-3xl text-primary-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                    <Link 
                        to="/fg/grn/view"
                        className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
                    >
                        <ArrowLeft size={18} /> Back to GRN List
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Create Finished Goods GRN (DC-based)</h1>
                        <p className="text-gray-600 text-sm mt-1">Create a new GRN entry based on a Delivery Challan</p>
                    </div>
                </div>
            </div>

            <Card>
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center">
                        <FaExclamationTriangle className="mr-2" />
                        {error}
                    </div>
                )}
                
                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* DC Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Delivery Challan *
                            </label>
                            <Select
                                options={dcOptions}
                                placeholder="Search or Select Delivery Challan..."
                                isSearchable
                                isClearable
                                menuPlacement="auto"
                                value={selectedDCOption}
                                onChange={(selected) => setSelectedDCOption(selected)}
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderColor: "#ff7f00",
                                        boxShadow: "none",
                                        "&:hover": { borderColor: "#ff7f00" },
                                    }),
                                    option: (base, state) => ({
                                        ...base,
                                        backgroundColor: state.isFocused ? "#fff3e0" : "white",
                                        color: "#000",
                                    }),
                                }}
                                isDisabled={isLoading}
                            />
                            {selectedDCOption && (
                                <div className="mt-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="font-medium text-blue-800">
                                        {selectedDCOption.label}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* DC Details */}
                    {dcDetails && (
                        <>
                            {/* Check if all products are fully received - hide entire form */}
                            {dcDetails.products && dcDetails.products.length > 0 && productPendingQuantities.length > 0 && productPendingQuantities.every(p => p.pendingQty <= 0) ? (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-green-800 mb-2">All Quantities Received</h3>
                                        <p className="text-green-700 mb-4">All quantities for this Delivery Challan have been successfully received.</p>
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                            Status: Completed
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">

                                    {/* Check if all products are fully received */}
                                    {(dcDetails.products && dcDetails.products.length > 0 && productPendingQuantities.length > 0 && productPendingQuantities.every(p => p.pendingQty <= 0)) ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                            <h3 className="font-medium text-green-800 mb-2">All quantities for this DC have been received.</h3>
                                            <p className="text-green-700">This Delivery Challan is fully completed.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Previous Data Section */}
                                            {hasExistingGRN && partialGRN && (
                                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                    <h3 className="font-medium text-orange-800 mb-3">Previous GRN Data</h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-medium">Total Sent:</span> {partialGRN.totalSent}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Total Received:</span> {partialGRN.totalReceived}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Pending:</span> {partialGRN.pending}
                                                        </div>
                                                        {isEditingPartialGRN && partialGRN.currentGRNReceived !== undefined && (
                                                            <div>
                                                                <span className="font-medium">Current GRN Received:</span> {partialGRN.currentGRNReceived}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <h3 className="font-medium text-blue-800 mb-3">Delivery Challan Details</h3>
                                
                                                {/* Check if DC has multiple products */}
                                                {dcDetails.products && dcDetails.products.length > 0 ? (
                                                    // Display multiple products
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium">DC Number:</span> {dcDetails.dc_no}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Issued To:</span> {dcDetails.unit_type === 'Own Unit' ? (dcDetails.person_name || 'N/A') : (dcDetails.supplier_id?.name || 'N/A')} / {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Date:</span> {new Date(dcDetails.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Unit Type:</span> {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">Status:</span> 
                                                                <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                    dcDetails.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                                    dcDetails.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                                                                    dcDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                    {dcDetails.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                
                                                        {/* Products Table */}
                                                        <div className="mt-4">
                                                            <h4 className="font-medium text-blue-700 mb-2">Products</h4>
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full divide-y divide-gray-200">
                                                                    <thead className="bg-gray-50">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received (till now)</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pending</th>
                                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receive Now*</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                                        {dcDetails.products.map((product, index) => {
                                                                            // Get pending quantity for this product
                                                                            const productPending = productPendingQuantities.find(p => p.productName === product.product_name);
                                                                            const cartonsSent = product.carton_qty || 0;
                                                                            const totalReceived = productPending ? productPending.totalReceived : 0;
                                                                            const pendingQty = productPending ? productPending.pendingQty : cartonsSent;
                                                                    
                                                                            // Check if this product is fully received
                                                                            const isFullyReceived = pendingQty <= 0;
                                                                    
                                                                            return (
                                                                                <tr key={index} className={isFullyReceived ? 'bg-gray-50' : ''}>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                                        {product.product_name}
                                                                                        {isFullyReceived && (
                                                                                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                                                Completed
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                                        {cartonsSent}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                                        {totalReceived}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                                            isFullyReceived 
                                                                                                ? 'bg-green-100 text-green-800' 
                                                                                                : 'bg-orange-100 text-orange-800'
                                                                                        }`}>
                                                                                        {isFullyReceived ? 'Completed' : `${pendingQty} Pending`}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                                        {isFullyReceived ? (
                                                                                            <span className="text-green-600 font-medium">Completed</span>
                                                                                        ) : (
                                                                                            <input
                                                                                                type="number"
                                                                                                min="0"
                                                                                                max={pendingQty}
                                                                                                value={productCartonsReceived[index] || ''}
                                                                                                onChange={(e) => handleProductCartonsReceivedChange(index, e.target.value)}
                                                                                                className={`w-24 px-2 py-1 border rounded ${isFullyReceived ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'}`}
                                                                                                disabled={isLoading || isGRNLocked || isFullyReceived}
                                                                                                placeholder={`Max: ${pendingQty}`}
                                                                                            />
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Display single product (backward compatibility)
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="font-medium">DC Number:</span> {dcDetails.dc_no}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Issued To:</span> {dcDetails.unit_type === 'Own Unit' ? (dcDetails.person_name || 'N/A') : (dcDetails.supplier_id?.name || 'N/A')} / {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Date:</span> {new Date(dcDetails.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Cartons Sent:</span> {dcDetails.carton_qty || 0}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Unit Type:</span> {dcDetails.unit_type === 'Own Unit' ? 'Own Unit' : 'Jobber'}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium">Status:</span> 
                                                            <span className={`ml-2 px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                                dcDetails.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                                dcDetails.status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                                                                dcDetails.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {dcDetails.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Carton Information */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                            <div className="bg-blue-100 text-blue-800 px-3 py-3 rounded-lg font-medium whitespace-nowrap">
                                                Cartons Sent: {
                                                    dcDetails.products && dcDetails.products.length > 0 
                                                        ? dcDetails.products.reduce((total, product) => total + (product.carton_qty || 0), 0)
                                                        : (dcDetails.carton_qty || 0)
                                                }
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Receiver Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={receivedBy}
                                                onChange={(e) => setReceivedBy(e.target.value)}
                                                className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                disabled={isLoading || isGRNLocked || !!user} // Read-only if user is logged in
                                                readOnly={!!user} // Read-only if user is logged in
                                            />
                                        </div>
                                        
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Date Received *
                                            </label>
                                            <input
                                                type="date"
                                                value={dateReceived}
                                                onChange={(e) => setDateReceived(e.target.value)}
                                                className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                disabled={isLoading || isGRNLocked}
                                            />
                                        </div>
                                    </div>

                                    {/* Material Usage Calculation */}
                                    {/* {materialUsage.length > 0 && (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-medium text-gray-800 mb-3">Material Usage Calculation</h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used Qty</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Qty</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {materialUsage.map((usage, index) => (
                                                            <tr key={index}>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.materialName}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.sentQty}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.usedQty}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{usage.remainingQty}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )} */}
                                    
                                    {/* Record Damaged Stock Button */}
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowDamagedStockSection(!showDamagedStockSection)}
                                            className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center"
                                        >
                                            <FaPlus className="mr-2" />
                                            Record Damaged Stock
                                        </button>
                                        
                                        {/* Damaged Stock Section - Only shown when button is clicked */}
                                        {showDamagedStockSection && (
                                            <div className="mt-4 border-t border-gray-200 pt-4">
                                                <h3 className="font-medium text-gray-900 mb-3">Record Damaged Stock</h3>
                                                {error && (
                                                    <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
                                                        {error}
                                                    </div>
                                                )}
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining Qty</th>
                                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {damagedStock.map((item, index) => {
                                                                const remainingQty = calculateRemainingQty(item.material_name, item.received_qty);
                                                                const isDisabled = remainingQty === 0;
                                                                
                                                                return (
                                                                    <tr key={index}>
                                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                            {item.material_name}
                                                                        </td>
                                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                                                            {item.received_qty}
                                                                        </td>
                                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                                                            {remainingQty}
                                                                        </td>
                                                                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={remainingQty}
                                                                                value={item.damaged_qty}
                                                                                onChange={(e) => handleDamagedQtyChange(index, e.target.value)}
                                                                                className="w-20 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-right"
                                                                                disabled={isDisabled}
                                                                            />
                                                                            {isDisabled && (
                                                                                <div className="text-xs text-gray-500 mt-1">No remaining qty</div>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                <div className="flex justify-end space-x-3 mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleResetDamagedStock}
                                                        className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                                        disabled={isLoading}
                                                    >
                                                        Reset
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveDamagedStock}
                                                        className="px-4 py-2 text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center"
                                                        disabled={isLoading}
                                                    >
                                                        {isLoading ? (
                                                            <>
                                                                <FaSpinner className="animate-spin mr-2" />
                                                                Saving...
                                                            </>
                                                        ) : (
                                                            'Save Damaged Stock'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Saved Damaged Stock Entries */}
                                    {savedDamagedStock.length > 0 && (
                                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                                            <h3 className="font-medium text-gray-900 mb-3">Saved Damaged Stock Entries</h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sent Qty</th>
                                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Damaged Qty</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entered By</th>
                                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {savedDamagedStock.map((entry) => (
                                                            <tr key={entry._id}>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                    {entry.material_name}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                                                                    {entry.received_qty}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-red-600 text-right">
                                                                    {entry.damaged_qty}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                                                        entry.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                        entry.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                                        entry.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                        {entry.status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                    {entry.entered_by}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                    {new Date(entry.entered_on).toLocaleDateString()}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-center">
                                                                    {entry.status === 'Pending' && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteSavedDamagedStock(entry._id)}
                                                                            className="text-red-600 hover:text-red-900"
                                                                            title="Delete Entry"
                                                                        >
                                                                            <FaTrash />
                                                                        </button>
                                                                    )}
                                                                    {entry.status !== 'Pending' && (
                                                                        <span className="text-gray-400">
                                                                            <FaCheck />
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex justify-end space-x-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="px-6 py-2.5 text-sm font-medium text-dark-700 bg-light-200 rounded-lg hover:bg-light-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-light-500"
                                            disabled={isLoading}
                                        >
                                            Reset
                                        </button>
                                        <button
                                            type="submit"
                                            className={`px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center ${
                                                (dcDetails && dcDetails.products && dcDetails.products.length > 0 && productPendingQuantities.length > 0 && productPendingQuantities.every(p => p.pendingQty <= 0)) || isGRNLocked
                                                    ? 'bg-gray-400 cursor-not-allowed'
                                                    : 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500'
                                            }`}
                                            disabled={
                                                isLoading || 
                                                isGRNLocked || 
                                                (dcDetails && dcDetails.products && dcDetails.products.length > 0 && productPendingQuantities.length > 0 && productPendingQuantities.every(p => p.pendingQty <= 0))
                                            }
                                        >
                                            {isLoading ? (
                                                <>
                                                    <FaSpinner className="animate-spin mr-2" />
                                                    Processing...
                                                </>
                                            ) : (
                                                <>
                                                    <FaRedo className="mr-2" />
                                                    Create GRN
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    </form>
                </Card>
            </div>
        );
    };

export default CreateFGGRN;