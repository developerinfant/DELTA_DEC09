import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const ProtectedRoute = ({ children, moduleId, action, adminOnly = false, redirectTo = '/unauthorized' }) => {
  const { user, isLoading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  // Ensure user data is fully loaded
  useEffect(() => {
    if (!isLoading) {
      // Remove any delay that might cause race conditions
      setIsChecking(false);
    }
  }, [isLoading]);

  // Show loading state while checking auth
  if (isLoading || isChecking) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle admin-only routes
  if (adminOnly) {
    if (user.role === 'Admin') {
      return children;
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Allow all routes for Admin users (unless adminOnly is true)
  if (user.role === 'Admin' && !adminOnly) {
    return children;
  }

  // If no specific permission is required, allow access
  if (!moduleId || !action) {
    return children;
  }

  // Check if user has the required permission
  if (hasPermission(user, moduleId, action)) {
    return children;
  }

  // For regular users without permission, redirect to unauthorized page
  return <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;