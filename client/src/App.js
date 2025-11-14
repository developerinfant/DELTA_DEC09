import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Global Styles
import './App.css';
import 'react-toastify/dist/ReactToastify.css'; // Add toast CSS

// Import Layout and Page Components
import Layout from './components/layout/Layout';
import Login from './pages/common/Login';
import Dashboard from './pages/common/Dashboard';
import ViewPackingMaterials from './pages/common/ViewPackingMaterialsWithOffline'; // Updated to offline version
import OutgoingPackingMaterials from './pages/common/OutgoingPackingMaterials';
import PackingMaterialStockAlerts from './pages/common/PackingMaterialStockAlerts';
import CreateManager from './pages/admin/CreateManager';
import Settings from './pages/admin/Settings';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/common/Unauthorized';
import AppleStyleDemo from './pages/common/AppleStyleDemo';

// Import Stock Maintenance Pages
import ViewRawMaterials from './pages/stock/ViewRawMaterials';
import OutgoingRawMaterials from './pages/stock/OutgoingRawMaterials';
import RawMaterialStockAlerts from './pages/stock/RawMaterialStockAlerts';
import FinishingGoods from './pages/stock/FinishingGoods';

// Import Purchase Order Pages
import CreatePurchaseOrder from './pages/purchase/CreatePurchaseOrder';
import ManageSuppliers from './pages/purchase/ManageSuppliers';
import PurchaseOrderDetail from './pages/purchase/PurchaseOrderDetail';
import DeltaPOPrintLayout from './pages/purchase/DeltaPOPrintLayout';
import GRNDetail from './pages/purchase/GRNDetail';

// Import GRN Pages
import CreateGRN from './pages/purchase/CreateGRN';

import ViewPackingPurchaseOrders from './pages/packing/ViewPackingPurchaseOrders';
import ManagePackingSuppliers from './pages/packing/ManagePackingSuppliers';
import ViewPackingGRNs from './pages/packing/ViewPackingGRNs';
import ViewFGGRNs from './pages/fg/ViewFGGRNs';
import CreateFGGRN from './pages/fg/CreateFGGRN';
import StockReport from './pages/packing/StockReport';
import MaterialStockReport from './pages/packing/MaterialStockReport';
import DamagedStockReport from './pages/packing/DamagedStockReport';

// Import Stock Maintenance Pages
import ViewStockPurchaseOrders from './pages/stock/maintenance/ViewStockPurchaseOrders';
import ManageStockSuppliers from './pages/stock/maintenance/ManageStockSuppliers';
import ViewStockGRNs from './pages/stock/maintenance/ViewStockGRNs';

// Import Product Management Pages
import ProductDetails from './pages/products/ProductDetails';
import ProductDC from './pages/products/ProductDC';

// Import Finished Goods Delivery Challan Pages
import CreateFGDC from './pages/fg/CreateFGDC';
import ViewFGDCs from './pages/fg/ViewFGDCs';
import FGStockAlert from './pages/fg/StockAlert';
import FGStockReport from './pages/fg/StockReport';
// Import new FG Invoice and Buyer Master pages
import Invoice from './pages/fg/Invoice';
import CreateInvoice from './pages/fg/CreateInvoice';
import InvoiceDetail from './pages/fg/InvoiceDetail';
import BuyerMaster from './pages/fg/BuyerMaster';
import FGInvoicePrintLayout from './pages/fg/FGInvoicePrintLayout';
// Import FG GRN Details page
import ViewFGGRN from './pages/fg/ViewFGGRN';

// Import the ProtectedRoute component
import ProtectedRoute from './components/common/ProtectedRoute';
// Import the new ConditionalRoute component
import ConditionalRoute from './components/common/ConditionalRoute';

// Import PWA components
import usePWA from './hooks/usePWA';
import OfflineBanner from './components/common/OfflineBanner';
import PushNotificationHandler from './components/common/PushNotificationHandler';

// Import ToastContainer for toast notifications
import { ToastContainer } from 'react-toastify';

