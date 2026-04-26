// API Service — 

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Base URL from app.config.js
const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5000/api';

// Create Axios Instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 seconds
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// ════════════════════════════════════════
// REQUEST INTERCEPTOR
// Automatically attach JWT token to every request
// We now store the JWT in SecureStore (encrypted) and attach it manually.
// ════════════════════════════════════════
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Error reading token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR
// Handle common errors globally
api.interceptors.response.use(
  (response) => {
    // Return the response data directly
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If 401 (unauthorized) — token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      // Clear stored token — user needs to login again
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
    }

    // Create a standardized error object
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// TOKEN MANAGEMENT
export const saveToken = async (token) => {
  await SecureStore.setItemAsync('authToken', token);
};

export const getToken = async () => {
  return await SecureStore.getItemAsync('authToken');
};

export const removeToken = async () => {
  await SecureStore.deleteItemAsync('authToken');
};

export const saveUserData = async (userData) => {
  await SecureStore.setItemAsync('userData', JSON.stringify(userData));
};

export const getUserData = async () => {
  const data = await SecureStore.getItemAsync('userData');
  return data ? JSON.parse(data) : null;
};

export const removeUserData = async () => {
  await SecureStore.deleteItemAsync('userData');
};

// ════════════════════════════════════════
// AUTH API
// ════════════════════════════════════════

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  signup: (email, password, fullName, phone, role, employeeId, photoUrl) =>
    api.post('/auth/signup', { 
      email, 
      password, 
      full_name: fullName,
      phone,
      role,
      employee_id: employeeId,
      photo_url: photoUrl,
    }),

  getMe: () =>
    api.get('/auth/me'),

  updateProfile: (data) =>
    api.put('/auth/profile', data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email, reset_code, new_password) =>
    api.post('/auth/reset-password', { email, reset_code, new_password }),

  changePassword: (current_password, new_password) =>
    api.put('/auth/change-password', { current_password, new_password }),

  googleLogin: (access_token) =>
    api.post('/auth/google', { access_token }),

  appleLogin: (email, full_name, identity_token) =>
    api.post('/auth/apple', { email, full_name, identity_token }),

  deleteAccount: (password) =>
    api.delete('/auth/account', {
      data: { password }
    }),

  // Send verification code
  sendVerificationCode: (email, fullName) =>
    api.post('/auth/send-verification-code', { email, full_name: fullName }),

  // Verify email code
  verifyEmailCode: (email, code) =>
    api.post('/auth/verify-email-code', { email, code }),

  savePushToken: (push_token) =>
    api.put('/auth/push-token', { push_token }),
};

// ════════════════════════════════════════
// COMPLAINTS API
// ════════════════════════════════════════

export const complaintsAPI = {
  // Create complaint from app (LodgeComplaint.js)
  // data: { station, area, location, asset_type, description, photo_url, contact_name, contact_phone }
  create: (data) =>
    api.post('/complaints', data),

  // Get my complaints (MyComplaints.js)
  getMine: () =>
    api.get('/complaints/mine'),

  // Get all complaints — admin (AllComplaints.js, AdminDashboard.js)
  getAll: (params) =>
    api.get('/complaints', { params }),

  // Get single complaint
  getById: (id) =>
    api.get(`/complaints/${id}`),

  // Get staff jobs (StaffDashboard.js)
  getStaffJobs: (status) =>
    api.get('/complaints/staff-jobs', { params: { status } }),

  // Assign staff — admin (ComplaintDetail.js)
  assignStaff: (complaintId, staffId) =>
    api.put(`/complaints/${complaintId}/assign`, { staffId }),

  // Update status — staff (JobDetails.js)
  updateStatus: (complaintId, status) =>
    api.put(`/complaints/${complaintId}/status`, { status }),

  // Send OTP email to complainant — called by STAFF before entering OTP
  sendOTP: (complaintId) =>
    api.post(`/complaints/${complaintId}/send-otp`),

  // Generate OTP — USER only (MyComplaints.js, app-submitted complaints)
  generateOTP: (complaintId) =>
    api.post(`/complaints/${complaintId}/generate-otp`),

  // Verify OTP — staff (JobDetails.js)
  verifyOTP: (complaintId, otp) =>
    api.post(`/complaints/${complaintId}/verify-otp`, { otp }),

  //update
  updateDescription: (complaintId, description) =>
    api.put(`/complaints/${complaintId}/description`, { description }),

  // Close with written acknowledgement photo (no-email complaints)
  closeWithAck: (complaintId, ackPhotoUrl) =>
    api.post(`/complaints/${complaintId}/close-with-ack`, { ack_photo_url: ackPhotoUrl }),
};


