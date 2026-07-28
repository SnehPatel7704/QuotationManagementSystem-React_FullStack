import { useState, useCallback, useEffect } from 'react';
import { handleApiError, parseApiError } from '../utils/errorHandler';

/**
 * Custom hook for API calls
 * Provides loading state, error handling, and data management
 * 
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} API state and execute function
 */
export const useApi = (apiFunction, options = {}) => {
  const {
    onSuccess = null,
    onError = null,
    initialData = null,
    autoRetry = false
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Execute the API call
   */
  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiFunction(...args);
      const responseData = response.data;
      
      setData(responseData);
      
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      
      if (onError) {
        onError(errorInfo);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setLoading(false);
  }, [initialData]);

  /**
   * Retry the last call
   */
  const retry = useCallback(() => {
    if (error && error.retry) {
      return error.retry();
    }
  }, [error]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    retry
  };
};

/**
 * Custom hook for fetching data on mount
 * Automatically calls the API function when the component mounts
 * 
 * @param {Function} apiFunction - The API function to call
 * @param {Array} dependencies - Dependencies for re-fetching
 * @param {Object} options - Configuration options
 * @returns {Object} API state and refetch function
 */
export const useFetch = (apiFunction, dependencies = [], options = {}) => {
  const {
    skip = false,
    ...apiOptions
  } = options;

  const { data, loading, error, execute, reset } = useApi(apiFunction, apiOptions);

  // Fetch on mount and when dependencies change
  const [hasFetched, setHasFetched] = useState(false);

  const fetch = useCallback(async () => {
    if (!skip) {
      try {
        await execute();
        setHasFetched(true);
      } catch (err) {
        // Error is already handled by useApi
      }
    }
  }, [execute, skip]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    fetch();
  }, [fetch, ...dependencies]);

  /**
   * Refetch data
   */
  const refetch = useCallback(() => {
    return fetch();
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch,
    reset,
    hasFetched
  };
};

/**
 * Custom hook for mutations (POST, PUT, DELETE)
 * Provides loading state and error handling for data mutations
 * 
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Configuration options
 * @returns {Object} Mutation state and mutate function
 */
export const useMutation = (apiFunction, options = {}) => {
  const {
    onSuccess = null,
    onError = null
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Execute the mutation
   */
  const mutate = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      setIsSuccess(false);
      
      const response = await apiFunction(...args);
      const responseData = response.data;
      
      setIsSuccess(true);
      
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo);
      
      if (onError) {
        onError(errorInfo);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    setIsSuccess(false);
  }, []);

  return {
    mutate,
    loading,
    error,
    isSuccess,
    reset
  };
};

export default {
  useApi,
  useFetch,
  useMutation
};
