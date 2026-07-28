import React from 'react';
import PropTypes from 'prop-types';
import * as Label from '@radix-ui/react-label';

/**
 * Reusable form input component with Radix UI Label, validation, and error display
 */
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required = false,
  placeholder = '',
  disabled = false,
  icon = null,
  className = '',
  ...inputProps
}) => {
  const inputId = `input-${name}`;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <Label.Root htmlFor={inputId} className="label cursor-default select-none">
          {icon && <span className="inline mr-2">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label.Root>
      )}
      
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`input ${hasError ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        {...inputProps}
      />
      
      {hasError && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

FormInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default FormInput;
