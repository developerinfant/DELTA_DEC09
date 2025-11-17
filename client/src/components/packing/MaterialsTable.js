import React, { useState } from 'react';
import { FaPencilAlt, FaTrash, FaHistory, FaLock } from 'react-icons/fa';

/**
 * A component to display a list of packing materials in a responsive table.
 *
 * @param {object} props - The component props.
 * @param {Array} props.materials - The array of material objects to display.
 * @param {Function} props.onEdit - Function to call when the edit button is clicked.
 * @param {Function} props.onDelete - Function to call when the delete button is clicked.
 * @param {Function} props.onViewHistory - Function to call when the view history button is clicked.
 * @returns {JSX.Element} The rendered table component.
 */
const MaterialsTable = ({ materials, onEdit, onDelete, onViewHistory }) => {
    // State to track which material's history is expanded
    const [expandedHistory, setExpandedHistory] = useState(null);
    
    // Helper to format currency
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(price);
    };

    // Toggle history expansion for a material
    const toggleHistory = (materialId) => {
        setExpandedHistory(expandedHistory === materialId ? null : materialId);
    };

    // Truncate text with ellipsis
    const truncateText = (text, maxLength = 30) => {
        if (!text) return 'N/A';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200 sticky top-0 z-10">
                    <tr>
                        {/* Item Code */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider whitespace-nowrap">
                            <span className="hidden md:inline">Item</span>
                            <span className="md:hidden">Code</span>
                        </th>
                        
                        {/* Material Name */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden md:table-cell">
                            Material Name
                        </th>
                        
                        {/* Quantity & Unit */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            Qty/<span className="hidden md:inline">Unit</span><span className="md:hidden">U</span>
                        </th>
                        
                        {/* Unit Price & Total Price */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            <span className="hidden md:inline">Unit Price</span>
                            <span className="md:hidden">Price</span>
                        </th>
                        
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden lg:table-cell">
                            Total Price
                        </th>
                        
                        {/* Stock Alert Threshold */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden md:table-cell">
                            <span className="hidden lg:inline">Stock Alert</span>
                            <span className="lg:hidden">Alert</span>
                        </th>
                        
                        {/* HSN Code */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden lg:table-cell">
                            HSN
                        </th>
                        
                        {/* Brand Type */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider hidden md:table-cell">
                            Brand
                        </th>
                        
                        {/* View History */}
                        <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">
                            <span className="hidden md:inline">View</span>
                            <span className="md:hidden">Hist</span>
                        </th>
                        
                        {/* Actions */}
                        <th scope="col" className="relative px-4 py-3 text-right">
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {materials.length === 0 ? (
                        <tr>
                            <td colSpan="10" className="px-4 py-6 text-center text-secondary-500">
                                No materials found. Add a new material using the form above.
                            </td>
                        </tr>
                    ) : (
                        materials.map((material) => {
                            const isLowStock = material.quantity < material.stockAlertThreshold;
                            const totalPrice = material.quantity * material.perQuantityPrice;
                            const isHistoryExpanded = expandedHistory === material._id;
                            
                            return (
                                <React.Fragment key={material._id}>
                                    <tr className="hover:bg-light-200">
                                        {/* Item Code */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-700 overflow-hidden">
                                            <div className="truncate max-w-[80px] md:max-w-[120px]" title={material.itemCode || 'N/A'}>
                                                {material.itemCode || 'N/A'}
                                            </div>
                                        </td>
                                        
                                        {/* Material Name (hidden on mobile) */}
                                        <td className="px-4 py-3 text-sm font-medium text-dark-700 overflow-hidden hidden md:table-cell">
                                            <div className="truncate max-w-[150px] lg:max-w-xs" title={material.name}>
                                                {truncateText(material.name, 30)}
                                            </div>
                                        </td>
                                        
                                        {/* Quantity & Unit (combined for mobile) */}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm overflow-hidden">
                                            <div className="flex flex-col md:flex-row md:items-center">
                                                <span className={`font-medium ${isLowStock ? 'text-primary-500' : 'text-dark-700'}`} title={`Quantity: ${material.quantity}`}>
                                                    {material.quantity}
                                                </span>
                                                {isLowStock && <span className="md:hidden text-xs text-primary-500 ml-1">(Low)</span>}
                                                <span className="hidden md:inline mx-1">/</span>
                                                <span className="text-gray-500 text-sm" title={material.unit || 'pcs'}>
                                                    {material.unit || 'pcs'}
                                                </span>
                                            </div>
                                            {/* Show material name on mobile */}
                                            <div className="md:hidden truncate text-xs text-gray-500 mt-1 max-w-[120px]" title={material.name}>
                                                {truncateText(material.name, 20)}
                                            </div>
                                        </td>
                                        
                                        {/* Unit Price */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden">
                                            <div className="text-sm text-dark-700 truncate max-w-[80px]" title={`Unit Price: ${formatPrice(material.perQuantityPrice)}`}>
                                                {formatPrice(material.perQuantityPrice)}
                                            </div>
                                        </td>
                                        
                                        {/* Total Price (hidden on mobile) */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden hidden lg:table-cell">
                                            <div className="text-sm text-dark-700 truncate max-w-[100px]" title={formatPrice(totalPrice)}>
                                                {formatPrice(totalPrice)}
                                            </div>
                                        </td>
                                        
                                        {/* Stock Alert Threshold (hidden on mobile) */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden hidden md:table-cell">
                                            <div className="text-sm text-dark-700 truncate max-w-[80px]" title={material.stockAlertThreshold}>
                                                {material.stockAlertThreshold}
                                            </div>
                                            {isLowStock && <span className="hidden md:inline text-xs text-primary-500 ml-1">(Low Stock)</span>}
                                        </td>
                                        
                                        {/* HSN Code (hidden on mobile) */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden hidden lg:table-cell">
                                            <div className="text-sm text-dark-700 truncate max-w-[80px]" title={material.hsnCode || 'N/A'}>
                                                {material.hsnCode || 'N/A'}
                                            </div>
                                        </td>
                                        
                                        {/* Brand Type (hidden on mobile) */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden hidden md:table-cell">
                                            <div className="text-sm text-dark-700 truncate max-w-[80px]" title={material.brandType === 'own' ? 'Own Brand' : 'Other Brand'}>
                                                {material.brandType === 'own' ? 'Own' : 'Other'}
                                            </div>
                                        </td>
                                        
                                        {/* View History */}
                                        <td className="px-4 py-3 whitespace-nowrap overflow-hidden">
                                            <button
                                                onClick={() => toggleHistory(material._id)}
                                                className="px-2 py-1 bg-yellow-500 text-white rounded-full text-xs hover:bg-yellow-600 flex items-center truncate"
                                                title="View History"
                                            >
                                                <FaHistory className="mr-1 text-xs" />
                                                <span className="truncate hidden md:inline">History</span>
                                                <span className="truncate md:hidden">Hist</span>
                                            </button>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium overflow-hidden">
                                            <div className="flex items-center justify-end space-x-2">
                                                {onEdit ? (
                                                    <button
                                                        onClick={() => onEdit(material)}
                                                        className="text-blue-500 hover:text-blue-700 p-1"
                                                        title="Edit"
                                                    >
                                                        <FaPencilAlt size={14} />
                                                    </button>
                                                ) : (
                                                    <div className="text-gray-400 cursor-not-allowed p-1" title="Access disabled">
                                                        <FaLock size={14} />
                                                    </div>
                                                )}
                                                {onDelete ? (
                                                    <button
                                                        onClick={() => onDelete(material._id)}
                                                        className="text-red-500 hover:text-red-700 p-1"
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                ) : (
                                                    <div className="text-gray-400 cursor-not-allowed p-1" title="Access disabled">
                                                        <FaLock size={14} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    {/* Expanded History Row */}
                                    {isHistoryExpanded && (
                                        <tr className="bg-light-200 border-t border-light-300">
                                            <td colSpan="10" className="px-4 py-3">
                                                <div className="rounded-lg bg-white p-4 shadow-inner">
                                                    <h4 className="font-bold text-dark-700 mb-2">Price History for {material.name}</h4>
                                                    {material.priceHistory && material.priceHistory.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-light-200">
                                                                <thead className="bg-light-100">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Date</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Type</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Supplier</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">PO No.</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">GRN No.</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Qty</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Unit Price</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Total</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-light-200">
                                                                    {material.priceHistory.map((entry, index) => (
                                                                        <tr key={index} className={entry.type === 'New Average Price (Updated)' ? 'bg-yellow-50' : ''}>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{new Date(entry.date).toLocaleDateString()}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">
                                                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                                                    entry.type === 'Existing Stock' ? 'bg-blue-100 text-blue-800' :
                                                                                    entry.type === 'New GRN' ? 'bg-green-100 text-green-800' :
                                                                                    entry.type === 'New Average Price' || entry.type === 'New Average Price (Updated)' ? 'bg-yellow-100 text-yellow-800' :
                                                                                    entry.type === 'DC-OUT' ? 'bg-red-100 text-red-800' :
                                                                                    'bg-gray-100 text-gray-800'
                                                                                }`}>
                                                                                    {entry.type}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.supplier || 'N/A'}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.poNumber || 'N/A'}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.grnNumber || 'N/A'}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.qty !== undefined ? entry.qty : 'N/A'}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.unitPrice !== undefined ? formatPrice(entry.unitPrice) : 'N/A'}</td>
                                                                            <td className="px-3 py-2 text-sm text-dark-700 whitespace-nowrap">{entry.total !== undefined ? formatPrice(entry.total) : 'N/A'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500 text-sm">No price history available for this material.</p>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default MaterialsTable;