import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { FiX } from 'react-icons/fi';
import { validateRejectionReason } from '../../utils/validation';

const RejectionReasonModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation using utility
    const validationError = validateRejectionReason(rejectionReason);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setError('');
    onSubmit(rejectionReason);
  };

  const handleClose = () => {
    if (!loading) {
      setRejectionReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-200" />
        
        {/* Modal container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Content className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 focus:outline-none">
            {/* Close button */}
            <Dialog.Close asChild>
              <button
                disabled={loading}
                onClick={handleClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
              >
                <FiX size={24} />
              </button>
            </Dialog.Close>
            
            {/* Header */}
            <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Reject Quotation
            </Dialog.Title>
            
            <Dialog.Description className="sr-only">
              Please enter the reason for rejecting this quotation.
            </Dialog.Description>
            
            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label 
                  htmlFor="rejectionReason" 
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    setError('');
                  }}
                  disabled={loading}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${
                    error ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Please provide a detailed reason for rejection..."
                />
                {error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Minimum 10 characters required
                </p>
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <span>Reject Quotation</span>
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RejectionReasonModal;
