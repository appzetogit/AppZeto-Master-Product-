import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Calendar, CheckCircle2, XCircle, 
  ChevronDown, ArrowRight, Loader2, IndianRupee,
  CalendarDays, CalendarRange
} from 'lucide-react';
import { deliveryAPI } from '@food/api';

/**
 * HistoryV2 - Recreated with Old Period Logic + "Next-Gen" Aesthetic.
 * Features Daily/Weekly/Monthly switching with COD vs Earning metrics.
 * Updated to use standard fonts instead of Poppins/Black.
 */
export const HistoryV2 = () => {
  const [activeTab, setActiveTab] = useState('daily');
  const [trips, setTrips] = useState([]);
  const [metrics, setMetrics] = useState({ cod: 0, earnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      try {
        const response = await deliveryAPI.getTripHistory({ period: activeTab, limit: 50 });
        if (response?.data?.success && response.data.data?.trips) {
          const fetchedTrips = response.data.data.trips;
          setTrips(fetchedTrips);
          
          setMetrics({
            earnings: fetchedTrips.reduce((sum, t) => sum + (t.deliveryEarning || 0), 0),
            cod: fetchedTrips.reduce((sum, t) => sum + (t.codCollectedAmount || 0), 0)
          });
        }
      } catch (err) {
        console.error('History API Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-32">
       {/* 1. Period Selector Tabs */}
       <div className="bg-white px-2 py-4 border-b border-gray-100 flex items-center justify-center gap-2 sticky top-[160px] z-[50]">
          {[
            { id: 'daily', label: 'Daily', icon: CalendarDays },
            { id: 'weekly', label: 'Weekly', icon: CalendarRange },
            { id: 'monthly', label: 'Monthly', icon: Calendar }
          ].map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all ${
                 activeTab === tab.id ? 'bg-gray-950 text-white shadow-lg' : 'bg-transparent text-gray-400 hover:bg-gray-50'
               }`}
             >
                <tab.icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
             </button>
          ))}
       </div>

       <div className="p-5 space-y-6">
          {/* 2. Metrics Bar */}
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20">
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest mb-1">COD Collected</p>
                <h3 className="text-2xl font-bold tabular-nums">₹{metrics.cod.toFixed(0)}</h3>
             </div>
             <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20">
                <p className="text-white/60 text-[8px] font-bold uppercase tracking-widest mb-1">Total Earning</p>
                <h3 className="text-2xl font-bold tabular-nums">₹{metrics.earnings.toFixed(0)}</h3>
             </div>
          </div>

          {/* 3. Trip List Loop */}
          <div>
             <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-bold text-gray-950 uppercase tracking-widest">Completed Trips</h3>
                <span className="bg-gray-100 text-gray-500 text-[8px] font-bold px-3 py-1 rounded-full uppercase">{trips.length} Orders</span>
             </div>

             <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-gray-300 mx-auto" /></div>
                ) : trips.length > 0 ? trips.map((t, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={idx} 
                    className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-4 active:scale-95 transition-all relative overflow-hidden"
                  >
                     <div className="flex items-start justify-between mb-4">
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              {t.status === 'Completed' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                              <p className="font-bold text-gray-950 text-sm uppercase">{t.orderId || 'Order'}</p>
                           </div>
                           <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed line-clamp-1">{t.restaurantName || 'Restaurant Trip'}</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-950 tabular-nums">₹{(t.deliveryEarning || 0).toFixed(0)}</p>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-2">
                        <div>
                           <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest">COD Amount</p>
                           <p className="text-xs font-bold text-gray-950">₹{(t.codCollectedAmount || 0).toFixed(0)}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-gray-400 text-[8px] font-bold uppercase tracking-widest">Status</p>
                           <p className={`text-xs font-bold uppercase tracking-widest ${t.status === 'Completed' ? 'text-green-600' : 'text-red-500'}`}>{t.status || 'DONE'}</p>
                        </div>
                     </div>
                  </motion.div>
                )) : (
                  <div className="p-20 text-center text-gray-400 italic text-[10px] font-bold uppercase tracking-widest bg-white rounded-3xl border border-dashed border-gray-200">No Trips Record Found</div>
                )}
             </AnimatePresence>
          </div>
       </div>
    </div>
  );
};
