import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PermissionAction from './PermissionAction';

// Mock the hooks
jest.mock('../../hooks/useAccessControl', () => ({
  __esModule: true,
  default: () => ({
    checkPermission: jest.fn(),
    isDisabled: jest.fn(),
    getOpacityClass: jest.fn(),
    isActionVisibleButDisabled: jest.fn()
  })
}));

jest.mock('../../hooks/useAccessDisabled', () => ({
  __esModule: true,
  default: () => ({
    showAccessDisabled: jest.fn()
  })
}));

describe('PermissionAction', () => {
  const mockCheckPermission = require('../../hooks/useAccessControl').default().checkPermission;
  const mockIsDisabled = require('../../hooks/useAccessControl').default().isDisabled;
  const mockGetOpacityClass = require('../../hooks/useAccessControl').default().getOpacityClass;
  const mockIsActionVisibleButDisabled = require('../../hooks/useAccessControl').default().isActionVisibleButDisabled;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with children when user has permission', () => {
    mockCheckPermission.mockReturnValue(true);
    mockIsDisabled.mockReturnValue(false);
    mockGetOpacityClass.mockReturnValue('');
    mockIsActionVisibleButDisabled.mockReturnValue(false);

    render(
      <PermissionAction moduleId="view-materials" action="edit">
        Edit Material
      </PermissionAction>
    );

    expect(screen.getByText('Edit Material')).toBeInTheDocument();
    expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();
  });

  it('renders with lock icon when user does not have permission but action is visible', () => {
    mockCheckPermission.mockReturnValue(false);
    mockIsDisabled.mockReturnValue(true);
    mockGetOpacityClass.mockReturnValue('opacity-50');
    mockIsActionVisibleButDisabled.mockReturnValue(true);

    render(
      <PermissionAction moduleId="view-materials" action="edit">
        Edit Material
      </PermissionAction>
    );

    expect(screen.getByText('Edit Material')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('opacity-50');
    // Check for lock icon SVG
    expect(screen.getByRole('button')).toContainHTML('svg');
  });

  it('renders disabled button when user does not have permission', () => {
    mockCheckPermission.mockReturnValue(false);
    mockIsDisabled.mockReturnValue(true);
    mockGetOpacityClass.mockReturnValue('opacity-50');
    mockIsActionVisibleButDisabled.mockReturnValue(true);

    render(
      <PermissionAction moduleId="view-materials" action="edit">
        Edit Material
      </PermissionAction>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });
});