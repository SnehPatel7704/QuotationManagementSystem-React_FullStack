import React from 'react';
import PropTypes from 'prop-types';
import { FiAlertCircle, FiX } from 'react-icons/fi';

/**
 * Reusable error message component
 * 
 * @param {string} message - The error message to display
 * @param {string} title - Optional title for the error
 * @param {function} onDismiss - Optional handler for dismissing the error
 * @param {string} variant - Visual variant: 'error', 'warning', 'info' (default: 'error')
 * @param {string} className - Additional CSS classes
 * @param {Array<string>} details - Optional array of detailed error messages
 */
const ErrorMessage = ({
  message,
  title = '',
  onDismiss = null,
  variant = 'error',
  className = '',
  details = [],
}) => {
  if (!message && details.length === 0) return null;

  const variantStyles = {
    error: {
      container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-300',
      text: 'text-red-600 dark:text-red-400',
      button: 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    },
    warning: {
      container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-300',
      text: 'text-yellow-600 dark:text-yellow-400',
      button: 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300',
    },
    info: {
      container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-800 dark:text-blue-300',
      text: 'text-blue-600 dark:text-blue-400',
      button: 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
    },
  };

  const styles = variantStyles[variant] || variantStyles.error;

  return (
    <div
      className={`border rounded-lg p-4 ${styles.container} ${className}`}
      role="alert"
    >
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          <FiAlertCircle className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${styles.title} mb-1`}>
              {title}
            </h3>
          )}
          
          {message && (
            <p className={`text-sm ${styles.text}`}>
              {message}
            </p>
          )}

          {details.length > 0 && (
            <ul className={`mt-2 text-sm ${styles.text} list-disc list-inside space-y-1`}>
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${styles.button}`}
              aria-label="Dismiss"
            >
              <FiX className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

ErrorMessage.propTypes = {
  message: PropTypes.string,
  title: PropTypes.string,
  onDismiss: PropTypes.func,
  variant: PropTypes.oneOf(['error', 'warning', 'info']),
  className: PropTypes.string,
  details: PropTypes.arrayOf(PropTypes.string),
};

export default ErrorMessage;
