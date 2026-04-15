import api from '../../../shared/api/axiosInstance';

export const userService = {
  getAppModules: async () => {
    return await api.get('/users/app-modules');
  },
};
