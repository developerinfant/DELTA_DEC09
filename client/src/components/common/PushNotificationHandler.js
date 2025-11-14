import React, { useEffect } from 'react';
import usePWA from '../../hooks/usePWA';

const PushNotificationHandler = () => {
  const { 
    supportsPWA, 
    subscribeToPush,
    sendNotification
  } = usePWA();

  useEffect(() => {
    // Request notification permission and subscribe to push notifications
    const initPushNotifications = async () => {
      if (!supportsPWA) return;
      
      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      }
      
      // Subscribe to push notifications
      await subscribeToPush();
    };
    
    initPushNotifications();
  }, [supportsPWA, subscribeToPush]);

  // Function to trigger a test notification
  const triggerTestNotification = () => {
    sendNotification('Test Notification', {
      body: 'This is a test notification from Delta IMS',
      icon: '/logo192.png'
    });
  };

  return null; // This component doesn't render anything visible
};

export default PushNotificationHandler;