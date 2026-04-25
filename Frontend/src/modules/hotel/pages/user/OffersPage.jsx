import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Copy, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const OffersPage = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const colors = [
        "bg-red-50 border-red-200 text-red-600",
        "bg-blue-50 border-blue-200 text-blue-600",
        "bg-green-50 border-green-200 text-green-600",
        "bg-orange-50 border-orange-200 text-orange-600",
        "bg-purple-50 border-purple-200 text-purple-600",
        "bg-teal-50 border-teal-200 text-teal-600"
    ];

    useEffect(() => {
        fetchOffers();
    }, []);

    const fetchOffers = async () => {
        try {
            setLoading(true);
            const data = await offerService.getActive();
            setOffers(data);
        } catch (err) {
            console.error("Fetch Offers Error:", err);
            setError("Failed to load offers. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        toast.success(`Code ${code} copied to clipboard!`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-surface" />
                </button>
                <h1 className="text-lg font-bold text-surface">Available Offers</h1>
            </div>

            <div className="p-5 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Loader2 size={40} className="animate-spin mb-4 text-accent" />
                        <p className="text-sm font-medium">Loading offers...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 font-bold mb-4">{error}</p>
                        <button onClick={fetchOffers} className="text-accent flex items-center gap-2 mx-auto font-bold text-sm">
                            <RefreshCw size={16} /> Try Again
                        </button>
                    </div>
                ) : offers.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <p className="text-lg font-bold text-surface mb-2">No active offers</p>
                        <p className="text-sm">Check back later for new exclusive deals!</p>
                    </div>
                ) : (
                    offers.map((offer, idx) => {
                        const colorClass = colors[idx % colors.length];
                        return (
                            <motion.div
                                key={offer._id || idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`rounded-2xl p-5 border shadow-sm bg-white relative overflow-hidden`}
                            >
                                <div className={`absolute top-0 right-0 p-3 opacity-10 ${colorClass.split(' ')[2]}`}>
                                    <CheckCircle size={100} />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`px-3 py-1 rounded border border-dashed font-bold text-sm tracking-widest uppercase ${colorClass}`}>
                                            {offer.code}
                                        </div>
                                        <button onClick={() => copyCode(offer.code)} className="text-gray-400 hover:text-surface transition p-2 bg-gray-50 rounded-full">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <h3 className="font-bold text-surface text-base mb-1">{offer.title}</h3>
                                    <p className="text-xs text-gray-500 line-clamp-2">{offer.subtitle || offer.description}</p>

                                    <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                        <span className={`text-[10px] font-bold flex items-center gap-1 ${colorClass.split(' ')[2]}`}>
                                            <CheckCircle size={12} /> Verified Offer
                                        </span>
                                        <button
                                            onClick={() => { copyCode(offer.code); navigate('/listings'); }}
                                            className="text-xs font-bold text-accent"
                                        >
                                            Apply & Book
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default OffersPage;
