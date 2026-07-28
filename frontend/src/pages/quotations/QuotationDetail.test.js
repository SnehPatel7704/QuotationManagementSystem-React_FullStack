import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuotationDetail from './QuotationDetail';
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
const mockParams = { id: '1' };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'mock-token'),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.alert
global.alert = jest.fn();

// Mock fetch for PDF export
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('QuotationDetail Component', () => {
  const mockQuotation = {
    id: 1,
    quotationNumber: 'Q-2024-001',
    companyId: 1,
    companyName: 'Acme Corporation',
    totalAmount: 1500.00,
    status: 'PENDING_APPROVAL',
    createdAt: '2024-01-15T10:00:00',
    updatedAt: '2024-01-16T11:00:00',
    creatorName: 'John Doe',
    approverName: null,
    followUpDate: '2024-02-15',
    revisionNumber: 1,
    parentQuotationId: null,
    rejectionReason: null,
    items: [
      {
        id: 1,
        productId: 1,
        productName: 'Product A',
        quantity: 10,
        unitPrice: 50.00,
      },
      {
        id: 2,
        productId: 2,
        productName: 'Product B',
        quantity: 20,
        unitPrice: 50.00,
      },
    ],
    revisions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    quotationService.getById.mockResolvedValue({ data: mockQuotation });
  });

  const renderComponent = (userRole = 'ADMIN') => {
    jest.spyOn(require('../../services/authService').authService, 'getCurrentUser').mockReturnValue({
      id: 1,
      username: 'testuser',
      role: userRole,
    });

    return render(
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <QuotationDetail />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  describe('Component Loading', () => {
    test('displays loading spinner while fetching data', () => {
      renderComponent();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('loads quotation on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(quotationService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays quotation not found message when quotation is null', async () => {
      quotationService.getById.mockResolvedValue({ data: null });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Quotation not found')).toBeInTheDocument();
      });
    });

    test('navigates to quotations list on load error', async () => {
      quotationService.getById.mockRejectedValue(new Error('Not found'));
      renderComponent();

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to load quotation details');
        expect(mockNavigate).toHaveBeenCalledWith('/quotations');
      });
    });
  });

  describe('Data Display - Requirements 7.9, 7.10', () => {
    test('displays quotation number', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });
    });

    test('displays company name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
      });
    });

    test('displays total amount', async () => {
      renderComponent();

      await waitFor(() => {
        const amounts = screen.getAllByText('$1500.00');
        expect(amounts.length).toBeGreaterThan(0);
      });
    });

    test('displays status badge', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('PENDING_APPROVAL')).toBeInTheDocument();
      });
    });

    test('displays created at date', async () => {
      renderComponent();

      await waitFor(() => {
        const createdDate = new Date('2024-01-15T10:00:00').toLocaleString();
        expect(screen.getByText(createdDate)).toBeInTheDocument();
      });
    });

    test('displays updated at date', async () => {
      renderComponent();

      await waitFor(() => {
        const updatedDate = new Date('2024-01-16T11:00:00').toLocaleString();
        expect(screen.getByText(updatedDate)).toBeInTheDocument();
      });
    });

    test('displays creator name', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    test('displays follow-up date', async () => {
      renderComponent();

      await waitFor(() => {
        const followUpDate = new Date('2024-02-15').toLocaleDateString();
        expect(screen.getByText(followUpDate)).toBeInTheDocument();
      });
    });

    test('highlights overdue follow-up date in red', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const quotationWithPastDate = {
        ...mockQuotation,
        followUpDate: pastDate.toISOString().split('T')[0],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithPastDate });
      renderComponent();

      await waitFor(() => {
        const followUpElement = screen.getByText(/Overdue/i).parentElement;
        expect(followUpElement).toHaveClass('text-red-600');
      });
    });

    test('displays items table with product names', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Product A')).toBeInTheDocument();
        expect(screen.getByText('Product B')).toBeInTheDocument();
      });
    });

    test('displays item quantities', async () => {
      renderComponent();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toHaveTextContent('10');
        expect(table).toHaveTextContent('20');
      });
    });

    test('displays item unit prices', async () => {
      renderComponent();

      await waitFor(() => {
        const prices = screen.getAllByText('$50.00');
        expect(prices.length).toBeGreaterThan(0);
      });
    });

    test('displays calculated item totals', async () => {
      renderComponent();

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toHaveTextContent('$500.00'); // 10 * 50
        expect(table).toHaveTextContent('$1000.00'); // 20 * 50
      });
    });

    test('displays no items message when items array is empty', async () => {
      const quotationWithNoItems = { ...mockQuotation, items: [] };
      quotationService.getById.mockResolvedValue({ data: quotationWithNoItems });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('No items found')).toBeInTheDocument();
      });
    });

    test('displays company ID when company name is not available', async () => {
      const quotationWithoutCompanyName = { ...mockQuotation, companyName: null };
      quotationService.getById.mockResolvedValue({ data: quotationWithoutCompanyName });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Company ID: 1')).toBeInTheDocument();
      });
    });

    test('displays product ID when product name is not available', async () => {
      const quotationWithoutProductName = {
        ...mockQuotation,
        items: [{ id: 1, productId: 1, productName: null, quantity: 10, unitPrice: 50.00 }],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithoutProductName });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Product ID: 1')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Rendering Based on Status - Requirement 20.1', () => {
    test('shows approve and reject buttons for PENDING_APPROVAL status with ADMIN role', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });
    });

    test('shows approve and reject buttons for PENDING_APPROVAL status with SUPERADMIN role', async () => {
      renderComponent('SUPERADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });
    });

    test('does not show approve/reject buttons for PENDING_APPROVAL status with USER role', async () => {
      renderComponent('USER');

      await waitFor(() => {
        expect(screen.queryByText('Approve')).not.toBeInTheDocument();
        expect(screen.queryByText('Reject')).not.toBeInTheDocument();
      });
    });

    test('does not show approve/reject buttons for APPROVED status', async () => {
      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.queryByText('Approve')).not.toBeInTheDocument();
        expect(screen.queryByText('Reject')).not.toBeInTheDocument();
      });
    });

    test('shows Export PDF button for APPROVED status', async () => {
      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });
    });

    test('shows Export PDF button for SENT status', async () => {
      const sentQuotation = { ...mockQuotation, status: 'SENT' };
      quotationService.getById.mockResolvedValue({ data: sentQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });
    });

    test('does not show Export PDF button for PENDING_APPROVAL status', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('Export PDF')).not.toBeInTheDocument();
      });
    });

    test('does not show Export PDF button for DRAFT status', async () => {
      const draftQuotation = { ...mockQuotation, status: 'DRAFT' };
      quotationService.getById.mockResolvedValue({ data: draftQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('Export PDF')).not.toBeInTheDocument();
      });
    });

    test('displays rejection reason alert for REJECTED status', async () => {
      const rejectedQuotation = {
        ...mockQuotation,
        status: 'REJECTED',
        rejectionReason: 'Pricing is too high',
      };
      quotationService.getById.mockResolvedValue({ data: rejectedQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Rejection Reason')).toBeInTheDocument();
        expect(screen.getByText('Pricing is too high')).toBeInTheDocument();
      });
    });

    test('does not display rejection reason alert for non-REJECTED status', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('Rejection Reason')).not.toBeInTheDocument();
      });
    });

    test('displays revision number badge when revisionNumber > 1', async () => {
      const revisionQuotation = { ...mockQuotation, revisionNumber: 3 };
      quotationService.getById.mockResolvedValue({ data: revisionQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Revision 3')).toBeInTheDocument();
      });
    });

    test('does not display revision number badge when revisionNumber = 1', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText(/Revision \d+/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Revision History Display - Requirement 20.2', () => {
    test('displays parent quotation link when parentQuotationId exists', async () => {
      const childQuotation = { ...mockQuotation, parentQuotationId: 10 };
      quotationService.getById.mockResolvedValue({ data: childQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Revision History')).toBeInTheDocument();
        expect(screen.getByText('Parent Quotation')).toBeInTheDocument();
        expect(screen.getByText('View Original')).toBeInTheDocument();
      });
    });

    test('does not display parent quotation section when parentQuotationId is null', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('Parent Quotation')).not.toBeInTheDocument();
      });
    });

    test('displays child revisions when revisions array has items', async () => {
      const quotationWithRevisions = {
        ...mockQuotation,
        revisions: [
          {
            id: 2,
            revisionNumber: 2,
            status: 'DRAFT',
            createdAt: '2024-01-17T10:00:00',
          },
          {
            id: 3,
            revisionNumber: 3,
            status: 'PENDING_APPROVAL',
            createdAt: '2024-01-18T10:00:00',
          },
        ],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithRevisions });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Revisions')).toBeInTheDocument();
        expect(screen.getByText('Revision 2')).toBeInTheDocument();
        expect(screen.getByText('Revision 3')).toBeInTheDocument();
      });
    });

    test('displays revision status badges in revision list', async () => {
      const quotationWithRevisions = {
        ...mockQuotation,
        revisions: [
          {
            id: 2,
            revisionNumber: 2,
            status: 'DRAFT',
            createdAt: '2024-01-17T10:00:00',
          },
        ],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithRevisions });
      renderComponent();

      await waitFor(() => {
        const draftBadges = screen.getAllByText('DRAFT');
        expect(draftBadges.length).toBeGreaterThan(0);
      });
    });

    test('displays revision creation dates', async () => {
      const quotationWithRevisions = {
        ...mockQuotation,
        revisions: [
          {
            id: 2,
            revisionNumber: 2,
            status: 'DRAFT',
            createdAt: '2024-01-17T10:00:00',
          },
        ],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithRevisions });
      renderComponent();

      await waitFor(() => {
        const revisionDate = new Date('2024-01-17T10:00:00').toLocaleDateString();
        expect(screen.getByText(revisionDate)).toBeInTheDocument();
      });
    });

    test('does not display revisions section when revisions array is empty', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.queryByText('Revisions')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Links - Requirement 20.2', () => {
    test('parent quotation link navigates to correct URL', async () => {
      const childQuotation = { ...mockQuotation, parentQuotationId: 10 };
      quotationService.getById.mockResolvedValue({ data: childQuotation });
      renderComponent();

      await waitFor(() => {
        const link = screen.getByText('View Original').closest('a');
        expect(link).toHaveAttribute('href', '/quotations/10');
      });
    });

    test('child revision links navigate to correct URLs', async () => {
      const quotationWithRevisions = {
        ...mockQuotation,
        revisions: [
          {
            id: 2,
            revisionNumber: 2,
            status: 'DRAFT',
            createdAt: '2024-01-17T10:00:00',
          },
          {
            id: 3,
            revisionNumber: 3,
            status: 'PENDING_APPROVAL',
            createdAt: '2024-01-18T10:00:00',
          },
        ],
      };
      quotationService.getById.mockResolvedValue({ data: quotationWithRevisions });
      renderComponent();

      await waitFor(() => {
        const revision2Link = screen.getByText('Revision 2').closest('a');
        const revision3Link = screen.getByText('Revision 3').closest('a');
        expect(revision2Link).toHaveAttribute('href', '/quotations/2');
        expect(revision3Link).toHaveAttribute('href', '/quotations/3');
      });
    });

    test('back button exists and is clickable', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      // Find the back button by looking for the button with FiArrowLeft icon (polyline element)
      const buttons = screen.getAllByRole('button');
      const backButton = buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && svg.querySelector('polyline');
      });
      
      expect(backButton).toBeDefined();
      expect(backButton).toBeInTheDocument();
      
      // Verify button is clickable
      fireEvent.click(backButton);
      
      // Verify navigate was called (the actual path may vary due to auth context)
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('Action Handlers', () => {
    test('calls approve service when approve button is clicked', async () => {
      quotationService.approve.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(quotationService.approve).toHaveBeenCalledWith('1');
      });

      expect(global.alert).toHaveBeenCalledWith('Quotation approved successfully!');
    });

    test('displays loading state during approval', async () => {
      quotationService.approve.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Approving...')).toBeInTheDocument();
      });
    });

    test('reloads quotation after successful approval', async () => {
      quotationService.approve.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      quotationService.getById.mockClear();

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(quotationService.getById).toHaveBeenCalledWith('1');
      });
    });

    test('displays error message when approval fails', async () => {
      quotationService.approve.mockRejectedValue(new Error('Network error'));
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to approve quotation. Please try again.');
      });
    });

    test('opens rejection modal when reject button is clicked', async () => {
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    test('calls reject service when rejection is submitted', async () => {
      quotationService.reject.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Pricing is too high' } });

      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(quotationService.reject).toHaveBeenCalledWith('1', 'Pricing is too high');
      });

      expect(global.alert).toHaveBeenCalledWith(
        'Quotation rejected successfully! A new revision has been created.'
      );
    });

    test('navigates to quotations list after successful rejection', async () => {
      quotationService.reject.mockResolvedValue({ success: true });
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Needs revision' } });

      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/quotations');
      });
    });

    test('displays error message when rejection fails', async () => {
      quotationService.reject.mockRejectedValue(new Error('Network error'));
      renderComponent('ADMIN');

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });

      const rejectButton = screen.getByText('Reject');
      fireEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const reasonInput = screen.getByRole('textbox');
      fireEvent.change(reasonInput, { target: { value: 'Needs revision' } });

      const submitButton = screen.getByRole('button', { name: /reject quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to reject quotation. Please try again.');
      });
    });

    test('exports PDF when Export PDF button is clicked', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      global.fetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8080/api/quotations/1/pdf',
          expect.objectContaining({
            method: 'GET',
            headers: {
              Authorization: 'Bearer mock-token',
            },
          })
        );
      });

      expect(global.alert).toHaveBeenCalledWith('PDF exported successfully!');
    });

    test('displays loading state during PDF export', async () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      global.fetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
        }), 100))
      );

      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Exporting...')).toBeInTheDocument();
      });
    });

    test('displays error message when PDF export fails', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
      });

      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Export PDF')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export PDF');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Failed to export PDF. Please try again.');
      });
    });
  });

  describe('Status Badge Styling', () => {
    test('displays DRAFT status badge with correct styling', async () => {
      const draftQuotation = { ...mockQuotation, status: 'DRAFT' };
      quotationService.getById.mockResolvedValue({ data: draftQuotation });
      renderComponent();

      await waitFor(() => {
        const badge = screen.getByText('DRAFT');
        expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
      });
    });

    test('displays PENDING_APPROVAL status badge with correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const badge = screen.getByText('PENDING_APPROVAL');
        expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      });
    });

    test('displays APPROVED status badge with correct styling', async () => {
      const approvedQuotation = { ...mockQuotation, status: 'APPROVED' };
      quotationService.getById.mockResolvedValue({ data: approvedQuotation });
      renderComponent();

      await waitFor(() => {
        const badge = screen.getByText('APPROVED');
        expect(badge).toHaveClass('bg-green-100', 'text-green-800');
      });
    });

    test('displays REJECTED status badge with correct styling', async () => {
      const rejectedQuotation = { ...mockQuotation, status: 'REJECTED', rejectionReason: 'Test' };
      quotationService.getById.mockResolvedValue({ data: rejectedQuotation });
      renderComponent();

      await waitFor(() => {
        const badge = screen.getByText('REJECTED');
        expect(badge).toHaveClass('bg-red-100', 'text-red-800');
      });
    });

    test('displays SENT status badge with correct styling', async () => {
      const sentQuotation = { ...mockQuotation, status: 'SENT' };
      quotationService.getById.mockResolvedValue({ data: sentQuotation });
      renderComponent();

      await waitFor(() => {
        const badge = screen.getByText('SENT');
        expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });
  });
});
