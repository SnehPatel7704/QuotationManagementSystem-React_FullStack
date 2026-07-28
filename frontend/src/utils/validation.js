/**
 * Frontend validation utility
 * Provides validation functions for forms and user input
 */

/**
 * Validate required field
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRequired = (value, fieldName = 'This field') => {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
};

/**
 * Validate positive number
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validatePositiveNumber = (value, fieldName = 'This field') => {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (num <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  return null;
};

/**
 * Validate positive integer
 * @param {any} value - The value to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validatePositiveInteger = (value, fieldName = 'This field') => {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (!Number.isInteger(num)) {
    return `${fieldName} must be a whole number`;
  }
  if (num <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  return null;
};

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateEmail = (email) => {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string|null} Error message or null if valid
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return 'Both start and end dates are required';
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date format';
  }
  
  if (start > end) {
    return 'Start date must be before or equal to end date';
  }
  
  return null;
};

/**
 * Validate minimum length
 * @param {string} value - The value to validate
 * @param {number} minLength - Minimum length required
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateMinLength = (value, minLength, fieldName = 'This field') => {
  if (!value || value.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

/**
 * Validate maximum length
 * @param {string} value - The value to validate
 * @param {number} maxLength - Maximum length allowed
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateMaxLength = (value, maxLength, fieldName = 'This field') => {
  if (value && value.length > maxLength) {
    return `${fieldName} must not exceed ${maxLength} characters`;
  }
  return null;
};

/**
 * Validate array has at least one item
 * @param {Array} array - The array to validate
 * @param {string} fieldName - Name of the field for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateArrayNotEmpty = (array, fieldName = 'List') => {
  if (!Array.isArray(array) || array.length === 0) {
    return `${fieldName} must contain at least one item`;
  }
  return null;
};

/**
 * Validate quotation form data
 * @param {Object} formData - The form data to validate
 * @returns {Object} Object with field errors { fieldName: errorMessage }
 */
export const validateQuotationForm = (formData) => {
  const errors = {};
  
  // Validate company
  const companyError = validateRequired(formData.companyId, 'Company');
  if (companyError) errors.companyId = companyError;
  
  // Validate items
  const itemsError = validateArrayNotEmpty(formData.items, 'Items');
  if (itemsError) {
    errors.items = itemsError;
  } else {
    // Validate each item
    formData.items.forEach((item, index) => {
      const itemErrors = {};
      
      const productError = validateRequired(item.productId, 'Product');
      if (productError) itemErrors.productId = productError;
      
      const quantityError = validatePositiveInteger(item.quantity, 'Quantity');
      if (quantityError) itemErrors.quantity = quantityError;
      
      const priceError = validatePositiveNumber(item.unitPrice, 'Unit Price');
      if (priceError) itemErrors.unitPrice = priceError;
      
      if (Object.keys(itemErrors).length > 0) {
        errors[`item_${index}`] = itemErrors;
      }
    });
  }
  
  return errors;
};

/**
 * Validate rejection reason
 * @param {string} reason - The rejection reason
 * @returns {string|null} Error message or null if valid
 */
export const validateRejectionReason = (reason) => {
  const requiredError = validateRequired(reason, 'Rejection reason');
  if (requiredError) return requiredError;
  
  const minLengthError = validateMinLength(reason, 10, 'Rejection reason');
  if (minLengthError) return minLengthError;
  
  return null;
};

/**
 * Sanitize string input (remove potentially harmful characters)
 * @param {string} input - The input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Sanitize number input
 * @param {any} input - The input to sanitize
 * @returns {number|null} Sanitized number or null if invalid
 */
export const sanitizeNumber = (input) => {
  const num = Number(input);
  return isNaN(num) ? null : num;
};

/**
 * Check if form has errors
 * @param {Object} errors - Errors object
 * @returns {boolean} True if there are errors
 */
export const hasErrors = (errors) => {
  if (!errors || typeof errors !== 'object') return false;
  return Object.keys(errors).length > 0;
};

/**
 * Get first error message from errors object
 * @param {Object} errors - Errors object
 * @returns {string|null} First error message or null
 */
export const getFirstError = (errors) => {
  if (!errors || typeof errors !== 'object') return null;
  
  const keys = Object.keys(errors);
  if (keys.length === 0) return null;
  
  const firstError = errors[keys[0]];
  
  // If the error is an object (nested errors), get the first nested error
  if (typeof firstError === 'object' && firstError !== null) {
    return getFirstError(firstError);
  }
  
  return firstError;
};

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {string|null} Error message or null if valid
 */
export const validatePassword = (password) => {
  const requiredError = validateRequired(password, 'Password');
  if (requiredError) return requiredError;
  
  const minLengthError = validateMinLength(password, 8, 'Password');
  if (minLengthError) return minLengthError;
  
  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  
  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  
  // Check for at least one number
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  
  return null;
};

/**
 * Validate username
 * @param {string} username - The username to validate
 * @returns {string|null} Error message or null if valid
 */
export const validateUsername = (username) => {
  const requiredError = validateRequired(username, 'Username');
  if (requiredError) return requiredError;
  
  const minLengthError = validateMinLength(username, 3, 'Username');
  if (minLengthError) return minLengthError;
  
  // Check for valid characters (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  
  return null;
};

const validationUtils = {
  validateRequired,
  validatePositiveNumber,
  validatePositiveInteger,
  validateEmail,
  validateDateRange,
  validateMinLength,
  validateMaxLength,
  validateArrayNotEmpty,
  validateQuotationForm,
  validateRejectionReason,
  validatePassword,
  validateUsername,
  sanitizeString,
  sanitizeNumber,
  hasErrors,
  getFirstError
};

export default validationUtils;
