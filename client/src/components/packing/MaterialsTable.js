import React, { useState } from 'react';
import { FaPencilAlt, FaTrash, FaHistory, FaLock } from 'react-icons/fa';

/**
 * A component to display a list of packing materials in a table.
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
            <table className="min-w-full divide-y divide-light-200 table-fixed w-full">
                <thead className="bg-light-200 sticky top-0 z-10">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '10%' }}>
                            Item Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '20%' }}>
                            Material Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '10%' }}>
                            Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '8%' }}>
                            Unit
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '12%' }}>
                            Per Quantity Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '12%' }}>
                            Total Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '10%' }}>
                            Stock Alert Threshold
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider" style={{ width: '10%' }}>
                            View History
                        </th>
                        <th scope="col" className="relative px-6 py-3" style={{ width: '8%' }}>
                            <span className="sr-only">Actions</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {materials.length === 0 ? (
                        <tr>
                            <td colSpan="9" className="px-6 py-4 text-center text-secondary-500">
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-700 overflow-hidden text-ellipsis">
                                            <div className="truncate" title={material.itemCode || 'N/A'}>
                                                {material.itemCode || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-dark-700 overflow-hidden">
                                            <div className="truncate" title={material.name}>
                                                {truncateText(material.name, 30)}
                                            </div>
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isLowStock ? 'text-primary-500 font-bold' : 'text-dark-700'} overflow-hidden text-ellipsis`}>
                                            <div className="truncate" title={material.quantity}>
                                                {material.quantity}
                                            </div>
                                            {isLowStock && <span className="ml-2 text-xs">(Low Stock)</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700 overflow-hidden text-ellipsis">
                                            <div className="truncate" title={material.unit || 'pcs'}>
                                                {material.unit || 'pcs'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <div className="text-sm text-dark-700 truncate" title={formatPrice(material.perQuantityPrice)}>
                                                {formatPrice(material.perQuantityPrice)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <div className="text-sm text-dark-700 truncate" title={formatPrice(totalPrice)}>
                                                {formatPrice(totalPrice)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <div className="text-sm text-dark-700 truncate" title={material.stockAlertThreshold}>
                                                {material.stockAlertThreshold}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis">
                                            <button
                                                onClick={() => toggleHistory(material._id)}
                                                className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs hover:bg-yellow-600 flex items-center truncate"
                                                title="View History"
                                            >
                                                <FaHistory className="mr-1" />
                                                <span className="truncate">View History</span>
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium overflow-hidden text-ellipsis">
                                            <div className="flex items-center justify-end space-x-4">
                                                {onEdit ? (
                                                    <button
                                                        onClick={() => onEdit(material)}
                                                        className="text-blue-500 hover:text-blue-700"
                                                        title="Edit"
                                                    >
                                                        <FaPencilAlt />
                                                    </button>
                                                ) : (
                                                    <div className="text-gray-400 cursor-not-allowed" title="Access disabled">
                                                        <FaLock />
                                                    </div>
                                                )}
                                                {onDelete ? (
                                                    <button
                                                        onClick={() => onDelete(material._id)}
                                                        className="text-primary-500 hover:text-primary-600"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                ) : (
                                                    <div className="text-gray-400 cursor-not-allowed" title="Access disabled">
                                                        <FaLock />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {/* History Expansion Row */}
                                    {isHistoryExpanded && (
                                        <tr>
                                            <td colSpan="9" className="px-6 py-4 bg-gray-50">
                                                <div className="rounded-lg border border-gray-200 p-4">
                                                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                                                        Material History — {material.name}
                                                    </h3>
                                                    
                                                    
                                                    {material.priceHistory && material.priceHistory.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-100">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                                                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {material.priceHistory.flatMap((entry, entryIndex) => {
                                                                        // Create rows based on entry type
                                                                        const rows = [];
                                                                        
                                                                        if (entry.type === 'Existing Stock') {
                                                                            // Row: Existing Stock
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-0`}>
                                                                                    <td className="px-4 py-2 text-sm text-gray-500 truncate" title={entry.type}>{entry.type}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.qty || 0}>{entry.qty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.unitPrice || 0).toFixed(2)}`}>₹{(entry.unitPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.total || 0).toFixed(2)}`}>₹{(entry.total || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title="—">—</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                        } else if (entry.type === 'New GRN') {
                                                                            // Row: New GRN
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-1`}>
                                                                                    <td className="px-4 py-2 text-sm text-blue-600 truncate" title={`New GRN (Supplier: ${entry.supplier || 'Unknown'})`}>New GRN (Supplier: {entry.supplier || 'Unknown'})</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.qty || 0}>{entry.qty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.unitPrice || 0).toFixed(2)}`}>₹{(entry.unitPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.total || 0).toFixed(2)}`}>₹{(entry.total || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.supplier || '—'}>{entry.supplier || '—'}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                        } else if (entry.type === 'New Average Price (Updated)' || entry.type === 'New Average Price') {
                                                                            // Row: New Average Price (Updated)
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-2`} className="bg-green-100 font-bold">
                                                                                    <td className="px-4 py-2 text-sm text-green-800 truncate" title={entry.type}>{entry.type}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.qty || 0}>{entry.qty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.unitPrice || 0).toFixed(2)}`}>₹{(entry.unitPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.total || 0).toFixed(2)}`}>₹{(entry.total || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title="—">—</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                        } else {
                                                                            // For backward compatibility with old entries
                                                                            // Row 1: Existing Stock
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-0`}>
                                                                                    <td className="px-4 py-2 text-sm text-gray-500 truncate" title="Existing Stock">Existing Stock</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.oldQty || 0}>{entry.oldQty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.oldPrice || 0).toFixed(2)}`}>₹{(entry.oldPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${((entry.oldQty || 0) * (entry.oldPrice || 0)).toFixed(2)}`}>₹{((entry.oldQty || 0) * (entry.oldPrice || 0)).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title="—">—</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                            
                                                                            // Row 2: New GRN
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-1`} className="bg-blue-50">
                                                                                    <td className="px-4 py-2 text-sm text-blue-600 truncate" title="New GRN">New GRN</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.newQty || 0}>{entry.newQty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.newPrice || 0).toFixed(2)}`}>₹{(entry.newPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${((entry.newQty || 0) * (entry.newPrice || 0)).toFixed(2)}`}>₹{((entry.newQty || 0) * (entry.newPrice || 0)).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.supplier || '—'}>{entry.supplier || '—'}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                            
                                                                            // Row 3: New Average Price
                                                                            rows.push(
                                                                                <tr key={`${entryIndex}-2`} className="bg-green-100 font-bold">
                                                                                    <td className="px-4 py-2 text-sm text-green-800 truncate" title="New Average Price">New Average Price</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={entry.updatedQty || 0}>{entry.updatedQty || 0}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${(entry.updatedPrice || 0).toFixed(2)}`}>₹{(entry.updatedPrice || 0).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={`₹${((entry.updatedQty || 0) * (entry.updatedPrice || 0)).toFixed(2)}`}>₹{((entry.updatedQty || 0) * (entry.updatedPrice || 0)).toFixed(2)}</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title="—">—</td>
                                                                                    <td className="px-4 py-2 text-sm text-gray-700 truncate" title={new Date(entry.date).toLocaleDateString('en-GB')}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>
                                                                                </tr>
                                                                            );
                                                                        }
                                                                        
                                                                        return rows;
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-gray-500 text-center py-4">No price history available for this material.</p>
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