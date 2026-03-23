import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, Bike, Share2, Ticket, 
  Bell, LogOut, Headset, Briefcase
} from 'lucide-react';
import { deliveryAPI } from '@food/api';

/**
 * ProfileV2 - 1:1 Match with the user's provided screenshot.
 * Features Name/ID Header, Trips History Card, Share & Earn, and Sectioned Options.
 */
export const ProfileV2 = () => {
  const [profile, setProfile] = useState({
    name: 'Vishal patel',
    id: 'DP-F86DCB62',
    loading: true
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await deliveryAPI.getProfile();
        if (response?.data?.success && response.data.data?.profile) {
          const p = response.data.data.profile;
          setProfile({
            name: p.fullName || p.name || 'Vishal patel',
            id: p.deliveryBoyId || p.id || 'DP-' + (p.id?.slice(-4) || '86DCB62'),
            loading: false
          });
        }
      } catch (err) {
        setProfile(prev => ({ ...prev, loading: false }));
      }
    };
    fetchProfile();
  }, []);

  const logout = () => {
    localStorage.clear();
    window.location.href = '/delivery/login';
  };

  if (profile.loading) return <div className="p-8 text-center text-gray-400">Loading Profile...</div>;

  const ListItem = ({ icon: Icon, label, color = "text-gray-900", isRed = false, onClick }) => (
    <button 
      onClick={onClick}
      className="w-full bg-white px-4 py-4 flex items-center justify-between group active:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
    >
      <div className="flex items-center gap-4">
        <Icon className={`w-5 h-5 ${isRed ? 'text-red-500' : 'text-gray-900 opacity-70'}`} />
        <span className={`text-base font-medium ${isRed ? 'text-red-500' : 'text-gray-900'}`}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-active:text-gray-500" />
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100/60 pb-32">
      {/* 1. Header (Name & ID) */}
      <div className="bg-white px-6 py-8 flex items-center justify-between border-b border-gray-100">
        <div>
           <div className="flex items-center gap-2 mb-1 cursor-pointer group active:opacity-60">
             <h1 className="text-2xl font-bold text-gray-950">{profile.name}</h1>
             <ChevronRight className="w-6 h-6 text-gray-400" />
           </div>
           <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">{profile.id}</p>
        </div>
        <div className="relative">
           <div className="w-16 h-16 rounded-full border-2 border-gray-100 p-0.5 shadow-sm overflow-hidden">
              <img src="https://i.ibb.co/3m2Yh7r/Appzeto-Brand-Image.png" alt="Avatar" className="w-full h-full object-cover rounded-full" />
           </div>
           <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md border border-gray-50">
              <Headset className="w-4 h-4 text-gray-900" />
           </div>
           <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md border border-gray-50">
              <Briefcase className="w-4 h-4 text-gray-900" />
           </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 2. Trips History Card */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          className="w-full bg-white rounded-2xl py-10 shadow-sm border border-gray-50 flex flex-col items-center justify-center gap-3 transition-shadow hover:shadow-md"
        >
          <Bike className="w-8 h-8 text-gray-900 opacity-80" />
          <span className="text-sm font-bold text-gray-950">Trips history</span>
        </motion.button>

        {/* 3. Share & Earn Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-50 flex items-center justify-between gap-4">
           <div className="flex-1">
              <h3 className="text-gray-950 font-bold text-lg mb-1">Share & Earn ₹200</h3>
              <p className="text-gray-400 text-xs font-semibold leading-relaxed">Invite a friend to join as a delivery part...</p>
           </div>
           <button className="bg-gray-950 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg active:scale-95">
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">Share</span>
           </button>
        </div>

        {/* 4. Support Section */}
        <div>
           <h4 className="px-2 mb-3 text-sm font-bold text-gray-950 uppercase tracking-widest">Support</h4>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50">
              <ListItem icon={Ticket} label="Support tickets" />
           </div>
        </div>

        {/* 5. Partner options Section */}
        <div>
           <h4 className="px-2 mb-3 text-sm font-bold text-gray-950 uppercase tracking-widest">Partner options</h4>
           <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50">
              <ListItem icon={Bell} label="Order alert sound" />
              <ListItem icon={LogOut} label="Log out" isRed onClick={logout} />
           </div>
        </div>
      </div>
    </div>
  );
};
