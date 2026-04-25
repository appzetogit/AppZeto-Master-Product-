import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Calendar, Users, BedDouble, ChevronRight, ChevronLeft,
    Minus, Plus, Check, Sun, Moon
} from 'lucide-react';
import { bookingService, legalService } from '../../services/apiService';
import toast from 'react-hot-toast';

const BookingBottomSheet = ({ isOpen, onClose, hotelData, initialBookingData }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Dates | 2: Guests | 3: Rooms
    const [bookingData, setBookingData] = useState({
        checkIn: initialBookingData ? { fullDate: initialBookingData.checkIn, dateNum: new Date(initialBookingData.checkIn).getDate(), month: new Date(initialBookingData.checkIn).toLocaleDateString('en-US', { month: 'short' }) } : null,
        checkOut: initialBookingData ? { fullDate: initialBookingData.checkOut, dateNum: new Date(initialBookingData.checkOut).getDate(), month: new Date(initialBookingData.checkOut).toLocaleDateString('en-US', { month: 'short' }) } : null,
        adults: initialBookingData?.guests || 2,
        children: 0,
        rooms: initialBookingData?.rooms || 1
    });

    // Generate next 14 days for date selection
    const generateDates = () => {
        const dates = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            dates.push({
                date: date,
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dateNum: date.getDate(),
                month: date.toLocaleDateString('en-US', { month: 'short' }),
                fullDate: date.toISOString().split('T')[0],
                isToday: i === 0
            });
        }
        return dates;
    };

    const dates = generateDates();

    const handleDateSelect = (dateObj) => {
        if (!bookingData.checkIn || (bookingData.checkIn && bookingData.checkOut)) {
            // First selection or reset
            setBookingData({ ...bookingData, checkIn: dateObj, checkOut: null });
        } else if (bookingData.checkIn && !bookingData.checkOut) {
            // Second selection
            if (new Date(dateObj.fullDate) > new Date(bookingData.checkIn.fullDate)) {
                setBookingData({ ...bookingData, checkOut: dateObj });
            } else {
                // If selected date is before check-in, reset
                setBookingData({ ...bookingData, checkIn: dateObj, checkOut: null });
            }
        }
    };

    const isDateSelected = (dateObj) => {
        if (bookingData.checkIn?.fullDate === dateObj.fullDate) return 'checkin';
        if (bookingData.checkOut?.fullDate === dateObj.fullDate) return 'checkout';
        if (bookingData.checkIn && bookingData.checkOut) {
            const current = new Date(dateObj.fullDate);
            if (current > new Date(bookingData.checkIn.fullDate) && current < new Date(bookingData.checkOut.fullDate)) {
                return 'between';
            }
        }
        return false;
    };

    const calculateNights = () => {
        if (bookingData.checkIn && bookingData.checkOut) {
            const diff = new Date(bookingData.checkOut.fullDate) - new Date(bookingData.checkIn.fullDate);
            return Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
        return 0;
    };

    const updateCount = (field, delta) => {
        const newValue = bookingData[field] + delta;
        if (field === 'adults' && newValue >= 1 && newValue <= 10) {
            setBookingData({ ...bookingData, adults: newValue });
        } else if (field === 'children' && newValue >= 0 && newValue <= 5) {
            setBookingData({ ...bookingData, children: newValue });
        } else if (field === 'rooms' && newValue >= 1 && newValue <= 5) {
            setBookingData({ ...bookingData, rooms: newValue });
        }
    };

    const canProceed = () => {
        if (step === 1) return bookingData.checkIn && bookingData.checkOut;
        if (step === 2) return bookingData.adults >= 1;
        if (step === 3) return bookingData.rooms >= 1;
        return false;
    };

    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            // Confirm Booking
            try {
                setLoading(true);

                try {
                    const status = await legalService.getPlatformStatus();
                    if (!status.platformOpen) {
                        toast.error(status.bookingDisabledMessage || 'Bookings are temporarily disabled.');
                        setLoading(false);
                        return;
                    }
                } catch (statusError) {
                    console.error('Platform Status Error:', statusError);
                }

                const bookingPayload = {
                    hotelId: hotelData._id || hotelData.id,
                    roomId: hotelData.selectedRoomId,
                    checkIn: bookingData.checkIn.fullDate,
                    checkOut: bookingData.checkOut.fullDate,
                    guests: {
                        rooms: bookingData.rooms,
                        adults: bookingData.adults,
                        children: bookingData.children
                    },
                    totalAmount: (hotelData.price || 0) * calculateNights() * bookingData.rooms
                };

                const response = await bookingService.create(bookingPayload);

                // Extract only serializable plain data (no React elements/symbols)
                const hotelInfo = {
                    name: hotelData?.name || '',
                    price: hotelData?.price || '',
                    address: typeof hotelData?.address === 'string' ? hotelData.address : hotelData.address?.street + ", " + hotelData.address?.city || '',
                    image: hotelData?.image || '' // Use first image or thumbnail
                };

                // Navigate directly to booking confirmation with celebration
                navigate('/hotel/booking-confirmation', {
                    state: {
                        animate: true,
                        booking: {
                            ...bookingPayload,
                            id: response.booking?.bookingId,
                            status: response.booking?.status
                        },
                        hotel: hotelInfo
                    }
                });
            } catch (err) {
                console.error("Booking Error:", err);
                toast.error(err.message || "Failed to create booking");
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const resetAndClose = () => {
        setStep(1);
        setBookingData({ checkIn: null, checkOut: null, adults: 2, children: 0, rooms: 1 });
        onClose();
    };

    const steps = [
        { num: 1, label: 'Dates', icon: Calendar },
        { num: 2, label: 'Guests', icon: Users },
        { num: 3, label: 'Rooms', icon: BedDouble }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={resetAndClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.5 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 100) resetAndClose();
                        }}
                        className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-[30px] max-h-[85vh] flex flex-col shadow-2xl"
                    >
                        {/* Handle Bar */}
                        <div className="pt-3 pb-2">
                            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-4 border-b border-gray-100">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-black text-surface">Book Your Stay</h2>
                                <button onClick={resetAndClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Step Indicator */}
                            <div className="flex items-center justify-between">
                                {steps.map((s, i) => (
                                    <React.Fragment key={s.num}>
                                        <div
                                            className={`flex items-center gap-2 ${step >= s.num ? 'text-surface' : 'text-gray-300'}`}
                                            onClick={() => step > s.num && setStep(s.num)}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step === s.num
                                                ? 'bg-surface text-white scale-110'
                                                : step > s.num
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                {step > s.num ? <Check size={16} /> : s.num}
                                            </div>
                                            <span className={`text-xs font-bold hidden sm:block ${step === s.num ? 'text-surface' : 'text-gray-400'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {i < steps.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${step > s.num ? 'bg-green-400' : 'bg-gray-200'}`} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-5 py-6">
                            <AnimatePresence mode="wait">

                                {/* STEP 1: Date Selection */}
                                {step === 1 && (
                                    <motion.div
                                        key="dates"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <h3 className="text-lg font-bold text-surface mb-1">Select Dates</h3>
                                        <p className="text-sm text-gray-500 mb-4">Choose your check-in and check-out dates</p>

                                        {/* Selected Dates Display */}
                                        <div className="flex items-center gap-4 mb-6 bg-surface/5 rounded-2xl p-4">
                                            <div className="flex-1 text-center">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                                                    <Sun size={12} /> Check-in
                                                </p>
                                                <p className="font-bold text-surface">
                                                    {bookingData.checkIn
                                                        ? `${bookingData.checkIn.dateNum} ${bookingData.checkIn.month}`
                                                        : 'Select'
                                                    }
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 rounded-full bg-surface text-white flex items-center justify-center">
                                                {calculateNights() > 0 ? (
                                                    <span className="text-xs font-bold">{calculateNights()}N</span>
                                                ) : (
                                                    <ChevronRight size={20} />
                                                )}
                                            </div>
                                            <div className="flex-1 text-center">
                                                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                                                    <Moon size={12} /> Check-out
                                                </p>
                                                <p className="font-bold text-surface">
                                                    {bookingData.checkOut
                                                        ? `${bookingData.checkOut.dateNum} ${bookingData.checkOut.month}`
                                                        : 'Select'
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        {/* Date Picker Grid */}
                                        <div className="grid grid-cols-7 gap-2">
                                            {dates.map((d) => {
                                                const selected = isDateSelected(d);
                                                return (
                                                    <button
                                                        key={d.fullDate}
                                                        onClick={() => handleDateSelect(d)}
                                                        className={`py-3 rounded-xl text-center transition-all ${selected === 'checkin'
                                                            ? 'bg-surface text-white rounded-r-none'
                                                            : selected === 'checkout'
                                                                ? 'bg-surface text-white rounded-l-none'
                                                                : selected === 'between'
                                                                    ? 'bg-surface/10'
                                                                    : 'bg-gray-50 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <p className={`text-[10px] font-medium ${selected ? 'text-white/70' : 'text-gray-400'}`}>
                                                            {d.day}
                                                        </p>
                                                        <p className={`text-sm font-bold ${selected && selected !== 'between' ? 'text-white' : 'text-surface'}`}>
                                                            {d.dateNum}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <p className="text-xs text-gray-400 text-center mt-4">
                                            Tap to select check-in, then check-out
                                        </p>
                                    </motion.div>
                                )}

                                {/* STEP 2: Guest Selection */}
                                {step === 2 && (
                                    <motion.div
                                        key="guests"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <h3 className="text-lg font-bold text-surface mb-1">How many guests?</h3>
                                        <p className="text-sm text-gray-500 mb-6">Select number of adults and children</p>

                                        <div className="space-y-4">
                                            {/* Adults */}
                                            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                                                <div>
                                                    <h4 className="font-bold text-surface">Adults</h4>
                                                    <p className="text-xs text-gray-500">Age 13 or above</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => updateCount('adults', -1)}
                                                        disabled={bookingData.adults <= 1}
                                                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                                                    >
                                                        <Minus size={18} className="text-surface" />
                                                    </button>
                                                    <span className="text-xl font-black text-surface w-8 text-center">
                                                        {bookingData.adults}
                                                    </span>
                                                    <button
                                                        onClick={() => updateCount('adults', 1)}
                                                        disabled={bookingData.adults >= 10}
                                                        className="w-10 h-10 rounded-full bg-surface text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Children */}
                                            <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
                                                <div>
                                                    <h4 className="font-bold text-surface">Children</h4>
                                                    <p className="text-xs text-gray-500">Age 0-12</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => updateCount('children', -1)}
                                                        disabled={bookingData.children <= 0}
                                                        className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                                                    >
                                                        <Minus size={18} className="text-surface" />
                                                    </button>
                                                    <span className="text-xl font-black text-surface w-8 text-center">
                                                        {bookingData.children}
                                                    </span>
                                                    <button
                                                        onClick={() => updateCount('children', 1)}
                                                        disabled={bookingData.children >= 5}
                                                        className="w-10 h-10 rounded-full bg-surface text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                                            <p className="text-xs text-blue-700">
                                                💡 <strong>Tip:</strong> Children below 5 years stay free with existing bedding.
                                            </p>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: Room Selection */}
                                {step === 3 && (
                                    <motion.div
                                        key="rooms"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                    >
                                        <h3 className="text-lg font-bold text-surface mb-1">How many rooms?</h3>
                                        <p className="text-sm text-gray-500 mb-6">Select number of rooms you need</p>

                                        {/* Room Counter */}
                                        <div className="flex items-center justify-center gap-8 py-8 bg-gradient-to-br from-surface/5 to-accent/5 rounded-3xl mb-6">
                                            <button
                                                onClick={() => updateCount('rooms', -1)}
                                                disabled={bookingData.rooms <= 1}
                                                className="w-14 h-14 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all shadow-sm"
                                            >
                                                <Minus size={24} className="text-surface" />
                                            </button>
                                            <div className="text-center">
                                                <span className="text-5xl font-black text-surface">
                                                    {bookingData.rooms}
                                                </span>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    {bookingData.rooms === 1 ? 'Room' : 'Rooms'}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => updateCount('rooms', 1)}
                                                disabled={bookingData.rooms >= 5}
                                                className="w-14 h-14 rounded-full bg-surface text-white flex items-center justify-center disabled:opacity-30 active:scale-90 transition-all shadow-lg shadow-surface/30"
                                            >
                                                <Plus size={24} />
                                            </button>
                                        </div>

                                        {/* Booking Summary */}
                                        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
                                            <h4 className="font-bold text-surface text-sm">Booking Summary</h4>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Check-in</span>
                                                <span className="font-bold text-surface">
                                                    {bookingData.checkIn?.dateNum} {bookingData.checkIn?.month}, {bookingData.checkIn?.day}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Check-out</span>
                                                <span className="font-bold text-surface">
                                                    {bookingData.checkOut?.dateNum} {bookingData.checkOut?.month}, {bookingData.checkOut?.day}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Guests</span>
                                                <span className="font-bold text-surface">
                                                    {bookingData.adults} Adult{bookingData.adults > 1 ? 's' : ''}
                                                    {bookingData.children > 0 && `, ${bookingData.children} Child`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Rooms</span>
                                                <span className="font-bold text-surface">{bookingData.rooms}</span>
                                            </div>
                                            <hr className="border-gray-100" />
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Duration</span>
                                                <span className="font-bold text-surface">{calculateNights()} Night{calculateNights() > 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Footer Buttons */}
                        <div className="border-t border-gray-100 p-5 flex gap-3 bg-white">
                            {step > 1 && (
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3.5 border border-gray-200 rounded-xl font-bold text-surface hover:bg-gray-50 transition-colors flex items-center gap-1"
                                >
                                    <ChevronLeft size={18} /> Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={!canProceed() || loading}
                                className="flex-1 bg-surface text-white font-bold py-3.5 rounded-xl shadow-lg shadow-surface/30 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {step === 3 ? (
                                    loading ? "Creating..." : "Confirm Booking"
                                ) : (
                                    <>Next <ChevronRight size={18} /></>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default BookingBottomSheet;
