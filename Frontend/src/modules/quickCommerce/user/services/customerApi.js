import axiosInstance from "@core/api/axios";
import { getWithDedupe, invalidateCache } from "@core/api/dedupe";

/**
 * Quick Commerce Backend Services (Customer Module)
 * All endpoints are prefixed with /v1/quick-commerce via the API config unless absolute URLs are used.
 * Version: 1.0.2 - Fixed HMR and re-added missing imports
 */

export const customerApi = {
  // --- Cart & Checkout ---
  getCart: () => axiosInstance.get("/quick-commerce/cart"),
  addToCart: (data) => {
    invalidateCache("/quick-commerce/cart");
    return axiosInstance.post("/quick-commerce/cart/add", data);
  },
  updateCartQuantity: (data) => {
    invalidateCache("/quick-commerce/cart");
    return axiosInstance.put("/quick-commerce/cart/update", data);
  },
  removeFromCart: (productId) => {
    invalidateCache("/quick-commerce/cart");
    return axiosInstance.delete(`/quick-commerce/cart/remove/${productId}`);
  },
  clearCart: () => {
    invalidateCache("/quick-commerce/cart");
    return axiosInstance.delete("/quick-commerce/cart/clear");
  },

  // --- Orders & Checkout ---
  placeOrder: (data) => axiosInstance.post("/quick-commerce/orders", data),
  getOrders: (params) => getWithDedupe("/quick-commerce/orders", params),
  getOrderDetails: (orderId) => getWithDedupe(`/quick-commerce/orders/${orderId}`, {}),
  cancelOrder: (orderId) => axiosInstance.post(`/quick-commerce/orders/${orderId}/cancel`, {}),

  // --- Search & Catalog ---
  getProducts: (params) => getWithDedupe("/quick-commerce/products", params),
  searchProducts: (params) => getWithDedupe("/quick-commerce/products", params),
  getCategories: () => getWithDedupe("/quick-commerce/categories", {}),
  getCategoryProducts: (categoryId, params) => getWithDedupe("/quick-commerce/products", { categoryId, ...params }),
  getProductDetails: (productId) => getWithDedupe(`/quick-commerce/products/${productId}`, {}),

  // --- Customer / Profiles ---
  getAddresses: () => axiosInstance.get("/quick-commerce/addresses"),
  addAddress: (data) => axiosInstance.post("/quick-commerce/addresses", data),
  updateAddress: (id, data) => axiosInstance.put(`/quick-commerce/addresses/${id}`, data),
  deleteAddress: (id) => axiosInstance.delete(`/quick-commerce/addresses/${id}`),

  // --- Store / Discovery ---
  getStores: (params) => getWithDedupe("/quick-commerce/stores", params),
  getStoreDetails: (storeId) => getWithDedupe(`/quick-commerce/stores/${storeId}`, {}),

  // --- Reviews ---
  getProductReviews: (productId) => getWithDedupe(`/quick-commerce/products/${productId}/reviews`, {}),
  submitReview: (data) => axiosInstance.post("/quick-commerce/products/reviews", data),

  // --- Experience & Delivery Optimization ---
  // The "Experience" API handles dynamic layouts, banners, and personalized sections
  getExperienceSections: (params) => getWithDedupe("/quick-commerce/experience", params),
  getHeroConfig: (params) => getWithDedupe("/quick-commerce/experience/hero", params),
  getOfferSections: (params) => getWithDedupe("/quick-commerce/offer-sections", params),
  
  // Catalog / Home
  getHomeData: () => getWithDedupe("/quick-commerce/home", {}),

  // Coupons / Payments
  getCoupons: () => getWithDedupe("/quick-commerce/coupons", {}),
  applyCoupon: (data) => axiosInstance.post("/quick-commerce/coupons/apply", data),

  // Wallet / Loyalty
  getWalletBalance: () => axiosInstance.get("/quick-commerce/wallet/balance"),
  getWalletTransactions: (params) => getWithDedupe("/quick-commerce/wallet/transactions", params),

  // Geocoding (Bridge to specialized backend logic if exists, or just proxy)
  geocodeAddress: (address) => axiosInstance.get(`/quick-commerce/location/geocode?address=${encodeURIComponent(address)}`),

  // Wishlist
  getWishlist: (params) => getWithDedupe("/quick-commerce/wishlist", params),
  addToWishlist: (data) => {
    invalidateCache("/quick-commerce/wishlist");
    return axiosInstance.post("/quick-commerce/wishlist/add", data);
  },
  removeFromWishlist: (productId) => {
    invalidateCache("/quick-commerce/wishlist");
    return axiosInstance.delete(`/quick-commerce/wishlist/remove/${productId}`);
  },
  toggleWishlist: (data) => {
    invalidateCache("/quick-commerce/wishlist");
    return axiosInstance.post("/quick-commerce/wishlist/toggle", data);
  },
};
