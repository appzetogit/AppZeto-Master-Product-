import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Phone,
    ShieldAlert,
    Check,
    Banknote,
    Wallet,
    QrCode,
    Scan,
    ChevronRight,
    Star,
    CheckCircle2,
    Package,
    User,
    ArrowUpRight,
    ArrowLeft,
    Clock3,
    MapPinned,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';
import { socketService } from '../../../shared/api/socket';
import api from '../../../shared/api/axiosInstance';
import carIcon from '../../../assets/icons/car.png';
import { getLocalDriverToken } from '../services/registrationService';

const MAP_CONTAINER_STYLE = {
    width: '100%',
    height: '100%',
};

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const DEFAULT_DRIVER_COORDS = [75.8577, 22.7196];

const mapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
];

const toLatLng = (coordinates, fallback = DEFAULT_CENTER) => {
    const [lng, lat] = coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
    }

    return fallback;
};

const createOffsetPosition = (position, latOffset = -0.0045, lngOffset = -0.0035) => ({
    lat: Number(position?.lat ?? DEFAULT_CENTER.lat) + latOffset,
    lng: Number(position?.lng ?? DEFAULT_CENTER.lng) + lngOffset,
});

const arePositionsNearlyEqual = (first, second, threshold = 0.0002) => (
    Math.abs(Number(first?.lat ?? 0) - Number(second?.lat ?? 0)) < threshold &&
    Math.abs(Number(first?.lng ?? 0) - Number(second?.lng ?? 0)) < threshold
);

const formatAddressFromPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
};

const normalizeTripType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

const getTripTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

const buildFallbackRoute = (origin, destination) => [origin, destination];
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

const createTaxiMarkerIcon = () => ({
    url: carIcon,
    scaledSize: new window.google.maps.Size(44, 44),
    anchor: new window.google.maps.Point(22, 22),
});

const getCurrentCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Location is not available on this device.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Please allow location permission to continue tracking.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
});

