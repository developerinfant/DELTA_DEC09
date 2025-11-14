# Permission System Test Plan

## Overview
This document outlines the test plan for the newly implemented granular permission system for manager access control in the Delta application.

## Test Scenarios

### 1. Admin User Permissions
- **Expected Behavior**: Admin users should have access to all modules and actions
- **Test Steps**:
  1. Log in as an admin user
  2. Navigate to all modules (Packing Materials, Stock Maintenance, Product Management)
  3. Verify all actions are available (Add, Edit, Delete, View Report, etc.)
- **Pass Criteria**: All actions should be accessible without restrictions

### 2. Manager with Granular Permissions
- **Expected Behavior**: Managers should only have access to modules and actions explicitly granted
- **Test Steps**:
  1. Create a manager user
  2. Assign granular permissions via the Settings page:
     - Packing Materials → Item Master: View, Edit, View Report (exclude Add, Delete)
     - Stock Maintenance → Raw Materials: Add, View (exclude Edit, Delete, View Report)
  3. Log in as the manager
  4. Navigate to Packing Materials → Item Master
  5. Verify View, Edit, and View Report actions are available
  6. Verify Add and Delete actions are disabled with lock icons
  7. Navigate to Stock Maintenance → Raw Materials
  8. Verify Add and View actions are available
  9. Verify Edit, Delete, and View Report actions are disabled with lock icons
- **Pass Criteria**: 
  - Enabled actions should be fully functional
  - Disabled actions should show lock icons and display access denied modal when clicked

### 3. Manager with Module-Level Access (Legacy)
- **Expected Behavior**: Managers with only module-level access should have access to all actions within those modules
- **Test Steps**:
  1. Create a manager user with legacy module access (no granular permissions)
  2. Assign module access to "Item Master" and "Raw Materials"
  3. Log in as the manager
  4. Navigate to Packing Materials → Item Master
  5. Verify all actions are available
  6. Navigate to Stock Maintenance → Raw Materials
  7. Verify all actions are available
- **Pass Criteria**: All actions within assigned modules should be accessible

### 4. Manager with No Permissions
- **Expected Behavior**: Managers with no permissions should be denied access to modules
- **Test Steps**:
  1. Create a manager user with no permissions
  2. Log in as the manager
  3. Try to access Packing Materials module
  4. Try to access Stock Maintenance module
  5. Try to access Product Management module
- **Pass Criteria**: Access denied message should be displayed for all modules

### 5. Clone Permissions Feature
- **Expected Behavior**: Permissions should be successfully cloned from one manager to another
- **Test Steps**:
  1. Create two manager users (Manager A and Manager B)
  2. Assign granular permissions to Manager A
  3. Log in as admin
  4. Navigate to Settings → Managers & Module Access
  5. Select Manager B
  6. Use the "Clone Permissions" feature to copy permissions from Manager A
  7. Save the changes
  8. Log in as Manager B
  9. Verify Manager B has the same permissions as Manager A
- **Pass Criteria**: Manager B should have identical permissions to Manager A

### 6. Access Disabled Modal
- **Expected Behavior**: When a manager tries to perform a disabled action, an access denied modal should appear
- **Test Steps**:
  1. Create a manager with limited permissions (e.g., can view but not edit materials)
  2. Log in as the manager
  3. Navigate to Packing Materials
  4. Click the edit icon for a material
  5. Observe the access disabled modal
  6. Click OK to close the modal
- **Pass Criteria**: 
  - Access disabled modal should appear with appropriate message
  - Modal should close when OK is clicked
  - Original page should remain unchanged

### 7. Real-time Permission Updates
- **Expected Behavior**: Permission changes should take effect immediately without requiring logout
- **Test Steps**:
  1. Create a manager user
  2. Log in as admin
  3. Navigate to Settings → Managers & Module Access
  4. Remove edit permission for Packing Materials → Item Master
  5. Save changes
  6. In another browser/incognito window, log in as the manager
  7. Navigate to Packing Materials
  8. Try to edit a material
- **Pass Criteria**: Edit action should be immediately disabled for the manager

## UI/UX Verification

### 1. Visual Indicators
- Lock icons should be displayed for disabled actions
- Enabled actions should be fully interactive
- Modules with granular permissions should show a lock icon in the manager list

### 2. Granular Permissions Modal
- Modal should display all modules and submodules in a collapsible format
- Checkboxes should properly reflect current permissions
- "Select All" functionality should work at module and section levels
- Save button should persist changes
- Clone permissions dropdown should list available managers

### 3. Access Disabled Modal
- Modal should appear centered on screen
- Message should be clear and informative
- OK button should close the modal
- Modal should have appropriate styling (red lock icon, etc.)

## Backend API Verification

### 1. Permission Data Structure
- User documents should contain both legacy `moduleAccess` and new `permissions` fields
- `permissions` field should be a nested object structure
- `clonedFrom` field should reference the source manager when permissions are cloned

### 2. API Endpoints
- `/api/settings/managers/:id/module-access` should accept and return granular permissions
- `/api/settings/managers/:id/clone-permissions` should properly clone permissions
- `/api/auth/login` and `/api/auth/profile` should return granular permissions

## Edge Cases

### 1. Mixed Permission Systems
- Users with both legacy module access and granular permissions should use granular permissions
- Users with only legacy permissions should fall back to module-level access
- Users with empty permissions should be denied access

### 2. Invalid Permission Data
- Malformed permission data should not break the application
- Missing permission fields should default to false
- Invalid module IDs should be handled gracefully

### 3. Concurrent Access
- Multiple admins updating permissions simultaneously should not cause conflicts
- Permission updates should be atomic

## Test Data

### Sample Permission Structure
```json
{
  "view-materials": {
    "view": true,
    "edit": true,
    "add": false,
    "delete": false,
    "view-report": true
  },
  "view-raw-materials": {
    "view": true,
    "edit": false,
    "add": true,
    "delete": false,
    "view-report": false
  }
}
```

## Success Criteria
- All test scenarios pass as described
- No application errors or crashes
- UI behaves as expected for all user roles
- Backend correctly stores and retrieves permission data
- Performance is acceptable (no significant delays)