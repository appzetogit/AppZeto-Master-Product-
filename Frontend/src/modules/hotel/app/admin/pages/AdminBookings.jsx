import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Search, Filter, MoreVertical,
    CheckCircle, XCircle, Clock, ArrowRight, X, AlertTriangle, Eye,
    FileText, Download, Loader2, ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const BookingStatusBadge = ({ status }) => {
    const styles = {
        confirmed: 'bg-green-100 text-green-700 border-green-200 font-bold',
        pending: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
        cancelled: 'bg-red-100 text-red-700 border-red-200 font-bold',
        completed: 'bg-blue-100 text-blue-700 border-blue-200 font-bold',
        checked_in: 'bg-orange-100 text-orange-700 border-orange-200 font-bold',
        checked_out: 'bg-purple-100 text-purple-700 border-purple-200 font-bold',
        refunded: 'bg-gray-100 text-gray-700 border-gray-200 font-bold',
    };

    const icons = {
        confirmed: <CheckCircle size={10} className="mr-1" />,
        pending: <Clock size={10} className="mr-1" />,
        cancelled: <XCircle size={10} className="mr-1" />,
        completed: <CheckCircle size={10} className="mr-1" />,
        checked_in: <AlertTriangle size={10} className="mr-1" />,
        checked_out: <CheckCircle size={10} className="mr-1" />,
        refunded: <ArrowRight size={10} className="mr-1" />,
    };

    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${styles[status] || styles.pending}`}>
            {icons[status] || icons.pending}
            {status}
        </span>
    );
};

const MetricCard = ({ label, value, subLabel, loading }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            {loading ? (
                <div className="h-8 w-16 bg-gray-50 animate-pulse rounded-md"></div>
            ) : (
                <h3 className="text-2xl font-bold text-gray-900 uppercase">
                    {typeof value === 'number' && label.includes('REVENUE') ? `₹${(value ?? 0).toLocaleString()}` : (value ?? 0).toLocaleString()}
                </h3>
            )}
            {subLabel && <span className="text-[10px] font-bold uppercase text-gray-400">{subLabel}</span>}
        </div>
    </div>
);

const AdminBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalBookings, setTotalBookings] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    // For metrics, we still fetch all or get from a dashboard sync.
    // Assuming we want fresh metrics for current view or global stats from a separate call.
    // For now, let's just use the current page for simple stats if needed, or better, another call.
    // For simplicity, let's keep a metric card for global stats.
    const [globalStats, setGlobalStats] = useState({ total: 0, confirmed: 0, completed: 0, pending: 0 });

    const fetchBookings = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const bookingsRes = await adminService.getBookings({
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status
            });

            if (bookingsRes.success) {
                setBookings(bookingsRes.bookings);
                setTotalBookings(bookingsRes.total);
                setTotalPages(Math.ceil(bookingsRes.total / limit));

                if (bookingsRes.stats) {
                    setGlobalStats({
                        total: bookingsRes.stats.total,
                        confirmed: bookingsRes.stats.confirmed,
                        pending: bookingsRes.stats.pending,
                        cancelled: bookingsRes.stats.cancelled,
                        completed: bookingsRes.stats.completed,
                        checked_in: bookingsRes.stats.checked_in || 0,
                        checked_out: bookingsRes.stats.checked_out || 0
                    });
                }
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching bookings:', error);
                toast.error('Failed to load bookings');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchBookings(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchBookings]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleUpdateStatus = async (bookingId, newStatus) => {
        try {
            const res = await adminService.updateBookingStatus(bookingId, newStatus);
            if (res.success) {
                toast.success(`Booking ${newStatus} successfully`);
                fetchBookings(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update booking status');
        }
    };

    const handleAction = (action, booking) => {
        setActiveDropdown(null);
        if (action === 'cancel') {
            setModalConfig({
                isOpen: true,
                title: 'Cancel Booking?',
                message: `Are you sure you want to cancel booking #${booking.bookingId}? This will notify both the guest and the partner.`,
                type: 'danger',
                confirmText: 'Cancel Booking',
                onConfirm: () => handleUpdateStatus(booking._id, 'cancelled')
            });
        }
    };

    const handleExportCSV = () => {
        if (bookings.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Booking ID', 'Hotel', 'Guest', 'Phone', 'Check-In', 'Check-Out', 'Status', 'Amount'];
        const csvContent = [
            headers.join(','),
            ...bookings.map(b => [
                b._id,
                b.bookingId,
                `"${b.propertyId?.propertyName || 'Deleted Hotel'}"`,
                `"${b.userId?.name || 'Guest Details Missing'}"`,
                b.userId?.phone || 'N/A',
                new Date(b.checkInDate).toLocaleDateString(undefined, { timeZone: 'UTC' }),
                new Date(b.checkOutDate).toLocaleDateString(undefined, { timeZone: 'UTC' }),
                b.bookingStatus,
                b.totalAmount
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `bookings-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative pb-10 uppercase tracking-tight" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Booking Management ({totalBookings})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Monitor all reservations and their current statuses.</p>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard label="Total Bookings" value={globalStats.total} subLabel="GLOBAL" loading={loading} />
                <MetricCard label="In-House" value={globalStats.checked_in} subLabel="LIVE" loading={loading} />
                <MetricCard label="Upcoming" value={globalStats.confirmed} subLabel="CONFIRMED" loading={loading} />
                <MetricCard label="Pending" value={globalStats.pending} subLabel="NEEDS ACTION" loading={loading} />
            </div>

            {/* Tabs for quick filtering */}
            <div className="flex overflow-x-auto gap-1 bg-gray-100 p-1.5 rounded-2xl w-fit mb-6 no-scrollbar border border-gray-200">
                {[
                    { id: '', label: 'All', count: globalStats.total },
                    { id: 'pending', label: 'Pending', count: globalStats.pending },
                    { id: 'confirmed', label: 'Confirmed', count: globalStats.confirmed },
                    { id: 'checked_in', label: 'In-House', count: globalStats.checked_in },
                    { id: 'checked_out', label: 'Completed', count: (globalStats.checked_out || 0) + (globalStats.completed || 0) },
                    { id: 'cancelled', label: 'Cancelled', count: globalStats.cancelled },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleFilterChange('status', tab.id)}
                        className={`
                            px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2 whitespace-nowrap
                            ${filters.status === tab.id 
                                ? 'bg-white text-black shadow-sm ring-1 ring-gray-200' 
                                : 'text-gray-500 hover:text-black hover:bg-white/50'}
                        `}
                    >
                        {tab.label}
                        <span className={`
                            px-1.5 py-0.5 rounded-md text-[8px]
                            ${filters.status === tab.id ? 'bg-black text-white' : 'bg-gray-200 text-gray-600'}
                        `}>
                            {tab.count || 0}
                        </span>
                    </button>
                ))}
            </div>

            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search via ID, Guest or Hotel Name..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Booking ID</th>
                                <th className="p-4">Hotel Name</th>
                                <th className="p-4">Guest Info</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Amount</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="7" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {bookings.length > 0 ? (
                                        bookings.map((booking, index) => (
                                            <motion.tr
                                                key={booking._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/bookings/${booking._id}`} className="font-mono text-xs font-bold text-gray-900 hover:underline uppercase tracking-tight">
                                                        #{booking.bookingId || booking._id.slice(-6)}
                                                    </Link>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 font-bold">
                                                        {new Date(booking.createdAt).toLocaleDateString()}
                                                    </p>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                                            {booking.propertyId?.propertyName || 'Deleted Hotel'}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-semibold uppercase">
                                                            {booking.propertyId?.address?.city || 'Location N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                                                            {booking.userId?.name || 'Guest User'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                            {booking.userId?.email || 'No Email'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                            {booking.userId?.phone || 'No Phone'}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-[10px] text-gray-600 flex flex-col gap-1 font-bold uppercase">
                                                        <span className="flex items-center gap-1">
                                                            IN: {booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            OUT: {booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString(undefined, { timeZone: 'UTC' }) : 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <BookingStatusBadge status={booking.bookingStatus} />
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-900 text-sm">
                                                    <div className="flex flex-col items-end">
                                                        <span>₹{booking.totalAmount?.toLocaleString()}</span>
                                                        {booking.couponCode && (
                                                            <span className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-green-50 text-green-700 rounded-md border border-green-100 text-[8px] font-bold uppercase ring-1 ring-green-500/10 whitespace-nowrap">
                                                                <Tag size={10} className="text-green-500" />
                                                                {booking.couponCode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === booking._id ? null : booking._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === booking._id && (
                                                        <div className="absolute right-8 top-8 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/bookings/${booking._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Details
                                                            </Link>
                                                            {['confirmed', 'pending', 'awaiting_payment'].includes(booking.bookingStatus) && (
                                                                <button
                                                                    onClick={() => handleAction('cancel', booking)}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                                                                >
                                                                    <XCircle size={14} /> Cancel Booking
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                No bookings found matching filters.
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && bookings.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalBookings)} of {totalBookings} bookings
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
        </div>
    );
};

export default AdminBookings;
