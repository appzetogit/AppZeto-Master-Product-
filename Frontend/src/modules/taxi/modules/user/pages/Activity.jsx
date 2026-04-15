import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Calendar, ChevronRight, Clock, Headset, Loader2 } from 'lucide-react';
import BottomNavbar from '../components/BottomNavbar';
import api from '../../../shared/api/axiosInstance';
import { hasLocalUserToken } from '../services/authService';

const TABS = ['All', 'Rides', 'Parcels', 'Support'];

const unwrap = (response) => response?.data || response;

const formatRideDate = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const formatRideTime = (value) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const formatStatus = (status) => {
  const normalized = String(status || 'searching').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getRideTimeSource = (ride) => ride.completedAt || ride.startedAt || ride.acceptedAt || ride.createdAt || ride.updatedAt;

const coordLabel = (location, fallback) => {
  const coords = location?.coordinates || [];
  const [lng, lat] = coords;

  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  }

  return fallback;
};

const normalizeRide = (ride) => {
  const timeSource = getRideTimeSource(ride);
  const driverName = ride.driver?.name || 'Captain';
  const vehicle = ride.driver?.vehicleType || ride.vehicleIconType || 'Ride';
  const status = formatStatus(ride.status || ride.liveStatus);
  const pickup = coordLabel(ride.pickupLocation, 'Pickup');
  const drop = coordLabel(ride.dropLocation, 'Drop');

  return {
    id: ride.rideId || ride._id || ride.id,
    type: 'ride',
    title: status === 'Searching' ? 'Ride request' : `Ride with ${driverName}`,
    address: `${pickup} to ${drop}`,
    date: formatRideDate(timeSource),
    time: formatRideTime(timeSource),
    status,
    price: Number(ride.fare || 0).toFixed(0),
    ride,
    vehicle,
  };
};

const ActivityItem = ({ type, title, address, date, time, status, price, onClick }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full text-left bg-white/85 backdrop-blur-sm rounded-[22px] p-4 border border-white/80 shadow-[0_14px_34px_rgba(15,23,42,0.07)] flex items-center gap-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.09)] active:translate-y-0"
  >
    <div
      className="w-12 h-12 rounded-2xl border border-white/80 bg-white/70 shadow-sm flex items-center justify-center shrink-0 overflow-hidden"
    >
      <img
        src={type === 'ride' ? '/1_Bike.png' : '/5_Parcel.png'}
        alt={type === 'ride' ? 'Ride' : 'Parcel'}
        className="h-10 w-10 object-contain drop-shadow-[0_10px_18px_rgba(2,6,23,0.18)]"
        draggable={false}
      />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[15px] font-black text-slate-900 leading-tight truncate">{title}</h4>
          <p className="text-[12px] font-bold text-slate-500 mt-1 truncate max-w-[210px]">{address}</p>
        </div>
        <span className="text-[14px] font-black text-slate-900 shrink-0">₹{price}</span>
      </div>

      <div className="flex items-center gap-3 mt-2.5">
        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
          <Calendar size={11} strokeWidth={3} />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
          <Clock size={11} strokeWidth={3} />
          <span>{time}</span>
        </div>
        <span
          className={`ml-auto text-[9px] font-black px-2 py-1 rounded-full leading-none border ${
            status === 'Completed'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : status === 'Cancelled'
                ? 'bg-rose-50 text-rose-700 border-rose-100'
                : 'bg-amber-50 text-amber-700 border-amber-100'
          }`}
        >
          {status.toUpperCase()}
        </span>
      </div>
    </div>

    <div className="w-8 h-8 rounded-full bg-slate-50 border border-white/80 flex items-center justify-center text-slate-300 shadow-sm">
      <ChevronRight size={16} strokeWidth={3} />
    </div>
  </motion.button>
);

