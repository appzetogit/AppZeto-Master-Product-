import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

/**
 * ActionSlider - Professional "Swipe to Confirm" UI Component.
 * Unified logic for Accept, Pickup, Reached, and Complete actions.
 * 
 * @param {string} label - Text to show on the slider track.
 * @param {Function} onConfirm - Callback when swiped successfully.
 * @param {boolean} disabled - Whether the slider is active.
 * @param {string} color - Hex or Tailwind class for track color.
 */
export const ActionSlider = ({ 
  label = "Slide to Confirm", 
  onConfirm, 
  disabled = false,
  color = "bg-green-600",
  successLabel = "Confirmed ✓"
}) => {
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const containerRef = useRef(null);
  const controls = useAnimation();

  // Reset when disabled state changes
  useEffect(() => {
    if (disabled) {
      setProgress(0);
      setIsSuccess(false);
    }
  }, [disabled]);

  const handleDrag = (event, info) => {
    if (disabled || isSuccess) return;
    
    const containerWidth = containerRef.current.offsetWidth;
    const handleWidth = 64; // w-16
    const totalPath = containerWidth - handleWidth - 8; // p-1 = 4px each side
    
    const currentProgress = Math.min(1, Math.max(0, info.point.x - containerRef.current.getBoundingClientRect().left) / totalPath);
    setProgress(currentProgress);
  };

  const handleDragEnd = async (event, info) => {
    if (disabled || isSuccess) return;

    if (progress > 0.85) {
      setIsSuccess(true);
      setProgress(1);
      if (onConfirm) {
        try {
          await onConfirm();
        } catch (error) {
          // Reset slider if action fails
          setIsSuccess(false);
          setProgress(0);
          controls.start({ x: 0 });
        }
      }
    } else {
      setProgress(0);
      controls.start({ x: 0 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-[68px] rounded-full p-1.5 overflow-hidden transition-all duration-300 ${
        disabled ? 'bg-gray-100' : 'bg-gray-950 shadow-lg shadow-black/10'
      }`}
    >
      {/* Background Track (White text) */}
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-xs uppercase tracking-[0.2em] transition-opacity duration-300 ${
        isSuccess ? 'opacity-0' : 'opacity-40 text-white'
      }`}>
        {disabled ? 'Action Locked' : label}
      </div>

      {/* Dynamic Progress Fill */}
      <motion.div 
        className={`absolute inset-0 ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ 
          width: isSuccess ? '100%' : `${progress * 100}%`,
          opacity: disabled ? 0 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      {/* Success View */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm uppercase tracking-widest"
          >
            {successLabel}
          </motion.div>
        )}
      </AnimatePresence>

      {/* The Handle */}
      <motion.div
        drag={disabled || isSuccess ? false : "x"}
        dragConstraints={{ left: 0, right: containerRef.current ? containerRef.current.offsetWidth - 64 - 12 : 300 }}
        dragElastic={0}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        animate={controls}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center z-20 cursor-grab active:cursor-grabbing shadow-xl transition-colors ${
          disabled ? 'bg-gray-200 text-gray-400' : 
          isSuccess ? 'bg-white text-green-600 scale-90' : 'bg-white text-gray-950'
        }`}
      >
        <ChevronRight className={`w-8 h-8 transition-transform duration-300 ${isSuccess ? 'scale-125 rotate-360' : ''}`} />
      </motion.div>
    </div>
  );
};

// Simple dependency for the Success state
const AnimatePresence = ({ children }) => {
  return <>{children}</>;
};
