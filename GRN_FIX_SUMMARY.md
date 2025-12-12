# GRN Double Update Fix Summary

## Issue Identified
There was a double update issue in the GRN controller where `material.quantity` was being updated twice for each GRN submission, causing the stock to be doubled.

## Root Cause
In the `createGRN` function in `grnController.js`, there were two separate loops that updated material quantities:
1. Lines 923-930: A loop that directly incremented material.quantity using `$inc`
2. Lines 932-1028: A proper stock update loop that calculated weighted averages and updated quantities

This caused each GRN to double the stock increase for packing materials.

## Fix Applied
Removed the duplicate update code block at lines 923-930:

```javascript
// REMOVED THIS DUPLICATE CODE:
for (const item of processedItems) {
    if (item.materialModel === 'PackingMaterial') {
        await PackingMaterial.findByIdAndUpdate(
            item.material,
            { $inc: { quantity: item.receivedQuantity + (item.extraReceivedQty || 0) } }
        );
    }
}
```

## Verification
1. Confirmed that the Packing Material Stock Report correctly uses `material.quantity` directly for PM Store value without any calculation
2. Verified that the approveOrRejectGRN function does not have the same duplicate update issue
3. Checked that other updates to quantityReceived on Purchase Orders are correct and not duplicates

## Result
- GRN submissions will now correctly update material.quantity only once
- Stock levels will no longer be doubled
- PM Store value continues to show the latest material.quantity from Item Master as required