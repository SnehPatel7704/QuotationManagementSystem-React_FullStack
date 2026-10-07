import api from './api';

export const companyProfileService = {
  getProfile: async () => {
    return await api.get('/company/profile');
  },
  
  updateProfile: async (data) => {
    return await api.put('/company/profile', data);
  },

  updateTemplate: async (data) => {
    return await api.put('/company/profile/template', data);
  }
};
