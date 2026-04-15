import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ShieldCheck, Wallet, Clock, Star, TrendingUp } from 'lucide-react';
import DriverHero from '../../../../assets/driver_welcome_hero.png';
import { useSettings } from '../../../../shared/context/SettingsContext';

const DriverWelcome = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings.general?.app_name || 'App';
    const appLogo = settings.general?.logo || settings.customization?.logo;

    const perks = [
        { icon: <Wallet size={20} />, title: 'Weekly Payouts', sub: 'Instant earnings transfer' },
        { icon: <Clock size={20} />, title: 'Set Your Schedule', sub: 'Ultimate work-life balance' },
        { icon: <ShieldCheck size={20} />, title: 'Premium Support', sub: '24/7 dedicated assistance' },
        { icon: <TrendingUp size={20} />, title: 'Growth Incentives', sub: 'High performance rewards' }
    ];

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans select-none overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative h-[30vh] bg-slate-900 overflow-hidden rounded-b-[2rem] shadow-premium">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />
                <img 
                    src={DriverHero} 
                    alt={`Drive with ${appName}`} 
                    className="w-full h-full object-cover opacity-70"
                />
                
                {/* Branding Top Overlay */}
                <div className="absolute top-8 left-6 z-20">
                     {appLogo ? (
                         <img src={appLogo} alt={appName} className="h-10 drop-shadow-xl" />
                     ) : (
                         <span className="text-xl font-bold text-white drop-shadow-lg">{appName}</span>
                     )}
                </div>

                {/* Overlay Greeting */}
                <div className="absolute bottom-8 left-6 right-6 text-white z-20">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl font-display font-bold leading-tight tracking-tight">
                            Partner with <span className="text-primary">{appName}</span>
                        </h1>
                        <p className="text-[14px] text-white/70 mt-1 font-medium">
                            The smartest way to drive and earn.
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Content Section */}
            <main className="px-5 pt-8 pb-32">
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-[13px] font-bold text-slate-400 tracking-wider uppercase">
                            Why Choose {appName}?
                        </h3>
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
                                     <img src={`https://i.pravatar.cc/100?img=${i+40}`} alt="driver" className="w-full h-full object-cover" />
                                </div>
                            ))}
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-primary text-[8px] flex items-center justify-center text-white font-bold">
                                +10k
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {perks.map((perk, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * index }}
                                className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-soft transition-all hover:border-primary/20"
                            >
                                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                    {perk.icon}
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[15px] font-display font-semibold text-slate-800 leading-tight">{perk.title}</h4>
                                    <p className="text-[12px] font-medium text-slate-400 mt-0.5">{perk.sub}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Testimonial Placeholder */}
                <div className="mt-8 bg-slate-50/50 rounded-2xl p-5 border border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-5">
                       <Star size={40} fill="currentColor" />
                    </div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-soft overflow-hidden">
                            <img src="https://i.pravatar.cc/100?img=12" alt="Rahul" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h5 className="text-[14px] font-display font-bold text-slate-800">Rahul Shinde</h5>
                            <div className="flex gap-0.5 text-orange-400">
                                {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" />)}
                            </div>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic leading-relaxed">
                        "Joining {appName} was the best decision for my family. The payouts are always on time and the support team is incredible."
                    </p>
                </div>
            </main>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50">
                <motion.button 
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/taxi/driver/lang-select')}
                    className="w-full bg-primary h-14 rounded-xl flex items-center justify-center gap-2 text-[16px] font-display font-bold text-white shadow-premium active:scale-95 transition-all"
                >
                    Get Started Now <ChevronRight size={18} />
                </motion.button>
            </div>
        </div>
    );
};

export default DriverWelcome;
