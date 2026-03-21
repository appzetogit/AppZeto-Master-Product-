import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightCircle } from 'lucide-react';
import bannerFood1 from "@food/assets/category-icons/food.png"; // Burger
// Using placeholders for variety as in image
const tacoImg = "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&h=200&fit=crop";
const platterImg = "https://images.unsplash.com/photo-1544025162-d76694265947?w=200&h=200&fit=crop";

export default function FestBanner() {
  return (
    <div className="bg-[#ef4f5f] px-4 pt-2 pb-8 relative overflow-hidden">
      {/* Background Illustration (Subtle) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <circle cx="50" cy="150" r="40" stroke="white" strokeWidth="2" fill="none" />
          <line x1="50" y1="150" x2="50" y2="110" stroke="white" strokeWidth="2" />
          <path d="M 300 150 Q 350 100 400 150" stroke="white" strokeWidth="2" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center space-y-1">
        <motion.h2 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-4xl font-black text-[#fff200] italic tracking-tighter drop-shadow-md uppercase"
          style={{ WebkitTextStroke: '1px white' }}
        >
          FLAVOUR FEST
        </motion.h2>
        
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white uppercase tracking-widest">UPTO 60% OFF</span>
          <ArrowRightCircle className="h-5 w-5 text-white/80" />
        </div>

        {/* Food Images Row */}
        <div className="flex items-end justify-center gap-2 pt-6">
          <div className="w-24 h-24 rotate-[-10deg] translate-y-2">
            <img src={tacoImg} alt="taco" className="w-full h-full object-cover rounded-2xl border-4 border-white shadow-lg" />
          </div>
          <div className="w-32 h-32 z-20 scale-110">
            <img src={platterImg} alt="platter" className="w-full h-full object-cover rounded-3xl border-4 border-white shadow-2xl" />
          </div>
          <div className="w-24 h-24 rotate-[10deg] translate-y-2">
            <img src={bannerFood1} alt="burger" className="w-full h-full object-contain p-2 rounded-2xl border-4 border-white bg-white shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
