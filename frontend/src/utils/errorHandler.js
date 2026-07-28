/**
 * Centralized error handling utility for the frontend.
 * Provides functions to parse and display API errors, retry logic, and error logging.
 */

/**
 * Parse API error response and extract user-friendly message
 * @param {Error} error - The error object from API call
 * @returns {Object} Parsed error with message and details
 */
export const parseApiError = (error) => {
  // Network error (no response from server)
  if (!error.response) {
    return {
      message: 'Network error. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      details: null
    };
  }

  // Server returned an error response
  const { status, data } = error.response;

  // Extract error message from response
  let message = 'An unexpected error occurred. Please try again.';
  let code = 'UNKNOWN_ERROR';
  let details = null;

  if (data) {
    if (data.message) {
      message = data.message;
    }
    if (data.error) {
      code = data.error;
    }
    if (data.details) {
      details = data.details;
    }
  }

  return {
    message,
    code,
    status,
    details,
    isNetworkError: false
  };
};

/**
 * Display error message to user
 * @param {Object} error - Parsed error object
 * @param {Function} setError - State setter function for error message
 */
export const displayError = (error, setError) => {
  const parsedError = typeof error === 'string' 
    ? { message: error } 
    : parseApiError(error);
  
  setError(parsedError.message);
  
  // Log to console for debugging
  console.error('Error occurred:', parsedError);
};

/**
 * Get user-friendly error message based on error code
 * @param {string} code - Error code from API
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyMessage = (code) => {
  const messages = {
    'VALIDATION_ERROR': 'Please check your input and try again.',
    'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
    'AUTHENTICATION_ERROR': 'Your session has expired. Please log in again.',
    'NOT_FOUND': 'The requested resource was not found.',
    'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection.',
    'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later.'
  };

  return messages[code] || 'An error occurred. Please try again.';
};

/**
 * Retry a failed API call with exponential backoff
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} delay - Initial delay in milliseconds (default: 1000)
 * @returns {Promise} Result of the API call
 */
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except for network errors
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

/**
 * Handle API error with automatic retry for network errors
 * @param {Error} error - The error object
 * @param {Function} retryCallback - Optional callback to retry the operation
 * @returns {Object} Error information with retry option
 */
export const handleApiError = (error, retryCallback = null) => {
  const parsedError = parseApiError(error);
  
  // Log error for debugging
  console.error('API Error:', {
    message: parsedError.message,
    code: parsedError.code,
    status: parsedError.status,
    details: parsedError.details,
    timestamp: new Date().toISOString()
  });
  
  // Return error info with retry option for network errors
  return {
    ...parsedError,
    canRetry: parsedError.isNetworkError && retryCallback !== null,
    retry: retryCallback
  };
};

/**
 * Extract field-specific validation errors from API response
 * @param {Object} error - The error object from API call
 * @returns {Object} Field errors object { fieldName: errorMessage }
 */
export const extractFieldErrors = (error) => {
  const parsedError = parseApiError(error);
  
  if (parsedError.details && typeof parsedError.details === 'object') {
    return parsedError.details;
  }
  
  return {};
};

/**
 * Check if error is an authentication error
 * @param {Object} error - The error object
 * @returns {boolean} True if authentication error
 */
export const isAuthError = (error) => {
  const parsedError = parseApiError(error);
  return parsedError.status === 401 || parsedError.code === 'AUTHENTICATION_ERROR';
};

/**
 * Check if error is an authorization error
 * @param {Object} error - The error object
 * @returns {boolean} True if authorization error
 */
export const isAuthorizationError = (error) => {
  const parsedError = parseApiError(error);
  return parsedError.status === 403 || parsedError.code === 'AUTHORIZATION_ERROR';
};

/**
 * Check if error is a validation error
 * @param {Object} error - The error object
 * @returns {boolean} True if validation error
 */
export const isValidationError = (error) => {
  const parsedError = parseApiError(error);
  return parsedError.status === 400 || parsedError.code === 'VALIDATION_ERROR';
};

/**
 * Check if error is a network error
 * @param {Object} error - The error object
 * @returns {boolean} True if network error
 */
export const isNetworkError = (error) => {
  return !error.response;
};

const errorHandlerUtils = {
  parseApiError,
  displayError,
  getUserFriendlyMessage,
  retryApiCall,
  handleApiError,
  extractFieldErrors,
  isAuthError,
  isAuthorizationError,
  isValidationError,
  isNetworkError
};

export default errorHandlerUtils;
