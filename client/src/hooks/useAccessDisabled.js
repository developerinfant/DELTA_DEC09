import { useState } from 'react';

/**
 * Hook to manage access disabled modal state
 * @returns {Object} - Object containing modal state and control functions
 */
const useAccessDisabled = () => {
  const [isAccessDisabledOpen, setIsAccessDisabledOpen] = useState(false);
  const [accessDisabledMessage, setAccessDisabledMessage] = useState('');

  /**
   * Show access disabled modal
   * @param {string} message - Custom message to display
   */
  const showAccessDisabled = (message = "You don't have permission to perform this action.") => {
    setAccessDisabledMessage(message);
    setIsAccessDisabledOpen(true);
  };

  /**
   * Hide access disabled modal
   */
  const hideAccessDisabled = () => {
    setIsAccessDisabledOpen(false);
    setAccessDisabledMessage('');
  };

  return {
    isAccessDisabledOpen,
    accessDisabledMessage,
    showAccessDisabled,
    hideAccessDisabled
  };
};

export default useAccessDisabled;