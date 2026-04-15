import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthLayout from '../../components/AuthLayout';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { userAuthService } from '../../services/authService';

const unwrap = (response) => response?.data?.data || response?.data || response;

const VerifyOTP = () => {
  const location = useLocation();
  const phone = location.state?.phone || '88XXXXXX88';
  const [debugOtp, setDebugOtp] = useState(() => String(location.state?.debugOtp || ''));
  const [otp, setOtp] = useState(() => {
    const initialOtp = String(location.state?.debugOtp || '');
    return /^\d{4}$/.test(initialOtp) ? initialOtp.split('') : ['', '', '', ''];
  });
  const [timer, setTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const inputs = useRef([]);

  const navigate = useNavigate();

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 3) {
      inputs.current[index + 1]?.focus();
    }

    setError(false);
    setErrorMessage('');
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text').slice(0, 4);
    if (!/^\d+$/.test(data)) return;

    const newOtp = [...otp];
    data.split('').forEach((char, i) => {
      newOtp[i] = char;
      if (inputs.current[i]) inputs.current[i].value = char;
    });
    setOtp(newOtp);
    if (data.length === 4) inputs.current[3]?.focus();
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 4) return;

    setLoading(true);
    setError(false);
    setErrorMessage('');

    try {
      const response = await userAuthService.verifyOtp(phone, fullOtp);
      const payload = unwrap(response);

      setSuccess(true);

      if (payload.exists) {
        localStorage.setItem('token', payload.token || '');
        localStorage.setItem('userToken', payload.token || '');
        localStorage.setItem('role', 'user');
        localStorage.setItem('userInfo', JSON.stringify(payload.user || {}));
        setTimeout(() => navigate('/taxi/user', { replace: true }), 1200);
        return;
      }

      const loginResponse = await userAuthService.verifyOtpLogin(phone);
      const loginPayload = unwrap(loginResponse);

      if (loginPayload.exists && loginPayload.token) {
        localStorage.setItem('token', loginPayload.token || '');
        localStorage.setItem('userToken', loginPayload.token || '');
        localStorage.setItem('role', 'user');
        localStorage.setItem('userInfo', JSON.stringify(loginPayload.user || {}));
        setTimeout(() => navigate('/taxi/user', { replace: true }), 1200);
        return;
      }

      setTimeout(() => navigate('/taxi/user/signup', { state: { phone, otpVerified: true } }), 1200);
    } catch (err) {
      setError(true);
      setErrorMessage(err?.message || 'The OTP you entered is incorrect. Please try again.');
      setOtp(debugOtp && /^\d{4}$/.test(debugOtp) ? debugOtp.split('') : ['', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0 || loading) return;

    setLoading(true);
    setError(false);
    setErrorMessage('');

    try {
      const response = await userAuthService.startOtp(phone);
      const payload = unwrap(response);
      const nextDebugOtp = String(payload.session?.debugOtp || '');
      setDebugOtp(nextDebugOtp);
      setOtp(/^\d{4}$/.test(nextDebugOtp) ? nextDebugOtp.split('') : ['', '', '', '']);
      setTimer(30);
    } catch (err) {
      setError(true);
      setErrorMessage(err?.message || 'Unable to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFilled = otp.every((digit) => digit !== '');

  return (
    <AuthLayout
      title="Verify your number"
      subtitle={`Enter the 4-digit code sent to +91 ${phone}`}
    >
      <div className="absolute top-8 left-8 md:top-10 md:left-10 lg:hidden">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
      </div>

      <div className="space-y-10">
        <div className="flex justify-between gap-1 md:gap-3 py-4">
          {otp.map((digit, index) => (
            <motion.input
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={`w-full h-12 md:h-14 bg-[#F6F7F9] rounded-xl text-center text-xl md:text-2xl font-black transition-all border-2 outline-none focus:bg-white
                ${error ? 'border-red-500 text-red-500 ring-2 ring-red-100' : 'border-transparent focus:border-primary focus:ring-2 focus:ring-orange-100 text-gray-900'}
              `}
            />
          ))}
        </div>

        <div className="text-center">
          {timer > 0 ? (
            <p className="text-gray-400 text-sm font-bold uppercase tracking-wider">
              Resend OTP in <span className="text-primary">{timer}s</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-primary text-sm font-black hover:text-orange-700 underline underline-offset-4 decoration-2 tracking-widest uppercase transition-all"
            >
              Resend OTP
            </button>
          )}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-500 text-center font-bold text-sm"
            >
              {errorMessage || 'The OTP you entered is incorrect. Please try again.'}
            </motion.p>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleVerify}
          disabled={!isFilled || loading || success}
          className={`w-full py-4 rounded-full text-lg font-black shadow-lg transition-all flex items-center justify-center gap-3 ${
            isFilled && !loading && !success
              ? 'bg-gradient-to-r from-[#E85D04] to-[#F48C06] text-white'
              : success
                ? 'bg-green-500 text-white shadow-green-100'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
          }`}
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : success ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={24} />
              <span>Verified Successfully</span>
            </div>
          ) : (
            <span>Verify & Proceed</span>
          )}
        </motion.button>
      </div>
    </AuthLayout>
  );
};

export default VerifyOTP;
