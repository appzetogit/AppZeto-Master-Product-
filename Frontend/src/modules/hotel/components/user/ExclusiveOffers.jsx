import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { offerService } from '../../services/apiService';
import toast from 'react-hot-toast';

const ExclusiveOffers = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                setLoading(true);
                const data = await offerService.getActive();
                setOffers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Fetch Offers Error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchOffers();
    }, []);

    if (loading) {
        return (
            <div className="py-2 pl-5">
                <div className="h-6 w-48 bg-gray-100 rounded animate-pulse mb-3"></div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {[1, 2].map(i => (
                        <div key={i} className="min-w-[220px] h-[120px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center">
                            <Loader2 className="text-gray-200 animate-spin" size={20} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || (offers.length === 0 && !loading)) {
        return null; // Don't show section if no offers or error
    }

    // Duplicate offers list for seamless infinite loop
    const loopedOffers = [...offers, ...offers];

    const handleOfferClick = (offer) => {
        if (offer.offerType === 'banner') {
            navigate('/listings');
            return;
        }
        if (offer.code) {
            navigator.clipboard.writeText(offer.code);
            toast.success(`Code ${offer.code} copied!`);
        }
        navigate('/listings');
    };

    return (
        <section className="py-2 mt-2 overflow-hidden">
            <h2 className="text-xl font-bold text-surface mb-3 flex items-center gap-2 pl-5">
                Exclusive offers for you
                <div className="bg-accent/10 px-2 py-0.5 rounded text-[10px] font-bold text-accent">NEW</div>
            </h2>

            {/* Infinite auto-scroll container */}
            <div className="flex w-full overflow-hidden">
                <div
                    className="flex gap-3 pl-5"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onTouchStart={() => setIsPaused(true)}
                    onTouchEnd={() => setIsPaused(false)}
                    style={{
                        animation: `marquee ${offers.length * 4}s linear infinite`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                        width: 'max-content'
                    }}
                >
                    {loopedOffers.map((offer, idx) => (
                        <div
                            key={`${offer._id || offer.id}-${idx}`}
                            onClick={() => handleOfferClick(offer)}
                            className="relative min-w-[220px] h-[120px] rounded-2xl overflow-hidden shadow-md shadow-gray-200/50 cursor-pointer flex-shrink-0 active:scale-95 transition-transform"
                        >
                            {/* Background Image */}
                            <img
                                src={offer.image}
                                alt={offer.title}
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {/* Conditional Overlay based on offerType — only show for coupons with a valid discount */}
                            {offer.offerType !== 'banner' && offer.discountValue && (
                                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent flex flex-col justify-center p-4 text-white items-start">
                                    <span className="bg-accent text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase mb-1">
                                        {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                                    </span>
                                    <h3 className="text-base font-black leading-tight max-w-[85%] drop-shadow-md line-clamp-1">{offer.title}</h3>
                                    <p className="text-[9px] font-semibold text-gray-300 mt-0.5 max-w-[75%] leading-relaxed drop-shadow-md line-clamp-1">{offer.subtitle}</p>

                                    <div className="mt-2 flex items-center gap-2">
                                        <button className="px-3 py-1 bg-white text-black text-[9px] font-black rounded-lg shadow-md">
                                            {offer.btnText || "Copy Code"}
                                        </button>
                                        {offer.code && (
                                            <span className="text-[8px] text-white/60 font-medium border-l border-white/20 pl-2">
                                                Code: <span className="text-white font-bold">{offer.code}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Keyframe for continuous marquee scroll */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    );
};

export default ExclusiveOffers;
