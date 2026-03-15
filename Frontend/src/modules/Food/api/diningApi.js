import apiClient from "./axios.js";
import { API_ENDPOINTS } from "./config.js";

// Export dining API helper functions
export const diningAPI = {
  // Get dining restaurants (with optional filters)
  getRestaurants: (params = {}) => {
    return apiClient.get(API_ENDPOINTS.DINING.RESTAURANTS, { params });
  },

  // Get restaurant by slug
  getRestaurantBySlug: (slug) => {
    return apiClient.get(
      API_ENDPOINTS.DINING.RESTAURANT_BY_SLUG.replace(":slug", slug),
    );
  },

  // Get dining categories
  getCategories: () => {
    return apiClient.get(API_ENDPOINTS.DINING.CATEGORIES);
  },

  // Get limelight features
  getLimelight: () => {
    return apiClient.get(API_ENDPOINTS.DINING.LIMELIGHT);
  },

  // Get bank offers
  getBankOffers: () => {
    return apiClient.get(API_ENDPOINTS.DINING.BANK_OFFERS);
  },

  // Get must tries
  getMustTries: () => {
    return apiClient.get(API_ENDPOINTS.DINING.MUST_TRIES);
  },

  // Get offer banners (used as limelight in Dining.jsx)
  getOfferBanners: () => {
    return apiClient.get(API_ENDPOINTS.DINING.OFFER_BANNERS);
  },

  // Get dining stories
  getStories: () => {
    return apiClient.get(API_ENDPOINTS.DINING.STORIES);
  },
  // Create a new table booking
  createBooking: (bookingData) => {
    return apiClient.post(API_ENDPOINTS.DINING.BOOKING_CREATE, bookingData);
  },
  // Get current user's bookings
  getBookings: () => {
    return apiClient.get(API_ENDPOINTS.DINING.BOOKING_MY);
  },
  // Get bookings for a specific restaurant (for owners)
  getRestaurantBookings: (restaurantId) => {
    return apiClient.get(
      API_ENDPOINTS.DINING.BOOKING_RESTAURANT.replace(
        ":restaurantId",
        restaurantId,
      ),
    );
  },
  // Update booking status
  updateBookingStatus: (bookingId, status) => {
    return apiClient.patch(
      API_ENDPOINTS.DINING.BOOKING_STATUS.replace(":bookingId", bookingId),
      { status },
    );
  },
  // Update booking status (for restaurant owners)
  updateBookingStatusRestaurant: (bookingId, status) => {
    return apiClient.patch(
      API_ENDPOINTS.DINING.BOOKING_STATUS_RESTAURANT.replace(
        ":bookingId",
        bookingId,
      ),
      { status },
    );
  },
  // Create review
  createReview: (reviewData) => {
    return apiClient.post(API_ENDPOINTS.DINING.REVIEW_CREATE, reviewData);
  },
};

export default diningAPI;
