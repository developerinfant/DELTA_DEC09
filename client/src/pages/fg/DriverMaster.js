import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

// Driver Form Component (for both creating and editing)
const DriverForm = ({ onSave, initialData = {}, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        transportName: '',
        vehicleNo: '',
        vehicleType: '',
        phone: '',
        destination: '',
        notes: '',
        status: 'Active'
    });
    
    const [nextDriverCode, setNextDriverCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Fetch next driver code
    useEffect(() => {
        const fetchNextDriverCode = async () => {
            try {
                const response = await api.get('/fg/drivers/next-driver-code');
                setNextDriverCode(response.data.nextDriverCode);
            } catch (err) {
                console.error('Error fetching next driver code:', err);
            }
        };

        fetchNextDriverCode();
    }, []);

    // Populate form when editing a driver
    useEffect(() => {
        if (initialData && initialData._id) {
            setFormData({
                name: initialData.name || '',
                transportName: initialData.transportName || '',
                vehicleNo: initialData.vehicleNo || '',
                vehicleType: initialData.vehicleType || '',
                phone: initialData.phone || '',
                destination: initialData.destination || '',
                notes: initialData.notes || '',
                status: initialData.status || 'Active'
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.name) {
            setError('Driver Name is required');
            return;
        }

        setIsLoading(true);
        try {
            await onSave(formData);
            onCancel(); // Close the modal after successful save
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred while saving the driver');
        } finally {
            setIsLoading(false);
        }
    };

    const commonInputClass = "mt-1 block w-full px-4 py-2.5 text-dark-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition";
    const sectionTitleClass = "text-lg font-semibold text-dark-800 mb-4 pb-2 border-b border-light-300 flex items-center";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="border border-light-300 rounded-xl p-5 bg-white shadow-sm">
                <h3 className={sectionTitleClass}>
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Driver Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label htmlFor="driverCode" className="block text-sm font-medium text-dark-700 mb-1">Driver Code</label>
                        <input
                            type="text"
                            name="driverCode"
                            id="driverCode"
                            value={nextDriverCode}
                            readOnly
                            className={`${commonInputClass} bg-gray-50 cursor-not-allowed`}
                        />
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-dark-700 mb-1">Driver Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className={commonInputClass}
                            placeholder="Enter driver name"
                        />
                    </div>
                    <div>
                        <label htmlFor="transportName" className="block text-sm font-medium text-dark-700 mb-1">Transport Name</label>
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
                        <label htmlFor="vehicleNo" className="block text-sm font-medium text-dark-700 mb-1">Vehicle No</label>
                        <input
                            type="text"
                            name="vehicleNo"
                            id="vehicleNo"
                            value={formData.vehicleNo}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter vehicle number"
                        />
                    </div>
                    <div>
                        <label htmlFor="vehicleType" className="block text-sm font-medium text-dark-700 mb-1">Vehicle Type</label>
                        <input
                            type="text"
                            name="vehicleType"
                            id="vehicleType"
                            value={formData.vehicleType}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter vehicle type"
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-dark-700 mb-1">Driver Phone</label>
                        <input
                            type="text"
                            name="phone"
                            id="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className={commonInputClass}
                            placeholder="Enter driver phone"
                        />
                    </div>
                    <div>
                        <label htmlFor="destination" className="block text-sm font-medium text-dark-700 mb-1">Destination</label>
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
                        <label htmlFor="status" className="block text-sm font-medium text-dark-700 mb-1">Status</label>
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
                </div>
                
                <div className="mt-5">
                    <label htmlFor="notes" className="block text-sm font-medium text-dark-700 mb-1">Additional Notes</label>
                    <textarea
                        name="notes"
                        id="notes"
                        rows="3"
                        value={formData.notes}
                        onChange={handleChange}
                        className={commonInputClass}
                        placeholder="Enter any additional notes"
                    ></textarea>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 text-sm font-medium text-dark-700 bg-light-200 rounded-lg hover:bg-light-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 transition"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                        </>
                    ) : 'Save Driver'}
                </button>
            </div>
        </form>
    );
};

