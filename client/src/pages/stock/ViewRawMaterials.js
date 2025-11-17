import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner } from 'react-icons/fa';
import RawMaterialForm from '../../components/stock/RawMaterialForm';
import RawMaterialsTable from '../../components/stock/RawMaterialsTable';
import ViewReportTools from '../../components/common/ViewReportTools';

const ViewRawMaterials = () => {
    const [materials, setMaterials] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    // Calculate total price for selected material in edit modal
    const editModalTotalPrice = useMemo(() => {
        if (selectedMaterial && selectedMaterial.quantity && selectedMaterial.perQuantityPrice) {
            const total = parseFloat(selectedMaterial.quantity) * parseFloat(selectedMaterial.perQuantityPrice);
            return total.toFixed(2);
        }
        return '';
    }, [selectedMaterial]);

    useEffect(() => {
        const fetchMaterials = async () => {
            setIsLoading(true);
            try {
                const { data } = await api.get('/stock/raw-materials');
                setMaterials(data);
            } catch (err) {
                setError('Failed to fetch raw materials.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMaterials();
    }, []);

    const handleAddMaterial = (newMaterial) => {
        setMaterials(prev => [...prev, newMaterial]);
    };

    const handleUpdateMaterial = async (e) => {
        e.preventDefault();
        try {
            const { data: updatedMaterial } = await api.put(`/stock/raw-materials/${selectedMaterial._id}`, selectedMaterial);
            setMaterials(materials.map(m => m._id === updatedMaterial._id ? updatedMaterial : m));
            closeEditModal();
        } catch (err) {
            console.error("Failed to update material", err);
        }
    };

    const handleDeleteMaterial = async () => {
        if (!selectedMaterial) return;
        try {
            await api.delete(`/stock/raw-materials/${selectedMaterial._id}`);
            setMaterials(materials.filter(m => m._id !== selectedMaterial._id));
            closeDeleteModal();
        } catch (err) {
            console.error("Failed to delete material", err);
        }
    };

    const openEditModal = (material) => {
        setSelectedMaterial(material);
        setIsEditModalOpen(true);
    };
    const closeEditModal = () => setIsEditModalOpen(false);

    const openDeleteModal = (materialId) => {
        setSelectedMaterial({ _id: materialId });
        setIsDeleteModalOpen(true);
    };
    const closeDeleteModal = () => setIsDeleteModalOpen(false);

    // --- Filtering Logic ---
    const filteredMaterials = materials.filter(material =>
        material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.itemCode && material.itemCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'Item Code', key: 'itemCode' },
        { header: 'Material Name', key: 'name' },
        { header: 'Quantity', key: 'quantity' },
        { header: 'Unit Price (₹)', key: 'perQuantityPrice', render: (value) => `₹${parseFloat(value).toFixed(2)}` },
        { header: 'Total Value (₹)', key: 'totalValue', render: (value, row) => `₹${(parseFloat(row.quantity) * parseFloat(row.perQuantityPrice)).toFixed(2)}` },
        { header: 'Alert Threshold', key: 'stockAlertThreshold' },
        { header: 'Last Updated', key: 'updatedAt', render: (value) => new Date(value).toLocaleDateString() }
    ];

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-accent-500" size={48} /></div>;
    }

    if (error) {
        return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;
    }

    return (
        <div className="container mx-auto px-4 py-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-neutral-800">Raw Materials</h1>
                <ViewReportTools
                    data={filteredMaterials}
                    title="Raw Material Stock"
                    fileName="RawMaterials"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                    searchFilter={searchTerm}
                />
            </div>
            <RawMaterialForm onMaterialAdded={handleAddMaterial} />
            <div className="mt-6">
                <input
                    type="text"
                    placeholder="Search by item code or material name..."
                    className="p-2.5 border border-gray-300 rounded-md w-full md:w-1/3 mb-4 shadow-sm text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <RawMaterialsTable 
                    materials={filteredMaterials} 
                    onEdit={openEditModal} 
                    onDelete={openDeleteModal}
                />
            </div>
            
            {/* Edit Material Modal */}
            <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Edit Raw Material">
                {selectedMaterial && (
                    <form onSubmit={handleUpdateMaterial} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Item Code</label>
                            <input type="text" value={selectedMaterial.itemCode} readOnly className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm bg-gray-100 text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Material Name</label>
                            <input type="text" value={selectedMaterial.name} onChange={e => setSelectedMaterial({...selectedMaterial, name: e.target.value})} className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Quantity</label>
                            <input type="number" value={selectedMaterial.quantity} onChange={e => setSelectedMaterial({...selectedMaterial, quantity: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Unit Price (₹)</label>
                            <input type="number" value={selectedMaterial.perQuantityPrice} onChange={e => setSelectedMaterial({...selectedMaterial, perQuantityPrice: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Total Price (₹)</label>
                            <input type="text" value={editModalTotalPrice} readOnly className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm bg-gray-100 text-sm"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Alert Threshold</label>
                            <input type="number" value={selectedMaterial.stockAlertThreshold} onChange={e => setSelectedMaterial({...selectedMaterial, stockAlertThreshold: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2.5 border border-neutral-300 rounded-md shadow-sm text-sm"/>
                        </div>
                        <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                            <button type="button" onClick={closeEditModal} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-5 py-2.5 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Save Changes</button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Confirm Deletion">
                <p>Are you sure you want to delete this raw material?</p>
                <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                    <button type="button" onClick={closeDeleteModal} className="px-5 py-2.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
                    <button type="button" onClick={handleDeleteMaterial} className="px-5 py-2.5 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700">Delete</button>
                </div>
            </Modal>
        </div>
    );
};

export default ViewRawMaterials;