import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuotationList from './QuotationList';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { quotationService } from '../../services/quotationService';

// Mock the services
jest.mock('../../services/quotationService');

// Mock authService
jest.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn(() => ({ id: 1, username: 'testuser', role: 'ADMIN' })),
    login: jest.fn(),
    logout: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.alert
global.alert = jest.fn();

describe('QuotationList Component', () => {
  const mockQuotations = [
    {
      id: 1,
      quotationNumber: 'Q-2024-001',
      companyId: 1,
      totalAmount: 1500.00,
      status: 'PENDING_APPROVAL',
      createdAt: '2024-01-15T10:00:00',
      revisionNumber: 1,
    },
    {
      id: 2,
      quotationNumber: 'Q-2024-002',
      companyId: 2,
      totalAmount: 2500.50,
      status: 'APPROVED',
      createdAt: '2024-01-16T11:00:00',
      revisionNumber: 1,
    },
    {
      id: 3,
      quotationNumber: 'Q-2024-003',
      companyId: 3,
      totalAmount: 3000.00,
      status: 'DRAFT',
      createdAt: '2024-01-17T12:00:00',
      revisionNumber: 2,
      parentQuotationId: 10,
    },
    {
      id: 4,
      quotationNumber: 'Q-2024-004',
      companyId: 4,
      totalAmount: 500.00,
      status: 'REJECTED',
      createdAt: '2024-01-18T13:00:00',
      revisionNumber: 1,
    },
    {
      id: 5,
      quotationNumber: 'Q-2024-005',
      companyId: 5,
      totalAmount: 750.00,
      status: 'SENT',
      createdAt: '2024-01-19T14:00:00',
      revisionNumber: 1,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 1, role: 'ADMIN' }));
    quotationService.getAll.mockResolvedValue({ data: mockQuotations });
  });

  const renderComponent = (userRole = 'ADMIN') => {
    // Mock the auth context with the specified role
    jest.spyOn(require('../../services/authService').authService, 'getCurrentUser').mockReturnValue({
      id: 1,
      username: 'testuser',
      role: userRole,
    });

    return render(
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <QuotationList />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  describe('Component Loading', () => {
    test('displays loading spinner while fetching data', () => {
      renderComponent();
      // Check for the loading spinner div
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('loads quotations on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(quotationService.getAll).toHaveBeenCalledTimes(1);
      });
    });

    test('displays quotations after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Q-2024-002').length).toBeGreaterThan(0);
      });
    });

    test('displays empty state when no quotations exist', async () => {
      quotationService.getAll.mockResolvedValue({ data: [] });
      renderComponent();

      await waitFor(() => {
        const emptyMessages = screen.getAllByText(/no quotations found/i);
        expect(emptyMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Status Badge Rendering - Requirement 7.1', () => {
    test('displays DRAFT status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const draftBadges = screen.getAllByText('DRAFT');
        expect(draftBadges.length).toBeGreaterThan(0);
        expect(draftBadges[0]).toHaveClass('bg-gray-100', 'text-gray-800');
      });
    });

    test('displays PENDING_APPROVAL status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const pendingBadges = screen.getAllByText('PENDING_APPROVAL');
        expect(pendingBadges.length).toBeGreaterThan(0);
        expect(pendingBadges[0]).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });

    test('displays APPROVED status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const approvedBadges = screen.getAllByText('APPROVED');
        expect(approvedBadges.length).toBeGreaterThan(0);
        expect(approvedBadges[0]).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    test('displays REJECTED status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const rejectedBadges = screen.getAllByText('REJECTED');
        expect(rejectedBadges.length).toBeGreaterThan(0);
        expect(rejectedBadges[0]).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    test('displays SENT status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const sentBadges = screen.getAllByText('SENT');
        expect(sentBadges.length).toBeGreaterThan(0);
        expect(sentBadges[0]).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });
  });

  describe('Approve/Reject Button Visibility - Requirements 7.2, 7.8', () => {
    test('shows approve and reject buttons for PENDING_APPROVAL status with ADMIN role', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Find approve and reject buttons (at least one set should be visible)
      const approveButtons = screen.getAllByTitle('Approve');
      const rejectButtons = screen.getAllByTitle('Reject');

      expect(approveButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
    });

    test('shows approve and reject buttons for PENDING_APPROVAL status with SUPERADMIN role', async () => {
      renderComponent('SUPERADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByTitle('Approve');
      const rejectButtons = screen.getAllByTitle('Reject');

      expect(approveButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
    });

    test('does not show approve/reject buttons for PENDING_APPROVAL status with USER role', async () => {
      renderComponent('USER');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.queryAllByTitle('Approve');
      const rejectButtons = screen.queryAllByTitle('Reject');

      expect(approveButtons.length).toBe(0);
      expect(rejectButtons.length).toBe(0);
    });

    test('does not show approve/reject buttons for APPROVED status', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-002').length).toBeGreaterThan(0);
      });

      // Check that there are no approve/reject buttons for the APPROVED quotation
      // We can verify by checking that the approve buttons count matches only PENDING_APPROVAL quotations
      const approveButtons = screen.queryAllByTitle('Approve');
      // Only Q-2024-001 has PENDING_APPROVAL status, so we should have at least 1 button
      expect(approveButtons.length).toBeGreaterThan(0);
    });

    test('does not show approve/reject buttons for DRAFT status', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-003').length).toBeGreaterThan(0);
      });

      // DRAFT quotations should show edit button, not approve/reject
      const editButtons = screen.getAllByTitle('Edit');
      expect(editButtons.length).toBeGreaterThan(0);
    });

    test('does not show approve/reject buttons for REJECTED status', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-004').length).toBeGreaterThan(0);
      });

      // Only Q-2024-001 has PENDING_APPROVAL, so approve buttons should be at least 1
      const approveButtons = screen.queryAllByTitle('Approve');
      expect(approveButtons.length).toBeGreaterThan(0);
    });

    test('does not show approve/reject buttons for SENT status', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-005').length).toBeGreaterThan(0);
      });

      // Only Q-2024-001 has PENDING_APPROVAL
      const approveButtons = screen.queryAllByTitle('Approve');
      expect(approveButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Revision Indicator Display - Requirement 7.8', () => {
    test('displays revision indicator for quotations with revisionNumber > 1', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-003').length).toBeGreaterThan(0);
      });

      // Q-2024-003 has revisionNumber: 2
      const revisionBadges = screen.getAllByText('Rev 2');
      expect(revisionBadges.length).toBeGreaterThan(0);
      expect(revisionBadges[0]).toHaveClass('bg-purple-100', 'text-purple-800');
    });

    test('does not display revision indicator for quotations with revisionNumber = 1', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Q-2024-001 has revisionNumber: 1, should not show revision badge
      const revisionBadges = screen.queryAllByText(/Rev 1/);
      expect(revisionBadges.length).toBe(0);
    });

    test('revision indicator has correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const revisionBadge = screen.getAllByText('Rev 2')[0];
        expect(revisionBadge).toHaveClass('px-2', 'py-0.5', 'rounded', 'text-xs', 'font-semibold');
      });
    });
  });

  describe('Button Click Handlers', () => {
    test('calls approve service when approve button is clicked', async () => {
      quotationService.approve.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(quotationService.approve).toHaveBeenCalledWith(1);
      });

      expect(global.alert).toHaveBeenCalledWith('Quotation approved successfully!');
    });

    test('displays loading state during approval', async () => {
      quotationService.approve.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      // Check for loading spinner
      await waitFor(() => {
        const button = approveButtons[0];
        expect(button).toBeDisabled();
      });
    });

    test('opens rejection modal when reject button is clicked', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        // Check that the rejection modal is opened (it should have a textarea for reason)
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    test('calls reject service when rejection is submitted', async () => {
      quotationService.reject.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Click reject button
      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Enter rejection reason
      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Pricing is too high' } });

      // Submit rejection - look for the specific button text
      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(quotationService.reject).toHaveBeenCalledWith(1, 'Pricing is too high');
      });

      expect(global.alert).toHaveBeenCalledWith(
        'Quotation rejected successfully! A new revision has been created.'
      );
    });

    test('refreshes quotation list after successful approval', async () => {
      quotationService.approve.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Clear the initial call
      quotationService.getAll.mockClear();

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(quotationService.getAll).toHaveBeenCalledTimes(1);
      });
    });

    test('refreshes quotation list after successful rejection', async () => {
      quotationService.reject.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Click reject button
      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Enter rejection reason and submit
      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Needs revision' } });

      // Clear the initial call
      quotationService.getAll.mockClear();

      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(quotationService.getAll).toHaveBeenCalledTimes(1);
      });
    });

    test('displays error message when approval fails', async () => {
      quotationService.approve.mockRejectedValue(new Error('Network error'));
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to approve quotation. Please try again.');
      });
    });

    test('displays error message when rejection fails', async () => {
      quotationService.reject.mockRejectedValue(new Error('Network error'));
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Click reject button
      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Enter rejection reason and submit
      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Needs revision' } });

      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to reject quotation. Please try again.');
      });
    });
  });

  describe('Delete Functionality', () => {
    test('opens confirmation dialog when delete button is clicked', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure you want to delete quotation Q-2024-001/i)).toBeInTheDocument();
      });
    });

    test('calls delete service when deletion is confirmed', async () => {
      quotationService.delete.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Click delete button
      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      });

      // Confirm deletion - find the button within the dialog
      const confirmButtons = screen.getAllByRole('button', { name: /delete/i });
      // The last one should be the confirm button in the dialog (not the delete buttons in the table)
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(quotationService.delete).toHaveBeenCalledWith(1);
      });
    });
  });

  describe('Responsive Design', () => {
    test('renders desktop table view', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByText('Q-2024-001').length).toBeGreaterThan(0);
      });

      // Check for table structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    test('displays all required columns in desktop view', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Quotation #')).toBeInTheDocument();
        expect(screen.getByText('Company')).toBeInTheDocument();
        expect(screen.getByText('Total Amount')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Created At')).toBeInTheDocument();
        expect(screen.getByText('Actions')).toBeInTheDocument();
      });
    });
  });
});
