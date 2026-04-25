import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Home, Users, BedDouble, ArrowLeft, ChevronRight, X } from 'lucide-react';

const PartnerJoinPropertyType = () => {
  const navigate = useNavigate();

  const propertyTypes = [
    {
      key: 'hotel',
      label: 'Hotel',
      description: 'Multiple rooms, daily stays, front desk operations',
      badge: 'Business & Leisure',
      icon: Building2,
      route: '/hotel/join-hotel',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      key: 'resort',
      label: 'Resort',
      description: 'Destination stays with activities and experiences',
      badge: 'Vacation',
      icon: Home,
      route: '/hotel/join-resort',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      key: 'villa',
      label: 'Villa',
      description: 'Entire villa or premium holiday home',
      badge: 'Family & Groups',
      icon: Home,
      route: '/hotel/join-villa',
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      key: 'hostel',
      label: 'Hostel',
      description: 'Beds or dorms for backpackers and students',
      badge: 'Budget',
      icon: Users,
      route: '/hotel/join-hostel',
      color: 'bg-yellow-50 text-yellow-600',
    },
    {
      key: 'pg',
      label: 'PG / Co-living',
      description: 'Long-stay beds or rooms with shared facilities',
      badge: 'Long Term',
      icon: BedDouble,
      route: '/hotel/join-pg',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      key: 'homestay',
      label: 'Homestay',
      description: 'Live-with-host or family-run stays',
      badge: 'Experience',
      icon: Home,
      route: '/hotel/join-homestay',
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="font-bold text-lg text-gray-800">Select Property Type</div>
          <button onClick={() => navigate('/hotel/dashboard')} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">What keeps you busy?</h1>
          <p className="text-gray-500 text-sm">Select the type of property you want to list on Rukkoin.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {propertyTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.route)}
                className="group relative flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left active:scale-[0.98]"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {item.label}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
                    {item.description}
                  </p>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-md">
                    {item.badge}
                  </span>
                </div>

                <div className="absolute top-4 right-4 text-gray-300 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default PartnerJoinPropertyType;
