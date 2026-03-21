import React from 'react';
import { HelpCircle, ArrowRight } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

const DeliveryHelpOptionsPopup = ({ isOpen, onClose, helpOptions, onOptionClick }) => {
  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      title="How can we help?"
      showCloseButton={true}
      closeOnBackdropClick={true}
      maxHeight="70vh"
    >
      <div className="py-2">
        {helpOptions && helpOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onOptionClick(option)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            {/* Icon */}
            <div className="shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              {option.icon === "helpCenter" && (
                <HelpCircle className="w-6 h-6 text-gray-700" />
              )}
              {option.icon === "ticket" && (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              )}
              {option.icon === "idCard" && (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              )}
              {option.icon === "language" && (
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 text-left">
              <h3 className="text-base font-semibold text-gray-900 mb-1">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.subtitle}</p>
            </div>

            {/* Arrow Icon */}
            <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
          </button>
        ))}
      </div>
    </BottomPopup>
  );
};

export default DeliveryHelpOptionsPopup;
