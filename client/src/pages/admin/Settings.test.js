import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Settings from './Settings';
import api from '../../api';

// Mock the api module
jest.mock('../../api');

// Mock the FaTimes, FaLock, FaClone, FaSearch, FaUserLock icons
jest.mock('react-icons/fa', () => ({
  FaBoxOpen: () => <div data-testid="fa-box-open" />,
  FaWarehouse: () => <div data-testid="fa-warehouse" />,
  FaBox: () => <div data-testid="fa-box" />,
  FaTimes: () => <div data-testid="fa-times" />,
  FaUserLock: () => <div data-testid="fa-user-lock" />,
  FaSearch: () => <div data-testid="fa-search" />
}));

// Mock the AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'Admin' }
  })
}));

// Mock the Card component
jest.mock('../../components/common/Card', () => {
  return ({ children }) => <div data-testid="card">{children}</div>;
});

// Mock the AccessDisabledModal component
jest.mock('../../components/common/AccessDisabledModal', () => {
  return () => <div data-testid="access-disabled-modal" />;
});

// Mock the useAccessDisabled hook
jest.mock('../../hooks/useAccessDisabled', () => {
  return () => ({
    isAccessDisabledOpen: false,
    accessDisabledMessage: '',
    hideAccessDisabled: jest.fn()
  });
});

describe('Settings - Module Access', () => {
  const mockManager = {
    _id: '1',
    name: 'Test Manager',
    username: 'testmanager',
    role: 'Manager',
    permissions: {}
  };

  const mockModuleAccessData = {
    moduleAccess: [],
    permissions: {
      'view-materials': {
        view: true,
        edit: true,
        add: false,
        delete: false,
        'view-report': false
      },
      'outgoing-materials': {
        'record-usage': false,
        'view-report': false
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and displays manager permissions correctly', async () => {
    // Mock API calls
    api.get.mockImplementation((url) => {
      if (url === '/settings/managers') {
        return Promise.resolve({ data: [mockManager] });
      }
      if (url === `/settings/managers/${mockManager._id}/module-access`) {
        return Promise.resolve({ data: mockModuleAccessData });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(<Settings />);

    // Wait for managers to load
    expect(await screen.findByText('Test Manager')).toBeInTheDocument();

    // Click on the manager to open module access modal
    fireEvent.click(screen.getByText('Test Manager'));

    // Wait for permissions to load
    expect(await screen.findByText('Module Access for Test Manager')).toBeInTheDocument();

    // Check that the correct permissions are displayed
    expect(screen.getByLabelText('Item Master')).toBeChecked();
    expect(screen.getByLabelText('View')).toBeChecked();
    expect(screen.getByLabelText('Edit')).toBeChecked();
    expect(screen.getByLabelText('Add')).not.toBeChecked();
  });

  it('saves manager permissions correctly', async () => {
    // Mock API calls
    api.get.mockImplementation((url) => {
      if (url === '/settings/managers') {
        return Promise.resolve({ data: [mockManager] });
      }
      if (url === `/settings/managers/${mockManager._id}/module-access`) {
        return Promise.resolve({ data: mockModuleAccessData });
      }
      return Promise.reject(new Error('Not found'));
    });

    api.put.mockImplementation((url) => {
      if (url === `/settings/managers/${mockManager._id}/module-access`) {
        return Promise.resolve({ data: { ...mockManager, ...mockModuleAccessData } });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(<Settings />);

    // Wait for managers to load
    expect(await screen.findByText('Test Manager')).toBeInTheDocument();

    // Click on the manager to open module access modal
    fireEvent.click(screen.getByText('Test Manager'));

    // Wait for permissions to load
    expect(await screen.findByText('Module Access for Test Manager')).toBeInTheDocument();

    // Modify a permission
    const addCheckbox = screen.getByLabelText('Add');
    fireEvent.click(addCheckbox);

    // Click update settings
    fireEvent.click(screen.getByText('Update Settings'));

    // Check that API was called with correct data
    expect(api.put).toHaveBeenCalledWith(
      `/settings/managers/${mockManager._id}/module-access`,
      {
        moduleAccess: [],
        permissions: {
          'view-materials': {
            view: true,
            edit: true,
            add: true, // This should now be true
            delete: false,
            'view-report': false
          },
          'outgoing-materials': {
            'record-usage': false,
            'view-report': false
          }
        }
      }
    );

    // Check for success message
    expect(await screen.findByText('Module access settings updated successfully!')).toBeInTheDocument();
  });
});