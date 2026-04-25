import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, CalendarDays, Loader2 } from 'lucide-react';
import { propertyService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';

const PartnerInventoryProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertiesByType, setPropertiesByType] = useState({});

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyService.getMy();
      const grouped = {};
      (res.properties || []).forEach(p => {
        const type = p.propertyType || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
      });
      setPropertiesByType(grouped);
    } catch (e) {
      setError(e?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleManageInventory = (property) => {
    navigate(`/hotel/inventory/${property._id}`);
  };

  const sections = Object.entries(propertiesByType);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <PartnerHeader title="Manage Inventory" subtitle="Select a property to update availability" />

      <div className="px-4 pt-4 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> My Properties
          </h2>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
            <p className="text-xs text-gray-500">Loading properties...</p>
          </div>
        )}

        {!loading && sections.length === 0 && (
          <div className="mt-8 text-center text-xs text-gray-500">
            <p>No properties found to manage.</p>
          </div>
        )}

        <div className="space-y-6">
          {sections.map(([type, list]) => (
            <div key={type} className="bg-white rounded-2xl border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                    {type.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-gray-500">{list.length} properties</p>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {list.map(property => (
                  <div key={property._id} className="px-4 py-4 flex items-center gap-4 group hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleManageInventory(property)}>
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                      {property.coverImage ? (
                        <img
                          src={property.coverImage}
                          alt={property.propertyName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-base font-bold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                            {property.propertyName}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                            <span>
                              {property.address?.city || 'Unknown City'}, {property.address?.state || ''}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-bold ${property.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            property.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-100' :
                              'bg-yellow-50 text-yellow-700 border-yellow-100'
                          }`}>
                          {property.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleManageInventory(property);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-md shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
                        >
                          <CalendarDays size={14} />
                          Manage Inventory
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerInventoryProperties;
