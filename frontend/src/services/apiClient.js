import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getStoredToken } from '../utils/tokenStorage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // 45 seconds for LLM workflow synthesis
});

let tokenGetter = getStoredToken;
let onUnauthorizedCallback = null;

export const setTokenGetter = (fn) => {
  tokenGetter = fn;
};

export const setOnUnauthorized = (fn) => {
  onUnauthorizedCallback = fn;
};

// Request interceptor: attach bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenGetter ? tokenGetter() : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: format errors and handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    const data = error.response ? error.response.data : null;
    const url = error.config?.url || '';

    // Ignore 401s from auth-specific endpoints to prevent infinite logout loops
    // and preserve form-level authentication error messages
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/logout');

    if (status === 401 && !isAuthEndpoint && onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }

    // Format uniform error object
    const formattedError = {
      status,
      code: data?.code || (status ? `http_${status}` : 'network_error'),
      message: data?.message || error.message || 'An unexpected error occurred',
      details: data?.details || {},
      raw: error,
    };

    return Promise.reject(formattedError);
  }
);

export { apiClient };
export default apiClient;