const ActiveTrip = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = useMemo(() => location.state || {}, [location.state]);
    const [hydratedTripState, setHydratedTripState] = useState(null);
    const [isHydratingTrip, setIsHydratingTrip] = useState(!routeState?.rideId && !routeState?.request?.rideId);

    useEffect(() => {
        let active = true;

        if (routeState?.rideId || routeState?.request?.rideId) {
            setIsHydratingTrip(false);
            return () => {
                active = false;
            };
        }

        const hydrateTripState = async () => {
            try {
                const driverToken = getLocalDriverToken();
                const [activeDelivery, activeRide] = await Promise.allSettled([
                    api.get('/deliveries/active/me', withDriverAuthorization(driverToken)),
                    api.get('/rides/active/me', withDriverAuthorization(driverToken)),
                ]);

                if (!active) {
                    return;
                }

                const deliveryPayload =
                    activeDelivery.status === 'fulfilled' ? unwrapApiPayload(activeDelivery.value) : null;
                const ridePayload =
                    activeRide.status === 'fulfilled' ? unwrapApiPayload(activeRide.value) : null;

                const currentJob = deliveryPayload?.rideId
                    ? deliveryPayload
                    : ridePayload?.rideId
                        ? ridePayload
                        : null;

                if (!currentJob?.rideId) {
                    navigate('/taxi/driver/home', { replace: true });
                    return;
                }

                const currentType = normalizeTripType(currentJob);

                setHydratedTripState({
                    type: currentType,
                    rideId: currentJob.rideId,
                    request: {
                        type: currentType,
                        title: getTripTitle(currentType),
                        fare: `Rs ${currentJob.fare || 0}`,
                        payment: currentJob.paymentMethod || 'Cash',
                        pickup: currentJob.pickupAddress || formatAddressFromPoint(currentJob.pickupLocation, 'Pickup Location'),
                        drop: currentJob.dropAddress || formatAddressFromPoint(currentJob.dropLocation, 'Drop Location'),
                        requestId: currentJob.rideId,
                        rideId: currentJob.rideId,
                        raw: currentJob,
                    },
                    currentDriverCoords: currentJob.lastDriverLocation?.coordinates || null,
                });
            } catch {
                if (active) {
                    navigate('/taxi/driver/home', { replace: true });
                }
            } finally {
                if (active) {
                    setIsHydratingTrip(false);
                }
            }
        };

        hydrateTripState();

        return () => {
            active = false;
        };
    }, [navigate, routeState]);

    const effectiveState = hydratedTripState || routeState;

    const tripType = effectiveState?.type || 'ride';
    const isParcel = tripType === 'parcel';
    const liveRequest = effectiveState?.request || {};
    const liveRaw = liveRequest.raw || {};
    const rideId = liveRequest?.rideId || effectiveState?.rideId || '';

    const pickupCoords = liveRaw.pickupLocation?.coordinates || effectiveState?.pickupCoords || DEFAULT_DRIVER_COORDS;
    const dropCoords = useMemo(
        () => liveRaw.dropLocation?.coordinates || effectiveState?.dropCoords || [75.8937, 22.7533],
        [effectiveState?.dropCoords, liveRaw.dropLocation?.coordinates],
    );
    const assignedDriverCoords =
        liveRaw.driverLocation?.coordinates ||
        liveRequest.driverLocation?.coordinates ||
        effectiveState?.driverCoords ||
        effectiveState?.currentDriverCoords ||
        null;

    const pickupPosition = useMemo(() => toLatLng(pickupCoords), [pickupCoords]);
    const dropPosition = useMemo(() => toLatLng(dropCoords), [dropCoords]);
    const initialDriverPosition = useMemo(
        () => assignedDriverCoords ? toLatLng(assignedDriverCoords, pickupPosition) : createOffsetPosition(pickupPosition),
        [assignedDriverCoords, pickupPosition],
    );

    const [phase, setPhase] = useState('to_pickup');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [selectedRating, setSelectedRating] = useState(0);
    const [driverPaymentStatus, setDriverPaymentStatus] = useState('pending');
    const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
    const [map, setMap] = useState(null);
    const [driverPosition, setDriverPosition] = useState(initialDriverPosition);
    const [routePath, setRoutePath] = useState([]);
    const [routeError, setRouteError] = useState('');
    const { isLoaded, loadError } = useAppGoogleMapsLoader();

    const activeDestination = phase === 'to_pickup' || phase === 'otp_verification' ? pickupPosition : dropPosition;

    const tripData = isParcel ? {
        sender: {
            name: liveRaw.parcel?.senderName || 'Sender',
            rating: '5.0',
            phone: liveRaw.parcel?.senderMobile || '',
        },
        receiver: {
            name: liveRaw.parcel?.receiverName || 'Receiver',
            phone: liveRaw.parcel?.receiverMobile || '',
        },
        pickup: liveRaw.pickupAddress || liveRequest?.pickup || formatAddressFromPoint(liveRaw.pickupLocation, 'Flat 402, Swamclose Apts, JP Nagar'),
        drop: liveRaw.dropAddress || liveRequest?.drop || formatAddressFromPoint(liveRaw.dropLocation, 'Tea Villa Cafe, 12th Main, HSR Layout'),
        fare: `Rs ${liveRaw.fare || effectiveState?.fare || 120}`,
        payment: effectiveState?.paymentMethod || 'Online'
    } : {
        user: {
            name: liveRaw.user?.name || liveRequest?.user?.name || 'Passenger',
            rating: liveRaw.user?.rating || liveRequest?.user?.rating || '4.8',
            phone: liveRaw.user?.phone || liveRequest?.user?.phone || '',
        },
        pickup: liveRaw.pickupAddress || liveRequest?.pickup || formatAddressFromPoint(liveRaw.pickupLocation, 'Swamclose Apartments, JP Nagar'),
        drop: liveRaw.dropAddress || liveRequest?.drop || formatAddressFromPoint(liveRaw.dropLocation, 'Tea Villa Cafe, HSR Layout'),
        fare: `Rs ${liveRaw.fare || effectiveState?.fare || 120}`,
        payment: liveRequest?.payment || effectiveState?.paymentMethod || 'Online'
    };

    const displayFare = liveRequest?.fare || tripData.fare;
    const expectedOtp = String(liveRequest?.otp || effectiveState?.otp || '1234');

    const publishRideStatus = (nextStatus) => {
        if (!rideId) {
            return;
        }

        socketService.emit('ride:status:update', { rideId, status: nextStatus });
    };

    const startTripAfterOtp = (enteredOtp) => {
        if (String(enteredOtp).length !== 4) {
            setOtpError('Enter the full 4 digit PIN.');
            return;
        }

        if (String(enteredOtp) !== expectedOtp) {
            setOtpError('Wrong PIN. Ask the passenger again.');
            return;
        }

        setOtpError('');
        setPhase('in_trip');
        publishRideStatus('started');
    };

    useEffect(() => {
        setDriverPosition(initialDriverPosition);
    }, [initialDriverPosition]);

    useEffect(() => {
        let watchId = null;
        let cancelled = false;
        const socket = socketService.connect({ role: 'driver' });
        const leaveCancelledRide = (payload = {}) => {
            if (!rideId || String(payload.rideId || '') !== String(rideId)) {
                return;
            }

            navigate('/taxi/driver/home', {
                replace: true,
                state: {
                    rideClosedReason: payload.message || payload.reason || 'Ride was cancelled.',
                },
            });
        };

        if (socket && rideId) {
            socketService.emit('ride:join', { rideId });
        }

        socketService.on('rideRequestClosed', leaveCancelledRide);
        socketService.on('rideCancelled', leaveCancelledRide);

        getCurrentCoords()
            .then((position) => {
                if (!cancelled) {
                    setDriverPosition(position);
                    if (rideId) {
                        socketService.emit('ride:driver-location:update', {
                            rideId,
                            coordinates: [position.lng, position.lat],
                        });
                    }
                }
            })
            .catch(() => {});

        if (!navigator.geolocation) {
            return () => {
                cancelled = true;
                socketService.off('rideRequestClosed', leaveCancelledRide);
                socketService.off('rideCancelled', leaveCancelledRide);
            };
        }

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (cancelled) {
                    return;
                }

                const nextPosition = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };

                setDriverPosition(nextPosition);

                if (rideId) {
                    socketService.emit('ride:driver-location:update', {
                        rideId,
                        coordinates: [nextPosition.lng, nextPosition.lat],
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                    });
                }
            },
            () => {},
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000,
            },
        );

        return () => {
            cancelled = true;
            socketService.off('rideRequestClosed', leaveCancelledRide);
            socketService.off('rideCancelled', leaveCancelledRide);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [navigate, rideId]);

    useEffect(() => {
        if (!isLoaded || !window.google?.maps?.DirectionsService) {
            setRoutePath(buildFallbackRoute(driverPosition, activeDestination));
            setRouteError('');
            return;
        }

        if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
            setRoutePath([driverPosition]);
            setRouteError('');
            return;
        }

        let active = true;
        const directionsService = new window.google.maps.DirectionsService();

        directionsService.route(
            {
                origin: driverPosition,
                destination: activeDestination,
                travelMode: window.google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false,
            },
            (result, status) => {
                if (!active) {
                    return;
                }

                if (status === 'OK' && result?.routes?.[0]?.overview_path?.length) {
                    setRoutePath(
                        result.routes[0].overview_path.map((point) => ({
                            lat: point.lat(),
                            lng: point.lng(),
                        })),
                    );
                    setRouteError('');
                    return;
                }

                setRoutePath(buildFallbackRoute(driverPosition, activeDestination));
                setRouteError(status || 'Directions unavailable');
            },
        );

        return () => {
            active = false;
        };
    }, [activeDestination, driverPosition, isLoaded]);

    useEffect(() => {
        if (!map || !window.google?.maps) {
            return;
        }

        if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
            map.setCenter(driverPosition);
            map.setZoom(15);
            return;
        }

        const bounds = new window.google.maps.LatLngBounds();

        if (routePath.length > 1) {
            routePath.forEach((point) => bounds.extend(point));
            bounds.extend(driverPosition);
            bounds.extend(activeDestination);
            map.fitBounds(bounds, 72);
            return;
        }

        bounds.extend(driverPosition);
        bounds.extend(activeDestination);
        map.fitBounds(bounds, 80);
    }, [activeDestination, driverPosition, map, routePath]);

    const handleOTPChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const nextOtp = [...otp];
        nextOtp[index] = value;
        setOtp(nextOtp);

        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }

        setOtpError('');

        if (nextOtp.join('').length === 4 && nextOtp.join('') === expectedOtp) {
            setTimeout(() => startTripAfterOtp(nextOtp.join('')), 250);
        }
    };

    const handleOTPKeyDown = (index, event) => {
        if (event.key !== 'Backspace') {
            return;
        }

        if (otp[index]) {
            const nextOtp = [...otp];
            nextOtp[index] = '';
            setOtp(nextOtp);
            setOtpError('');
            return;
        }

        if (index > 0) {
            const previousInput = document.getElementById(`otp-${index - 1}`);
            if (previousInput) {
                previousInput.focus();
            }
        }
    };

    const mapOptions = useMemo(() => ({
        styles: mapStyles,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
    }), []);

    return (
        <div className="relative mx-auto min-h-[100dvh] max-w-lg overflow-hidden bg-slate-200 font-sans select-none">
            {isHydratingTrip && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-200/90 backdrop-blur-sm">
                    <div className="rounded-[16px] bg-white/95 px-4 py-3 shadow-sm text-[12px] font-semibold text-slate-700">
                        Restoring active trip...
                    </div>
                </div>
            )}
            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-200">
                {!HAS_VALID_GOOGLE_MAPS_KEY ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
                        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[12px] font-semibold text-slate-900">Google Maps key missing</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
                        </div>
                    </div>
                ) : loadError ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
                        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[12px] font-semibold text-slate-900">Google Maps failed to load</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">Check the browser key restrictions and reload.</p>
                        </div>
                    </div>
                ) : isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={pickupPosition}
                        zoom={14}
                        onLoad={setMap}
                        onUnmount={() => setMap(null)}
                        options={mapOptions}
                    >
                        {routePath.length > 1 && (
                            <PolylineF
                                path={routePath}
                                options={{
                                    strokeColor: '#111827',
                                    strokeOpacity: 0.9,
                                    strokeWeight: 5,
                                }}
                            />
                        )}
                        <MarkerF
                            position={driverPosition}
                            title="Driver"
                            icon={createTaxiMarkerIcon()}
                        />
                        <MarkerF
                            position={activeDestination}
                            title={phase === 'to_pickup' || phase === 'otp_verification' ? 'Pickup' : 'Drop'}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                fillColor: phase === 'to_pickup' || phase === 'otp_verification' ? '#10b981' : '#ef4444',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                                scale: 7,
                            }}
                        />
                    </GoogleMap>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200">
                        <div className="rounded-[16px] bg-white/90 px-4 py-3 shadow-sm text-[12px] font-semibold text-slate-700">
                            Loading map
                        </div>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/70 via-white/25 to-transparent pointer-events-none" />

                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-8 left-4 z-50 w-10 h-10 rounded-2xl bg-white/95 border border-white/80 shadow-lg flex items-center justify-center"
                >
                    <ArrowLeft size={18} className="text-slate-900" />
                </button>

                <div className="absolute top-8 left-16 right-4 z-50 flex items-center gap-3 bg-slate-900/92 backdrop-blur-xl p-3 rounded-2xl border border-white/10 shadow-2xl">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-slate-900 shadow-xl ${isParcel ? 'bg-orange-500' : 'bg-white'}`}>
                        {isParcel ? <Package size={20} strokeWidth={2.5} /> : <img src={carIcon} alt="Taxi" className="h-7 w-7 object-contain" />}
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                        <h4 className="text-[9px] font-semibold uppercase tracking-wide leading-none flex items-center gap-2 text-amber-300">
                            Driver Live
                            <ArrowUpRight size={12} strokeWidth={3} />
                        </h4>
                        <p className="text-[13px] font-semibold text-white leading-tight truncate uppercase">
                            {driverPosition.lat.toFixed(4)}, {driverPosition.lng.toFixed(4)}
                        </p>
                    </div>
                </div>

                <div className="absolute top-28 left-4 right-4 z-40 grid grid-cols-[minmax(0,1.25fr)_minmax(72px,0.75fr)_minmax(104px,1fr)] gap-2">
                    <div className="min-w-0 rounded-2xl bg-white/92 border border-white/80 shadow-lg px-3 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Trip Stage</p>
                        <p className="text-[11px] font-black text-slate-900 mt-1 truncate">
                            {phase === 'to_pickup' ? 'Heading To Pickup' : phase === 'otp_verification' ? 'Verify OTP' : phase === 'in_trip' ? 'On Trip' : phase === 'payment_confirm' ? 'Collect Payment' : 'Complete'}
                        </p>
                    </div>
                    <div className="min-w-0 rounded-2xl bg-white/92 border border-white/80 shadow-lg px-3 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">ETA</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Clock3 size={12} className="text-orange-500" />
                            <p className="text-[11px] font-black text-slate-900 truncate">{phase === 'to_pickup' ? '2 mins' : '12 mins'}</p>
                        </div>
                    </div>
                    <div className="min-w-0 rounded-2xl bg-white/92 border border-white/80 shadow-lg px-3 py-2">
                        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Route</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <MapPinned size={12} className="shrink-0 text-slate-500" />
                            <p className="truncate text-[11px] font-black text-slate-900">{phase === 'to_pickup' ? 'Pickup First' : 'To Destination'}</p>
                        </div>
                    </div>
                </div>

                {routeError && (
                    <div className="absolute top-44 right-4 z-40 rounded-2xl bg-white/92 border border-amber-100 shadow-lg px-3 py-2 min-w-[148px]">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-amber-500">Route</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-700">Using fallback path while directions load.</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-40">
                <AnimatePresence mode="wait">
                    {phase === 'to_pickup' && (
                        <motion.div
                            key="to_pickup"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-5 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center">
                                        {isParcel ? <Package size={22} className="text-slate-900" /> : <User size={22} className="text-slate-400" />}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[15px] font-semibold text-slate-900 tracking-tight uppercase">
                                            {isParcel ? tripData.sender.name : tripData.user.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <Star size={10} fill="#f0c419" className="text-yellow-500" />
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                                                {isParcel ? tripData.sender.rating : tripData.user.rating} • 1.2 KM
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-transform"><MessageSquare size={18} strokeWidth={2.5} /></button>
                                    <button className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-500 active:scale-95 transition-transform"><Phone size={18} strokeWidth={2.5} /></button>
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setPhase('otp_verification');
                                    publishRideStatus('arriving');
                                }}
                                className="w-full h-15 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-lg shadow-slate-900/20"
                            >
                                {isParcel ? 'Arrived at Sender' : 'I Have Arrived'} <CheckCircle2 size={18} strokeWidth={3} />
                            </motion.button>
                        </motion.div>
                    )}

                    {phase === 'otp_verification' && (
                        <motion.div
                            key="otp_verification"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-semibold text-slate-900 tracking-tight uppercase leading-none">Security Pin</h3>
                                <p className="text-[10px] font-bold text-slate-400 tracking-wide uppercase mt-2">
                                    Ask <span className="text-slate-900">{isParcel ? 'Sender' : 'Passenger'}</span> for Start PIN
                                </p>
                            </div>
                            <div className="flex justify-center gap-3 mb-8">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="tel"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOTPChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                                        className="w-12 h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-semibold text-slate-900 focus:outline-none focus:border-slate-900 transition-all shadow-inner"
                                    />
                                ))}
                            </div>
                            {otpError && (
                                <p className="-mt-5 mb-5 text-center text-[11px] font-black text-red-500 uppercase tracking-wider">
                                    {otpError}
                                </p>
                            )}
                            <button
                                onClick={() => startTripAfterOtp(otp.join(''))}
                                className="mb-3 h-13 w-full rounded-xl bg-slate-900 text-[12px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/15 active:scale-95 transition-all"
                            >
                                Submit PIN
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => {
                                    setPhase('to_pickup');
                                    publishRideStatus('accepted');
                                }} className="flex-1 h-13 border-2 border-slate-100 text-slate-400 rounded-xl text-[12px] font-semibold uppercase tracking-wide active:scale-95 transition-all">Go Back</button>
                                <button className="flex-1 h-13 bg-slate-100 text-slate-900 rounded-xl text-[12px] font-semibold uppercase tracking-wide active:scale-95 transition-all">Support</button>
                            </div>
                        </motion.div>
                    )}

                    {phase === 'in_trip' && (
                        <motion.div
                            key="in_trip"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-5 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="mb-5 rounded-[22px] border border-slate-100 bg-slate-50/85 px-4 py-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[9px] font-semibold text-rose-500 uppercase tracking-[0.22em] leading-none mb-1.5">Destination</h4>
                                        <p className="text-[15px] font-semibold text-slate-900 tracking-tight leading-5 break-words">
                                            {tripData.drop}
                                        </p>
                                    </div>
                                    <button className="shrink-0 w-11 h-11 bg-white text-rose-500 rounded-xl border border-rose-100 flex items-center justify-center active:scale-90 transition-transform shadow-sm">
                                        <ShieldAlert size={22} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-3 mb-6 border border-slate-100 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                                        {isParcel ? <Package size={18} className="text-white" /> : <User size={18} className="text-white opacity-40" />}
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                        <p className="text-[13px] font-semibold text-slate-900 leading-none uppercase truncate">{isParcel ? tripData.receiver.name : tripData.user.name}</p>
                                        <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">{isParcel ? 'Receiver' : 'Passenger'}</p>
                                    </div>
                                </div>
                                <button className="shrink-0 w-9 h-9 bg-white rounded-lg border border-slate-100 flex items-center justify-center text-emerald-500"><Phone size={16} strokeWidth={2.5} /></button>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={() => {
                                    setPhase('payment_confirm');
                                }}
                                className="w-full h-15 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-xl"
                            >
                                {isParcel ? 'Deliver Parcel' : 'Arrived at Destination'} <ChevronRight size={18} strokeWidth={3} />
                            </motion.button>
                        </motion.div>
                    )}

                    {phase === 'payment_confirm' && (
                        <motion.div
                            key="payment_confirm"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg transition-all duration-500 ${driverPaymentStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                    {driverPaymentStatus === 'success' ? <Check size={32} strokeWidth={4} /> : <QrCode size={32} strokeWidth={2} />}
                                </div>
                                <h2 className="text-2xl font-semibold text-slate-900 uppercase">
                                    {driverPaymentStatus === 'success' ? 'Payment Success!' : 'Collect Amount'}
                                </h2>
                                <p className="text-[12px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                                    Fare: <span className="text-slate-900 font-semibold text-lg ml-1">{displayFare}</span>
                                </p>
                            </div>
                            {driverPaymentStatus === 'pending' && (
                                <div className="grid grid-cols-3 gap-3 mb-6">
                                    {[
                                        { id: 'cash', label: 'Cash', icon: Banknote },
                                        { id: 'online', label: 'Online', icon: Scan },
                                        { id: 'wallet', label: 'Wallet', icon: Wallet }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => {
                                                setSelectedPaymentMode(mode.id);
                                                setDriverPaymentStatus(mode.id === 'online' ? 'qr_generated' : 'success');
                                            }}
                                            className={`flex flex-col items-center justify-center py-4 rounded-2xl border-2 transition-all ${selectedPaymentMode === mode.id ? 'border-slate-900 bg-slate-50' : 'border-slate-50 bg-slate-50/50'}`}
                                        >
                                            <mode.icon size={22} className={selectedPaymentMode === mode.id ? 'text-slate-900' : 'text-slate-400'} strokeWidth={2.5} />
                                            <span className="text-[9px] font-semibold text-slate-900 uppercase tracking-wide mt-2">{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {driverPaymentStatus === 'qr_generated' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900 rounded-3xl p-6 mb-6 text-center shadow-2xl">
                                    <div className="bg-white p-4 rounded-2xl inline-block mb-3 relative overflow-hidden">
                                        <QrCode size={90} className="text-slate-900 opacity-90" />
                                        <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute left-0 w-full h-0.5 bg-slate-200" />
                                    </div>
                                    <p className="text-white font-semibold text-sm uppercase tracking-wide mb-4">Scan Code - {displayFare}</p>
                                    <button onClick={() => setDriverPaymentStatus('success')} className="w-full py-3 bg-white/10 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wide border border-white/5">Confirm Received</button>
                                </motion.div>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                disabled={driverPaymentStatus !== 'success'}
                                onClick={() => setPhase('review')}
                                className={`w-full h-15 rounded-xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-xl transition-all ${driverPaymentStatus === 'success' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-300 pointer-events-none'}`}
                            >
                                {driverPaymentStatus === 'success' ? 'Finalize Earnings' : 'Waiting...'} <ChevronRight size={18} strokeWidth={3} />
                            </motion.button>
                        </motion.div>
                    )}

                    {phase === 'review' && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-50 text-center"
                        >
                            <div className="mb-8 space-y-4">
                                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto shadow-lg"><User size={24} className="text-white" /></div>
                                <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight">Rate Experience</h3>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((score) => (
                                        <Star
                                            key={score}
                                            size={28}
                                            onClick={() => setSelectedRating(score)}
                                            className={`transition-all ${score <= selectedRating ? 'text-yellow-500' : 'text-slate-100'}`}
                                            fill={score <= selectedRating ? 'currentColor' : 'transparent'}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => {
                                publishRideStatus('completed');
                                navigate('/taxi/driver/home');
                            }} className="w-full h-15 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-xl active:scale-95 transition-all">Done <Check size={20} strokeWidth={4} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ActiveTrip;
