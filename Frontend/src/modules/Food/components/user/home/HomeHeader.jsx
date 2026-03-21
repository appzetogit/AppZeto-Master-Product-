import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, ChevronDown, Search, Mic, User } from 'lucide-react';
import { Avatar, AvatarFallback } from "@food/components/ui/avatar";
import foodIcon from "@food/assets/category-icons/food.png";
import quickIcon from "@food/assets/category-icons/quick.png";

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
  ];

  return (
    <div className="bg-[#ef4f5f] pt-4 pb-4 px-4 space-y-4 shadow-lg">
      {/* Location & Profile Row - Clean Pixel Match Design */}
      <div className="flex items-center justify-between">
        <div 
          className="flex items-center gap-1 cursor-pointer group"
          onClick={handleLocationClick}
        >
          <div className="bg-white/10 p-1.5 rounded-full">
            <MapPin className="h-4 w-4 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-white/80">Deliver to</span>
              <ChevronDown className="h-3 w-3 text-white/80" />
            </div>
            <span className="text-sm font-bold text-white truncate max-w-[200px]">
              {location?.area || location?.city || savedAddressText || "Select Location"}
            </span>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center border-2 border-white/20 shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform">
          <Avatar className="h-full w-full">
            <AvatarFallback className="bg-white text-gray-400">
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Main Category Grid (2 Items) - Compact & Centered */}
      <div className="flex justify-center pb-0.5">
        <div className="grid grid-cols-2 gap-4 w-full max-w-[240px]">
          {festCategories.map((cat) => (
            <div 
              key={cat.id}
              className={`flex flex-col items-center gap-1 cursor-pointer group relative`}
              onClick={() => setActiveTab(cat.id)}
            >
              <motion.div 
                whileTap={{ scale: 0.95 }}
                className={`w-full aspect-[1.8/1] ${cat.bgColor} rounded-xl flex items-center justify-center p-1.5 shadow-sm border ${activeTab === cat.id ? 'border-yellow-400 bg-white' : 'border-white/10 bg-white/90'}`}
              >
                <img src={cat.icon} alt={cat.name} className="h-full object-contain" />
              </motion.div>
              <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors ${activeTab === cat.id ? 'text-white' : 'text-white/40'}`}>
                {cat.name}
              </span>
              {activeTab === cat.id && (
                <motion.div 
                  layoutId="activeTabBadge"
                  className="absolute -top-1 -right-1 z-30"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <div className="bg-yellow-400 text-[6px] font-black text-red-600 w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white leading-none shadow-sm">
                    ★
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div 
        className="relative bg-white rounded-xl flex items-center px-4 py-2.5 shadow-md cursor-pointer"
        onClick={handleSearchFocus}
      >
        <Search className="h-5 w-5 text-gray-400 mr-2.5" />
        <div className="flex-1 overflow-hidden relative h-5">
          <AnimatePresence mode="wait">
            <motion.span
              key={placeholderIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 text-sm font-medium text-gray-400"
            >
              Search...
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="w-[1px] h-4 bg-gray-200 mx-2"></div>
        <Mic className="h-5 w-5 text-gray-800" />
      </div>
    </div>
  );
}
