import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import FormInput from '../../components/common/FormInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { quotationService } from '../../services/quotationService';
import { companyService } from '../../services/companyService';
import { productService } from '../../services/productService';
import { 
  validateRequired, 
  validatePositiveInteger, 
  validatePositiveNumber,
  validateArrayNotEmpty 
} from '../../utils/validation';
import { FiSave, FiX, FiPlus, FiTrash2, FiSearch } from 'react-icons/fi';

const QuotationCreate = () => {
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    companyId: '',
    followUpDate: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0 }],
  });

  // State for dropdowns
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [productSearches, setProductSearches] = useState(['']);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showItemRemoveDialog, setShowItemRemoveDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Load companies and products on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [companiesData, productsData] = await Promise.all([
          companyService.getCompanies(),
          productService.getProducts(),
        ]);
        setCompanies(companiesData || []);
        setProducts(productsData || []);
      } catch (err) {
        console.error('Error loading data:', err);
        console.error('Error response:', err.response);
        
        // Check if it's an authentication error
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('Authentication error. Please log in again.');
          // Redirect to login after a short delay
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          setError(err.message || 'Failed to load data. Please refresh the page.');
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [navigate]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Calculate item total
  const calculateItemTotal = (quantity, unitPrice) => {
    return (Number(quantity) || 0) * (Number(unitPrice) || 0);
  };

  // Calculate quotation total
  const calculateQuotationTotal = () => {
    return formData.items.reduce((total, item) => {
      return total + calculateItemTotal(item.quantity, item.unitPrice);
    }, 0);
  };

  // Filter companies based on search
  const filteredCompanies = companies.filter((company) =>
    company.name?.toLowerCase().includes(companySearch.toLowerCase())
  );

  // Filter products based on search for a specific item
  const getFilteredProducts = (index) => {
    const search = productSearches[index] || '';
    return products.filter((product) =>
      product.name?.toLowerCase().includes(search.toLowerCase())
    );
  };

  // Handle company selection
  const handleCompanyChange = (e) => {
    setFormData({ ...formData, companyId: e.target.value });
    setIsDirty(true);
    if (errors.companyId) {
      setErrors({ ...errors, companyId: '' });
    }
  };

  // Handle follow-up date change
  const handleFollowUpDateChange = (e) => {
    setFormData({ ...formData, followUpDate: e.target.value });
    setIsDirty(true);
  };

  // Handle item field change
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    
    // If product is being changed, auto-populate the unit price from product's base price
    if (field === 'productId' && value) {
      const selectedProduct = products.find(p => p.id === Number(value));
      if (selectedProduct && selectedProduct.basePrice) {
        newItems[index] = { 
          ...newItems[index], 
          [field]: value,
          unitPrice: selectedProduct.basePrice 
        };
      } else {
        newItems[index] = { ...newItems[index], [field]: value };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    setFormData({ ...formData, items: newItems });
    setIsDirty(true);

    // Clear field-specific error
    if (errors[`items.${index}.${field}`]) {
      const newErrors = { ...errors };
      delete newErrors[`items.${index}.${field}`];
      setErrors(newErrors);
    }
  };

  // Handle product search change
  const handleProductSearchChange = (index, value) => {
    const newSearches = [...productSearches];
    newSearches[index] = value;
    setProductSearches(newSearches);
  };

  // Add new item
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0 }],
    });
    setProductSearches([...productSearches, '']);
    setIsDirty(true);
  };

  // Remove item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      setError('At least one item is required');
      return;
    }

    const item = formData.items[index];
    // Show confirmation if item has data (product selected or non-default values)
    if (item.productId || item.quantity > 1 || item.unitPrice > 0) {
      setItemToRemove(index);
      setShowItemRemoveDialog(true);
    } else {
      removeItemAtIndex(index);
    }
  };

  const removeItemAtIndex = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const newSearches = productSearches.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    setProductSearches(newSearches);
    setIsDirty(true);
  };

  const handleConfirmItemRemove = () => {
    if (itemToRemove !== null) {
      removeItemAtIndex(itemToRemove);
      setItemToRemove(null);
    }
    setShowItemRemoveDialog(false);
  };

  // Validate form using validation utility
  const validateForm = () => {
    const newErrors = {};

    // Validate company
    const companyError = validateRequired(formData.companyId, 'Company');
    if (companyError) {
      newErrors.companyId = companyError;
    }

    // Validate items
    const itemsError = validateArrayNotEmpty(formData.items, 'Items');
    if (itemsError) {
      newErrors.items = itemsError;
    }

    formData.items.forEach((item, index) => {
      const productError = validateRequired(item.productId, 'Product');
      if (productError) {
        newErrors[`items.${index}.productId`] = productError;
      }
      
      const quantityError = validatePositiveInteger(item.quantity, 'Quantity');
      if (quantityError) {
        newErrors[`items.${index}.quantity`] = quantityError;
      }
      
      const priceError = validatePositiveNumber(item.unitPrice, 'Unit price');
      if (priceError) {
        newErrors[`items.${index}.unitPrice`] = priceError;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission (Submit for Approval)
  const handleSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    try {
      setLoading(true);

      // Get user ID from localStorage (assuming it's stored there)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || 1;

      const quotationData = {
        quotation: {
          companyId: Number(formData.companyId),
          followUpDate: formData.followUpDate || null,
          createdBy: userId,
          // Set status based on button clicked
          status: saveAsDraft ? 'DRAFT' : null, // null will default to PENDING_APPROVAL in backend
        },
        items: formData.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      await quotationService.create(quotationData);
      setIsDirty(false);
      navigate('/quotations');
    } catch (err) {
      console.error('Error creating quotation:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to create quotation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = (e) => {
    handleSubmit(e, true);
  };

  // Handle cancel with confirmation if dirty
  const handleCancel = () => {
    if (isDirty) {
      setPendingNavigation('/quotations');
      setShowConfirmDialog(true);
    } else {
      navigate('/quotations');
    }
  };

  // Confirm navigation
  const handleConfirmNavigation = () => {
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  if (loadingData) {
    return (
      <Layout>
        <LoadingSpinner size="lg" text="Loading data..." />
      </Layout>
    );
  }

  const quotationTotal = calculateQuotationTotal();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Create Quotation
          </h1>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorMessage
            message={error}
            onDismiss={() => setError('')}
            variant="error"
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-6">
          {/* Company Selection */}
          <div>
            <label className="label">
              Company <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search companies..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="input pl-10 mb-2"
              />
            </div>
            <select
              value={formData.companyId}
              onChange={handleCompanyChange}
              className={`input ${errors.companyId ? 'border-red-500' : ''}`}
              required
            >
              <option value="">Select a company</option>
              {filteredCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.companyId}
              </p>
            )}
          </div>

          {/* Follow-up Date */}
          <FormInput
            label="Follow-up Date (Optional)"
            name="followUpDate"
            type="date"
            value={formData.followUpDate}
            onChange={handleFollowUpDateChange}
          />

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                Items <span className="text-red-500">*</span>
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="btn btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <FiPlus size={18} />
                <span>Add Item</span>
              </button>
            </div>

            {errors.items && (
              <ErrorMessage message={errors.items} variant="error" />
            )}

            {/* Items List */}
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4 space-y-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                      Item {index + 1}
                    </h3>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-2"
                        aria-label="Remove item"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Product Selection */}
                    <div className="sm:col-span-2">
                      <label className="label text-sm">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                          <FiSearch className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearches[index] || ''}
                          onChange={(e) =>
                            handleProductSearchChange(index, e.target.value)
                          }
                          className="input pl-10 mb-2 text-sm"
                        />
                      </div>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(index, 'productId', e.target.value)
                        }
                        className={`input text-sm ${
                          errors[`items.${index}.productId`] ? 'border-red-500' : ''
                        }`}
                        required
                      >
                        <option value="">Select a product</option>
                        {getFilteredProducts(index).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      {errors[`items.${index}.productId`] && (
                        <p className="mt-1 text-xs sm:text-sm text-red-600 dark:text-red-400">
                          {errors[`items.${index}.productId`]}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div>
                      <FormInput
                        label="Quantity"
                        name={`quantity-${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                        error={errors[`items.${index}.quantity`]}
                        required
                        min="1"
                        step="1"
                      />
                    </div>

                    {/* Unit Price */}
                    <div>
                      <FormInput
                        label="Unit Price"
                        name={`unitPrice-${index}`}
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(index, 'unitPrice', e.target.value)
                        }
                        error={errors[`items.${index}.unitPrice`]}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-right">
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Item Total:
                      </span>
                      <span className="ml-2 text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        OMR {calculateItemTotal(item.quantity, item.unitPrice).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quotation Total */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-end">
              <div className="text-right">
                <span className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                  Quotation Total:
                </span>
                <span className="ml-2 sm:ml-4 text-xl sm:text-2xl font-bold text-primary-600 dark:text-primary-400">
                  OMR {quotationTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4 sm:gap-0">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="white" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  <span>Submit for Approval</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSaveAsDraft}
              disabled={loading}
              className="btn btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" color="gray" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave size={18} />
                  <span>Save as Draft</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="btn btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              <FiX size={18} />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Dialog for Navigation */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmNavigation}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave? All changes will be lost."
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
      />

      {/* Confirmation Dialog for Item Removal */}
      <ConfirmDialog
        isOpen={showItemRemoveDialog}
        onClose={() => {
          setShowItemRemoveDialog(false);
          setItemToRemove(null);
        }}
        onConfirm={handleConfirmItemRemove}
        title="Remove Item"
        message="Are you sure you want to remove this item? This action cannot be undone."
        confirmText="Remove"
        cancelText="Cancel"
        variant="warning"
      />
    </Layout>
  );
};

export default QuotationCreate;
