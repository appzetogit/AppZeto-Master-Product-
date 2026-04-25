import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import paymentService from '../../services/paymentService';
import { toast } from 'react-hot-toast';

const RazorpayButton = ({
  bookingId,
  onSuccess,
  onFailure,
  buttonText = 'Pay Now',
  className = '',
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!bookingId) {
      toast.error('Booking ID is required');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Razorpay order
      const orderData = await paymentService.createOrder(bookingId);

      if (!orderData.success) {
        throw new Error(orderData.message || 'Failed to create order');
      }

      const { order, booking, razorpayKeyId } = orderData;

      // Step 2: Open Razorpay checkout
      const paymentResponse = await paymentService.openCheckout({
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Rukkoin',
        description: `Booking Payment - ${booking.bookingId}`,
        order_id: order.id,
        prefill: {
          name: '', // Can fill from user context
          email: '',
          contact: ''
        },
        theme: {
          color: '#004F4D'
        }
      });

      // Step 3: Verify payment on backend
      const verificationResponse = await paymentService.verifyPayment({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingId: booking.id
      });

      if (verificationResponse.success) {
        toast.success('Payment successful!');
        if (onSuccess) {
          onSuccess(verificationResponse);
        }
      } else {
        throw new Error('Payment verification failed');
      }

    } catch (error) {
      console.error('Payment Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Payment failed';
      toast.error(errorMessage);

      if (onFailure) {
        onFailure(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 bg-[#004F4D] text-white font-bold py-3 px-6 rounded-xl shadow-md hover:bg-[#003836] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard size={20} />
          {buttonText}
        </>
      )}
    </button>
  );
};

export default RazorpayButton;
