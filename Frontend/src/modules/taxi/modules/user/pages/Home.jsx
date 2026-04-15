import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, MapPin } from 'lucide-react';
import HeaderGreeting from '../components/HeaderGreeting';
import ServiceGrid from '../components/ServiceGrid';
import LocationMapSection from '../components/LocationMapSection';
import ActionsSection from '../components/ActionsSection';
import PromoBanners from '../components/PromoBanners';
import ExplorerSection from '../components/ExplorerSection';
import BottomNavbar from '../components/BottomNavbar';
import carIcon from '../../../assets/icons/car.png';
import bikeIcon from '../../../assets/icons/bike.png';
import autoIcon from '../../../assets/icons/auto.png';
import deliveryIcon from '../../../assets/icons/Delivery.png';
import api from '../../../shared/api/axiosInstance';
import { useSettings } from '../../../shared/context/SettingsContext';
import { hasLocalUserToken } from '../services/authService';
import {
  CURRENT_RIDE_UPDATED_EVENT,
  clearCurrentRide,
  getCurrentRide,
  isActiveCurrentRide,
  saveCurrentRide,
} from '../services/currentRideService';

const Motion = motion;

class HomeSectionBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('[taxi-home] section render failed', {
      section: this.props.label || 'unknown',
      error,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-5">
          <div className="rounded-[20px] border border-amber-100 bg-amber-50/90 px-4 py-3 text-left shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {this.props.label || 'Section'} unavailable
            </p>
            <p className="mt-1 text-[12px] font-bold text-amber-900">
              This block could not load right now, but the rest of the home page is still available.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const normalizeActiveRide = (ride) => {
  if (!ride?.rideId) {
    return null;
  }

  const formatPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
  };

  return {
    rideId: ride.rideId,
    status: ride.status || ride.liveStatus || 'accepted',
    liveStatus: ride.liveStatus || ride.status || 'accepted',
    type: ride.type || ride.serviceType || 'ride',
    serviceType: ride.serviceType || ride.type || 'ride',
    driver: ride.driver || null,
    fare: ride.fare || 22,
    vehicleIconType: ride.vehicleIconType || ride.driver?.vehicleIconType || '',
    pickupCoords: ride.pickupLocation?.coordinates,
    dropCoords: ride.dropLocation?.coordinates,
    pickup: formatPoint(ride.pickupLocation, 'Pickup location'),
    drop: formatPoint(ride.dropLocation, 'Drop location'),
    paymentMethod: ride.paymentMethod || 'Cash',
  };
};

const getCurrentRideIcon = (ride) => {
  const serviceType = String(ride?.serviceType || ride?.type || '').toLowerCase();
  const iconType = String(ride?.vehicleIconType || ride?.driver?.vehicleIconType || ride?.driver?.vehicleType || '').toLowerCase();

  if (serviceType === 'parcel') {
    return deliveryIcon;
  }

  if (iconType.includes('bike')) {
    return bikeIcon;
  }

  if (iconType.includes('auto')) {
    return autoIcon;
  }

  return carIcon;
};

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';

  const [currentRide, setCurrentRide] = useState(() => {
    const ride = getCurrentRide();
    return isActiveCurrentRide(ride) ? ride : null;
  });

  useEffect(() => {
    const refreshCurrentRide = () => {
      const ride = getCurrentRide();
      setCurrentRide(isActiveCurrentRide(ride) ? ride : null);
    };

    refreshCurrentRide();
    window.addEventListener('storage', refreshCurrentRide);
    window.addEventListener(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);

    return () => {
      window.removeEventListener('storage', refreshCurrentRide);
      window.removeEventListener(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadActiveRide = async () => {
      if (!hasLocalUserToken()) {
        clearCurrentRide();
        setCurrentRide(null);
        return;
      }

      try {
        const [rideResponse, parcelResponse] = await Promise.allSettled([
          api.get('/rides/active/me'),
          api.get('/deliveries/active/me'),
        ]);
        const activeResponse = parcelResponse.status === 'fulfilled' && parcelResponse.value?.data
          ? parcelResponse.value
          : rideResponse.status === 'fulfilled'
            ? rideResponse.value
            : null;
        const ride = normalizeActiveRide(activeResponse?.data || activeResponse);

        if (!active || !isActiveCurrentRide(ride)) {
          clearCurrentRide();
          setCurrentRide(null);
          return;
        }

        saveCurrentRide(ride);
        setCurrentRide(ride);
      } catch {
        // Local storage remains the fallback; missing auth should not break the home page.
      }
    };

    loadActiveRide();

    return () => {
      active = false;
    };
  }, []);

  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';
  const driverName = currentRide?.driver?.name || 'Captain';
  const serviceType = String(currentRide?.serviceType || currentRide?.type || 'ride').toLowerCase();
  const vehicleLabel = currentRide?.driver?.vehicle || currentRide?.driver?.vehicleType || (serviceType === 'parcel' ? 'Parcel' : 'Taxi');
  const currentRideIcon = getCurrentRideIcon(currentRide);
  const trackingPath = serviceType === 'parcel' ? `${routePrefix}/parcel/tracking` : `${routePrefix}/ride/tracking`;
  const rideStage = String(currentRide?.liveStatus || currentRide?.status || 'accepted').toLowerCase();
  const rideStageLabel =
    rideStage === 'started'
      ? serviceType === 'parcel' ? 'Parcel in transit' : 'Ride in progress'
      : rideStage === 'arriving'
        ? serviceType === 'parcel' ? 'Driver reached sender' : 'Driver arrived'
        : serviceType === 'parcel'
          ? 'Parcel booked'
          : 'Ride booked';

  const footerIllustrationBg = {
    backgroundImage: 'url(/home_footer_gemini.png)',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center calc(100% + 65px)',
    backgroundSize: 'cover',
  };

  const footerIllustrationFadeMask = {
    WebkitMaskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)',
    maskImage:
      'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 22%, rgba(0,0,0,1) 88%, rgba(0,0,0,0) 100%)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };

  const footerIllustrationEdgeBlurMask = {
    WebkitMaskImage:
      'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 100%)',
    maskImage:
      'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 100%)',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] pb-24 max-w-lg mx-auto relative overflow-hidden font-sans no-scrollbar">
      <div className="absolute -top-16 right-[-40px] h-44 w-44 rounded-full bg-orange-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-52 left-[-60px] h-52 w-52 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />
      <div className="absolute bottom-28 right-[-40px] h-40 w-40 rounded-full bg-blue-100/60 blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-4 pb-6">
        <HomeSectionBoundary label="Header">
          <HeaderGreeting />
        </HomeSectionBoundary>
        <HomeSectionBoundary label="Services">
          <ServiceGrid />
        </HomeSectionBoundary>
        <HomeSectionBoundary label="Map">
          <LocationMapSection />
        </HomeSectionBoundary>
        <HomeSectionBoundary label="Quick actions">
          <ActionsSection />
        </HomeSectionBoundary>
        <HomeSectionBoundary label="Promotions">
          <PromoBanners />
        </HomeSectionBoundary>
        <HomeSectionBoundary label="Explore">
          <ExplorerSection />
        </HomeSectionBoundary>
        <div
          className="relative w-full"
          style={{
            height: 360,
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              filter: 'grayscale(1) contrast(1.08)',
              ...footerIllustrationFadeMask,
            }}
          >
            <div className="absolute inset-0" style={footerIllustrationBg} />
            <div
              className="absolute inset-0 opacity-55"
              style={{
                ...footerIllustrationBg,
                filter: 'blur(3px)',
                ...footerIllustrationEdgeBlurMask,
              }}
            />
          </div>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-white/80 via-white/35 to-transparent" />
            <div className="relative z-10 flex h-full items-center justify-center px-6 pt-16 text-left">
              <div className="flex max-w-[340px] flex-col items-start px-2 py-2 -translate-x-6 translate-y-12">
                <div className="text-[30px] font-serif font-extrabold tracking-[0.28em] text-slate-600 drop-shadow-[0_2px_10px_rgba(255,255,255,0.85)]">
                  #{appName.toUpperCase()}
                </div>
                <div className="mt-1 text-[12px] font-sans italic font-semibold tracking-wide text-slate-600 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]">
                  Your Trusted Journey Partner
                </div>
                <div className="mt-2 text-[10px] font-sans font-semibold tracking-[0.22em] text-slate-500 drop-shadow-[0_1px_8px_rgba(255,255,255,0.8)]">
                  Made for Everyone, Crafted for You.
                  <img
                    src="/flag-in.svg"
                    alt="India"
                    className="ml-0.5 inline-block h-[2.2em] w-[1.2em] align-[-0.88em]"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-24 left-0 right-0 h-24 opacity-70 pointer-events-none">
        <img
          src="/city_skyline_footer.png"
          alt="City"
          className="w-full h-full object-cover object-bottom mix-blend-multiply contrast-125"
        />
      </div>

      <AnimatePresence>
        {currentRide && (
          <Motion.button
            type="button"
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 18, opacity: 0, scale: 0.96 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(trackingPath, { state: currentRide })}
            className="fixed bottom-24 left-4 right-4 z-[60] mx-auto flex max-w-[calc(32rem-2rem)] items-center gap-3 rounded-[20px] border border-white/80 bg-white/95 px-4 py-3 text-left shadow-[0_12px_34px_rgba(15,23,42,0.16)] backdrop-blur-xl"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-slate-900">
              <img src={currentRideIcon} alt={vehicleLabel} className="h-8 w-8 object-contain" draggable={false} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-600">
                  {serviceType === 'parcel' ? 'Current Parcel' : 'Current Ride'}
                </p>
              </div>
              <p className="mt-0.5 truncate text-[14px] font-black leading-tight text-slate-900">
                {rideStageLabel}
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <MapPin size={12} className="shrink-0 text-emerald-500" strokeWidth={2.5} />
                <span className="truncate">{currentRide.pickup || 'Pickup location'}</span>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <MapPin size={12} className="shrink-0 text-orange-500" strokeWidth={2.5} />
                <span className="truncate">{currentRide.drop || 'Drop location'}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] font-black text-slate-900">Rs {Number(currentRide.fare || 0).toFixed(0)}</p>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{driverName}</p>
              <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-[12px] bg-orange-500 text-white">
                <ChevronRight size={18} strokeWidth={3} />
              </div>
            </div>
          </Motion.button>
        )}
      </AnimatePresence>

      <BottomNavbar />
    </div>
  );
};

export default Home;

