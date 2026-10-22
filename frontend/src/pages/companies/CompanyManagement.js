import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/companyService';
import { FiPlus, FiEdit, FiTrash2, FiBriefcase, FiDownload, FiUpload } from 'react-icons/fi';

const CompanyManagement = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const [companies, setCompanies] = useState([]);
  const [tenantCompanies, setTenantCompanies] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = React.useRef(null);

  const loadCompanies = useCallback(async (tenantId) => {
    try {
      const response = await companyService.getAll(isSuperAdmin ? tenantId : undefined);
      setCompanies(response.data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) {
      loadCompanies();
      return;
    }

    companyService.getTenants()
      .then((response) => {
        setTenantCompanies(response.data);
        if (response.data.length > 0) {
          setSelectedTenantId(String(response.data[0].id));
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error('Error loading tenant companies:', error);
        setLoading(false);
      });
  }, [isSuperAdmin, loadCompanies]);

  useEffect(() => {
    if (isSuperAdmin && selectedTenantId) {
      loadCompanies(selectedTenantId);
    }
  }, [isSuperAdmin, selectedTenantId, loadCompanies]);

  const handleEdit = (company) => {
    setEditingCompany(company);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingCompany(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await companyService.delete(id);
        loadCompanies(isSuperAdmin ? selectedTenantId : undefined);
      } catch (error) {
        console.error('Error deleting company:', error);
      }
    }
  };

  const handleExport = async () => {
    try {
      await companyService.exportExcel(isSuperAdmin ? selectedTenantId : undefined);
    } catch (error) {
      console.error('Error exporting companies:', error);
      alert('Failed to export companies');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isSuperAdmin && !selectedTenantId) {
      alert('Select a company before importing client companies.');
      e.target.value = '';
      return;
    }

    try {
      setLoading(true);
      const response = await companyService.importExcel(file, isSuperAdmin ? selectedTenantId : undefined);
      await loadCompanies(isSuperAdmin ? selectedTenantId : undefined);
      alert(response.data.message);
    } catch (error) {
      console.error('Error importing companies:', error);
      alert(error.response?.data?.message || 'Failed to import companies.');
      setLoading(false);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Companies</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage company information</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <select
                aria-label="Tenant company"
                value={selectedTenantId}
                onChange={(event) => setSelectedTenantId(event.target.value)}
                className="input min-w-48"
                disabled={tenantCompanies.length === 0}
              >
                {tenantCompanies.length === 0 && <option value="">No active companies</option>}
                {tenantCompanies.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            )}
            <button onClick={handleExport} className="btn btn-secondary flex items-center space-x-2">
              <FiDownload size={18} />
              <span>Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSuperAdmin && !selectedTenantId}
              className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50"
            >
              <FiUpload size={18} />
              <span>Import</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".xlsx"
              className="hidden" 
            />
            <button
              onClick={handleAdd}
              disabled={isSuperAdmin && !selectedTenantId}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <FiPlus size={20} />
              <span>Add Company</span>
            </button>
          </div>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Phone</th>
                  <th className="table-header-cell">Address</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {companies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-cell text-center py-12">
                      <FiBriefcase size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">No companies found</p>
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="table-cell font-medium">{company.name}</td>
                      <td className="table-cell">{company.email}</td>
                      <td className="table-cell">{company.phone}</td>
                      <td className="table-cell">{company.address}</td>
                      <td className="table-cell">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(company)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                            title="Edit"
                          >
                            <FiEdit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                            title="Delete"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingCompany ? 'Edit Company' : 'Add Company'}
              </h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = {
                  name: formData.get('name'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  address: formData.get('address'),
                  ...(isSuperAdmin ? { companyId: Number(selectedTenantId) } : {}),
                };
                try {
                  if (editingCompany) {
                    await companyService.update(editingCompany.id, data);
                  } else {
                    await companyService.create(data);
                  }
                  setShowModal(false);
                  loadCompanies(isSuperAdmin ? selectedTenantId : undefined);
                } catch (error) {
                  console.error('Error saving company:', error);
                  alert('Failed to save company');
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingCompany?.name}
                      required
                      className="input w-full"
                    />
                  </div>
                  {isSuperAdmin && !editingCompany && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Tenant company *</label>
                      <select
                        value={selectedTenantId}
                        onChange={(event) => setSelectedTenantId(event.target.value)}
                        required
                        className="input w-full"
                      >
                        {tenantCompanies.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingCompany?.email}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={editingCompany?.phone}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <textarea
                      name="address"
                      defaultValue={editingCompany?.address}
                      rows={3}
                      className="input w-full"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingCompany ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyManagement;