const Activity = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = location.pathname.startsWith('/taxi/user') ? '/taxi/user' : '';

  useEffect(() => {
    let active = true;

    const loadRideHistory = async () => {
      if (!hasLocalUserToken()) {
        setActivities([]);
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await api.get('/rides?limit=100');
        const payload = unwrap(response);
        const rides = payload?.results || payload?.data?.results || [];

        if (!active) {
          return;
        }

        setActivities(rides.map(normalizeRide).filter((ride) => ride.id));
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError?.message || 'Could not load your ride history.');
        setActivities([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRideHistory();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((activity) => {
      if (activeTab === 'All') return true;
      if (activeTab === 'Rides') return activity.type === 'ride';
      if (activeTab === 'Parcels') return activity.type === 'parcel';
      return false;
    });
  }, [activeTab]);

  const handleItemClick = (item) => {
    if (item.type === 'parcel') {
      navigate(`${routePrefix}/parcel/detail/${item.id}`);
    } else {
      navigate(`${routePrefix}/ride/detail/${item.id}`, { state: { ride: item.ride } });
    }
  };

  const helperText = activeTab === 'Support' ? 'Tickets and help requests' : 'Your recent trips and deliveries';

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#F8FAFC_0%,#F3F4F6_38%,#EEF2F7_100%)] max-w-lg mx-auto flex flex-col font-sans pb-24 relative overflow-hidden">
      <div className="absolute -top-20 right-[-40px] h-48 w-48 rounded-full bg-orange-100/55 blur-3xl pointer-events-none" />
      <div className="absolute top-64 left-[-60px] h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl pointer-events-none" />
      <div className="absolute bottom-24 right-[-40px] h-44 w-44 rounded-full bg-blue-100/50 blur-3xl pointer-events-none" />

      <header className="relative z-20 sticky top-0">
        <div className="bg-white/70 backdrop-blur-md border-b border-white/70 shadow-[0_10px_20px_rgba(15,23,42,0.05)]">
          <div className="px-5 pt-4 pb-3 flex items-start gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 active:scale-95 transition-all rounded-full">
              <ArrowLeft size={22} className="text-slate-900" strokeWidth={3} />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">My bookings</p>
              <h1 className="mt-1 text-[18px] font-black text-slate-900 tracking-tight leading-none truncate">
                Recent activity
              </h1>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{helperText}</p>
            </div>
          </div>

          <div className="px-5 pb-4">
            <div className="inline-flex max-w-full gap-1.5 overflow-x-auto no-scrollbar rounded-full border border-white/80 bg-white/75 p-1 shadow-sm">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.16em] transition-all active:scale-[0.99] ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white shadow-[0_10px_18px_rgba(15,23,42,0.18)]'
                      : 'text-slate-500 hover:bg-white/80'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 flex-1 px-5 pt-4">
        {activeTab === 'Support' ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-5"
          >
            <div className="w-20 h-20 bg-white/80 border border-white/80 shadow-sm rounded-3xl flex items-center justify-center">
              <Headset size={36} className="text-orange-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-[17px] font-black text-slate-900">No support tickets</h3>
              <p className="text-[13px] font-bold text-slate-500">You haven't raised any support tickets yet.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`${routePrefix}/support`)}
              className="mt-2 bg-slate-900 text-white px-7 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.18em] shadow-[0_16px_34px_rgba(15,23,42,0.18)] active:scale-95 transition-all"
            >
              Contact Us
            </button>
          </motion.div>
        ) : loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-3"
          >
            <div className="w-14 h-14 rounded-3xl bg-white/80 border border-white/80 shadow-sm flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-orange-500" strokeWidth={3} />
            </div>
            <p className="text-[15px] font-black text-slate-500">Loading your trips</p>
          </motion.div>
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-3"
          >
            <div className="w-14 h-14 rounded-3xl bg-white/80 border border-white/80 shadow-sm flex items-center justify-center">
              <AlertCircle size={24} className="text-rose-500" strokeWidth={3} />
            </div>
            <p className="text-[15px] font-black text-slate-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 bg-slate-900 text-white px-6 py-3 rounded-full text-[12px] font-black uppercase tracking-[0.18em] shadow-sm active:scale-95 transition-all"
            >
              Retry
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center gap-3"
          >
            <div className="w-14 h-14 rounded-3xl bg-white/80 border border-white/80 shadow-sm flex items-center justify-center text-slate-400 text-[22px] font-black">
              —
            </div>
            <p className="text-[15px] font-black text-slate-500">No {activeTab.toLowerCase()} found</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((activity) => (
              <ActivityItem key={activity.id} {...activity} onClick={() => handleItemClick(activity)} />
            ))}
          </div>
        )}
      </div>

      <BottomNavbar />
    </div>
  );
};

export default Activity;
