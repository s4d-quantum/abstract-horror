import api from '../lib/api';

export const partsApi = {
  getMeta: async () => {
    const response = await api.get('/parts/meta');
    return response.data;
  },

  getModels: async (params = {}) => {
    const response = await api.get('/parts/models', { params });
    return response.data;
  },

  getModelDetail: async (id) => {
    const response = await api.get(`/parts/models/${id}`);
    return response.data;
  },

  getBases: async (params = {}) => {
    const response = await api.get('/parts/bases', { params });
    return response.data;
  },

  getBaseDetail: async (id) => {
    const response = await api.get(`/parts/bases/${id}`);
    return response.data;
  },

  createBase: async (data) => {
    const response = await api.post('/parts/bases', data);
    return response.data;
  },

  updateBase: async (id, data) => {
    const response = await api.patch(`/parts/bases/${id}`, data);
    return response.data;
  },

  deleteBase: async (id) => {
    const response = await api.delete(`/parts/bases/${id}`);
    return response.data;
  },

  getVariants: async (params = {}) => {
    const response = await api.get('/parts/variants', { params });
    return response.data;
  },

  createVariant: async (data) => {
    const response = await api.post('/parts/variants', data);
    return response.data;
  },

  updateVariant: async (id, data) => {
    const response = await api.patch(`/parts/variants/${id}`, data);
    return response.data;
  },

  deleteVariant: async (id) => {
    const response = await api.delete(`/parts/variants/${id}`);
    return response.data;
  },

  getCompatibility: async (params = {}) => {
    const response = await api.get('/parts/compatibility', { params });
    return response.data;
  },

  createCompatibility: async (data) => {
    const response = await api.post('/parts/compatibility', data);
    return response.data;
  },

  updateCompatibility: async (id, data) => {
    const response = await api.patch(`/parts/compatibility/${id}`, data);
    return response.data;
  },

  deleteCompatibility: async (id) => {
    const response = await api.delete(`/parts/compatibility/${id}`);
    return response.data;
  },

  goodsIn: async (data) => {
    const response = await api.post('/parts/goods-in', data);
    return response.data;
  },

  bulkGoodsIn: async (data) => {
    const response = await api.post('/parts/bulk-goods-in', data);
    return response.data;
  },

  goodsOut: async (data) => {
    const response = await api.post('/parts/goods-out', data);
    return response.data;
  },

  getFaultReports: async (params = {}) => {
    const response = await api.get('/parts/faulty', { params });
    return response.data;
  },

  updateFaultReport: async (id, data) => {
    const response = await api.patch(`/parts/faulty/${id}`, data);
    return response.data;
  },

  getGoodsInHistory: async (params = {}) => {
    const response = await api.get('/parts/lots/history', { params });
    return response.data;
  },

  getGoodsInDetail: async (params = {}) => {
    const response = await api.get('/parts/lots/detail', { params });
    return response.data;
  },
};
