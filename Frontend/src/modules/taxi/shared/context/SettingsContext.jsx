import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    general: {
      app_name: '',
      logo: '',
      favicon: '',
    },
    customization: {
      admin_theme_color: '',
      currency_symbol: '',
    }
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      // Use the global business settings endpoint which serves all modules
      const res = await api.get('/admin/business-settings/public');
      const data = res?.data || res;

      if (data) {
        setSettings({
          general: {
            app_name: data.companyName || '',
            logo: data.logo?.url || '',
            favicon: data.favicon?.url || '',
          },
          customization: {
            admin_theme_color: data.themeColor || '',
            currency_symbol: data.currencySymbol || '₹',
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const appName = settings.general?.app_name || 'App';
    document.title = appName;

    const favicon = settings.general?.favicon || settings.customization?.favicon;
    if (favicon) {
      console.log('Updating favicon dynamically:', favicon.substring(0, 30) + '...');
      let iconLink = document.querySelector("link[rel~='icon']");
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(iconLink);
      }
      
      // Force refresh by adding a cache-busting query param if it's a URL
      // If it's a data URL, we just use it as is
      const href = favicon.startsWith('data:') ? favicon : `${favicon}?v=${Date.now()}`;
      iconLink.href = href;

      // Ensure appropriate type
      if (favicon.startsWith('data:image')) {
        const type = favicon.split(';')[0].split(':')[1];
        iconLink.type = type;
      } else if (favicon.endsWith('.svg')) {
        iconLink.type = 'image/svg+xml';
      } else {
        iconLink.type = 'image/x-icon';
      }
    }
  }, [settings.general?.app_name, settings.general?.favicon, settings.customization?.favicon]);

  const refreshSettings = () => fetchSettings();

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
