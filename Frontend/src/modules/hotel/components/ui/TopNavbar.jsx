import React from 'react';
import { User, Globe, Navigation } from 'lucide-react';
import logo from '../../assets/rokologin-removebg-preview.png';
import { Link, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/propertyService';
import { toast } from 'react-hot-toast';

const TopNavbar = () => {
    const navigate = useNavigate();
    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = user.name || 'User';

    const handleNearBy = async (e) => {
        e.preventDefault();
        try {
            toast.loading('Getting your location...');
            const location = await propertyService.getCurrentLocation();
            toast.dismiss();
            navigate(`/hotel/search?lat=${location.lat}&lng=${location.lng}&radius=50&sort=distance`);
        } catch (error) {
            toast.dismiss();
            toast.error('Could not get location. Please enable permissions.');
        }
    };

    return (
        <nav className="hidden md:flex w-full h-24 bg-white/95 backdrop-blur-md border-b border-gray-100 px-8 justify-between items-center fixed top-0 z-50">

            {/* Logo */}
            <Link to="/hotel">
                <img src={logo} alt="Rukko" className="h-20 object-contain" />
            </Link>

            {/* Desktop Links */}
            <div className="flex items-center gap-8">
                <Link to="/hotel" className="text-gray-600 font-bold text-sm hover:text-surface transition">
                    Home
                </Link>
                <Link to="/hotel/listings" className="text-gray-600 font-bold text-sm hover:text-surface transition">
                    Search
                </Link>
                <Link to="/hotel/bookings" className="text-gray-600 font-bold text-sm hover:text-surface transition">
                    Bookings
                </Link>
                <button
                    onClick={handleNearBy}
                    className="text-gray-600 font-bold text-sm hover:text-surface transition flex items-center gap-1.5"
                >
                    <Navigation size={16} />
                    Near By
                </button>
                <Link to="/hotel/refer" className="text-gray-600 font-bold text-sm hover:text-surface transition">
                    Refer & Earn
                </Link>
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-4">
                <Link
                    to="/hotel/saved-places"
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition"
                >
                    <Globe size={18} className="text-surface" />
                </Link>

                <Link
                    to="/hotel/settings"
                    className="pl-3 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-full flex items-center gap-3 hover:border-surface transition group"
                >
                    <div className="w-8 h-8 rounded-full bg-surface text-white flex items-center justify-center font-bold text-xs">
                        {userName.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-surface group-hover:text-surface/80">
                        {userName.split(' ')[0]}
                    </span>
                </Link>
            </div>

        </nav>
    );
};

export default TopNavbar;
