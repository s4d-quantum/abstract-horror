import api from '../lib/api';

export const repairApi = {
  getMeta: async () => {
    const response = await api.get('/repair/meta');
    return response.data;
  },

  getJobs: async (params = {}) => {
    const response = await api.get('/repair/jobs', { params });
    return response.data;
  },

  getJob: async (id) => {
    const response = await api.get(`/repair/jobs/${id}`);
    return response.data;
  },

  createJob: async (data) => {
    const response = await api.post('/repair/jobs', data);
    return response.data;
  },

  updateJob: async (id, data) => {
    const response = await api.patch(`/repair/jobs/${id}`, data);
    return response.data;
  },

  addDevicesToJob: async (id, data) => {
    const response = await api.post(`/repair/jobs/${id}/devices`, data);
    return response.data;
  },

  getRecord: async (id) => {
    const response = await api.get(`/repair/records/${id}`);
    return response.data;
  },

  updateRecord: async (id, data) => {
    const response = await api.patch(`/repair/records/${id}`, data);
    return response.data;
  },

  addComment: async (id, data) => {
    const response = await api.post(`/repair/records/${id}/comments`, data);
    return response.data;
  },

  reservePart: async (id, data) => {
    const response = await api.post(`/repair/records/${id}/parts/reserve`, data);
    return response.data;
  },

  fitPart: async (id, data) => {
    const response = await api.post(`/repair/records/${id}/parts/fit`, data);
    return response.data;
  },

  removePart: async (id, data) => {
    const response = await api.post(`/repair/records/${id}/parts/remove`, data);
    return response.data;
  },

  escalateToLevel3: async (id) => {
    const response = await api.post(`/repair/records/${id}/escalate-l3`);
    return response.data;
  },

  getBulkParts: async (jobId, deviceIds) => {
    const response = await api.get(`/repair/jobs/${jobId}/bulk-parts`, { params: { device_ids: deviceIds.join(',') } });
    return response.data;
  },

  bulkRepair: async (jobId, data) => {
    const response = await api.post(`/repair/jobs/${jobId}/bulk-repair`, data);
    return response.data;
  },
};
