import React from 'react';
import { LayoutDashboard, Briefcase, Calendar, UserCircle, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { propertyService } from '../../../services/apiService';

const PartnerBottomNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('dashboard') || path === '/hotel') return 'Dashboard';
    if (path.includes('inventory')) return 'Inventory';
    if (path.includes('properties')) return 'Properties';
    if (path.includes('bookings')) return 'Bookings';
    if (path.includes('profile')) return 'Profile';
    return '';
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, route: '/hotel/dashboard' },
    { name: 'Properties', icon: Building, route: '/hotel/properties' },
    { name: 'Bookings', icon: Briefcase, route: '/hotel/bookings' },
    { name: 'Inventory', icon: Calendar, route: null },
    { name: 'Profile', icon: UserCircle, route: '/hotel/profile' },
  ];

  const handleInventoryClick = () => {
    navigate('/hotel/inventory-properties');
  };

  const handleNavClick = (item) => {
    if (item.name === 'Inventory') {
      handleInventoryClick();
    } else {
      navigate(item.route);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md z-[1000]">
      <div className="
        bg-white/95 backdrop-blur-2xl 
        border border-white/40 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]
        rounded-[24px]
        flex justify-between items-center 
        px-3 py-3
      ">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = getActiveTab() === item.name;

          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className="relative flex flex-col items-center justify-center w-full gap-1 p-1"
            >
              {isActive && (
                <motion.div
                  layoutId="partner-active-pill"
                  className="absolute inset-x-1 inset-y-0 bg-[#003836]/10 rounded-xl -z-10"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon
                size={22}
                className={`transition-colors duration-200 ${isActive ? 'text-[#003836] fill-[#003836]/10' : 'text-gray-400'}`}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span className={`text-[9px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-[#003836]' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerBottomNavbar;
