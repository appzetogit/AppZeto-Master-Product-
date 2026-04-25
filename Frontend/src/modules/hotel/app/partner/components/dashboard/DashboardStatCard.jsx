
import React from 'react';

const DashboardStatCard = ({ icon: Icon, label, value, subtext, actionLabel, onAction, colorClass = "text-[#004F4D]" }) => {
  // Handle card click - navigate to respective page
  const handleCardClick = (e) => {
    // Don't trigger if clicking on the action button (let button handle its own click)
    if (e.target.closest('button')) {
      return;
    }
    if (onAction) {
      onAction();
    }
  };

  // Handle action button click - prevent card click from firing
  const handleActionClick = (e) => {
    e.stopPropagation(); // Prevent card click
    if (onAction) {
      onAction();
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full transition-all ${
        onAction ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md hover:border-[#004F4D]/20 active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-1 sm:mb-2">
        <div className={`p-1.5 sm:p-2.5 rounded-lg sm:rounded-xl bg-gray-50 text-gray-700`}>
          <Icon size={16} className={`sm:w-5 sm:h-5 ${colorClass}`} />
        </div>
        {actionLabel && (
          <button
            onClick={handleActionClick}
            className="text-[9px] sm:text-xs font-semibold text-[#004F4D] hover:underline whitespace-nowrap ml-1 z-10 relative"
          >
            {actionLabel}
          </button>
        )}
      </div>
      <div>
        <h3 className="text-base sm:text-2xl font-bold text-gray-900 leading-tight">{value}</h3>
        <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate leading-tight mt-0.5">{label}</p>

        {/* Subtext shown conditionally or very small */}
        {subtext && (
          <p className="hidden sm:block text-[9px] sm:text-xs text-green-600 font-medium mt-1 truncate">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardStatCard;
