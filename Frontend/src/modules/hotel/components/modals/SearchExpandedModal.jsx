import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Minus, Plus, ChevronRight, MapPin, Hotel, Sparkles, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';

const SearchExpandedModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    // Steps: 'location', 'dates', 'guests'
    const [activeStep, setActiveStep] = useState('location');

    // Values
    const [destination, setDestination] = useState("");
    const [dates, setDates] = useState({ checkIn: null, checkOut: null });
    const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
    const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Lock Body Scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Reset suggestions when opened
            if (!destination) {
                setDynamicSuggestions([
                    { name: "Indore, Madhya Pradesh", subtitle: "Popular for food & culture", icon: "city", type: 'city' },
                    { name: "Bhopal, Madhya Pradesh", subtitle: "City of Lakes", icon: "city", type: 'city' },
                ]);
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Fetch dynamic suggestions
    useEffect(() => {
        if (!destination || destination.length < 2) {
            if (destination === "") {
                setDynamicSuggestions([
                    { name: "Indore, Madhya Pradesh", subtitle: "Popular for food & culture", icon: "city", type: 'city' },
                    { name: "Bhopal, Madhya Pradesh", subtitle: "City of Lakes", icon: "city", type: 'city' },
                ]);
            }
            return;
        }

        const fetchSuggestions = async () => {
            setIsLoadingSuggestions(true);
            try {
                const res = await propertyService.getSuggestions(destination);
                if (res) {
                    setDynamicSuggestions(res);
                }
            } catch (error) {
                console.error("Fetch suggestions error:", error);
            } finally {
                setIsLoadingSuggestions(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timeoutId);
    }, [destination]);

    // Calendar Logic
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };
    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (day) => {
        const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        clickedDate.setHours(0, 0, 0, 0); // Normalize to start of day

        if (!dates.checkIn || (dates.checkIn && dates.checkOut)) {
            setDates({ checkIn: clickedDate, checkOut: null });
        } else if (dates.checkIn && !dates.checkOut) {
            if (clickedDate < dates.checkIn) {
                setDates({ checkIn: clickedDate, checkOut: null });
            } else {
                setDates({ ...dates, checkOut: clickedDate });
                // Auto advance to guests after short delay
                setTimeout(() => setActiveStep('guests'), 300);
            }
        }
    };

    const isDateSelected = (day) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        date.setHours(0, 0, 0, 0); // Normalize to start of day

        if (dates.checkIn && date.getTime() === dates.checkIn.getTime()) return 'start';
        if (dates.checkOut && date.getTime() === dates.checkOut.getTime()) return 'end';
        if (dates.checkIn && dates.checkOut && date > dates.checkIn && date < dates.checkOut) return 'range';
        return null;
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const getIcon = (iconName) => {
        switch (iconName) {
            case 'city': return <MapPin size={20} className="text-blue-500" />;
            case '🏨': return <Hotel size={20} className="text-rose-500" />;
            case '🏙️': return <MapPin size={20} className="text-blue-500" />;
            case '✨': return <Sparkles size={20} className="text-amber-500" />;
            case '🏠': return <Home size={20} className="text-emerald-500" />;
            default: return <MapPin size={20} className="text-gray-400" />;
        }
    };

    const formatDate = (date) => {
        if (!date) return "Add date";
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const handleClearAll = () => {
        setDestination("");
        setDates({ checkIn: null, checkOut: null });
        setGuests({ rooms: 1, adults: 2, children: 0 });
        setActiveStep('location');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] touch-none"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ y: "-100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "-100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 right-0 bg-white z-[70] shadow-2xl rounded-b-[32px] overflow-hidden max-h-[85vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-transparent select-none">Search</h2>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content Steps */}
                        <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-32">

                            {/* STEP 1: WHERE */}
                            <div className={`transition-all duration-300 ${activeStep === 'location' ? '' : 'mb-3'}`}>
                                {activeStep === 'location' ? (
                                    <div className="bg-white rounded-3xl p-0 animate-fadeIn">
                                        <h2 className="text-3xl font-extrabold text-surface mb-6">Where to?</h2>

                                        <div className="border border-gray-200 rounded-2xl px-4 py-3.5 flex items-center gap-3 shadow-sm bg-gray-50/50 mb-6">
                                            <Search size={22} className="text-surface" strokeWidth={2.5} />
                                            <input
                                                type="text"
                                                placeholder="Search destinations"
                                                className="flex-1 outline-none text-surface font-bold text-lg bg-transparent placeholder:font-medium placeholder:text-gray-400"
                                                value={destination}
                                                onChange={(e) => setDestination(e.target.value)}
                                            />
                                            {destination && <button onClick={() => setDestination('')} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 shrink-0"><X size={14} className="text-gray-600" /></button>}
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                                {destination ? (isLoadingSuggestions ? "Searching..." : "Suggestions") : "Popular Destinations"}
                                            </h3>
                                            {dynamicSuggestions.length > 0 ? (
                                                dynamicSuggestions.map((item, index) => (
                                                    <div
                                                        key={index}
                                                        onClick={() => {
                                                            setDestination(item.name);
                                                            setActiveStep('dates');
                                                        }}
                                                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                                                    >
                                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                                            {getIcon(item.icon)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-surface text-sm">{item.name}</p>
                                                            <p className="text-xs text-gray-500">{item.subtitle}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                !isLoadingSuggestions && destination && (
                                                    <p className="text-sm text-gray-400 italic p-3">No suggestions found for "{destination}"</p>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setActiveStep('location')}
                                        className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer"
                                    >
                                        <span className="text-sm font-medium text-gray-500">Where</span>
                                        <span className="text-sm font-bold text-surface">{destination || "I'm flexible"}</span>
                                    </div>
                                )}
                            </div>

                            {/* STEP 2: WHEN */}
                            <div className={`transition-all duration-300 ${activeStep === 'dates' ? '' : 'mb-3'}`}>
                                {activeStep === 'dates' ? (
                                    <div className="bg-white rounded-3xl p-0 mt-6 animate-fadeIn">
                                        <h2 className="text-3xl font-extrabold text-surface mb-6">When?</h2>

                                        {/* Date Tabs */}
                                        <div className="flex gap-4 mb-6">
                                            <div className={`flex-1 p-3 rounded-xl border ${!dates.checkIn || (dates.checkIn && dates.checkOut) ? 'border-gray-200' : 'border-surface bg-surface/5'}`}>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Check-in</p>
                                                <p className="text-sm font-bold text-surface">{formatDate(dates.checkIn)}</p>
                                            </div>
                                            <div className={`flex-1 p-3 rounded-xl border ${dates.checkIn && !dates.checkOut ? 'border-surface bg-surface/5' : 'border-gray-200'}`}>
                                                <p className="text-xs text-gray-500 font-medium mb-1">Check-out</p>
                                                <p className="text-sm font-bold text-surface">{formatDate(dates.checkOut)}</p>
                                            </div>
                                        </div>

                                        {/* Custom Calendar UI */}
                                        <div className="bg-gray-50 rounded-2xl p-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded-full"><ChevronRight className="rotate-180" size={18} /></button>
                                                <h3 className="font-bold text-surface">
                                                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                                </h3>
                                                <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded-full"><ChevronRight size={18} /></button>
                                            </div>

                                            <div className="grid grid-cols-7 mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-7 gap-y-1">
                                                {Array.from({ length: getFirstDayOfMonth(currentMonth) }).map((_, i) => (
                                                    <div key={`empty-${i}`} />
                                                ))}
                                                {Array.from({ length: getDaysInMonth(currentMonth) }).map((_, i) => {
                                                    const day = i + 1;
                                                    const status = isDateSelected(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            onClick={() => handleDateClick(day)}
                                                            className={`
                                                                h-10 w-10 flex items-center justify-center rounded-full text-sm font-medium transition-all mx-auto
                                                                ${status === 'start' || status === 'end' ? 'bg-surface text-white shadow-md' : ''}
                                                                ${status === 'range' ? 'bg-surface/10 text-surface rounded-none w-full' : ''}
                                                                ${!status ? 'hover:bg-gray-200 text-gray-700' : ''}
                                                            `}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="mt-4 flex justify-end">
                                            <button
                                                onClick={() => setActiveStep('guests')}
                                                className="text-sm font-bold underline text-surface"
                                            >
                                                Skip dates
                                            </button>
                                        </div>

                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setActiveStep('dates')}
                                        className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer"
                                    >
                                        <span className="text-sm font-medium text-gray-500">When</span>
                                        <span className="text-sm font-bold text-surface">
                                            {dates.checkIn ? `${formatDate(dates.checkIn)} - ${formatDate(dates.checkOut)}` : "Add dates"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* STEP 3: WHO */}
                            <div className={`transition-all duration-300`}>
                                {activeStep === 'guests' ? (
                                    <div className="bg-white rounded-3xl p-0 mt-6 animate-fadeIn">
                                        <h2 className="text-3xl font-extrabold text-surface mb-6">Who's coming?</h2>

                                        <div className="space-y-6">
                                            {[
                                                { label: "Adults", sub: "Ages 13 or above", key: "adults" },
                                                { label: "Children", sub: "Ages 2-12", key: "children" },
                                                { label: "Rooms", sub: "Number of rooms", key: "rooms" },
                                            ].map((type) => (
                                                <div key={type.key} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0">
                                                    <div>
                                                        <p className="font-bold text-surface">{type.label}</p>
                                                        <p className="text-xs text-gray-400">{type.sub}</p>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button
                                                            disabled={guests[type.key] <= (type.key === 'adults' ? 1 : 0)} // Adults minimum 1
                                                            onClick={() => setGuests({ ...guests, [type.key]: Math.max(type.key === 'adults' ? 1 : 0, guests[type.key] - 1) })}
                                                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-30"
                                                        >
                                                            <Minus size={16} />
                                                        </button>
                                                        <span className="w-4 text-center font-bold text-surface">{guests[type.key]}</span>
                                                        <button
                                                            onClick={() => setGuests({ ...guests, [type.key]: guests[type.key] + 1 })}
                                                            className="w-8 h-8 rounded-full border border-gray-800 flex items-center justify-center text-surface hover:bg-gray-50"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => setActiveStep('guests')}
                                        className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer"
                                    >
                                        <span className="text-sm font-medium text-gray-500">Who</span>
                                        <span className="text-sm font-bold text-surface">
                                            {guests.adults + guests.children} Guests, {guests.rooms} Room{guests.rooms > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer (Always Visible) */}
                        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-4 absolute bottom-0 left-0 right-0 z-10 safe-pb">
                            <button
                                onClick={handleClearAll}
                                className="text-sm font-bold underline text-gray-500 px-2"
                            >
                                Clear all
                            </button>

                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/listings', { state: { destination, dates, guests } });
                                }}
                                className="bg-gradient-to-r from-[#e11d48] to-[#be123c] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-95 transition-all text-base"
                            >
                                <Search size={20} strokeWidth={3} />
                                Search
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SearchExpandedModal;
