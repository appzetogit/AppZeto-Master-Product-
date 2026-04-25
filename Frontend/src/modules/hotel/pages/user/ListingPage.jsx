import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, SlidersHorizontal, ChevronDown, X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropertyCard from '../../components/user/PropertyCard';
import FilterBottomSheet from '../../components/modals/FilterBottomSheet';
import { hotelService } from '../../services/apiService';

const ListingPage = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Initial State from Navigation
    const { destination: initialDestination, dates, guests, isNearMe } = location.state || {
        destination: "",
        dates: { checkIn: null, checkOut: null },
        guests: { rooms: 1, adults: 2 },
        isNearMe: false
    };

    // 2. Local State
    const [searchQuery, setSearchQuery] = useState(isNearMe ? "" : initialDestination);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [activeFilter, setActiveFilter] = useState("Recommended");
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    // Data State
    const [allHotels, setAllHotels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Advanced Filters State (Lifted from FilterBottomSheet)
    const [selectedFilters, setSelectedFilters] = useState([]);
    const [priceRange, setPriceRange] = useState([500, 15000]);
    const [isHighRated, setIsHighRated] = useState(false);

    const filters = ["Recommended", "Price: Low to High", "Rating: 4.5+", "Budget", "Villas", "Hostels"];

    // Fetch Hotels from Backend
    useEffect(() => {
        const fetchHotels = async () => {
            try {
                setLoading(true);
                // If search query is present, use it. Otherwise fetch all.
                const params = {};
                if (searchQuery && searchQuery !== 'Near Me') {
                    params.search = searchQuery;
                }
                const data = await hotelService.getAll(params);
                setAllHotels(data);
            } catch (error) {
                console.error("Failed to fetch hotels:", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly
        const timeoutId = setTimeout(() => {
            fetchHotels();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);


    // 3. Filtering Logic (Client Side)
    const filteredHotels = useMemo(() => {
        return allHotels.filter(hotel => {
            // Search Query is already handled by backend fetch, but precise filtering can continue here if needed.

            // 2. Tab Filter
            let matchesTab = true;
            if (activeFilter === "Rating: 4.5+") matchesTab = (hotel.rating || 0) >= 4.5;
            if (activeFilter === "Budget") matchesTab = (hotel.startingPrice || 0) < 2000;
            if (activeFilter === "Villas") matchesTab = hotel.propertyType === 'Villa';
            if (activeFilter === "Hostels") matchesTab = hotel.propertyType === 'Hostel';

            // 3. Advanced Filters
            // Price Range
            const price = hotel.startingPrice || 0;
            const matchesPrice = price >= priceRange[0] && price <= priceRange[1];

            // High Rated Toggle
            const matchesRating = !isHighRated || (hotel.rating || 0) >= 4.0;

            // Selected Checkbox Filters (Amenities/Facilities)
            // Assuming hotel.amenities is list of strings
            const matchesAdvancedFilters = selectedFilters.every(filter => {
                // Check in amenities, tags, etc.
                const amenities = hotel.details?.amenities || [];
                // Add city/area to searchable attributes
                const attributes = [...amenities, hotel.address?.city, hotel.address?.area];
                return attributes.some(attr => attr && attr.includes(filter));
            });

            return matchesTab && matchesPrice && matchesRating && matchesAdvancedFilters;
        }).sort((a, b) => {
            if (activeFilter === "Price: Low to High") return (a.startingPrice || 0) - (b.startingPrice || 0);
            return 0; // Default order
        });
    }, [activeFilter, allHotels, selectedFilters, priceRange, isHighRated]);


    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-gray-50 pb-20"
        >
            {/* 1. Header & Search Bar (Sticky & Premium) */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm pt-safe-top transition-all">
                <div className="px-3 py-3 flex items-center gap-3">
                    {/* Interactive Search Field */}
                    <div
                        className={`
                            flex-1 bg-gray-50 border border-gray-200 rounded-full flex items-center shadow-sm transition-all duration-300
                            ${isSearchActive ? 'ring-2 ring-surface/10 bg-white' : ''}
                        `}
                    >
                        {/* Input Area */}
                        <div className="flex-1 flex items-center pl-4 py-2 relative">
                            {/* Animated Placeholder / Value */}
                            <input
                                type="text"
                                value={searchQuery}
                                onFocus={() => setIsSearchActive(true)}
                                onBlur={() => setIsSearchActive(false)}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent outline-none text-xs font-bold text-surface placeholder:text-gray-400"
                                placeholder="Search location, villa, hostel..."
                            />
                            {/* Clear Button (only when typing) */}
                            {searchQuery && (
                                <button onMouseDown={(e) => { e.preventDefault(); setSearchQuery(""); }} className="p-1 mr-2 text-gray-400 hover:text-surface">
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Action / Details */}
                        <div className="pr-1 py-1 flex items-center gap-2">
                            {!isSearchActive && (
                                <span className="text-[10px] text-gray-400 font-medium hidden sm:block whitespace-nowrap">
                                    {dates?.checkIn ? `${new Date(dates.checkIn).getDate()} ${new Date(dates.checkIn).toLocaleString('default', { month: 'short' })}` : ''} • {guests.adults + guests.children} Guest
                                </span>
                            )}
                            <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 shrink-0">
                                <Search size={14} className="text-accent" strokeWidth={2.5} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Horizontal Filter Row */}
                <div className="px-3 pb-3 overflow-x-auto no-scrollbar flex gap-2">
                    <button
                        onClick={() => setIsFilterSheetOpen(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 whitespace-nowrap active:scale-95 transition-all shadow-sm
                        ${selectedFilters.length > 0 || isHighRated ? 'bg-surface text-white border-surface' : 'bg-gray-100 text-surface'}`}
                    >
                        <SlidersHorizontal size={12} className={selectedFilters.length > 0 || isHighRated ? "text-white" : "text-surface"} />
                        {(selectedFilters.length > 0 || isHighRated) && (
                            <span className="text-[9px] bg-white text-surface px-1.5 rounded-full font-bold ml-1">
                                {selectedFilters.length + (isHighRated ? 1 : 0)}
                            </span>
                        )}
                    </button>
                    {filters.map((filter, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveFilter(filter)}
                            className={`
                                text-[10px] font-bold px-3 py-1.5 rounded-full border whitespace-nowrap transition-all duration-300 active:scale-95
                                ${activeFilter === filter
                                    ? 'bg-surface text-white border-surface shadow-lg shadow-surface/20'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                            `}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* 3. Hotel Listings */}
            <div className="p-3 space-y-4">
                {/* Result Count */}
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-gray-800">
                        {filteredHotels.length} properties found
                    </h2>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500">
                        Sort by <ChevronDown size={12} />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : filteredHotels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        <AnimatePresence mode='popLayout'>
                            {filteredHotels.map((hotel) => (
                                <motion.div
                                    layout
                                    key={hotel._id || hotel.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <PropertyCard data={hotel} className="w-full shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300" />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <Search size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">No properties found</h3>
                        <p className="text-sm text-gray-500">Try changing your search or filters.</p>
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setActiveFilter("Recommended");
                                setSelectedFilters([]);
                                setPriceRange([500, 15000]);
                                setIsHighRated(false);
                            }}
                            className="mt-6 text-sm font-bold text-accent underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Bottom Sheet */}
            <FilterBottomSheet
                isOpen={isFilterSheetOpen}
                onClose={() => setIsFilterSheetOpen(false)}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                priceRange={priceRange}
                setPriceRange={setPriceRange}
                highRated={isHighRated}
                setHighRated={setIsHighRated}
                filteredCount={filteredHotels.length}
            />

        </motion.div>
    );
};

export default ListingPage;
