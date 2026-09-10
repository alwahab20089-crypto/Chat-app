import api from './axios';

export const getProfile = () => api.get('/profile/me');
export const updateBio = (bio) => api.put('/profile/bio', { bio });
export const updateName = (name) => api.put('/profile/name', { name });
export const updateUsername = (username) => api.put('/profile/username', { username });
export const uploadProfilePicture = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/profile/picture', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const removeProfilePicture = () => api.delete('/profile/picture');
export const deleteAccount = () => api.delete('/profile/account');