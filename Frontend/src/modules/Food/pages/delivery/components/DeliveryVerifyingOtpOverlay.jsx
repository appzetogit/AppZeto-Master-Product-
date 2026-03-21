import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

const DeliveryVerifyingOtpOverlay = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[260] bg-black/45 backdrop-blur-[2px] flex items-center justify-center px-6"
        >
          <div className="w-full max-w-xs rounded-2xl bg-white shadow-2xl p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            </div>
            <p className="text-base font-semibold text-gray-900">Verifying OTP</p>
            <p className="text-sm text-gray-600 mt-1">Please wait...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DeliveryVerifyingOtpOverlay;
