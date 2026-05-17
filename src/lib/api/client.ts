/**
 * lib/api/client.ts
 *
 * Axios instance pre-configured for the ChainSettle backend.
 * Automatically attaches the JWT token from localStorage to every request.
 * On 401, clears the token and redirects to login.
 */

import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// Attach JWT on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('chainsetttle_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 — clear token and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('chainsetttle_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  },
);
