import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Bell, 
    Navigation, 
    Wallet, 
    Clock, 
    Bike, 
    Power, 
    Target, 
    Layers, 
    Zap,
    IndianRupee, 
    TrendingUp, 
    Star, 
    ChevronRight,
    MapPin,
    User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, Marker } from '@react-google-maps/api';

import DriverBottomNav from '../../shared/components/DriverBottomNav';
import IncomingRideRequest from './IncomingRideRequest';
import api from '../../../shared/api/axiosInstance';
import { useSettings } from '../../../shared/context/SettingsContext';

// Vehicle Icons for Map
import BikeIcon from '../../../assets/icons/bike.png';
import CarIcon from '../../../assets/icons/car.png';
import AutoIcon from '../../../assets/icons/auto.png';
import TruckIcon from '../../../assets/icons/truck.png';
import EhcvIcon from '../../../assets/icons/ehcv.png';
import HcvIcon from '../../../assets/icons/hcv.png';
import LcvIcon from '../../../assets/icons/LCV.png';
import McvIcon from '../../../assets/icons/mcv.png';
import LuxuryIcon from '../../../assets/icons/Luxury.png';
import PremiumIcon from '../../../assets/icons/Premium.png';
import SuvIcon from '../../../assets/icons/SUV.png';

import { socketService } from '../../../shared/api/socket';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';
import { getCurrentDriver, getLocalDriverToken } from '../services/registrationService';

const Motion = motion;

const containerStyle = {
    width: '100%',
    height: '100%'
};

const DEFAULT_MAP_CENTER = {
    lat: 22.7196,
    lng: 75.8577 
};

const DEFAULT_MAP_COORDS = [75.8577, 22.7196];

const getCurrentCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Location is not available on this device.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => reject(new Error('Please allow location permission to go online.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
});

const toLatLng = (coordinates) => {
    const [lng, lat] = coordinates || [];

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return DEFAULT_MAP_CENTER;
    }

    return { lat: Number(lat), lng: Number(lng) };
};

const getMapIconForVehicle = (iconType = '') => {
    const value = String(iconType).toLowerCase();

    if (value.includes('bike')) return BikeIcon;
    if (value.includes('auto')) return AutoIcon;
    if (value.includes('ehc')) return EhcvIcon;
    if (value.includes('hcv')) return HcvIcon;
    if (value.includes('lcv')) return LcvIcon;
    if (value.includes('mcv')) return McvIcon;
    if (value.includes('truck')) return TruckIcon;
    if (value.includes('lux')) return LuxuryIcon;
    if (value.includes('premium')) return PremiumIcon;
    if (value.includes('suv')) return SuvIcon;

    return CarIcon;
};

const formatPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
};

const normalizeJobType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

const getJobTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

const formatTripDistance = (job = {}) => {
    const estimatedMeters = Number(job.estimatedDistanceMeters || job.raw?.estimatedDistanceMeters || 0);

    if (Number.isFinite(estimatedMeters) && estimatedMeters > 0) {
        return estimatedMeters < 1000
            ? `${Math.max(50, Math.round(estimatedMeters / 10) * 10)} m`
            : `${(estimatedMeters / 1000).toFixed(estimatedMeters >= 10000 ? 0 : 1)} km`;
    }

    if (job.intercity?.distance) {
        return `${job.intercity.distance} km`;
    }

    if (job.raw?.intercity?.distance) {
        return `${job.raw.intercity.distance} km`;
    }

    if (job.radius) {
        return `within ${(Number(job.radius) / 1000).toFixed(1)} km`;
    }

    if (job.raw?.radius) {
        return `within ${(Number(job.raw.radius) / 1000).toFixed(1)} km`;
    }

    return 'nearby';
};

const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;
const withDriverAuthorization = (token) => (
    token
        ? {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
        : {}
);

const mapStyles = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road.arterial", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#dadada" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "transit.line", "elementType": "geometry", "stylers": [{ "color": "#e5e5e5" }] },
  { "featureType": "transit.station", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9c9c9" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] }
];

