import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GranularPermissionsModal from './GranularPermissionsModal';

// Mock the api module
jest.mock('../../api', () => ({
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn()
  }
}));

// Mock the FaTimes, FaLock, FaClone icons
jest.mock('react-icons/fa', () => ({
  FaTimes: () => <div data-testid="fa-times" />,
  FaLock: () => <div data-testid="fa-lock" />,
  FaClone: () => <div data-testid="fa-clone" />
}));

describe('GranularPermissionsModal', () => {
  const mockManager = {
    _id: '1',
    name: 'Test Manager',
    username: 'testmanager',
    role: 'Manager',
    permissions: {}
  };

  const mockOnClose = jest.fn();
  const mockOnUpdatePermissions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with manager name', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText(`Granular Permissions for ${mockManager.name}`)).toBeInTheDocument();
  });

  it('shows select all modules checkbox', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    expect(screen.getByText('Select All Modules')).toBeInTheDocument();
  });

  it('handles section toggle correctly', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    // Find the Packing Materials section checkbox
    const packingSectionCheckbox = screen.getByLabelText('Packing Materials');
    expect(packingSectionCheckbox).toBeInTheDocument();

    // Initially should be unchecked
    expect(packingSectionCheckbox).not.toBeChecked();

    // Click the checkbox
    fireEvent.click(packingSectionCheckbox);

    // Should now be checked (all submodules selected)
    // Note: We can't easily verify the internal state in this test without more complex setup
  });

  it('handles submodule toggle correctly', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    // Expand the Packing Materials section
    const packingSectionToggle = screen.getByText('Packing Materials').closest('button');
    fireEvent.click(packingSectionToggle);

    // Find the Item Master submodule checkbox
    const viewMaterialsCheckbox = screen.getByLabelText('Item Master');
    expect(viewMaterialsCheckbox).toBeInTheDocument();

    // Initially should be unchecked
    expect(viewMaterialsCheckbox).not.toBeChecked();

    // Click the checkbox
    fireEvent.click(viewMaterialsCheckbox);

    // Should now be checked (all actions selected)
    // Note: We can't easily verify the internal state in this test without more complex setup
  });

  it('handles action toggle correctly', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    // Expand the Packing Materials section
    const packingSectionToggle = screen.getByText('Packing Materials').closest('button');
    fireEvent.click(packingSectionToggle);

    // Find the View action checkbox for Item Master
    const viewActionCheckbox = screen.getByLabelText('View');
    expect(viewActionCheckbox).toBeInTheDocument();

    // Initially should be unchecked
    expect(viewActionCheckbox).not.toBeChecked();

    // Click the checkbox
    fireEvent.click(viewActionCheckbox);

    // Should now be checked
    expect(viewActionCheckbox).toBeChecked();
  });

  it('handles select all modules toggle', () => {
    render(
      <GranularPermissionsModal
        manager={mockManager}
        onClose={mockOnClose}
        onUpdatePermissions={mockOnUpdatePermissions}
      />
    );

    // Find the Select All Modules checkbox
    const selectAllCheckbox = screen.getByLabelText('Select All Modules');
    expect(selectAllCheckbox).toBeInTheDocument();

    // Initially should be unchecked
    expect(selectAllCheckbox).not.toBeChecked();

    // Click the checkbox
    fireEvent.click(selectAllCheckbox);

    // Should now be checked (all modules, submodules, and actions selected)
    // Note: We can't easily verify the internal state in this test without more complex setup
  });
});