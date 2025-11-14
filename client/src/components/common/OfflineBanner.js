import React from 'react';
import usePWA from '../../hooks/usePWA';

const OfflineBanner = () => {
  const { isOnline, showOfflineBanner } = usePWA();
  
  if (isOnline || !showOfflineBanner) {
    return null;
  }
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50 shadow-md animate-fadeIn">
      <div className="container mx-auto px-4 flex items-center justify-center">
        <span className="mr-2">🟡</span>
        <span>Working Offline - Changes will sync when you're back online</span>
      </div>
    </div>
  );
};

export default OfflineBanner;