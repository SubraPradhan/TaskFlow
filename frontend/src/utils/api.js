import axios from 'axios';

// In production (same origin on Railway), no base URL needed.
// In dev, Vite proxy handles /api -> localhost:3001
const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('tf_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    window.location.href = '/login';
  }
  return Promise.reject(err);
});

export default api;
