import React from 'react';
import { Home, Briefcase, Navigation, User, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { toast } from 'react-hot-toast';

const BottomNavbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = `${location.pathname || '/hotel'}${location.search || ''}${location.hash || ''}`;

    const navItems = [
        { name: 'Home', icon: Home, route: '/hotel' },
        { name: 'Bookings', icon: Briefcase, route: '/hotel/bookings' },
        { name: 'Near By', icon: Navigation, route: null, handler: 'nearBy' },
        { name: 'Profile', icon: User, route: '/hotel/profile/edit' },
    ];

    const getActiveTab = (path) => {
        if (path === '/hotel') return 'Home';
        if (path === '/hotel/bookings') return 'Bookings';
        if (path === '/hotel/search' && new URLSearchParams(location.search).get('lat')) return 'Near By';
        if (path === '/hotel/profile/edit') return 'Profile';
        return 'Home';
    };

    const activeTab = getActiveTab(location.pathname);

    const handleNearBy = async () => {
        try {
            toast.loading('Getting your location...');
            const loc = await propertyService.getCurrentLocation();
            toast.dismiss();
            navigate(`/hotel/search?lat=${loc.lat}&lng=${loc.lng}&radius=50&sort=distance`);
        } catch (error) {
            toast.dismiss();
            toast.error('Could not get location. Please enable permissions.');
        }
    };

    const handleNavClick = (item) => {
        if (item.handler === 'nearBy') {
            handleNearBy();
        } else {
            navigate(item.route);
        }
    };

    return (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 print:hidden">
            <div className="relative overflow-visible pt-7">
            <motion.button
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/user/auth/portal', { state: { redirectTo } })}
                className="absolute right-3 top-0 z-10 flex items-center gap-2 rounded-t-[18px] rounded-b-[10px] border border-b-0 border-white/40 bg-white/95 px-3 pb-3 pt-2 backdrop-blur-2xl shadow-[0_-2px_0_rgba(255,255,255,0.9),0_-10px_28px_-10px_rgba(0,0,0,0.15)]"
                style={{ transform: 'translateY(-18%)' }}
            >
                <div className="pointer-events-none absolute -bottom-3 left-0 right-0 h-4 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0)_100%)]" />
                <div className="pointer-events-none absolute -left-3 bottom-0 h-6 w-6 rounded-br-[18px] border-b border-r border-white/40 bg-white/95 backdrop-blur-2xl" />
                <div className="pointer-events-none absolute -right-3 bottom-0 h-6 w-6 rounded-bl-[18px] border-b border-l border-white/40 bg-white/95 backdrop-blur-2xl" />

                <div className="text-left leading-none">
                    <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#b56f4e]">
                        Explore
                    </span>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#fff4ec] text-[#8f5638]">
                    <ArrowUpRight size={14} strokeWidth={2.6} />
                </div>
            </motion.button>

            <div className="
        bg-white/95 backdrop-blur-2xl 
        border border-white/40 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]
        rounded-[24px] relative
        flex justify-between items-center 
        px-3 py-3
      ">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.name;

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavClick(item)}
                            className="relative flex flex-col items-center justify-center w-full gap-1 p-1"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="active-pill"
                                    className="absolute inset-x-2 inset-y-0 bg-accent/15 rounded-xl -z-10"
                                    initial={false}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}

                            <Icon
                                size={22}
                                className={`transition-colors duration-200 ${isActive ? 'text-surface fill-surface/10' : 'text-gray-400'}`}
                                strokeWidth={isActive ? 2.5 : 2}
                            />

                            <span className={`text-[9px] font-bold tracking-wide transition-colors duration-200 ${isActive ? 'text-surface' : 'text-gray-400'}`}>
                                {item.name}
                            </span>
                        </button>
                    );
                })}
            </div>
            </div>
        </div>
    );
};

export default BottomNavbar;
