import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Calendar, 
    ChevronRight, 
    MapPin, 
    Clock, 
    CreditCard, 
    Bike, 
    CheckCircle2, 
    Filter,
    Search,
    TrendingUp,
    IndianRupee,
    Package
} from 'lucide-react';
import DriverBottomNav from '../../shared/components/DriverBottomNav';

const RideRequests = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');

    const history = [
        { id: 1, type: 'ride', title: 'Bike Taxi', date: 'Today, 2:45 PM', price: '₹145', from: 'Koramangala 5th Block', to: 'HSR Layout Sector 7', status: 'completed' },
        { id: 2, type: 'ride', title: 'Bike Taxi', date: 'Today, 11:30 AM', price: '₹85', from: 'Indiranagar Metro', to: 'Marathahalli', status: 'completed' },
        { id: 3, type: 'parcel', title: 'Delivery', date: 'Yesterday, 6:20 PM', price: '₹220', from: 'JP Nagar', to: 'Bannerghatta Road', status: 'completed' },
        { id: 4, type: 'ride', title: 'Bike Taxi', date: '28 Mar, 4:10 PM', price: '₹110', from: 'BTM Layout', to: 'Electronic City', status: 'completed' }
    ];

    const filteredHistory = activeTab === 'all' 
        ? history 
        : history.filter(item => item.type === activeTab);

    return (
        <div className="min-h-screen bg-[#f8f9fb] font-sans select-none overflow-x-hidden p-5 pb-32">
            <header className="flex items-center justify-between mb-6 pt-2">
                <button 
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-900 active:scale-95 transition-transform"
                >
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">History</h1>
                <button className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 active:scale-95 transition-transform">
                    <Filter size={16} />
                </button>
            </header>

            {/* Premium Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                 {['all', 'ride', 'parcel'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                            activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                        }`}
                    >
                        {tab === 'all' ? 'All' : tab === 'ride' ? 'Rides' : 'Deliveries'}
                    </button>
                 ))}
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Success Rate</p>
                     <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-500">
                             <TrendingUp size={14} />
                         </div>
                         <h3 className="text-xl font-black text-slate-900 leading-none">98%</h3>
                     </div>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-2xl shadow-xl space-y-1">
                     <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Total Earned</p>
                     <div className="flex items-center gap-2">
                         <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-white">
                             <IndianRupee size={12} />
                         </div>
                         <h3 className="text-xl font-black text-white leading-none">₹8.4k</h3>
                     </div>
                 </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-4">Activity Log</h4>
                 
                 <AnimatePresence mode="popLayout">
                    {filteredHistory.map((item, idx) => (
                        <motion.div 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 space-y-4 group active:scale-98 transition-all cursor-pointer"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${item.type === 'parcel' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-900'}`}>
                                        {item.type === 'parcel' ? <Package size={18} strokeWidth={2.5} /> : <Bike size={18} strokeWidth={2.5} />}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight leading-none">{item.title}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                     <p className="text-base font-black text-slate-900 leading-none">{item.price}</p>
                                     <div className="flex items-center gap-1 justify-end mt-1">
                                         <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Settled</span>
                                         <CheckCircle2 size={10} className="text-emerald-500" />
                                     </div>
                                </div>
                            </div>

                            <div className="space-y-2.5 px-px">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full border-2 border-slate-900 bg-white mt-1 translate-y-[1px]" />
                                    <p className="text-[12px] font-black text-slate-500 uppercase leading-tight truncate">
                                        {item.from}
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full border-2 border-rose-500 bg-white mt-1 translate-y-[1px]" />
                                    <p className="text-[12px] font-black text-slate-500 uppercase leading-tight truncate">
                                        {item.to}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                 </AnimatePresence>
            </div>
            
            <DriverBottomNav />
        </div>
    );
};

export default RideRequests;
