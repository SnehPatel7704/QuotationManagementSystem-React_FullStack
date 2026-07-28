import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { quotationService } from '../../services/quotationService';
import { RejectionReasonModal, ConfirmDialog } from '../../components/common';
import { FiPlus, FiEdit, FiTrash2, FiSend, FiCheckCircle, FiCheck, FiX, FiEye, FiUpload } from 'react-icons/fi';

const QuotationList = () => {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [selectedQuotationNumber, setSelectedQuotationNumber] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    try {
      const response = await quotationService.getAll();
      setQuotations(response.data);
    } catch (error) {
      console.error('Error loading quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, quotationNumber) => {
    setSelectedQuotationId(id);
    setSelectedQuotationNumber(quotationNumber);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await quotationService.delete(selectedQuotationId);
      await loadQuotations();
      setDeleteDialogOpen(false);
      setSelectedQuotationId(null);
      setSelectedQuotationNumber('');
    } catch (error) {
      console.error('Error deleting quotation:', error);
      alert('Failed to delete quotation. Please try again.');
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(prev => ({ ...prev, [`approve-${id}`]: true }));
    try {
      await quotationService.approve(id);
      await loadQuotations();
      alert('Quotation approved successfully!');
    } catch (error) {
      console.error('Error approving quotation:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve quotation. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`approve-${id}`]: false }));
    }
  };

  const handleReject = async (id) => {
    setSelectedQuotationId(id);
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async (rejectionReason) => {
    setActionLoading(prev => ({ ...prev, [`reject-${selectedQuotationId}`]: true }));
    try {
      await quotationService.reject(selectedQuotationId, rejectionReason);
      await loadQuotations();
      setRejectModalOpen(false);
      setSelectedQuotationId(null);
      alert('Quotation rejected successfully! A new revision has been created.');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      alert('Failed to reject quotation. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [`reject-${selectedQuotationId}`]: false }));
    }
  };

  const handleSubmitForApproval = async (id) => {
    setActionLoading(prev => ({ ...prev, [`submit-${id}`]: true }));
    try {
      await quotationService.submit(id);
      await loadQuotations();
      alert('Quotation submitted for approval successfully!');
    } catch (error) {
      console.error('Error submitting quotation:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit quotation. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [`submit-${id}`]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status] || statusColors.DRAFT}`}>
        {status}
      </span>
    );
  };

  const canEdit = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';
  const canApprove = user?.role === 'SUPERADMIN' || user?.role === 'ADMIN';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Quotations</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">
              Manage all your quotations
            </p>
          </div>
          {canEdit && (
            <Link to="/quotations/create" className="btn btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto">
              <FiPlus size={20} />
              <span>Create Quotation</span>
            </Link>
          )}
        </div>

        {/* Quotations Table */}
        <div className="card overflow-hidden p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Quotation #</th>
                  <th className="table-header-cell">Company</th>
                  <th className="table-header-cell">Total Amount</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Created At</th>
                  {canEdit && <th className="table-header-cell">Actions</th>}
                </tr>
              </thead>
              <tbody className="table-body">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 6 : 5} className="table-cell text-center py-12">
                      <div className="text-gray-500 dark:text-gray-400">
                        <FiCheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No quotations found</p>
                        {canEdit && (
                          <Link to="/quotations/create" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                            Create your first quotation
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="table-cell font-medium text-primary-600 dark:text-primary-400">
                        <div className="flex items-center space-x-2">
                          <Link to={`/quotations/${quotation.id}`} className="hover:underline">
                            {quotation.quotationNumber}
                          </Link>
                          {quotation.revisionNumber > 1 && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded text-xs font-semibold">
                              Rev {quotation.revisionNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">{quotation.companyId}</td>
                      <td className="table-cell font-semibold">
                        OMR {quotation.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="table-cell">{getStatusBadge(quotation.status)}</td>
                      <td className="table-cell">
                        {new Date(quotation.createdAt).toLocaleDateString()}
                      </td>
                      {canEdit && (
                        <td className="table-cell">
                          <div className="flex space-x-2">
                            {/* View button - always visible */}
                            <Link
                              to={`/quotations/${quotation.id}`}
                              className="p-2 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700 rounded transition-colors"
                              title="View Details"
                            >
                              <FiEye size={18} />
                            </Link>
                            
                            {/* Show Submit button for DRAFT status */}
                            {quotation.status === 'DRAFT' && canEdit && (
                              <button
                                onClick={() => handleSubmitForApproval(quotation.id)}
                                disabled={actionLoading[`submit-${quotation.id}`]}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Submit for Approval"
                              >
                                {actionLoading[`submit-${quotation.id}`] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                ) : (
                                  <FiUpload size={18} />
                                )}
                              </button>
                            )}
                            
                            {/* Show Approve/Reject buttons for PENDING_APPROVAL status */}
                            {quotation.status === 'PENDING_APPROVAL' && canApprove && (
                              <>
                                <button
                                  onClick={() => handleApprove(quotation.id)}
                                  disabled={actionLoading[`approve-${quotation.id}`]}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Approve"
                                >
                                  {actionLoading[`approve-${quotation.id}`] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                                  ) : (
                                    <FiCheck size={18} />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReject(quotation.id)}
                                  disabled={actionLoading[`reject-${quotation.id}`]}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reject"
                                >
                                  {actionLoading[`reject-${quotation.id}`] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                  ) : (
                                    <FiX size={18} />
                                  )}
                                </button>
                              </>
                            )}
                            
                            {/* Edit button - only for DRAFT status */}
                            {quotation.status === 'DRAFT' && canEdit && (
                              <Link
                                to={`/quotations/edit/${quotation.id}`}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
                                title="Edit"
                              >
                                <FiEdit size={18} />
                              </Link>
                            )}
                            
                            {/* Delete button - only for SUPERADMIN */}
                            {user?.role === 'SUPERADMIN' && (
                              <button
                                onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            )}
                            
                            {/* Send button - only for APPROVED status */}
                            {quotation.status === 'APPROVED' && canApprove && (
                              <button
                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 rounded transition-colors"
                                title="Send to Client"
                              >
                                <FiSend size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {quotations.length === 0 ? (
              <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                <FiCheckCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p>No quotations found</p>
                {canEdit && (
                  <Link to="/quotations/create" className="text-primary-600 hover:text-primary-700 mt-2 inline-block">
                    Create your first quotation
                  </Link>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {quotations.map((quotation) => (
                  <div key={quotation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Link to={`/quotations/${quotation.id}`} className="block">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold text-primary-600 dark:text-primary-400">
                              {quotation.quotationNumber}
                            </h3>
                            {quotation.revisionNumber > 1 && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded text-xs font-semibold">
                                Rev {quotation.revisionNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Company ID: {quotation.companyId}
                          </p>
                        </div>
                        {getStatusBadge(quotation.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            OMR {quotation.totalAmount?.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Created:</span>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(quotation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {/* View button - always visible */}
                      <Link
                        to={`/quotations/${quotation.id}`}
                        className="flex-1 min-w-[120px] px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                      >
                        <FiEye size={16} />
                        <span>View</span>
                      </Link>
                      
                      {canEdit && (
                        <>
                          {quotation.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleSubmitForApproval(quotation.id)}
                                disabled={actionLoading[`submit-${quotation.id}`]}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                              >
                                {actionLoading[`submit-${quotation.id}`] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <FiUpload size={16} />
                                    <span>Submit</span>
                                  </>
                                )}
                              </button>
                              <Link
                                to={`/quotations/edit/${quotation.id}`}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                              >
                                <FiEdit size={16} />
                                <span>Edit</span>
                              </Link>
                            </>
                          )}
                          
                          {quotation.status === 'PENDING_APPROVAL' && canApprove && (
                            <>
                              <button
                                onClick={() => handleApprove(quotation.id)}
                                disabled={actionLoading[`approve-${quotation.id}`]}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                              >
                                {actionLoading[`approve-${quotation.id}`] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <FiCheck size={16} />
                                    <span>Approve</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(quotation.id)}
                                disabled={actionLoading[`reject-${quotation.id}`]}
                                className="flex-1 min-w-[120px] px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                              >
                                {actionLoading[`reject-${quotation.id}`] ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                  <>
                                    <FiX size={16} />
                                    <span>Reject</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          
                          {quotation.status === 'DRAFT' && (
                            <Link
                              to={`/quotations/edit/${quotation.id}`}
                              className="flex-1 min-w-[120px] px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                            >
                              <FiEdit size={16} />
                              <span>Edit</span>
                            </Link>
                          )}
                          
                          {/* Delete button - only for SUPERADMIN */}
                          {user?.role === 'SUPERADMIN' && (
                            <button
                              onClick={() => handleDelete(quotation.id, quotation.quotationNumber)}
                              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                            >
                              <FiTrash2 size={16} />
                              <span>Delete</span>
                            </button>
                          )}
                          
                          {quotation.status === 'APPROVED' && (
                            <button
                              className="flex-1 min-w-[120px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                            >
                              <FiSend size={16} />
                              <span>Send</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedQuotationId(null);
        }}
        onSubmit={handleRejectSubmit}
        loading={actionLoading[`reject-${selectedQuotationId}`]}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedQuotationId(null);
          setSelectedQuotationNumber('');
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Quotation"
        message={`Are you sure you want to delete quotation ${selectedQuotationNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </Layout>
  );
};

export default QuotationList;