const DriverMaster = () => {
    const [drivers, setDrivers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchDrivers = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/fg/drivers');
            setDrivers(data);
        } catch (err) {
            setError('Failed to fetch drivers.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleCreate = async (driverData) => {
        try {
            const response = await api.post('/fg/drivers', driverData);
            setSuccessMessage(response.data.message);
            fetchDrivers(); // Refresh the list
            return response.data;
        } catch (err) {
            throw err;
        }
    };

    const handleUpdate = async (driverData) => {
        try {
            const response = await api.put(`/fg/drivers/${selectedDriver._id}`, driverData);
            setSuccessMessage(response.data.message);
            fetchDrivers(); // Refresh the list
            return response.data;
        } catch (err) {
            throw err;
        }
    };

    const handleDelete = async (driverId) => {
        if (window.confirm('Are you sure you want to delete this driver?')) {
            try {
                const response = await api.delete(`/fg/drivers/${driverId}`);
                setSuccessMessage(response.data.message);
                fetchDrivers(); // Refresh the list
            } catch (err) {
                setError('Failed to delete driver.');
            }
        }
    };

    const openCreateModal = () => {
        setSelectedDriver(null);
        setIsModalOpen(true);
    };

    const openEditModal = (driver) => {
        setSelectedDriver(driver);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDriver(null);
    };

    // Filter drivers based on search term
    const filteredDrivers = drivers.filter(driver => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (driver.name && driver.name.toLowerCase().includes(term)) ||
            (driver.transportName && driver.transportName.toLowerCase().includes(term)) ||
            (driver.vehicleNo && driver.vehicleNo.toLowerCase().includes(term)) ||
            (driver.phone && driver.phone.toLowerCase().includes(term)) ||
            (driver.driverCode && driver.driverCode.toLowerCase().includes(term))
        );
    });

    // Dismiss success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const reportColumns = [
        { header: 'Driver Code', accessor: 'driverCode' },
        { header: 'Driver Name', accessor: 'name' },
        { header: 'Transport Name', accessor: 'transportName' },
        { header: 'Vehicle No', accessor: 'vehicleNo' },
        { header: 'Vehicle Type', accessor: 'vehicleType' },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Destination', accessor: 'destination' },
        { header: 'Status', accessor: 'status' }
    ];

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Success Message */}
            {successMessage && (
                <div className="rounded-lg bg-green-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">{successMessage}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <div className="-mx-1.5 -my-1.5">
                                <button
                                    onClick={() => setSuccessMessage('')}
                                    className="inline-flex rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                                >
                                    <span className="sr-only">Dismiss</span>
                                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="rounded-lg bg-red-50 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">{error}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-dark-800">Driver Master</h1>
                    <p className="text-gray-600 mt-1">Manage your driver information and details</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={fetchDrivers}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                        title="Refresh Data"
                    >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Add New Driver
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="relative flex-grow max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search drivers by name, transport, vehicle no, phone, or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>
            </div>

            {/* Add New Driver Card */}
            <Card title="Add New Driver" className="mb-6">
                <DriverForm onSave={handleCreate} />
            </Card>

            {/* All Drivers Card */}
            <Card title="All Drivers">
                <div className="overflow-x-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="text-center">
                                <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-2 text-sm text-gray-500">Loading drivers...</p>
                            </div>
                        </div>
                    ) : filteredDrivers.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No drivers found</h3>
                            <p className="mt-1 text-sm text-gray-500">Get started by adding a new driver.</p>
                            <div className="mt-6">
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                                >
                                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Add New Driver
                                </button>
                            </div>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-light-200">
                            <thead className="bg-light-200">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">DRIVER CODE</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">DRIVER NAME</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">TRANSPORT NAME</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">VEHICLE NO</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">PHONE</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-secondary-500 uppercase tracking-wider">STATUS</th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-bold text-secondary-500 uppercase tracking-wider">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-light-200">
                                {filteredDrivers.map((driver) => (
                                    <tr key={driver._id} className="hover:bg-light-100">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-dark-700">{driver.driverCode}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{driver.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{driver.transportName || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{driver.vehicleNo || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-700">{driver.phone || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                driver.status === 'Active' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : 'bg-red-100 text-red-800'
                                            }`}>
                                                {driver.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => openEditModal(driver)}
                                                    className="text-primary-600 hover:text-primary-900 p-1 rounded-md hover:bg-light-200"
                                                    title="Edit Driver"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(driver._id)}
                                                    className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-light-200"
                                                    title="Delete Driver"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Pagination Info */}
                {!isLoading && filteredDrivers.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-light-300 px-6 py-4">
                        <p className="text-sm text-gray-600">
                            Showing <span className="font-medium">{filteredDrivers.length}</span> of <span className="font-medium">{drivers.length}</span> drivers
                        </p>
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={selectedDriver ? `Edit Driver: ${selectedDriver.name}` : "Add New Driver"}>
                <DriverForm onSave={selectedDriver ? handleUpdate : handleCreate} initialData={selectedDriver} onCancel={closeModal} />
            </Modal>
        </div>
    );
};

export default DriverMaster;