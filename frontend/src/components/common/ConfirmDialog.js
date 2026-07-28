import React from 'react';
import PropTypes from 'prop-types';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { FiX, FiAlertTriangle } from 'react-icons/fi';

/**
 * Reusable confirmation dialog modal component using Radix UI
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  loading = false,
  children,
}) => {
  const variantStyles = {
    danger: {
      icon: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900',
      button: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    },
    warning: {
      icon: 'text-yellow-600 dark:text-yellow-400',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900',
      button: 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500',
    },
    info: {
      icon: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      button: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    },
  };

  const styles = variantStyles[variant] || variantStyles.warning;

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <AlertDialog.Portal>
        {/* Backdrop overlay */}
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-gray-500/75 dark:bg-gray-900/75 transition-opacity duration-200" />
        
        {/* Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <AlertDialog.Content className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all w-full max-w-lg focus:outline-none">
            {/* Close button */}
            <AlertDialog.Cancel asChild>
              <button
                disabled={loading}
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                aria-label="Close"
              >
                <FiX size={24} />
              </button>
            </AlertDialog.Cancel>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                {/* Icon */}
                <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${styles.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                  <FiAlertTriangle className={`h-6 w-6 ${styles.icon}`} aria-hidden="true" />
                </div>

                {/* Text Content */}
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left flex-1">
                  <AlertDialog.Title className="text-lg font-semibold leading-6 text-gray-900 dark:text-white">
                    {title}
                  </AlertDialog.Title>
                  
                  <AlertDialog.Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {children || message}
                  </AlertDialog.Description>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
              <AlertDialog.Action asChild>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={loading}
                  className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Processing...' : confirmText}
                </button>
              </AlertDialog.Action>

              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  variant: PropTypes.oneOf(['danger', 'warning', 'info']),
  loading: PropTypes.bool,
  children: PropTypes.node,
};

export default ConfirmDialog;
