import api from './api';
import { parseApiError } from '../utils/errorHandler';

export const productService = {
  getAll: async () => {
    try {
      return await api.get('/products');
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
};
