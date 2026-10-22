import api from './api';
import { parseApiError } from '../utils/errorHandler';

export const productService = {
  getAll: async (companyId) => {
    try {
      return await api.get('/products', { params: companyId ? { companyId } : {} });
    } catch (error) {
      throw error;
    }
  },
  
  getProducts: async () => {
    try {
      const response = await api.get('/products');
      return response.data;
    } catch (error) {
      const parsedError = parseApiError(error);
      console.error('Error fetching products:', parsedError);
      throw new Error(parsedError.message || 'Failed to fetch products. Please try again.');
    }
  },
  
  getById: async (id) => {
    try {
      return await api.get(`/products/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  create: async (productData) => {
    try {
      return await api.post('/products', productData);
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, productData) => {
    try {
      return await api.put(`/products/${id}`, productData);
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await api.delete(`/products/${id}`);
    } catch (error) {
      throw error;
    }
  },

  exportExcel: async (companyId) => {
    try {
      const response = await api.get('/products/export-excel', {
        responseType: 'blob',
        params: companyId ? { companyId } : {},
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      throw error;
    }
  },

  importExcel: async (file, companyId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (companyId) {
        formData.append('companyId', String(companyId));
      }
      return await api.post('/products/import-excel', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      throw error;
    }
  },
};
