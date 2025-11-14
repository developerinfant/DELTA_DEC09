import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaSpinner } from 'react-icons/fa';

const ProtectedRoute = ({ adminOnly, children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // While checking for a user, you can show a loading indicator.
        return (
            <div className="flex justify-center items-center h-screen">
                <FaSpinner className="animate-spin text-accent-500" size={48} />
            </div>
        );
    }

    if (!user) {
        // If loading is finished and there's no user, redirect to login.
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && user.role !== 'Admin') {
        // If this is an admin-only route and the user is not an admin,
        // redirect them back to the main dashboard.
        return <Navigate to="/" replace />;
    }

    // If all checks pass, render the child components.
    // This allows ProtectedRoute to wrap other components directly.
    return children || <Outlet />;
};

export default ProtectedRoute;