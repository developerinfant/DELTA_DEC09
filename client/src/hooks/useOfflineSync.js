import { useState, useEffect } from 'react';
import offlineStorage from '../utils/offlineStorage';

// Custom hook for handling offline data synchronization
const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Load pending actions
    loadPendingActions();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending actions from storage
  const loadPendingActions = async () => {
    try {
      const actions = await offlineStorage.getPendingActions();
      setPendingActions(actions);
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  // Sync pending actions when online
  const syncPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;
    
    setIsSyncing(true);
    
    try {
      // In a real implementation, this would:
      // 1. Iterate through pending actions
      // 2. Send them to the server
      // 3. Remove successfully synced actions
      // 4. Handle errors for failed actions
      
      // For now, we'll just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear pending actions after sync
      await offlineStorage.clearPendingActions();
      setPendingActions([]);
      
      console.log('Successfully synced all pending actions');
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add a pending action
  const addPendingAction = async (action) => {
    try {
      const id = await offlineStorage.addPendingAction(action);
      await loadPendingActions(); // Refresh the list
      return id;
    } catch (error) {
      console.error('Error adding pending action:', error);
      throw error;
    }
  };

  // Remove a pending action
  const removePendingAction = async (id) => {
    try {
      await offlineStorage.removePendingAction(id);
      await loadPendingActions(); // Refresh the list
    } catch (error) {
      console.error('Error removing pending action:', error);
      throw error;
    }
  };

  // Trigger background sync
  const triggerBackgroundSync = async () => {
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-pending-actions');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  };

  return {
    isOnline,
    pendingActions,
    isSyncing,
    syncPendingActions,
    addPendingAction,
    removePendingAction,
    triggerBackgroundSync
  };
};

export default useOfflineSync;