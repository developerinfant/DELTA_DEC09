import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';

const ConditionalRoute = ({ children, moduleId, action }) => {
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

  // If no user, redirect to login (handled by main ProtectedRoute, but added for clarity)
  if (!user) {
    return null;
  }

  // Allow all routes for Admin users
  if (user.role === 'Admin') {
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

  // If user doesn't have permission, don't render anything (hide the route)
  return null;
};

export default ConditionalRoute;