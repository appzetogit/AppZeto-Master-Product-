import InfoPage from '../models/InfoPage.js';
import PlatformSettings from '../models/PlatformSettings.js';

export const getPublicPage = async (req, res) => {
  try {
    const { audience, slug } = req.params;

    if (!['user', 'partner'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!['terms', 'privacy', 'about', 'contact'].includes(slug)) {
      return res.status(400).json({ success: false, message: 'Invalid page type' });
    }

    const page = await InfoPage.findOne({ audience, slug, isActive: true });

    if (!page) {
      return res.status(404).json({ success: false, message: 'Page not configured yet' });
    }

    res.status(200).json({ success: true, page });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching page' });
  }
};

export const getPublicPlatformStatus = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.status(200).json({
      success: true,
      platformOpen: settings.platformOpen,
      maintenanceMode: settings.maintenanceMode,
      bookingDisabledMessage: settings.bookingDisabledMessage,
      maintenanceTitle: settings.maintenanceTitle,
      maintenanceMessage: settings.maintenanceMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching platform status' });
  }
};

export const getFinancialSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    // Only expose taxRate to public/users. defaultCommission is internal usually, 
    // but specific requirement asks for transparency or at least backend uses it.
    // Frontend only needs taxRate for breakdown.
    res.status(200).json({
      success: true,
      taxRate: settings.taxRate ?? 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching financial settings' });
  }
};
