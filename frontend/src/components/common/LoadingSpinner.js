import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable loading spinner component
 * 
 * @param {string} size - Size of the spinner: 'sm', 'md', 'lg', 'xl'
 * @param {string} color - Color variant: 'primary', 'white', 'gray'
 * @param {string} text - Optional loading text to display below spinner
 * @param {boolean} fullScreen - Whether to display as full-screen overlay
 * @param {string} className - Additional CSS classes
 */
const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  text = '',
  fullScreen = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  const colorClasses = {
    primary: 'border-primary-600 border-t-transparent',
    white: 'border-white border-t-transparent',
    gray: 'border-gray-600 border-t-transparent dark:border-gray-400',
  };

  const spinnerClasses = `
    animate-spin 
    rounded-full 
    ${sizeClasses[size] || sizeClasses.md} 
    ${colorClasses[color] || colorClasses.primary}
    ${className}
  `;

  const spinner = (
    <div className="flex flex-col items-center justify-center">
      <div className={spinnerClasses} role="status" aria-label="Loading">
        <span className="sr-only">Loading...</span>
      </div>
      {text && (
        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  color: PropTypes.oneOf(['primary', 'white', 'gray']),
  text: PropTypes.string,
  fullScreen: PropTypes.bool,
  className: PropTypes.string,
};

export default LoadingSpinner;
