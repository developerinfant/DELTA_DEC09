import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Card from '../../../components/common/Card';
import Modal from '../../../components/common/Modal';
import { FaSpinner, FaEdit, FaTrash, FaInfoCircle } from 'react-icons/fa';
import ViewReportTools from '../../../components/common/ViewReportTools';

// Supplier Form Component (for both creating and editing)
const SupplierForm = ({ onSave, initialData = {}, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        supplierType: 'Raw',
        contactPerson: '',
        phoneNumber: '',
        email: '',
        address: '',
        gstin: '',
        panNumber: '',
        businessCategory: '',
        state: '',
        country: 'India',
        bankName: '',
        branch: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        paymentTerms: 'Net 30',
        notes: '',
        materialType: 'raw'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [nextSupplierCode, setNextSupplierCode] = useState('');

    // Fetch next supplier code when component mounts
    useEffect(() => {
        const fetchNextSupplierCode = async () => {
            try {
                const response = await api.get('/suppliers/next-supplier-code');
                setNextSupplierCode(response.data.nextSupplierCode);
            } catch (err) {
                console.error('Failed to fetch next supplier code:', err);
            }
        };

        fetchNextSupplierCode();
    }, []);

    // This useEffect populates the form when editing a supplier
    useEffect(() => {
        if (initialData && initialData._id) {
            setFormData({
                name: initialData.name || '',
                supplierType: initialData.supplierType || 'Raw',
                contactPerson: initialData.contactPerson || '',
                phoneNumber: initialData.phoneNumber || '',
                email: initialData.email || '',
                address: initialData.address || '',
                gstin: initialData.gstin || '',
                panNumber: initialData.panNumber || '',
                businessCategory: initialData.businessCategory || '',
                state: initialData.state || '',
                country: initialData.country || 'India',
                bankName: initialData.bankName || '',
                branch: initialData.branch || '',
                accountNumber: initialData.accountNumber || '',
                ifscCode: initialData.ifscCode || '',
                upiId: initialData.upiId || '',
                paymentTerms: initialData.paymentTerms || 'Net 30',
                notes: initialData.notes || '',
                materialType: initialData.materialType || 'raw'
            });
        } else {
            // Reset form for new supplier but keep the next supplier code
            setFormData({
                name: '',
                supplierType: 'Raw',
                contactPerson: '',
                phoneNumber: '',
                email: '',
                address: '',
                gstin: '',
                panNumber: '',
                businessCategory: '',
                state: '',
                country: 'India',
                bankName: '',
                branch: '',
                accountNumber: '',
                ifscCode: '',
                upiId: '',
                paymentTerms: 'Net 30',
                notes: '',
                materialType: 'raw'
            });
        }
    }, [initialData._id]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        // Validation
        if (!formData.name) {
            setError('Supplier Name is required');
            return;
        }
        
        if (!formData.supplierType) {
            setError('Supplier Type is required');
            return;
        }
        
        if (!formData.contactPerson) {
            setError('Contact Person is required');
            return;
        }
        
        if (!formData.phoneNumber) {
            setError('Phone Number is required');
            return;
        }
        
        if (!formData.email) {
            setError('Email is required');
            return;
        }
        
        if (!formData.address) {
            setError('Address is required');
            return;
        }
        
        // GSTIN validation (15 characters)
        if (formData.gstin && formData.gstin.length !== 15) {
            setError('GSTIN must be 15 characters long');
            return;
        }
        
        // IFSC validation (11 characters: 4 letters + 0 + 6 digits)
        const ifscRegex = /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/;
        if (formData.ifscCode && !ifscRegex.test(formData.ifscCode)) {
            setError('IFSC code must be 11 characters: 4 letters + 0 + 6 alphanumeric characters');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(formData);
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const commonInputClass = "mt-1 block w-full px-4 py-2 text-dark-700 bg-light-200 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500";
    const sectionTitleClass = "text-lg font-semibold text-dark-700 mb-3 pb-2 border-b border-light-300";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white">
                <h3 className={sectionTitleClass}>Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="supplierCode" className="block text-sm font-medium text-dark-700">Supplier Code</label>
                        <input 
                            type="text" 
                            name="supplierCode" 
                            id="supplierCode" 
                            value={nextSupplierCode} 
                            readOnly 
                            className={`${commonInputClass} bg-gray-100 cursor-not-allowed`} 
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-dark-700">Supplier Name <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            name="name" 
                            id="name" 
                            value={formData.name} 
                            onChange={handleChange} 
                            required 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="supplierType" className="block text-sm font-medium text-dark-700">Supplier Type <span className="text-red-500">*</span></label>
                        <select 
                            name="supplierType" 
                            id="supplierType" 
                            value={formData.supplierType} 
                            onChange={handleChange} 
                            required 
                            className={commonInputClass}
                        >
                            <option value="Packing">Packing</option>
                            <option value="Raw">Raw</option>
                            <option value="Both">Both</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="materialType" className="block text-sm font-medium text-dark-700">Material Type</label>
                        <select 
                            name="materialType" 
                            id="materialType" 
                            value={formData.materialType} 
                            onChange={handleChange} 
                            className={commonInputClass}
                        >
                            <option value="">Select Type</option>
                            <option value="packing">Packing Material</option>
                            <option value="raw">Raw Material</option>
                            <option value="both">Both</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="contactPerson" className="block text-sm font-medium text-dark-700">Contact Person <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            name="contactPerson" 
                            id="contactPerson" 
                            value={formData.contactPerson} 
                            onChange={handleChange} 
                            required 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-dark-700">Phone Number <span className="text-red-500">*</span></label>
                        <input 
                            type="tel" 
                            name="phoneNumber" 
                            id="phoneNumber" 
                            value={formData.phoneNumber} 
                            onChange={handleChange} 
                            required 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-dark-700">Email <span className="text-red-500">*</span></label>
                        <input 
                            type="email" 
                            name="email" 
                            id="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            required 
                            className={commonInputClass} 
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-dark-700">Address <span className="text-red-500">*</span></label>
                        <textarea 
                            name="address" 
                            id="address" 
                            value={formData.address} 
                            onChange={handleChange} 
                            required 
                            rows="3" 
                            className={commonInputClass} 
                        />
                    </div>
                </div>
            </div>

            {/* Tax & Business Details Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white">
                <h3 className={sectionTitleClass}>Tax & Business Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                        <label htmlFor="gstin" className="block text-sm font-medium text-dark-700">GSTIN</label>
                        <FaInfoCircle className="ml-2 text-gray-400" title="15-character GST identification number" />
                    </div>
                    <input 
                        type="text" 
                        name="gstin" 
                        id="gstin" 
                        value={formData.gstin} 
                        onChange={handleChange} 
                        maxLength="15"
                        className={commonInputClass} 
                    />
                    <div>
                        <label htmlFor="panNumber" className="block text-sm font-medium text-dark-700">PAN Number</label>
                        <input 
                            type="text" 
                            name="panNumber" 
                            id="panNumber" 
                            value={formData.panNumber} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="businessCategory" className="block text-sm font-medium text-dark-700">Business Category</label>
                        <select 
                            name="businessCategory" 
                            id="businessCategory" 
                            value={formData.businessCategory} 
                            onChange={handleChange} 
                            className={commonInputClass}
                        >
                            <option value="">Select Category</option>
                            <option value="Manufacturer">Manufacturer</option>
                            <option value="Distributor">Distributor</option>
                            <option value="Wholesaler">Wholesaler</option>
                            <option value="Retailer">Retailer</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-dark-700">State</label>
                        <input 
                            type="text" 
                            name="state" 
                            id="state" 
                            value={formData.state} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-medium text-dark-700">Country</label>
                        <input 
                            type="text" 
                            name="country" 
                            id="country" 
                            value={formData.country} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                </div>
            </div>

            {/* Bank Details Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white">
                <h3 className={sectionTitleClass}>Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="bankName" className="block text-sm font-medium text-dark-700">Bank Name</label>
                        <input 
                            type="text" 
                            name="bankName" 
                            id="bankName" 
                            value={formData.bankName} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-dark-700">Branch</label>
                        <input 
                            type="text" 
                            name="branch" 
                            id="branch" 
                            value={formData.branch} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                    <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-dark-700">Account Number</label>
                        <input 
                            type="text" 
                            name="accountNumber" 
                            id="accountNumber" 
                            value={formData.accountNumber} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                    <div className="flex items-center">
                        <label htmlFor="ifscCode" className="block text-sm font-medium text-dark-700">IFSC Code</label>
                        <FaInfoCircle className="ml-2 text-gray-400" title="11-character code: 4 letters + 0 + 6 alphanumeric characters" />
                    </div>
                    <input 
                        type="text" 
                        name="ifscCode" 
                        id="ifscCode" 
                        value={formData.ifscCode} 
                        onChange={handleChange} 
                        maxLength="11"
                        className={commonInputClass} 
                    />
                    <div>
                        <label htmlFor="upiId" className="block text-sm font-medium text-dark-700">UPI ID</label>
                        <input 
                            type="text" 
                            name="upiId" 
                            id="upiId" 
                            value={formData.upiId} 
                            onChange={handleChange} 
                            className={commonInputClass} 
                        />
                    </div>
                </div>
            </div>

            {/* Additional Information Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white">
                <h3 className={sectionTitleClass}>Additional Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="paymentTerms" className="block text-sm font-medium text-dark-700">Payment Terms</label>
                        <select 
                            name="paymentTerms" 
                            id="paymentTerms" 
                            value={formData.paymentTerms} 
                            onChange={handleChange} 
                            className={commonInputClass}
                        >
                            <option value="Net 15">Net 15</option>
                            <option value="Net 30">Net 30</option>
                            <option value="Advance">Advance</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-dark-700">Notes</label>
                        <textarea 
                            name="notes" 
                            id="notes" 
                            value={formData.notes} 
                            onChange={handleChange} 
                            rows="3" 
                            className={commonInputClass} 
                        />
                    </div>
                </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end space-x-3 pt-4">
                {onCancel && <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>}
                <button type="submit" disabled={isLoading} className="px-6 py-2 text-white bg-primary-500 rounded-lg hover:bg-primary-600">
                    {isLoading ? 'Saving...' : 'Save Supplier'}
                </button>
            </div>
        </form>
    );
};

const ManageStockSuppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const fetchSuppliers = async () => {
        try {
            const { data } = await api.get('/suppliers');
            setSuppliers(data);
        } catch (err) {
            setError('Failed to fetch suppliers.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);
    
    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000); // Hide after 3 seconds
    };

    const handleCreate = async (supplierData) => {
        const { data } = await api.post('/suppliers', supplierData);
        setSuppliers([...suppliers, data]);
        showSuccessMessage(`Supplier "${data.name}" created successfully!`);
    };

    const handleUpdate = async (supplierData) => {
        const { data: updatedSupplier } = await api.put(`/suppliers/${selectedSupplier._id}`, supplierData);
        setSuppliers(suppliers.map(s => s._id === updatedSupplier._id ? updatedSupplier : s));
        showSuccessMessage(`Supplier "${updatedSupplier.name}" updated successfully!`);
        closeModal();
    };

    const handleDelete = async (supplierId) => {
        if (window.confirm('Are you sure you want to delete this supplier? This could affect existing purchase orders.')) {
            await api.delete(`/suppliers/${supplierId}`);
            setSuppliers(suppliers.filter(s => s._id !== supplierId));
            showSuccessMessage('Supplier deleted successfully.');
        }
    };
    
    const openModal = (supplier) => {
        setSelectedSupplier(supplier);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedSupplier(null);
        setIsModalOpen(false);
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;

    // Filter suppliers for display - show all suppliers but highlight raw material suppliers
    const rawSuppliers = suppliers.filter(supplier => 
        !supplier.materialType || supplier.materialType === 'raw'
    );

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'CODE', key: 'supplierCode' },
        { header: 'Supplier Name', key: 'name' },
        { header: 'TYPE', key: 'supplierType', render: (value) => (
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                value === 'Packing' ? 'bg-green-100 text-green-800' : 
                value === 'Raw' ? 'bg-blue-100 text-blue-800' : 
                'bg-purple-100 text-purple-800'
            }`}>
                {value}
            </span>
        ) },
        { header: 'Contact Person', key: 'contactPerson' },
        { header: 'Phone', key: 'phoneNumber' },
        { header: 'GSTIN', key: 'gstin' },
        { header: 'Email', key: 'email' }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {successMessage && <div className="p-4 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}
                </div>
                <ViewReportTools
                    data={rawSuppliers}
                    title="Stock Maintenance Suppliers"
                    fileName="StockSuppliers"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                />
            </div>
            
            <Card title="Add New Supplier">
                <SupplierForm onSave={handleCreate} />
            </Card>

            <Card title="Stock Maintenance Suppliers">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-blue-800">
                        <strong>Note:</strong> This shared supplier list shows all suppliers. 
                        Suppliers marked with "Raw" or no type designation are suitable for raw materials.
                    </p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-200">
                        <thead className="bg-light-200">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-bold text-secondary-500 uppercase">CODE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">NAME</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-secondary-500 uppercase">TYPE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">MATERIAL</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">CONTACT PERSON</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">PHONE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">GSTIN</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">EMAIL</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-100 divide-y divide-light-200">
                            {rawSuppliers.map(supplier => (
                                <tr key={supplier._id} className="hover:bg-light-200">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700 text-center">{supplier.supplierCode}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{supplier.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700 text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            supplier.supplierType === 'Packing' ? 'bg-green-100 text-green-800' : 
                                            supplier.supplierType === 'Raw' ? 'bg-blue-100 text-blue-800' : 
                                            'bg-purple-100 text-purple-800'
                                        }`}>
                                            {supplier.supplierType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            !supplier.materialType ? 'bg-yellow-100 text-yellow-800' : 
                                            supplier.materialType === 'packing' ? 'bg-blue-100 text-blue-800' : 
                                            supplier.materialType === 'raw' ? 'bg-green-100 text-green-800' : 
                                            supplier.materialType === 'both' ? 'bg-purple-100 text-purple-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {!supplier.materialType ? 'Not Specified' : 
                                             supplier.materialType === 'packing' ? 'Packing' : 
                                             supplier.materialType === 'raw' ? 'Raw' : 
                                             supplier.materialType === 'both' ? 'Both' : 
                                             supplier.materialType}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.contactPerson || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.phoneNumber || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.gstin || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{supplier.email || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => openModal(supplier)} className="text-blue-500 hover:text-blue-700"><FaEdit /></button>
                                        <button onClick={() => handleDelete(supplier._id)} className="text-primary-500 hover:text-primary-600"><FaTrash /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Modal isOpen={isModalOpen} onClose={closeModal} title={`Edit Supplier: ${selectedSupplier?.name}`}>
                <SupplierForm onSave={handleUpdate} initialData={selectedSupplier} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default ManageStockSuppliers;