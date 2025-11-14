# Admin Module Access Control Test Plan

## Overview
This test plan verifies the implementation of the new Admin Module Access Control Logic.

## Test Cases

### 1. Module-Level Selection

#### 1.1 Select Full Module
- **Precondition**: No permissions selected
- **Action**: Click on a module checkbox (e.g., Packing Materials)
- **Expected Result**: 
  - All sub-modules under the module are selected
  - All actions for every sub-module are selected
  - Module checkbox shows as fully checked

#### 1.2 Deselect Full Module
- **Precondition**: All permissions in a module are selected
- **Action**: Click on a module checkbox (e.g., Packing Materials)
- **Expected Result**: 
  - All sub-modules under the module are deselected
  - All actions for every sub-module are deselected
  - Module checkbox shows as unchecked

### 2. Sub-Module-Level Selection

#### 2.1 Select Sub-Module Only
- **Precondition**: No permissions selected
- **Action**: Click on a sub-module checkbox only (e.g., Item Master under Packing Materials)
- **Expected Result**: 
  - Sub-module checkbox shows as fully checked
  - No individual actions are selected
  - Manager can see the sub-module in the sidebar but no actions inside it

#### 2.2 Deselect Sub-Module
- **Precondition**: Sub-module is selected (but no actions)
- **Action**: Click on the sub-module checkbox
- **Expected Result**: 
  - Sub-module checkbox shows as unchecked
  - Manager cannot see the sub-module in the sidebar

### 3. Action-Level Selection

#### 3.1 Select Individual Actions
- **Precondition**: No permissions selected
- **Action**: 
  1. Click on a sub-module checkbox (e.g., Item Master)
  2. Select specific actions (e.g., View, Edit)
- **Expected Result**: 
  - Sub-module checkbox shows as partially checked (indeterminate state)
  - Selected actions are checked
  - Unselected actions remain unchecked
  - Manager can see the sub-module and only the selected actions

#### 3.2 Deselect Individual Actions
- **Precondition**: Some actions are selected in a sub-module
- **Action**: Deselect one or more actions
- **Expected Result**: 
  - Deselected actions are unchecked
  - Remaining selected actions remain checked
  - Sub-module checkbox state updates accordingly (fully checked, partially checked, or unchecked)

### 4. Mixed Permissions

#### 4.1 Complex Permission Combination
- **Precondition**: No permissions selected
- **Action**: 
  1. Select Packing Materials module fully
  2. Deselect Delivery Challan sub-module
  3. In Item Master sub-module, deselect all actions except View and Edit
- **Expected Result**: 
  - Packing Materials module shows as partially checked
  - Item Master sub-module shows as partially checked
  - Delivery Challan sub-module shows as unchecked
  - Manager sees:
    - Packing Materials → Item Master with only View & Edit buttons
    - Packing Materials → Delivery Challan tab is hidden
  - Other sub-modules show all actions

### 5. UI Behavior Enhancements

#### 5.1 Select All Modules
- **Precondition**: No permissions selected
- **Action**: Click on "Select All Modules" checkbox
- **Expected Result**: 
  - All modules, sub-modules, and actions are selected
  - "Select All Modules" checkbox shows as fully checked

#### 5.2 Deselect All Modules
- **Precondition**: All permissions selected
- **Action**: Click on "Select All Modules" checkbox
- **Expected Result**: 
  - All modules, sub-modules, and actions are deselected
  - "Select All Modules" checkbox shows as unchecked

#### 5.3 Indeterminate States
- **Precondition**: Mixed selection state
- **Action**: Observe checkbox states
- **Expected Result**: 
  - Modules with partially selected sub-modules show indeterminate state
  - Sub-modules with partially selected actions show indeterminate state

### 6. Persistence

#### 6.1 Save Permissions
- **Precondition**: Mixed permission state
- **Action**: Click "Save Permissions"
- **Expected Result**: 
  - Success message is displayed
  - Permissions are saved to the database

#### 6.2 Load Permissions
- **Precondition**: Permissions saved in database
- **Action**: Reopen the module access modal
- **Expected Result**: 
  - Previously saved permissions are correctly displayed
  - Checkbox states match the saved permissions

## Test Execution

### Manual Testing
1. Open the Admin Settings page
2. Select a manager
3. Open the Module Access modal
4. Execute each test case above
5. Verify expected results

### Automated Testing
1. Run unit tests for permission utilities
2. Run integration tests for the GranularPermissionsModal component
3. Run end-to-end tests for the complete permission flow

## Success Criteria
- All test cases pass
- No regressions in existing functionality
- UI behaves as specified in the requirements
- Permissions are correctly saved and loaded
- Manager experience correctly reflects assigned permissions