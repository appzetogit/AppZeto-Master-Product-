import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Phone, Mail, ArrowLeft, Loader2, Navigation, Camera, Trash2, AlertTriangle, LogOut } from 'lucide-react';
import { authService, userService } from '../../services/apiService';
import toast from 'react-hot-toast';
import { isFlutterApp, openFlutterCamera, uploadBase64Image } from '../../utils/flutterBridge';

const ProfileEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const emptyAddress = {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    coordinates: { lat: null, lng: null }
  };
  const getStoredUser = () => {
    const rawUser = localStorage.getItem('user') || localStorage.getItem('user_user');
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  };

  const normalizeAddress = (address) => ({
    ...emptyAddress,
    ...(address || {}),
    coordinates: {
      ...emptyAddress.coordinates,
      ...(address?.coordinates || {})
    }
  });

  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    profileImage: '',
    profileImagePublicId: '',
    address: emptyAddress
  });

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        profileImage: user.profileImage || '',
        profileImagePublicId: user.profileImagePublicId || '',
        address: normalizeAddress(user.address)
      });
    }
  }, []);

  const autoFillAddress = async (lat, lng) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAP_API_KEY;
    if (!apiKey) return;

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results?.[0]) {
        const result = data.results[0];
        const addressComponents = result.address_components;

        let streetNumber = '';
        let route = '';
        let neighborhood = '';
        let city = '';
        let state = '';
        let pincode = '';
        let country = '';

        addressComponents.forEach(component => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) route = component.long_name;
          if (types.includes('neighborhood') || types.includes('sublocality')) neighborhood = component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.long_name;
          if (types.includes('postal_code')) pincode = component.long_name;
          if (types.includes('country')) country = component.long_name;
        });

        if (!city) {
          const sublocality = addressComponents.find(c => c.types.includes('sublocality_level_1'))?.long_name;
          city = sublocality || '';
        }

        const street = [streetNumber, route, neighborhood].filter(Boolean).join(', ') || result.formatted_address.split(',')[0];

        setFormData(prev => ({
          ...prev,
          address: {
            street: street,
            city: city,
            state: state,
            zipCode: pincode,
            country: country || 'India',
            coordinates: { lat, lng }
          }
        }));

        toast.success('Address auto-filled!');
      }
    } catch (error) {
      console.error('Auto-fill error:', error);
      toast.error('Failed to get address details.');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported');
      return;
    }

    setFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await autoFillAddress(latitude, longitude);
        setFetchingLocation(false);
      },
      (error) => {
        console.error('Location error:', error);
        setFetchingLocation(false);
        toast.error('Unable to retrieve location');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG and WebP images supported');
      return;
    }

    const uploadData = new FormData();
    uploadData.append('files', file);

    try {
      setImageUploading(true);
      // Reuse existing generic upload service
      const response = await authService.uploadDocs(uploadData);

      if (response && response.files && response.files.length > 0) {
        const { url, publicId } = response.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleCameraCapture = async () => {
    try {
      setImageUploading(true);
      const cameraResult = await openFlutterCamera();

      if (!cameraResult.success || !cameraResult.base64) {
        throw new Error('Camera capture failed');
      }

      // Use the generic base64 upload utility
      const uploadResult = await uploadBase64Image(
        cameraResult.base64,
        cameraResult.mimeType,
        cameraResult.fileName
      );

      if (uploadResult.success && uploadResult.files && uploadResult.files.length > 0) {
        const { url, publicId } = uploadResult.files[0];
        setFormData(prev => ({
          ...prev,
          profileImage: url,
          profileImagePublicId: publicId
        }));
        toast.success('Photo uploaded successfully');
      }
    } catch (err) {
      console.error('Camera upload failed:', err);
      toast.error('Camera upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || formData.name.length < 3) {
      toast.error('Name must be at least 3 characters');
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.updateProfile(formData);

      // Update localStorage with new user data
      const updatedUser = response?.user || response?.data?.user || response?.data;
      if (updatedUser) {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.setItem('user_user', JSON.stringify(updatedUser));
      }

      toast.success('Profile updated successfully!');
      navigate(-1);
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      await userService.deleteAccount();
      authService.logout();
      toast.success('Account deleted successfully');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user_accessToken');
    localStorage.removeItem('auth_customer');
    localStorage.removeItem('user_authenticated');
    localStorage.removeItem('user');
    localStorage.removeItem('user_user');

    toast.success('Logged out successfully');
    navigate('/user/auth/login', {
      replace: true,
      state: { redirectTo: '/portal' }
    });
  };

  const handleAddressChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleCameraClick = () => {
    if (isFlutterApp()) {
      handleCameraCapture();
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center pt-safe-top px-6 pb-24 md:pb-0">

      {/* Sticky Header */}
      <div className="sticky top-0 left-0 right-0 w-full z-20 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between border-b border-gray-50 shadow-sm mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
        <div className="w-10"></div> {/* Spacer for balance */}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-6"
      >

        {/* Profile Picture */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-surface text-white flex items-center justify-center shadow-lg shadow-surface/20 overflow-hidden border-4 border-white">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} />
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={imageUploading}
              className="absolute bottom-0 right-0 p-2 bg-surface text-white rounded-full border-2 border-white shadow-md cursor-pointer hover:bg-surface-dark transition-colors"
            >
              <Camera size={16} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={imageUploading}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">Tap icon to change photo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Section: Personal Info */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Full Name</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2 focus-within:border-surface transition-colors">
                <User size={16} className="text-gray-300" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  placeholder="Your Name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Email Address</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2 focus-within:border-surface transition-colors">
                <Mail size={16} className="text-gray-300" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="flex-1 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Phone Number</label>
              <div className="flex items-center gap-3 border-b border-gray-100 pb-2 focus-within:border-surface transition-colors">
                <Phone size={16} className="text-gray-300" />
                <input
                  type="tel"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  className="flex-1 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300"
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>


          {/* Section: Address */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Address Details</label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={fetchingLocation}
                className="flex items-center gap-1 text-[10px] font-bold text-surface bg-surface/5 px-2 py-1 rounded-md hover:bg-surface/10 transaction-colors"
              >
                {fetchingLocation ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                Auto-Detect
              </button>
            </div>

            {/* Address Inputs - Minimalist Style */}
            <div className="space-y-4 pt-1">
              {/* Street */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Street Address</label>
                <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="House No, Street, Area"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* City */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">City</label>
                  <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                    <input
                      type="text"
                      value={formData.address.city}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                      placeholder="City"
                    />
                  </div>
                </div>

                {/* Pincode */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Pincode</label>
                  <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={formData.address.zipCode}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>

              {/* State */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">State</label>
                <div className="border-b border-gray-100 focus-within:border-surface transition-colors">
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    className="w-full py-2 text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 bg-transparent"
                    placeholder="State"
                  />
                </div>
              </div>
            </div>
          </div>


          <button
            type="submit"
            disabled={loading || imageUploading}
            className="w-full bg-surface text-white py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-surface/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Update Profile'}
          </button>
        </form>

        {/* Session & Delete Actions */}
        <div className="pt-8 pb-12 space-y-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-surface font-bold text-sm py-3 border border-surface/15 rounded-2xl hover:bg-surface/5 transition-colors"
          >
            <LogOut size={16} />
            Log Out
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-sm py-3 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
            Delete Account
          </button>
          <p className="mt-3 text-[10px] text-gray-400 text-center px-4">
            Deleting your account is permanent and cannot be undone. All your data will be deactivated.
          </p>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 overflow-hidden relative shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                  Are you absolutely sure? This action is <span className="text-red-500 font-bold">permanent</span> and will deactivate your account immediately.
                </p>

                <div className="flex flex-col w-full gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteLoading}
                    className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : 'Yes, Delete Permanently'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                    className="w-full bg-gray-50 text-gray-600 font-bold py-4 rounded-2xl active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ProfileEdit;
