import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
});

// Attach JWT token to every request if it exists in localStorage
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Separate instance for family portal (uses familyToken)
export const familyApi = axios.create({
  baseURL: '/api',
});

familyApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('familyToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;

