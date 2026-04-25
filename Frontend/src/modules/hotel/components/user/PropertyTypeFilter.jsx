import React from 'react';
import {
  Building2,
  Home,
  Palmtree,
  Hotel,
  Building,
  BedDouble,
  LayoutGrid
} from 'lucide-react';

const PropertyTypeFilter = ({ selectedType, onSelectType }) => {
  const types = [
    { id: 'All', label: 'All', icon: LayoutGrid },
    { id: 'Hotel', label: 'Hotel', icon: Building2 },
    { id: 'Villa', label: 'Villa', icon: Home },
    { id: 'Resort', label: 'Resort', icon: Palmtree },
    { id: 'Homestay', label: 'Homestay', icon: Hotel },
    { id: 'Hostel', label: 'Hostel', icon: Building },
    { id: 'PG', label: 'PG', icon: BedDouble },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto px-5 py-4 no-scrollbar">
      {types.map((type) => {
        const Icon = type.icon;
        const isSelected = selectedType === type.id;

        return (
          <button
            key={type.id}
            onClick={() => onSelectType(type.id)}
            className={`
              flex flex-col items-center gap-1.5 min-w-[56px] group outline-none transition-all duration-300
            `}
          >
            <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm
              transition-all duration-300
              ${isSelected
                ? 'bg-surface text-white scale-105 shadow-md'
                : 'bg-white text-surface/60 hover:bg-gray-50'
              }
            `}>
              <Icon size={20} strokeWidth={isSelected ? 2 : 1.5} />
            </div>

            <span className={`
              text-[10px] font-medium transition-colors leading-tight
              ${isSelected ? 'text-surface font-bold' : 'text-surface/60'}
            `}>
              {type.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default PropertyTypeFilter;
