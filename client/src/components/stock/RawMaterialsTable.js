import React from 'react';
import { FaPencilAlt, FaTrash } from 'react-icons/fa';

const RawMaterialsTable = ({ materials, onEdit, onDelete }) => {
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(price);
    };

    return (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
            <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                    <tr>
                        {/* Item Code */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase whitespace-nowrap">
                            <span className="hidden md:inline">Item</span>
                            <span className="md:hidden">Code</span>
                        </th>
                        
                        {/* Material Name */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">
                            Raw Material Name
                        </th>
                        
                        {/* Quantity & Unit (combined for mobile) */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                            Qty/<span className="hidden md:inline">Unit</span><span className="md:hidden">U</span>
                        </th>
                        
                        {/* Unit Price */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                            <span className="hidden md:inline">Unit Price</span>
                            <span className="md:hidden">Price</span>
                        </th>
                        
                        {/* Total Price (hidden on mobile) */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">
                            Total Price
                        </th>
                        
                        {/* Stock Alert Threshold (hidden on mobile) */}
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">
                            <span className="hidden lg:inline">Stock Alert</span>
                            <span className="lg:hidden">Alert</span>
                        </th>
                        
                        {/* Actions */}
                        <th className="relative px-4 py-3 text-right"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {materials.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-4 py-6 text-center text-neutral-500">
                                No raw materials found.
                            </td>
                        </tr>
                    ) : (
                        materials.map((material) => {
                            const isLowStock = material.quantity < material.stockAlertThreshold;
                            const totalPrice = material.quantity * material.perQuantityPrice;
                            return (
                                <tr key={material._id} className="hover:bg-neutral-50">
                                    {/* Item Code */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700 truncate max-w-[80px]">
                                        {material.itemCode || 'N/A'}
                                    </td>
                                    
                                    {/* Material Name (hidden on mobile) */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-900 truncate hidden md:table-cell max-w-[150px] lg:max-w-xs">
                                        {material.name}
                                    </td>
                                    
                                    {/* Quantity & Unit (combined for mobile) */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                        <div className="flex flex-col md:flex-row md:items-center">
                                            <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-neutral-700'}`}>
                                                {material.quantity}
                                            </span>
                                            {isLowStock && <span className="md:hidden text-xs text-red-600 ml-1">(Low)</span>}
                                            <span className="hidden md:inline mx-1">/</span>
                                            <span className="text-gray-500 text-sm">
                                                {material.unit || 'pcs'}
                                            </span>
                                        </div>
                                        {/* Show material name on mobile */}
                                        <div className="md:hidden truncate text-xs text-gray-500 mt-1 max-w-[120px]" title={material.name}>
                                            {material.name}
                                        </div>
                                    </td>
                                    
                                    {/* Unit Price */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700 truncate max-w-[80px]">
                                        {formatPrice(material.perQuantityPrice)}
                                    </td>
                                    
                                    {/* Total Price (hidden on mobile) */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700 truncate hidden md:table-cell max-w-[100px]">
                                        {formatPrice(totalPrice)}
                                    </td>
                                    
                                    {/* Stock Alert Threshold (hidden on mobile) */}
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-neutral-700 truncate hidden md:table-cell max-w-[80px]">
                                        {material.stockAlertThreshold}
                                        {isLowStock && <span className="hidden md:inline text-xs text-red-600 ml-1">(Low Stock)</span>}
                                    </td>
                                    
                                    {/* Actions */}
                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => onEdit(material)} 
                                                className="text-accent-600 hover:text-accent-900 p-1" 
                                                title="Edit"
                                            >
                                                <FaPencilAlt size={14} />
                                            </button>
                                            <button 
                                                onClick={() => onDelete(material._id)} 
                                                className="text-red-600 hover:text-red-900 p-1" 
                                                title="Delete"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default RawMaterialsTable;