const DriverHome = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings.general?.app_name || 'App';
    const appLogo = settings.general?.logo || settings.customization?.logo;
    const [isOnline, setIsOnline] = useState(false);
    const [showRequest, setShowRequest] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [completedRides, setCompletedRides] = useState(0);
    const [dutySeconds, setDutySeconds] = useState(0);
    const [map, setMap] = useState(null);
    const [driverCoords, setDriverCoords] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [acceptingRideId, setAcceptingRideId] = useState('');
    const [isHydratingDriver, setIsHydratingDriver] = useState(true);
    const [vehicleIconType, setVehicleIconType] = useState('car');
    const [walletSummary, setWalletSummary] = useState({ balance: 0, cashLimit: 500, isBlocked: false });
    const driverCoordsRef = useRef(null);
    const acceptingRideIdRef = useRef('');
    const driverPosition = useMemo(() => toLatLng(driverCoords || DEFAULT_MAP_COORDS), [driverCoords]);
    const mapVehicleIcon = useMemo(
        () => getMapIconForVehicle(vehicleIconType),
        [vehicleIconType],
    );

    const { isLoaded } = useAppGoogleMapsLoader();

    const fetchActiveJob = useCallback(async (type = 'ride') => {
        const normalizedType = String(type || 'ride').toLowerCase();
        const endpoint = normalizedType === 'parcel' ? '/deliveries/active/me' : '/rides/active/me';
        const driverToken = getLocalDriverToken();
        const response = await api.get(endpoint, {
            ...withDriverAuthorization(driverToken),
            params: { t: Date.now(), type: normalizedType },
        });
        return unwrapApiPayload(response);
    }, []);

    const onLoad = useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback() {
        setMap(null);
    }, []);

    const mapOptions = useMemo(() => ({
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: false,
        clickableIcons: false
    }), []);

    const updateDriverLocation = useCallback(async ({ quiet = false } = {}) => {
        try {
            const coordinates = await getCurrentCoords();
            driverCoordsRef.current = coordinates;
            setDriverCoords(coordinates);
            map?.panTo(toLatLng(coordinates));
            if (!quiet) {
                setStatusMessage('Current location updated.');
            }
            return coordinates;
        } catch (error) {
            if (!quiet) {
                setStatusMessage(error.message || 'Could not fetch current location.');
            }
            throw error;
        }
    }, [map]);

    useEffect(() => {
        updateDriverLocation({ quiet: true }).catch(() => {});
    }, [updateDriverLocation]);

    const hydrateDriverState = useCallback(async () => {
        const response = await getCurrentDriver();
        const driver = response?.data?.data || response?.data || response;
        const savedCoords = driver?.location?.coordinates;

        setVehicleIconType(driver?.vehicleIconType || driver?.vehicleType || 'car');
        setIsOnline(Boolean(driver?.isOnline));
        if (driver?.wallet) {
            setWalletSummary(driver.wallet);
        }

        if (Array.isArray(savedCoords) && savedCoords.length === 2) {
            driverCoordsRef.current = savedCoords;
            setDriverCoords(savedCoords);
        }

        return driver;
    }, []);

    useEffect(() => {
        let active = true;

        setIsHydratingDriver(true);

        (async () => {
            try {
                await hydrateDriverState();

                const [activeDelivery, activeRide] = await Promise.allSettled([
                    fetchActiveJob('parcel'),
                    fetchActiveJob('ride'),
                ]);

                if (!active) {
                    return;
                }

                const deliveryPayload =
                    activeDelivery.status === 'fulfilled' ? activeDelivery.value : null;
                const ridePayload =
                    activeRide.status === 'fulfilled' ? activeRide.value : null;

                const currentJob = deliveryPayload?.rideId
                    ? deliveryPayload
                    : ridePayload?.rideId
                        ? ridePayload
                        : null;

                if (currentJob?.rideId) {
                    const currentType = normalizeJobType(currentJob);

                    navigate('/taxi/driver/active-trip', {
                        replace: true,
                        state: {
                            type: currentType,
                            rideId: currentJob.rideId,
                            request: {
                                type: currentType,
                                title: getJobTitle(currentType),
                                fare: `Rs ${currentJob.fare || 0}`,
                                payment: currentJob.paymentMethod || 'Cash',
                                pickup: currentJob.pickupAddress || formatPoint(currentJob.pickupLocation, 'Pickup Location'),
                                drop: currentJob.dropAddress || formatPoint(currentJob.dropLocation, 'Drop Location'),
                                distance: formatTripDistance(currentJob),
                                requestId: currentJob.rideId,
                                rideId: currentJob.rideId,
                                raw: currentJob,
                            },
                            currentDriverCoords: driverCoordsRef.current || currentJob.lastDriverLocation?.coordinates || null,
                        },
                    });
                    return;
                }
            } catch {
                if (active) {
                    setStatusMessage('Could not restore driver status.');
                }
            } finally {
                if (active) {
                    setIsHydratingDriver(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [fetchActiveJob, hydrateDriverState, navigate]);

    useEffect(() => {
        if (map && driverCoords) {
            map.panTo(toLatLng(driverCoords));
        }
    }, [map, driverCoords]);

    const goOnline = useCallback(async () => {
        try {
            console.info('[driver-home] goOnline requested');
            const coordinates = await updateDriverLocation({ quiet: true });
            console.info('[driver-home] current coordinates resolved', coordinates);
            const socket = socketService.connect({ role: 'driver' });

            if (!socket) {
                console.warn('[driver-home] socket connect skipped because token was missing');
                setStatusMessage('Driver session missing. Please login again.');
                return;
            }

            const response = await api.patch('/drivers/online', { location: coordinates });
            const driver = response?.data?.data || response?.data || response;
            console.info('[driver-home] online API response', {
                isOnline: driver?.isOnline,
                zoneId: driver?.zoneId || null,
                vehicleTypeId: driver?.vehicleTypeId || null,
            });
            setIsOnline(Boolean(driver?.isOnline));
            if (Array.isArray(driver?.location?.coordinates) && driver.location.coordinates.length === 2) {
                driverCoordsRef.current = driver.location.coordinates;
                setDriverCoords(driver.location.coordinates);
                socketService.emit('locationUpdate', { coordinates: driver.location.coordinates });
                console.info('[driver-home] emitted locationUpdate with saved coords', driver.location.coordinates);
            } else {
                socketService.emit('locationUpdate', { coordinates });
                console.info('[driver-home] emitted locationUpdate with fresh coords', coordinates);
            }
            setStatusMessage('You are online. Waiting for nearby bookings.');
        } catch (error) {
            console.error('[driver-home] goOnline failed', error);
            setStatusMessage(error.message || 'Could not go online.');
        }
    }, [updateDriverLocation]);

    const goOffline = useCallback(async () => {
        try {
            const response = await api.patch('/drivers/offline');
            const driver = response?.data?.data || response?.data || response;
            setIsOnline(Boolean(driver?.isOnline));
            setIsOnline(false);
            setShowRequest(false);
            setCurrentRequest(null);
            setStatusMessage('You are offline.');
            socketService.disconnect();
        } catch (error) {
            setStatusMessage(error.message || 'Could not go offline.');
        }
    }, []);

    // Socket Integration
    useEffect(() => {
        if (isOnline) {
            console.info('[driver-home] socket effect starting for online driver');
            const socket = socketService.connect({ role: 'driver' });

            if (!socket) {
                console.warn('[driver-home] socket effect could not get a socket');
                setStatusMessage('Driver session missing. Please login again.');
                setIsOnline(false);
                return undefined;
            }

            if (driverCoordsRef.current) {
                socketService.emit('locationUpdate', { coordinates: driverCoordsRef.current });
                console.info('[driver-home] emitted initial locationUpdate from effect', driverCoordsRef.current);
            }

            const onRideRequest = (data) => {
                console.info('[driver-home] rideRequest received', data);
                const requestType = normalizeJobType(data);
                const request = {
                    type: requestType,
                    title: getJobTitle(requestType),
                    fare: `Rs ${data.fare || 0}`,
                    payment: data.paymentMethod || 'Cash',
                    pickup: data.pickupAddress || formatPoint(data.pickupLocation, 'Pickup Location'),
                    drop: data.dropAddress || formatPoint(data.dropLocation, 'Drop Location'),
                    distance: formatTripDistance(data),
                    requestId: data.rideId,
                    rideId: data.rideId,
                    raw: data,
                };
                setCurrentRequest(request);
                setShowRequest(true);
                setStatusMessage('New booking received.');
            };

            const onRideRequestClosed = ({ rideId, reason, message }) => {
                console.info('[driver-home] rideRequestClosed received', { rideId, reason, message });
                if (acceptingRideIdRef.current && acceptingRideIdRef.current === rideId) {
                    return;
                }
                if (!currentRequest?.rideId || currentRequest.rideId === rideId) {
                    setShowRequest(false);
                    setCurrentRequest(null);
                    if (reason === 'user-cancelled') {
                        setStatusMessage(message || 'User cancelled the ride.');
                    } else if (reason === 'deleted-by-admin') {
                        setStatusMessage('Ride was cancelled by admin.');
                    } else if (reason === 'unmatched') {
                        setStatusMessage('Ride request expired without a match.');
                    }
                }
            };

            const onSocketError = ({ message }) => {
                console.error('[driver-home] socket errorMessage received', message);
                setStatusMessage(message || 'Socket error.');
                if (String(message || '').toLowerCase().includes('no longer available')) {
                    setShowRequest(false);
                    setCurrentRequest(null);
                }
                acceptingRideIdRef.current = '';
                setAcceptingRideId('');
            };

            const openAcceptedRide = async (payload) => {
                if (!payload?.rideId || payload.rideId !== acceptingRideIdRef.current) {
                    return;
                }

                const nextType = currentRequest?.type || 'ride';
                let currentJob = null;

                try {
                    currentJob = await fetchActiveJob(nextType);
                } catch {
                    currentJob = null;
                }

                setShowRequest(false);
                acceptingRideIdRef.current = '';
                setAcceptingRideId('');
                setCompletedRides(prev => prev + 1);
                navigate('/taxi/driver/active-trip', {
                    state: {
                        type: nextType,
                        rideId: currentJob?.rideId || payload.rideId,
                        request: {
                            ...currentRequest,
                            rideId: currentJob?.rideId || payload.rideId,
                            raw: currentJob || {
                                ...(currentRequest?.raw || {}),
                                status: payload.status,
                                liveStatus: payload.liveStatus,
                                acceptedAt: payload.acceptedAt,
                            },
                        },
                        currentDriverCoords: driverCoordsRef.current || driverCoords || null,
                    },
                });
            };

            const onWalletUpdated = (payload) => {
                if (payload?.wallet) {
                    setWalletSummary(payload.wallet);
                }
            };

            socketService.on('rideRequest', onRideRequest);
            socketService.on('rideRequestClosed', onRideRequestClosed);
            socketService.on('errorMessage', onSocketError);
            socketService.on('rideAccepted', openAcceptedRide);
            socketService.on('driver:wallet:updated', onWalletUpdated);
            console.info('[driver-home] socket listeners registered');

            const locationInterval = setInterval(() => {
                getCurrentCoords()
                    .then((coordinates) => {
                        driverCoordsRef.current = coordinates;
                        setDriverCoords(coordinates);
                        socketService.emit('locationUpdate', { coordinates });
                        console.info('[driver-home] periodic locationUpdate emitted', coordinates);
                    })
                    .catch((error) => {
                        console.error('[driver-home] periodic location update failed', error);
                        setStatusMessage(error.message || 'Could not update live location.');
                    });
            }, 10000);

            return () => {
                console.info('[driver-home] cleaning up socket listeners');
                socketService.off('rideRequest', onRideRequest);
                socketService.off('rideRequestClosed', onRideRequestClosed);
                socketService.off('errorMessage', onSocketError);
                socketService.off('rideAccepted', openAcceptedRide);
                socketService.off('driver:wallet:updated', onWalletUpdated);
                clearInterval(locationInterval);
            };
        } else {
            console.info('[driver-home] driver offline, disconnecting socket');
            socketService.disconnect();
        }
        return undefined;
    }, [currentRequest, driverCoords, fetchActiveJob, isOnline, navigate]);
    
    useEffect(() => {
        let interval;
        if (isOnline) {
            interval = setInterval(() => setDutySeconds(s => s + 1), 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isOnline]);

    const dutyHours = Math.floor(dutySeconds / 3600);
    const dutyMins = Math.floor((dutySeconds % 3600) / 60);

    const handleAccept = () => {
        if (!currentRequest?.rideId || acceptingRideId) {
            return;
        }

        acceptingRideIdRef.current = currentRequest.rideId;
        setAcceptingRideId(currentRequest.rideId);
        setStatusMessage('Accepting ride...');
        socketService.emit('acceptRide', { rideId: currentRequest.rideId });
    };

    const handleDecline = () => {
        if (currentRequest?.rideId) {
            socketService.emit('rejectRide', { rideId: currentRequest.rideId });
        }
        setShowRequest(false);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans select-none overflow-hidden relative pb-20 text-slate-900">
            <IncomingRideRequest 
                visible={showRequest && Boolean(currentRequest)}
                requestData={currentRequest}
                isAccepting={Boolean(acceptingRideId)}
                onAccept={handleAccept} 
                onDecline={handleDecline}
            />

            <header className="fixed top-0 left-0 right-0 px-6 pt-6 pb-2.5 flex items-center justify-between z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-md">
                <div className="flex items-center gap-3 pt-2">
                    {appLogo ? (
                        <img src={appLogo} alt={appName} className="h-7 drop-shadow-sm" />
                    ) : (
                        <span className="text-lg font-black tracking-tight text-slate-900">{appName}</span>
                    )}
                    <div className="h-5 w-px bg-slate-200" />
                    <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full shadow-sm ${isHydratingDriver ? 'bg-amber-400 animate-pulse' : isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`text-[11px] font-semibold tracking-wide ${isHydratingDriver ? 'text-amber-500' : isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {isHydratingDriver ? 'Syncing' : isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/taxi/driver/notifications')} className="w-9 h-9 bg-white rounded-xl shadow-sm border border-slate-50 flex items-center justify-center text-slate-600 relative active:scale-95 transition-all">
                        <Bell size={16} strokeWidth={2.5} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                    </button>
                    <div onClick={() => navigate('/taxi/driver/profile')} className="w-9 h-9 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center shadow-inner cursor-pointer active:scale-95 transition-all overflow-hidden">
                         <User size={20} className="text-slate-300" />
                    </div>
                </div>
            </header>

            <div className="absolute inset-0 z-0 h-full bg-[#E5E7EB] overflow-hidden">
                {HAS_VALID_GOOGLE_MAPS_KEY && isLoaded ? (
                    <GoogleMap mapContainerStyle={containerStyle} center={driverPosition} zoom={15} onLoad={onLoad} onUnmount={onUnmount} options={mapOptions}>
                        <Marker position={driverPosition} icon={{ url: mapVehicleIcon, scaledSize: new window.google.maps.Size(40, 40), anchor: new window.google.maps.Point(20, 20)}} />
                    </GoogleMap>
                ) : <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-medium text-xs">Map unavailable until Google Maps key is configured</div>}
                <div className="absolute right-5 top-28 flex flex-col gap-2 z-20">
                    <button onClick={() => updateDriverLocation()} className="w-9 h-9 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 border border-slate-50 active:scale-90 transition-all"><Target size={16} /></button>
                    <button className="w-9 h-9 bg-white shadow-lg rounded-xl flex items-center justify-center text-slate-800 border border-slate-50 active:scale-90 transition-all"><Layers size={16} /></button>
                </div>
            </div>

            <div className="absolute bottom-[5.5rem] left-0 right-0 px-4 z-30">
                <Motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2rem] p-4 shadow-premium border border-slate-50">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-0.5">
                             <div className="flex items-center gap-1 opacity-60"><IndianRupee size={10} className="text-emerald-500" /><span className="text-[10px] font-medium text-slate-500">Wallet</span></div>
                             <p className={`text-xl font-bold tracking-tight leading-none ${walletSummary.isBlocked ? 'text-rose-600' : 'text-slate-900'}`}>
                                Rs {Number(walletSummary.balance || 0).toFixed(2)}
                             </p>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-0.5">
                             <div className="flex items-center gap-1 opacity-60"><Clock size={10} className="text-blue-500" /><span className="text-[10px] font-medium text-slate-500">Duty Time</span></div>
                             <p className="text-xl font-bold text-slate-900 tracking-tight leading-none">{dutyHours}h {dutyMins}m</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between px-2 mb-4">
                          <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Bike size={14} /></div>
                              <div className="leading-tight"><h5 className="text-[13px] font-bold text-slate-800 leading-none">{completedRides} Trips</h5><p className="text-[10px] font-medium text-slate-400 mt-0.5">Completed Today</p></div>
                          </div>
                          <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500"><Star size={14} /></div>
                              <div className="leading-tight text-right"><h5 className="text-[13px] font-bold text-slate-800 leading-none">4.95</h5><p className="text-[10px] font-medium text-slate-400 mt-0.5">Avg. Rating</p></div>
                          </div>
                    </div>
                    {statusMessage && (
                        <p className="px-2 pb-3 text-[11px] font-medium text-slate-400 text-center">{statusMessage}</p>
                    )}
                    <Motion.button disabled={isHydratingDriver} whileTap={isHydratingDriver ? undefined : { scale: 0.98 }} onClick={isOnline ? goOffline : goOnline} className={`w-full h-13 rounded-xl flex items-center justify-center gap-3 text-[15px] font-bold transition-all shadow-lg relative ${isOnline ? 'bg-rose-600 text-white shadow-rose-600/10' : 'bg-slate-900 text-white shadow-slate-900/10'} ${isHydratingDriver ? 'opacity-70' : ''}`}>
                         <Power size={18} strokeWidth={2.5} className={isOnline || isHydratingDriver ? 'animate-pulse' : ''} />{isHydratingDriver ? 'Syncing Status...' : isOnline ? 'End Your Duty' : 'Go Online Now'}
                    </Motion.button>
                </Motion.div>
            </div>

            <DriverBottomNav />
        </div>
    );
};

export default DriverHome;
