import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation } from 'lucide-react';
import { GoogleMap } from '@react-google-maps/api';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';
import {
  getSavedTaxiLocation,
  saveTaxiLocation,
} from '../services/savedLocation';
const DEFAULT_CENTER = { lat: 17.385, lon: 78.4867 };
const DEFAULT_ZOOM = 16;
const MAP_CONTAINER_STYLE = { width: '100%', height: '100%' };

const LocationMapSection = () => {
  const [coords, setCoords] = useState(null);
  const [centerCoords, setCenterCoords] = useState(DEFAULT_CENTER);
  const [status, setStatus] = useState('idle');
  const [isDragging, setIsDragging] = useState(false);
  const [map, setMap] = useState(null);
  const isDraggingRef = useRef(false);
  const { isLoaded, loadError } = useAppGoogleMapsLoader();

  const persistCoords = (next) => {
    setCoords(next);
    setCenterCoords(next);
    setStatus('ready');
    saveTaxiLocation(next);
  };

  const persistAddress = (address) => {
    saveTaxiLocation({ address: String(address || '').trim() });
  };

  useEffect(() => {
    const saved = getSavedTaxiLocation();
    if (Number.isFinite(saved?.lat) && Number.isFinite(saved?.lng)) {
      const next = { lat: saved.lat, lon: saved.lng };
      setCoords(next);
      setCenterCoords(next);
      setStatus('ready');
    }
  }, []);

  useEffect(() => {
    if (coords && map) {
      map.panTo({ lat: coords.lat, lng: coords.lon });
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [coords, map]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        persistCoords(next);
        if (map) {
          map.panTo({ lat: next.lat, lng: next.lon });
          map.setZoom(DEFAULT_ZOOM);
        }

        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: next.lat, lng: next.lon } }, (results, geocodeStatus) => {
            if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
              try {
                persistAddress(results[0].formatted_address);
              } catch {
                // ignore
              }
            }
          });
        }
      },
      (error) => {
        if (error?.code === 1) {
          setStatus('denied');
          return;
        }
        setStatus('error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 },
    );
  };

  const helperText = (() => {
    if (status === 'loading') return 'Pinning your current location...';
    if (status === 'denied') return 'Location permission denied. Tap to try again.';
    if (status === 'error') return 'Unable to fetch location. Tap to retry.';
    if (isDragging) return 'Move the map to set the pin.';
    if (status === 'ready') return 'Drag the map to fine-tune. Tap Update to refresh GPS.';
    return 'Pin your current location, then adjust by dragging.';
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="px-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">Map</p>
          <h3 className="mt-0.5 flex items-baseline gap-1 text-[16px] font-black tracking-tight text-slate-900">
            <span className="truncate">Pin your location</span>
            <span className="inline-flex" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="inline-block"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{
                    duration: 1.05,
                    delay: dot * 0.18,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  .
                </motion.span>
              ))}
            </span>
          </h3>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{helperText}</p>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={requestLocation}
          className="inline-flex items-center gap-2.5 rounded-full border border-white/60 bg-white/95 px-3 py-2 text-[11px] font-black text-slate-800 shadow-[0_8px_16px_-4px_rgba(15,23,42,0.1)] transition-all active:shadow-inner"
        >
          <div className="relative">
            <Navigation 
              size={14} 
              strokeWidth={2.8} 
              className={`transition-colors ${status === 'loading' ? 'animate-pulse text-emerald-600' : 'text-slate-500'}`} 
            />
            {coords && (
              <motion.span
                layoutId="active-dot"
                className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <span className="uppercase tracking-wider">{coords ? 'Update' : 'Pin'}</span>
        </motion.button>
      </div>

      <div className="relative mt-3 rounded-[20px] bg-[linear-gradient(135deg,rgba(16,185,129,0.40)_0%,rgba(56,189,248,0.22)_50%,rgba(251,146,60,0.16)_100%)] p-[1px] shadow-[0_0_0_1px_rgba(16,185,129,0.10),0_10px_22px_rgba(15,23,42,0.06)]">
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 rounded-[20px] blur-xl"
          animate={{ opacity: [0.14, 0.26, 0.14] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background:
              'linear-gradient(135deg, rgba(16,185,129,0.22) 0%, rgba(56,189,248,0.14) 52%, rgba(251,146,60,0.10) 100%)',
          }}
        />

        <div className="relative z-10 overflow-hidden rounded-[19px] border border-white/70 bg-white/85">
          <div className="relative h-[170px] w-full">
            {!HAS_VALID_GOOGLE_MAPS_KEY && (
              <div className="flex h-full w-full items-center justify-center px-5 text-center">
                <div>
                  <p className="text-[12px] font-black text-slate-900">Google Maps key missing</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">Add `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && loadError && (
              <div className="flex h-full w-full items-center justify-center px-5 text-center">
                <div>
                  <p className="text-[12px] font-black text-slate-900">Map failed to load</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">Check your Google Maps browser key restrictions.</p>
                </div>
              </div>
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && !isLoaded && (
              <div className="h-full w-full bg-[linear-gradient(135deg,#f8fafc_0%,#eef2f7_55%,#e2e8f0_100%)]" />
            )}

            {HAS_VALID_GOOGLE_MAPS_KEY && !loadError && isLoaded && (
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={{ lat: centerCoords.lat, lng: centerCoords.lon }}
                zoom={DEFAULT_ZOOM}
                onLoad={(nextMap) => setMap(nextMap)}
                onUnmount={() => setMap(null)}
                onDragStart={() => {
                  isDraggingRef.current = true;
                  setIsDragging(true);
                }}
                onDragEnd={() => {
                  isDraggingRef.current = false;
                  setIsDragging(false);
                  if (!map) {
                    return;
                  }

                  const center = map.getCenter();
                  if (!center) {
                    return;
                  }

                  persistCoords({ lat: center.lat(), lon: center.lng() });
                  if (window.google?.maps?.Geocoder) {
                    const geocoder = new window.google.maps.Geocoder();
                    geocoder.geocode(
                      { location: { lat: center.lat(), lng: center.lng() } },
                      (results, geocodeStatus) => {
                        if (geocodeStatus === 'OK' && results?.[0]?.formatted_address) {
                          persistAddress(results[0].formatted_address);
                        }
                      },
                    );
                  }
                }}
                onIdle={() => {
                  if (!map) {
                    return;
                  }

                  const center = map.getCenter();
                  if (!center) {
                    return;
                  }

                  const next = { lat: center.lat(), lon: center.lng() };
                  setCenterCoords(next);

                  if (!isDraggingRef.current && status === 'ready') {
                    saveTaxiLocation(next);
                  }
                }}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  clickableIcons: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  mapTypeControl: false,
                  gestureHandling: 'greedy',
                }}
              />
            )}

            {/* The Pinpoint */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2">
              <motion.div
                initial={false}
                animate={{
                  scale: isDragging ? [1, 1.28, 1.16] : 1,
                  opacity: isDragging ? 0.22 : 0.38,
                  y: isDragging ? 8 : 3,
                }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="absolute left-1/2 top-[44px] h-[5px] w-5 -translate-x-1/2 rounded-full bg-slate-900/25 blur-[2px]"
              />

              <motion.div
                initial={false}
                animate={{
                  y: isDragging ? -30 : -8,
                  rotate: isDragging ? -4 : 0,
                  scale: isDragging ? 1.04 : 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: isDragging ? 450 : 350,
                  damping: 25,
                }}
                className="relative flex flex-col items-center -translate-y-full"
              >
                <div className="relative flex flex-col items-center">
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white/85 bg-[linear-gradient(180deg,#34d399_0%,#10b981_100%)] shadow-[0_14px_26px_-8px_rgba(16,185,129,0.45)]">
                    <MapPin size={18} strokeWidth={2.9} className="text-white" />
                    <div className="absolute inset-[8px] rounded-full border border-white/25" />
                  </div>
                  <div className="-mt-1 h-5 w-[3px] rounded-full bg-[linear-gradient(180deg,#10b981_0%,#047857_100%)] shadow-[0_6px_12px_rgba(4,120,87,0.25)]" />
                  <div className="-mt-1.5 h-2.5 w-2.5 rotate-45 rounded-[3px] bg-[#065f46]" />
                </div>
              </motion.div>
            </div>

            {!coords && status !== 'loading' && (
              <button
                type="button"
                onClick={requestLocation}
                className="absolute bottom-2 left-2 z-20 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm active:scale-[0.99]"
              >
                Use my location
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10px] font-bold text-slate-400">
        {centerCoords.lat.toFixed(5)}, {centerCoords.lon.toFixed(5)} · Google Maps
      </p>
    </motion.section>
  );
};

export default LocationMapSection;
