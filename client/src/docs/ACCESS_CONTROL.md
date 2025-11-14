# Access Control System Documentation

## Overview

The access control system provides granular permission management for different user roles. It allows administrators to control exactly which modules, sub-modules, and actions each manager can access.

## Core Components

### 1. Permission Utilities (`utils/permissions.js`)

Provides functions for checking permissions:
- `hasPermission(user, moduleId, action)` - Check if user has specific permission
- `hasAnyPermissionInModule(user, moduleId)` - Check if user has any permission in a module
- `isModuleVisible(user, moduleId)` - Check if a module should be visible to the user
- `hasModuleAccess(user, moduleId)` - Check if user has access to a module section

### 2. Protected Routes (`components/common/ProtectedRoute.js`)

Wraps routes to prevent unauthorized access:
```jsx
<Route path="materials" element={
  <ProtectedRoute moduleId="view-materials" action="view">
    <ViewPackingMaterials />
  </ProtectedRoute>
} />
```

### 3. Access Control Hook (`hooks/useAccessControl.js`)

Provides hooks for checking permissions in components:
```jsx
const { checkPermission, isDisabled, getOpacityClass, isActionVisibleButDisabled } = useAccessControl();

// Check if user can edit materials
const canEdit = checkPermission('view-materials', 'edit');

// Get disabled state for a button
const isButtonDisabled = isDisabled('view-materials', 'edit');

// Check if an action is visible but disabled
const isEditDisabled = isActionVisibleButDisabled('view-materials', 'edit');

// Get opacity class for styling
const opacityClass = getOpacityClass('view-materials', 'edit');
```

### 4. Permission Button (`components/common/PermissionButton.js`)

A button component that automatically handles permission checking:
```jsx
<PermissionButton
  moduleId="view-materials"
  action="edit"
  onClick={handleEdit}
  className="px-4 py-2 bg-blue-500 text-white rounded"
>
  Edit Material
</PermissionButton>
```

## Admin Module Access Control Logic

### Module-Level Selection

When the admin ticks the entire module checkbox (e.g., Packing Materials), it should:

- Automatically select all sub-modules under it
- Automatically select all action checkboxes (View, Edit, Add, Delete, View Report, etc.) for every sub-module

When the admin unticks the module checkbox, it should:

- Automatically deselect all sub-modules and actions under that module

### Sub-Module-Level Selection

The admin can select individual sub-modules without selecting the entire module.

When the admin ticks a sub-module checkbox only (without any action checkboxes):

- That sub-module should be visible to the assigned manager
- But no actions (like View, Add, Edit, Delete, etc.) should be available inside that sub-module
- Essentially, the manager will only see the sub-module name in the sidebar/menu, but no action inside it

### Action-Level Selection

The admin can select individual actions under a sub-module.

When the admin ticks one or more action checkboxes under a sub-module:

- Manager can see that module, that sub-module, and only those selected actions
- Example: If admin enables Packing Materials → Item Master → View, Edit, then the assigned manager will see Packing Materials → Item Master, and only the View and Edit actions will be functional
- Unticked actions will still be visible but disabled with a lock icon

## New Permission Logic Implementation

### Module/Sub-Module Visibility

1. **Unticked modules/sub-modules** → Hide completely from manager side
2. **Ticked modules/sub-modules** → Show in manager UI

### Action Visibility and State

1. **Ticked actions** → Fully functional (enabled)
2. **Unticked actions** → Visible but disabled with lock icon

This approach provides better UX by:
- Clearly indicating which actions are available vs. unavailable
- Preventing confusion from completely hidden functionality
- Maintaining context of what features exist in the system

## Implementation Guide

### 1. Route Protection

Protect routes by wrapping them with `ProtectedRoute`:
```jsx
<Route path="materials" element={
  <ProtectedRoute moduleId="view-materials" action="view">
    <ViewPackingMaterials />
  </ProtectedRoute>
} />
```

### 2. Component-Level Permission Checking

Use the `useAccessControl` hook in components:
```jsx
import useAccessControl from '../../hooks/useAccessControl';

const MyComponent = () => {
  const { checkPermission, isActionVisibleButDisabled } = useAccessControl();
  
  const canEdit = checkPermission('view-materials', 'edit');
  const isEditDisabled = isActionVisibleButDisabled('view-materials', 'edit');
  
  return (
    <div>
      {canEdit && (
        <button onClick={handleEdit}>Edit</button>
      )}
      {!canEdit && isEditDisabled && (
        <button disabled className="opacity-50 flex items-center">
          Edit
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};
```

### 3. Action-Level UI Control

Use `PermissionButton` for action buttons:
```jsx
<PermissionButton
  moduleId="view-materials"
  action="add"
  onClick={handleAdd}
>
  Add Material
</PermissionButton>
```

Or manually control UI elements:
```jsx
<button
  disabled={isDisabled('view-materials', 'add')}
  className={getOpacityClass('view-materials', 'add')}
  onClick={withPermissionCheck('view-materials', 'add', handleAdd)}
>
  Add Material
</button>
```

## UI Behavior Enhancements

- Add a "Select All Modules" checkbox to toggle every module, sub-module, and action
- Maintain real-time checkbox hierarchy:
  - If all sub-modules under a module are ticked → auto-check the module
  - If all actions under a sub-module are ticked → show sub-module as fully checked
- Use indeterminate state (partial tick) when only some items are checked
- Ensure that once the checkbox is ticked and admin clicks the update settings, the ticked checkboxes are saved correctly and shown in previous saved update settings

## Best Practices

1. **Always use ProtectedRoute for route-level protection**
2. **Use PermissionButton for simple action buttons**
3. **Use useAccessControl hook for complex permission logic**
4. **Provide clear access denied messages to users**
5. **Test all permission combinations during development**

## Error Handling

The system gracefully handles permission errors by:
- Redirecting unauthorized users to appropriate pages
- Showing access denied modals for specific actions
- Disabling UI elements that require permissions
- Providing visual indicators (lock icons) for disabled actions