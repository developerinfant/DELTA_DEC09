import React from 'react';
import { FaLock } from 'react-icons/fa';
import useAccessControl from '../../hooks/useAccessControl';
import useAccessDisabled from '../../hooks/useAccessDisabled';

/**
 * A component that displays an action with appropriate styling based on permissions.
 * If the user doesn't have permission, it shows a lock icon and is disabled.
 * @param {Object} props - Component props
 * @param {string} props.moduleId - The module ID to check permissions for
 * @param {string} props.action - The action to check permissions for
 * @param {Function} props.onClick - The click handler function
 * @param {string} props.children - The button content
 * @param {string} props.accessDeniedMessage - Custom message for access denied
 * @param {Object} props.buttonProps - Additional props to pass to the button element
 * @param {string} props.lockPosition - Position of the lock icon ('left', 'right', 'replace')
 * @returns {JSX.Element} - The permission action component
 */
const PermissionAction = ({ 
  moduleId, 
  action, 
  onClick, 
  children, 
  accessDeniedMessage,
  buttonProps = {},
  lockPosition = 'right', // 'left', 'right', or 'replace'
  ...props 
}) => {
  const { checkPermission, isDisabled, getOpacityClass } = useAccessControl();
  const { showAccessDisabled } = useAccessDisabled();
  
  const hasPermission = checkPermission(moduleId, action);
  const disabled = isDisabled(moduleId, action);
  const opacityClass = getOpacityClass(moduleId, action);
  
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
  
  // If user doesn't have permission and lockPosition is 'replace', show only the lock icon
  if (!hasPermission && lockPosition === 'replace') {
    return (
      <button
        {...buttonProps}
        onClick={handleClick}
        disabled={disabled}
        className={`${buttonProps.className || ''} ${opacityClass} ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
        title={accessDeniedMessage || "You don't have permission to perform this action."}
      >
        <FaLock />
      </button>
    );
  }
  
  // For other cases, show the content with optional lock icon
  return (
    <button
      {...buttonProps}
      onClick={handleClick}
      disabled={disabled}
      className={`${buttonProps.className || ''} ${opacityClass} ${disabled ? 'cursor-not-allowed' : ''} flex items-center`}
    >
      {!hasPermission && lockPosition === 'left' && <FaLock className="mr-2" />}
      {children}
      {!hasPermission && lockPosition === 'right' && <FaLock className="ml-2" />}
    </button>
  );
};

export default PermissionAction;