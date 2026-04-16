import api from '../lib/api';

export const getAvailableDevicesGrouped = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
  if (filters.manufacturer_id) params.append('manufacturer_id', filters.manufacturer_id);
  if (filters.model_search) params.append('model_search', filters.model_search);
  if (filters.storage_gb) params.append('storage_gb', filters.storage_gb);
  if (filters.color) params.append('color', filters.color);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const response = await api.get(`/sales-orders/available-devices?${params}`);
  return response.data;
};

export const checkAvailability = async (lines) => {
  const response = await api.post('/sales-orders/check-availability', { lines });
  return response.data;
};

export const getSalesOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.status) params.append('status', filters.status);
  if (filters.customer_id) params.append('customer_id', filters.customer_id);
  if (filters.order_type) params.append('order_type', filters.order_type);
  if (filters.search) params.append('search', filters.search);
  if (filters.date_from) params.append('date_from', filters.date_from);
  if (filters.date_to) params.append('date_to', filters.date_to);
  if (filters.is_backmarket !== undefined) params.append('is_backmarket', filters.is_backmarket);
  if (filters.include_summary) params.append('include_summary', 'true');

  const response = await api.get(`/sales-orders?${params}`);
  return response.data;
};

export const getSalesOrder = async (id) => {
  const response = await api.get(`/sales-orders/${id}`);
  return response.data;
};

export const createSalesOrder = async (data) => {
  const response = await api.post('/sales-orders', data);
  return response.data;
};

export const updateSalesOrder = async (id, data) => {
  const response = await api.patch(`/sales-orders/${id}`, data);
  return response.data;
};

export const confirmSalesOrder = async (id) => {
  const response = await api.post(`/sales-orders/${id}/confirm`, {});
  return response.data;
};

export const cancelSalesOrder = async (id) => {
  const response = await api.post(`/sales-orders/${id}/cancel`, {});
  return response.data;
};

export const pickDevices = async (id, devices) => {
  const response = await api.post(`/sales-orders/${id}/pick`, { devices });
  return response.data;
};

export const getPickedDevices = async (id) => {
  const response = await api.get(`/sales-orders/${id}/devices`);
  return response.data;
};

export const shipSalesOrder = async (id, data) => {
  const response = await api.post(`/sales-orders/${id}/ship`, data);
  return response.data;
};
