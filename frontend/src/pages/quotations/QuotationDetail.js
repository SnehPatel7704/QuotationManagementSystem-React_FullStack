import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/layout/Layout';
import { quotationService } from '../../services/quotationService';
import { RejectionReasonModal } from '../../components/common';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiX, 
  FiDownload, 
  FiAlertCircle,
  FiClock,
  FiUser,
  FiCalendar,
  FiUpload
} from 'react-icons/fi';

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  useEffect(() => {
    loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadQuotation = async () => {
    try {
      const response = await quotationService.getById(id);
      setQuotation(response.data);
    } catch (error) {
      console.error('Error loading quotation:', error);
      alert('Failed to load quotation details');
      navigate('/quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(prev => ({ ...prev, approve: true }));
    try {
      await quotationService.approve(id);
      await loadQuotation();
      alert('Quotation approved successfully!');
    } catch (error) {
      console.error('Error approving quotation:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to approve quotation. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, approve: false }));
    }
  };

  const handleRejectSubmit = async (rejectionReason) => {
    setActionLoading(prev => ({ ...prev, reject: true }));
    try {
      await quotationService.reject(id, rejectionReason);
      setRejectModalOpen(false);
      alert('Quotation rejected successfully! A new revision has been created.');
      navigate('/quotations');
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to reject quotation. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, reject: false }));
    }
  };

  const handleSubmitForApproval = async () => {
    setActionLoading(prev => ({ ...prev, submit: true }));
    try {
      await quotationService.submit(id);
      await loadQuotation();
      alert('Quotation submitted for approval successfully!');
    } catch (error) {
      console.error('Error submitting quotation:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit quotation. Please try again.';
      alert(errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const handleExportPDF = async () => {
    setActionLoading(prev => ({ ...prev, pdf: true }));
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/quotations/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to export PDF';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `Failed to export PDF: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quotation-${quotation.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('PDF exported successfully!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert(error.message || 'Failed to export PDF. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, pdf: false }));
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
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[status] || statusColors.DRAFT}`}>
        {status}
      </span>
    );
  };

  const canApprove = (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && 
                     quotation?.status === 'PENDING_APPROVAL';
  const canSubmit = (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') && 
                    quotation?.status === 'DRAFT';
  const canExportPDF = quotation?.status === 'APPROVED' || quotation?.status === 'SENT';

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!quotation) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Quotation not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/quotations')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FiArrowLeft size={24} />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {quotation.quotationNumber}
                </h1>
                {quotation.revisionNumber > 1 && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm font-semibold">
                    Revision {quotation.revisionNumber}
                  </span>
                )}
                {getStatusBadge(quotation.status)}
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Quotation Details
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            {canSubmit && (
              <button
                onClick={handleSubmitForApproval}
                disabled={actionLoading.submit}
                className="btn bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.submit ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FiUpload size={18} />
                    <span>Submit</span>
                  </>
                )}
              </button>
            )}
            {canApprove && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading.approve}
                  className="btn bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading.approve ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Approving...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck size={18} />
                      <span>Approve</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setRejectModalOpen(true)}
                  disabled={actionLoading.reject}
                  className="btn bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading.reject ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Rejecting...</span>
                    </>
                  ) : (
                    <>
                      <FiX size={18} />
                      <span>Reject</span>
                    </>
                  )}
                </button>
              </>
            )}
            {canExportPDF && (
              <button
                onClick={handleExportPDF}
                disabled={actionLoading.pdf}
                className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading.pdf ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FiDownload size={18} />
                    <span>Export PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Rejection Reason Alert */}
        {quotation.status === 'REJECTED' && quotation.rejectionReason && (
          <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-300 mb-1">
                  Rejection Reason
                </h3>
                <p className="text-red-800 dark:text-red-400">
                  {quotation.rejectionReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Information */}
            <div className="card">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Quotation Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Company</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {quotation.companyName || `Company ID: ${quotation.companyId}`}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Total Amount</label>
                  <p className="font-bold text-2xl text-primary-600 dark:text-primary-400">
                    OMR {quotation.totalAmount?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                    <FiCalendar size={14} />
                    <span>Created At</span>
                  </label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(quotation.createdAt).toLocaleString()}
                  </p>
                </div>
                {quotation.updatedAt && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                      <FiClock size={14} />
                      <span>Updated At</span>
                    </label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(quotation.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                {quotation.creatorName && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                      <FiUser size={14} />
                      <span>Created By</span>
                    </label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {quotation.creatorName}
                    </p>
                  </div>
                )}
                {quotation.approverName && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                      <FiCheck size={14} />
                      <span>Approved By</span>
                    </label>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {quotation.approverName}
                    </p>
                  </div>
                )}
                {quotation.followUpDate && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Follow-up Date</label>
                    <p className={`font-medium ${
                      new Date(quotation.followUpDate) < new Date() 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {new Date(quotation.followUpDate).toLocaleDateString()}
                      {new Date(quotation.followUpDate) < new Date() && (
                        <span className="ml-2 text-xs">(Overdue)</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="card p-0 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Items
                </h2>
              </div>
              <div className="table-container">
                <table className="table">
                  <thead className="table-header">
                    <tr>
                      <th className="table-header-cell">Product</th>
                      <th className="table-header-cell text-right">Quantity</th>
                      <th className="table-header-cell text-right">Unit Price</th>
                      <th className="table-header-cell text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="table-body">
                    {quotation.items && quotation.items.length > 0 ? (
                      quotation.items.map((item, index) => (
                        <tr key={index}>
                          <td className="table-cell">
                            {item.productName || `Product ID: ${item.productId}`}
                          </td>
                          <td className="table-cell text-right">{item.quantity}</td>
                          <td className="table-cell text-right">
                            OMR {item.unitPrice?.toFixed(2) || '0.00'}
                          </td>
                          <td className="table-cell text-right font-semibold">
                            OMR {((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="table-cell text-center py-8 text-gray-500">
                          No items found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <td colSpan={3} className="table-cell text-right font-bold">
                        Total Amount:
                      </td>
                      <td className="table-cell text-right font-bold text-primary-600 dark:text-primary-400">
                        OMR {quotation.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Revision History */}
            {quotation.parentQuotationId && (
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  Revision History
                </h3>
                <div className="space-y-2">
                  <Link
                    to={`/quotations/${quotation.parentQuotationId}`}
                    className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">Parent Quotation</p>
                    <p className="font-medium text-primary-600 dark:text-primary-400">
                      View Original
                    </p>
                  </Link>
                </div>
              </div>
            )}

            {/* Child Revisions */}
            {quotation.revisions && quotation.revisions.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                  Revisions
                </h3>
                <div className="space-y-2">
                  {quotation.revisions.map((revision) => (
                    <Link
                      key={revision.id}
                      to={`/quotations/${revision.id}`}
                      className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Revision {revision.revisionNumber}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {new Date(revision.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(revision.status)}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      <RejectionReasonModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSubmit={handleRejectSubmit}
        loading={actionLoading.reject}
      />
    </Layout>
  );
};

export default QuotationDetail;
