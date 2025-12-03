// 1. Import Dependencies
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

// Import stock scheduler
const { scheduleStockCapture } = require('./utils/stockScheduler');

// 2. Initial Setup
// Load environment variables from .env file
dotenv.config(); 
const app = express();
// Create HTTP server
const httpServer = http.createServer(app);
// Initialize socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to other modules
app.set('io', io);

// Use PORT from environment variable (set by Render) or default to 5001
const PORT = process.env.PORT || 5001;

// 3. Import Route Files
const authRoutes = require('./routes/authRoutes');
const managerRoutes = require('./routes/managerRoutes');
const materialRoutes = require('./routes/materialRoutes');
const stockRoutes = require('./routes/stockRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const grnRoutes = require('./routes/grnRoutes');
const productRoutes = require('./routes/productRoutes');
const productDCRoutes = require('./routes/productDCRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const productMappingRoutes = require('./routes/productMappingRoutes');
const deliveryChallanRoutes = require('./routes/deliveryChallanRoutes');
const fgDeliveryChallanRoutes = require('./routes/fgDeliveryChallanRoutes');
const fgBuyerRoutes = require('./routes/fgBuyerRoutes');
const fgInvoiceRoutes = require('./routes/fgInvoiceRoutes');
const productStockRoutes = require('./routes/productStockRoutes');
const packingStockRoutes = require('./routes/packingStockRoutes');
const fgStockRoutes = require('./routes/fgStockRoutes');
const damagedStockRoutes = require('./routes/damagedStockRoutes');
const materialRequestRoutes = require('./routes/materialRequestRoutes');
const personNameRoutes = require('./routes/personNameRoutes'); // Add this line
// Add this line for DamagedStockMaster routes
const damagedStockMasterRoutes = require('./routes/damagedStockMasterRoutes');
// Import dashboard routes
const dashboardRoutes = require('./routes/dashboardRoutes');
const fgDriverRoutes = require('./routes/fgDriverRoutes');

// 4. Connect to MongoDB Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connection established successfully.'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if we can't connect to the database
    });

// 5. Apply Middleware
// Enable Cross-Origin Resource Sharing for all routes
app.use(cors()); 
// Enable the express app to parse JSON formatted request bodies
app.use(express.json({ limit: '10mb' })); // Increase limit for large requests
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Add request logging middleware for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// 6. Define API Routes
// Any request to '/api/auth' will be handled by authRoutes
app.use('/api/auth', authRoutes); 
// Any request to '/api/managers' will be handled by managerRoutes
app.use('/api/managers', managerRoutes); 
// Any request to '/api/materials' will be handled by materialRoutes
app.use('/api/materials', materialRoutes); 
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/products', productRoutes);
app.use('/api/products/dc', productDCRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/product-mapping', productMappingRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/delivery-challan', deliveryChallanRoutes);
app.use('/api/fg/delivery-challan', fgDeliveryChallanRoutes);
app.use('/api/fg/buyers', fgBuyerRoutes);
app.use('/api/fg/invoices', fgInvoiceRoutes);
app.use('/api/product-stock', productStockRoutes);
app.use('/api/packing', packingStockRoutes);
app.use('/api/fg', fgStockRoutes);
app.use('/api/damaged-stock', damagedStockRoutes);
app.use('/api/material-requests', materialRequestRoutes);
app.use('/api/person-names', personNameRoutes); // Add this line
app.use('/api/damaged-stock-master', damagedStockMasterRoutes); // Add this line
app.use('/api/dashboard', dashboardRoutes); // Add dashboard routes
app.use('/api/fg/drivers', fgDriverRoutes);

// Basic route for testing if the server is up
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        message: 'Internal Server Error', 
        error: process.env.NODE_ENV === 'development' ? err.message : {} 
    });
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// 7. Start the Server
const server = httpServer.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    
    // Initialize stock capture scheduler
    scheduleStockCapture();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
    io.close(() => {
        console.log('Socket.IO server closed');
    });
});