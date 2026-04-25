import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    CheckCircle, XCircle, MapPin, Calendar, Users, FileText,
    Phone, Navigation, Share2, Home, Download, Printer, ChevronLeft, CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { bookingService, paymentService } from '../../services/apiService';

const BookingConfirmationPage = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

//rfdhfdh
    // Initialize with state if available, else null
    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(!location.state?.booking);
    const [imgError, setImgError] = useState(false);

    const animate = location.state?.animate;
    const [paymentLoading, setPaymentLoading] = useState(false);

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    useEffect(() => {
        const loadBooking = async () => {
            // If already loaded from state, just stop loading
            if (booking) {
                setLoading(false);
                return;
            }

            // If no Booking in state and no ID in URL, redirect
            if (!id && !booking) {
                navigate('/hotel');
                return;
            }

            // Fetch if ID is present but booking is missing
            try {
                setLoading(true);
                const data = await bookingService.getBookingDetail(id);
                setBooking(data);
            } catch (error) {
                console.error("Failed to load booking:", error);
                toast.error("Could not load booking details");
                navigate('/hotel');
            } finally {
                setLoading(false);
            }
        };

        loadBooking();
    }, [id, booking, navigate]);

    useEffect(() => {
        // Only show confetti for confirmed bookings (not cancelled)
        if (booking && animate) {
            const status = (booking.bookingStatus || booking.status || 'pending').toLowerCase();
            const cancelled = status === 'cancelled' || status === 'no_show' || status === 'rejected';
            
            if (!cancelled) {
                const end = Date.now() + 3000;
                const colors = ['#10B981', '#3B82F6', '#F59E0B'];

                (function frame() {
                    confetti({
                        particleCount: 3,
                        angle: 60,
                        spread: 55,
                        origin: { x: 0 },
                        colors: colors
                    });
                    confetti({
                        particleCount: 3,
                        angle: 120,
                        spread: 55,
                        origin: { x: 1 },
                        colors: colors
                    });

                    if (Date.now() < end) {
                        requestAnimationFrame(frame);
                    }
                }());
            }
        }
    }, [booking, animate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading Booking...</p>
                </div>
            </div>
        );
    }

    if (!booking) return null;

    // Derived Data Safe Access
    const property = booking.propertyId || {};
    const room = booking.roomTypeId || {};
    const user = booking.userId || {};

    // Determine booking status for conditional rendering
    const bookingStatus = (booking.bookingStatus || booking.status || 'pending').toLowerCase();
    const isCancelled = bookingStatus === 'cancelled' || bookingStatus === 'no_show' || bookingStatus === 'rejected';
    const isConfirmed = bookingStatus === 'confirmed' || bookingStatus === 'pending' || bookingStatus === 'awaiting_payment';

    const handleDirections = () => {
        const propAddress = property.address?.fullAddress ||
            `${property.address?.street || ''}, ${property.address?.city || ''}, ${property.address?.state || ''}` ||
            property.address;

        if (property.location?.coordinates && property.location.coordinates.length === 2) {
            const [lng, lat] = property.location.coordinates;
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
            return;
        }

        if (propAddress) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(propAddress)}`, '_blank');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleOnlinePayment = async () => {
        try {
            setPaymentLoading(true);
            
            // 1. Load Razorpay SDK
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                toast.error("Razorpay SDK failed to load. Please check your internet connection.");
                return;
            }

            // 2. Create Razorpay Order
            const response = await paymentService.createOrder(booking._id);
            if (!response.success) {
                throw new Error(response.message || "Failed to create payment order");
            }

            const { order, razorpayKeyId } = response;

            // 3. Open Razorpay Checkout
            const options = {
                key: razorpayKeyId,
                amount: order.amount,
                currency: order.currency,
                name: "Rukkoo.in",
                description: `Settle Payment for Booking #${booking.bookingId}`,
                order_id: order.id,
                handler: async function (razorpayResponse) {
                    try {
                        setPaymentLoading(true);
                        const verifyPayload = {
                            razorpay_order_id: razorpayResponse.razorpay_order_id,
                            razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                            razorpay_signature: razorpayResponse.razorpay_signature,
                            bookingId: booking._id
                        };

                        const verifyRes = await paymentService.verifyPayment(verifyPayload);
                        if (verifyRes.success) {
                            toast.success("Payment successful! Your booking is now fully paid.");
                            // Update local booking state instead of full reload to maintain animations/context
                            setBooking(verifyRes.booking);
                        } else {
                            toast.error("Payment verification failed. Please contact support.");
                        }
                    } catch (err) {
                        console.error("Payment Verification Error:", err);
                        toast.error(err.message || "Payment verification failed.");
                    } finally {
                        setPaymentLoading(false);
                    }
                },
                prefill: {
                    name: user.name || '',
                    email: user.email || '',
                    contact: user.phone || ''
                },
                notes: {
                    bookingId: booking._id
                },
                theme: { color: "#000000" },
                modal: {
                    ondismiss: function() {
                        setPaymentLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error) {
            console.error("Payment Error:", error);
            toast.error(error.message || "Failed to initiate payment");
            setPaymentLoading(false);
        }
    };

    // Single contact number: property (partner-entered) first, else partner account phone
    const contactPhone = (property.contactNumber || property.partnerId?.phone || '').replace(/\D/g, '') || null;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 print:hidden">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors font-medium">
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg font-bold text-gray-900">
                        {isCancelled ? 'Booking Details' : 'Booking Confirmation'}
                    </h1>
                    <button onClick={handlePrint} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                        <Printer size={20} />
                    </button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* 1. Status Message */}
                <div className={`bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 relative overflow-hidden ${isCancelled ? 'border-red-100' : ''}`}>
                    {isCancelled ? (
                        <>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600"></div>
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <XCircle size={40} className="text-red-600" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Booking Cancelled!</h1>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Your reservation ID is <span className="font-mono font-bold text-gray-800">#{booking.bookingId || booking._id?.slice(-8).toUpperCase()}</span>.
                                {booking.cancellationReason && (
                                    <span className="block mt-2 text-sm text-gray-600">
                                        Reason: <span className="font-medium">{booking.cancellationReason}</span>
                                    </span>
                                )}
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600"></div>
                            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle size={40} className="text-green-600" />
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">Booking Confirmed!</h1>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Your reservation ID is <span className="font-mono font-bold text-gray-800">#{booking.bookingId || booking._id?.slice(-8).toUpperCase()}</span>.
                                We've sent a confirmation email to <span className="font-medium text-gray-800">{user.email}</span>.
                            </p>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Left Col: Property & Actions */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Property Card */}
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-5">
                                <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-2xl overflow-hidden shrink-0">
                                    <img
                                        src={!imgError ? (property.propertyImages?.[0] || property.images?.[0]?.url || property.images?.[0] || property.coverImage || property.propertyId?.coverImage || "https://via.placeholder.com/150") : "https://via.placeholder.com/150"}
                                        alt={property.propertyName || property.name || "Property"}
                                        className="w-full h-full object-cover"
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{property.propertyType || 'Hotel'}</span>
                                            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-2">{property.name || property.propertyName || 'Property Name'}</h2>
                                            <div className="flex items-start gap-1 text-gray-500 text-sm mb-4">
                                                <MapPin size={16} className="mt-0.5 shrink-0" />
                                                <p>{property.address?.fullAddress || property.address?.street || property.address?.city || property.address}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 print:hidden">
                                        <button
                                            onClick={handleDirections}
                                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Navigation size={14} /> Directions
                                        </button>
                                        {contactPhone ? (
                                            <a
                                                href={`tel:${contactPhone}`}
                                                className="flex-1 border border-gray-200 hover:border-black text-gray-700 hover:text-black text-xs font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 no-underline"
                                            >
                                                <Phone size={14} /> Contact Property
                                            </a>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled
                                                className="flex-1 border border-gray-100 text-gray-400 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                                            >
                                                <Phone size={14} /> Number not available
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Booking Details */}
                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
                                <FileText size={18} className="text-gray-400" />
                                Reservation Details
                            </h3>
                            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-in</p>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {new Date(booking.checkInDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                    </p>
                                    <p className="text-xs text-gray-500">{property.checkInTime || '12:00 PM'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-out</p>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {new Date(booking.checkOutDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                    </p>
                                    <p className="text-xs text-gray-500">{property.checkOutTime || '11:00 AM'}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Total Nights</p>
                                    <p className="font-semibold text-gray-900">{booking.totalNights} Night(s)</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Room Type</p>
                                    <p className="font-semibold text-gray-900">{room.name || room.type || booking.roomType || 'Standard Room'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Guests</p>
                                    <p className="font-semibold text-gray-900">{booking.guests?.adults || 1} Adults, {booking.guests?.children || 0} Children</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold mb-1">Booking Unit</p>
                                    <p className="font-semibold text-gray-900 capitalize">{booking.bookingUnit}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Col: Price & Payment */}
                    <div className="space-y-6">

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit">
                            <h3 className="font-bold text-gray-900 mb-5">Payment Summary</h3>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Base Price</span>
                                    <span>₹{booking.baseAmount?.toLocaleString()}</span>
                                </div>
                                {(booking.extraCharges > 0) && (
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Extra Charges</span>
                                        <span>₹{booking.extraCharges?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Taxes & Fees</span>
                                    <span>₹{booking.taxes?.toLocaleString()}</span>
                                </div>
                                {(booking.discount > 0) && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Discount</span>
                                        <span>-₹{booking.discount?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="border-t border-gray-100 pt-3 flex justify-between items-center bg-gray-50 -mx-6 px-6 py-4 mt-4">
                                    <span className="font-bold text-gray-900">Total Amount</span>
                                    <span className="text-xl font-black text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                                </div>
                                {(booking.paymentMethod === 'prepaid' && booking.remainingAmount > 0) && (
                                    <div className="bg-orange-50 -mx-6 px-6 py-3 border-b border-orange-100 flex flex-col gap-1">
                                        <div className="flex justify-between text-sm text-gray-700">
                                            <span>Advance Paid Now</span>
                                            <span className="font-bold">₹{booking.amountPaid?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm text-orange-700 font-bold">
                                            <span>To Pay at Hotel</span>
                                            <span>₹{booking.remainingAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`p-4 rounded-xl flex items-center gap-3 ${booking.paymentStatus === 'paid' ? 'bg-green-50' : booking.paymentStatus === 'partial' ? 'bg-orange-50' : 'bg-yellow-50'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-600' : booking.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {booking.paymentStatus === 'paid' ? <CheckCircle size={20} /> : <FileText size={20} />}
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase text-gray-500">Payment Status</p>
                                    <p className={`font-bold ${booking.paymentStatus === 'paid' ? 'text-green-700' : booking.paymentStatus === 'partial' ? 'text-orange-700' : 'text-yellow-700'}`}>
                                        {booking.paymentStatus === 'paid' ? 'Paid Completely' : booking.paymentStatus === 'partial' ? 'Partially Paid (Prepaid)' : 'Pay at Hotel'}
                                    </p>
                                </div>
                            </div>
                            {(booking.paymentStatus === 'pending' && !isCancelled && bookingStatus === 'confirmed') && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={handleOnlinePayment}
                                        disabled={paymentLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70"
                                    >
                                        {paymentLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <CreditCard size={18} />
                                        )}
                                        {paymentLoading ? 'Processing...' : 'Pay Online Now'}
                                    </button>
                                    <p className="text-[10px] text-gray-400 text-center mt-2 px-4 italic">
                                        Avoid check-in hassles by paying online securely now.
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => navigate('/bookings')}
                            className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-2 print:hidden"
                        >
                            My Bookings
                        </button>

                        {/* Cancel Booking Option */}
                        {(() => {
                            // Industry Standard: Check if cancellation is allowed (at least 24 hours before check-in time)
                            const now = new Date();
                            const checkInDate = new Date(booking.checkInDate);
                            
                            // Get check-in time from property (default to 12:00 PM if not available)
                            const checkInTime = property?.checkInTime || '12:00 PM';
                            
                            // Parse check-in time
                            let hours = 12; // Default to 12 PM
                            let minutes = 0;
                            const timeStr = checkInTime.trim().toUpperCase();
                            const isPM = timeStr.includes('PM');
                            const timeMatch = timeStr.match(/(\d+):(\d+)/);
                            
                            if (timeMatch) {
                                hours = parseInt(timeMatch[1], 10);
                                minutes = parseInt(timeMatch[2], 10);
                                if (isPM && hours !== 12) {
                                    hours += 12;
                                } else if (!isPM && hours === 12) {
                                    hours = 0;
                                }
                            }
                            
                            // Set check-in date and time
                            const checkInDateTime = new Date(checkInDate);
                            checkInDateTime.setHours(hours, minutes, 0, 0);
                            
                            // Calculate difference in milliseconds
                            const diffMs = checkInDateTime.getTime() - now.getTime();
                            const diffHours = diffMs / (1000 * 60 * 60);
                            
                            // Allow cancellation only if at least 24 hours before check-in
                            const isCancellableTime = diffHours >= 24;
                            const isActive = ['confirmed', 'pending'].includes(booking.bookingStatus);
                            
                            // Calculate remaining hours for display
                            const hoursRemaining = Math.max(0, Math.ceil(diffHours));

                            if (!isActive) return null;

                            return (
                                <>
                                    {isCancellableTime ? (
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                                    try {
                                                        const loadToast = toast.loading('Cancelling booking...');
                                                        const idToCancel = booking._id || booking.id;
                                                        const response = await bookingService.cancel(idToCancel);
                                                        toast.dismiss(loadToast);
                                                        
                                                        // Show detailed success message
                                                        let successMsg = 'Booking cancelled successfully';
                                                        if (response.refundProcessed && response.refundAmount > 0) {
                                                            successMsg += `. Refund of ₹${Number(response.refundAmount).toLocaleString()} will be processed.`;
                                                        } else if (response.refundAmount > 0) {
                                                            successMsg += `. Refund of ₹${Number(response.refundAmount).toLocaleString()} credited to your wallet.`;
                                                        }
                                                        toast.success(successMsg);
                                                        navigate('/bookings');
                                                    } catch (error) {
                                                        toast.dismiss();
                                                        const errorMsg = error.response?.data?.message || 'Failed to cancel booking';
                                                        toast.error(errorMsg);
                                                        
                                                        // If it's a policy violation, show specific message
                                                        if (error.response?.data?.code === 'CANCELLATION_POLICY_VIOLATION') {
                                                            const hoursRemaining = error.response?.data?.hoursRemaining || 0;
                                                            setTimeout(() => {
                                                                toast.error(`Cancellation is only allowed at least 24 hours before check-in. Check-in is in ${hoursRemaining} hours.`, { duration: 5000 });
                                                            }, 500);
                                                        }
                                                    }
                                                }
                                            }}
                                            className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-2xl shadow-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-2 mt-4 print:hidden"
                                        >
                                            Cancel Booking
                                        </button>
                                    ) : (
                                        <div className="w-full bg-gray-50 border border-gray-200 text-gray-400 font-bold py-4 rounded-2xl text-center mt-4 text-xs print:hidden">
                                            Cancellation unavailable (Policy: Must cancel at least 24 hours before check-in. Check-in is in {hoursRemaining} hours)
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default BookingConfirmationPage;
