import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import PrivateRoute from './components/common/PrivateRoute';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import QuotationList from './pages/quotations/QuotationList';
import QuotationCreate from './pages/quotations/QuotationCreate';
import QuotationEdit from './pages/quotations/QuotationEdit';
import QuotationDetail from './pages/quotations/QuotationDetail';
import UserManagement from './pages/users/UserManagement';
import CompanyManagement from './pages/companies/CompanyManagement';
import ProductManagement from './pages/products/ProductManagement';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <ErrorBoundary>
                <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route path="/dashboard" element={
                  <PrivateRoute>
                    <ErrorBoundary>
                      <Dashboard />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/quotations" element={
                  <PrivateRoute>
                    <ErrorBoundary>
                      <QuotationList />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/quotations/create" element={
                  <PrivateRoute roles={['SUPERADMIN', 'ADMIN']}>
                    <ErrorBoundary>
                      <QuotationCreate />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/quotations/edit/:id" element={
                  <PrivateRoute roles={['SUPERADMIN', 'ADMIN']}>
                    <ErrorBoundary>
                      <QuotationEdit />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/quotations/:id" element={
                  <PrivateRoute>
                    <ErrorBoundary>
                      <QuotationDetail />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/users" element={
                  <PrivateRoute roles={['SUPERADMIN']}>
                    <ErrorBoundary>
                      <UserManagement />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/companies" element={
                  <PrivateRoute roles={['SUPERADMIN', 'ADMIN']}>
                    <ErrorBoundary>
                      <CompanyManagement />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
                
                <Route path="/products" element={
                  <PrivateRoute roles={['SUPERADMIN', 'ADMIN']}>
                    <ErrorBoundary>
                      <ProductManagement />
                    </ErrorBoundary>
                  </PrivateRoute>
                } />
              </Routes>
            </ErrorBoundary>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;
