import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, Coffee, Car, Shield, Utensils, Users, Dumbbell, Snowflake, Tv, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const AmenitiesPage = () => {
    const navigate = useNavigate();

    const amenitiesList = [
        {
            category: "Popular", items: [
                { icon: Wifi, name: "Free Wifi" },
                { icon: Car, name: "Parking Facility" },
                { icon: Snowflake, name: "AC" },
                { icon: Tv, name: "TV" }
            ]
        },
        {
            category: "Safety & Hygiene", items: [
                { icon: Shield, name: "Daily Housekeeping" },
                { icon: Shield, name: "Fire Extinguisher" },
                { icon: Shield, name: "Sanitized Rooms" }
            ]
        },
        {
            category: "Food & Drinks", items: [
                { icon: Utensils, name: "Restaurant" },
                { icon: Coffee, name: "Breakfast Available" },
                { icon: Coffee, name: "Coffee/Tea Maker" }
            ]
        },
        {
            category: "Services", items: [
                { icon: Users, name: "24x7 Reception" },
                { icon: Briefcase, name: "Conference Room" },
                { icon: Dumbbell, name: "Gym" }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 sticky top-0 z-20 shadow-sm flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-surface" />
                </button>
                <h1 className="text-lg font-bold text-surface">All Amenities</h1>
            </div>

            <div className="p-5 space-y-6 pb-10">
                {amenitiesList.map((section, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                    >
                        <h3 className="text-base font-bold text-surface mb-4 border-b border-gray-50 pb-2">{section.category}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {section.items.map((item, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface/5 flex items-center justify-center text-surface">
                                        <item.icon size={16} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AmenitiesPage;
