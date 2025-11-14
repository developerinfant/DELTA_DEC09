# Delta IMS Progressive Web App (PWA)

This document describes the PWA features implemented in the Delta IMS application.

## Features Implemented

### 1. Core PWA Functionality
- **Manifest File**: Complete Web App Manifest with all required properties
- **Service Worker**: Workbox-based service worker for caching and offline support
- **Installable**: App can be installed on desktop and mobile devices
- **HTTPS**: All resources served over secure connections

### 2. Offline Support
- **Asset Caching**: Core application assets cached for offline access
- **API Caching**: Stale-while-revalidate strategy for API endpoints
- **Offline Fallback**: Dedicated offline page when network is unavailable
- **Background Sync**: Pending actions synced when connection is restored

### 3. Responsive Design
- **Mobile-First**: Fully responsive layout optimized for all screen sizes
- **Table to Card Conversion**: Tables automatically convert to card layouts on mobile
- **Touch-Friendly**: All interactive elements sized appropriately for touch
- **Performance Optimized**: Fast loading and smooth animations

### 4. Push Notifications
- **Web Push API**: Integration with browser push notification system
- **Low Stock Alerts**: Automatic notifications for stock level warnings
- **GRN Approvals**: Notifications for Goods Received Note approvals
- **Job Work Completions**: Alerts when job work is completed

### 5. Performance Optimization
- **Code Splitting**: Dynamic imports for efficient loading
- **Asset Compression**: All assets optimized for fast delivery
- **Caching Strategies**: Intelligent caching for optimal performance
- **Lighthouse Score**: Targeting 90+ score on all PWA metrics

## Technical Implementation

### Service Worker
The service worker uses Workbox libraries for robust caching strategies:
- **Precaching**: Core application assets pre-cached during installation
- **Runtime Caching**: API requests cached with stale-while-revalidate strategy
- **Background Sync**: Failed requests queued and synced when online
- **Push Notifications**: Handling of incoming push messages

### Offline Data Handling
- **IndexedDB Storage**: Offline data stored in browser's IndexedDB
- **Pending Actions Queue**: User actions stored locally when offline
- **Automatic Sync**: Pending actions automatically synced when online
- **Conflict Resolution**: Smart handling of data conflicts during sync

### Responsive UI Components
- **Card-Based Layout**: Modern card-based design for all modules
- **Mobile Pagination**: Pagination controls optimized for touch
- **Sticky Action Bars**: Bottom action bars for easy access on mobile
- **Skeleton Loaders**: Smooth loading states for better UX

## Installation

### Desktop
1. Open the application in a supported browser (Chrome, Edge, Firefox)
2. Look for the install prompt in the address bar or menu
3. Click "Install" to add the app to your desktop

### Mobile
1. Open the application in a supported mobile browser
2. Look for the install prompt at the bottom of the screen
3. Click "Add to Home Screen" to install the app

## Testing

### Lighthouse PWA Audit
To run a PWA audit:
1. Open Chrome DevTools
2. Go to the "Lighthouse" tab
3. Select "Progressive Web App" category
4. Run the audit

### Offline Testing
To test offline functionality:
1. Open Chrome DevTools
2. Go to the "Application" tab
3. Check "Offline" in the Service Workers section
4. Refresh the page to see offline behavior

### Installation Testing
To test installation:
1. Open the application in a supported browser
2. Look for the install prompt
3. Complete the installation process
4. Verify the app works when launched from the desktop/mobile

## Modules with Offline Support

All modules maintain full functionality when offline:
- Login & Dashboard
- Packing Materials
- Purchase Order
- GRN
- Delivery Challan
- Stock Alerts
- Stock Report
- Master Supplier
- Item Master
- Job Work
- Packing Finished Goods
- Stock Maintenance
- Raw Materials
- Worker Unit
- Product Management
- Settings

Each module supports:
- Read-only access to cached data
- Queued actions for create/update/delete operations
- Automatic sync when connection is restored
- Visual indicators for offline status

## Performance Targets

- **Lighthouse PWA Score**: 90+
- **First Contentful Paint**: < 2.0 seconds
- **Speed Index**: < 3.0 seconds
- **Time to Interactive**: < 3.0 seconds
- **Offline Availability**: 100% of core functionality

## Browser Support

### Desktop
- Chrome 80+
- Edge 80+
- Firefox 75+
- Safari 15+

### Mobile
- Chrome for Android 80+
- Safari for iOS 15+
- Samsung Internet 12+

## Troubleshooting

### Installation Issues
If the install prompt doesn't appear:
1. Ensure all PWA requirements are met
2. Check that the app is served over HTTPS
3. Verify the manifest file is valid
4. Confirm the service worker is registered

### Offline Issues
If offline functionality isn't working:
1. Check that the service worker is active
2. Verify IndexedDB permissions
3. Ensure API endpoints are properly cached
4. Check browser console for errors

### Notification Issues
If push notifications aren't working:
1. Verify notification permissions are granted
2. Check that the service worker handles push events
3. Confirm VAPID keys are properly configured
4. Test with browser's notification testing tools

## Future Enhancements

### Planned Features
- Dark mode toggle
- Enhanced offline reporting
- Advanced caching strategies
- Improved background sync
- Richer push notifications
- Better install experience

### Performance Improvements
- Code splitting optimization
- Image optimization
- Font loading optimization
- Bundle size reduction
- Critical path optimization

## Contributing

To contribute to the PWA features:
1. Follow the existing code style
2. Test all changes with Lighthouse
3. Ensure offline functionality works
4. Verify cross-browser compatibility
5. Update documentation as needed

## License

This PWA implementation is part of the Delta IMS application and is subject to the same licensing terms.