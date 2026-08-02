import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('sp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sp_token');
      localStorage.removeItem('sp_user');
      window.location.href = '/login';
    }

    // Backend sends a clean, human-readable message in the response body
    // for known failures (e.g. { success: false, message: "..." }). Axios's
    // own error.message is just "Request failed with status code 502" —
    // not something a user should ever see. Prefer the backend's message
    // everywhere, for every API call in this file, not just AI ones.
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      error.message = backendMessage;
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register:       (data) => API.post('/auth/register', data),
  login:          (data) => API.post('/auth/login', data),
  getMe:          ()     => API.get('/auth/me'),
  verifyOtp:      (data) => API.post('/auth/verify-otp', data),
  resendOtp:      (data) => API.post('/auth/resend-otp', data),
  forgotPassword: (data) => API.post('/auth/forgot-password', data),
  resetPassword:  (data) => API.post('/auth/reset-password', data),
};

export const userAPI = {
  getProfile:     ()     => API.get('/users/profile'),
  updateProfile:  (data) => API.put('/users/profile', data),
  changePassword: (data) => API.put('/users/change-password', data),
  getDashboard:   ()     => API.get('/users/dashboard'),
  deleteAccount:  ()     => API.delete('/users/account'),
};

export const skillAPI = {
  getAll:  (params) => API.get('/skills', { params }),
  getStats: ()      => API.get('/skills/stats'),
  getPresets: ()    => API.get('/skills/presets'),
  add:     (data)   => API.post('/skills', data),
  update:  (id, data) => API.put(`/skills/${id}`, data),
  delete:  (id)     => API.delete(`/skills/${id}`),
};

export const goalAPI = {
  getAll:  (params) => API.get('/goals', { params }),
  create:  (data)   => API.post('/goals', data),
  update:  (id, data) => API.put(`/goals/${id}`, data),
  delete:  (id)     => API.delete(`/goals/${id}`),
};

export const careerAPI = {
  getAll:     (params) => API.get('/careers', { params }),
  getOne:     (id)     => API.get(`/careers/${id}`),
  getMatches: ()       => API.get('/careers/match'),
  explore:    (title)  => API.get('/careers/explore', { params: { title } }),
};

export const achievementAPI = {
  getAll: () => API.get('/achievements'),
};

export const marketAPI = {
  getSalary: (jobTitle, category) =>
    API.get(`/market/salary/${encodeURIComponent(jobTitle)}`, { params: { category } }),
  getLiveJobs: (jobTitle, page = 1) =>
    API.get(`/market/jobs/${encodeURIComponent(jobTitle)}`, { params: { page } }),
};

export const learningAPI = {
  searchYouTube: (q, maxResults = 6) =>
    API.get('/learning/youtube?q=' + encodeURIComponent(q) + '&maxResults=' + maxResults),
  getResources: (category) =>
    API.get('/learning/resources/' + encodeURIComponent(category)),
};

export const aiAPI = {
  generate: (prompt, options = {}) => API.post('/ai/generate', { prompt, ...options }),
};

export const resumeAPI = {
  get: () => API.get('/resume'),
  save: (data) => API.put('/resume', data),
};

export const agentAPI = {
  run: (message, history = []) => API.post('/agent/run', { message, history }),
  getHistory:   ()         => API.get('/agent/history'),
  saveHistory:  (messages) => API.put('/agent/history', { messages }),
  clearHistory: ()         => API.delete('/agent/history'),
};

export default API;