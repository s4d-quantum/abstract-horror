import api from '../lib/api';

export const purchaseOrdersApi = {
  getAll: async (params = {}) => {
    const response = await api.get('/purchase-orders', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/purchase-orders/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/purchase-orders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/purchase-orders/${id}`, data);
    return response.data;
  },

  confirm: async (id) => {
    const response = await api.post(`/purchase-orders/${id}/confirm`);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.post(`/purchase-orders/${id}/cancel`);
    return response.data;
  },

  receiveDevices: async (id, data) => {
    const response = await api.post(`/purchase-orders/${id}/receive`, data);
    return response.data;
  },

  getReceivedDevices: async (id, limit = 100) => {
    const response = await api.get(`/purchase-orders/${id}/devices`, {
      params: { limit }
    });
    return response.data;
  },

  // New simplified book-as-arrive flow
  bookInStock: async (data) => {
    const response = await api.post('/purchase-orders/book-in', data);
    return response.data;
  }
};
