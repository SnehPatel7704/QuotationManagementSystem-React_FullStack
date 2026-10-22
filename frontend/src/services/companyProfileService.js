import api from './api';

export const companyProfileService = {
  getProfile: async (companyId) => {
    return await api.get('/company/profile', { params: companyId ? { companyId } : {} });
  },
  
  updateProfile: async (data, companyId) => {
    return await api.put('/company/profile', data, { params: companyId ? { companyId } : {} });
  },

  updateTemplate: async (data, companyId) => {
    return await api.put('/company/profile/template', data, { params: companyId ? { companyId } : {} });
  }
};
