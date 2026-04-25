
import React, { useState, useEffect, useRef } from 'react';
import { Star, MessageCircle, ThumbsUp, MoreHorizontal, CornerDownRight, CheckCircle2 } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { reviewService } from '../../../services/apiService';
import toast from 'react-hot-toast';

const ReviewCard = ({ review, onReplySubmit, currentUser }) => {
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Check if showing a placeholder or real reply
    const hasReply = !!review.reply;

    // Helpful State
    const [helpfulCount, setHelpfulCount] = useState(review.helpfulVotes?.length || 0);
    const [isHelpful, setIsHelpful] = useState(review.helpfulVotes?.includes(currentUser?._id) || false);

    const handleHelpful = async () => {
        // Optimistic Update
        const newStatus = !isHelpful;
        setIsHelpful(newStatus);
        setHelpfulCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            await reviewService.toggleHelpful(review._id);
        } catch (error) {
            // Revert on error
            setIsHelpful(!newStatus);
            setHelpfulCount(prev => !newStatus ? prev + 1 : prev - 1);
            toast.error("Failed to update helpful status");
        }
    };

    const handleSubmit = async () => {
        if (!replyText.trim()) return;
        setSubmitting(true);
        try {
            await onReplySubmit(review._id, replyText);
            setReplyText('');
            setIsReplying(false);
            toast.success('Reply posted successfully');
        } catch (error) {
            toast.error(error.message || 'Failed to post reply');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="review-card bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center font-bold text-gray-400 text-xs">
                        {review.userId?.name?.[0] || 'G'}
                    </div>
                    <div>
                        <h4 className="font-bold text-[#003836] text-sm">{review.userId?.name || 'Guest User'}</h4>
                        <span className='text-[10px] text-gray-500 font-medium block -mt-0.5 truncate max-w-[150px]'>
                            STAYED AT: {review.propertyId?.propertyName || 'Property'}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                            <div className="flex text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-gray-300"} />
                                ))}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">• {new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                {review.comment}
            </p>

            {/* Existing Reply if any */}
            {hasReply && (
                <div className="mt-3 mb-4 pl-4 border-l-2 border-[#004F4D]/20">
                    <div className="bg-[#004F4D]/5 rounded-xl p-3">
                        <p className="text-xs font-bold text-[#004F4D] mb-1">Your Reply</p>
                        <p className="text-sm text-gray-700">{review.reply}</p>
                        <p className="text-[10px] text-gray-400 mt-2 text-right">
                            {new Date(review.replyAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-4 border-t border-dashed border-gray-100 pt-3">
                <button
                    onClick={handleHelpful}
                    className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isHelpful ? 'text-[#004F4D]' : 'text-gray-400 hover:text-[#004F4D]'}`}
                >
                    <ThumbsUp size={14} fill={isHelpful ? "currentColor" : "none"} />
                    Helpful {helpfulCount > 0 && <span className="ml-0.5">({helpfulCount})</span>}
                </button>

                {!hasReply && (
                    <button
                        onClick={() => setIsReplying(!isReplying)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${isReplying ? 'text-[#004F4D]' : 'text-gray-400 hover:text-[#004F4D]'}`}
                    >
                        <MessageCircle size={14} /> Reply
                    </button>
                )}
                {hasReply && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                        <CheckCircle2 size={14} /> Replied
                    </span>
                )}
            </div>

            {/* Reply Box */}
            {isReplying && !hasReply && (
                <div className="mt-4 pl-4 border-l-2 border-gray-100 animate-slide-down">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex gap-2 items-start mb-2">
                            <CornerDownRight size={14} className="text-gray-400 mt-1" />
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write your reply to the guest..."
                                className="w-full bg-transparent text-sm focus:outline-none resize-none h-20 placeholder:text-gray-400"
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsReplying(false)}
                                className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !replyText.trim()}
                                className="bg-[#004F4D] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:scale-100"
                            >
                                {submitting ? 'Posting...' : 'Post Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PartnerReviews = () => {
    const listRef = useRef(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avgRating: 0, totalReviews: 0, breakdown: [0, 0, 0, 0, 0] });
    const [user, setUser] = useState(null);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem('user'));
        setUser(u);
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const data = await reviewService.getAllPartnerReviews();
            setReviews(data);

            // Calculate pseudo stats locally for the UI since backend aggregate endpoint handles pending count but maybe not full breakdown
            if (data.length > 0) {
                const total = data.length;
                const sum = data.reduce((acc, r) => acc + r.rating, 0);
                const avg = (sum / total).toFixed(1);

                // Count starts 5 to 1
                const breakdown = [5, 4, 3, 2, 1].map(star => {
                    const count = data.filter(r => Math.round(r.rating) === star).length;
                    return (count / total) * 100;
                });

                setStats({ avgRating: avg, totalReviews: total, breakdown });
            }

        } catch (error) {
            console.error("Failed to fetch reviews", error);
        } finally {
            setLoading(false);
        }
    };

    // Animation effect when reviews populate
    useEffect(() => {
        if (!loading && listRef.current && reviews.length > 0) {
            gsap.fromTo(listRef.current.children,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.1, duration: 0.5, ease: "power2.out" }
            );
        }
    }, [loading, reviews]);


    const handleReplySubmit = async (reviewId, replyText) => {
        // Call API
        const response = await reviewService.reply(reviewId, replyText);

        // Optimistic update or refresh
        setReviews(prev => prev.map(r => {
            if (r._id === reviewId) {
                return {
                    ...r,
                    reply: replyText,
                    replyAt: new Date().toISOString()
                };
            }
            return r;
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title="Reviews" subtitle="What guests are saying" />

            {/* Scorecard */}
            <div className="bg-white px-6 py-6 border-b border-gray-100 shadow-sm mb-6">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-5xl font-black text-[#003836] tracking-tighter">
                            {stats.avgRating || '0.0'}
                        </div>
                        <div className="flex justify-center text-yellow-500 mt-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={12} fill={i < Math.round(stats.avgRating) ? "currentColor" : "none"} className={i < Math.round(stats.avgRating) ? "" : "text-gray-300"} />
                            ))}
                        </div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">
                            {stats.totalReviews} Reviews
                        </p>
                    </div>

                    {/* Bars */}
                    <div className="flex-1 space-y-1.5">
                        {[0, 1, 2, 3, 4].map((index) => {
                            const starLabel = 5 - index; // 5,4,3,2,1
                            const percentage = stats.breakdown[index];
                            return (
                                <div key={starLabel} className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 w-2">{starLabel}</span>
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#004F4D] rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <main ref={listRef} className="max-w-3xl mx-auto px-4">
                {loading ? (
                    <div className="flex justify-center pt-10">
                        <div className="w-8 h-8 border-2 border-[#004F4D] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        No reviews yet.
                    </div>
                ) : (
                    reviews.map(review => (
                        <ReviewCard key={review._id} review={review} onReplySubmit={handleReplySubmit} currentUser={user} />
                    ))
                )}
            </main>
        </div>
    );
};

export default PartnerReviews;
