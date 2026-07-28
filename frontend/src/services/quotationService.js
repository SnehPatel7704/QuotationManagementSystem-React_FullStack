import api from './api';

export const quotationService = {
  getAll: async () => {
    try {
      return await api.get('/quotations');
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
      return await api.post(`/quotations/${id}/reject`, null, {
        params: { rejectionReason }
      });
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
      return await api.post(`/quotations/${id}/send`, null, {
        params: { clientEmail }
      });
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
