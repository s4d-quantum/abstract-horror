import api from '../lib/api';

export const dashboardApi = {
  getMetrics: async () => {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },

  getRecentPurchaseOrders: async (limit = 10) => {
    const response = await api.get('/dashboard/recent-purchase-orders', {
      params: { limit }
    });
    return response.data;
  },

  getRecentSalesOrders: async (limit = 10) => {
    const response = await api.get('/dashboard/recent-sales-orders', {
      params: { limit }
    });
    return response.data;
  },

  getActivitySummary: async () => {
    const response = await api.get('/dashboard/activity-summary');
    return response.data;
  },

  getLowStockAlerts: async () => {
    const response = await api.get('/dashboard/low-stock-alerts');
    return response.data;
  },

  getStatusBreakdown: async () => {
    const response = await api.get('/dashboard/status-breakdown');
    return response.data;
  },

  getTopManufacturers: async (limit = 5) => {
    const response = await api.get('/dashboard/top-manufacturers', {
      params: { limit }
    });
    return response.data;
  }
};
