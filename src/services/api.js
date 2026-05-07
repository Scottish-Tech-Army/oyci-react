import axios from 'axios';

const BASE = '/api';
const api = axios.create({ baseURL: BASE });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const registerStudent = (data) => api.post('/auth/register/student', data);

// Admin - Staff
export const createStaff = (data) => api.post('/admin/staff', data);
export const getAllStaff = () => api.get('/admin/staff');
export const getStaffById = (id) => api.get(`/admin/staff/${id}`);
export const updateStaff = (id, data) => api.put(`/admin/staff/${id}`, data);
export const deleteStaff = (id) => api.delete(`/admin/staff/${id}`);
export const getStaffBySkills = (skills) => api.get('/admin/staff/by-skills', { params: { skills } });

// Admin - Students
export const getAllStudents = () => api.get('/admin/students');

// Events (Admin/Staff)
export const createEvent = (data) => api.post('/events', data);
export const getAllEvents = () => api.get('/events');
export const getEvent = (id) => api.get(`/events/${id}`);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const assignStaff = (id, data) => api.patch(`/events/${id}/assign-staff`, data);
export const getEligibleStaff = (id, differentAbledOnly = false) =>
  api.get(`/events/${id}/eligible-staff`, { params: { differentAbledOnly } });
export const getEligibleStaffPreview = (skills, eventTimeStart, eventTimeEnd, differentAbledOnly = false) =>
  api.get('/events/eligible-staff-preview', { params: { skills, eventTimeStart, eventTimeEnd, differentAbledOnly } });
export const duplicateEvent = (id, data) => api.post(`/events/${id}/duplicate`, data);
export const submitFeedback = (id, data) => api.post(`/events/${id}/feedback`, data);

// Events (Student)
export const getAvailableEvents = () => api.get('/events/available');
export const getAllEventsForStudent = () => api.get('/events/all-events');
export const registerForEvent = (id) => api.post(`/events/${id}/register`);
export const unregisterFromEvent = (id) => api.delete(`/events/${id}/register`);
export const getMyEvents = () => api.get('/events/my-events');

// Student self-service
export const getMyStudentProfile = () => api.get('/student/me');
export const updateMySkills = (data) => api.put('/student/me/skills', data);
export const dismissCertificateBanner = () => api.post('/student/me/dismiss-banner');

// Staff self-service
export const getMyStaffProfile = () => api.get('/staff/me');
export const updateMyStaffProfile = (data) => api.put('/staff/me', data);
export const addHoliday = (data) => api.post('/staff/me/holidays', data);
export const removeHoliday = (date) => api.delete(`/staff/me/holidays/${date}`);
export const withdrawFromEvent = (data) => api.post('/staff/me/withdraw', data);

export default api;
