import React, { useState, useEffect } from 'react';
import { MapPin, Star, IndianRupee, Heart, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/apiService';
import toast from 'react-hot-toast';

const PropertyCard = ({ property, data, className = "", isSaved: initialIsSaved }) => {
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(initialIsSaved || false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Sync with initialIsSaved if it changes
  useEffect(() => {
    if (initialIsSaved !== undefined) {
      setIsSaved(initialIsSaved);
    }
  }, [initialIsSaved]);

  const item = property || data;

  if (!item) return null;

  const {
    _id,
    name,
    address,
    images,
    propertyType,
    rating,
    startingPrice,
    details
  } = item;

  const handleToggleSave = async (e) => {
    e.stopPropagation(); // Don't navigate to details
    if (!localStorage.getItem('token')) {
      toast.error("Please login to save properties");
      return;
    }

    if (saveLoading) return;

    setSaveLoading(true);
    const newState = !isSaved;
    setIsSaved(newState); // Optimistic update

    try {
      await userService.toggleSavedHotel(_id || item.id);
      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      setIsSaved(!newState); // Revert
      toast.error("Failed to update wishlist");
    } finally {
      setSaveLoading(false);
    }
  };

  // Function to clean dirty URLs (handles backticks, spaces, quotes)
  const cleanImageUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    // Remove backticks, single quotes, double quotes, and surrounding whitespace
    return url.replace(/[`'"]/g, '').trim();
  };

  const displayName = name || item.propertyName || 'Untitled';

  const typeRaw = (propertyType || item.propertyType || '').toString();
  const normalizedType = typeRaw
    ? typeRaw.toLowerCase() === 'pg'
      ? 'PG'
      : typeRaw.charAt(0).toUpperCase() + typeRaw.slice(1).toLowerCase()
    : '';
  const typeForBadge = normalizedType || typeRaw;
  const typeLabel = typeForBadge ? typeForBadge.toString().toUpperCase() : '';

  // Improved Rating Logic
  const rawRating =
    item.avgRating !== undefined ? item.avgRating :
      item.rating !== undefined ? item.rating :
        rating;

  const reviewCount = item.totalReviews || item.reviews || 0;

  // Show rating if it exists and is > 0, otherwise show 'New'
  // Or if user specifically wants to see 0.0, we can adjust. 
  // Standard is: if no reviews, show New.
  const displayRating = (Number(rawRating) > 0) ? Number(rawRating).toFixed(1) : 'New';

  // Improved Price Logic - Check more fields
  const rawPrice =
    startingPrice ??
    item.startingPrice ??
    item.minPrice ??
    item.min_price ??
    item.price ??
    item.costPerNight ??
    item.amount ??
    null;

  const displayPrice =
    typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : null;

  const imageSrc =
    images?.cover ||
    cleanImageUrl(item.coverImage) ||
    cleanImageUrl(
      Array.isArray(item.propertyImages) ? item.propertyImages[0] : ''
    ) ||
    'https://via.placeholder.com/400x300?text=No+Image';

  const badgeTypeKey = normalizedType || typeRaw;

  const getTypeColor = (type) => {
    switch (type) {
      case 'Hotel': return 'bg-blue-100 text-blue-700';
      case 'Villa': return 'bg-purple-100 text-purple-700';
      case 'Resort': return 'bg-orange-100 text-orange-700';
      case 'Homestay': return 'bg-green-100 text-green-700';
      case 'Hostel': return 'bg-pink-100 text-pink-700';
      case 'PG': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      onClick={() => navigate(`/hotel/${_id}`)}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-0 cursor-pointer active:scale-95 transition-transform duration-200 hover:shadow-md ${className}`}
    >
      <div className="relative h-40 w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        <img
          src={imageSrc}
          alt={displayName}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/400x300?text=No+Image';
          }}
        />

        {/* Wishlist Button */}
        <button
          onClick={handleToggleSave}
          className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-full shadow-sm z-20 hover:bg-white active:scale-90 transition-all"
        >
          <Heart
            size={14}
            className={`${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
          />
        </button>

        {typeLabel && (
          <div className={`absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${getTypeColor(badgeTypeKey)} shadow-sm z-10`}>
            {typeLabel}
          </div>
        )}



        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-md px-1.5 py-0.5 rounded-md flex items-center gap-1 text-[10px] font-bold text-surface shadow-sm border border-gray-100 z-10">
          <Star size={10} className="fill-honey text-honey" />
          {displayRating}
        </div>

        {item.suitability && item.suitability !== 'none' && (
          <div className="absolute bottom-2 left-2 bg-emerald-500/90 text-white px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm z-10">
            {item.suitability === 'Both' ? 'Family Friendly, Couple Friendly' : item.suitability}
          </div>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5 max-w-full overflow-hidden">
            <h3 className="font-bold text-xs text-gray-800 line-clamp-1 flex items-center gap-1">
              {displayName}
              {item.isVerified && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-black uppercase tracking-tight shadow-sm shrink-0 ml-1">
                  <CheckCircle size={8} className="fill-blue-500 text-white" />
                  Verified
                </div>
              )}
            </h3>
          </div>
        </div>

        <div className="flex items-start gap-1 text-gray-500 text-[10px] mb-2 min-h-[2em]">
          <MapPin size={12} className="mt-0.3 shrink-0" />
          <span className="leading-tight line-clamp-2">
            {(() => {
              const area = address?.area || item.area;
              const city = address?.city || item.city;
              
              if (area && area.trim()) {
                return `${area}, ${city}`;
              }
              return city || 'Location not available';
            })()}
          </span>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {item.fakePrice > 0 && (
                  <div className="flex items-center gap-0.5 text-red-500 line-through text-[11px] opacity-70">
                    <IndianRupee size={9} />
                    {item.fakePrice.toLocaleString()}
                  </div>
                )}
                {item.customUrgencyMessage && (
                  <div className="text-red-600 text-[10px] font-bold uppercase tracking-tight flex items-center gap-1 animate-pulse">
                    <span>🔥</span> {item.customUrgencyMessage}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-surface font-bold text-xs">
                <IndianRupee size={12} />
                {displayPrice ? displayPrice.toLocaleString() : 'Check Price'}
                <span className="text-[10px] text-gray-400 font-normal ml-0.5">/ night</span>
              </div>
            </div>
          </div>

          <button className="bg-surface/10 text-surface px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface hover:text-white transition-colors">
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard;
