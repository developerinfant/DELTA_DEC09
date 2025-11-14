import React from 'react';
import { PermissionGuard } from '../../utils/permissions';
import { FaLock, FaCheck } from 'react-icons/fa';

/**
 * Test component to verify permission system
 * @param {Object} props - Component props
 * @param {Object} props.user - User object with permissions
 * @param {string} props.moduleId - Module ID to test
 * @param {string} props.action - Action to test
 * @returns {JSX.Element} - Test component
 */
const PermissionTestComponent = ({ user, moduleId, action }) => {
  return (
    <div className="p-4 border rounded-lg mb-4">
      <h3 className="text-lg font-semibold mb-2">Permission Test</h3>
      <div className="flex items-center space-x-2">
        <span className="font-medium">Module:</span>
        <span>{moduleId}</span>
      </div>
      <div className="flex items-center space-x-2">
        <span className="font-medium">Action:</span>
        <span>{action}</span>
      </div>
      
      <PermissionGuard 
        user={user} 
        moduleId={moduleId} 
        action={action}
        fallback={
          <div className="mt-2 flex items-center text-red-600">
            <FaLock className="mr-2" />
            <span>Access Denied</span>
          </div>
        }
      >
        <div className="mt-2 flex items-center text-green-600">
          <FaCheck className="mr-2" />
          <span>Access Granted</span>
        </div>
      </PermissionGuard>
    </div>
  );
};

export default PermissionTestComponent;