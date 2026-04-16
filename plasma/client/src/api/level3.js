import api from '../lib/api';

export const level3Api = {
  // Get active repairs list
  getActiveRepairs: async (params = {}) => {
    const response = await api.get('/level3/active', { params });
    return response.data;
  },

  // Get completed repairs list
  getCompletedRepairs: async (params = {}) => {
    const response = await api.get('/level3/completed', { params });
    return response.data;
  },

  // Get single repair details
  getRepairById: async (id) => {
    const response = await api.get(`/level3/${id}`);
    return response.data;
  },

  // Book new repair
  bookRepair: async (data) => {
    const response = await api.post('/level3/book', data);
    return response.data;
  },

  // Update repair status and comments
  updateRepair: async (id, data) => {
    const response = await api.patch(`/level3/${id}`, data);
    return response.data;
  },

  // Get available L3 locations
  getAvailableLocations: async () => {
    const response = await api.get('/level3/locations');
    return response.data;
  }
};
