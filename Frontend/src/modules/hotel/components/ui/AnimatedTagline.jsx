import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, HeartHandshake, Banknote, Clock } from 'lucide-react';

const AnimatedTagline = () => {
    const features = [
        {
            id: 1,
            icon: ShieldCheck,
            title: "100% Verified",
            sub: "Quality Assured",
            color: "text-blue-600",
            bg: "bg-blue-50"
        },
        {
            id: 2,
            icon: HeartHandshake,
            title: "Couple Friendly",
            sub: "Safe & Private",
            color: "text-rose-500",
            bg: "bg-rose-50"
        },
        {
            id: 3,
            icon: Banknote,
            title: "Pay at Hotel",
            sub: "Flexible Payment",
            color: "text-green-600",
            bg: "bg-green-50"
        },
        {
            id: 4,
            icon: Clock,
            title: "24/7 Support",
            sub: "Always Here",
            color: "text-orange-500",
            bg: "bg-orange-50"
        }
    ];

    return (
        <div className="w-full py-2">
            <div className="flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar snap-x">
                {features.map((feature, i) => (
                    <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                        className="
                            min-w-[120px] 
                            snap-center
                            flex flex-col items-center justify-center text-center
                            bg-white 
                            border border-gray-100 
                            rounded-xl 
                            p-3 
                            shadow-sm
                        "
                    >
                        <div className={`p-2 rounded-full mb-2 ${feature.bg}`}>
                            <feature.icon size={18} className={feature.color} />
                        </div>
                        <h3 className="text-xs font-bold text-gray-800 leading-tight">
                            {feature.title}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">
                            {feature.sub}
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AnimatedTagline;
