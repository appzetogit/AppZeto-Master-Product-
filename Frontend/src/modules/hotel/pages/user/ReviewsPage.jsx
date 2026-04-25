import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, ThumbsUp, User } from 'lucide-react';
import { motion } from 'framer-motion';

const ReviewsPage = () => {
    const navigate = useNavigate();

    const reviews = [
        { id: 1, user: "Rahul Jain", rating: 5.0, date: "Oct 2024", type: "Family Trip", text: "Excellent stay! The rooms were super clean and the staff was very polite. Highly recommended for families looking for a safe stay." },
        { id: 2, user: "Mohit Kumar", rating: 4.5, date: "Sep 2024", type: "Business Trip", text: "Great value for money. Checking in was smooth and the location is perfect near the railway station. Wifi speed was good." },
        { id: 3, user: "Ankit Singh", rating: 5.0, date: "Aug 2024", type: "Solo", text: "Room service was quick. Food quality is amazing. Will definitely visit again. The view from the room was also nice." },
        { id: 4, user: "Priya Sharma", rating: 4.0, date: "July 2024", type: "Couple", text: "Nice hotel but breakfast options could be better. Rest everything was fine. Cleanliness was top notch." },
        { id: 5, user: "Vikram Malhotra", rating: 3.5, date: "June 2024", type: "Friends", text: "Average stay. AC was taking time to cool. Staff was helpful though." }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-surface" />
                </button>
                <h1 className="text-lg font-bold text-surface">Ratings & Reviews</h1>
            </div>

            {/* Summary Card */}
            <div className="p-5 pb-0">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                    <div className="flex flex-col items-center justify-center w-20 h-20 bg-surface/5 rounded-2xl border border-surface/10">
                        <span className="text-3xl font-black text-surface leading-none">4.6</span>
                        <div className="flex items-center gap-1 mt-1">
                            <Star size={10} fill="currentColor" className="text-surface" />
                            <span className="text-[10px] font-bold text-surface">Excellent</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-surface">Cleanliness</span>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full w-[90%] bg-surface rounded-full"></div></div>
                            <span className="text-xs font-bold text-surface">4.8</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-surface">Location</span>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full w-[85%] bg-surface rounded-full"></div></div>
                            <span className="text-xs font-bold text-surface">4.5</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-surface">Check-in</span>
                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full w-[95%] bg-surface rounded-full"></div></div>
                            <span className="text-xs font-bold text-surface">5.0</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="p-5 space-y-4 pb-20">
                <h3 className="font-bold text-surface text-base">User Reviews</h3>
                {reviews.map((review, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                <User size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-surface">{review.user}</h4>
                                <p className="text-[10px] text-gray-400">{review.date} • {review.type}</p>
                            </div>
                            <div className="ml-auto bg-green-50 px-2 py-1 rounded text-xs font-bold text-green-700 flex items-center gap-1">
                                {review.rating} <Star size={10} fill="currentColor" />
                            </div>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            {review.text}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ReviewsPage;