function App() {
  const {
    registerServiceWorker
  } = usePWA();

  // Register service worker only once on app load
  useEffect(() => {
    registerServiceWorker();
  }, []); // Empty dependency array to run only once

  return (
    <Router>
      <OfflineBanner />
      <PushNotificationHandler />
      <ToastContainer /> {/* Add ToastContainer here */}
      
      <Routes>
        {/* Public route for login */}
        <Route path="/login" element={<Login />} />

        {/* Main protected application layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >

          {/* Dashboard */}
          <Route index element={<Dashboard />} />
          
          {/* Apple Style Demo */}
          <Route path="apple-demo" element={<AppleStyleDemo />} />

          {/* Packing Materials Routes */}
          <Route path="materials" element={
            <ConditionalRoute moduleId="view-materials" action="view">
              <ViewPackingMaterials />
            </ConditionalRoute>
          } />
          <Route path="materials/outgoing" element={
            <ConditionalRoute moduleId="outgoing-materials" action="record-usage">
              <OutgoingPackingMaterials />
            </ConditionalRoute>
          } />
          <Route path="materials/alerts" element={
            <ConditionalRoute moduleId="stock-alerts" action="view">
              <PackingMaterialStockAlerts />
            </ConditionalRoute>
          } />
          {/* Add alias route for /materials/report */}
          <Route path="materials/report" element={
            <ConditionalRoute moduleId="stock-alerts" action="view">
              <StockReport />
            </ConditionalRoute>
          } />
          {/* Add alias route for /materials/purchase */}
          <Route path="materials/purchase" element={
            <ConditionalRoute moduleId="view-packing-pos" action="view">
              <ViewPackingPurchaseOrders />
            </ConditionalRoute>
          } />
          {/* Add alias route for /materials/grn */}
          <Route path="materials/grn" element={
            <ConditionalRoute moduleId="view-packing-grns" action="view">
              <ViewPackingGRNs />
            </ConditionalRoute>
          } />
          {/* Add alias route for /materials/dc */}
          <Route path="materials/dc" element={
            <ConditionalRoute moduleId="outgoing-materials" action="record-usage">
              <OutgoingPackingMaterials />
            </ConditionalRoute>
          } />
          {/* New Packing Materials PO, Suppliers, and GRNs routes */}
          <Route path="packing/purchase-orders" element={
            <ConditionalRoute moduleId="view-packing-pos" action="view">
              <ViewPackingPurchaseOrders />
            </ConditionalRoute>
          } />
          <Route path="packing/purchase-orders/create" element={
            <ConditionalRoute moduleId="view-packing-pos" action="create-po">
              <CreatePurchaseOrder />
            </ConditionalRoute>
          } />
          <Route path="packing/purchase-orders/:id" element={
            <ConditionalRoute moduleId="view-packing-pos" action="view">
              <PurchaseOrderDetail />
            </ConditionalRoute>
          } />
          <Route path="packing/purchase-orders/:id/print" element={
            <ConditionalRoute moduleId="view-packing-pos" action="view">
              <DeltaPOPrintLayout />
            </ConditionalRoute>
          } />
          <Route path="packing/suppliers" element={
            <ConditionalRoute moduleId="manage-packing-suppliers" action="view">
              <ManagePackingSuppliers />
            </ConditionalRoute>
          } />
          {/* Redirect /packing/grn to /packing/grn/view */}
          <Route path="packing/grn" element={<Navigate to="/packing/grn/view" replace />} />
          <Route path="packing/grn/view" element={
            <ConditionalRoute moduleId="view-packing-grns" action="view">
              <ViewPackingGRNs />
            </ConditionalRoute>
          } />
          <Route path="packing/grn/create" element={
            <ConditionalRoute moduleId="view-packing-grns" action="create-grn">
              <CreateGRN />
            </ConditionalRoute>
          } />
          <Route path="packing/grn/:id" element={
            <ConditionalRoute moduleId="view-packing-grns" action="view">
              <GRNDetail />
            </ConditionalRoute>
          } />
          
          {/* Finished Goods Routes */}
          <Route path="fg/stock-alert" element={
            <ConditionalRoute moduleId="view-fg-grns" action="view">
              <FGStockAlert />
            </ConditionalRoute>
          } />
          <Route path="fg/stock-report" element={
            <ConditionalRoute moduleId="view-fg-grns" action="view">
              <FGStockReport />
            </ConditionalRoute>
          } />
          {/* Redirect /fg/grn to /fg/grn/view */}
          <Route path="fg/grn" element={<Navigate to="/fg/grn/view" replace />} />
          <Route path="fg/grn/view" element={
            <ConditionalRoute moduleId="view-fg-grns" action="view">
              <ViewFGGRNs />
            </ConditionalRoute>
          } />
          <Route path="fg/grn/create" element={
            <ConditionalRoute moduleId="view-fg-grns" action="create-grn">
              <CreateFGGRN />
            </ConditionalRoute>
          } />
          <Route path="fg/grn/:id" element={
            <ConditionalRoute moduleId="view-fg-grns" action="view">
              <ViewFGGRN />
            </ConditionalRoute>
          } />
          {/* Redirect /fg/delivery-challan to /fg/delivery-challan/view */}
          <Route path="fg/delivery-challan" element={<Navigate to="/fg/delivery-challan/view" replace />} />
          <Route path="fg/delivery-challan/create" element={
            <ConditionalRoute moduleId="view-fg-dcs" action="create">
              <CreateFGDC />
            </ConditionalRoute>
          } />
          <Route path="fg/delivery-challan/view" element={
            <ConditionalRoute moduleId="view-fg-dcs" action="view">
              <ViewFGDCs />
            </ConditionalRoute>
          } />
          {/* Redirect /fg/invoice to a proper view route */}
          <Route path="fg/invoice" element={<Navigate to="/fg/invoice/view" replace />} />
          <Route path="fg/invoice/view" element={
            <ConditionalRoute moduleId="view-fg-invoices" action="view">
              <Invoice />
            </ConditionalRoute>
          } />
          <Route path="fg/invoice/create" element={
            <ConditionalRoute moduleId="view-fg-invoices" action="create">
              <CreateInvoice />
            </ConditionalRoute>
          } />
          <Route path="fg/invoice/:id" element={
            <ConditionalRoute moduleId="view-fg-invoices" action="view">
              <InvoiceDetail />
            </ConditionalRoute>
          } />
          <Route path="fg/invoice/:id/print" element={
            <ConditionalRoute moduleId="view-fg-invoices" action="view">
              <FGInvoicePrintLayout />
            </ConditionalRoute>
          } />
          {/* Redirect /fg/buyer-master to a proper view route */}
          <Route path="fg/buyer-master" element={<Navigate to="/fg/buyer-master/view" replace />} />
          <Route path="fg/buyer-master/view" element={
            <ConditionalRoute moduleId="view-fg-buyers" action="view">
              <BuyerMaster />
            </ConditionalRoute>
          } />
          
          {/* New Stock Report Route */}
          <Route path="packing/stock-report" element={
            <ConditionalRoute moduleId="stock-alerts" action="view">
              <MaterialStockReport />
            </ConditionalRoute>
          } />
          
          {/* Damaged Stock Report Route */}
          <Route path="packing/damaged-stock-report" element={
            <ConditionalRoute moduleId="view-packing-grns" action="view">
              <DamagedStockReport />
            </ConditionalRoute>
          } />
          
          {/* Add alias route for /supplier */}
          <Route path="supplier" element={
            <ConditionalRoute moduleId="manage-packing-suppliers" action="view">
              <ManagePackingSuppliers />
            </ConditionalRoute>
          } />
          {/* Add alias route for /itemmaster */}
          <Route path="itemmaster" element={
            <ConditionalRoute moduleId="view-materials" action="view">
              <ViewPackingMaterials />
            </ConditionalRoute>
          } />

          {/* Stock Maintenance Routes */}
          <Route path="stock/raw-materials" element={
            <ConditionalRoute moduleId="view-raw-materials" action="view">
              <ViewRawMaterials />
            </ConditionalRoute>
          } />
          <Route path="stock/raw-materials/outgoing" element={
            <ConditionalRoute moduleId="outgoing-raw-materials" action="record-usage">
              <OutgoingRawMaterials />
            </ConditionalRoute>
          } />
          <Route path="stock/alerts" element={
            <ConditionalRoute moduleId="stock-alerts" action="view">
              <RawMaterialStockAlerts />
            </ConditionalRoute>
          } />
          <Route path="stock/purchase-orders" element={
            <ConditionalRoute moduleId="view-stock-pos" action="view">
              <ViewStockPurchaseOrders />
            </ConditionalRoute>
          } />
          <Route path="stock/purchase-orders/create" element={
            <ConditionalRoute moduleId="view-stock-pos" action="create-po">
              <CreatePurchaseOrder materialType="raw" />
            </ConditionalRoute>
          } />
          <Route path="stock/purchase-orders/:id" element={
            <ConditionalRoute moduleId="view-stock-pos" action="view">
              <PurchaseOrderDetail />
            </ConditionalRoute>
          } />
          <Route path="stock/purchase-orders/:id/print" element={
            <ConditionalRoute moduleId="view-stock-pos" action="view">
              <DeltaPOPrintLayout />
            </ConditionalRoute>
          } />
          <Route path="stock/suppliers" element={
            <ConditionalRoute moduleId="manage-stock-suppliers" action="view">
              <ManageStockSuppliers />
            </ConditionalRoute>
          } />
          {/* Redirect /stock/grn to /stock/grn/view */}
          <Route path="stock/grn" element={<Navigate to="/stock/grn/view" replace />} />
          <Route path="stock/grn/view" element={
            <ConditionalRoute moduleId="view-stock-grns" action="view">
              <ViewStockGRNs />
            </ConditionalRoute>
          } />
          <Route path="stock/grn/create" element={
            <ConditionalRoute moduleId="view-stock-grns" action="create-grn">
              <CreateGRN />
            </ConditionalRoute>
          } />
          <Route path="stock/grn/:id" element={
            <ConditionalRoute moduleId="view-stock-grns" action="view">
              <GRNDetail />
            </ConditionalRoute>
          } />

          {/* Product Management Routes */}
          <Route path="products/:id" element={
            <ConditionalRoute moduleId="view-products" action="view">
              <ProductDetails />
            </ConditionalRoute>
          } />
          <Route path="products/:id/dc" element={
            <ConditionalRoute moduleId="view-products" action="view">
              <ProductDC />
            </ConditionalRoute>
          } />

          {/* Admin Routes */}
          <Route path="admin/managers/create" element={
            <ConditionalRoute moduleId="manage-users" action="create">
              <CreateManager />
            </ConditionalRoute>
          } />
          <Route path="admin/settings" element={
            <ConditionalRoute moduleId="manage-settings" action="view">
              <Settings />
            </ConditionalRoute>
          } />

          {/* Unauthorized and Not Found Routes */}
          <Route path="unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;