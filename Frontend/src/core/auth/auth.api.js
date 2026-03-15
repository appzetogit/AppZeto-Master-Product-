import axiosInstance from '../api/axios';

export const login = async (module, credentials) => {
  const response = await axiosInstance.post(`/auth/${module}/login`, credentials);
  return response.data;
};

export const logout = async (module) => {
  const response = await axiosInstance.post(`/auth/${module}/logout`);
  return response.data;
};

export const refreshToken = async (module, token) => {
  const response = await axiosInstance.post(`/auth/${module}/refresh`, { token });
  return response.data;
};
