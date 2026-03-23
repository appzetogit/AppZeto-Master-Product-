import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, TrendingUp, IndianRupee, Clock, ArrowRight,
  ShieldCheck, AlertTriangle, ArrowUpRight, HelpCircle,
  Receipt, FileText, LayoutGrid, ChevronRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deliveryAPI } from '@food/api';
import { toast } from 'sonner';

/**
 * PocketV2 - Match with Old PocketPage functionality + V2 Premium Design.
 * Features: Bank Banner, Weekly Earnings, Guarantee Section, Pocket Options, More Services.
 * Updated to use standard fonts instead of Poppins/Black.
 */
export const PocketV2 = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [walletState, setWalletState] = useState({
    totalBalance: 0,
    cashInHand: 0,
    availableCashLimit: 0,
    totalCashLimit: 0,
    weeklyEarnings: 0,
    weeklyOrders: 0,
    payoutAmount: 0,
    payoutPeriod: '12 Mar - 18 Mar',
    bankDetailsFilled: true
  });

  const [activeOffer, setActiveOffer] = useState({
    targetAmount: 2500,
    targetOrders: 50,
    currentOrders: 32,
    currentEarnings: 1450,
    validTill: '26 Mar',
    isLive: true
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCashPopup, setShowCashPopup] = useState(false);
  const [showDepositPopup, setShowDepositPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, earningsRes] = await Promise.all([
          deliveryAPI.getProfile(),
          deliveryAPI.getEarnings({ period: 'week' })
        ]);

        const profile = profileRes?.data?.data?.profile || {};
        const summary = earningsRes?.data?.data?.summary || {};
        
        const bankDetails = profile?.documents?.bankDetails;
        const isFilled = !!(bankDetails?.accountNumber);

        setWalletState({
          totalBalance: profile.walletBalance || 0,
          cashInHand: profile.cashInHand || 0,
          availableCashLimit: profile.availableCashLimit || 2000,
          totalCashLimit: profile.totalCashLimit || 5000,
          weeklyEarnings: Number(summary.totalEarnings) || 0,
          weeklyOrders: Number(summary.totalOrders) || 0,
          payoutAmount: profile.lastPayoutAmount || 0,
          payoutPeriod: 'Current Week',
          bankDetailsFilled: isFilled
        });
      } catch (err) {
        toast.error('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Carousel logic
  useEffect(() => {
    if (!walletState.bankDetailsFilled) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % 1);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [walletState.bankDetailsFilled]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
       <div className="w-12 h-12 border-4 border-gray-950 border-t-transparent rounded-full animate-spin mb-4" />
       <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Syncing Wallet...</p>
    </div>
  );

  const SectionTitle = ({ title }) => (
    <div className="relative mb-8 mt-12 flex items-center justify-center">
       <div className="absolute inset-x-0 h-px bg-gray-200" />
       <span className="relative bg-gray-50 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{title}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-40">
       
       {/* 1. BANK DETAILS BANNER */}
       {!walletState.bankDetailsFilled && (
         <motion.div 
           initial={{ height: 0 }} animate={{ height: 'auto' }}
           className="bg-yellow-400 px-6 py-4 flex items-center justify-between overflow-hidden"
         >
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-yellow-400">
                  <FileText className="w-5 h-5" />
               </div>
               <div>
                  <h4 className="text-xs font-bold text-black leading-tight uppercase">Submit Bank Details</h4>
                  <p className="text-[10px] font-bold text-black/60 uppercase">Required for payouts</p>
               </div>
            </div>
            <button 
              onClick={() => navigate('/delivery/profile/details')}
              className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
            >
               Go
            </button>
         </motion.div>
       )}

       <div className="px-5 pt-8">
          
          {/* 2. TOP EARNINGS CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/delivery/earnings')}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 text-center mb-8 active:scale-[0.98] transition-all"
          >
             <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-3">Earnings: This Week</p>
             <h2 className="text-6xl font-bold text-gray-950 tracking-tighter tabular-nums mb-2">
                ₹{walletState.weeklyEarnings.toFixed(0)}
             </h2>
             <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <TrendingUp className="w-3 h-3" /> {walletState.weeklyOrders} Orders done
             </div>
          </motion.div>

          {/* 3. EARNINGS GUARANTEE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-gray-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden mb-8"
          >
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                   <div>
                      <h3 className="text-xl font-bold tracking-tight mb-1">Earnings Guarantee</h3>
                      <div className="flex items-center gap-2">
                         <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Till {activeOffer.validTill}</span>
                         <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      </div>
                   </div>
                   <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl text-right">
                      <p className="text-xl font-bold tracking-tighter">₹{activeOffer.targetAmount}</p>
                      <p className="text-[8px] font-bold uppercase text-white/50">{activeOffer.targetOrders} Orders Target</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-10 mb-2">
                   {/* Orders Progress */}
                   <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-4">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * (activeOffer.currentOrders / activeOffer.targetOrders))} className="text-white" strokeLinecap="round" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{activeOffer.currentOrders}/{activeOffer.targetOrders}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Orders</span>
                   </div>
                   {/* Money Progress */}
                   <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-4">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                            <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * (activeOffer.currentEarnings / activeOffer.targetAmount))} className="text-yellow-400" strokeLinecap="round" />
                         </svg>
                         <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">₹{activeOffer.currentEarnings}</div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Earnings</span>
                   </div>
                </div>
             </div>
             <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          </motion.div>

          {/* 4. POCKET SECTION */}
          <SectionTitle title="Pocket" />
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden mb-12">
             <button 
               onClick={() => navigate('/delivery/pocket-balance')}
               className="w-full p-8 border-b border-gray-50 flex items-center justify-between group active:bg-gray-50 transition-all"
             >
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950"><Wallet className="w-6 h-6" /></div>
                   <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Pocket balance</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-gray-950">₹{walletState.totalBalance.toFixed(2)}</span>
                   <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-950" />
                </div>
             </button>
             <button 
               onClick={() => setShowCashPopup(true)}
               className="w-full p-8 border-b border-gray-50 flex items-center justify-between group active:bg-gray-50 transition-all"
             >
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950"><ShieldCheck className="w-6 h-6" /></div>
                   <span className="text-xs font-bold text-gray-900 uppercase tracking-widest">Cash limit</span>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-gray-950">₹{walletState.availableCashLimit.toFixed(2)}</span>
                   <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-950" />
                </div>
             </button>
             <div className="p-8">
                <button 
                  onClick={() => setShowDepositPopup(true)}
                  className="w-full h-16 bg-gray-950 text-white rounded-[1.5rem] font-bold text-[10px] uppercase tracking-[0.25em] shadow-xl active:scale-[0.98] transition-all"
                >
                   Deposit Cash
                </button>
             </div>
          </div>

          {/* 5. MORE SERVICES */}
          <SectionTitle title="More Services" />
          <div className="grid grid-cols-2 gap-4">
             <motion.button 
               whileTap={{ scale: 0.95 }} onClick={() => navigate('/delivery/payout')}
               className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 text-left flex flex-col"
             >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950 mb-4">
                   <IndianRupee className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Last Payout</h4>
                <p className="text-xl font-bold text-gray-950 tracking-tighter mb-1">₹{walletState.payoutAmount}</p>
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{walletState.payoutPeriod}</p>
             </motion.button>

             <motion.button 
               whileTap={{ scale: 0.95 }} onClick={() => navigate('/delivery/limit-settlement')}
               className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 text-left flex flex-col"
             >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950 mb-auto">
                   <Receipt className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-bold text-gray-950 uppercase tracking-widest mt-6 leading-tight">Limit Settlement</h4>
             </motion.button>

             <motion.button 
               whileTap={{ scale: 0.95 }} onClick={() => navigate('/delivery/deduction-statement')}
               className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 text-left flex flex-col"
             >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950 mb-auto">
                   <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-bold text-gray-950 uppercase tracking-widest mt-6 leading-tight">Deduction List</h4>
             </motion.button>

             <motion.button 
               whileTap={{ scale: 0.95 }} onClick={() => navigate('/delivery/pocket-details')}
               className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-gray-100 text-left flex flex-col"
             >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-950 mb-auto">
                   <LayoutGrid className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-bold text-gray-950 uppercase tracking-widest mt-6 leading-tight">Pocket Details</h4>
             </motion.button>
          </div>
       </div>

       {/* POPUPS */}
       <AnimatePresence>
          {showCashPopup && (
             <div className="fixed inset-0 z-[500] flex items-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCashPopup(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full bg-white rounded-t-[3rem] p-10 shadow-2xl overflow-hidden">
                   <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-950 uppercase tracking-tight">Cash Limit Info</h3>
                      <button onClick={() => setShowCashPopup(false)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"><X className="w-5 h-5" /></button>
                   </div>
                   <div className="space-y-6">
                      <div className="flex justify-between items-center bg-gray-50 p-6 rounded-2xl">
                         <span className="text-xs font-bold uppercase text-gray-400">Total Limit</span>
                         <span className="text-lg font-bold text-gray-950">₹{walletState.totalCashLimit}</span>
                      </div>
                      <div className="flex justify-between items-center p-6 border-b border-gray-100">
                         <span className="text-xs font-bold uppercase text-gray-400 tracking-widest">Cash In Hand</span>
                         <span className="text-lg font-bold text-gray-950">₹{walletState.cashInHand}</span>
                      </div>
                      <div className="flex justify-between items-center p-6">
                         <span className="text-xs font-bold uppercase text-gray-950 tracking-widest underline decoration-2 underline-offset-4">Available To Carry</span>
                         <span className="text-lg font-bold text-gray-950">₹{walletState.availableCashLimit}</span>
                      </div>
                   </div>
                   <button onClick={() => setShowCashPopup(false)} className="w-full h-16 bg-gray-950 text-white rounded-2xl mt-10 font-bold text-[10px] uppercase tracking-widest">Understood</button>
                </motion.div>
             </div>
          )}
          
          {showDepositPopup && (
             <div className="fixed inset-0 z-[500] flex items-end">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDepositPopup(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="relative w-full bg-white rounded-t-[3rem] p-10 shadow-2xl">
                   <div className="text-center mb-10">
                      <h3 className="text-2xl font-bold text-gray-950 uppercase tracking-tight mb-2">Deposit Cash</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount to settle from your hand</p>
                   </div>
                   <div className="text-center mb-12">
                      <p className="text-5xl font-bold text-gray-950 tracking-tighter mb-1">₹{walletState.cashInHand}</p>
                      <span className="bg-red-50 text-red-500 text-[8px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Pending Deposit</span>
                   </div>
                   <button className="w-full h-16 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 transition-all">Proceed to Pay</button>
                   <button onClick={() => setShowDepositPopup(false)} className="w-full h-16 bg-transparent text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Maybe Later</button>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};
