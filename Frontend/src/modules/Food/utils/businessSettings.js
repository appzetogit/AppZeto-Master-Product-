/**
 * Business Settings Utility
 * Handles loading and updating business settings (favicon, title, logo)
 */

import apiClient from "@food/api/axios";
import { API_ENDPOINTS } from "@food/api/config";
import { publicGetOnce } from "@food/api";

let cachedSettings = null;
let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    // Check if we have a cached version
    if (cachedSettings) {
      return cachedSettings;
    }
    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    // Skip request when endpoint is not configured (avoids GET /api/v1 → 404)
    const endpoint = API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS_PUBLIC;
    if (!endpoint || (typeof endpoint === "string" && !endpoint.trim())) {
      return null;
    }

    inFlightSettingsPromise = (async () => {
      // Use public endpoint that doesn't require authentication
      const response = await publicGetOnce(endpoint);
      const settings = response?.data?.data || response?.data;

      if (settings) {
        cachedSettings = settings;
        updateFavicon(settings.favicon?.url);
        updateTitle(settings.companyName);
        return settings;
      }
      return null;
    })();

    return await inFlightSettingsPromise;
  } catch (error) {
    // Silently fail - this is expected if settings don't exist yet
    return null;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/**
 * Update favicon in document
 */
export const updateFavicon = (url) => {
  if (!url) return;

  // Remove existing favicon
  const existingFavicon = document.querySelector("link[rel='icon']");
  if (existingFavicon) {
    existingFavicon.remove();
  }

  // Add new favicon
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = url;
  // Prevent third-party cookie warning (Cloudinary)
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

/**
 * Update page title
 */
export const updateTitle = (companyName) => {
  if (companyName) {
    document.title = companyName;
  }
};

/**
 * Clear cached settings (call after updating settings)
 */
export const clearCache = () => {
  cachedSettings = null;
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => {
  return cachedSettings;
};

/**
 * Get company name from business settings with fallback
 * @returns {string} Company name or default "Appzeto Food"
 */
export const getCompanyName = () => {
  const settings = getCachedSettings();
  return settings?.companyName || "Appzeto Food";
};

/**
 * Get company name asynchronously (loads if not cached)
 * @returns {Promise<string>} Company name or default "Appzeto Food"
 */
export const getCompanyNameAsync = async () => {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || "Appzeto Food";
  } catch (error) {
    return "Appzeto Food";
  }
};
