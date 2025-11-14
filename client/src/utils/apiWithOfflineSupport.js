import api from '../api';
import offlineStorage from './offlineStorage';

// Wrapper for API calls with offline support
class ApiWithOfflineSupport {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupOnlineStatusListener();
  }

  // Setup listener for online/offline status changes
  setupOnlineStatusListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('App is now online');
      // Trigger sync of pending actions
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('App is now offline');
    });
  }

  // Generic API call with offline support
  async call(method, url, data = null, options = {}) {
    // If online, make the API call normally
    if (this.isOnline) {
      try {
        const config = {
          method,
          url,
          ...options
        };
        
        if (data) {
          config.data = data;
        }
        
        const response = await api(config);
        
        // Cache successful GET requests
        if (method === 'GET') {
          await offlineStorage.cacheData(url, response.data);
        }
        
        return response;
      } catch (error) {
        // If it's a GET request and we get an error, try to return cached data
        if (method === 'GET') {
          try {
            const cachedData = await offlineStorage.getCachedData(url);
            if (cachedData) {
              console.log('Returning cached data for:', url);
              return { data: cachedData, status: 200, fromCache: true };
            }
          } catch (cacheError) {
            console.error('Error retrieving cached data:', cacheError);
          }
        }
        
        throw error;
      }
    } else {
      // If offline, handle based on request type
      if (method === 'GET') {
        // For GET requests, try to return cached data
        try {
          const cachedData = await offlineStorage.getCachedData(url);
          if (cachedData) {
            console.log('Returning cached data for:', url);
            return { data: cachedData, status: 200, fromCache: true };
          } else {
            throw new Error('No cached data available and app is offline');
          }
        } catch (error) {
          throw new Error('No cached data available and app is offline');
        }
      } else {
        // For POST/PUT/DELETE requests, store action for later sync
        const action = {
          type: 'pendingAction',
          method,
          url,
          data,
          timestamp: Date.now(),
          options
        };
        
        try {
          await offlineStorage.addPendingAction(action);
          return { 
            data: { message: 'Action queued for sync when online' }, 
            status: 202, 
            queued: true 
          };
        } catch (error) {
          throw new Error('Failed to queue action for offline sync');
        }
      }
    }
  }

  // GET request
  async get(url, options = {}) {
    return this.call('GET', url, null, options);
  }

  // POST request
  async post(url, data, options = {}) {
    return this.call('POST', url, data, options);
  }

  // PUT request
  async put(url, data, options = {}) {
    return this.call('PUT', url, data, options);
  }

  // DELETE request
  async delete(url, options = {}) {
    return this.call('DELETE', url, null, options);
  }

  // Sync pending actions when coming back online
  async syncPendingActions() {
    if (!this.isOnline) return;
    
    try {
      const pendingActions = await offlineStorage.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          const config = {
            method: action.method,
            url: action.url,
            ...action.options
          };
          
          if (action.data) {
            config.data = action.data;
          }
          
          // Make the API call
          await api(config);
          
          // If successful, remove from pending actions
          await offlineStorage.removePendingAction(action.id);
          
          console.log('Successfully synced action:', action);
        } catch (error) {
          console.error('Failed to sync action:', action, error);
          // Keep the action in the queue for next sync attempt
        }
      }
    } catch (error) {
      console.error('Error syncing pending actions:', error);
    }
  }

  // Delivery Challan Methods
  async createDeliveryChallan(data) {
    return this.post('/delivery-challan', data);
  }

  async getDeliveryChallans(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/delivery-challan${queryString ? `?${queryString}` : ''}`;
    return this.get(url);
  }

  async getDeliveryChallanById(id) {
    return this.get(`/delivery-challan/${id}`);
  }

  // Update a delivery challan
  async updateDeliveryChallan(id, data) {
    return this.put(`/delivery-challan/${id}`, data);
  }

  // Create GRN from Delivery Challan
  async createGRNFromDeliveryChallan(data) {
    return this.post('/grn/from-dc', data);
  }

  // Supplier Methods
  async getSuppliers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/suppliers${queryString ? `?${queryString}` : ''}`;
    return this.get(url);
  }

  async getJobberSuppliers(type) {
    return this.get(`/suppliers/jobber/${type}`);
  }

  // Trigger background sync for pending actions
  async triggerBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-pending-actions');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Failed to register background sync:', error);
      }
    }
  }
}

// Export a singleton instance
const apiWithOfflineSupport = new ApiWithOfflineSupport();
export default apiWithOfflineSupport;