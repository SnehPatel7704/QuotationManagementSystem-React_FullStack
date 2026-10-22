import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { companyService } from '../../services/companyService';
import { userService } from '../../services/userService';
import { FiPlus, FiEdit, FiTrash2, FiUsers } from 'react-icons/fi';

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';
  const [users, setUsers] = useState([]);
  const [tenantCompanies, setTenantCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
    if (isSuperAdmin) {
      companyService.getTenants()
        .then((response) => setTenantCompanies(response.data))
        .catch((error) => {
          console.error('Error loading tenant companies:', error);
          alert(error.response?.data?.message || 'Failed to load tenant companies.');
        });
    }
  }, [isSuperAdmin]);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userService.delete(id);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Manage system users</p>
          </div>
          <button onClick={handleAdd} className="btn btn-primary flex items-center space-x-2">
            <FiPlus size={20} />
            <span>Add User</span>
          </button>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Username</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Role</th>
                  {isSuperAdmin && <th className="table-header-cell">Company</th>}
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 6 : 5} className="table-cell text-center py-12">
                      <FiUsers size={48} className="mx-auto mb-4 opacity-50 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">No users found</p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="table-cell font-medium">{user.username}</td>
                      <td className="table-cell">{user.email}</td>
                      <td className="table-cell">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                          {user.role}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="table-cell">
                          {tenantCompanies.find((company) => company.id === user.companyId)?.name || 'System'}
                        </td>
                      )}
                      <td className="table-cell">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.enabled 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {user.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-cell">
                        {user.role !== 'SUPERADMIN' && user.id !== currentUser?.id && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                              title="Edit"
                            >
                              <FiEdit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                              title="Delete"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          </div>
                        )}
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
                {editingUser ? 'Edit User' : 'Add User'}
              </h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = {
                  username: formData.get('username'),
                  email: formData.get('email'),
                  password: formData.get('password'),
                  role: formData.get('role'),
                  ...(editingUser ? { enabled: formData.get('enabled') === 'true' } : {}),
                  ...(isSuperAdmin ? { companyId: Number(formData.get('companyId')) } : {}),
                };
                try {
                  if (editingUser) {
                    await userService.update(editingUser.id, data);
                  } else {
                    await userService.create(data);
                  }
                  setShowModal(false);
                  loadUsers();
                } catch (error) {
                  console.error('Error saving user:', error);
                  alert('Failed to save user');
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Username *</label>
                    <input
                      type="text"
                      name="username"
                      defaultValue={editingUser?.username}
                      required
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={editingUser?.email}
                      required
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Password {editingUser ? '(leave blank to keep current)' : '*'}
                    </label>
                    <input
                      type="password"
                      name="password"
                      required={!editingUser}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role *</label>
                    <select
                      name="role"
                      defaultValue={editingUser?.role || 'USER'}
                      required
                      className="input w-full"
                    >
                      <option value="USER">User</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  {isSuperAdmin && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Company *</label>
                      <select
                        name="companyId"
                        defaultValue={editingUser?.companyId || ''}
                        required
                        className="input w-full"
                      >
                        <option value="">Select a company</option>
                        {tenantCompanies.map((company) => (
                          <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {editingUser && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Account status *</label>
                      <select
                        name="enabled"
                        defaultValue={editingUser.enabled ? 'true' : 'false'}
                        required
                        className="input w-full"
                      >
                        <option value="true">Active</option>
                        <option value="false">Disabled</option>
                      </select>
                    </div>
                  )}
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
                    {editingUser ? 'Update' : 'Create'}
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

export default UserManagement;
