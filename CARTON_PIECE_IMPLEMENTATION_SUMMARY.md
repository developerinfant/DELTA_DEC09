# Carton + Piece Logic Implementation Summary

This document summarizes the changes made to implement full carton + piece logic across the Finished Goods Delivery Challan and Stock Report pages.

## Overview

The implementation includes:
1. Updating server models to support carton/piece tracking
2. Modifying server controllers to handle carton/piece logic
3. Updating client-side Delivery Challan page with carton/piece functionality
4. Updating client-side Stock Report page to display carton/piece quantities
5. Implementing real-time updates using WebSocket

## Server-Side Changes

### 1. ProductStock Model Updates

Modified `server/models/ProductStock.js` to add new fields:
- `available_cartons`: Number of complete cartons available
- `available_pieces`: Number of loose pieces available
- `broken_carton_pieces`: Number of pieces from a broken carton
- `units_per_carton`: Number of pieces per carton (from ProductMaterialMapping)

Updated the pre-save middleware to calculate `totalAvailable` based on carton + piece logic:
```javascript
productStockSchema.pre('save', function(next) {
    // Calculate total available based on carton + piece logic
    this.totalAvailable = (this.available_cartons * this.units_per_carton) + this.available_pieces;
    this.lastUpdated = new Date(); // Update lastUpdated timestamp on every save
    next();
});
```

### 2. FinishedGoodsDC Model Updates

Modified `server/models/FinishedGoodsDC.js` to add new fields:
- `issue_type`: Enum ('Carton' or 'Pieces')
- `units_per_carton`: Number of pieces per carton
- `available_cartons`: Available cartons at time of DC creation
- `available_pieces`: Available pieces at time of DC creation

### 3. Controller Updates

Modified `server/controllers/fgDeliveryChallanController.js`:

#### Create Delivery Challan
- Added validation for carton/piece stock availability
- Added logic to check if sufficient cartons/pieces are available
- Added validation to ensure at least one carton exists before breaking for pieces

#### Update Delivery Challan (Dispatch)
- Added logic to handle stock deduction based on issue type:
  - For Carton issue: Deduct cartons directly
  - For Pieces issue:
    - If no broken carton pieces exist, break a new carton
    - Deduct pieces from broken carton first
    - Update available pieces count

#### Real-time Updates
- Added Socket.IO event emission when stock is updated
- Emits `stockUpdate` event with updated stock information

## Client-Side Changes

### 1. Delivery Challan Page (`client/src/pages/fg/CreateFGDC.js`)

Updated the page to support carton/piece logic:

#### UI Enhancements
- Added "Issue Type" radio buttons (Carton/Pieces)
- Added "Units per Carton" auto-fill field
- Added "Available Cartons" and "Available Pieces" display
- Enhanced stock information panel with detailed breakdown
- Added validation warnings for insufficient stock

#### Logic Implementation
- Implemented carton/piece validation based on available stock
- Added logic to calculate remaining stock after dispatch
- Added detailed dispatch information display

### 2. Stock Report Page (`client/src/pages/fg/StockReport.js`)

Updated the page to display carton/piece quantities:

#### UI Enhancements
- Replaced "Total Inward", "Total Outward", "Available Stock" columns with:
  - "Product Name"
  - "Total Cartons"
  - "Total Pieces (Units)"
  - "Last Updated"
- Added footer with total cartons and pieces
- Updated summary cards to show carton/piece totals

#### Real-time Updates
- Implemented Socket.IO client connection
- Added listener for `stockUpdate` events
- Updated stock data in real-time without page refresh

## Carton + Piece Logic

### Stock Management Logic

1. **Carton Issue**:
   - `available_cartons -= issued_cartons`
   - `available_pieces` stays the same

2. **Pieces Issue**:
   - If `broken_carton_pieces == 0`:
     - `available_cartons -= 1`
     - `broken_carton_pieces = units_per_carton`
   - `broken_carton_pieces -= issued_pieces`
   - `available_pieces = broken_carton_pieces`

3. **Broken Carton Handling**:
   - When `broken_carton_pieces = 0`, it means the carton is fully consumed with no leftover pieces

### Database Fields

- `available_cartons`: Complete cartons available
- `available_pieces`: Loose pieces available (from previously broken cartons)
- `broken_carton_pieces`: Pieces from currently broken carton
- `units_per_carton`: Number of pieces per carton (from Product Mapping)

## Real-time Updates

Implemented WebSocket-based real-time updates:
- When a Delivery Challan is dispatched, the server emits a `stockUpdate` event
- The Stock Report page listens for these events and updates the display immediately
- No page refresh is needed to see updated stock information

## Testing

The implementation has been tested with the following scenarios:
1. Creating delivery challans with carton issuance
2. Creating delivery challans with piece issuance
3. Breaking cartons when issuing pieces
4. Real-time updates in the stock report
5. Validation of insufficient stock scenarios

## Future Enhancements

Potential future enhancements could include:
1. Adding unit tests for the carton/piece logic
2. Implementing more detailed stock history tracking
3. Adding visual indicators for recently updated products
4. Implementing low stock alerts based on carton/piece quantities