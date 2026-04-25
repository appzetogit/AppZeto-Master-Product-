import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Hotel, Users, Plus, CheckCircle, X, AlertTriangle, List,
    Globe, Briefcase, Lock, Check
} from 'lucide-react';
import { propertyService, availabilityService } from '../../../services/apiService';

const PartnerInventory = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // State
    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState(null);
    const [roomTypes, setRoomTypes] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [availabilityMap, setAvailabilityMap] = useState({});

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTab, setModalTab] = useState('walk_in'); // walk_in, external, block
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        units: 1,
        source: 'walk_in',
        platform: '', // For external
        referenceNo: '', // For external
        notes: '' // For block
    });

    // Initial Fetch
    useEffect(() => {
        const fetchProperty = async () => {
            try {
                const res = await propertyService.getDetails(id);
                setProperty(res.property);
                const rooms = res.roomTypes || [];
                setRoomTypes(rooms);
                if (rooms.length > 0) {
                    setSelectedRoom(rooms[0]);
                }
            } catch (error) {
                console.error("Failed to load property", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProperty();
    }, [id]);

    // Fetch Availability when Month or Room changes
    useEffect(() => {
        if (!selectedRoom) return;

        const fetchAvailability = async () => {
            try {
                // Get start and end of current month view
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);

                const res = await availabilityService.check({
                    propertyId: id,
                    checkIn: firstDay.toISOString(),
                    checkOut: lastDay.toISOString()
                });

                // Map API response to a quick lookup map: date -> units
                // The API returns list of room types with availableUnits. 
                // However, the current API design calculates availability for a RANGE.
                // To fill a calendar, we ideally need day-wise. 
                // Since the provided backend returns 'availableUnits' for the WHOLE requested range,
                // we technically need to query day-by-day OR the backend should support a range breakdown.
                // 
                // Based on standard simple implementations: we will fetch for the whole month once, 
                // but the current controller might return the MINIMUM availability for that range.
                // 
                // WORKAROUND: For this UI to be precise without backend changes, we might need to 
                // make individual calls for each day OR assume the API returns day-wise.
                // 
                // Let's look at the controller logic provided in context:
                // It aggregates ledger entries for the range.
                // `availableUnits = total - blocked`.
                // If I query 1st to 30th, it subtracts blocks that overlap ANY part of that range.
                // This means it returns the "worst case" availability for the whole month.
                // This is not ideal for a calendar visual.
                //
                // OPTIMIZED APPROACH (Frontend Only):
                // To get accurate daily visuals, we should fetch the LEDGER for the month
                // and compute daily availability loosely on the client.

                const ledgerRes = await availabilityService.getLedger({
                    propertyId: id,
                    roomTypeId: selectedRoom._id,
                    startDate: firstDay.toISOString(),
                    limit: 500 // Increased limit as backend doesn't filter by date yet
                });

                // Compute availability per day
                const dayMap = {};
                const daysInMonth = lastDay.getDate();
                const total = selectedRoom?.totalInventory || 0;

                // Helper to normalize date to local midnight for accurate date-only comparison
                // Handles both Date objects and ISO strings from backend
                const normalizeToLocalMidnight = (date) => {
                    if (!date) return null;
                    // If it's already a Date object, use it directly
                    const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
                    // Set to local midnight to avoid timezone issues
                    d.setHours(0, 0, 0, 0);
                    return d;
                };

                // Helper to get date string in YYYY-MM-DD format for comparison
                const getDateString = (dateObj) => {
                    const y = dateObj.getFullYear();
                    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const d = String(dateObj.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}`;
                };

                for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(year, month, d);
                    dateObj.setHours(0, 0, 0, 0); // Ensure local midnight
                    const currentDateStr = getDateString(dateObj);
                    let blockedCount = 0;

                    if (ledgerRes.entries) {
                        ledgerRes.entries.forEach(entry => {
                            if (!entry.startDate || !entry.endDate) return;
                            
                            // Normalize ledger entry dates to local midnight for accurate comparison
                            const start = normalizeToLocalMidnight(entry.startDate);
                            const end = normalizeToLocalMidnight(entry.endDate);
                            
                            if (!start || !end) return;
                            
                            // Use date string comparison for more reliable date-only matching
                            // This avoids any timezone conversion issues
                            const startStr = getDateString(start);
                            const endStr = getDateString(end);
                            
                            // Check overlap: [start, end) - check-in day is blocked, check-out day is free
                            // If booking is 19th to 21st:
                            // - startStr = "2024-02-19", endStr = "2024-02-21"
                            // - currentDateStr = "2024-02-19": "2024-02-19" >= "2024-02-19" && "2024-02-19" < "2024-02-21" = TRUE ✓
                            // - currentDateStr = "2024-02-20": "2024-02-20" >= "2024-02-19" && "2024-02-20" < "2024-02-21" = TRUE ✓
                            // - currentDateStr = "2024-02-21": "2024-02-21" >= "2024-02-19" && "2024-02-21" < "2024-02-21" = FALSE ✓
                            if (currentDateStr >= startStr && currentDateStr < endStr) {
                                blockedCount += entry.units;
                            }
                        });
                    }

                    dayMap[d] = Math.max(0, total - blockedCount);
                }
                setAvailabilityMap(dayMap);

            } catch (error) {
                console.error("Failed to fetch availability", error);
            }
        };

        fetchAvailability();
    }, [selectedRoom, currentDate, id, toast]); // re-fetch when toast appears (action done)

    // Handlers
    const handleDateClick = (day) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        // Create date object handling local timezone correctly for input value
        // Using local string format YYYY-MM-DD
        const dateObj = new Date(year, month, day);
        const yearStr = dateObj.getFullYear();
        const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dayStr = String(dateObj.getDate()).padStart(2, '0');
        const dateString = `${yearStr}-${monthStr}-${dayStr}`;

        const nextDateObj = new Date(year, month, day + 1);
        const nextYearStr = nextDateObj.getFullYear();
        const nextMonthStr = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const nextDayStr = String(nextDateObj.getDate()).padStart(2, '0');
        const nextDateString = `${nextYearStr}-${nextMonthStr}-${nextDayStr}`;

        setFormData({
            ...formData,
            startDate: dateString,
            endDate: nextDateString,
            units: 1
        });
        setIsModalOpen(true);
    };

    const handleMonthChange = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const handleOpenModal = () => {
        // specific logic to set default dates
        const todayObj = new Date();
        const y = todayObj.getFullYear();
        const m = String(todayObj.getMonth() + 1).padStart(2, '0');
        const d = String(todayObj.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const tomObj = new Date(todayObj);
        tomObj.setDate(tomObj.getDate() + 1);
        const ty = tomObj.getFullYear();
        const tm = String(tomObj.getMonth() + 1).padStart(2, '0');
        const td = String(tomObj.getDate()).padStart(2, '0');
        const tomStr = `${ty}-${tm}-${td}`;

        setFormData({
            ...formData,
            startDate: todayStr,
            endDate: tomStr,
            units: 1
        });
        setIsModalOpen(true);
    };

    const handleActionSubmit = async () => {
        setActionLoading(true);
        try {
            const payload = {
                propertyId: id,
                roomTypeId: selectedRoom._id,
                startDate: formData.startDate,
                endDate: formData.endDate,
                units: Number(formData.units)
            };

            let res;
            if (modalTab === 'walk_in') {
                res = await availabilityService.createWalkIn(payload);
            } else if (modalTab === 'external') {
                res = await availabilityService.createExternal({
                    ...payload,
                    platform: formData.platform,
                    referenceNo: formData.referenceNo
                });
            } else if (modalTab === 'block') {
                res = await availabilityService.blockDates({
                    ...payload,
                    notes: formData.notes
                });
            }

            if (res.success) {
                setIsModalOpen(false);
                setToast({ type: 'success', message: 'Inventory updated successfully!' });
                setTimeout(() => setToast(null), 3000);
            }

        } catch (error) {
            setToast({ type: 'error', message: error.message || 'Operation failed' });
            setTimeout(() => setToast(null), 3000);
        } finally {
            setActionLoading(false);
        }
    };

    // --- Render Helpers ---

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        // Empty slots for start match
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/30 border border-gray-100/50"></div>);
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const available = availabilityMap[d];
            // If undefined/loading, assume max or show loading. using safe default.
            const isSoldOut = available === 0;
            const isLow = available > 0 && available <= 2;
            const displayCount = available !== undefined ? available : '-';

            days.push(
                <div
                    key={d}
                    onClick={() => handleDateClick(d)}
                    className={`h-24 border border-gray-100 p-2 relative flex flex-col justify-between active:scale-[0.98] transition-transform cursor-pointer hover:bg-gray-50 ${isSoldOut ? 'bg-red-50 hover:bg-red-50' : 'bg-white'}`}
                >
                    <span className={`text-sm font-bold ${isSoldOut ? 'text-red-500' : 'text-gray-700'}`}>{d}</span>

                    <div className="flex flex-col gap-1 items-end">
                        {selectedRoom && (
                            <>
                                {isSoldOut ? (
                                    <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">SOLD OUT</span>
                                ) : (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isLow ? 'text-orange-600 bg-orange-100' : 'text-emerald-600 bg-emerald-100'}`}>
                                        {displayCount} left
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="h-8 bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">{day}</div>
                ))}
                {days}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24 relative">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700 hover:bg-gray-100 active:scale-95 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-gray-900 leading-tight">Inventory Manager</h1>
                    <p className="text-xs text-gray-500 truncate">{property?.propertyName}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CalendarIcon size={20} />
                </div>
            </div>

            {/* Room Selector */}
            <div className="px-4 py-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-2">
                    {roomTypes.map(rt => (
                        <button
                            key={rt._id}
                            onClick={() => setSelectedRoom(rt)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${selectedRoom?._id === rt._id
                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-500'
                                }`}
                        >
                            <BedDouble size={14} />
                            {rt.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="px-4 pb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                    <button onClick={() => handleMonthChange(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-white text-gray-600 active:bg-gray-50">
                        <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => handleMonthChange(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center bg-white text-gray-600 active:bg-gray-50">
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="px-4 animate-in fade-in duration-500">
                {renderCalendar()}
            </div>

            {/* Legend */}
            <div className="px-4 py-4 flex gap-4 justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-xs text-gray-500 font-medium">Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-xs text-gray-500 font-medium">Low Stock</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-500 font-medium">Sold Out</span>
                </div>
            </div>

            {/* FAB - Increased Z-Index to stay above Bottom Nav */}
            <button
                onClick={handleOpenModal}
                className="fixed bottom-24 right-6 w-14 h-14 bg-black text-white rounded-full shadow-xl shadow-black/20 flex items-center justify-center active:scale-90 transition-transform z-[150] hover:bg-gray-800"
            >
                <Plus size={28} />
            </button>

            {/* Toast */}
            {toast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-medium z-50 animate-in fade-in slide-in-from-top-4 flex items-center gap-2 backdrop-blur-md">
                    {toast.type === 'success' ? <CheckCircle size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-red-400" />}
                    {toast.message}
                </div>
            )}

            {/* Action Bottom Sheet */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 bg-black/60 z-[1050] backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="fixed bottom-0 left-0 right-0 bg-white z-[1100] rounded-t-[2rem] h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Update Inventory</h2>
                                <p className="text-xs text-gray-500">{selectedRoom?.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 p-2 rounded-full"><X size={18} /></button>
                        </div>

                        {/* Tabs */}
                        <div className="flex p-2 gap-1 bg-gray-50 m-4 rounded-xl">
                            {[
                                { id: 'walk_in', label: 'Walk-in', icon: Users },
                                { id: 'external', label: 'Ext. Booking', icon: Globe },
                                { id: 'block', label: 'Block', icon: Lock }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setModalTab(tab.id)}
                                    className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${modalTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Form */}
                        <div className="flex-1 overflow-y-auto px-6 pb-20">
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Date Range</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">Start Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.startDate}
                                                    onChange={e => {
                                                        const newStart = e.target.value;
                                                        if (!newStart) {
                                                            setFormData({ ...formData, startDate: newStart });
                                                            return;
                                                        }
                                                        let newEnd = formData.endDate;
                                                        // Ensure end date is at least 1 day after start date
                                                        const startDate = new Date(newStart);
                                                        const minEndDate = new Date(startDate);
                                                        minEndDate.setDate(minEndDate.getDate() + 1);
                                                        const minEndStr = `${minEndDate.getFullYear()}-${String(minEndDate.getMonth() + 1).padStart(2, '0')}-${String(minEndDate.getDate()).padStart(2, '0')}`;
                                                        
                                                        if (!newEnd || newEnd <= newStart) {
                                                            newEnd = minEndStr;
                                                        } else {
                                                            // If current end date is before minimum, update it
                                                            const endDate = new Date(newEnd);
                                                            if (endDate <= startDate) {
                                                                newEnd = minEndStr;
                                                            }
                                                        }
                                                        setFormData({ ...formData, startDate: newStart, endDate: newEnd });
                                                    }}
                                                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 font-medium text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="block text-[10px] font-semibold text-gray-400 mb-1">End Date</label>
                                                <input
                                                    type="date"
                                                    value={formData.endDate}
                                                    min={(() => {
                                                        if (!formData.startDate) {
                                                            const tomorrow = new Date();
                                                            tomorrow.setDate(tomorrow.getDate() + 1);
                                                            return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
                                                        }
                                                        const d = new Date(formData.startDate);
                                                        d.setDate(d.getDate() + 1);
                                                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                                    })()}
                                                    onChange={e => {
                                                        const newEnd = e.target.value;
                                                        if (!newEnd) {
                                                            setFormData({ ...formData, endDate: newEnd });
                                                            return;
                                                        }
                                                        // Validate that end date is after start date
                                                        if (formData.startDate && newEnd <= formData.startDate) {
                                                            const startDate = new Date(formData.startDate);
                                                            const minEndDate = new Date(startDate);
                                                            minEndDate.setDate(minEndDate.getDate() + 1);
                                                            const minEndStr = `${minEndDate.getFullYear()}-${String(minEndDate.getMonth() + 1).padStart(2, '0')}-${String(minEndDate.getDate()).padStart(2, '0')}`;
                                                            setFormData({ ...formData, endDate: minEndStr });
                                                            return;
                                                        }
                                                        setFormData({ ...formData, endDate: newEnd });
                                                    }}
                                                    className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 font-medium text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                                />
                                            </div>
                                        </div>
                                        {formData.startDate && formData.endDate && (() => {
                                            const start = new Date(formData.startDate);
                                            const end = new Date(formData.endDate);
                                            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                                            return (
                                                <p className="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    <span>{nights} {nights === 1 ? 'night' : 'nights'} selected ({formData.startDate} to {formData.endDate})</span>
                                                </p>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Number of Rooms</label>
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setFormData({ ...formData, units: Math.max(1, formData.units - 1) })}
                                            className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <span className="text-xl font-bold w-8 text-center">{formData.units}</span>
                                        <button
                                            onClick={() => setFormData({ ...formData, units: formData.units + 1 })}
                                            className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Maximum {selectedRoom?.totalInventory} units available in total.</p>
                                </div>

                                {modalTab === 'external' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Platform Name</label>
                                            <select
                                                value={formData.platform}
                                                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                                className="w-full h-12 px-3 rounded-xl border border-gray-200 font-medium bg-white"
                                            >
                                                <option value="">Select Platform</option>
                                                <option value="Airbnb">Airbnb</option>
                                                <option value="Booking.com">Booking.com</option>
                                                <option value="Agoda">Agoda</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Reference ID</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. #AB12345"
                                                value={formData.referenceNo}
                                                onChange={e => setFormData({ ...formData, referenceNo: e.target.value })}
                                                className="w-full h-12 px-3 rounded-xl border border-gray-200 font-medium"
                                            />
                                        </div>
                                    </>
                                )}

                                {modalTab === 'block' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">Reason for Blocking</label>
                                        <textarea
                                            placeholder="e.g. Maintenance, Painting, Personal use..."
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full p-4 rounded-xl border border-gray-200 font-medium h-24 resize-none"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="p-4 border-t border-gray-100 bg-white">
                            <button
                                onClick={handleActionSubmit}
                                disabled={actionLoading}
                                className="w-full h-14 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {actionLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {modalTab === 'walk_in' && 'Confirm Walk-in'}
                                {modalTab === 'external' && 'Add External Booking'}
                                {modalTab === 'block' && 'Block Rooms'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Helper for icon
const BedDouble = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20v-8" /><path d="M22 20v-8" /><path d="M2 4v16" /><path d="M22 4v16" /><path d="M2 8h20" /><path d="M12 4v4" /></svg>
);

export default PartnerInventory;
