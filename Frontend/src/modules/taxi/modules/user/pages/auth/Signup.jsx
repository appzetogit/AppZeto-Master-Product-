import React, { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/AuthLayout';
import { User, Mail, Camera, Smartphone } from 'lucide-react';
import { userAuthService } from '../../services/authService';

const Signup = () => {
  const location = useLocation();
  const initialPhone = String(location.state?.phone || '').replace(/\D/g, '').slice(-10);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    phone: initialPhone,
    name: '',
    email: '',
    gender: 'prefer-not-to-say',
    profileImage: '',
  });
  const [loading, setLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const isValidPhone = /^\d{10}$/.test(formData.phone);

  const avatarPreviewUrl = useMemo(() => {
    return formData.profileImage || '';
  }, [formData.profileImage]);

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const handlePickPhoto = () => {
    setPhotoError('');
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError('');
    setPhotoUploading(true);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const uploadPayload = await userAuthService.uploadProfileImage(dataUrl);
      const secureUrl = uploadPayload?.data?.secureUrl || '';

      if (!secureUrl) {
        throw new Error('Upload failed');
      }

      setFormData((prev) => ({ ...prev, profileImage: secureUrl }));
    } catch (err) {
      setPhotoError(err?.message || 'Photo upload failed');
      setFormData((prev) => ({ ...prev, profileImage: '' }));
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!formData.name || !isValidPhone) return;

    setLoading(true);
    setError('');

    try {
      const response = await userAuthService.signup({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        gender: formData.gender,
        profileImage: formData.profileImage,
      });
      const payload = response?.data || {};

      localStorage.setItem('token', payload.token || '');
      localStorage.setItem('userToken', payload.token || '');
      localStorage.setItem('role', 'user');
      localStorage.setItem('userInfo', JSON.stringify(payload.user || {}));
      navigate('/taxi/user', { replace: true });
    } catch (err) {
      setError(err?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenderChange = (gender) => {
    setFormData({ ...formData, gender });
  }

  return (
    <AuthLayout 
      title="Complete your profile" 
      subtitle="Just a few details to get started"
    >
      <form onSubmit={handleSignup} className="space-y-8">
        {/* Avatar Placeholder */}
        <div className="flex flex-col items-center">
            <div className="relative group active:scale-95 transition-all">
                <div className="w-24 h-24 rounded-full bg-orange-50 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                    {avatarPreviewUrl ? (
                      <img src={avatarPreviewUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={40} className="text-primary/40" />
                    )}
                </div>
                <button
                  type="button"
                  onClick={handlePickPhoto}
                  disabled={photoUploading}
                  className="absolute bottom-1 right-1 w-8 h-8 bg-primary rounded-full border-2 border-white flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Camera size={14} />
                </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-3">Upload Profile Photo</p>
            {photoUploading && <p className="text-[11px] font-bold text-gray-400 mt-2">Uploading...</p>}
            {photoError && <p className="text-[11px] font-bold text-red-500 mt-2">{photoError}</p>}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number *</label>
            <div className="bg-[#F6F7F9] rounded-2xl p-4 border border-transparent focus-within:ring-2 focus-within:ring-orange-200 focus-within:bg-white transition-all flex items-center gap-3">
              <Smartphone size={18} className="text-gray-300" />
              <span className="text-[16px] font-black text-gray-500">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="Enter 10-digit number"
                className="w-full bg-transparent border-none text-[16px] font-black text-gray-900 placeholder:text-gray-300 focus:outline-none"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name *</label>
            <div className="bg-[#F6F7F9] rounded-2xl p-4 border border-transparent focus-within:ring-2 focus-within:ring-orange-200 focus-within:bg-white transition-all flex items-center gap-3">
              <User size={18} className="text-gray-300" />
              <input 
                type="text" 
                placeholder="Enter your name"
                className="w-full bg-transparent border-none text-[16px] font-black text-gray-900 placeholder:text-gray-300 focus:outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address (Optional)</label>
            <div className="bg-[#F6F7F9] rounded-2xl p-4 border border-transparent focus-within:ring-2 focus-within:ring-orange-200 focus-within:bg-white transition-all flex items-center gap-3">
              <Mail size={18} className="text-gray-300" />
              <input 
                type="email" 
                placeholder="Enter email address"
                className="w-full bg-transparent border-none text-[16px] font-black text-gray-900 placeholder:text-gray-300 focus:outline-none"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
             <div className="flex gap-2">
                {['Male', 'Female', 'Other'].map((g) => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => handleGenderChange(g.toLowerCase())}
                        className={`flex-1 py-3 rounded-xl text-[13px] font-black border-2 transition-all ${
                            formData.gender === g.toLowerCase() 
                            ? 'border-primary bg-orange-50 text-primary shadow-sm' 
                            : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                        {g}
                    </button>
                ))}
             </div>
          </div>

          {error && (
            <p className="text-sm font-bold text-red-500 text-center">{error}</p>
          )}
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={!formData.name || !isValidPhone || loading || photoUploading}
          className={`w-full py-4 rounded-full text-lg font-black shadow-lg transition-all flex items-center justify-center gap-3 mt-4 ${
            formData.name && isValidPhone && !loading && !photoUploading
            ? 'bg-gradient-to-r from-[#E85D04] to-[#F48C06] text-white' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            <span>Let's Go!</span>
          )}
        </motion.button>

        <div className="text-center">
            <button 
                type="button"
                onClick={() => navigate('/')} 
                className="text-gray-400 font-bold hover:text-gray-600 transition-colors text-sm underline underline-offset-4 decoration-dashed"
            >
                Skip for now
            </button>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Signup;
