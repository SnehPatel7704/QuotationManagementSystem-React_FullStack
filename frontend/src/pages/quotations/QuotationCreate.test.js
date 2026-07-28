import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuotationCreate from './QuotationCreate';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { companyService } from '../../services/companyService';
import { productService } from '../../services/productService';
import { quotationService } from '../../services/quotationService';

// Mock the services
jest.mock('../../services/companyService');
jest.mock('../../services/productService');
jest.mock('../../services/quotationService');

// Mock authService
jest.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: jest.fn(() => ({ id: 1, username: 'testuser', role: 'USER' })),
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

describe('QuotationCreate Component', () => {
  const mockCompanies = [
    { id: 1, name: 'Company A' },
    { id: 2, name: 'Company B' },
    { id: 3, name: 'Test Corp' },
  ];

  const mockProducts = [
    { id: 1, name: 'Product 1' },
    { id: 2, name: 'Product 2' },
    { id: 3, name: 'Widget' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ id: 1 }));
    companyService.getCompanies.mockResolvedValue(mockCompanies);
    productService.getProducts.mockResolvedValue(mockProducts);
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <QuotationCreate />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  describe('Component Loading', () => {
    test('displays loading spinner while fetching data', () => {
      renderComponent();
      expect(screen.getByText(/loading data/i)).toBeInTheDocument();
    });

    test('loads companies and products on mount', async () => {
      renderComponent();

      await waitFor(() => {
        expect(companyService.getCompanies).toHaveBeenCalledTimes(1);
        expect(productService.getProducts).toHaveBeenCalledTimes(1);
      });
    });

    test('displays error message if data loading fails', async () => {
      const errorMessage = 'Failed to load data';
      companyService.getCompanies.mockRejectedValue(new Error(errorMessage));

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
      });
    });
  });

  describe('Company Dropdown', () => {
    test('populates company dropdown with data from API', async () => {
      renderComponent();

      await waitFor(() => {
        const companySelect = screen.getAllByRole('combobox')[0];
        expect(companySelect).toBeInTheDocument();
      });

      // Check that companies are in the dropdown
      mockCompanies.forEach((company) => {
        expect(screen.getByText(company.name)).toBeInTheDocument();
      });
    });

    test('filters companies based on search input', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search companies/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search companies/i);
      fireEvent.change(searchInput, { target: { value: 'Test' } });

      // Test Corp should be visible, others should not
      await waitFor(() => {
        expect(screen.getByText('Test Corp')).toBeInTheDocument();
      });
    });

    test('stores company ID when selected', async () => {
      renderComponent();

      await waitFor(() => {
        const companySelect = screen.getAllByRole('combobox')[0];
        expect(companySelect).toBeInTheDocument();
      });

      const companySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(companySelect, { target: { value: '1' } });

      expect(companySelect.value).toBe('1');
    });
  });

  describe('Product Selection and Items', () => {
    test('displays initial item row on load', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/item 1/i)).toBeInTheDocument();
      });
    });

    test('adds new item when Add Item button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/add item/i)).toBeInTheDocument();
      });

      const addButton = screen.getByText(/add item/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/item 2/i)).toBeInTheDocument();
      });
    });

    test('removes item when remove button is clicked', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/add item/i)).toBeInTheDocument();
      });

      // Add a second item
      const addButton = screen.getByText(/add item/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/item 2/i)).toBeInTheDocument();
      });

      // Remove the second item
      const removeButtons = screen.getAllByLabelText(/remove item/i);
      fireEvent.click(removeButtons[1]);

      await waitFor(() => {
        expect(screen.queryByText(/item 2/i)).not.toBeInTheDocument();
      });
    });

    test('prevents removing the last item', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/item 1/i)).toBeInTheDocument();
      });

      // Try to remove the only item (button should not exist)
      const removeButtons = screen.queryAllByLabelText(/remove item/i);
      expect(removeButtons.length).toBe(0);
    });

    test('populates product dropdown with autocomplete', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search products/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'Widget' } });

      await waitFor(() => {
        expect(screen.getByText('Widget')).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Calculations', () => {
    test('calculates item total when quantity and unit price are entered', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText(/quantity/i);
      const unitPriceInput = screen.getByLabelText(/unit price/i);

      fireEvent.change(quantityInput, { target: { value: '5' } });
      fireEvent.change(unitPriceInput, { target: { value: '10.50' } });

      await waitFor(() => {
        expect(screen.getByText(/\$52\.50/)).toBeInTheDocument();
      });
    });

    test('calculates quotation total as sum of all items', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/add item/i)).toBeInTheDocument();
      });

      // Set first item
      const quantityInputs = screen.getAllByLabelText(/quantity/i);
      const unitPriceInputs = screen.getAllByLabelText(/unit price/i);

      fireEvent.change(quantityInputs[0], { target: { value: '2' } });
      fireEvent.change(unitPriceInputs[0], { target: { value: '10' } });

      // Add second item
      const addButton = screen.getByText(/add item/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getAllByLabelText(/quantity/i).length).toBe(2);
      });

      const updatedQuantityInputs = screen.getAllByLabelText(/quantity/i);
      const updatedUnitPriceInputs = screen.getAllByLabelText(/unit price/i);

      fireEvent.change(updatedQuantityInputs[1], { target: { value: '3' } });
      fireEvent.change(updatedUnitPriceInputs[1], { target: { value: '15' } });

      // Total should be (2 * 10) + (3 * 15) = 20 + 45 = 65
      await waitFor(() => {
        expect(screen.getByText(/quotation total/i).parentElement).toHaveTextContent('$65.00');
      });
    });
  });

  describe('Form Validation', () => {
    test('displays validation error when company is not selected', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText(/create quotation/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company is required/i)).toBeInTheDocument();
      });
    });

    test('displays validation error for invalid quantity', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '-1' } });

      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/quantity must be a positive number/i)).toBeInTheDocument();
      });
    });

    test('displays validation error for invalid unit price', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/unit price/i)).toBeInTheDocument();
      });

      const unitPriceInput = screen.getByLabelText(/unit price/i);
      fireEvent.change(unitPriceInput, { target: { value: '-10' } });

      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/unit price must be a positive number/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    test('submits form with valid data', async () => {
      quotationService.create.mockResolvedValue({ id: 1 });

      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
      });

      // Fill in the form
      const companySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(companySelect, { target: { value: '1' } });

      const productSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(productSelect, { target: { value: '1' } });

      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '5' } });

      const unitPriceInput = screen.getByLabelText(/unit price/i);
      fireEvent.change(unitPriceInput, { target: { value: '10' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(quotationService.create).toHaveBeenCalledWith({
          quotation: {
            companyId: 1,
            followUpDate: null,
            createdBy: 1,
          },
          items: [
            {
              productId: 1,
              quantity: 5,
              unitPrice: 10,
            },
          ],
        });
      });

      expect(mockNavigate).toHaveBeenCalledWith('/quotations');
    });

    test('displays error message on submission failure', async () => {
      const errorMessage = 'Failed to create quotation';
      quotationService.create.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
      });

      // Fill in the form
      const companySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(companySelect, { target: { value: '1' } });

      const productSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(productSelect, { target: { value: '1' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    test('displays loading state during submission', async () => {
      quotationService.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
      });

      // Fill in the form
      const companySelect = screen.getAllByRole('combobox')[0];
      fireEvent.change(companySelect, { target: { value: '1' } });

      const productSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(productSelect, { target: { value: '1' } });

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create quotation/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creating/i)).toBeInTheDocument();
      });
    });
  });

  describe('Unsaved Changes Warning', () => {
    test('shows confirmation dialog when navigating away with unsaved changes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });

      // Make a change to mark form as dirty
      const quantityInput = screen.getByLabelText(/quantity/i);
      fireEvent.change(quantityInput, { target: { value: '5' } });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
      });
    });

    test('navigates away without confirmation when no changes', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });

      // Click cancel without making changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockNavigate).toHaveBeenCalledWith('/quotations');
    });
  });
});
