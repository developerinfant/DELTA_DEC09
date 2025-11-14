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
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase" style={{ width: '120px' }}>Item Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Raw Material Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Per Quantity Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Total Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Stock Alert Threshold</th>
                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                    {materials.length === 0 ? (
                        <tr>
                            <td colSpan="7" className="px-6 py-4 text-center text-neutral-500">
                                No raw materials found.
                            </td>
                        </tr>
                    ) : (
                        materials.map((material) => {
                            const isLowStock = material.quantity < material.stockAlertThreshold;
                            const totalPrice = material.quantity * material.perQuantityPrice;
                            return (
                                <tr key={material._id} className="hover:bg-neutral-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{material.itemCode || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{material.name}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isLowStock ? 'text-red-600 font-bold' : 'text-neutral-700'}`}>
                                        {material.quantity}
                                        {isLowStock && <span className="ml-2 text-xs">(Low Stock)</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatPrice(material.perQuantityPrice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{formatPrice(totalPrice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-700">{material.stockAlertThreshold}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-4">
                                            <button onClick={() => onEdit(material)} className="text-accent-600 hover:text-accent-900" title="Edit">
                                                <FaPencilAlt />
                                            </button>
                                            <button onClick={() => onDelete(material._id)} className="text-red-600 hover:text-red-900" title="Delete">
                                                <FaTrash />
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