/**
 * API layer placeholder (no backend).
 * All methods return a stub response so UI imports remain valid.
 */

import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

const stub = () =>
  Promise.resolve({
    data: { success: false, message: "Backend not connected", data: null },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  });

const createStubAPI = () =>
  new Proxy(
    {},
    {
      get(_, prop) {
        return () => stub();
      },
    },
  );

export default apiClient;
export { API_ENDPOINTS };

export const api = {
  get: () => stub(),
  post: () => stub(),
  put: () => stub(),
  patch: () => stub(),
  delete: () => stub(),
};

export const authAPI = createStubAPI();
export const userAPI = createStubAPI();
export const locationAPI = createStubAPI();
export const zoneAPI = createStubAPI();
export const restaurantAPI = createStubAPI();
export const deliveryAPI = createStubAPI();
export const adminAPI = createStubAPI();
export const uploadAPI = createStubAPI();
export const orderAPI = createStubAPI();
export const diningAPI = createStubAPI();
export const heroBannerAPI = createStubAPI();
export const publicAPI = createStubAPI();
