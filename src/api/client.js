import axios from 'axios';

// Shared HTTP client for the Verax backend. Extracted from statementsAdmin.js
// so the client-import, distribution, and writer-portal modules share one
// request/normalizeError implementation. Every function resolves with the
// response body or rejects with { status, message, detail }; status === 0
// means the backend was unreachable.

export const baseUrl = () => (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

export const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const normalizeError = (error) => {
  const response = error && error.response;
  if (response) {
    const data = response.data;
    let message;
    if (typeof data === 'string' && data) message = data;
    else if (data && typeof data.message === 'string') message = data.message;
    else if (data && typeof data.detail === 'string') message = data.detail;
    else message = (error && error.message) || 'Request failed';
    return { status: response.status, message, detail: data ?? null };
  }
  return {
    status: 0,
    message: 'Backend unreachable',
    detail: (error && error.message) || null,
  };
};

export const request = async (config) => {
  try {
    const response = await axios({
      ...config,
      url: `${baseUrl()}${config.url}`,
      headers: { accept: 'application/json', ...authHeaders(), ...(config.headers || {}) },
    });
    return response.data;
  } catch (error) {
    throw normalizeError(error);
  }
};
