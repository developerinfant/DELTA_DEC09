import React, { useState, useEffect } from 'react';
import api from '../../api';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';

const ManagerDetails = ({ manager, onManagerAction }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState({ ...manager });
    const [updatePassword, setUpdatePassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [updateError, setUpdateError] = useState('');
    const [updateSuccess, setUpdateSuccess] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showUpdateForm, setShowUpdateForm] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const handleDetailsChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        setUpdateError('');
        setUpdateSuccess('');
        try {
            const { data } = await api.put(`/managers/${manager._id}`, editFormData);
            onManagerAction({ type: 'UPDATE', payload: data });
            setUpdateSuccess('Details updated successfully!');
            setIsEditing(false);
        } catch (err) {
            setUpdateError('Failed to update details.');
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setUpdateError('');
        setUpdateSuccess('');

        if (updatePassword !== confirmPassword) {
            setUpdateError('Passwords do not match.');
            return;
        }
        if (updatePassword.length < 6) {
            setUpdateError('Password must be at least 6 characters long.');
            return;
        }

        setIsUpdating(true);
        try {
            await api.put(`/managers/${manager._id}`, { password: updatePassword });
            setUpdateSuccess('Password updated successfully!');
            setUpdatePassword('');
            setConfirmPassword('');
            setShowUpdateForm(false);
        } catch (err) {
            setUpdateError('Failed to update password.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/managers/${manager._id}`);
            onManagerAction({ type: 'DELETE', payload: manager._id });
            setIsDeleteModalOpen(false);
        } catch (err) {
            alert('Failed to delete manager.');
        }
    };

    return (
        <Card>
            {!isEditing ? (
                <div className="space-y-2">
                    <p><strong>Name:</strong> {manager.name}</p>
                    <p><strong>Username:</strong> {manager.username}</p>
                    <p><strong>Email:</strong> {manager.email}</p>
                    <p><strong>Phone No:</strong> {manager.phone || 'N/A'}</p>
                </div>
            ) : (
                <form onSubmit={handleUpdateDetails} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" name="name" value={editFormData.name} onChange={handleDetailsChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={editFormData.username} onChange={handleDetailsChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" name="email" value={editFormData.email} onChange={handleDetailsChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone No.</label>
                        <input type="text" name="phone" value={editFormData.phone} onChange={handleDetailsChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div className="text-right">
                        <button type="submit" disabled={isUpdating} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600">
                            {isUpdating ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex justify-end space-x-2 mt-4">
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="py-2 px-4 text-sm font-medium rounded-md text-white bg-gray-500 hover:bg-gray-600"
                >
                    {isEditing ? 'Cancel' : 'Edit Details'}
                </button>
                <button
                    onClick={() => setShowUpdateForm(!showUpdateForm)}
                    className="py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
                >
                    {showUpdateForm ? 'Cancel' : 'Update Password'}
                </button>
                <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="py-2 px-4 text-sm font-medium rounded-md text-white bg-red-500 hover:bg-red-600"
                >
                    Delete
                </button>
            </div>

            {showUpdateForm && (
                <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Update Password for {manager.name}</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">New Password</label>
                        <input
                            type="password"
                            value={updatePassword}
                            onChange={(e) => setUpdatePassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                            required
                        />
                    </div>
                    {updateError && <p className="text-red-500 text-sm">{updateError}</p>}
                    {updateSuccess && <p className="text-green-500 text-sm">{updateSuccess}</p>}
                    <div className="text-right">
                        <button
                            type="submit"
                            disabled={isUpdating}
                            className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300"
                        >
                            {isUpdating ? 'Updating...' : 'Confirm Update'}
                        </button>
                    </div>
                </form>
            )}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion">
                <p>Are you sure you want to delete the manager "{manager.name}"?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn-secondary">No, Cancel</button>
                    <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Yes, Delete</button>
                </div>
            </Modal>
        </Card>
    );
};

const CreateManager = () => {
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', phone: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [managers, setManagers] = useState([]);

    const fetchManagers = async () => {
        try {
            const { data } = await api.get('/managers');
            setManagers(data);
        } catch (err) {
            console.error("Failed to fetch managers", err);
        }
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            await api.post('/managers', formData);
            setSuccess(`Manager account for "${formData.name}" created successfully!`);
            setFormData({ name: '', username: '', email: '', password: '', phone: '' });
            fetchManagers();
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to create manager account.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleManagerAction = ({ type, payload }) => {
        if (type === 'DELETE') {
            setManagers(managers.filter(m => m._id !== payload));
        }
        if (type === 'UPDATE') {
            setManagers(managers.map(m => m._id === payload._id ? payload : m));
        }
    };

    return (
        <div className="container mx-auto">
            <h1 className="text-3xl font-bold text-dark-700 mb-6">Create New Manager</h1>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Form fields */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email Address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone No. (Optional)</label>
                        <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength="6" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    {success && <p className="text-green-500 text-sm">{success}</p>}

                    <div className="text-right">
                        <button type="submit" disabled={isLoading} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300">
                            {isLoading ? 'Creating...' : 'Create Manager'}
                        </button>
                    </div>
                </form>
            </Card>

            <div className="mt-8">
                <h2 className="text-2xl font-bold text-dark-700 mb-4">Existing Managers</h2>
                <div className="space-y-4">
                    {managers.map(manager => (
                        <ManagerDetails key={manager._id} manager={manager} onManagerAction={handleManagerAction} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CreateManager;