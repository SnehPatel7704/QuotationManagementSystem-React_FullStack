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
};
