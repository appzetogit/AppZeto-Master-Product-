/**
 * UI-only API client stub (no network).
 * Placeholder for future backend integration.
 */

const makeStubResponse = (config = {}) => ({
  data: { success: false, message: "Backend not connected", data: null },
  status: 200,
  statusText: "OK",
  headers: {},
  config,
});

const stubRequest = (method) => (url, dataOrConfig, maybeConfig) => {
  const config =
    method === "get" || method === "delete"
      ? (dataOrConfig || {})
      : (maybeConfig || {});
  return Promise.resolve(
    makeStubResponse({
      method,
      url,
      ...(method === "get" || method === "delete" ? { ...config } : { data: dataOrConfig, ...config }),
    }),
  );
};

const noopInterceptor = () => ({
  use: () => 0,
  eject: () => {},
});

const apiClient = {
  defaults: {},
  interceptors: {
    request: noopInterceptor(),
    response: noopInterceptor(),
  },
  get: stubRequest("get"),
  post: stubRequest("post"),
  put: stubRequest("put"),
  patch: stubRequest("patch"),
  delete: stubRequest("delete"),
};

export default apiClient;
