import React from 'react';
import { motion } from 'framer-motion';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col lg:flex-row font-sans selection:bg-orange-100 selection:text-orange-900 overflow-hidden">
      {/* Left side (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#E85D04] via-[#F48C06] to-[#FFB700] relative items-center justify-center p-12">
        <div className="absolute top-10 left-10">
          <img src="/Rydon24.png" alt="Rydon24" className="h-16 object-contain drop-shadow-xl" />
        </div>
        
        <div className="relative z-10 text-center max-w-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl font-black text-white leading-tight mb-4 drop-shadow-md">
              Fast. Affordable. <br/>Local Rides.
            </h2>
            <p className="text-white/80 text-xl font-medium mb-8">
              Reliable transport for your daily commute in Indore.
            </p>
          </motion.div>
          
          <img 
            src="/1_Log In Anytime. Earn Anytime.jpg" 
            alt="Rydon24 Promo" 
            className="w-full max-w-sm mx-auto shadow-2xl rounded-3xl mt-6 transform -rotate-2 hover:rotate-0 transition-transform duration-500"
          />
        </div>
        
        {/* Abstract shapes */}
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-tl-full blur-3xl"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-black/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
      </div>

      {/* Right side (Mobile-first login card) */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative">
        {/* Mobile Header (Visible only on small screens) */}
        <div className="lg:hidden absolute top-8 left-0 right-0 flex flex-col items-center">
            <img src="/Rydon24.png" alt="Rydon24" className="h-12 object-contain drop-shadow-sm" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Smart Mobility & Local Logistics — Rydon24</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[32px] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-gray-50 mt-10 lg:mt-0"
        >
          {title && (
            <div className="mb-8 text-center lg:text-left">
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-gray-400 text-sm md:text-base font-semibold mt-2">
                  {subtitle}
                </p>
              )}
            </div>
          )}
          {children}
        </motion.div>
        
        {/* Helper footer link */}
        <div className="absolute bottom-8 text-center w-full max-w-md">
            <a href="#" className="text-gray-400 text-sm font-bold hover:text-primary transition-colors">Need help?</a>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
