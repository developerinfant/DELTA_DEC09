# Permission Display Logic Update

## Overview

This update implements the new permission display logic for the manager side as requested:

1. **Unticked modules/sub-modules** → Hide completely from manager side
2. **Unticked actions** → Show with locked icon and disabled state

## Changes Made

### 1. Permission Utilities (`utils/permissions.js`)

- Added new `isModuleVisible` function to determine if a module should be visible to the user
- Updated `hasModuleAccess` to use the new `isModuleVisible` function
- Updated `usePermissions` hook to include the new `isModuleVisible` function

### 2. Sidebar Component (`components/layout/Sidebar.js`)

- Updated module visibility checks to use the new `isModuleVisible` function
- This ensures that unticked modules/sub-modules are completely hidden from the manager UI

### 3. Access Control Hook (`hooks/useAccessControl.js`)

- Added `checkModuleVisibility` function to check if a module is visible
- Added `isActionVisibleButDisabled` function to check if an action is visible but disabled
- Updated hook to export these new functions

### 4. Permission Button Component (`components/common/PermissionButton.js`)

- Updated to show a lock icon for actions that are visible but disabled
- Maintains existing functionality for fully enabled/disabled actions

### 5. New Permission Action Component (`components/common/PermissionAction.js`)

- Created a new component that displays actions with appropriate styling based on permissions
- Shows lock icon for disabled actions
- Provides flexible positioning options for the lock icon

### 6. Documentation (`docs/ACCESS_CONTROL.md`)

- Updated documentation to reflect the new permission logic
- Added examples of how to use the new functionality

### 7. Tests

- Updated permission utilities tests to include tests for the new `isModuleVisible` function
- Created tests for the new `PermissionAction` component

## Implementation Details

### Module/Sub-Module Visibility Logic

The new `isModuleVisible` function determines if a module should be visible to a user:

- For Admin users: Always returns `true`
- For Manager users: Returns `true` if the user has any permission in the module
- For modules with no permissions: Returns `false`

This ensures that modules/sub-modules that have been unticked by the admin are completely hidden from the manager UI.

### Action Visibility and State Logic

The new `isActionVisibleButDisabled` function determines if an action should be visible but disabled:

- For Admin users: Always returns `false` (admins have all permissions)
- For Manager users: Returns `true` if the module is visible but the user doesn't have permission for the specific action

This ensures that actions that have been unticked by the admin are still visible to managers but in a disabled state with a lock icon.

## Benefits

1. **Clearer UX**: Managers can see exactly which actions they have access to vs. which are disabled
2. **Better Context**: Disabled actions provide context about what features exist in the system
3. **Consistent Behavior**: Modules/sub-modules that are completely hidden vs. actions that are disabled but visible
4. **Maintainable Code**: Clear separation of concerns with dedicated functions for different permission checks

## Usage Examples

### Checking Module Visibility

```jsx
import { isModuleVisible } from '../../utils/permissions';

// Check if a module should be visible to the user
const isVisible = isModuleVisible(user, 'view-materials');
```

### Checking Action Disabled State

```jsx
import useAccessControl from '../../hooks/useAccessControl';

const { isActionVisibleButDisabled } = useAccessControl();

// Check if an action is visible but disabled
const isDisabled = isActionVisibleButDisabled('view-materials', 'edit');
```

### Using PermissionAction Component

```jsx
import PermissionAction from '../../components/common/PermissionAction';

<PermissionAction
  moduleId="view-materials"
  action="edit"
  onClick={handleEdit}
>
  Edit Material
</PermissionAction>
```