import { useState, useEffect, useCallback } from 'react';

// Custom hook for PWA functionality
export default function usePWA() {
  console.log('usePWA hook called');
  
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [subscription, setSubscription] = useState(null);

  // Memoize the registerServiceWorker function to prevent infinite re-renders
  const registerServiceWorker = useCallback(() => {
    console.log('registerServiceWorker function called');
    // Only register if service worker is supported and not already registered
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  // Memoize the subscribeToPush function to prevent infinite re-renders
  const subscribeToPush = useCallback(async () => {
    console.log('subscribeToPush function called');
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications not supported');
      return null;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if we already have a subscription
      let sub = await registration.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        return sub;
      }
      
      // Subscribe to push notifications
      // In a real app, you would get the public key from your server
      const publicKey = 'YOUR_PUBLIC_VAPID_KEY_HERE'; // Replace with actual public key
      
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      
      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('usePWA useEffect running');
    
    // Check if app is running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        window.navigator.standalone || 
                        document.referrer.includes('android-app://');
    
    // Set PWA support status
    setSupportsPWA('serviceWorker' in navigator && 'PushManager' in window);
    
    // Listen for install prompt event
    const handler = (e) => {
      e.preventDefault();
      console.log('Install Prompt fired');
      setPromptInstall(e);
    };
    
    window.addEventListener('beforeinstallprompt', handler);
    
    // Handle online/offline status
    const handleOnline = () => {
      console.log('App is now online');
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    
    const handleOffline = () => {
      console.log('App is now offline');
      setIsOnline(false);
      setShowOfflineBanner(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Register service worker and get subscription
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        // Get existing subscription
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
    
    // Auto-hide offline banner after 5 seconds
    let hideBannerTimeout;
    if (showOfflineBanner) {
      hideBannerTimeout = setTimeout(() => {
        setShowOfflineBanner(false);
      }, 5000);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideBannerTimeout) clearTimeout(hideBannerTimeout);
    };
  }, [showOfflineBanner]);

  // Function to trigger install prompt
  const installPWA = useCallback(() => {
    console.log('installPWA function called');
    if (!promptInstall) return;
    
    promptInstall.prompt();
    
    promptInstall.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setPromptInstall(null);
    });
  }, [promptInstall]);

  // Function to send push notification
  const sendNotification = useCallback((title, options) => {
    console.log('sendNotification function called');
    if (!supportsPWA) return;
    
    // Check if notification permission is granted
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, options);
        }
      });
    }
  }, [supportsPWA]);

  // Helper function to convert base64 to UInt8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const result = {
    supportsPWA,
    promptInstall,
    installPWA,
    isOnline,
    showOfflineBanner,
    registerServiceWorker,
    sendNotification,
    subscription,
    subscribeToPush
  };
  
  console.log('usePWA returning:', result);
  return result;
};