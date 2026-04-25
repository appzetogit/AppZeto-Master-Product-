import React from 'react';
import { Outlet } from 'react-router-dom';
import { useLenis } from '../app/shared/hooks/useLenis';

const HotelLayout = ({ children }) => {
    // Initialize global smooth scrolling
    useLenis();

    return (
        <div id="hotel-root" className="min-h-screen w-full bg-partner-bg text-partner-text-primary font-sans antialiased selection:bg-partner-btn selection:text-white">
            <main className="w-full">
                {children || <Outlet />}
            </main>
        </div>
    );
};

export default HotelLayout;
