import api from '../lib/api';

export const qcApi = {
  getJobs: async (params = {}) => {
    const response = await api.get('/qc/jobs', { params });
    return response.data;
  },

  getJob: async (id) => {
    const response = await api.get(`/qc/jobs/${id}`);
    return response.data;
  },

  createJob: async (data) => {
    const response = await api.post('/qc/jobs', data);
    return response.data;
  },

  updateJob: async (id, data) => {
    const response = await api.patch(`/qc/jobs/${id}`, data);
    return response.data;
  },

  saveResults: async (id, data) => {
    const response = await api.post(`/qc/jobs/${id}/results`, data);
    return response.data;
  },

  completeJob: async (id) => {
    const response = await api.post(`/qc/jobs/${id}/complete`);
    return response.data;
  },
};
