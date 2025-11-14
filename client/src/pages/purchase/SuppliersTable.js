import React from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';

const SuppliersTable = ({ suppliers, onEdit, onDelete }) => {
    return (
        <div className="overflow-x-auto bg-light-100 rounded-xl shadow-lg">
            <table className="min-w-full divide-y divide-light-200">
                <thead className="bg-light-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Contact Person</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-light-100 divide-y divide-light-200">
                    {suppliers.map(supplier => (
                        <tr key={supplier._id} className="hover:bg-light-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{supplier.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.contactPerson || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.email || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.phone || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                <button onClick={() => onEdit(supplier)} className="text-blue-500 hover:text-blue-700">
                                    <FaEdit />
                                </button>
                                <button onClick={() => onDelete(supplier._id)} className="text-primary-500 hover:text-primary-600">
                                    <FaTrash />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SuppliersTable;