// USERS API
export const usersAPI = {
  // Get all users — admin (ManageUsers.js)
  getAll: (params) =>
    api.get('/users', { params }),

  // Get staff list — admin (ComplaintDetail.js dropdown)
  getStaff: () =>
    api.get('/users/staff'),

  // Get single user — admin (UserDetail.js)
  getById: (id) =>
    api.get(`/users/${id}`),

  // Create user — admin (AddUser.js)
  create: (data) =>
    api.post('/users', data),

  // Update user — admin (UserDetail.js)
  update: (id, data) =>
    api.put(`/users/${id}`, data),

  // Toggle leave — admin (ManageUsers.js, UserDetail.js)
  toggleLeave: (id, reason) =>
    api.put(`/users/${id}/toggle-leave`, { leave_reason: reason }),

  // Self leave status — staff (StaffDashboard.js)
  getLeaveStatus: () =>
    api.get('/users/self/leave-status'),

  // Self toggle leave — staff (StaffDashboard.js)
  toggleSelfLeave: () =>
    api.put('/users/self/toggle-leave'),

  getDesignations: () =>
    api.get('/users/designations'),

  deleteDesignation: (name) =>
    api.delete(`/users/designations/${encodeURIComponent(name)}`),

  // Delete user (admin only)
  deleteUser: (userId) =>
    api.delete(`/users/${userId}`),
};

// UPLOAD API
export const uploadAPI = {
  // Upload profile photo (PhotoPicker.js)
  profilePhoto: async (photoUri) => {
    const formData = new FormData();
    const filename = photoUri.split('/').pop();
    const ext = filename.split('.').pop();

    formData.append('photo', {
      uri: photoUri,
      name: filename,
      type: `image/${ext}`,
    });

    return api.post('/upload/profile-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Upload complaint photo (LodgeComplaint.js, JobDetails.js)
  // asset: string URI  OR  expo-image-picker asset object { uri, mimeType?, fileName? }
  complaintPhoto: async (asset) => {
    const uri      = typeof asset === 'string' ? asset : asset.uri;
    const mimeType = (typeof asset === 'object' && asset.mimeType) ? asset.mimeType : null;
    const rawName  = uri.split('/').pop().split('?')[0]; // strip query params
    const ext      = rawName.includes('.') ? rawName.split('.').pop().toLowerCase() : 'jpg';
    const filename = rawName.includes('.') ? rawName : `photo_${Date.now()}.jpg`;
    const type     = mimeType || (ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg');

    const formData = new FormData();
    formData.append('photo', { uri, name: filename, type });

    return api.post('/upload/complaint-photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadPhoto: (formData) => {
    return api.post('/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// REPORTS API
export const reportsAPI = {
  overview: ()      => api.get('/reports/overview'),
  weekly:   (weekEnd) => weekEnd
    ? api.get('/reports/weekly', { params: { weekEnd } })
    : api.get('/reports/weekly'),
  monthly:  (year)  => api.get('/reports/monthly', { params: { year } }),
  yearly:   ()      => api.get('/reports/yearly'),
  staff:    ()      => api.get('/reports/staff'),
  staffMe:  ()      => api.get('/reports/staff/me'),
  generateExcel: (year, month) =>
    api.post(`/reports/excel/generate?year=${year}&month=${month}`),
  listExcelReports: () => api.get('/reports/excel'),
};

// ════════════════════════════════════════
// HELPER: Get full URL for uploaded files
// ════════════════════════════════════════
// Photos are stored on your server at /uploads/...
// This converts relative path to full URL
//.
//
// AFTER (Your server):
//   photo_url is a relative path like: /uploads/complaints/abc.jpg
//   We need to prepend the server base URL
// ════════════════════════════════════════
// Server root URL (without /api suffix)
export const SERVER_URL = API_URL.replace('/api', '');

export const getFileUrl = (relativePath) => {
  if (!relativePath) return null;

  // If it's already a full URL, return as-is
  if (relativePath.startsWith('http')) return relativePath;

  return `${SERVER_URL}${relativePath}`;
};

// Export the axios instance as default
export default api;