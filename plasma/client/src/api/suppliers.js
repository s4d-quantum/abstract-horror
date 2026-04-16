import api from '../lib/api';

export const suppliersApi = {
    getAll: async (params = {}) => {
        const response = await api.get('/suppliers', { params });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/suppliers', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.patch(`/suppliers/${id}`, data);
        return response.data;
    },

    deactivate: async (id) => {
        const response = await api.patch(`/suppliers/${id}/deactivate`);
        return response.data;
    },

    reactivate: async (id) => {
        const response = await api.patch(`/suppliers/${id}/reactivate`);
        return response.data;
    },

    delete: async (id) => {
        const response = await api.delete(`/suppliers/${id}`);
        return response.data;
    }
};
