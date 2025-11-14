# Packing Materials Management App

This application helps manage packing materials inventory with features for tracking quantities, prices, and stock alerts.

## Features Added

### Per-Quantity Price Field
We've added a per-quantity price field to better calculate the total value of materials:
- When adding a new material, you can now specify a per-quantity price
- The total price is automatically calculated as: `quantity × per-quantity price`
- The old single price field has been removed in favor of this more flexible approach
- This allows for more flexible pricing models (e.g., bulk pricing)

## Setup

1. Install dependencies for both client and server:
   ```
   cd client && npm install
   cd ../server && npm install
   ```

2. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Update the values as needed

3. Run the application:
   ```
   # In one terminal
   cd server && npm run server
   
   # In another terminal
   cd client && npm start
   ```

## Migration

If you're updating an existing installation, run the migration script to add the per-quantity price field to existing materials:
```
cd server && npm run migrate:add-per-quantity-price
```

## API Endpoints

All endpoints are prefixed with `/api`:

### Materials
- `POST /materials` - Add a new packing material
- `GET /materials` - Get all packing materials
- `GET /materials/:id` - Get a specific packing material
- `PUT /materials/:id` - Update a packing material
- `DELETE /materials/:id` - Delete a packing material