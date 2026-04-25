import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    MapPin, Clock,
    Star,
    CheckCircle, XCircle, AlertCircle, Ticket
} from 'lucide-react';
import { bookingService } from '../../services/apiService';

const BookingsPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('upcoming');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter Tabs Configuration
    const tabs = [
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'ongoing', label: 'Ongoing' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' }
    ];

    // Fetch Bookings when Active Tab Changes
    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                // Backend now handles filtering via 'type' query param
                const data = await bookingService.getMyBookings(activeTab);
                setBookings(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Failed to fetch bookings", err);
                setBookings([]);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [activeTab]);

    const getStatusBadge = (status, paymentStatus) => {
        const s = (status || '').toLowerCase();

        if (s === 'confirmed' || s === 'pending') {
            if (paymentStatus === 'paid') {
                return <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Paid</span>;
            }
            if (paymentStatus === 'partial') {
                return <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Partially Paid</span>;
            }
            return <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><AlertCircle size={10} /> Pay at Hotel</span>;
        }
        if (s === 'pending_payment') {
            return <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock size={10} /> Payment Pending</span>;
        }
        if (s === 'checked_in') {
            return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><Clock size={10} /> Ongoing</span>;
        }
        if (s === 'completed' || s === 'checked_out') {
            return <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><CheckCircle size={10} /> Completed</span>;
        }
        if (s === 'cancelled' || s === 'no_show' || s === 'rejected') {
            return <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><XCircle size={10} /> {s === 'no_show' ? 'No Show' : 'Cancelled'}</span>;
        }
        return <span className="bg-gray-100 text-gray-500 text-[10px] px-2 py-1 rounded-full">{status}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header with Scrollable Tabs */}
            <div className="sticky top-0 bg-surface text-white px-5 pt-10 pb-6 rounded-b-3xl shadow-lg shadow-surface/20 z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-black mb-1">My Bookings</h1>
                        <p className="text-xs text-white/80 font-medium tracking-wide">Manage your stays and trips</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-black/20 p-1 rounded-2xl flex items-center justify-between backdrop-blur-sm overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-200 whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-white text-surface shadow-sm scale-[0.98]'
                                : 'text-white/70 hover:bg-white/10'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-6 pb-32">
                <AnimatePresence mode="wait">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-4 border-surface border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (bookings.length === 0) ? (
                        // Empty State
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center py-16"
                        >
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <Ticket size={32} className="text-gray-300" />
                            </div>
                            <h3 className="text-base font-bold text-surface mb-1">No {activeTab} bookings</h3>
                            <p className="text-[11px] text-gray-400 text-center max-w-[240px] mb-5">
                                {activeTab === 'upcoming' && "Your upcoming trips will appear here."}
                                {activeTab === 'ongoing' && "Currently active stays will show here."}
                                {activeTab === 'completed' && "Your past stays history is empty."}
                                {activeTab === 'cancelled' && "No cancelled bookings found."}
                            </p>
                            {activeTab !== 'cancelled' && (
                                <button
                                    onClick={() => navigate('/listings')}
                                    className="bg-surface text-white font-bold py-2.5 px-6 rounded-lg text-xs shadow-lg shadow-surface/30 active:scale-95 transition-transform"
                                >
                                    Explore Hotels
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        // Bookings List
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        >
                            {bookings.map((booking, index) => {
                                const hotel = booking.propertyId || {};
                                const bookingStatus = booking.bookingStatus || booking.status || 'pending';
                                const checkInDate = booking.checkInDate || booking.checkIn;
                                const checkOutDate = booking.checkOutDate || booking.checkOut;
                                const checkIn = checkInDate ? new Date(checkInDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'N/A';
                                const checkOut = checkOutDate ? new Date(checkOutDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'N/A';

                                const propertyImage = hotel.propertyImages?.[0] || hotel.images?.[0]?.url || hotel.images?.[0] || hotel.coverImage || 'https://via.placeholder.com/150';

                                return (
                                    <motion.div
                                        key={booking._id || booking.id || index}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        onClick={() =>
                                            navigate(`/booking/${booking._id}`, {
                                                state: { booking: booking }
                                            })
                                        }
                                        className="bg-white rounded-xl overflow-hidden shadow-md shadow-gray-200/50 border border-gray-100 cursor-pointer active:scale-[0.98] transition-transform"
                                    >
                                        <div className="flex h-28">
                                            {/* IMAGE SAME */}
                                            <div className="w-24 bg-gray-200 shrink-0 relative">
                                                <img
                                                    src={propertyImage}
                                                    alt={hotel.propertyName || hotel.name || 'Hotel'}
                                                    className={`w-full h-full object-cover ${activeTab === 'cancelled' ? 'grayscale' : ''
                                                        }`}
                                                />
                                                <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <Star size={8} fill="currentColor" />
                                                    {hotel.avgRating > 0
                                                        ? Number(hotel.avgRating).toFixed(1)
                                                        : 'New'}
                                                </div>
                                            </div>

                                            {/* CONTENT */}
                                            <div className="flex-1 p-3 flex flex-col justify-start">
                                                <div className="flex justify-between items-start mb-1">
                                                    {getStatusBadge(
                                                        bookingStatus,
                                                        booking.paymentStatus
                                                    )}
                                                    <span className="text-[9px] text-gray-400 font-medium tracking-wide">
                                                        #{booking.bookingId || booking._id?.slice(-6)}
                                                    </span>
                                                </div>

                                                {/* ✅ FIXED PROPERTY NAME */}
                                                <h3 className="font-bold text-surface text-sm leading-tight line-clamp-2 break-words min-h-[32px]">
                                                    {hotel.propertyName ||
                                                        hotel.name ||
                                                        'Unknown Property'}
                                                </h3>

                                                <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mb-1">
                                                    <MapPin size={9} />
                                                    {`${hotel.address?.city || ''}, ${hotel.address?.state || ''
                                                        }`
                                                        .replace('undefined', '')
                                                        .replace(/^, /, '')
                                                        .replace(/, $/, '') || 'Location'}
                                                </p>

                                                <div className="flex items-center gap-2 text-[10px]">
                                                    <div className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-semibold text-gray-700">
                                                        {checkIn}
                                                    </div>
                                                    <span className="text-gray-300">→</span>
                                                    <div className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-semibold text-gray-700">
                                                        {checkOut}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50 flex justify-between items-center">
                                            <p className="text-[10px] text-gray-400 font-medium">
                                                Total Amount
                                            </p>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-surface leading-none">
                                                    ₹{booking.totalAmount?.toLocaleString()}
                                                </p>
                                                {(booking.paymentMethod === 'prepaid' && booking.remainingAmount > 0) && (
                                                    <p className="text-[9px] font-bold text-orange-600 mt-0.5">
                                                        To Pay at Hotel: ₹{booking.remainingAmount?.toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );

                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default BookingsPage;
