import axios from 'axios';
import { uploadToCloudinary, uploadBase64ToCloudinary } from '../utils/cloudinary.js';

const mapAddressComponents = (components) => {
  const get = (type) => {
    const c = components.find((x) => x.types?.includes(type));
    return c ? c.long_name : '';
  };
  const country = get('country');
  const state = get('administrative_area_level_1');
  const city = get('locality') || get('administrative_area_level_2') || get('sublocality');
  const area = get('sublocality') || get('neighborhood') || '';
  const pincode = get('postal_code');
  return { country, state, city, area, pincode };
};

/**
 * @desc    Upload Images (Hotel/Property)
 * @route   POST /api/hotels/upload
 * @access  Private (Partner/Admin)
 */
export const uploadImages = async (req, res) => {
  try {
    // Handle both single file (req.file) and multiple files (req.files)
    const filesToUpload = req.files || (req.file ? [req.file] : []);

    console.log(`[Upload Images] Received ${filesToUpload.length} files`);

    if (!filesToUpload || filesToUpload.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = filesToUpload.map(file =>
      uploadToCloudinary(file.path, 'properties')
    );

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    const urls = results.map(result => result.url);

    console.log(`[Upload Images] Successfully uploaded ${files.length} images`);

    res.json({ success: true, files, urls });
  } catch (error) {
    console.error('Upload Images Error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

/**
 * @desc    Upload Images via Base64 (Flutter Camera)
 * @route   POST /api/hotels/upload-base64
 * @access  Private (Partner/Admin)
 */
export const uploadImagesBase64 = async (req, res) => {
  try {
    let { images } = req.body;

    // Handle single image sent not in an array (Flutter bridge compatibility)
    if (images && !Array.isArray(images)) {
      images = [images];
    }

    console.log(`[Upload Images Base64] Received ${images ? images.length : 0} image items`);

    if (!images || images.length === 0) {
      return res.status(400).json({ message: 'No images provided' });
    }

    const uploadPromises = images.map(async (img, index) => {
      // Support both {base64: '...'} object and raw '...' base64 string
      const base64Data = typeof img === 'object' ? img.base64 : img;
      const fileName = typeof img === 'object' ? img.fileName : null;

      if (!base64Data) {
        throw new Error(`Image ${index + 1} missing base64 data`);
      }

      // Generate unique publicId with random suffix to prevent collisions during batch uploads
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const publicId = fileName
        ? `${Date.now()}-${randomSuffix}-${fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`
        : `${Date.now()}-${randomSuffix}-img-${index}`;

      return uploadBase64ToCloudinary(base64Data, 'properties', publicId);
    });

    const results = await Promise.all(uploadPromises);

    const files = results.map(result => ({
      url: result.url,
      publicId: result.publicId
    }));

    const urls = results.map(result => result.url);

    console.log(`[Upload Images Base64] Successfully uploaded ${files.length} images`);

    res.json({ success: true, files, urls });
  } catch (error) {
    console.error('Upload Images Base64 Error:', error);
    res.status(500).json({ message: error.message || 'Base64 upload failed' });
  }
};

export const getAddressFromCoordinates = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'lat and lng must be numbers' });
    }
    const key = process.env.GOOGLE_MAP_API_KEY;
    if (!key) {
      return res.status(500).json({ message: 'Maps API key not configured' });
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`;
    const { data } = await axios.get(url);
    const first = Array.isArray(data.results) ? data.results[0] : null;
    if (!first) return res.status(404).json({ message: 'Address not found' });
    const { country, state, city, area, pincode } = mapAddressComponents(first.address_components || []);
    res.json({
      success: true,
      country,
      state,
      city,
      area,
      fullAddress: first.formatted_address || '',
      pincode,
      latitude: lat,
      longitude: lng
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const searchLocation = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ message: 'query is required' });
    }
    const key = process.env.GOOGLE_MAP_API_KEY;
    if (!key) {
      return res.status(500).json({ message: 'Maps API key not configured' });
    }
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
      query
    )}&key=${key}`;
    const { data } = await axios.get(url);
    const results = (data.results || []).map((r) => {
      const types = Array.isArray(r.types) ? r.types : [];
      let type = 'tourist';
      if (types.includes('airport')) type = 'airport';
      else if (types.includes('train_station')) type = 'railway';
      else if (types.includes('shopping_mall') || types.includes('store')) type = 'market';
      return {
        name: r.name,
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
        type
      };
    });
    res.json({ success: true, results });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const calculateDistance = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;
    const toNum = (v) => Number(v);
    const oLat = toNum(originLat);
    const oLng = toNum(originLng);
    const dLat = toNum(destLat);
    const dLng = toNum(destLng);
    if ([oLat, oLng, dLat, dLng].some((n) => Number.isNaN(n))) {
      return res.status(400).json({ message: 'Invalid coordinates' });
    }
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLatR = toRad(dLat - oLat);
    const dLngR = toRad(dLng - oLng);
    const a =
      Math.sin(dLatR / 2) * Math.sin(dLatR / 2) +
      Math.cos(toRad(oLat)) * Math.cos(toRad(dLat)) * Math.sin(dLngR / 2) * Math.sin(dLngR / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;
    res.json({ success: true, distanceKm: Number(km.toFixed(2)) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * @desc    Delete Image from Cloudinary
 * @route   POST /api/hotels/delete-image
 * @access  Private (Partner/Admin)
 */
export const deleteImage = async (req, res) => {
  try {
    const { publicId, url } = req.body;

    let pid = publicId;

    // If no publicId but URL is provided, try to extract it
    if (!pid && url) {
      // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v12345678/rukkoin/properties/filename.jpg
      // Public ID would be: rukkoin/properties/filename
      const parts = url.split('/');
      const filename = parts.pop(); // filename.jpg
      const folder2 = parts.pop(); // properties
      const folder1 = parts.pop(); // rukkoin
      pid = `${folder1}/${folder2}/${filename.split('.')[0]}`;
    }

    if (!pid) {
      return res.status(400).json({ message: 'publicId or url is required' });
    }

    console.log(`[Delete Image] Attempting to delete: ${pid}`);
    const result = await deleteFromCloudinary(pid);

    res.json(result);
  } catch (error) {
    console.error('Delete Image Error:', error);
    res.status(500).json({ message: error.message || 'Deletion failed' });
  }
};
