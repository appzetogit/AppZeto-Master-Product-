import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';

const BottomSheet = ({ isOpen, onClose, title, children }) => {
    const sheetRef = useRef(null);
    const overlayRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Open Animation
            gsap.to(overlayRef.current, { opacity: 1, pointerEvents: "auto", duration: 0.3 });
            gsap.fromTo(sheetRef.current,
                { y: "100%" },
                { y: 0, duration: 0.5, ease: "power4.out" }
            );
        } else {
            // Close Animation
            gsap.to(overlayRef.current, { opacity: 0, pointerEvents: "none", duration: 0.3 });
            gsap.to(sheetRef.current, { y: "100%", duration: 0.3, ease: "power2.in" });
        }
    }, [isOpen]);

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center pointer-events-none">
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/50 opacity-0 transition-opacity"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className="bg-white w-full sm:w-[500px] rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 relative shadow-2xl translate-y-full max-h-[90vh] overflow-y-auto pointer-events-auto"
            >
                {/* Drag Handle (Mobile only styling visual) */}
                <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-partner-text-primary">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {children}
            </div>
        </div>
    );
};

export default BottomSheet;
