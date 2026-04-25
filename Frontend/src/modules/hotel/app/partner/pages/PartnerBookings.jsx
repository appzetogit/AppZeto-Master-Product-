import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, User, Phone,
    Clock, MapPin, ChevronRight, BedDouble
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';

// --- Card Component ---
const BookingCard = ({ booking }) => {
    const navigate = useNavigate();

    // Status Logic
    const rawStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase().trim();

    const getStatusStyle = (s) => {
        if (s === 'confirmed') return { color: 'text-blue-600 bg-blue-50 border-blue-100', label: 'Confirmed' };
        if (s === 'checked_in') return { color: 'text-purple-600 bg-purple-50 border-purple-100', label: 'In-House' };
        if (s === 'checked_out' || s === 'completed') return { color: 'text-emerald-600 bg-emerald-50 border-emerald-100', label: 'Completed' };
        if (s === 'cancelled') return { color: 'text-red-500 bg-red-50 border-red-100', label: 'Cancelled' };
        if (s === 'no_show') return { color: 'text-gray-500 bg-gray-100 border-gray-200', label: 'No Show' };
        if (s === 'pending_payment') return { color: 'text-orange-600 bg-orange-50 border-orange-100', label: 'Payment Pending' };
        // Default
        return { color: 'text-yellow-600 bg-yellow-50 border-yellow-100', label: s.replace('_', ' ').toUpperCase() };
    };

    const status = getStatusStyle(rawStatus);

    // Helper to format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
    };

    // Calculate nights
    const calculateNights = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 1;
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        return diff > 0 ? diff : 1;
    };

    const guestName = booking.userId?.name || 'Guest User';
    const checkInDate = formatDate(booking.checkInDate || booking.checkIn);
    const checkOutDate = formatDate(booking.checkOutDate || booking.checkOut);
    const nights = calculateNights(booking.checkInDate || booking.checkIn, booking.checkOutDate || booking.checkOut);
    const guestCount = (booking.guests?.adults || 1) + (booking.guests?.children || 0);
    const roomsCount = 1;
    const hotelName = booking.propertyId?.propertyName || booking.propertyId?.name || 'Hotel Property';
    const bookingId = booking.bookingId || booking._id?.slice(-8).toUpperCase(); // Show bookingId if available

    return (
        <div
            onClick={() => navigate(`/hotel/bookings/${booking._id}`)}
            className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
        >
            {/* Header: ID & Status */}
            <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    ID: {bookingId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide border ${status.color}`}>
                    {status.label}
                </span>
            </div>

            {/* Guest & Hotel Info */}
            <div className="mb-4">
                <h3 className="text-lg font-black text-[#003836] leading-none mb-1">
                    {guestName}
                </h3>
                <p className="text-xs text-gray-400 font-medium">{hotelName}</p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs mb-5">
                <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={14} className="text-[#004F4D]" />
                    <span className="font-bold text-gray-700">{checkInDate} - {checkOutDate}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={14} className="text-[#004F4D]" />
                    <span className="font-medium">{nights} Nights</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <User size={14} className="text-[#004F4D]" />
                    <span className="font-medium">{guestCount} Guests</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                    <BedDouble size={14} className="text-[#004F4D]" />
                    <span className="font-medium">{roomsCount} Room</span>
                </div>
            </div>

            {/* Earning & Collection Section (Swapped Priority) */}
            <div className="pt-3 border-t border-dashed border-gray-200 mb-4 space-y-1 text-right">
                <div className="flex items-center justify-between opacity-60">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expected Earnings</span>
                    <span className="font-bold text-gray-600 text-xs">₹{booking.partnerPayout?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${(booking.remainingAmount > 0 || booking.paymentStatus === 'pending') ? 'text-red-500' : 'text-gray-400'}`}>
                        {(booking.remainingAmount > 0 || booking.paymentStatus === 'pending') ? 'Collect at Hotel' : 'Total Paid'}
                    </span>
                    <span className={`font-black text-xl ${(booking.remainingAmount > 0 || booking.paymentStatus === 'pending') ? 'text-red-600' : 'text-[#004F4D]'}`}>
                        ₹{booking.remainingAmount > 0 
                            ? booking.remainingAmount.toLocaleString('en-IN') 
                            : (booking.paymentStatus === 'pending' 
                                ? booking.totalAmount?.toLocaleString('en-IN') 
                                : (booking.amountPaid?.toLocaleString('en-IN') || booking.totalAmount?.toLocaleString('en-IN')))}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/hotel/bookings/${booking._id}`); }}
                    className="flex-1 bg-[#004F4D] text-white h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform hover:bg-[#003f3d]"
                >
                    View Details
                </button>
                {booking.userId?.phone && (
                    <a
                        href={`tel:${booking.userId.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100 hover:bg-gray-100 active:scale-95 transition-transform"
                    >
                        <Phone size={14} />
                    </a>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/hotel/bookings/${booking._id}`); }}
                    className="w-9 h-9 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center border border-gray-100 hover:bg-gray-100 active:scale-95 transition-transform"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---
const PartnerBookings = () => {
    const [activeTab, setActiveTab] = useState('upcoming');
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                setLoading(true);
                // Fetch with server-side filtering
                const data = await bookingService.getPartnerBookings(activeTab);
                setBookings(data);
            } catch (error) {
                console.error('Failed to fetch partner bookings:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, [activeTab]);

    // Client-side filtering removed as backend handles it
    const filteredBookings = bookings;

    const tabs = [
        { id: 'upcoming', label: 'Upcoming' },
        { id: 'in_house', label: 'In-House' },
        { id: 'completed', label: 'History' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 font-sans pb-24">
            <PartnerHeader />

            {/* Filter Tabs */}
            <div className="sticky top-14 z-20 bg-gray-50/95 backdrop-blur-sm px-4 py-3 border-b border-gray-100/50 mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${activeTab === tab.id
                                ? 'bg-[#004F4D] text-white border-[#004F4D] shadow-sm'
                                : 'bg-white text-gray-500 border-gray-200'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Content */}
            <div className="px-4 mt-2">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#004F4D]"></div>
                    </div>
                ) : filteredBookings.length > 0 ? (
                    <div className="space-y-3 animate-fadeIn">
                        {filteredBookings.map((booking, idx) => (
                            <BookingCard key={booking._id || idx} booking={booking} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 opacity-50">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 grayscale">
                            <BedDouble size={32} className="text-white" />
                        </div>
                        <p className="font-bold text-gray-400 text-sm">No {activeTab} bookings found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PartnerBookings;
