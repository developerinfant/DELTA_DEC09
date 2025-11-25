import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { FaSpinner, FaEdit, FaTrash, FaPlus, FaInfoCircle } from 'react-icons/fa';
import ViewReportTools from '../../components/common/ViewReportTools';

// Indian states list
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
    'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
    'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep', 'Delhi', 'Puducherry'
];

// Buyer Form Component (for both creating and editing)
const BuyerForm = ({ onSave, initialData = {}, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phoneNumber: '',
        email: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        gstin: '',
        panNumber: '',
        businessCategory: '',
        bankName: '',
        branch: '',
        accountNumber: '',
        ifscCode: '',
        upiId: '',
        transportName: '',
        paymentTerms: 'Net 30',
        destination: '',
        notes: '',
        status: 'Active'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [nextBuyerCode, setNextBuyerCode] = useState('');

    // Calculate GST type based on state
    const calculateGstType = (state) => {
        if (state && state.trim().toLowerCase() === 'tamil nadu') {
            return 'CGST+SGST';
        } else {
            return 'IGST';
        }
    };

    // This useEffect populates the form when editing a buyer
    useEffect(() => {
        if (initialData && initialData._id) {
            setFormData({
                name: initialData.name || '',
                contactPerson: initialData.contactPerson || '',
                phoneNumber: initialData.phoneNumber || '',
                email: initialData.email || '',
                address: initialData.address || '',
                city: initialData.city || '',
                state: initialData.state || '',
                pincode: initialData.pincode || '',
                country: initialData.country || 'India',
                gstin: initialData.gstin || '',
                panNumber: initialData.panNumber || '',
                businessCategory: initialData.businessCategory || '',
                bankName: initialData.bankName || '',
                branch: initialData.branch || '',
                accountNumber: initialData.accountNumber || '',
                ifscCode: initialData.ifscCode || '',
                upiId: initialData.upiId || '',
                transportName: initialData.transportName || '',
                paymentTerms: initialData.paymentTerms || 'Net 30',
                destination: initialData.destination || '',
                notes: initialData.notes || '',
                status: initialData.status || 'Active'
            });
        } else {
            // Reset form for new buyer but keep the next buyer code
            setFormData({
                name: '',
                contactPerson: '',
                phoneNumber: '',
                email: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                country: 'India',
                gstin: '',
                panNumber: '',
                businessCategory: '',
                bankName: '',
                branch: '',
                accountNumber: '',
                ifscCode: '',
                upiId: '',
                transportName: '',
                paymentTerms: 'Net 30',
                destination: '',
                notes: '',
                status: 'Active'
            });
        }
    }, [initialData._id]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle state change to automatically set GST type
    const handleStateChange = (e) => {
        const state = e.target.value;
        setFormData({ ...formData, state });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name) {
            setError('Buyer Name is required');
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

        if (!formData.city) {
            setError('City is required');
            return;
        }

        if (!formData.state) {
            setError('State is required');
            return;
        }

        if (!formData.pincode) {
            setError('Pincode is required');
            return;
        }

        // GSTIN validation (15 characters)
        if (formData.gstin && formData.gstin.length !== 15) {
            setError('GSTIN must be 15 characters long');
            return;
        }

        // Email validation
        if (formData.email && !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            setError('Please provide a valid email address');
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
                        <label htmlFor="buyerCode" className="block text-sm font-medium text-dark-700">Buyer Code</label>
                        <input
                            type="text"
                            name="buyerCode"
                            id="buyerCode"
                            value={nextBuyerCode}
                            readOnly
                            className={`${commonInputClass} bg-gray-100 cursor-not-allowed`}
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-dark-700">Buyer Name <span className="text-red-500">*</span></label>
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
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-dark-700">City <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="city"
                            id="city"
                            value={formData.city}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-dark-700">State <span className="text-red-500">*</span></label>
                        <select
                            name="state"
                            id="state"
                            value={formData.state}
                            onChange={handleStateChange}
                            required
                            className={commonInputClass}
                        >
                            <option value="">Select State</option>
                            {INDIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pincode" className="block text-sm font-medium text-dark-700">Pincode <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="pincode"
                            id="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            required
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
                    {/* Display GST Type */}
                    <div>
                        <label className="block text-sm font-medium text-dark-700">GST Type (Auto-calculated)</label>
                        <input
                            type="text"
                            value={calculateGstType(formData.state)}
                            readOnly
                            className={`${commonInputClass} bg-gray-100 cursor-not-allowed`}
                        />
                        <p className="text-xs text-gray-500 mt-1">Automatically set based on state selection</p>
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
                        <label htmlFor="transportName" className="block text-sm font-medium text-dark-700">Transport Name</label>
                        <input
                            type="text"
                            name="transportName"
                            id="transportName"
                            value={formData.transportName}
                            onChange={handleChange}
                            className={commonInputClass}
                        />
                    </div>
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
                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium text-dark-700">Destination</label>
                        <input
                            type="text"
                            name="destination"
                            id="destination"
                            value={formData.destination}
                            onChange={handleChange}
                            className={commonInputClass}
                        />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-dark-700">Status</label>
                        <select
                            name="status"
                            id="status"
                            value={formData.status}
                            onChange={handleChange}
                            className={commonInputClass}
                        >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
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
                    {isLoading ? 'Saving...' : 'Save Buyer'}
                </button>
            </div>
        </form>
    );
};

const BuyerMaster = () => {
    const [buyers, setBuyers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBuyer, setSelectedBuyer] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchBuyers = async () => {
        try {
            const { data } = await api.get('/fg/buyers');
            setBuyers(data);
        } catch (err) {
            setError('Failed to fetch buyers.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, []);

    const showSuccessMessage = (message) => {
        setSuccessMessage(message);
        setTimeout(() => setSuccessMessage(''), 3000); // Hide after 3 seconds
    };

    const handleCreate = async (buyerData) => {
        const { data } = await api.post('/fg/buyers', buyerData);
        setBuyers([...buyers, data.data]);
        showSuccessMessage(`Buyer "${data.data.name}" created successfully!`);
    };

    const handleUpdate = async (buyerData) => {
        const { data: updatedBuyer } = await api.put(`/fg/buyers/${selectedBuyer._id}`, buyerData);
        setBuyers(buyers.map(b => b._id === updatedBuyer._id ? updatedBuyer : b));
        showSuccessMessage(`Buyer "${updatedBuyer.name}" updated successfully!`);
        closeModal();
    };

    const handleDelete = async (buyerId) => {
        if (window.confirm('Are you sure you want to delete this buyer?')) {
            await api.delete(`/fg/buyers/${buyerId}`);
            setBuyers(buyers.filter(b => b._id !== buyerId));
            showSuccessMessage('Buyer deleted successfully.');
        }
    };

    const openModal = (buyer = null) => {
        setSelectedBuyer(buyer);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedBuyer(null);
        setIsModalOpen(false);
    };

    // Filter buyers based on search term
    const filteredBuyers = buyers.filter(buyer => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (buyer.name && buyer.name.toLowerCase().includes(term)) ||
            (buyer.contactPerson && buyer.contactPerson.toLowerCase().includes(term)) ||
            (buyer.gstin && buyer.gstin.toLowerCase().includes(term)) ||
            (buyer.email && buyer.email.toLowerCase().includes(term)) ||
            (buyer.city && buyer.city.toLowerCase().includes(term))
        );
    });

    if (isLoading) return <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-primary-500" size={48} /></div>;
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>;

    // --- Report Columns Configuration ---
    const reportColumns = [
        { header: 'CODE', key: 'buyerCode' },
        { header: 'Buyer Name', key: 'name' },
        { header: 'Contact Person', key: 'contactPerson' },
        { header: 'Phone', key: 'phoneNumber' },
        { header: 'GSTIN', key: 'gstin' },
        { header: 'Email', key: 'email' },
        { header: 'City', key: 'city' },
        {
            header: 'STATUS', key: 'status', render: (value) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {value}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {successMessage && <div className="p-4 bg-green-100 text-green-700 rounded-md">{successMessage}</div>}
                </div>
                <ViewReportTools
                    data={buyers}
                    title="Buyers"
                    fileName="Buyers"
                    metaDetails={{ user: 'Current User' }}
                    columns={reportColumns}
                />
            </div>

            <Card title="Add New Buyer" action={
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                    <FaPlus className="mr-2" /> Add Buyer
                </button>
            }>
                <BuyerForm onSave={handleCreate} />
            </Card>

            <Card title="All Buyers">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-light-200">
                        <thead className="bg-light-200">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-bold text-secondary-500 uppercase">CODE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">NAME</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">CONTACT PERSON</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">PHONE</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">GSTIN</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">EMAIL</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">CITY</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">STATUS</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="bg-light-100 divide-y divide-light-200">
                            {filteredBuyers.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-4 text-center text-sm text-secondary-500">
                                        No buyers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBuyers.map(buyer => (
                                    <tr key={buyer._id} className="hover:bg-light-200">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700 text-center">{buyer.buyerCode}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{buyer.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{buyer.contactPerson || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{buyer.phoneNumber || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{buyer.gstin || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{buyer.email || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{buyer.city || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${buyer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {buyer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                            <button onClick={() => openModal(buyer)} className="text-blue-500 hover:text-blue-700"><FaEdit /></button>
                                            <button onClick={() => handleDelete(buyer._id)} className="text-red-500 hover:text-red-700"><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedBuyer ? `Edit Buyer: ${selectedBuyer.name}` : "Add New Buyer"}>
                <BuyerForm onSave={handleUpdate} initialData={selectedBuyer} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default BuyerMaster;