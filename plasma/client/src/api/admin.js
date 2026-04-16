import api from '../lib/api';

export const getRecentAdminOperations = async (limit = 10) => {
  const { data } = await api.get('/admin/operations/recent', {
    params: { limit },
  });
  return data;
};

export const verifyAdminPin = async (payload) => {
  const { data } = await api.post('/admin/verify-pin', payload);
  return data;
};

export const getLocationManagementLocations = async () => {
  const { data } = await api.get('/admin/location-management/locations');
  return data;
};

export const getLocationManagementDevice = async (imei) => {
  const { data } = await api.get(`/admin/location-management/device/${imei}`);
  return data;
};

export const bulkMoveDevices = async (payload) => {
  const { data } = await api.post('/admin/location-management/bulk-move', payload);
  return data;
};

export const runColorCheck = async (payload) => {
  const { data } = await api.post('/admin/color-check', payload);
  return data;
};

export const printSingleLabel = async (payload) => {
  const { data } = await api.post('/admin/print-labels/single', payload);
  return data;
};

export const printBatchLabels = async (payload) => {
  const { data } = await api.post('/admin/print-labels/batch', payload);
  return data;
};
