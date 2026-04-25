/**
 * Business Settings Utility
 * Handles loading and updating business settings (favicon, title, logo)
 */

import apiClient from "@food/api/axios";
import { API_ENDPOINTS } from "@food/api/config";
import { publicGetOnce } from "@food/api";

const SETTINGS_KEY = 'food_business_settings';

// Initialize from localStorage immediately so it's available for components on mount
let cachedSettings = (() => {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
})();

/**
 * Update theme color in document root
 */
export const updateThemeColor = (color) => {
  if (!color || typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--primary-theme', color);
  document.documentElement.style.setProperty('--sidebar-theme', color);
};

// Apply cached settings immediately on module load if they exist
if (cachedSettings) {
  setTimeout(() => {
    updateFavicon(cachedSettings.favicon?.url);
    updateTitle(cachedSettings.companyName);
    updateThemeColor(cachedSettings.themeColor);
  }, 0);
}

let inFlightSettingsPromise = null;

/**
 * Load business settings from backend (public endpoint - no auth required)
 */
export const loadBusinessSettings = async () => {
  try {
    const endpoint = API_ENDPOINTS.ADMIN.BUSINESS_SETTINGS_PUBLIC;
    if (!endpoint || (typeof endpoint === "string" && !endpoint.trim())) {
      return cachedSettings;
    }

    if (inFlightSettingsPromise) {
      return await inFlightSettingsPromise;
    }

    inFlightSettingsPromise = (async () => {
      const response = await publicGetOnce(endpoint, { noCache: true });
      const settings = response?.data?.data || response?.data;

      if (settings) {
        cachedSettings = settings;
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {}
        
        updateFavicon(settings.favicon?.url);
        updateTitle(settings.companyName);
        updateThemeColor(settings.themeColor);
        return settings;
      }
      return cachedSettings;
    })();

    return await inFlightSettingsPromise;
  } catch (error) {
    return cachedSettings;
  } finally {
    inFlightSettingsPromise = null;
  }
};

/**
 * Update favicon in document
 */
export const updateFavicon = (url) => {
  if (!url || typeof document === 'undefined') return;
  const existingFavicons = document.querySelectorAll("link[rel*='icon']");
  existingFavicons.forEach(el => el.remove());
  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = url;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};

/**
 * Update page title
 */
export const updateTitle = (companyName) => {
  if (companyName && typeof document !== 'undefined') {
    document.title = companyName;
  }
};

/**
 * Set cached settings manually (useful after update)
 */
export const setCachedSettings = (settings) => {
  if (settings) {
    cachedSettings = settings;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
    
    updateFavicon(settings.favicon?.url);
    updateTitle(settings.companyName);
    updateThemeColor(settings.themeColor);
  }
};

/**
 * Clear cached settings (call after updating settings)
 */
export const clearCache = () => {
  cachedSettings = null;
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch (e) {}
};

/**
 * Get cached settings
 */
export const getCachedSettings = () => {
  return cachedSettings;
};

/**
 * Get company name from business settings with fallback
 */
export const getCompanyName = () => {
  const settings = getCachedSettings();
  return settings?.companyName || "Appzeto";
};

/**
 * Get company name asynchronously (loads if not cached)
 */
export const getCompanyNameAsync = async () => {
  try {
    const settings = await loadBusinessSettings();
    return settings?.companyName || "Appzeto";
  } catch (error) {
    return "Appzeto";
  }
};
