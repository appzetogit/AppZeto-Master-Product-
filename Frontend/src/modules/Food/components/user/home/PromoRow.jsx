import React from 'react';
import discountPromoIcon from "@food/assets/category-icons/discount_promo.png";
import vegPromoIcon from "@food/assets/category-icons/veg_promo.png";
import pricePromoIcon from "@food/assets/category-icons/price_promo.png";
import comboPromoIcon from "@food/assets/category-icons/combo_promo.png";

export default function PromoRow({ handleVegModeChange, navigate, isVegMode, toggleRef }) {
  const promoCardsData = [
    { id: 'offers', title: "MIN.", value: "40% off", icon: discountPromoIcon, color: "rose", bgColor: "bg-rose-50", borderColor: "border-rose-100", textColor: "text-rose-600" },
    { id: 'pure-veg', title: "PURE", value: "Veg", icon: vegPromoIcon, color: "emerald", bgColor: "bg-emerald-50", borderColor: "border-emerald-100", textColor: "text-emerald-600" },
    { id: 'under-250', title: "UNDER", value: "₹250", icon: pricePromoIcon, color: "amber", bgColor: "bg-amber-50", borderColor: "border-amber-100", textColor: "text-amber-600" },
    { id: 'combos', title: "BEST", value: "Combos", icon: comboPromoIcon, color: "sky", bgColor: "bg-sky-50", borderColor: "border-sky-100", textColor: "text-sky-600" },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 px-4 pt-4 pb-8 bg-white">
      {promoCardsData.map((promo, idx) => (
        <div 
          key={idx}
          ref={promo.id === 'pure-veg' ? toggleRef : null}
          className={`${promo.bgColor} ${promo.borderColor} rounded-[2rem] p-1 flex flex-col items-center h-[170px] shadow-sm border transition-all duration-300 cursor-pointer active:scale-95 group ${promo.id === 'pure-veg' && isVegMode ? 'ring-2 ring-emerald-500 bg-emerald-100' : ''}`}
          onClick={() => {
            if (promo.id === 'pure-veg') handleVegModeChange(!isVegMode);
            else if (promo.id === 'offers') navigate('/food/user/offers');
            else if (promo.id === 'under-250') navigate('/food/user/under-250');
          }}
        >
          {/* Label Section */}
          <div className="py-3 px-1 flex flex-col items-center text-center">
            <span className="text-[9px] font-black text-gray-400 tracking-[0.1em] uppercase leading-none mb-1">{promo.title}</span>
            <span className={`text-sm font-black ${promo.textColor} leading-none truncate w-full px-1`}>{promo.value}</span>
          </div>

          {/* Image Capsule Container */}
          <div className="flex-1 w-full bg-white rounded-[1.8rem] shadow-inner flex items-center justify-center p-2 mt-auto mb-1 group-hover:p-1 transition-all duration-300 overflow-hidden relative">
            <div className={`absolute inset-0 bg-gradient-to-b from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
            <img 
              src={promo.icon} 
              alt={promo.value} 
              className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-110 transition-transform duration-500" 
            />
          </div>
        </div>
      ))}
    </div>
  );
}
