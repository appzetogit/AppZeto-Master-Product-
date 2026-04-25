import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const ReferralHandler = () => {
  const { referralCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (referralCode) {
      const code = referralCode.toUpperCase();
      console.log(`[REFERRAL_DEBUG] Captured Referral Code from URL: ${code}`);
      localStorage.setItem('referralCode', code);
      // Small delay for UX/Processing if needed, though immediate redirect is fine
      console.log(`[REFERRAL_DEBUG] Stored in localStorage, redirecting to signup...`);
      navigate('/signup');
    } else {
      console.log(`[REFERRAL_DEBUG] No referral code found in URL, redirecting to home...`);
      navigate('/');
    }
  }, [referralCode, navigate]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-white">
      <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
      <h2 className="text-xl font-bold tracking-tight">Validating Referral...</h2>
      <p className="text-white/50 text-sm mt-2">Setting up your ₹100 discount</p>
    </div>
  );
};

export default ReferralHandler;
