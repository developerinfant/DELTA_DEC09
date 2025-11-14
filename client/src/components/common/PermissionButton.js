import React from 'react';
import useAccessControl from '../../hooks/useAccessControl';
import useAccessDisabled from '../../hooks/useAccessDisabled';

/**
 * A button component that automatically handles permission checking and access control
 * @param {Object} props - Component props
 * @param {string} props.moduleId - The module ID to check permissions for
 * @param {string} props.action - The action to check permissions for
 * @param {Function} props.onClick - The click handler function
 * @param {string} props.children - The button content
 * @param {string} props.accessDeniedMessage - Custom message for access denied
 * @param {Object} props.buttonProps - Additional props to pass to the button element
 */
const PermissionButton = ({ 
  moduleId, 
  action, 
  onClick, 
  children, 
  accessDeniedMessage,
  ...buttonProps 
}) => {
  const { checkPermission, isDisabled, getOpacityClass, isActionVisibleButDisabled } = useAccessControl();
  const { showAccessDisabled } = useAccessDisabled();
  
  const hasPermission = checkPermission(moduleId, action);
  const disabled = isDisabled(moduleId, action);
  const opacityClass = getOpacityClass(moduleId, action);
  const isVisibleButDisabled = isActionVisibleButDisabled(moduleId, action);
  
  const handleClick = (e) => {
    if (!hasPermission) {
      const message = accessDeniedMessage || "You don't have permission to perform this action.";
      showAccessDisabled(message);
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled}
      className={`${buttonProps.className || ''} ${opacityClass} ${disabled ? 'cursor-not-allowed' : ''} flex items-center`}
    >
      {children}
      {isVisibleButDisabled && (
        <span className="ml-2 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </span>
      )}
    </button>
  );
};

export default PermissionButton;