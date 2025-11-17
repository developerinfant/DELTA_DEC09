import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import api from '../../api';
import { toast } from 'react-toastify';
import { FaSearch } from 'react-icons/fa';

const CreateProductMappingModal = ({ isOpen, onClose, onMappingCreated, editingMapping }) => {
    const [productName, setProductName] = useState('');
    const [hsnCode, setHsnCode] = useState('');
    const [unitsPerCarton, setUnitsPerCarton] = useState(1);
    const [selectedMaterials, setSelectedMaterials] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [materialSearchTerm, setMaterialSearchTerm] = useState('');
    const [materialQuantities, setMaterialQuantities] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Filter materials based on search term
    const filteredMaterials = materials.filter(material =>
        material.name.toLowerCase().includes(materialSearchTerm.toLowerCase())
    );

    // Fetch all materials when the modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchMaterials = async () => {
                try {
                    const response = await api.get('/materials');
                    setMaterials(response.data);
                } catch (err) {
                    console.error('Failed to fetch materials:', err);
                    setError('Failed to load materials');
                }
            };
            fetchMaterials();
            
            // Reset form when modal opens
            setMaterialSearchTerm('');
            setError('');
        }
    }, [isOpen]);

    // Pre-fill form when editingMapping or materials change
    useEffect(() => {
        if (isOpen && editingMapping && materials.length > 0) {
            // Pre-fill form with existing data for editing
            setIsEditing(true);
            setProductName(editingMapping.product_name);
            setHsnCode(editingMapping.hsn_code || '');
            setUnitsPerCarton(editingMapping.units_per_carton || 1);
            
            // Map materials to selected materials and quantities
            const selectedIds = [];
            const quantities = {};
            
            editingMapping.materials.forEach(material => {
                // Find material in available materials
                const existingMaterial = materials.find(m => m.name === material.material_name);
                if (existingMaterial) {
                    selectedIds.push(existingMaterial._id);
                    quantities[existingMaterial._id] = material.qty_per_carton;
                }
            });
            
            setSelectedMaterials(selectedIds);
            setMaterialQuantities(quantities);
        } else if (isOpen && !editingMapping) {
            // Reset for new mapping
            setIsEditing(false);
            setProductName('');
            setHsnCode('');
            setUnitsPerCarton(1);
            setSelectedMaterials([]);
            setMaterialQuantities({});
        }
    }, [isOpen, editingMapping, materials]);

    const handleMaterialToggle = (materialId) => {
        setSelectedMaterials(prev => {
            if (prev.includes(materialId)) {
                // Remove material
                const newQuantities = { ...materialQuantities };
                delete newQuantities[materialId];
                setMaterialQuantities(newQuantities);
                return prev.filter(id => id !== materialId);
            } else {
                // Add material with default quantity of 1
                setMaterialQuantities(prev => ({ ...prev, [materialId]: 1 }));
                return [...prev, materialId];
            }
        });
    };

    const handleQuantityChange = (materialId, quantity) => {
        setMaterialQuantities(prev => ({
            ...prev,
            [materialId]: quantity > 0 ? parseInt(quantity) : 1
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!productName.trim()) {
            setError('Product Name is required');
            return;
        }

        if (unitsPerCarton <= 0) {
            setError('Units per Carton must be greater than 0');
            return;
        }

        if (selectedMaterials.length === 0) {
            setError('At least 1 material selected is required');
            return;
        }

        // Check if all quantities are greater than 0
        for (const materialId of selectedMaterials) {
            if (!materialQuantities[materialId] || materialQuantities[materialId] <= 0) {
                setError('All quantities must be greater than 0');
                return;
            }
        }

        setLoading(true);
        try {
            // Prepare materials data
            const materialsData = selectedMaterials.map(materialId => {
                const material = materials.find(m => m._id === materialId);
                return {
                    material_name: material.name,
                    qty_per_carton: materialQuantities[materialId]
                };
            });

            let response;
            if (isEditing && editingMapping) {
                // Update existing mapping
                response = await api.put(`/product-mapping/${editingMapping._id}`, {
                    product_name: productName.trim(),
                    hsn_code: hsnCode.trim(),
                    units_per_carton: unitsPerCarton,
                    materials: materialsData
                });
                toast.success('Product mapping updated.');
            } else {
                // Create new mapping
                response = await api.post('/product-mapping', {
                    product_name: productName.trim(),
                    hsn_code: hsnCode.trim(),
                    units_per_carton: unitsPerCarton,
                    materials: materialsData
                });
                toast.success('Product mapping saved.');
            }

            onMappingCreated(response.data);
            onClose();
        } catch (err) {
            console.error('Failed to save product mapping:', err);
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
                // Show specific error toast messages
                if (err.response.data.message === 'Duplicate product mapping already exists.') {
                    toast.error('Duplicate product mapping already exists.');
                } else {
                    toast.error('Failed to save product mapping');
                }
            } else {
                setError('Failed to save product mapping');
                toast.error('Failed to save product mapping');
            }
        } finally {
            setLoading(false);
        }
    };

    const getMaterialName = (materialId) => {
        const material = materials.find(m => m._id === materialId);
        return material ? material.name : '';
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Edit Product Mapping" : "Create Product Mapping"}>
            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {error && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
                        Product Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="product-name"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., Sampradayam 12 Cup Sambrani"
                    />
                </div>

                <div>
                    <label htmlFor="hsn-code" className="block text-sm font-medium text-gray-700 mb-1">
                        HSN Code
                    </label>
                    <input
                        type="text"
                        id="hsn-code"
                        value={hsnCode}
                        onChange={(e) => setHsnCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., 48191010"
                    />
                </div>

                <div>
                    <label htmlFor="units-per-carton" className="block text-sm font-medium text-gray-700 mb-1">
                        Units per Carton <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        id="units-per-carton"
                        min="1"
                        value={unitsPerCarton}
                        onChange={(e) => setUnitsPerCarton(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g., 144"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        Number of individual units in one carton (e.g., 144 pieces per carton)
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Materials <span className="text-red-500">*</span>
                    </label>
                    <div className="border border-gray-300 rounded-md">
                        {/* Search bar for materials */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search materials..."
                                value={materialSearchTerm}
                                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border-b border-gray-200 rounded-t-md 
                                         bg-white text-gray-900 placeholder-gray-500
                                         focus:outline-none focus:ring-0"
                            />
                        </div>
                        
                        {/* Materials list */}
                        <div className="max-h-60 overflow-y-auto">
                            {filteredMaterials.length > 0 ? (
                                filteredMaterials.map(material => (
                                    <div key={material._id} className="flex items-center px-4 py-2 border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            id={`material-${material._id}`}
                                            checked={selectedMaterials.includes(material._id)}
                                            onChange={() => handleMaterialToggle(material._id)}
                                            className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <label htmlFor={`material-${material._id}`} className="ml-3 flex-1 text-sm font-medium text-gray-700">
                                            {material.name}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-gray-500">
                                    No materials found
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {selectedMaterials.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Material Quantities
                        </label>
                        <div className="border border-gray-300 rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Material Name
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Qty per Carton
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedMaterials.map(materialId => (
                                        <tr key={materialId}>
                                            <td className="px-4 py-2 text-sm text-gray-900">
                                                {getMaterialName(materialId)}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={materialQuantities[materialId] || 1}
                                                    onChange={(e) => handleQuantityChange(materialId, e.target.value)}
                                                    className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-white py-4 border-t border-gray-200 -mx-6 px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Mapping' : 'Save Mapping')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CreateProductMappingModal;