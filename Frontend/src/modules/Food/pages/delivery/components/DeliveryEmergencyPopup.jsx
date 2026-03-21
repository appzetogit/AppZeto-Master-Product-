import React from 'react';
import { Phone, ArrowRight } from "lucide-react";
import BottomPopup from "@food/components/delivery/BottomPopup";

const DeliveryEmergencyPopup = ({ isOpen, onClose, emergencyOptions, onOptionClick }) => {
  return (
    <BottomPopup
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency help"
      showCloseButton={true}
      closeOnBackdropClick={true}
      maxHeight="70vh"
    >
      <div className="py-2">
        {emergencyOptions && emergencyOptions.map((option, index) => (
          <button
            key={option.id}
            onClick={() => onOptionClick(option)}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            {/* Icon */}
            <div className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center">
              {option.icon === "ambulance" && (
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200 relative overflow-hidden">
                  {/* Ambulance vehicle */}
                  <div className="absolute inset-0 bg-blue-500"></div>
                  {/* Red and blue lights on roof */}
                  <div className="absolute top-1 left-2 w-2 h-3 bg-red-500 rounded-sm"></div>
                  <div className="absolute top-1 right-2 w-2 h-3 bg-blue-500 rounded-sm"></div>
                  {/* Star of Life emblem */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10l10 5 10-5V7l-10-5zm0 2.18l8 4v7.64l-8 4-8-4V8.18l8-4z" />
                      <path d="M12 8L6 11v6l6 3 6-3v-6l-6-3z" />
                    </svg>
                  </div>
                  {/* AMBULANCE text */}
                  <div className="absolute bottom-1 left-0 right-0 text-[6px] font-bold text-white text-center">AMBULANCE</div>
                </div>
              )}
              {option.icon === "siren" && (
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200 relative">
                  {/* Red siren dome */}
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center relative">
                    {/* Yellow light rays */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 border-2 border-yellow-400 rounded-full animate-pulse"></div>
                    </div>
                    {/* Phone icon inside */}
                    <Phone className="w-5 h-5 text-yellow-400 z-10" />
                  </div>
                </div>
              )}
              {option.icon === "police" && (
                <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-200">
                  {/* Police officer bust */}
                  <div className="relative">
                    {/* Head */}
                    <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                    {/* Cap */}
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 bg-amber-700 rounded-t-lg"></div>
                    {/* Cap peak */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-10 h-1 bg-amber-800"></div>
                    {/* Mustache */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-2 bg-gray-800 rounded-full"></div>
                  </div>
                </div>
              )}
              {option.icon === "insurance" && (
                <div className="w-14 h-14 bg-yellow-400 rounded-lg flex items-center justify-center shadow-sm border border-gray-200 relative">
                  {/* Card shape */}
                  <div className="w-12 h-8 bg-white rounded-sm relative">
                    {/* Red heart and cross on left */}
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                      </svg>
                      <div className="w-0.5 h-3 bg-red-500"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Text Content */}
            <div className="flex-1 text-left">
              <h3 className="text-base font-semibold text-gray-900 mb-1">{option.title}</h3>
              <p className="text-sm text-gray-600">{option.subtitle}</p>
            </div>

            {/* Arrow Icon */}
            <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        ))}
      </div>
    </BottomPopup>
  );
};

export default DeliveryEmergencyPopup;
