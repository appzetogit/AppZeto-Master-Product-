import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, Mic, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@food/components/ui/avatar";
import foodIcon from "@food/assets/category-icons/food.png";
import quickIcon from "@food/assets/category-icons/quick.png";
import taxiIcon from "@food/assets/category-icons/taxi.png";
import hotelIcon from "@food/assets/category-icons/hotel.png";

export default function HomeHeader({ 
  activeTab,
  setActiveTab,
  location, 
  savedAddressText, 
  handleLocationClick, 
  handleSearchFocus, 
  placeholderIndex, 
  placeholders 
}) {
  const festCategories = [
    { id: "food", name: "Food", icon: foodIcon, bgColor: "bg-white" },
    { id: "quick", name: "Quick", icon: quickIcon, bgColor: "bg-white" },
    { id: "taxi", name: "Taxi", icon: taxiIcon, bgColor: "bg-white" },
    { id: "hotel", name: "Hotel", icon: hotelIcon, bgColor: "bg-white" },
  ];

  return (
    <div className="relative bg-gradient-to-b from-[#f36371] to-[#ef4f5f] pt-5 pb-5 px-4 space-y-5 shadow-xl overflow-hidden">
      {/* Abstract Background Design */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          <circle cx="10%" cy="10%" r="20" fill="white" />
          <circle cx="90%" cy="20%" r="15" fill="white" />
          <circle cx="50%" cy="80%" r="25" fill="white" />
          <path d="M 0 50 Q 25 30 50 50 T 100 50" stroke="white" strokeWidth="0.5" fill="none" />
          <path d="M 0 70 Q 25 50 50 70 T 100 70" stroke="white" strokeWidth="0.5" fill="none" />
        </svg>
      </div>

      {/* Decorative Glows */}
      <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/20 blur-[60px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-yellow-400/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Location & Profile Row - Clean Pixel Match Design */}
      <div className="relative z-10 flex items-center justify-between">
        <div 
          className="flex items-center gap-1 cursor-pointer group"
          onClick={handleLocationClick}
        >
          <div className="bg-white/10 p-1.5 rounded-full backdrop-blur-md border border-white/10 group-hover:bg-white/20 transition-colors">
            <MapPin className="h-4 w-4 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Deliver to</span>
              <ChevronDown className="h-3 w-3 text-white/80" />
            </div>
            <span className="text-sm font-bold text-white truncate max-w-[200px] drop-shadow-sm">
              {location?.area || location?.city || savedAddressText || "Select Location"}
            </span>
          </div>
        </div>
        <div className="h-11 w-11 rounded-full bg-white/10 p-1 backdrop-blur-md border border-white/20 shadow-lg cursor-pointer active:scale-90 transition-all">
          <Avatar className="h-full w-full rounded-full border border-white/40">
            <AvatarFallback className="bg-white text-gray-400">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Category Grid (4 Items) - Compact & Centered */}
      <div className="relative z-10 flex justify-center pb-1">
        <div className="grid grid-cols-4 gap-3 w-full max-w-[340px]">
          {festCategories.map((cat) => (
            <div 
              key={cat.id}
              className={`flex flex-col items-center gap-2 cursor-pointer group relative`}
              onClick={() => setActiveTab(cat.id)}
            >
              <motion.div 
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className={`w-full aspect-square ${cat.bgColor} rounded-xl flex items-center justify-center p-0 overflow-hidden transition-all duration-300 ${activeTab === cat.id ? 'bg-white scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-white/90 shadow-sm'}`}
              >
                <img src={cat.icon} alt={cat.name} className={`w-full h-full object-cover transition-transform duration-700 ${activeTab === cat.id ? 'scale-105' : 'scale-100 group-hover:scale-110'}`} />
              </motion.div>
              <span className={`text-[10px] font-bold tracking-wider uppercase transition-all ${activeTab === cat.id ? 'text-white translate-y-0 opacity-100' : 'text-white/40 group-hover:text-white/60'}`}>
                {cat.name}
              </span>
              
              {activeTab === cat.id && (
                <>
                  <motion.div 
                    layoutId="activeTabBadge"
                    className="absolute -top-1 -right-0.5 z-30"
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                  >
                    <div className="bg-yellow-400 text-[6px] font-black text-red-600 w-4 h-4 flex items-center justify-center rounded-full border border-white leading-none shadow-xl">
                      ★
                    </div>
                  </motion.div>
                  <motion.div 
                    layoutId="indicator"
                    className="absolute -bottom-1.5 w-1 h-1 bg-yellow-400 rounded-full"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar - More Normal & Clean */}
      <div 
        className="relative z-10 bg-white rounded-xl flex items-center px-4 py-3 shadow-md border border-white/20 cursor-pointer active:scale-[0.99] transition-all duration-200 mx-1"
        onClick={handleSearchFocus}
      >
        <Search className="h-4 w-4 text-gray-500 mr-3" strokeWidth={2.5} />
        <div className="flex-1 overflow-hidden relative h-5">
          <AnimatePresence mode="wait">
            <motion.span
              key={placeholderIndex}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 text-[13px] font-medium text-gray-400"
            >
              {placeholders?.[placeholderIndex] || 'Search "pizza"'}
            </motion.span>
          </AnimatePresence>
        </div>
        <Mic className="h-4 w-4 text-gray-500 ml-2" strokeWidth={2.5} />
      </div>
    </div>
  );
}
