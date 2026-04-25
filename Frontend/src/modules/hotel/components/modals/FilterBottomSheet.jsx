import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const FilterBottomSheet = ({
    isOpen,
    onClose,
    scrollToSection = null,
    // Controlled Props
    selectedFilters = [],
    setSelectedFilters,
    priceRange = [500, 5000],
    setPriceRange,
    highRated = false,
    setHighRated,
    filteredCount = 0
}) => {
    // Refs for scrolling
    const sectionRefs = useRef({});

    const setSectionRef = (key) => (el) => {
        if (el) {
            sectionRefs.current[key] = el;
        }
    };

    // Scroll to section on open
    useEffect(() => {
        if (isOpen && scrollToSection && sectionRefs.current[scrollToSection]) {
            setTimeout(() => {
                sectionRefs.current[scrollToSection].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }, [isOpen, scrollToSection]);

    // Mock Data
    const localities = [
        "Vijay Nagar", "Bhawarkua", "Bombay Hospital",
        "Rau Pithampur Road", "Indore Bg Railway Station"
    ];

    const trendingFilters = [
        "Rukkos welcome couples", "Local IDs accepted", "Flagship"
    ];

    const categories = [
        "Townhouse", "Flagship", "Silver Key",
        "Collection O", "Spot On", "Capital O"
    ];

    const collections = [
        "Family Rukkos", "For Group Travellers", "Business Travellers"
    ];

    // Price Range Constants
    const MIN_PRICE = 500;
    const MAX_PRICE = 5000;

    const handlePriceChange = (e, type) => {
        const val = parseInt(e.target.value);
        if (type === 'min') {
            if (val < priceRange[1]) setPriceRange([val, priceRange[1]]);
        } else {
            if (val > priceRange[0]) setPriceRange([priceRange[0], val]);
        }
    };

    // Calculate percentage for slider track positions
    const getPercent = (value) => Math.round(((value - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100);

    const toggleFilter = (filter) => {
        if (selectedFilters.includes(filter)) {
            setSelectedFilters(selectedFilters.filter(f => f !== filter));
        } else {
            setSelectedFilters([...selectedFilters, filter]);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.5 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-[60]"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 bg-white z-[70] rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <div className="flex items-center gap-3">
                                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                                    <X size={24} className="text-surface" />
                                </button>
                                <h2 className="text-xl font-bold text-surface">Filters</h2>
                            </div>
                            <button
                                onClick={() => { setSelectedFilters([]); setHighRated(false); setPriceRange([MIN_PRICE, MAX_PRICE]); }}
                                className="text-blue-600 font-medium text-sm"
                            >
                                Clear all
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto p-5 pb-24 space-y-8 scroll-smooth">

                            {/* Popular Localities */}
                            <section ref={setSectionRef("Locality")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Popular localities in Indore</h3>
                                <div className="flex flex-wrap gap-2">
                                    {localities.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => toggleFilter(loc)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(loc)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {loc}
                                        </button>
                                    ))}
                                </div>
                                <button className="text-blue-600 font-medium text-sm mt-3">Show more</button>
                            </section>

                            <hr className="border-gray-100" />

                            {/* Highest Rated Toggle */}
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="font-medium text-surface text-base">Highest rated Rukkos</h3>
                                    <p className="text-xs text-gray-400">Show Rukkos with rating &gt;4.0</p>
                                </div>
                                <button
                                    onClick={() => setHighRated(!highRated)}
                                    className={`w-12 h-7 flex items-center rounded-full p-1 transition-colors duration-300 ${highRated ? 'bg-surface' : 'bg-gray-200'
                                        }`}
                                >
                                    <div
                                        className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${highRated ? 'translate-x-5' : ''
                                            }`}
                                    />
                                </button>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Trending Filters */}
                            <section ref={setSectionRef("Trending")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Trending filters</h3>
                                <div className="flex flex-wrap gap-2">
                                    {trendingFilters.map(filter => (
                                        <button
                                            key={filter}
                                            onClick={() => toggleFilter(filter)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(filter)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {filter}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Categories */}
                            <section ref={setSectionRef("Categories")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Categories</h3>
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleFilter(cat)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(cat)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Collections */}
                            <section ref={setSectionRef("Collections")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Collections</h3>
                                <div className="flex flex-wrap gap-2">
                                    {collections.map(col => (
                                        <button
                                            key={col}
                                            onClick={() => toggleFilter(col)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(col)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {col}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Hotel Facilities */}
                            <section ref={setSectionRef("HotelFacilities")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Hotel Facilities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {["Parking", "Kitchen", "CCTV Cameras", "Power backup"].map(fac => (
                                        <button
                                            key={fac}
                                            onClick={() => toggleFilter(fac)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(fac)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {fac}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Room Facilities */}
                            <section ref={setSectionRef("RoomFacilities")}>
                                <h3 className="font-bold text-lg text-surface mb-3">Room Facilities</h3>
                                <div className="flex flex-wrap gap-2">
                                    {["TV", "AC", "Geyser", "Mini Fridge"].map(fac => (
                                        <button
                                            key={fac}
                                            onClick={() => toggleFilter(fac)}
                                            className={`px-4 py-2 rounded-full border text-sm transition-all ${selectedFilters.includes(fac)
                                                ? 'bg-surface text-white border-surface'
                                                : 'bg-white text-gray-700 border-gray-300'
                                                }`}
                                        >
                                            {fac}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Price Range (Functional Dual Slider) */}
                            <section ref={setSectionRef("Price")}>
                                <h3 className="font-bold text-lg text-surface mb-5">Price Range</h3>
                                <div className="flex flex-col gap-6 px-2">

                                    {/* Slider Container */}
                                    <div className="relative w-full h-2 bg-gray-200 rounded-full mt-2">
                                        {/* Active Track */}
                                        <div
                                            className="absolute h-full bg-surface rounded-full z-10"
                                            style={{
                                                left: `${getPercent(priceRange[0])}%`,
                                                right: `${100 - getPercent(priceRange[1])}%`
                                            }}
                                        />

                                        {/* Range Inputs (Invisible but clickable) */}
                                        <input
                                            type="range"
                                            min={MIN_PRICE} max={MAX_PRICE}
                                            value={priceRange[0]}
                                            onChange={(e) => handlePriceChange(e, 'min')}
                                            className="absolute w-full h-2 opacity-0 z-30 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        <input
                                            type="range"
                                            min={MIN_PRICE} max={MAX_PRICE}
                                            value={priceRange[1]}
                                            onChange={(e) => handlePriceChange(e, 'max')}
                                            className="absolute w-full h-2 opacity-0 z-30 cursor-pointer pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6"
                                            style={{ pointerEvents: 'none' }}
                                        />

                                        {/* VISUAL Thumbs */}
                                        {/* Min Thumb */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-surface rounded-full shadow pointer-events-none z-20"
                                            style={{ left: `calc(${getPercent(priceRange[0])}% - 12px)` }}
                                        />
                                        {/* Max Thumb */}
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-surface rounded-full shadow pointer-events-none z-20"
                                            style={{ left: `calc(${getPercent(priceRange[1])}% - 12px)` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center mt-2">
                                        <div className="border border-gray-300 rounded px-3 py-1.5 min-w-[80px] text-center">
                                            <span className="text-xs text-gray-500 block">Min</span>
                                            <span className="font-bold text-surface">₹{priceRange[0]}</span>
                                        </div>
                                        <div className="text-gray-400">-</div>
                                        <div className="border border-gray-300 rounded px-3 py-1.5 min-w-[80px] text-center">
                                            <span className="text-xs text-gray-500 block">Max</span>
                                            <span className="font-bold text-surface">₹{priceRange[1]}</span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Fixed Footer Button */}
                        <div className="border-t border-gray-100 p-4 absolute bottom-0 left-0 right-0 bg-white z-20">
                            <button
                                onClick={onClose}
                                className="w-full bg-surface text-white font-bold py-3.5 rounded-lg shadow-lg hover:bg-black/90 transition-colors"
                            >
                                Show {filteredCount > 0 ? filteredCount : ''} Rukkos
                            </button>
                        </div>

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default FilterBottomSheet;
