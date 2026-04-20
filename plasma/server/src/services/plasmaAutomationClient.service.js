import axios from 'axios';

function sanitizeBaseUrl(value) {
  if (!value) {
    return 'http://localhost:3001';
  }

  return String(value).replace(/\/+$/, '');
}

export function createPlasmaAutomationClient({
  baseUrl = 'http://localhost:3001',
  automationKey,
  timeoutMs = 30000,
  axiosInstance = null,
} = {}) {
  if (!automationKey) {
    throw new Error('PLASMA_AUTOMATION_KEY is required');
  }

  const client = axiosInstance || axios.create({
    baseURL: sanitizeBaseUrl(baseUrl),
    timeout: timeoutMs,
  });

  return {
    async post(path, payload) {
      return client.post(path, payload, {
        headers: {
          'x-plasma-robot-key': automationKey,
        },
      });
    },
  };
}
