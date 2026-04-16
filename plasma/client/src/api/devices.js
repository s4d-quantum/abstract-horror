import api from '../lib/api';

export const devicesApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/devices', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/devices/${id}`);
    return response.data;
  },

  getHistory: async (id, limit = 50) => {
    const response = await api.get(`/devices/${id}/history`, {
      params: { limit }
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/devices/${id}`, data);
    return response.data;
  },

  updateStatus: async (id, status, notes) => {
    const response = await api.patch(`/devices/${id}/status`, { status, notes });
    return response.data;
  },

  getFilterOptions: async () => {
    const response = await api.get('/devices/filters/options');
    return response.data;
  },

  searchByImei: async (imei) => {
    const response = await api.get('/devices/search/imei', {
      params: { imei }
    });
    return response.data;
  }
};
