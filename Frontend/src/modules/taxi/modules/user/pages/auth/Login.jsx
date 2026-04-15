import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthLayout from '../../components/AuthLayout';
import { ChevronDown, Phone } from 'lucide-react';
import { userAuthService } from '../../services/authService';

const Login = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const isValidPhone = phoneNumber.length === 10 && /^\d+$/.test(phoneNumber);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!isValidPhone) return;

    setLoading(true);
    setError('');

    try {
      const response = await userAuthService.startOtp(phoneNumber);
      const payload = response?.data || {};
      setLoading(false);
      navigate('/taxi/user/verify-otp', {
        state: {
          phone: phoneNumber,
          debugOtp: payload.session?.debugOtp || '',
        },
      });
    } catch (err) {
      setError(err?.message || 'Unable to send OTP. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Enter your mobile number" 
      subtitle="Fast. Affordable. Local rides."
    >
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-4">
          <label htmlFor="phone" className="text-sm font-black text-gray-800 tracking-tight ml-1">
            Mobile Number
          </label>
          <div className="flex items-center gap-3 bg-[#F6F7F9] rounded-2xl p-4 focus-within:ring-2 focus-within:ring-orange-200 focus-within:bg-white transition-all border border-transparent shadow-sm">
            <div className="flex items-center gap-2 pr-3 border-r border-gray-200 opacity-70 group cursor-pointer">
               <img src="https://flagcdn.com/w40/in.png" alt="India" className="w-5 h-3.5 object-cover rounded-sm" />
               <span className="text-[15px] font-bold text-gray-800">+91</span>
               <ChevronDown size={14} className="text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex-1 flex items-center gap-3">
               <Phone size={18} className="text-gray-400 opacity-50" />
               <input 
                  type="tel" 
                  id="phone"
                  autoFocus
                  maxLength={10}
                  placeholder="Enter 10-digit number"
                  className="w-full bg-transparent border-none text-[17px] font-black text-gray-900 placeholder:text-gray-300 focus:outline-none"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
               />
            </div>
          </div>
        </div>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          disabled={!isValidPhone || loading}
          className={`w-full py-4 rounded-full text-lg font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
            isValidPhone && !loading
            ? 'bg-gradient-to-r from-[#E85D04] to-[#F48C06] text-white shadow-orange-200' 
            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Sending OTP...</span>
            </div>
          ) : (
            <span>Continue</span>
          )}
        </motion.button>

        {error && (
          <p className="text-sm font-bold text-red-500 text-center">{error}</p>
        )}

        <p className="text-[12px] text-gray-400 font-bold text-center leading-relaxed px-2 mt-8">
           By continuing, you agree to our 
           <a href="#" className="underline text-[#F48C06] hover:text-[#E85D04] transition-colors ml-1">Terms</a> & 
           <a href="#" className="underline text-[#F48C06] hover:text-[#E85D04] transition-colors ml-1">Privacy Policy</a>
        </p>
      </form>

      {/* Language Toggle */}
      <div className="mt-12 pt-8 border-t border-gray-100 flex justify-center gap-6">
        <button className="text-xs font-black text-primary border-b-2 border-primary pb-1">ENGLISH</button>
        <button className="text-xs font-black text-gray-400 hover:text-gray-600 transition-colors">हिंदी</button>
      </div>
    </AuthLayout>
  );
};

export default Login;
