import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const QuotationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for form data
  const [formData, setFormData] = useState({
    companyId: '',
    followUpDate: '',
    items: [{ productId: '', quantity: 1, unitPrice: 0 }],
  });

  // State for quotation metadata
  const [quotationStatus, setQuotationStatus] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');

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

  // Load quotation data, companies, and products on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [quotationResponse, companiesData, productsData] = await Promise.all([
          quotationService.getById(id),
          companyService.getCompanies(),
          productService.getProducts(),
        ]);

        // Extract data from response
        const quotationData = quotationResponse.data || quotationResponse;

        // Check if quotation can be edited
        if (quotationData.status !== 'DRAFT') {
          setError(`Cannot edit quotation with status ${quotationData.status}. Only DRAFT quotations can be edited.`);
          setLoadingData(false);
          return;
        }

        // Populate form with existing data
        setQuotationStatus(quotationData.status);
        setQuotationNumber(quotationData.quotationNumber || id);
        setFormData({
          companyId: quotationData.companyId || '',
          followUpDate: quotationData.followUpDate || '',
          items: quotationData.items && quotationData.items.length > 0
            ? quotationData.items.map(item => ({
                productId: item.productId || '',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
              }))
            : [{ productId: '', quantity: 1, unitPrice: 0 }],
        });

        // Initialize product searches array
        setProductSearches(new Array(quotationData.items?.length || 1).fill(''));

        setCompanies(companiesData || []);
        setProducts(productsData || []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(
          err.response?.data?.message ||
          err.response?.data?.error?.message ||
          err.message ||
          'Failed to load quotation data. Please try again.'
        );
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [id]);

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

  // Handle form submission (Save changes)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if quotation is still in DRAFT status
    if (quotationStatus !== 'DRAFT') {
      setError('Cannot update quotation. Only DRAFT quotations can be edited.');
      return;
    }

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
        },
        items: formData.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      await quotationService.update(id, quotationData);
      setIsDirty(false);
      navigate('/quotations');
    } catch (err) {
      console.error('Error updating quotation:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to update quotation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle submit for approval
  const handleSubmitForApproval = async () => {
    setError('');

    if (!validateForm()) {
      setError('Please fix the validation errors before submitting');
      return;
    }

    try {
      setLoading(true);

      // First save the changes
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user.id || 1;

      const quotationData = {
        quotation: {
          companyId: Number(formData.companyId),
          followUpDate: formData.followUpDate || null,
          createdBy: userId,
        },
        items: formData.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      await quotationService.update(id, quotationData);
      
      // Then submit for approval
      await quotationService.submit(id);
      
      setIsDirty(false);
      navigate('/quotations');
    } catch (err) {
      console.error('Error submitting quotation:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to submit quotation. Please try again.'
      );
    } finally {
      setLoading(false);
    }
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
        <LoadingSpinner size="lg" text="Loading quotation data..." />
      </Layout>
    );
  }

  // If there's an error and quotation cannot be edited, show error message
  if (error && quotationStatus && quotationStatus !== 'DRAFT') {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Edit Quotation {quotationNumber ? `#${quotationNumber}` : ''}
            </h1>
          </div>
          <ErrorMessage
            message={error}
            variant="error"
          />
          <button
            onClick={() => navigate('/quotations')}
            className="btn btn-secondary"
          >
            Back to Quotations
          </button>
        </div>
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
            Edit Quotation {quotationNumber ? `#${quotationNumber}` : ''}
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
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Item {index + 1}
                    </h3>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        aria-label="Remove item"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Product Selection */}
                    <div className="sm:col-span-2">
                      <label className="label">
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
                          className="input pl-10 mb-2"
                        />
                      </div>
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(index, 'productId', e.target.value)
                        }
                        className={`input ${
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
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
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
                  <div className="flex justify-end">
                    <div className="text-right">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Item Total:
                      </span>
                      <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
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
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  Quotation Total:
                </span>
                <span className="ml-4 text-2xl font-bold text-primary-600 dark:text-primary-400">
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
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSubmitForApproval}
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

export default QuotationEdit;
