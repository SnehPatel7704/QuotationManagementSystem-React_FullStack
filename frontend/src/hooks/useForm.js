import { useState, useCallback } from 'react';

/**
 * Custom hook for form state management
 * Provides form data, errors, dirty state, and handlers
 * 
 * @param {Object} initialValues - Initial form values
 * @param {Function} validateFn - Optional validation function
 * @returns {Object} Form state and handlers
 */
export const useForm = (initialValues = {}, validateFn = null) => {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle input change
   */
  const handleChange = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Handle nested field change (e.g., items[0].quantity)
   */
  const handleNestedChange = useCallback((path, value) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const match = key.match(/(\w+)\[(\d+)\]/);
        
        if (match) {
          const arrayName = match[1];
          const index = parseInt(match[2]);
          current = current[arrayName][index];
        } else {
          current = current[key];
        }
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
    setIsDirty(true);
    
    // Clear error for this field
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  }, [errors]);

  /**
   * Validate form
   */
  const validate = useCallback(() => {
    if (!validateFn) return true;
    
    const validationErrors = validateFn(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formData, validateFn]);

  /**
   * Reset form to initial values
   */
  const reset = useCallback(() => {
    setFormData(initialValues);
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  /**
   * Set form data programmatically
   */
  const setValues = useCallback((values) => {
    setFormData(values);
    setIsDirty(false);
  }, []);

  /**
   * Set a specific error
   */
  const setError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear a specific error
   */
  const clearError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  return {
    formData,
    errors,
    isDirty,
    isSubmitting,
    setFormData,
    setErrors,
    setIsDirty,
    setIsSubmitting,
    handleChange,
    handleNestedChange,
    validate,
    reset,
    setValues,
    setError,
    clearErrors,
    clearError
  };
};

export default useForm;
