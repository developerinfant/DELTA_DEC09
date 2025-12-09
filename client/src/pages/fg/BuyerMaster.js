import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
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

    // Fetch next buyer code or set existing buyer code
    useEffect(() => {
        const handleBuyerCode = async () => {
            // For new buyers (when there's no initialData or _id)
            if (!initialData || !initialData._id) {
                // Only fetch if we don't already have a buyer code
                if (!nextBuyerCode) {
                    try {
                        const response = await api.get('/fg/buyers/next-buyer-code');
                        setNextBuyerCode(response.data.nextBuyerCode);
                    } catch (err) {
                        console.error('Failed to fetch next buyer code:', err);
                        // Set a default code if fetch fails
                        setNextBuyerCode('B0001');
                    }
                }
            } else {
                // For editing, use the existing buyer code
                setNextBuyerCode(initialData.buyerCode || '');
            }
        };

        handleBuyerCode();
    }, [initialData?._id]); // Depend only on the _id to avoid infinite loops

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
            // Reset form for new buyer
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
    }, [initialData?._id]);

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

    const commonInputClass = "mt-1 block w-full px-4 py-2.5 text-[#1A1A1A] bg-[#FFFFFF] border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent transition shadow-sm";
    const sectionTitleClass = "text-lg font-semibold text-[#1A1A1A] mb-4 pb-2 border-b border-[#E7E2D8] flex items-center";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-[#FAF7F2] p-4 rounded-2xl">
                    {/* Page Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">{initialData && initialData._id ? `Edit Buyer: ${initialData.name}` : "Add New Buyer"}</h2>
                        <p className="text-[#6D6A62]">Fill in the buyer details below</p>
                    </div>
            {/* Basic Information Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white shadow-sm">
                <h3 className={sectionTitleClass}>
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="buyerCode" className="block text-sm font-medium text-dark-700 mb-1">Buyer Code</label>
                        <input
                            type="text"
                            name="buyerCode"
                            id="buyerCode"
                            value={nextBuyerCode}
                            readOnly
                            className={`${commonInputClass} bg-[#FAF7F2] cursor-not-allowed`}
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-[#1A1A1A] mb-1">Buyer Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter buyer name"
                        />
                    </div>
                    <div>
                        <label htmlFor="contactPerson" className="block text-sm font-medium text-[#1A1A1A] mb-1">Contact Person <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="contactPerson"
                            id="contactPerson"
                            value={formData.contactPerson}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter contact person name"
                        />
                    </div>
                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm font-medium text-[#1A1A1A] mb-1">Phone Number <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            id="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter phone number"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1">Email <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter email address"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-[#1A1A1A] mb-1">Address <span className="text-red-500">*</span></label>
                        <textarea
                            name="address"
                            id="address"
                            value={formData.address}
                            onChange={handleChange}
                            required
                            rows="3"
                            className={commonInputClass}
                            placeholder="Enter full address"
                        />
                    </div>
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-[#1A1A1A] mb-1">City <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="city"
                            id="city"
                            value={formData.city}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter city"
                        />
                    </div>
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-[#1A1A1A] mb-1">State <span className="text-red-500">*</span></label>
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
                        <label htmlFor="pincode" className="block text-sm font-medium text-[#1A1A1A] mb-1">Pincode <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="pincode"
                            id="pincode"
                            value={formData.pincode}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter pincode"
                        />
                    </div>
                    <div>
                        <label htmlFor="country" className="block text-sm font-medium text-[#1A1A1A] mb-1">Country</label>
                        <input
                            type="text"
                            name="country"
                            id="country"
                            value={formData.country}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter country"
                        />
                    </div>
                    {/* Display GST Type */}
                    <div>
                        <label className="block text-sm font-medium text-[#1A1A1A] mb-1">GST Type (Auto-calculated)</label>
                        <div className="mt-1 flex items-center">
                            <input
                                type="text"
                                value={calculateGstType(formData.state)}
                                readOnly
                                className={`${commonInputClass} bg-[#FAF7F2] cursor-not-allowed w-full`}
                            />
                            <div className="ml-2 text-gray-500" title="Automatically set based on state selection">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Automatically set based on state selection</p>
                    </div>
                </div>
            </div>

            {/* Tax & Business Details Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white shadow-sm">
                <h3 className={sectionTitleClass}>
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                    </svg>
                    Tax & Business Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="gstin" className="block text-sm font-medium text-[#1A1A1A] mb-1 flex items-center">
                            GSTIN
                            <svg className="w-4 h-4 ml-1 text-[#6D6A62]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" title="15-character GST identification number">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </label>
                        <input
                            type="text"
                            name="gstin"
                            id="gstin"
                            value={formData.gstin}
                            onChange={handleChange}
                            maxLength="15"
                            className={commonInputClass}
                            placeholder="Enter 15-character GSTIN"
                        />
                    </div>
                    <div>
                        <label htmlFor="panNumber" className="block text-sm font-medium text-[#1A1A1A] mb-1">PAN Number</label>
                        <input
                            type="text"
                            name="panNumber"
                            id="panNumber"
                            value={formData.panNumber}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter PAN number"
                        />
                    </div>
                    <div>
                        <label htmlFor="businessCategory" className="block text-sm font-medium text-[#1A1A1A] mb-1">Business Category</label>
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
            <div className="border border-light-300 rounded-xl p-5 bg-white shadow-sm">
                <h3 className={sectionTitleClass}>
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                    </svg>
                    Bank Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="bankName" className="block text-sm font-medium text-[#1A1A1A] mb-1">Bank Name</label>
                        <input
                            type="text"
                            name="bankName"
                            id="bankName"
                            value={formData.bankName}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter bank name"
                        />
                    </div>
                    <div>
                        <label htmlFor="branch" className="block text-sm font-medium text-[#1A1A1A] mb-1">Branch</label>
                        <input
                            type="text"
                            name="branch"
                            id="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter branch name"
                        />
                    </div>
                    <div>
                        <label htmlFor="accountNumber" className="block text-sm font-medium text-[#1A1A1A] mb-1">Account Number</label>
                        <input
                            type="text"
                            name="accountNumber"
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter account number"
                        />
                    </div>
                    <div>
                        <label htmlFor="ifscCode" className="block text-sm font-medium text-[#1A1A1A] mb-1 flex items-center">
                            IFSC Code
                            <svg className="w-4 h-4 ml-1 text-[#6D6A62]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" title="11-character code: 4 letters + 0 + 6 alphanumeric characters">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </label>
                        <input
                            type="text"
                            name="ifscCode"
                            id="ifscCode"
                            value={formData.ifscCode}
                            onChange={handleChange}
                            maxLength="11"
                            className={commonInputClass}
                            placeholder="Enter 11-character IFSC code"
                        />
                    </div>
                    <div>
                        <label htmlFor="upiId" className="block text-sm font-medium text-[#1A1A1A] mb-1">UPI ID</label>
                        <input
                            type="text"
                            name="upiId"
                            id="upiId"
                            value={formData.upiId}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter UPI ID"
                        />
                    </div>
                </div>
            </div>

            {/* Additional Information Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white shadow-sm">
                <h3 className={sectionTitleClass}>
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="transportName" className="block text-sm font-medium text-[#1A1A1A] mb-1">Transport Name</label>
                        <input
                            type="text"
                            name="transportName"
                            id="transportName"
                            value={formData.transportName}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter transport name"
                        />
                    </div>
                    <div>
                        <label htmlFor="paymentTerms" className="block text-sm font-medium text-[#1A1A1A] mb-1">Payment Terms</label>
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
                        <label htmlFor="destination" className="block text-sm font-medium text-[#1A1A1A] mb-1">Destination</label>
                        <input
                            type="text"
                            name="destination"
                            id="destination"
                            value={formData.destination}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter destination"
                        />
                    </div>
                    <div>
                        <label htmlFor="status" className="block text-sm font-medium text-[#1A1A1A] mb-1">Status</label>
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
                        <label htmlFor="notes" className="block text-sm font-medium text-[#1A1A1A] mb-1">Notes</label>
                        <textarea
                            name="notes"
                            id="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="3"
                            className={commonInputClass}
                            placeholder="Enter any additional notes"
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-start shadow-sm">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{error}</span>
                </div>
            )}
            
            <div className="flex justify-end space-x-3 pt-4">
                {onCancel && (
                    <button 
                        type="button" 
                        onClick={onCancel} 
                        className="px-5 py-2.5 bg-[#FFFFFF] text-[#1A1A1A] rounded-xl hover:bg-[#FAF7F2] transition-colors font-medium border border-[#E7E2D8] shadow-sm"
                    >
                        Cancel
                    </button>
                )}
                <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="px-6 py-2.5 text-[#1A1A1A] bg-[#F2C94C] rounded-xl hover:bg-[#e6b83a] focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:ring-offset-2 transition-all duration-300 font-medium shadow-sm hover:shadow-md disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#1A1A1A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : 'Save Buyer'}
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
            setIsLoading(true);
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
        try {
            const { data } = await api.post('/fg/buyers', buyerData);
            setBuyers([...buyers, data.data]);
            showSuccessMessage(`Buyer "${data.data.name}" created successfully!`);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create buyer.');
            setTimeout(() => setError(''), 5000); // Hide after 5 seconds
        }
    };

    const handleUpdate = async (buyerData) => {
        try {
            const { data: updatedBuyer } = await api.put(`/fg/buyers/${selectedBuyer._id}`, buyerData);
            setBuyers(buyers.map(b => b._id === updatedBuyer._id ? updatedBuyer : b));
            showSuccessMessage(`Buyer "${updatedBuyer.name}" updated successfully!`);
            closeModal();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update buyer.');
            setTimeout(() => setError(''), 5000); // Hide after 5 seconds
        }
    };

    const handleDelete = async (buyerId) => {
        if (window.confirm('Are you sure you want to delete this buyer?')) {
            try {
                await api.delete(`/fg/buyers/${buyerId}`);
                setBuyers(buyers.filter(b => b._id !== buyerId));
                showSuccessMessage('Buyer deleted successfully.');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete buyer.');
                setTimeout(() => setError(''), 5000); // Hide after 5 seconds
            }
        }
    };

    const openModal = (buyer = null) => {
        setSelectedBuyer(buyer);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setSelectedBuyer(null);
        setIsModalOpen(false);
        // Clear any error when closing modal
        setError('');
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

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-96 bg-[#FAF7F2] rounded-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F2C94C] mb-4"></div>
            <p className="text-[#6D6A62]">Loading buyers...</p>
        </div>
    );
    
    if (error) return (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 mb-6 flex items-start shadow-sm">
            <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>{error}</span>
            <button 
                onClick={() => setError('')} 
                className="ml-auto text-red-500 hover:text-red-700"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    );

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
                <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${value === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {value}
                </span>
            )
        }
    ];

    return (
        <div className="space-y-6 p-4 md:p-6 bg-[#FAF7F2] min-h-screen">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">Buyer Master</h1>
                    <p className="text-[#6D6A62] mt-1">Manage your buyer information and details</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchBuyers}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition shadow-sm"
                        title="Refresh Data"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e6b83a] transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add New Buyer
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-fadeIn flex items-start shadow-sm">
                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{successMessage}</span>
                    <button 
                        onClick={() => setSuccessMessage('')} 
                        className="ml-auto text-green-500 hover:text-green-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            )}

            {/* Search Bar */}
            <div className="bg-[#FFFFFF] rounded-xl p-4 shadow-sm border border-[#E7E2D8] mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search buyers by name, contact, GSTIN, email, or city..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-[#E7E2D8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:border-transparent bg-[#FFFFFF] text-[#1A1A1A] shadow-sm"
                        />
                    </div>
                    <div className="flex space-x-2">
                        <ViewReportTools
                            data={buyers}
                            title="Buyers"
                            fileName="Buyers"
                            metaDetails={{ user: 'Current User' }}
                            columns={reportColumns}
                        />
                    </div>
                </div>
            </div>

            {/* Add New Buyer Card */}
            <Card title="Add New Buyer" className="mb-6 bg-[#FFFFFF] border border-[#E7E2D8] rounded-xl shadow-sm">
                <BuyerForm onSave={handleCreate} />
            </Card>

            {/* All Buyers Card */}
            <Card title="All Buyers" className="bg-[#FFFFFF] border border-[#E7E2D8] rounded-xl shadow-sm">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-[#E7E2D8]">
                        <thead className="bg-[#FAF7F2]">
                            <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">CODE</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">NAME</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider hidden md:table-cell">CONTACT PERSON</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">PHONE</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider hidden lg:table-cell">GSTIN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider hidden lg:table-cell">EMAIL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">CITY</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">STATUS</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-[#6A7F3F] uppercase tracking-wider">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody className="bg-[#FFFFFF] divide-y divide-[#E7E2D8]">
                            {filteredBuyers.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-8 text-center text-sm text-[#6D6A62]">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-16 h-16 text-[#E7E2D8] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                            </svg>
                                            <p className="text-lg font-medium text-[#6D6A62]">No buyers found</p>
                                            <p className="mt-1 text-[#6D6A62]">Try adjusting your search or add a new buyer</p>
                                            <button 
                                                onClick={() => openModal()}
                                                className="mt-4 px-4 py-2 bg-[#F2C94C] text-[#1A1A1A] rounded-xl hover:bg-[#e6b83a] transition-colors flex items-center font-medium shadow-sm"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                                </svg>
                                                Add Buyer
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredBuyers.map(buyer => (
                                    <tr key={buyer._id} className="hover:bg-[#FAF7F2] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A] text-center">{buyer.buyerCode}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#1A1A1A]">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#F2C94C] flex items-center justify-center">
                                                    <span className="text-[#1A1A1A] font-medium">{buyer.name.charAt(0)}</span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-[#1A1A1A]">{buyer.name}</div>
                                                    <div className="text-sm text-[#6D6A62] md:hidden">{buyer.contactPerson || 'N/A'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] hidden md:table-cell">{buyer.contactPerson || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                                            <div className="flex items-center">
                                                <svg className="flex-shrink-0 h-4 w-4 text-[#6D6A62] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                                </svg>
                                                {buyer.phoneNumber || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] hidden lg:table-cell">{buyer.gstin || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A] hidden lg:table-cell">
                                            <div className="flex items-center">
                                                <svg className="flex-shrink-0 h-4 w-4 text-[#6D6A62] mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                                </svg>
                                                {buyer.email || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">{buyer.city || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#1A1A1A]">
                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${buyer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {buyer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-3">
                                                <button 
                                                    onClick={() => openModal(buyer)} 
                                                    className="text-[#6A7F3F] hover:text-[#1A1A1A] transition-colors p-1.5 rounded-full hover:bg-[#F2C94C]"
                                                    title="Edit Buyer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(buyer._id)} 
                                                    className="text-red-600 hover:text-red-900 transition-colors p-1.5 rounded-full hover:bg-red-50"
                                                    title="Delete Buyer"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Table Summary */}
                {filteredBuyers.length > 0 && (
                    <div className="mt-4 px-6 py-3 bg-[#FAF7F2] rounded-xl border border-[#E7E2D8] flex flex-col sm:flex-row sm:items-center sm:justify-between shadow-sm">
                        <p className="text-sm text-[#6D6A62]">
                            Showing <span className="font-medium">{filteredBuyers.length}</span> of <span className="font-medium">{buyers.length}</span> buyers
                        </p>
                        <div className="mt-2 sm:mt-0">
                            <nav className="inline-flex rounded-md shadow-sm" aria-label="Pagination">
                                <button className="relative inline-flex items-center px-3 py-1.5 rounded-l-md border border-[#E7E2D8] bg-[#FFFFFF] text-sm font-medium text-[#6D6A62] hover:bg-[#FAF7F2]">
                                    Previous
                                </button>
                                <button className="relative inline-flex items-center px-3 py-1.5 rounded-r-md border border-[#E7E2D8] bg-[#FFFFFF] text-sm font-medium text-[#6D6A62] hover:bg-[#FAF7F2]">
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedBuyer ? `Edit Buyer: ${selectedBuyer.name}` : "Add New Buyer"} className="bg-[#FFFFFF] rounded-xl shadow-lg border border-[#E7E2D8]">
                <BuyerForm onSave={handleUpdate} initialData={selectedBuyer} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default BuyerMaster;