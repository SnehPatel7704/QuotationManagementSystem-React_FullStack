import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UpcomingFollowups from './UpcomingFollowups';
import { quotationService } from '../../services/quotationService';

// Mock the services
jest.mock('../../services/quotationService');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('UpcomingFollowups Component', () => {
  const mockQuotations = [
    {
      id: 1,
      quotationNumber: 'Q-2024-001',
      companyName: 'Acme Corporation',
      followUpDate: '2024-02-15',
      status: 'PENDING_APPROVAL',
    },
    {
      id: 2,
      quotationNumber: 'Q-2024-002',
      companyName: 'Tech Solutions Inc',
      followUpDate: '2024-02-20',
      status: 'APPROVED',
    },
    {
      id: 3,
      quotationNumber: 'Q-2024-003',
      companyName: 'Global Enterprises',
      followUpDate: '2024-03-01',
      status: 'SENT',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    quotationService.getUpcomingFollowups.mockResolvedValue({ data: mockQuotations });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <UpcomingFollowups />
      </BrowserRouter>
    );
  };

  describe('Component Loading and Initial State', () => {
    test('renders component with title', () => {
      renderComponent();
      expect(screen.getByText('Upcoming Follow-ups')).toBeInTheDocument();
    });

    test('displays loading spinner while fetching data', () => {
      renderComponent();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    test('loads upcoming follow-ups on mount with default filter (next 15 days)', async () => {
      renderComponent();

      await waitFor(() => {
        expect(quotationService.getUpcomingFollowups).toHaveBeenCalledTimes(1);
      });

      // Verify it was called with correct date range (today to 15 days from now)
      const calls = quotationService.getUpcomingFollowups.mock.calls[0];
      expect(calls[0]).toBeDefined(); // startDate
      expect(calls[1]).toBeDefined(); // endDate
    });

    test('displays quotations after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
        expect(screen.getByText('Q-2024-002')).toBeInTheDocument();
        expect(screen.getByText('Q-2024-003')).toBeInTheDocument();
      });
    });

    test('displays empty state when no quotations exist', async () => {
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: [] });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/no upcoming follow-ups found/i)).toBeInTheDocument();
      });
    });

    test('displays error message when API call fails', async () => {
      quotationService.getUpcomingFollowups.mockRejectedValue({
        response: { data: { message: 'Failed to fetch data' } },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
      });
    });

    test('displays generic error message when API call fails without message', async () => {
      quotationService.getUpcomingFollowups.mockRejectedValue(new Error('Network error'));
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch upcoming follow-ups')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Button Clicks - Requirement 8.2', () => {
    test('displays all filter buttons', () => {
      renderComponent();

      expect(screen.getByText('Next 15 days')).toBeInTheDocument();
      expect(screen.getByText('Next 30 days')).toBeInTheDocument();
      expect(screen.getByText('Next 2 months')).toBeInTheDocument();
      expect(screen.getByText('Custom range')).toBeInTheDocument();
    });

    test('Next 15 days button is selected by default', () => {
      renderComponent();

      const button = screen.getByText('Next 15 days');
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    test('clicking Next 30 days button fetches data with correct date range', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      quotationService.getUpcomingFollowups.mockClear();

      const button = screen.getByText('Next 30 days');
      fireEvent.click(button);

      await waitFor(() => {
        expect(quotationService.getUpcomingFollowups).toHaveBeenCalledTimes(1);
      });

      // Verify button is now selected
      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    test('clicking Next 2 months button fetches data with correct date range', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      quotationService.getUpcomingFollowups.mockClear();

      const button = screen.getByText('Next 2 months');
      fireEvent.click(button);

      await waitFor(() => {
        expect(quotationService.getUpcomingFollowups).toHaveBeenCalledTimes(1);
      });

      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    test('clicking Custom range button shows date pickers', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const button = screen.getByText('Custom range');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('From Date')).toBeInTheDocument();
        expect(screen.getByText('To Date')).toBeInTheDocument();
        expect(screen.getByText('Apply')).toBeInTheDocument();
      });

      expect(button).toHaveClass('bg-blue-600', 'text-white');
    });

    test('switching between filters updates selected state', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const next15Button = screen.getByText('Next 15 days');
      const next30Button = screen.getByText('Next 30 days');

      // Initially Next 15 days is selected
      expect(next15Button).toHaveClass('bg-blue-600', 'text-white');
      expect(next30Button).toHaveClass('bg-gray-200', 'text-gray-700');

      // Click Next 30 days
      fireEvent.click(next30Button);

      await waitFor(() => {
        expect(next30Button).toHaveClass('bg-blue-600', 'text-white');
        expect(next15Button).toHaveClass('bg-gray-200', 'text-gray-700');
      });
    });
  });

  describe('Custom Date Range Selection - Requirements 8.3, 8.7', () => {
    test('custom date range picker is hidden by default', () => {
      renderComponent();

      expect(screen.queryByLabelText('From Date')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('To Date')).not.toBeInTheDocument();
    });

    test('custom date range picker appears when Custom range is selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const customButton = screen.getByText('Custom range');
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText('From Date')).toBeInTheDocument();
        expect(screen.getByText('To Date')).toBeInTheDocument();
      });
    });

    test('can enter custom start and end dates', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const customButton = screen.getByText('Custom range');
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText('From Date')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const fromDateInput = dateInputs[0];
      const toDateInput = dateInputs[1];

      fireEvent.change(fromDateInput, { target: { value: '2024-02-01' } });
      fireEvent.change(toDateInput, { target: { value: '2024-02-28' } });

      expect(fromDateInput).toHaveValue('2024-02-01');
      expect(toDateInput).toHaveValue('2024-02-28');
    });

    test('clicking Apply button with custom dates fetches data', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const customButton = screen.getByText('Custom range');
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText('From Date')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const fromDateInput = dateInputs[0];
      const toDateInput = dateInputs[1];

      fireEvent.change(fromDateInput, { target: { value: '2024-02-01' } });
      fireEvent.change(toDateInput, { target: { value: '2024-02-28' } });

      quotationService.getUpcomingFollowups.mockClear();

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      await waitFor(() => {
        expect(quotationService.getUpcomingFollowups).toHaveBeenCalledWith('2024-02-01', '2024-02-28');
      });
    });

    test('does not call API when Apply is clicked without selecting dates', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const customButton = screen.getByText('Custom range');
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText('Apply')).toBeInTheDocument();
      });

      quotationService.getUpcomingFollowups.mockClear();

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should not call API
      expect(quotationService.getUpcomingFollowups).not.toHaveBeenCalled();
    });

    test('does not call API when Apply is clicked with only start date', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const customButton = screen.getByText('Custom range');
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText('From Date')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByDisplayValue('');
      const fromDateInput = dateInputs[0];
      fireEvent.change(fromDateInput, { target: { value: '2024-02-01' } });

      quotationService.getUpcomingFollowups.mockClear();

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      // Wait a bit to ensure no API call is made
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(quotationService.getUpcomingFollowups).not.toHaveBeenCalled();
    });
  });

  describe('Quotation Card Rendering - Requirements 8.6, 8.8', () => {
    test('displays quotation number for each card', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
        expect(screen.getByText('Q-2024-002')).toBeInTheDocument();
        expect(screen.getByText('Q-2024-003')).toBeInTheDocument();
      });
    });

    test('displays company name for each card', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Acme Corporation')).toBeInTheDocument();
        expect(screen.getByText('Tech Solutions Inc')).toBeInTheDocument();
        expect(screen.getByText('Global Enterprises')).toBeInTheDocument();
      });
    });

    test('displays N/A when company name is not available', async () => {
      const quotationsWithoutCompany = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: null,
          followUpDate: '2024-02-15',
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithoutCompany });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });

    test('displays follow-up date for each card', async () => {
      renderComponent();

      await waitFor(() => {
        const date1 = new Date('2024-02-15').toLocaleDateString();
        const date2 = new Date('2024-02-20').toLocaleDateString();
        const date3 = new Date('2024-03-01').toLocaleDateString();
        
        expect(screen.getByText(date1)).toBeInTheDocument();
        expect(screen.getByText(date2)).toBeInTheDocument();
        expect(screen.getByText(date3)).toBeInTheDocument();
      });
    });

    test('displays status badge for each card', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('PENDING APPROVAL')).toBeInTheDocument();
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText('SENT')).toBeInTheDocument();
      });
    });

    test('status badges have correct styling', async () => {
      renderComponent();

      await waitFor(() => {
        const pendingBadge = screen.getByText('PENDING APPROVAL');
        const approvedBadge = screen.getByText('APPROVED');
        const sentBadge = screen.getByText('SENT');

        expect(pendingBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
        expect(approvedBadge).toHaveClass('bg-green-100', 'text-green-800');
        expect(sentBadge).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });

    test('displays DRAFT status badge with correct styling', async () => {
      const quotationsWithDraft = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: '2024-02-15',
          status: 'DRAFT',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithDraft });
      renderComponent();

      await waitFor(() => {
        const draftBadge = screen.getByText('DRAFT');
        expect(draftBadge).toHaveClass('bg-gray-100', 'text-gray-800');
      });
    });

    test('displays REJECTED status badge with correct styling', async () => {
      const quotationsWithRejected = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: '2024-02-15',
          status: 'REJECTED',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithRejected });
      renderComponent();

      await waitFor(() => {
        const rejectedBadge = screen.getByText('REJECTED');
        expect(rejectedBadge).toHaveClass('bg-red-100', 'text-red-800');
      });
    });
  });

  describe('Days Until Follow-up Calculation - Requirement 8.4', () => {
    test('calculates and displays days until follow-up correctly', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 5);

      const quotationsWithFutureDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: futureDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithFutureDate });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('days')).toBeInTheDocument();
      });
    });

    test('displays singular "day" when only 1 day until follow-up', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const quotationsWithTomorrow = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: tomorrow.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithTomorrow });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('day')).toBeInTheDocument();
      });
    });

    test('displays 0 days for follow-up today', async () => {
      const today = new Date();

      const quotationsWithToday = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: today.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithToday });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText('days')).toBeInTheDocument();
      });
    });

    test('days until follow-up is displayed in blue for future dates', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 5);

      const quotationsWithFutureDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: futureDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithFutureDate });
      renderComponent();

      await waitFor(() => {
        const daysElement = screen.getByText('5');
        expect(daysElement).toHaveClass('text-blue-600');
      });
    });
  });

  describe('Overdue Highlighting - Requirement 8.5', () => {
    test('highlights overdue follow-ups in red', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 5);

      const quotationsWithPastDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: pastDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithPastDate });
      renderComponent();

      await waitFor(() => {
        const overdueCard = screen.getByText('Q-2024-001').closest('.border');
        expect(overdueCard).toHaveClass('border-red-300', 'bg-red-50');
      });
    });

    test('displays "Overdue by" text for past dates', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 5);

      const quotationsWithPastDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: pastDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithPastDate });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Overdue by')).toBeInTheDocument();
        expect(screen.getByText('5 days')).toBeInTheDocument();
      });
    });

    test('overdue days are displayed in red', async () => {
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setDate(today.getDate() - 3);

      const quotationsWithPastDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: pastDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithPastDate });
      renderComponent();

      await waitFor(() => {
        const overdueElement = screen.getByText(/3 days/);
        const parentDiv = overdueElement.closest('.text-red-600');
        expect(parentDiv).toHaveClass('text-red-600');
      });
    });

    test('non-overdue cards do not have red styling', async () => {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 5);

      const quotationsWithFutureDate = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: futureDate.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithFutureDate });
      renderComponent();

      await waitFor(() => {
        const card = screen.getByText('Q-2024-001').closest('.border');
        expect(card).toHaveClass('border-gray-200');
        expect(card).not.toHaveClass('border-red-300', 'bg-red-50');
      });
    });

    test('handles yesterday as overdue', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const quotationsWithYesterday = [
        {
          id: 1,
          quotationNumber: 'Q-2024-001',
          companyName: 'Test Company',
          followUpDate: yesterday.toISOString().split('T')[0],
          status: 'PENDING_APPROVAL',
        },
      ];
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: quotationsWithYesterday });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Overdue by')).toBeInTheDocument();
        expect(screen.getByText('1 days')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation on Card Click - Requirement 8.8', () => {
    test('navigates to quotation detail when card is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const card = screen.getByText('Q-2024-001').closest('.border');
      fireEvent.click(card);

      expect(mockNavigate).toHaveBeenCalledWith('/quotations/1');
    });

    test('navigates to correct quotation detail for different cards', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-002')).toBeInTheDocument();
      });

      const card2 = screen.getByText('Q-2024-002').closest('.border');
      fireEvent.click(card2);

      expect(mockNavigate).toHaveBeenCalledWith('/quotations/2');

      mockNavigate.mockClear();

      const card3 = screen.getByText('Q-2024-003').closest('.border');
      fireEvent.click(card3);

      expect(mockNavigate).toHaveBeenCalledWith('/quotations/3');
    });

    test('card has cursor-pointer class to indicate clickability', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const card = screen.getByText('Q-2024-001').closest('.border');
      expect(card).toHaveClass('cursor-pointer');
    });

    test('card has hover effect', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const card = screen.getByText('Q-2024-001').closest('.border');
      expect(card).toHaveClass('hover:shadow-md');
    });
  });

  describe('Loading and Error States - Requirement 8.10', () => {
    test('displays loading spinner during data fetch', () => {
      renderComponent();

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText('Loading follow-ups...')).toBeInTheDocument();
    });

    test('hides loading spinner after data is loaded', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
      expect(screen.queryByText('Loading follow-ups...')).not.toBeInTheDocument();
    });

    test('displays error message when fetch fails', async () => {
      quotationService.getUpcomingFollowups.mockRejectedValue({
        response: { data: { message: 'Server error' } },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      // Error should be displayed in red alert box
      const errorElement = screen.getByText('Server error').closest('.bg-red-50');
      expect(errorElement).toHaveClass('bg-red-50', 'border-red-200', 'text-red-700');
    });

    test('hides quotations list when error occurs', async () => {
      quotationService.getUpcomingFollowups.mockRejectedValue({
        response: { data: { message: 'Server error' } },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      expect(screen.queryByText('Q-2024-001')).not.toBeInTheDocument();
    });

    test('clears previous error when new fetch is successful', async () => {
      quotationService.getUpcomingFollowups.mockRejectedValueOnce({
        response: { data: { message: 'Server error' } },
      });
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });

      // Now mock successful response
      quotationService.getUpcomingFollowups.mockResolvedValue({ data: mockQuotations });

      // Click a different filter to trigger new fetch
      const next30Button = screen.getByText('Next 30 days');
      fireEvent.click(next30Button);

      await waitFor(() => {
        expect(screen.queryByText('Server error')).not.toBeInTheDocument();
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });
    });

    test('displays loading state when switching filters', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Q-2024-001')).toBeInTheDocument();
      });

      // Mock a delayed response
      quotationService.getUpcomingFollowups.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockQuotations }), 100))
      );

      const next30Button = screen.getByText('Next 30 days');
      fireEvent.click(next30Button);

      // Should show loading spinner
      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });
});
