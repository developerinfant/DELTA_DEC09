// Utility functions for offline data storage using IndexedDB
class OfflineStorage {
  constructor() {
    this.dbName = 'DeltaIMS';
    this.version = 1;
    this.db = null;
  }

  // Initialize the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => {
        console.error('Failed to open IndexedDB');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for different types of data
        if (!db.objectStoreNames.contains('pendingActions')) {
          const store = db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('cachedData')) {
          const store = db.createObjectStore('cachedData', { keyPath: 'id' });
          store.createIndex('endpoint', 'endpoint', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Add a pending action to be synced later
  async addPendingAction(action) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const actionData = {
        ...action,
        timestamp: Date.now()
      };
      
      const request = store.add(actionData);
      
      request.onsuccess = () => {
        console.log('Pending action added:', actionData);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to add pending action');
        reject(request.error);
      };
    });
  }

  // Get all pending actions
  async getPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readonly');
      const store = transaction.objectStore('pendingActions');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Remove a pending action after successful sync
  async removePendingAction(id) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('Pending action removed:', id);
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to remove pending action');
        reject(request.error);
      };
    });
  }

  // Clear all pending actions
  async clearPendingActions() {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['pendingActions'], 'readwrite');
      const store = transaction.objectStore('pendingActions');
      
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All pending actions cleared');
        resolve();
      };
      
      request.onerror = () => {
        console.error('Failed to clear pending actions');
        reject(request.error);
      };
    });
  }

  // Cache API response data
  async cacheData(endpoint, data) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      
      const cacheData = {
        id: endpoint,
        endpoint,
        data,
        timestamp: Date.now()
      };
      
      const request = store.put(cacheData);
      
      request.onsuccess = () => {
        console.log('Data cached for endpoint:', endpoint);
        resolve(request.result);
      };
      
      request.onerror = () => {
        console.error('Failed to cache data');
        reject(request.error);
      };
    });
  }

  // Get cached data for an endpoint
  async getCachedData(endpoint) {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readonly');
      const store = transaction.objectStore('cachedData');
      
      const request = store.get(endpoint);
      
      request.onsuccess = () => {
        resolve(request.result ? request.result.data : null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Clear old cached data
  async clearOldCache(maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['cachedData'], 'readwrite');
      const store = transaction.objectStore('cachedData');
      
      const request = store.index('timestamp').openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const age = Date.now() - cursor.value.timestamp;
          if (age > maxAge) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          console.log('Old cache cleared');
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  }
}

// Export a singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;