import React, { createContext, useContext, useState } from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = (title, description = '', variant = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <FiCheckCircle className="text-green-500 w-5 h-5 flex-shrink-0" />,
    error: <FiAlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />,
    info: <FiInfo className="text-blue-500 w-5 h-5 flex-shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-white dark:bg-gray-800 border-l-4 border-green-500',
    error: 'bg-white dark:bg-gray-800 border-l-4 border-red-500',
    info: 'bg-white dark:bg-gray-800 border-l-4 border-blue-500',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map(({ id, title, description, variant }) => (
          <ToastPrimitive.Root
            key={id}
            onOpenChange={(open) => {
              if (!open) removeToast(id);
            }}
            className={`flex items-start justify-between gap-4 p-4 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 pointer-events-auto ${bgStyles[variant]} transition-all animate-in slide-in-from-bottom-2 md:slide-in-from-top-2 duration-200`}
          >
            <div className="flex gap-3">
              {icons[variant]}
              <div className="grid gap-1">
                <ToastPrimitive.Title className="text-sm font-semibold text-gray-900 dark:text-white">
                  {title}
                </ToastPrimitive.Title>
                {description && (
                  <ToastPrimitive.Description className="text-xs text-gray-500 dark:text-gray-400">
                    {description}
                  </ToastPrimitive.Description>
                )}
              </div>
            </div>
            
            <ToastPrimitive.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors">
                <FiX size={16} />
              </button>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed top-0 right-0 flex flex-col p-6 gap-2 w-full max-w-[420px] m-0 list-none z-50 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
};
