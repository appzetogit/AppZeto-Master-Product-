import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Gift, Copy, Share2, Users, ChevronRight,
    Wallet, Clock, CheckCircle, TrendingUp, Sparkles,
    MessageCircle, Twitter, Facebook, Mail, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { referralService } from '../../services/apiService';

const ReferAndEarnPage = () => {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('invite');
    const [loading, setLoading] = useState(true);
    const [referralData, setReferralData] = useState({
        code: "...",
        link: "",
        earnings: { total: 0, pending: 0, thisMonth: 0 },
        stats: { invited: 0, joined: 0, bookings: 0 },
        history: []
    });

    const codeRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            console.log(`[REFERRAL_DEBUG] Fetching referral stats...`);
            try {
                const res = await referralService.getMyStats();
                console.log(`[REFERRAL_DEBUG] Stats API Response:`, res);
                if (res.success) {
                    const data = res.data;
                    setReferralData({
                        code: data.code,
                        link: data.link,
                        earnings: {
                            total: data.earningsTotal || 0,
                            pending: data.earningsPending || 0,
                            thisMonth: data.earningsThisMonth || 0
                        },
                        stats: data.stats,
                        history: data.history
                    });
                }
            } catch (err) {
                console.error("[REFERRAL_DEBUG] Failed to load referral data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(referralData.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOptions = [
        { icon: MessageCircle, label: "WhatsApp", color: "bg-[#25D366]", action: () => window.open(`https://wa.me/?text=Book hotels at amazing prices! Use my referral code ${referralData.code} and get ₹100 off! ${referralData.link}`) },
        { icon: Twitter, label: "Twitter", color: "bg-[#1DA1F2]", action: () => window.open(`https://twitter.com/intent/tweet?text=Get ₹100 off on your first hotel booking with Rukkoo.in! Use code: ${referralData.code}`) },
        { icon: Facebook, label: "Facebook", color: "bg-[#4267B2]", action: () => { } },
        { icon: Mail, label: "Email", color: "bg-gray-600", action: () => window.open(`mailto:?subject=Get ₹100 off on Rukkoo.in&body=Use my code ${referralData.code} to get ₹100 off! ${referralData.link}`) },
    ];

    const howItWorks = [
        { step: 1, title: "Share Your Code", desc: "Send your unique referral code to friends", icon: Share2 },
        { step: 2, title: "Friend Signs Up", desc: "They register using your referral code", icon: Users },
        { step: 3, title: "They Book a Stay", desc: "When they complete their first booking", icon: CheckCircle },
        { step: 4, title: "You Both Earn", desc: "₹100 credited to both wallets!", icon: Gift },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    const handleShare = async () => {
        const shareData = {
            title: 'Join RukkooIn & Get ₹100!',
            text: `Hey! Book hotels at amazing prices on RukkooIn. Use my referral code ${referralData.code} to get ₹100 OFF on your first booking!`,
            url: referralData.link || 'https://rukko.in'
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            handleCopy();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-surface via-surface to-[#003836]">

            {/* Header */}
            <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-lg border-b border-white/10">
                <div className="flex items-center justify-between px-5 py-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Refer & Earn</h1>
                    <button
                        onClick={() => navigate('/wallet')}
                        className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <Wallet size={20} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Hero Section */}
            <div className="relative px-5 pt-8 pb-12 text-center overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
                <div className="absolute bottom-10 right-10 w-24 h-24 bg-honey/20 rounded-full blur-2xl" />

                <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="relative z-10 w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-honey to-orange-400 rounded-3xl flex items-center justify-center shadow-2xl shadow-honey/30"
                >
                    <Gift size={48} className="text-white" />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg"
                    >
                        <Sparkles size={16} className="text-honey" />
                    </motion.div>
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black text-white mb-2"
                >
                    Earn ₹100
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white/70 text-sm max-w-[280px] mx-auto"
                >
                    For every friend who books their first stay using your code
                </motion.p>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-center gap-8 mt-8"
                >
                    <div className="text-center">
                        <p className="text-2xl font-black text-white">{referralData.stats.invited}</p>
                        <p className="text-xs text-white/50 font-medium">Invited</p>
                    </div>
                    <div className="w-px bg-white/20" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-accent">{referralData.stats.joined}</p>
                        <p className="text-xs text-white/50 font-medium">Joined</p>
                    </div>
                    <div className="w-px bg-white/20" />
                    <div className="text-center">
                        <p className="text-2xl font-black text-honey">{referralData.stats.bookings}</p>
                        <p className="text-xs text-white/50 font-medium">Bookings</p>
                    </div>
                </motion.div>
            </div>

            {/* Main Content Card */}
            <div className="relative z-10 bg-gray-50 rounded-t-[35px] min-h-[60vh] -mt-4">

                {/* Tabs */}
                <div className="flex gap-2 px-5 pt-6 pb-4">
                    {['invite', 'earnings', 'history'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === tab
                                ? 'bg-surface text-white shadow-lg shadow-surface/30'
                                : 'bg-white text-gray-500 border border-gray-200'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="px-5 pb-32">
                    <AnimatePresence mode="wait">

                        {/* INVITE TAB */}
                        {activeTab === 'invite' && (
                            <motion.div
                                key="invite"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                {/* Referral Code Card */}
                                <div className="bg-white rounded-2xl p-5 shadow-lg shadow-gray-200/50 border border-gray-100">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Referral Code</p>

                                    <div className="flex items-center gap-3">
                                        <div
                                            ref={codeRef}
                                            className="flex-1 bg-gradient-to-r from-surface/5 to-accent/5 border-2 border-dashed border-surface/30 rounded-xl px-4 py-3 text-center"
                                        >
                                            <span className="text-2xl font-black text-surface tracking-widest">{referralData.code}</span>
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${copied
                                                ? 'bg-green-500 text-white scale-95'
                                                : 'bg-surface text-white hover:bg-surface/90'
                                                }`}
                                        >
                                            {copied ? <CheckCircle size={24} /> : <Copy size={24} />}
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {copied && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="text-center text-xs font-bold text-green-600 mt-2"
                                            >
                                                ✓ Copied to clipboard!
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Share Options */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Share Via</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {shareOptions.map((option, i) => (
                                            <motion.button
                                                key={i}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={option.action}
                                                className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                                            >
                                                <div className={`w-12 h-12 ${option.color} rounded-full flex items-center justify-center text-white shadow-lg`}>
                                                    <option.icon size={22} />
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-600">{option.label}</span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* How It Works */}
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">How It Works</p>
                                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
                                        {howItWorks.map((item, i) => (
                                            <div key={i} className="flex items-start gap-4">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center text-surface">
                                                        <item.icon size={18} />
                                                    </div>
                                                    {i < howItWorks.length - 1 && (
                                                        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gray-200" />
                                                    )}
                                                </div>
                                                <div className="flex-1 pt-1">
                                                    <h4 className="text-sm font-bold text-surface">{item.title}</h4>
                                                    <p className="text-xs text-gray-500">{item.desc}</p>
                                                </div>
                                                <span className="text-xs font-black text-surface/30">{item.step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Terms */}
                                <div className="text-center">
                                    <button className="text-xs font-bold text-accent underline underline-offset-2">
                                        View Terms & Conditions
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* EARNINGS TAB */}
                        {activeTab === 'earnings' && (
                            <motion.div
                                key="earnings"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-5"
                            >
                                {/* Total Earnings Card */}
                                <div className="bg-gradient-to-br from-surface to-[#003836] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
                                    <div className="relative z-10">
                                        <p className="text-sm text-white/70 font-medium mb-1">Total Earnings</p>
                                        <h3 className="text-4xl font-black text-white mb-4">₹{referralData.earnings.total}</h3>

                                        <div className="flex gap-4">
                                            <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                                <p className="text-xs text-white/50 font-medium">Pending</p>
                                                <p className="text-lg font-bold text-honey">₹{referralData.earnings.pending}</p>
                                            </div>
                                            <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                                                <p className="text-xs text-white/50 font-medium">This Month</p>
                                                <p className="text-lg font-bold text-accent">₹{referralData.earnings.thisMonth}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Earnings Breakdown */}
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                    <h4 className="font-bold text-surface text-sm mb-4 flex items-center gap-2">
                                        <TrendingUp size={16} /> Earnings Breakdown
                                    </h4>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <CheckCircle size={16} className="text-green-600" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Completed Referrals</span>
                                            </div>
                                            <span className="font-bold text-green-600">₹{referralData.earnings.total}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                                    <Clock size={16} className="text-yellow-600" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700">Pending Referrals</span>
                                            </div>
                                            <span className="font-bold text-yellow-600">₹{referralData.earnings.pending}</span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* HISTORY TAB */}
                        {activeTab === 'history' && (
                            <motion.div
                                key="history"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-3"
                            >
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">Referral Activity</p>

                                {referralData.history.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-surface/80 to-accent/80 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                            {item.avatar}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-surface text-sm">{item.name}</h4>
                                            <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${item.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                                                +₹{item.reward}
                                            </p>
                                            <span className={`text-[10px] font-bold uppercase ${item.status === 'completed'
                                                ? 'text-green-600 bg-green-50'
                                                : 'text-yellow-600 bg-yellow-50'
                                                } px-2 py-0.5 rounded-full`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </motion.div>
                                ))}

                                {referralData.history.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Users size={32} className="text-gray-400" />
                                        </div>
                                        <h4 className="font-bold text-gray-600">No referrals yet</h4>
                                        <p className="text-xs text-gray-400 mt-1">Share your code to start earning!</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div >
            </div >

            {/* Floating Share Button */}
            < motion.button
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="fixed bottom-6 left-5 right-5 bg-gradient-to-r from-surface to-accent text-white font-bold py-4 rounded-2xl shadow-2xl shadow-surface/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform z-30"
                onClick={handleShare}
            >
                <Share2 size={20} />
                Invite Friends & Earn ₹100
            </motion.button >
        </div >
    );
};

export default ReferAndEarnPage;
