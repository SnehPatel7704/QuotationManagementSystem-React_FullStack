import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationService } from '../../services/quotationService';

const UpcomingFollowups = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('next15days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const calculateDateRange = useCallback((filter) => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    let endDate;

    switch (filter) {
      case 'next15days':
        endDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'next30days':
        endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'next2months':
        endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        return { startDate: customStartDate, endDate: customEndDate };
      default:
        endDate = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { startDate, endDate };
  }, [customStartDate, customEndDate]);

  const fetchUpcomingFollowups = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = calculateDateRange(selectedFilter);
      
      if (selectedFilter === 'custom' && (!customStartDate || !customEndDate)) {
        setError('Please select both start and end dates for custom range');
        setLoading(false);
        return;
      }

      console.log('Fetching upcoming follow-ups:', { startDate, endDate });
      const response = await quotationService.getUpcomingFollowups(startDate, endDate);
      console.log('Received response:', response);
      setQuotations(response.data || []);
    } catch (err) {
      console.error('Error fetching upcoming follow-ups:', err);
      console.error('Error response:', err.response);
      console.error('Error message:', err.message);
      
      let errorMessage = 'Failed to fetch upcoming follow-ups';
      
      if (!err.response) {
        // Network error or server not responding
        errorMessage = 'Cannot connect to server. Please ensure the backend server is running on http://localhost:8080';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You need ADMIN or SUPERADMIN role to view upcoming follow-ups.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
      } else if (err.response?.status === 500) {
        errorMessage = `Server error: ${err.response?.data?.message || 'Internal server error'}`;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, customStartDate, customEndDate, calculateDateRange]);

  useEffect(() => {
    if (selectedFilter !== 'custom') {
      // Check if user is authenticated before fetching
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view upcoming follow-ups');
        return;
      }
      fetchUpcomingFollowups();
    }
  }, [selectedFilter, fetchUpcomingFollowups]);

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const handleCustomDateSubmit = () => {
    if (customStartDate && customEndDate) {
      fetchUpcomingFollowups();
    }
  };

  const calculateDaysUntil = (followUpDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(followUpDate);
    targetDate.setHours(0, 0, 0, 0);
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (followUpDate) => {
    return calculateDaysUntil(followUpDate) < 0;
  };

  const handleQuotationClick = (quotationId) => {
    navigate(`/quotations/${quotationId}`);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400';
      case 'APPROVED':
        return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400';
      case 'SENT':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400';
      case 'REJECTED':
        return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400';
      case 'DRAFT':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
        Upcoming Follow-ups
      </h2>

      {/* Filter Buttons */}
      <div className="mb-4 sm:mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('next15days')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'next15days'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Next 15 days
        </button>
        <button
          onClick={() => handleFilterChange('next30days')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'next30days'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Next 30 days
        </button>
        <button
          onClick={() => handleFilterChange('next2months')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'next2months'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Next 2 months
        </button>
        <button
          onClick={() => handleFilterChange('custom')}
          className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFilter === 'custom'
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
        >
          Custom range
        </button>
      </div>

      {/* Custom Date Range Picker */}
      {selectedFilter === 'custom' && (
        <div className="mb-4 sm:mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <button
              onClick={handleCustomDateSubmit}
              className="btn btn-primary w-full sm:w-auto"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      {/* <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => handleFilterChange('next15days')}
          className={`px-4 py-2 rounded ${
            selectedFilter === 'next15days'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Next 15 days
        </button>
        <button
          onClick={() => handleFilterChange('next30days')}
          className={`px-4 py-2 rounded ${
            selectedFilter === 'next30days'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Next 30 days
        </button>
        <button
          onClick={() => handleFilterChange('next2months')}
          className={`px-4 py-2 rounded ${
            selectedFilter === 'next2months'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Next 2 months
        </button>
        <button
          onClick={() => handleFilterChange('custom')}
          className={`px-4 py-2 rounded ${
            selectedFilter === 'custom'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Custom range
        </button>
      </div> */}

      {/* Custom Date Range Picker */}
      {/* {selectedFilter === 'custom' && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <button
              onClick={handleCustomDateSubmit}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      )} */}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading follow-ups...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Quotations List */}
      {!loading && !error && (
        <div className="space-y-3 sm:space-y-4">
          {quotations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">
                No upcoming follow-ups found
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                No quotations have follow-up dates in the selected period.
              </p>
            </div>
          ) : (
            quotations.map((quotation) => {
              const daysUntil = calculateDaysUntil(quotation.followUpDate);
              const overdue = isOverdue(quotation.followUpDate);

              return (
                <div
                  key={quotation.id}
                  onClick={() => handleQuotationClick(quotation.id)}
                  className={`border-2 rounded-lg p-4 sm:p-5 cursor-pointer transition-all hover:shadow-lg ${
                    overdue 
                      ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 hover:border-red-400 dark:hover:border-red-600' 
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {quotation.quotationNumber}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(
                            quotation.status
                          )}`}
                        >
                          {quotation.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                          <span className="font-semibold">Company:</span>{' '}
                          {quotation.companyName || 'N/A'}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                          <span className="font-semibold">Follow-up Date:</span>{' '}
                          {new Date(quotation.followUpDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">
                          <span className="font-semibold">Amount:</span>{' '}
                          OMR {quotation.totalAmount?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                      <div
                        className={`text-center px-4 py-2 rounded-lg ${
                          overdue 
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' 
                            : 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400'
                        }`}
                      >
                        {overdue ? (
                          <>
                            <div className="text-xs font-medium uppercase tracking-wide">Overdue by</div>
                            <div className="text-3xl font-bold">{Math.abs(daysUntil)}</div>
                            <div className="text-xs font-medium">days</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs font-medium uppercase tracking-wide">In</div>
                            <div className="text-3xl font-bold">{daysUntil}</div>
                            <div className="text-xs font-medium">{daysUntil === 1 ? 'day' : 'days'}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default UpcomingFollowups;
