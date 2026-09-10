import api from './axios';

export const registerUser = (data) => api.post('/auth/register', data);
export const verifyEmailOtp = (data) => api.post('/auth/verify-email', data);
export const resendOtp = (email) => api.post('/auth/resend-otp', { email });
export const loginUser = (data) => api.post('/auth/login', data);
export const googleAuth = (credential) => api.post('/auth/google', { credential });
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const verifyResetOtp = (data) => api.post('/auth/verify-reset-otp', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const getMe = () => api.get('/auth/me');
export const logoutUser = () => api.post('/auth/logout');