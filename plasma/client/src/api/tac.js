import api from '../lib/api';

export const lookupTac = async (tacCode) => {
  const { data } = await api.get(`/tac/${tacCode}`);
  return data;
};

export const lookupTacModel = async (modelId) => {
  const { data } = await api.get(`/tac/model/${modelId}`);
  return data;
};
