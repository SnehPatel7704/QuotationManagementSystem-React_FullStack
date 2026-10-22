import api from './api';

export const quotationService = {
  getAll: async (params = {}) => {
    try {
      return await api.get('/quotations', { params });
    } catch (error) {
      throw error;
    }
  },

  getById: async (id) => {
    try {
      return await api.get(`/quotations/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  create: async (quotationData) => {
    try {
      return await api.post('/quotations', quotationData);
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id, quotationData) => {
    try {
      return await api.put(`/quotations/${id}`, quotationData);
    } catch (error) {
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      return await api.delete(`/quotations/${id}`);
    } catch (error) {
      throw error;
    }
  },
  
  approve: async (id) => {
    try {
      return await api.post(`/quotations/${id}/approve`);
    } catch (error) {
      throw error;
    }
  },
  
  reject: async (id, rejectionReason) => {
    try {
      return await api.post(`/quotations/${id}/reject`, { rejectionReason });
    } catch (error) {
      throw error;
    }
  },

  clone: async (id) => {
    try {
      return await api.post(`/quotations/${id}/clone`);
    } catch (error) {
      throw error;
    }
  },

  compare: async (id) => {
    try {
      return await api.get(`/quotations/${id}/compare`);
    } catch (error) {
      throw error;
    }
  },
  
  submit: async (id) => {
    try {
      return await api.post(`/quotations/${id}/submit`);
    } catch (error) {
      throw error;
    }
  },
  
  sendToClient: async (id, clientEmail) => {
    try {
      return await api.post(`/quotations/${id}/send`, { clientEmail });
    } catch (error) {
      throw error;
    }
  },
  
  getUpcomingFollowups: async (startDate, endDate) => {
    try {
      return await api.get('/quotations/upcoming-followups', {
        params: { startDate, endDate }
      });
    } catch (error) {
      throw error;
    }
  },
};
