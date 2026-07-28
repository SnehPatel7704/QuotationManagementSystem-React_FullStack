import api from './api';

export const userService = {
  getAll: async () => {
    try {
      return await api.get('/superadmin/users');
    } catch (error) {
      throw error;
    }
  },
  
  create: async (userData) => {
    try {
      return await api.post('/superadmin/users', userData);
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, userData) => {
    try {
      return await api.put(`/superadmin/users/${id}`, userData);
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await api.delete(`/superadmin/users/${id}`);
    } catch (error) {
      throw error;
    }
  },
};
