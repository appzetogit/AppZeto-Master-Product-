import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService, legalService, reviewService, offerService, availabilityService, userService } from '../../services/apiService';
import {
  MapPin, Star, Share2, Heart, ArrowLeft,
  Users, Calendar, Loader2, ChevronLeft, ChevronRight, MessageSquare, Tag, X, Gift,
  CheckCircle, Shield, Info, Clock, Wifi, Coffee, Car
} from 'lucide-react';
import toast from 'react-hot-toast';
import ModernDatePicker from '../../components/ui/ModernDatePicker';

const PropertyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [taxRate, setTaxRate] = useState(0); // Fetched from backend
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  // Check Availability Logic
  const checkAvailability = async (directCall = false) => {
    if (!dates.checkIn || !dates.checkOut || !selectedRoom) {
      if (directCall) {
        toast.error("Please select dates and room first");
      }
      setAvailability(null);
      return null;
    }

    setCheckingAvailability(true);
    try {
      const response = await availabilityService.check({
        propertyId: id,
        roomTypeId: selectedRoom._id,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        rooms: guests.rooms
      });

      let result = null;

      // Handle array response from backend
      if (Array.isArray(response)) {
        // Ensure ID comparison handles string/object ID types safely
        const roomAvail = response.find(r => String(r.roomTypeId) === String(selectedRoom._id));
        if (roomAvail) {
          const requiredUnits = guests.rooms || 1;
          if (roomAvail.availableUnits >= requiredUnits) {
            result = { available: true, unitsLeft: roomAvail.availableUnits };
          } else {
            result = { available: false, message: `Only ${roomAvail.availableUnits} units available`, unitsLeft: roomAvail.availableUnits };
          }
        } else {
          result = { available: false, message: "Sold Out for these dates", unitsLeft: 0 };
        }
      } else {
        result = response;
      }

      setAvailability(result);
      return result;
    } catch (error) {
      console.error("Availability check failed:", error);
      const errorResult = { available: false, message: error.message || "Unable to verify availability" };
      setAvailability(errorResult);
      return errorResult;
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Automatic availability check on date or room selection changes
  useEffect(() => {
    checkAvailability();
  }, [dates.checkIn, dates.checkOut, selectedRoom?._id, guests.rooms]);

  // Reviews State
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  // Offers State
  const [offers, setOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);

  const [isSaved, setIsSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const getHotelAuthToken = () => (
    localStorage.getItem('token') ||
    localStorage.getItem('user_accessToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('auth_customer')
  );

  // Lock Body Scroll when Modal Open
  useEffect(() => {
    if (showOffersModal || showImageModal) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showOffersModal, showImageModal]);

  useEffect(() => {
    legalService.getFinancialSettings()
      .then(res => {
        if (res.success) setTaxRate(res.taxRate || 0);
      })
      .catch(err => console.error("Failed to fetch tax rate", err));
  }, []);

  const loadPropertyDetails = async () => {
    try {
      const response = await propertyService.getDetails(id);
      if (response && response.property) {
        const p = response.property;
        const rts = response.roomTypes || [];
        const adapted = {
          ...p,
          _id: p._id,
          name: p.propertyName,
          description: p.shortDescription || p.description,
          address: p.address,
          avgRating: p.avgRating || 0,
          images: { cover: p.coverImage, gallery: p.propertyImages || [] },
          propertyType: p.propertyType ? p.propertyType.charAt(0).toUpperCase() + p.propertyType.slice(1) : '',
          amenities: p.amenities || [],
          inventory: rts.map(rt => ({
            _id: rt._id,
            type: rt.name,
            price: rt.pricePerNight,
            description: rt.description || '',
            amenities: rt.amenities || [],
            maxAdults: rt.maxAdults,
            maxChildren: rt.maxChildren,
            baseAdults: rt.baseAdults ?? 2,
            baseChildren: rt.baseChildren ?? 0,
            images: rt.images || [],
            pricing: { basePrice: rt.pricePerNight, extraAdultPrice: rt.extraAdultPrice, extraChildPrice: rt.extraChildPrice },
            inventoryType: rt.inventoryType || (['Hostel', 'PG'].includes(p.propertyType) ? 'bed' : 'room'),
            totalInventory: rt.totalInventory,
            bedsPerRoom: rt.bedsPerRoom
          })),
          policies: {
            checkInTime: p.checkInTime,
            checkOutTime: p.checkOutTime,
            cancellationPolicy: p.cancellationPolicy,
            houseRules: p.houseRules,
            petsAllowed: p.petsAllowed,
            suitability: p.suitability
          },
          config: {
            pgType: p.pgType,
            resortType: p.resortType,
            foodType: p.foodType,
            hotelCategory: p.hotelCategory,
            starRating: p.starRating
          },
          fakePrice: p.fakePrice || 0
        };
        setProperty(adapted);

        // Auto-select room for 'Whole Unit' properties (Villa, etc.) 
        // because the selection UI is hidden for them.
        const isWholeUnitType = p.propertyType === 'villa' || (['homestay', 'apartment'].includes(p.propertyType) && rts.length === 1);
        if (isWholeUnitType && adapted.inventory && adapted.inventory.length > 0) {
          setSelectedRoom(adapted.inventory[0]);
        }
      } else {
        setProperty(response);
      }
    } catch (error) {
      console.error("Error fetching property details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPropertyDetails();
  }, [id]);

  // Helper derived state for hooks (safe access)
  const propertyType = property?.propertyType;
  const isBedBased = ['Hostel', 'PG'].includes(propertyType);

  // Update guests when rooms change to ensure valid state
  useEffect(() => {
    if (isBedBased) {
      setGuests(prev => ({ ...prev, adults: prev.rooms, children: 0 }));
    }
  }, [guests.rooms, isBedBased]);

  useEffect(() => {
    if (id) {
      fetchReviews();
      fetchOffers();
    }
  }, [id]);

  const fetchOffers = async () => {
    try {
      const data = await offerService.getActive();
      setOffers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch offers");
    }
  };

  useEffect(() => {
    if (getHotelAuthToken()) {
      userService.getSavedHotels()
        .then(res => {
          const list = res.data || res.savedHotels || [];
          if (Array.isArray(list)) {
            // Check if current ID exists in the list (handles populated objects or raw IDs)
            const found = list.some(h => (typeof h === 'object' ? h._id : h) === id);
            setIsSaved(found);
          }
        })
        .catch(err => console.error("Failed to fetch saved status", err));
    }
  }, [id]);

  const handleToggleSave = async () => {
    if (!getHotelAuthToken()) {
      toast.error("Please login to save properties");
      // Optional: navigate to login
      return;
    }
    try {
      // Optimistic update
      const newState = !isSaved;
      setIsSaved(newState);

      await userService.toggleSavedHotel(id);

      toast.success(newState ? "Added to wishlist" : "Removed from wishlist");
    } catch (err) {
      // Revert on error
      setIsSaved(!isSaved);
      toast.error("Failed to update wishlist");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: property?.name || 'Rukkoo Stay',
      text: `Check out ${property?.name || 'this amazing place'} on Rukkoo!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const fetchReviews = async () => {
    try {
      const data = await reviewService.getPropertyReviews(id);
      setReviews(data);
    } catch (error) {
      console.error("Failed to fetch reviews");
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!getHotelAuthToken()) {
      toast.error('Please login to submit a review');
      return;
    }
    setSubmitReviewLoading(true);
    try {
      await reviewService.createReview({
        propertyId: id,
        ...reviewData
      });
      toast.success('Review submitted!');
      setReviewData({ rating: 5, comment: '' });
      setShowReviewForm(false);
      fetchReviews();
      loadPropertyDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to submit review');
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedRoom]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-surface" size={40} /></div>;
  if (!property) return <div className="h-screen flex items-center justify-center">Property not found</div>;

  const {
    _id, name, address, images, description, avgRating: rating,
    inventory, amenities, policies, config
  } = property;

  const hasInventory = inventory && inventory.length > 0;
  // Treated as Whole Unit if it's a Villa OR (Homestay/Apartment with NO separate inventory units)
  const isWholeUnit = propertyType === 'Villa' || (['Homestay', 'Apartment'].includes(propertyType) && !hasInventory);

  const getNightBreakup = (room) => {
    if (!room || !room.pricing) {
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: getRoomPrice(room) };
    }
    const { basePrice, weekendPrice } = room.pricing;
    if (!dates.checkIn || !dates.checkOut) {
      const base = typeof basePrice === 'number' ? basePrice : (typeof weekendPrice === 'number' ? weekendPrice : getRoomPrice(room));
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    }
    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    if (isNaN(start) || isNaN(end) || end <= start) {
      const base = typeof basePrice === 'number' ? basePrice : (typeof weekendPrice === 'number' ? weekendPrice : getRoomPrice(room));
      return { nights: 0, weekdayNights: 0, weekendNights: 0, perNight: base };
    }
    let current = new Date(start);
    let nights = 0;
    let weekdayNights = 0;
    let weekendNights = 0;
    let total = 0;
    while (current < end) {
      const day = current.getDay();
      const isWeekendDay = day === 5 || day === 6;
      const dayPrice = isWeekendDay && typeof weekendPrice === 'number' ? weekendPrice : (typeof basePrice === 'number' ? basePrice : getRoomPrice(room));
      total += dayPrice;
      nights += 1;
      if (isWeekendDay) weekendNights += 1;
      else weekdayNights += 1;
      current.setDate(current.getDate() + 1);
    }
    const perNight = nights > 0 ? Math.round(total / nights) : getRoomPrice(room);
    return { nights, weekdayNights, weekendNights, perNight };
  };

  const getRoomPrice = (room) => {
    if (!room) return null;
    if (room.pricing) {
      if (typeof room.pricing.basePrice === 'number') return room.pricing.basePrice;
      if (typeof room.pricing.weekendPrice === 'number') return room.pricing.weekendPrice;
    }
    return room.price || null;
  };

  const getExtraPricingLabels = (room) => {
    if (!room || !room.pricing) return [];
    const labels = [];
    if (typeof room.pricing.extraAdultPrice === 'number') {
      labels.push(`Extra adult: ₹${room.pricing.extraAdultPrice} / night`);
    }
    if (typeof room.pricing.extraChildPrice === 'number') {
      labels.push(`Extra child: ₹${room.pricing.extraChildPrice} / night`);
    }
    return labels;
  };

  const getMaxAdults = () => {
    // If a specific room/unit is selected (which contains the limits), use it
    if (selectedRoom) {
      // Multiply by number of units/rooms selected if applicable
      // But for 'Entire Villa' (inventoryType='entire'), usually quantity is 1 which is guests.rooms
      return (selectedRoom.maxAdults ?? 12) * (isWholeUnit ? 1 : guests.rooms);
    }

    if (isWholeUnit) return property.structure?.maxGuests || property.maxGuests || 12;
    if (isBedBased) return guests.rooms; // 1 person per bed

    if (propertyType === 'Resort') return guests.rooms * 4;
    return guests.rooms * 3;
  };

  const getMaxChildren = () => {
    if (selectedRoom) {
      if (selectedRoom.maxChildren !== undefined) {
        return selectedRoom.maxChildren * (isWholeUnit ? 1 : guests.rooms);
      }
    }

    if (isBedBased) return 0;
    if (isWholeUnit) return 6;

    return guests.rooms * 2;
  };

  const getUnitLabel = () => {
    if (isBedBased) return 'Beds';
    if (propertyType === 'Homestay' || propertyType === 'Villa') return 'Units';
    return 'Rooms';
  };

  const getGalleryImages = () => {
    // For whole units (Villa/Homestay entire), we prefer the Property-level gallery 
    // by default to match the intended design of showing property images first.
    if (selectedRoom && !isWholeUnit && selectedRoom.images && selectedRoom.images.length > 0) {
      return selectedRoom.images
        .map((img) => (typeof img === 'string' ? img : img.url))
        .filter(Boolean);
    }
    const list = [];
    if (images?.cover) list.push(images.cover);
    if (Array.isArray(images?.gallery)) list.push(...images.gallery);
    if (list.length > 0) return list;
    return ['https://via.placeholder.com/800x600'];
  };

  const galleryImages = getGalleryImages();
  const mainImage = galleryImages[Math.min(currentImageIndex, Math.max(galleryImages.length - 1, 0))];
  const activeRoom = selectedRoom || (hasInventory ? inventory[0] : null);
  const stayPricing = getNightBreakup(activeRoom);
  const bookingRoom = selectedRoom || activeRoom;
  const extraPricingLabels = getExtraPricingLabels(bookingRoom);

  // Base Occupancy Logic for UI and pricing
  const baseAdultsPerUnit = selectedRoom?.baseAdults ?? (selectedRoom?.maxAdults || property?.maxGuests || 2);
  const baseChildrenPerUnit = selectedRoom?.baseChildren ?? (selectedRoom?.maxChildren !== undefined ? selectedRoom?.maxChildren : 0);

  const getPriceBreakdown = () => {
    if (!selectedRoom || !dates.checkIn || !dates.checkOut) return null;

    const { nights, perNight } = stayPricing;
    if (nights === 0) return null;

    const units = isWholeUnit ? 1 : guests.rooms;

    // Calculate Extras
    // Total Adults - (Base * Units)
    const extraAdultsCount = Math.max(0, guests.adults - (baseAdultsPerUnit * units));
    const extraChildrenCount = Math.max(0, guests.children - (baseChildrenPerUnit * units));

    const pricePerNight = getRoomPrice(selectedRoom);
    const extraAdultPrice = selectedRoom.pricing?.extraAdultPrice || 0;
    const extraChildPrice = selectedRoom.pricing?.extraChildPrice || 0;

    const totalBasePrice = pricePerNight * nights * units;
    const totalExtraAdultCharge = extraAdultsCount * extraAdultPrice * nights;
    const totalExtraChildCharge = extraChildrenCount * extraChildPrice * nights;

    const grossAmount = totalBasePrice + totalExtraAdultCharge + totalExtraChildCharge;

    // --- DISCOUNT CALCULATION ---
    let discountAmount = 0;
    if (appliedOffer) {
      // Validate Min Booking Amount
      if (grossAmount >= (appliedOffer.minBookingAmount || 0)) {
        if (appliedOffer.discountType === 'percentage') {
          discountAmount = (grossAmount * appliedOffer.discountValue) / 100;
          if (appliedOffer.maxDiscount) {
            discountAmount = Math.min(discountAmount, appliedOffer.maxDiscount);
          }
        } else {
          discountAmount = appliedOffer.discountValue;
        }
        discountAmount = Math.floor(discountAmount);
      } else {
        // Auto-remove if condition met no longer? Or simply don't apply.
        // Let's not apply but maybe don't remove so user sees why?
        // Simpler: Just 0 discount.
        discountAmount = 0;
      }
    }

    // Ensure we don't discount below 0
    discountAmount = Math.min(discountAmount, grossAmount);

    const commissionableAmount = grossAmount; // Base + Extras
    const taxableAmount = grossAmount - discountAmount;

    // Tax Calculation (on Commissionable Amount) matching backend logic
    const taxAmount = Math.round((commissionableAmount * taxRate) / 100);

    const grandTotal = taxableAmount + taxAmount;

    return {
      nights,
      units,
      baseAdultsPerUnit,
      extraAdultsCount,
      extraChildrenCount,
      pricePerNight,
      extraAdultPrice,
      extraChildPrice,
      totalBasePrice,
      totalExtraAdultCharge,
      totalExtraChildCharge,
      grossAmount,
      discountAmount,
      couponCode: (appliedOffer && discountAmount > 0) ? appliedOffer.code : null,
      commissionableAmount,
      taxableAmount,
      taxAmount,
      grandTotal
    };
  };

  const bookingBarPrice =
    stayPricing.nights > 0
      ? stayPricing.perNight
      : getRoomPrice(bookingRoom) || property.minPrice || null;

  const priceBreakdown = getPriceBreakdown();

  const handlePrevImage = () => {
    if (galleryImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const handleNextImage = () => {
    if (galleryImages.length <= 1) return;
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handleBook = async () => {
    if (!dates.checkIn || !dates.checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    if (!selectedRoom) {
      toast.error("Please select a room/unit");
      return;
    }

    // Capture availability result (either from state or fresh check)
    let currentAvailability = availability;

    if (!currentAvailability || checkingAvailability) {
      // If we are currently checking, or haven't checked yet, do a fresh wait
      currentAvailability = await checkAvailability();
    }

    if (!currentAvailability || currentAvailability.available !== true) {
      toast.error(currentAvailability?.message || "Selected room is not available for these dates");
      return;
    }

    if (!getHotelAuthToken()) {
      toast.error("Please login to book");
      navigate('/user/auth/login', { state: { redirectTo: `/hotel/${id}` } });
      return;
    }

    if (!priceBreakdown) {
      toast.error("Unable to calculate price. Please check dates.");
      return;
    }

    navigate('/hotel/checkout', {
      state: {
        property,
        selectedRoom,
        dates,
        guests: {
          ...guests,
          rooms: guests.rooms
        },
        priceBreakdown,
        taxRate,
        couponCode: priceBreakdown.couponCode
      }
    });
  };

  const handleApplyOffer = (offer) => {
    // Basic pre-validation
    const gross = priceBreakdown ? priceBreakdown.grossAmount : (bookingBarPrice || 0);
    if (offer.minBookingAmount && gross < offer.minBookingAmount) {
      toast.error(`Min booking amount of ₹${offer.minBookingAmount} required`);
      return;
    }
    setAppliedOffer(offer);
    setShowOffersModal(false);
    toast.success(`'${offer.code}' applied!`);
  };

  const handleRemoveOffer = () => {
    setAppliedOffer(null);
    toast.success('Coupon removed');
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header Image */}
      <div className="relative h-[40vh] md:h-[50vh] cursor-zoom-in group">
        <motion.div
          className="w-full h-full relative"
          style={{ touchAction: 'none' }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          dragMomentum={false}
          animate={{ x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          onDragEnd={(e, info) => {
            const swipeThreshold = 30;
            const velocityThreshold = 500;

            // Fast swipe detection (velocity-based)
            if (Math.abs(info.velocity.x) > velocityThreshold) {
              if (info.velocity.x < 0) {
                handleNextImage();
              } else {
                handlePrevImage();
              }
              return;
            }

            // Distance-based swipe detection
            if (info.offset.x < -swipeThreshold) {
              handleNextImage();
            } else if (info.offset.x > swipeThreshold) {
              handlePrevImage();
            }
          }}
          onClick={() => setShowImageModal(true)}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              initial={{ opacity: 0.8, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0.8, x: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              src={mainImage}
              alt={name}
              className="w-full h-full object-cover pointer-events-none"
            />
          </AnimatePresence>
        </motion.div>
        {galleryImages.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              <ChevronRight size={20} />
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
              {galleryImages.map((_, index) => (
                <span
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-4 left-4 z-10">
          <button onClick={() => navigate(-1)} className="bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors">
            <ArrowLeft size={20} className="text-surface" />
          </button>
        </div>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={handleShare}
            className="bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors"
          >
            <Share2 size={20} className="text-surface" />
          </button>
          <button
            onClick={handleToggleSave}
            className="bg-white/90 p-2 rounded-full shadow-md hover:bg-white transition-colors"
          >
            <Heart
              size={20}
              className={`${isSaved ? 'fill-red-500 text-red-500' : 'text-surface'}`}
            />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-0 md:px-5 -mt-10 relative z-10">
        <div className="bg-white rounded-t-3xl md:rounded-3xl shadow-[0_-10px_60px_-15px_rgba(0,0,0,0.1)] p-5 pb-32 md:p-8 min-h-screen md:min-h-fit">

          {/* Title & Badge */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-surface/10 text-surface text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {propertyType}
                </span>
                {rating !== undefined && rating !== null && (
                  <div className="flex items-center gap-1 bg-honey/10 text-honey-dark px-2 py-0.5 rounded text-[10px] font-bold">
                    <Star size={10} className="fill-honey text-honey" />
                    {Number(rating) > 0 ? Number(rating).toFixed(1) : 'New'}
                  </div>
                )}
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-textDark mb-1 leading-tight flex items-center gap-2">
                {name}
                {property.isVerified && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-md text-[10px] font-black uppercase tracking-tight shadow-sm shrink-0 ml-2">
                    <CheckCircle size={12} className="fill-blue-500 text-white" />
                    Verified
                  </div>
                )}
              </h1>
              {property.customUrgencyMessage && (
                <div className="flex items-center gap-1.5 w-fit mb-2 px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-black animate-pulse uppercase tracking-tight">
                  🔥 {property.customUrgencyMessage}
                </div>
              )}
              <div className="flex items-start gap-1.5 text-gray-500 text-xs md:text-sm">
                <MapPin size={14} className="mt-0.5 shrink-0" />
                <span className="line-clamp-3 md:line-clamp-1">{address?.fullAddress}</span>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end">
              <p className="text-sm text-gray-500">Starting from</p>
              <div className="flex flex-col items-end">
                {property.fakePrice > 0 && (
                  <span className="text-sm text-red-500 line-through font-bold opacity-70 mb-[-4px]">
                    ₹{property.fakePrice.toLocaleString()}
                  </span>
                )}
                <p className="text-2xl font-bold text-surface">₹{stayPricing.perNight || getRoomPrice(activeRoom) || property.minPrice || 'N/A'}</p>
              </div>
              {stayPricing.nights > 0 && (
                <p className="text-[11px] text-gray-400">
                  {stayPricing.nights} nights ({stayPricing.weekdayNights} weekday, {stayPricing.weekendNights} weekend)
                </p>
              )}
            </div>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-textDark mb-3">About this place</h2>
            <p className="text-gray-600 leading-relaxed text-sm md:text-base">
              {description || "No description available."}
            </p>
          </div>

          {/* Amenities - Dynamic Switching */}
          {(() => {
            // 1. Determine which list to use: Room-specific if selected, otherwise Property-wide
            const showRoomAmenities = selectedRoom && selectedRoom.amenities && selectedRoom.amenities.length > 0;
            const displayAmenities = showRoomAmenities ? selectedRoom.amenities : amenities;
            const title = showRoomAmenities ? 'Room Amenities' : 'Amenities';

            // 2. Filter valid items
            const validAmenities = displayAmenities?.filter(item => item && typeof item === 'string' && item.trim().length > 0) || [];

            // 3. Render if items exist
            if (validAmenities.length === 0) return null;

            return (
              <div className="mb-4">
                <h2 className="text-lg font-bold text-textDark mb-2">{title}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {validAmenities.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-gray-600 text-sm">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <CheckCircle size={16} className="text-surface" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {/* Type Specific Info - Dynamic Rendering */}
          {propertyType === 'PG' && config && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 rounded-xl">
                <h3 className="font-bold text-yellow-900 mb-2">PG Details</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>Type: {config.pgType}</li>
                  <li>Food: {config.mealsIncluded === 'Yes' ? `Included (${config.foodType})` : 'Not Included'}</li>
                  <li>Notice Period: {config.noticePeriod}</li>
                  {config.laundryService && <li>Laundry: {config.laundryService}</li>}
                  {config.housekeeping && <li>Housekeeping: {config.housekeeping}</li>}
                </ul>
              </div>
            </div>
          )}

          {propertyType === 'Hotel' && config && (config.hotelCategory || config.starRating) && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <h3 className="font-bold text-blue-900 mb-2">Hotel Info</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  {config.hotelCategory && <li>Category: {config.hotelCategory}</li>}
                  {config.starRating && <li>Rating: {config.starRating} Stars</li>}
                </ul>
              </div>
            </div>
          )}

          {/* Have to check these later */}
          {propertyType === 'Villa' && (property.structure || config) && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-xl">
                <h3 className="font-bold text-green-900 mb-2">Villa Structure</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  {property.structure ? (
                    <>
                      <li>Bedrooms: {property.structure.bedrooms}</li>
                      <li>Bathrooms: {property.structure.bathrooms}</li>
                      <li>Max Guests: {property.structure.maxGuests}</li>
                      <li>Kitchen: {property.structure.kitchenAvailable ? 'Available' : 'No'}</li>
                    </>
                  ) : (
                    <li>Details available on request</li>
                  )}
                </ul>
              </div>

              {/* Price Details Card */}
              {selectedRoom && (
                <div className="p-4 bg-white rounded-xl border border-gray-200">
                  <h3 className="text-gray-500 text-sm mb-1">Price per night</h3>
                  <div className="text-2xl font-bold text-surface mb-2">
                    ₹{(getRoomPrice(selectedRoom) || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    <div>Extra adult: ₹{selectedRoom.pricing?.extraAdultPrice || selectedRoom.extraAdultPrice || 0} / night •</div>
                    <div>Extra child: ₹{selectedRoom.pricing?.extraChildPrice || selectedRoom.extraChildPrice || 0} / night</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {propertyType === 'Resort' && config && (
            <div className="mb-8">
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-teal-50 rounded-xl">
                  <h3 className="font-bold text-teal-900 mb-2">Resort Highlights</h3>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>Theme: {config.resortTheme}</li>
                    <li>Category: {config.resortCategory}</li>
                    <li>Reception: {config.receptionAvailable ? '24/7' : 'Limited Hours'}</li>
                  </ul>
                </div>
                {property.mealPlans && property.mealPlans.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-xl">
                    <h3 className="font-bold text-orange-900 mb-2">Meal Plans</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.mealPlans.map((plan, i) => (
                        <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                          {plan.mealType}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {property.activities && property.activities.length > 0 && (
                <div className="p-4 bg-indigo-50 rounded-xl">
                  <h3 className="font-bold text-indigo-900 mb-2">Activities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {property.activities.map((act, i) => (
                      <div key={i} className="text-sm text-indigo-800">
                        <span className="font-semibold">{act.name}</span>
                        <span className="text-xs ml-1 opacity-75">({act.type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {propertyType === 'Homestay' && config && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-amber-50 rounded-xl">
                <h3 className="font-bold text-amber-900 mb-2">Homestay Experience</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                  {property.hostName && <li>Host: {property.hostName}</li>}
                  <li>Food: {config.foodType} ({config.mealsAvailable === 'Yes' ? 'Available' : 'Not Available'})</li>
                  <li>Shared Areas: {config.sharedAreas ? 'Yes' : 'No'}</li>
                  {config.idealFor && config.idealFor.length > 0 && <li>Ideal For: {Array.isArray(config.idealFor) ? config.idealFor.join(', ') : config.idealFor}</li>}
                  {config.stayExperience && <li>Experience: {config.stayExperience}</li>}
                </ul>
              </div>
            </div>
          )}

          {propertyType === 'Hostel' && config && (
            <div className="mb-8 grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-purple-50 rounded-xl">
                <h3 className="font-bold text-purple-900 mb-2">Hostel Info</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>Type: {config.hostelType}</li>
                  <li>Curfew: {config.curfewTime || 'No Curfew'}</li>
                  <li>Age Restriction: {config.ageRestriction ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Inventory / Rooms - Conditional */}
          {!isWholeUnit && inventory && inventory.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-textDark mb-4">
                {isBedBased ? 'Choose your Bed/Room' : 'Choose your room'}
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {inventory.map((room) => (
                  <motion.div
                    key={room._id}
                    whileHover={{ scale: 1.01, translateY: -2 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => {
                      setSelectedRoom(room);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`
                      border-2 rounded-xl p-5 cursor-pointer transition-all relative overflow-hidden flex flex-col justify-between
                      ${selectedRoom?._id === room._id
                        ? 'border-surface bg-surface/5 shadow-md shadow-surface/10'
                        : 'border-gray-200 hover:border-surface/40 hover:shadow-lg'}
                    `}
                  >
                    {selectedRoom?._id === room._id && (
                      <div className="absolute top-0 right-0 bg-surface text-white p-1.5 rounded-bl-xl shadow-sm">
                        <CheckCircle size={16} />
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-lg text-textDark mb-1">{room.type}</h4>
                          <p className="text-xs text-gray-500 line-clamp-2">{room.description || `Comfortable ${room.type}`}</p>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-xl text-surface">₹{getRoomPrice(room) || 'N/A'}</span>
                          <span className="text-[10px] text-gray-400 font-medium">per night</span>
                        </div>
                      </div>

                      {getExtraPricingLabels(room).length > 0 && (
                        <div className="text-[11px] text-gray-600 mb-4 bg-gray-50 p-2 rounded-lg space-y-1">
                          {getExtraPricingLabels(room).map((label, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                              {label}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap mb-4">
                        {room.amenities?.filter(a => a && typeof a === 'string' && a.trim()).slice(0, 4).map((am, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 px-2.5 py-1 rounded-full text-gray-600 font-medium">{am}</span>
                        ))}
                      </div>
                    </div>

                    <div className={`
                      w-full py-2.5 rounded-lg text-sm font-bold border-2 transition-all flex items-center justify-center gap-2
                      ${selectedRoom?._id === room._id
                        ? 'bg-surface text-white border-surface'
                        : 'bg-white text-surface border-surface/20 group-hover:border-surface'}
                    `}>
                      {selectedRoom?._id === room._id ? (
                        <>
                          <CheckCircle size={16} />
                          Selected
                        </>
                      ) : 'Select Room'}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Booking Inputs (Date & Guest) */}
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h3 className="font-bold text-textDark mb-3">Trip Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-1">
                <ModernDatePicker
                  label="Check-in"
                  date={dates.checkIn}
                  onChange={(newDate) => setDates({ ...dates, checkIn: newDate })}
                  minDate={new Date().toISOString().split('T')[0]}
                  placeholder="Select Check-in"
                />
              </div>
              <div className="col-span-1">
                <ModernDatePicker
                  label="Check-out"
                  date={dates.checkOut}
                  onChange={(newDate) => setDates({ ...dates, checkOut: newDate })}
                  minDate={dates.checkIn ? new Date(new Date(dates.checkIn).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                  placeholder="Select Check-out"
                  align="right"
                />
              </div>

              {/* Dynamic Guest/Room Inputs */}
              <div className="col-span-2 md:col-span-2 space-y-4">
                {!isWholeUnit && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <label className="text-sm font-bold text-gray-800 block">{getUnitLabel()}</label>
                      <p className="text-[10px] text-gray-500">Based on availability</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(prev => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 active:scale-90 transition-transform"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">{guests.rooms}</span>
                      <button
                        onClick={() => setGuests(prev => ({ ...prev, rooms: Math.min((selectedRoom?.inventoryType === 'bed' ? (selectedRoom?.totalInventory * (selectedRoom?.bedsPerRoom || 1)) : selectedRoom?.totalInventory) || 10, prev.rooms + 1) }))}
                        className="w-8 h-8 rounded-full border border-surface flex items-center justify-center bg-white text-surface active:scale-90 transition-transform"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <label className="text-sm font-bold text-gray-800 block">Adults</label>
                    <p className="text-[10px] text-gray-500">Ages 12+</p>
                    {guests.adults > baseAdultsPerUnit * guests.rooms && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-orange-100 animate-pulse">
                        ₹{selectedRoom?.pricing?.extraAdultPrice || 0} Extra charge
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGuests(prev => ({ ...prev, adults: Math.max(getMaxAdults() === 0 ? 0 : 1, prev.adults - 1) }))}
                      disabled={isBedBased || guests.adults <= (getMaxAdults() === 0 ? 0 : 1)}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 active:scale-90 transition-transform disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-4 text-center font-bold">{guests.adults}</span>
                    <button
                      onClick={() => setGuests(prev => ({ ...prev, adults: Math.min(getMaxAdults(), prev.adults + 1) }))}
                      disabled={isBedBased || guests.adults >= getMaxAdults()}
                      className="w-8 h-8 rounded-full border border-surface flex items-center justify-center bg-white text-surface active:scale-90 transition-transform disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {!isBedBased && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <label className="text-sm font-bold text-gray-800 block">Children</label>
                      <p className="text-[10px] text-gray-500">Ages 0-11</p>
                      {guests.children > baseChildrenPerUnit * guests.rooms && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md mt-1 inline-block border border-orange-100 animate-pulse">
                          ₹{selectedRoom?.pricing?.extraChildPrice || 0} Extra charge
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setGuests(prev => ({ ...prev, children: Math.max(0, prev.children - 1) }))}
                        disabled={guests.children <= 0}
                        className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center bg-white text-gray-600 active:scale-90 transition-transform disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">{guests.children}</span>
                      <button
                        onClick={() => setGuests(prev => ({ ...prev, children: Math.min(getMaxChildren(), prev.children + 1) }))}
                        disabled={guests.children >= getMaxChildren()}
                        className="w-8 h-8 rounded-full border border-surface flex items-center justify-center bg-white text-surface active:scale-90 transition-transform disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>



            {/* --- OFFERS SECTION --- */}
            {(offers.length > 0 || appliedOffer) && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Gift size={16} className="text-surface" />
                    Offers & Coupons
                  </h4>
                  <button
                    onClick={() => setShowOffersModal(true)}
                    className="text-xs font-bold text-surface hover:underline"
                  >
                    View All
                  </button>
                </div>

                {/* Applied Offer State */}
                {appliedOffer ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between relative overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-1.5 bg-green-100 rounded-lg text-green-700">
                        <Tag size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-green-800 text-sm">{appliedOffer.code}</p>
                        <p className="text-xs text-green-600">
                          {appliedOffer.discountType === 'percentage'
                            ? `${appliedOffer.discountValue}% Off applied`
                            : `₹${appliedOffer.discountValue} Off applied`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveOffer}
                      className="p-1.5 hover:bg-white/50 rounded-full text-green-700 transition-colors z-10"
                    >
                      <X size={16} />
                    </button>
                    <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-green-100 rounded-full opacity-50" />
                  </div>
                ) : (
                  /* Carousel of Top 3 Offers */
                  <div className="flex overflow-x-auto gap-3 pb-2 hide-scrollbar snap-x">
                    {offers.slice(0, 3).map((offer) => (
                      <div
                        key={offer._id}
                        onClick={() => handleApplyOffer(offer)}
                        className="min-w-[200px] bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-surface transition-all snap-center relative overflow-hidden group"
                      >
                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold text-white rounded-bl-lg ${offer.bg || 'bg-black'}`}>
                          {offer.code}
                        </div>
                        <p className="font-bold text-xs text-gray-800 mt-2">{offer.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{offer.subtitle}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}


            {/* Price Breakdown Display */}
            {priceBreakdown && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-dashed border-gray-300">
                <h4 className="font-bold text-gray-800 text-sm mb-3">Price Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price ({priceBreakdown.nights} nights x {priceBreakdown.units} units)</span>
                    <span className="font-medium">₹{priceBreakdown.totalBasePrice.toLocaleString()}</span>
                  </div>

                  {priceBreakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span className="flex items-center gap-1"><Tag size={12} /> Coupon Discount ({appliedOffer?.code})</span>
                      <span>- ₹{priceBreakdown.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  {priceBreakdown.totalExtraAdultCharge > 0 && (
                    <div className="flex justify-between text-orange-700">
                      <span>Extra Adults ({priceBreakdown.extraAdultsCount} x ₹{priceBreakdown.extraAdultPrice}/night)</span>
                      <span>+ ₹{priceBreakdown.totalExtraAdultCharge.toLocaleString()}</span>
                    </div>
                  )}
                  {priceBreakdown.totalExtraChildCharge > 0 && (
                    <div className="flex justify-between text-orange-700">
                      <span>Extra Children ({priceBreakdown.extraChildrenCount} x ₹{priceBreakdown.extraChildPrice}/night)</span>
                      <span>+ ₹{priceBreakdown.totalExtraChildCharge.toLocaleString()}</span>
                    </div>
                  )}
                  {priceBreakdown.taxAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Taxes & Fees ({taxRate}%)</span>
                      <span>+ ₹{priceBreakdown.taxAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-base text-surface">
                    <span>Total Amount</span>
                    <span>₹{priceBreakdown.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Note about limits */}
            <div className="mt-3 bg-blue-50 text-blue-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <Info size={14} className="mt-0.5 shrink-0" />
              <p>
                Max allowed: <strong>{getMaxAdults()} Adults</strong> and <strong>{getMaxChildren()} Children</strong> for current selection.
              </p>
            </div>
          </div>

          {/* Policies */}
          {policies && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-textDark mb-4">House Rules & Policies</h2>
              <div className="grid md:grid-cols-2 gap-y-4 gap-x-8 text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-surface" />
                  <div>
                    <span className="font-semibold block text-textDark">Check-in</span>
                    <span>{policies.checkInTime || '12:00 PM'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-surface" />
                  <div>
                    <span className="font-semibold block text-textDark">Check-out</span>
                    <span>{policies.checkOutTime || '11:00 AM'}</span>
                  </div>
                </div>

                {policies.cancellationPolicy && (
                  <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                    <Info size={18} className="text-surface" />
                    <div>
                      <span className="font-semibold block text-textDark">Cancellation Policy</span>
                      <span>{policies.cancellationPolicy}</span>
                    </div>
                  </div>
                )}

                {/* Dynamic Policy Badges */}
                <div className="col-span-2 grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'Pets Allowed', value: policies.petsAllowed || policies.petFriendly, type: 'bool' },
                    { label: 'Smoking Allowed', value: policies.smokingAllowed || policies.smokingAlcohol, type: 'bool' },
                    { label: 'Alcohol Allowed', value: policies.alcoholAllowed, type: 'bool' },
                    { label: 'Suitability', value: policies.suitability, type: 'mixed' },
                    { label: 'ID Required', value: policies.idProofMandatory || policies.idProofRequired || policies.idRequirement, type: 'mixed' }
                  ].map((rule, idx) => {
                    if (rule.value === undefined || rule.value === null) return null;

                    let displayValue = '';
                    if (rule.type === 'bool') {
                      if (rule.value === true || rule.value === 'Yes' || rule.value === 'Allowed') displayValue = 'Yes';
                      else if (rule.value === false || rule.value === 'No' || rule.value === 'Not Allowed') displayValue = 'No';
                      else displayValue = rule.value; // Fallback
                    } else {
                      // Special handling for Suitability field
                      if (rule.label === 'Suitability' && rule.value === 'Both') {
                        displayValue = 'Family Friendly, Couple Friendly';
                      } else {
                        displayValue = typeof rule.value === 'boolean' ? (rule.value ? 'Yes' : 'No') : rule.value;
                      }
                    }

                    if (!displayValue) return null;

                    return (
                      <div key={idx} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <Shield size={14} className="text-gray-400" />
                        <span>{rule.label}: <span className="font-semibold text-textDark">{displayValue}</span></span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom House Rules List */}
                {policies.houseRules && Array.isArray(policies.houseRules) && policies.houseRules.length > 0 && (
                  <div className="col-span-2 mt-2">
                    <span className="font-semibold block text-textDark mb-2">Additional Rules</span>
                    <ul className="list-disc list-inside space-y-1">
                      {policies.houseRules.map((rule, i) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Object based house rules (Villa) */}
                {policies.houseRules && !Array.isArray(policies.houseRules) && typeof policies.houseRules === 'object' && (
                  <div className="col-span-2 mt-2">
                    <span className="font-semibold block text-textDark mb-2">House Rules</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(policies.houseRules).map(([key, val], i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded border ${val ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}: {val ? 'Yes' : 'No'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nearby Places */}
          {property.nearbyPlaces && property.nearbyPlaces.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-textDark mb-4">Nearby Places</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {property.nearbyPlaces.map((place, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm text-surface">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-textDark">{place.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{place.type}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-surface bg-surface/5 px-2 py-1 rounded-md">
                      {place.distanceKm} km
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Reviews Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-textDark">Guest Reviews</h2>
                <div className="flex items-center text-sm text-gray-500 pt-1">
                  <span>{reviews.length > 0 ? `(${reviews.length})` : ''}</span>
                  <span className="mx-1">•</span>
                  <span className="font-bold text-black mr-1">{rating ? Number(rating).toFixed(1) : 'New'}</span>
                  <Star size={14} className="fill-honey text-honey" />
                </div>
              </div>
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="text-xs font-bold text-surface border border-surface px-3 py-1.5 rounded bg-surface/5 hover:bg-surface hover:text-white transition-all flex items-center gap-1.5"
              >
                <MessageSquare size={14} /> <span>Write a Review</span>
              </button>
            </div>

            {/* Review Form */}
            {showReviewForm && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 animate-fadeIn">
                <h3 className="font-bold text-gray-800 mb-3">Rate your experience</h3>
                <form onSubmit={handleReviewSubmit}>
                  <div className="flex gap-2 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewData({ ...reviewData, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          size={24}
                          className={`${reviewData.rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} transition-colors`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder="Share your experience..."
                    rows={3}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-surface outline-none mb-3"
                    required
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 text-gray-500 font-medium hover:text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitReviewLoading}
                      className="px-6 py-2 bg-black text-white rounded-lg font-bold disabled:opacity-50"
                    >
                      {submitReviewLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews Display - Carousel if > 3 */}
            {reviews.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dotted border-gray-300">
                <p className="text-gray-500">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              // Simple Scrollable Row for simplicity and UX
              <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review._id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm snap-center flex-shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-surface/10 flex items-center justify-center text-surface font-bold text-lg">
                        {review.userId?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 text-sm line-clamp-1">{review.userId?.name || 'User'}</p>
                        <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1 bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold">
                        {review.rating} <Star size={10} className="fill-yellow-500 text-yellow-500" />
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-4">
                      "{review.comment}"
                    </p>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Sticky Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">{priceBreakdown ? 'Total Amount' : 'Price per night'}</p>
            <p className="font-bold text-lg text-surface">
              ₹{priceBreakdown?.grandTotal?.toLocaleString() || bookingBarPrice?.toLocaleString() || 'N/A'}
            </p>
            {dates.checkIn && dates.checkOut && (
              <div className="mt-1">
                {checkingAvailability ? (
                  <span className="text-[10px] text-blue-500 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> Checking...
                  </span>
                ) : availability?.available === false ? (
                  <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                    <Info size={10} /> {availability.message || "Not Available"}
                  </span>
                ) : availability?.available === true ? (
                  <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                    <CheckCircle size={10} /> {availability.unitsLeft !== undefined ? `${availability.unitsLeft} Left!` : 'Available'}
                  </span>
                ) : null}
              </div>
            )}
            {extraPricingLabels.length > 0 && (
              <p className="text-[11px] text-gray-500">
                {extraPricingLabels.join(' • ')}
              </p>
            )}
          </div>
          <div className="flex flex-1 md:flex-none gap-2">
            <button
              onClick={handleBook}
              disabled={bookingLoading || checkingAvailability}
              className="bg-surface text-white px-8 py-3 rounded-xl font-bold flex-1 md:w-64 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-surface-dark transition-colors flex items-center justify-center gap-2"
            >
              {(bookingLoading || checkingAvailability) ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>{checkingAvailability ? 'Checking...' : 'Processing...'}</span>
                </>
              ) : 'Book Now'}
            </button>
          </div>
        </div>
      </div>

      {/* ALL OFFERS MODAL */}
      {showOffersModal && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4 animate-fadeIn">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl animate-slideUp">

            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 rounded-t-2xl">
              <h3 className="font-bold text-lg text-gray-900">Available Offers</h3>
              <button
                onClick={() => setShowOffersModal(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div
              className="p-4 overflow-y-auto overflow-x-hidden space-y-4 bg-gray-50 flex-1 overscroll-y-contain"
              data-lenis-prevent
            >
              {offers.map((offer) => (
                <div
                  key={offer._id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative flex flex-col"
                >
                  <div className={`h-24 ${offer.bg || 'bg-gray-800'} relative p-4 flex flex-col justify-center text-white`}>
                    {offer.image && (
                      <img src={offer.image} alt="offer" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                    )}
                    <div className="relative z-10">
                      <h4 className="font-black text-xl">{offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}</h4>
                      <p className="text-xs opacity-90 font-medium">{offer.title}</p>
                    </div>
                    <div className="absolute top-3 right-3 bg-white text-black text-xs font-bold px-2 py-1 rounded shadow-sm z-10">
                      {offer.code}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-3">{offer.description || offer.subtitle}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <div className="text-[10px] text-gray-400 font-medium">
                        {offer.minBookingAmount > 0 ? `Min. Spend: ₹${offer.minBookingAmount}` : 'No Min Spend'}
                      </div>
                      <button
                        onClick={() => handleApplyOffer(offer)}
                        className="bg-surface text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-surface/20 active:scale-95 transition-all"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* FULL SCREEN IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-fadeIn">
          {/* Header */}
          <div className="p-4 flex items-center justify-between text-white z-10">
            <div className="flex flex-col">
              <h3 className="font-bold text-sm md:text-base line-clamp-1">{name}</h3>
              <p className="text-[10px] md:text-xs opacity-70">Image {currentImageIndex + 1} of {galleryImages.length}</p>
            </div>
            <button
              onClick={() => setShowImageModal(false)}
              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Image View */}
          <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              className="w-full h-full flex items-center justify-center"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              animate={{ x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onDragEnd={(e, info) => {
                const swipeThreshold = 50;
                if (info.offset.x < -swipeThreshold) {
                  handleNextImage();
                } else if (info.offset.x > swipeThreshold) {
                  handlePrevImage();
                }
              }}
            >
              <motion.img
                key={currentImageIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                src={galleryImages[currentImageIndex]}
                alt={`Gallery ${currentImageIndex}`}
                className="max-w-full max-h-full object-contain shadow-2xl pointer-events-none"
              />
            </motion.div>

            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                  className="absolute left-2 md:left-5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 md:p-4 rounded-full backdrop-blur-md transition-all active:scale-95"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                  className="absolute right-2 md:right-5 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 md:p-4 rounded-full backdrop-blur-md transition-all active:scale-95"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails / Counter Bar */}
          <div className="p-4 flex justify-center gap-1.5 overflow-x-auto hide-scrollbar">
            {galleryImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImageIndex(idx)}
                className={`
                  w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
                  ${idx === currentImageIndex ? 'border-surface scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}
                `}
              >
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyDetailsPage;
