import api from '../lib/api';

export const customersApi = {
    getAll: async (params = {}) => {
        const response = await api.get('/customers', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/customers/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/customers', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/customers/${id}`, data);
        return response.data;
    },

    deactivate: async (id) => {
        const response = await api.patch(`/customers/${id}/deactivate`);
        return response.data;
    },

    reactivate: async (id) => {
        const response = await api.patch(`/customers/${id}/reactivate`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/customers/${id}`);
        return response.data;
    }
};
