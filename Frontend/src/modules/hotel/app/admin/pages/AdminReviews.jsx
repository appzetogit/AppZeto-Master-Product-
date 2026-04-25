import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star, Search, Filter, MoreVertical, Eye, Trash2,
    CheckCircle, XCircle, AlertTriangle, ThumbsUp, ThumbsDown, Flag, Loader2,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const StarRating = ({ rating }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                size={14}
                className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
            />
        ))}
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-100 text-green-700 border-green-200',
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        flagged: 'bg-red-100 text-red-700 border-red-200',
        rejected: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const icons = {
        approved: <CheckCircle size={10} />,
        pending: <AlertTriangle size={10} />,
        flagged: <Flag size={10} />,
        rejected: <XCircle size={10} />,
    };

    return (
        <span className={`flex items-center gap-1 w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${styles[status] || styles.pending}`}>
            {icons[status] || icons.pending}
            {status}
        </span>
    );
};

const AdminReviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalReviews, setTotalReviews] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        status: '',
        rating: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchReviews = useCallback(async (page, currentFilters) => {
        try {
            setLoading(true);
            const params = {
                page,
                limit,
                status: currentFilters.status,
                rating: currentFilters.rating
            };
            const data = await adminService.getReviews(params);
            if (data.success) {
                setReviews(data.reviews);
                setTotalReviews(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchReviews(currentPage, filters);
    }, [currentPage, filters, fetchReviews]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleUpdateStatus = async (reviewId, newStatus) => {
        try {
            const res = await adminService.updateReviewStatus(reviewId, newStatus);
            if (res.success) {
                toast.success(`Review ${newStatus} successfully`);
                fetchReviews(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update review status');
        }
    };

    const handleApprove = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Approve Review?',
            message: `This will make the review visible to all users.`,
            type: 'success',
            confirmText: 'Approve',
            onConfirm: () => handleUpdateStatus(review._id, 'approved')
        });
    };

    const handleReject = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Reject Review?',
            message: `This review will be hidden from users.`,
            type: 'danger',
            confirmText: 'Reject',
            onConfirm: () => handleUpdateStatus(review._id, 'rejected')
        });
    };

    const handleDelete = (review) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete Review?',
            message: `Are you sure you want to permanently delete this review? This action cannot be undone.`,
            type: 'danger',
            confirmText: 'Delete Review',
            onConfirm: async () => {
                try {
                    const res = await adminService.deleteReview(review._id);
                    if (res.success) {
                        toast.success('Review deleted successfully');
                        fetchReviews(currentPage, filters);
                    }
                } catch {
                    toast.error('Failed to delete review');
                }
            }
        });
    };

    const handleExportCSV = () => {
        if (reviews.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'User', 'Hotel', 'Rating', 'Comment', 'Status', 'Helpful', 'Reports', 'Date'];
        const csvContent = [
            headers.join(','),
            ...reviews.map(r => [
                r._id,
                `"${r.userId?.name || 'Guest'}"`,
                `"${r.hotelId?.name || 'Deleted Hotel'}"`,
                r.rating,
                `"${(r.comment || '').replace(/"/g, '""')}"`,
                r.status,
                r.helpful || 0,
                r.reportedCount || 0,
                new Date(r.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `reviews-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 pb-10 uppercase tracking-tight" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Review Management ({totalReviews})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Monitor and moderate user reviews across all hotels.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="flagged">Flagged</option>
                        <option value="rejected">Rejected</option>
                    </select>

                    <select
                        value={filters.rating}
                        onChange={(e) => handleFilterChange('rating', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Ratings</option>
                        <option value="5">5 Stars</option>
                        <option value="4">4 Stars</option>
                        <option value="3">3 Stars</option>
                        <option value="2">2 Stars</option>
                        <option value="1">1 Star</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4 min-h-[400px]">
                {loading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-2xl"></div>)
                ) : (
                    <AnimatePresence>
                        {reviews.length > 0 ? (
                            reviews.map((review, index) => (
                                <motion.div
                                    key={review._id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative font-bold"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <h4 className="font-bold text-gray-900 uppercase tracking-tight">{review.userId?.name || 'Guest'}</h4>
                                                        <StarRating rating={review.rating} />
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                                                        Reviewed <Link to={`/hotel/admin/hotels/${review.hotelId?._id}`} className="text-black font-bold hover:underline">{review.hotelId?.name || 'Deleted Hotel'}</Link> • {new Date(review.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <StatusBadge status={review.status} />
                                            </div>

                                            <p className="text-sm text-gray-700 leading-relaxed mb-4 uppercase tracking-tight">{review.comment}</p>

                                            <div className="flex items-center gap-6 text-[10px] font-bold uppercase text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <ThumbsUp size={14} />
                                                    Helpful: {review.helpful || 0}
                                                </span>
                                                {review.reportedCount > 0 && (
                                                    <span className="flex items-center gap-1 text-red-600">
                                                        <Flag size={14} />
                                                        Reports: {review.reportedCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === review._id ? null : review._id); }}
                                                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {activeDropdown === review._id && (
                                                <div className="absolute right-0 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1">
                                                    {review.status !== 'approved' && (
                                                        <button
                                                            onClick={() => handleApprove(review)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-green-600"
                                                        >
                                                            <CheckCircle size={14} /> Approve
                                                        </button>
                                                    )}
                                                    {review.status !== 'rejected' && (
                                                        <button
                                                            onClick={() => handleReject(review)}
                                                            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-amber-600"
                                                        >
                                                            <XCircle size={14} /> Reject
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(review)}
                                                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                                                    >
                                                        <Trash2 size={14} /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                                <Star size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-[10px] font-bold uppercase text-gray-900 mb-2">No Reviews Found</h3>
                                <p className="text-[10px] font-bold uppercase text-gray-500">
                                    No reviews to display matching filters.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination */}
            {!loading && reviews.length > 0 && (
                <div className="p-4 border border-gray-100 rounded-2xl bg-white flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                        Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalReviews)} of {totalReviews} reviews
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-10 h-10 rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminReviews;
