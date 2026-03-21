import React, { useState } from 'react';
import { Star } from "lucide-react";
import { toast } from 'sonner';
import BottomPopup from "@food/components/delivery/BottomPopup";

const DeliveryCustomerReviewPopup = ({
  isOpen,
  onClose,
  selectedRestaurant,
  newOrder,
  orderEarnings,
  setOrderEarnings,
  setShowCustomerReviewPopup,
  setShowPaymentPage,
  deliveryAPI,
  debugLog = () => {},
  debugError = () => {}
}) => {
  const [customerRating, setCustomerRating] = useState(0);
  const [customerReviewText, setCustomerReviewText] = useState("");

  const handleSubmitReview = async () => {
    // Get order ID - use MongoDB _id for API call
    const orderIdForApi = selectedRestaurant?.id || 
                        newOrder?.orderMongoId || 
                        newOrder?._id ||
                        selectedRestaurant?.orderId || 
                        newOrder?.orderId;
    
    if (orderIdForApi) {
      try {
        debugLog('?? Customer review submitted (UI only):', {
          orderId: orderIdForApi,
          rating: customerRating,
          review: customerReviewText
        });

        setShowCustomerReviewPopup(false);
        setShowPaymentPage(true);
        
        // Call completeDelivery API with rating and review
        const response = await deliveryAPI.completeDelivery(orderIdForApi, {
          rating: customerRating > 0 ? customerRating : null,
          review: customerReviewText.trim() || "",
        });
        
        if (response.data?.success) {
          const earnings = response.data.data?.earnings?.amount || 
                         response.data.data?.totalEarning ||
                         orderEarnings;
          setOrderEarnings(earnings);
          
          debugLog('? Delivery completed and earnings added to wallet:', earnings);
          
          window.dispatchEvent(new Event('deliveryWalletStateUpdated'));
          
          if (earnings > 0) {
            toast.success(`₹${earnings.toFixed(2)} added to your wallet! 🎉💰`);
          }
        } else {
          debugError('? Failed to submit review:', response.data);
          toast.error(response.data?.message || 'Failed to submit review. Please try again.');
        }
      } catch (error) {
        debugError('? Error submitting review:', error);
        toast.error('Failed to submit review. Please try again.');
        setShowCustomerReviewPopup(false);
        setShowPaymentPage(true);
      }
    } else {
      setShowCustomerReviewPopup(false);
      setShowPaymentPage(true);
    }
  };

  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
      maxHeight="80vh"
      showHandle={true}
    >
      <div className="">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Rate Your Experience
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            How was your delivery experience?
          </p>
          
          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setCustomerRating(star)}
                className="text-4xl transition-transform hover:scale-110"
              >
                {star <= customerRating ? (
                  <Star className="w-10 h-10 text-yellow-400 fill-current" />
                ) : (
                  <Star className="w-10 h-10 text-gray-300" />
                )}
              </button>
            ))}
          </div>

          {/* Optional Review Text */}
          <div className="mb-6">
            <label className="block text-left text-sm font-medium text-gray-700 mb-2">
              Review (Optional)
            </label>
            <textarea
              value={customerReviewText}
              onChange={(e) => setCustomerReviewText(e.target.value)}
              placeholder="Share your experience..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitReview}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            Submit Review
          </button>
        </div>
      </div>
    </BottomPopup>
  );
};

export default DeliveryCustomerReviewPopup;
