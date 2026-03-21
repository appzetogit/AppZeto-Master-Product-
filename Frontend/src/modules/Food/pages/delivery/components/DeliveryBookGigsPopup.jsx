import React from 'react';
import BottomPopup from "@food/components/delivery/BottomPopup";

const DeliveryBookGigsPopup = ({ isOpen, onClose, navigate }) => {
  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Book gigs to go online"
      showCloseButton={true}
      closeOnBackdropClick={true}
      maxHeight="auto"
    >
      <div className="py-4">
        {/* Gig Details Card */}
        <div className="mb-6 rounded-lg overflow-hidden shadow-sm border border-gray-200">
          {/* Header - Teal background */}
          <div className="bg-teal-100 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">g</span>
            </div>
            <span className="text-teal-700 font-semibold">Gig details</span>
          </div>
          
          {/* Body - White background */}
          <div className="bg-white px-4 py-4">
            <p className="text-gray-900 text-sm">Gig booking open in your zone</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-900 text-sm mb-6">
          Book your Gigs now to go online and start delivering orders
        </p>

        {/* Book Gigs Button */}
        <button
          onClick={() => {
            onClose();
            navigate("/delivery/gig");
          }}
          className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-4 rounded-lg transition-colors"
        >
          Book gigs
        </button>
      </div>
    </BottomPopup>
  );
};

export default DeliveryBookGigsPopup;
