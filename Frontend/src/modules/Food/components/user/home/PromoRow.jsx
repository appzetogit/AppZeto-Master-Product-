import React from 'react';
import discountPromoIcon from "@food/assets/category-icons/discount_promo.png";
import vegPromoIcon from "@food/assets/category-icons/veg_promo.png";
import pricePromoIcon from "@food/assets/category-icons/price_promo.png";
import comboPromoIcon from "@food/assets/category-icons/combo_promo.png";

export default function PromoRow({ handleVegModeChange, navigate }) {
  const promoCardsData = [
    { id: 'offers', title: "Min.", value: "40%off", subtitle: "", icon: discountPromoIcon, bgColor: "bg-[#fff0f0] border-[#ffe4e4]" },
    { id: 'pure-veg', title: "Pure", value: "Veg", subtitle: "", icon: vegPromoIcon, bgColor: "bg-[#f0fff4] border-[#d7f9e4]" },
    { id: 'under-149', title: "Under", value: "₹149", subtitle: "", icon: pricePromoIcon, bgColor: "bg-[#fffcf0] border-[#fff5cc]" },
    { id: 'combos', title: "Best", value: "Combos", subtitle: "", icon: comboPromoIcon, bgColor: "bg-[#f0f9ff] border-[#e0f2fe]" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2.5 px-4 pt-4 pb-6 bg-white overflow-hidden">
      {promoCardsData.map((promo, idx) => (
        <div 
          key={idx}
          className={`${promo.bgColor} rounded-[28px] p-3.5 flex flex-col items-center justify-between h-[150px] shadow-md border group active:scale-95 transition-all duration-300`}
          onClick={() => {
            if (promo.id === 'pure-veg') handleVegModeChange(true);
            else if (promo.id === 'offers') navigate('/food/user/offers');
          }}
        >
          <div className="flex flex-col items-center space-y-0.5">
            <span className="text-[11px] font-bold text-gray-400 leading-tight uppercase text-center tracking-wide">{promo.title}</span>
            <span className="text-base font-black text-gray-800 leading-tight text-center">{promo.value}</span>
          </div>
          <div className="w-20 h-20 flex items-center justify-center p-0 mt-1 drop-shadow-lg group-hover:scale-110 transition-transform duration-500">
            <img src={promo.icon} alt={promo.value} className="w-full h-full object-contain" />
          </div>
        </div>
      ))}
    </div>
  );
}
