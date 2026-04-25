import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Tag, TrendingDown, Loader2 } from 'lucide-react';
import RazorpayButton from '../../components/payment/RazorpayButton';
import { toast } from 'react-hot-toast';
import { bookingService } from '../../services/apiService';

const PaymentPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const [selectedMethod, setSelectedMethod] = useState('razorpay');
    const [booking, setBooking] = useState(location.state?.booking || null);
    const [loading, setLoading] = useState(!location.state?.booking);

    // Get booking data from state
    const bookingId = booking?.bookingId || booking?._id;
    const pricing = booking?.pricing || {
        baseAmount: booking?.baseAmount || 0,
        discountAmount: booking?.discount || 0,
        userPayableAmount: booking?.totalAmount || 0,
    };

    // Debug logging
    console.log('PaymentPage - Location state:', location.state);
    console.log('PaymentPage - Booking:', booking);
    console.log('PaymentPage - Booking ID:', bookingId);
    console.log('PaymentPage - Pricing:', pricing);

    useEffect(() => {
        const fetchBooking = async () => {
            if (booking) return;

            if (!id) {
                toast.error('No booking found. Please create a booking first.');
                navigate('/hotel');
                return;
            }

            try {
                setLoading(true);
                const data = await bookingService.getBookingDetail(id);
                if (data.paymentStatus === 'paid') {
                    toast.success('This booking is already paid!');
                    navigate(`/hotel/booking/${id}`);
                    return;
                }
                setBooking(data);
            } catch (error) {
                console.error("Failed to load booking:", error);
                toast.error("Could not load booking details");
                navigate('/hotel');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [id, booking, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#004F4D]" />
                    <p className="text-gray-500 font-medium">Loading details...</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    const handlePaymentSuccess = (response) => {
        console.log('Payment successful:', response);
        navigate('/hotel/booking-confirmation', {
            state: {
                paid: true,
                booking: response.booking,
                animate: true
            }
        });
    };

    const handlePaymentFailure = (error) => {
        console.error('Payment failed:', error);
        // Stay on payment page for retry
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} className="text-surface" />
                </button>
                <h1 className="text-lg font-bold text-surface">Payment Checkout</h1>
            </div>

            <div className="p-5 max-w-lg mx-auto space-y-6">

                {/* Pricing Breakdown Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-surface mb-4 flex items-center gap-2">
                        <Tag size={18} />
                        Price Breakdown
                    </h3>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Base Amount</span>
                            <span className="font-bold text-surface">₹{pricing.baseAmount?.toLocaleString('en-IN')}</span>
                        </div>

                        {pricing.discountAmount > 0 && (
                            <div className="flex justify-between items-center text-green-600">
                                <span className="text-sm flex items-center gap-1">
                                    <TrendingDown size={14} />
                                    Coupon Discount
                                </span>
                                <span className="font-bold">-₹{pricing.discountAmount?.toLocaleString('en-IN')}</span>
                            </div>
                        )}

                        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                            <span className="font-bold text-surface">Total Amount</span>
                            <span className="text-2xl font-black text-surface">₹{pricing.userPayableAmount?.toLocaleString('en-IN')}</span>
                        </div>

                        {pricing.discountAmount > 0 && (
                            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                <p className="text-xs text-green-700 font-medium">
                                    🎉 You saved ₹{pricing.discountAmount?.toLocaleString('en-IN')} with this coupon!
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Amount Summary */}
                <div className="bg-surface text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-sm text-white/70 font-medium">Total Amount to Pay</p>
                        <h2 className="text-4xl font-black mt-1">₹{pricing.userPayableAmount?.toLocaleString('en-IN')}</h2>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1 rounded-lg">
                            <ShieldCheck size={14} /> Secure Payment via Razorpay
                        </div>
                    </div>
                    {/* Decor */}
                    <div className="absolute -right-5 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </div>

                {/* Payment Method */}
                <div>
                    <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-3 ml-1">Payment Gateway</h3>

                    <div className="space-y-3">
                        {/* Razorpay */}
                        <div
                            onClick={() => setSelectedMethod('razorpay')}
                            className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${selectedMethod === 'razorpay' ? 'border-surface bg-surface/5 ring-1 ring-surface' : 'border-gray-200 bg-white'}`}
                        >
                            <div className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center">
                                <CreditCard size={20} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-surface">Razorpay</h4>
                                <p className="text-xs text-gray-400">UPI, Cards, Net Banking & More</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMethod === 'razorpay' ? 'border-surface' : 'border-gray-300'}`}>
                                {selectedMethod === 'razorpay' && <div className="w-3 h-3 bg-surface rounded-full" />}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Secure Footer */}
                <div className="text-center">
                    <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                        <ShieldCheck size={12} />
                        Your payment details are encrypted and secure
                    </p>
                </div>

            </div>

            {/* Bottom Bar with Razorpay Button */}
            <div className="fixed bottom-0 left-0 w-full bg-white p-4 border-t border-gray-200 shadow-xl">
                <RazorpayButton
                    bookingId={booking?._id || bookingId}
                    amount={pricing.userPayableAmount}
                    onSuccess={handlePaymentSuccess}
                    onFailure={handlePaymentFailure}
                    buttonText={`Pay ₹${pricing.userPayableAmount?.toLocaleString('en-IN')}`}
                    className="w-full"
                />
            </div>
        </div>
    );
};

export default PaymentPage;
