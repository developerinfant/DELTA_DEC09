/**
 * PWA Verification Test Script
 * 
 * This script verifies that all PWA features are working correctly
 * Run this in the browser console to test PWA functionality
 */

console.log('🧪 Starting PWA Verification Tests...');

// Test 1: Service Worker Registration
console.log('📋 Test 1: Service Worker Registration');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      console.log('✅ Service Worker is registered');
      console.log('📍 Scope:', registrations[0].scope);
    } else {
      console.log('❌ Service Worker is not registered');
    }
  }).catch(error => {
    console.log('❌ Error checking Service Worker registration:', error);
  });
} else {
  console.log('❌ Service Worker is not supported');
}

// Test 2: Manifest Detection
console.log('📋 Test 2: Manifest Detection');
const manifest = document.querySelector('link[rel="manifest"]');
if (manifest) {
  console.log('✅ Web App Manifest is present');
  console.log('📍 Manifest URL:', manifest.href);
} else {
  console.log('❌ Web App Manifest is missing');
}

// Test 3: Theme Color
console.log('📋 Test 3: Theme Color');
const themeColor = document.querySelector('meta[name="theme-color"]');
if (themeColor) {
  console.log('✅ Theme color is set');
  console.log('🎨 Color:', themeColor.content);
} else {
  console.log('❌ Theme color is not set');
}

// Test 4: Viewport Meta Tag
console.log('📋 Test 4: Viewport Meta Tag');
const viewport = document.querySelector('meta[name="viewport"]');
if (viewport) {
  console.log('✅ Viewport meta tag is present');
} else {
  console.log('❌ Viewport meta tag is missing');
}

// Test 5: Offline Support
console.log('📋 Test 5: Offline Support');
console.log('🌐 Online status:', navigator.onLine);

// Test 6: IndexedDB Availability
console.log('📋 Test 6: IndexedDB Availability');
if ('indexedDB' in window) {
  console.log('✅ IndexedDB is available');
  
  // Try to open DeltaIMS database
  const request = indexedDB.open('DeltaIMS');
  request.onsuccess = function(event) {
    console.log('✅ DeltaIMS IndexedDB database is accessible');
    const db = event.target.result;
    
    // Check for object stores
    if (db.objectStoreNames.contains('pendingActions')) {
      console.log('✅ pendingActions object store exists');
    } else {
      console.log('❌ pendingActions object store is missing');
    }
    
    if (db.objectStoreNames.contains('cachedData')) {
      console.log('✅ cachedData object store exists');
    } else {
      console.log('❌ cachedData object store is missing');
    }
    
    db.close();
  };
  
  request.onerror = function(event) {
    console.log('❌ Error accessing DeltaIMS IndexedDB database:', event.target.error);
  };
} else {
  console.log('❌ IndexedDB is not available');
}

// Test 7: Push Notification Support
console.log('📋 Test 7: Push Notification Support');
if ('PushManager' in window) {
  console.log('✅ Push Notifications are supported');
} else {
  console.log('❌ Push Notifications are not supported');
}

// Test 8: Before Install Prompt Event
console.log('📋 Test 8: Before Install Prompt Event Listener');
let installPromptEvent = null;
const installPromptHandler = (e) => {
  e.preventDefault();
  installPromptEvent = e;
  console.log('✅ BeforeInstallPrompt event captured');
  window.removeEventListener('beforeinstallprompt', installPromptHandler);
};

window.addEventListener('beforeinstallprompt', installPromptHandler);

// Test 9: Display Mode
console.log('📋 Test 9: Display Mode');
if (window.matchMedia('(display-mode: standalone)').matches) {
  console.log('✅ App is running in standalone mode (installed)');
} else {
  console.log('ℹ️ App is running in browser mode (not installed)');
}

// Test 10: HTTPS
console.log('📋 Test 10: HTTPS');
if (location.protocol === 'https:') {
  console.log('✅ App is served over HTTPS');
} else {
  console.log('⚠️ App is not served over HTTPS (required for some PWA features)');
}

console.log('🧪 PWA Verification Tests Completed');
console.log('📊 Check the console output above for detailed results');

// Additional helper functions for manual testing

/**
 * Simulate offline mode
 */
function simulateOffline() {
  console.log('📡 Simulating offline mode...');
  // This is just for testing - actual offline simulation requires browser dev tools
  console.log('Use browser dev tools to test offline functionality');
}

/**
 * Test notification permission
 */
function testNotificationPermission() {
  console.log('🔔 Testing notification permission...');
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      console.log('🔔 Notification permission:', permission);
    });
  } else {
    console.log('❌ Notifications not supported');
  }
}

/**
 * Test background sync
 */
function testBackgroundSync() {
  console.log('🔄 Testing background sync...');
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('test-sync').then(() => {
        console.log('✅ Background sync registered');
      }).catch(error => {
        console.log('❌ Background sync registration failed:', error);
      });
    });
  } else {
    console.log('❌ Background sync not supported');
  }
}

// Export functions for manual testing
window.pwaTest = {
  simulateOffline,
  testNotificationPermission,
  testBackgroundSync
};

console.log('🔧 Manual testing functions available:');
console.log('- pwaTest.simulateOffline()');
console.log('- pwaTest.testNotificationPermission()');
console.log('- pwaTest.testBackgroundSync()');