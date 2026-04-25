import React, { useState, useEffect, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isBefore, isAfter, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ModernDatePicker = ({
    label,
    date,
    onChange,
    minDate,
    placeholder = "Select Date",
    onClear,
    align = "left"
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(date ? new Date(date) : new Date());
    const containerRef = useRef(null);

    useEffect(() => {
        if (date) {
            setCurrentMonth(new Date(date));
        }
    }, [date]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day) => {
        if (minDate && isBefore(day, startOfDay(new Date(minDate)))) return;

        // Format to YYYY-MM-DD for consistency with input type="date"
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    // Helper to clear time part for comparison
    const startOfDay = (d) => {
        const newDate = new Date(d);
        newDate.setHours(0, 0, 0, 0);
        return newDate;
    };

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-4 px-2">
                <button
                    onClick={(e) => { e.stopPropagation(); prevMonth(); }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div className="font-bold text-gray-800 text-sm">
                    {format(currentMonth, 'MMMM yyyy')}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); nextMonth(); }}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ChevronRight size={20} className="text-gray-600" />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const days = [];
        const dateFormat = "EEEEE"; // M, T, W, T, F, S, S
        const startDate = startOfWeek(currentMonth);

        for (let i = 0; i < 7; i++) {
            days.push(
                <div key={i} className="text-[10px] uppercase font-bold text-gray-400 text-center py-2">
                    {format(addDays(startDate, i), dateFormat)}
                </div>
            );
        }

        return <div className="grid grid-cols-7 mb-2">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, dateFormat);
                const cloneDay = day;
                const isDisabled = minDate && isBefore(day, startOfDay(new Date(minDate)));
                const isSelected = date && isSameDay(day, new Date(date));
                const isCurrentMonth = isSameMonth(day, monthStart);

                days.push(
                    <div
                        key={day}
                        className={`
                            relative h-9 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-all
                            ${!isCurrentMonth ? "text-gray-300" : isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"}
                            ${isSelected ? "bg-surface text-white hover:bg-surface font-bold shadow-md" : ""}
                            ${isToday(day) && !isSelected ? "border border-surface text-surface font-bold" : ""}
                        `}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isDisabled) onDateClick(cloneDay);
                        }}
                    >
                        {formattedDate}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7 gap-1 mb-1" key={day}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div>{rows}</div>;
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="text-xs text-gray-500 block mb-1 font-medium">{label}</label>}

            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full bg-white border rounded-xl p-2.5 text-sm flex items-center justify-between cursor-pointer transition-all
                    ${isOpen ? 'border-surface ring-2 ring-surface/10' : 'border-gray-200 hover:border-surface/50'}
                `}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <Calendar size={16} className={`shrink-0 ${date ? 'text-surface' : 'text-gray-400'}`} />
                    <span className={`truncate ${date ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {date ? format(new Date(date), 'dd MMM, yyyy') : placeholder}
                    </span>
                </div>
                {date && onClear && (
                    <div
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X size={14} />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute top-full z-50 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-[280px] sm:w-[320px] ${align === 'right' ? 'right-0' : 'left-0'}`}
                    >
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ModernDatePicker;
