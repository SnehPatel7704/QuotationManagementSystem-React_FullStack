import api from './api';
import { parseApiError } from '../utils/errorHandler';

export const companyService = {
  getAll: async () => {
    try {
      return await api.get('/companies');
    } catch (error) {
      throw error;
    }
  },
  
  getCompanies: async () => {
    try {
      const response = await api.get('/companies');
      return response.data;
    } catch (error) {
      const parsedError = parseApiError(error);
      console.error('Error fetching companies:', parsedError);
      throw new Error(parsedError.message || 'Failed to fetch companies. Please try again.');
    }
  },
  
  getById: async (id) => {
    try {
      return await api.get(`/companies/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  create: async (companyData) => {
    try {
      return await api.post('/companies', companyData);
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, companyData) => {
    try {
      return await api.put(`/companies/${id}`, companyData);
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await api.delete(`/companies/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  exportExcel: async () => {
    try {
      const response = await api.get('/companies/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'companies.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      throw error;
    }
  },

  importExcel: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await api.post('/companies/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      throw error;
    }
  },
};
