import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../../components/user/PropertyCard';
import { userService } from '../../services/apiService';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const SavedPlacesPage = () => {
    const navigate = useNavigate();
    const [savedHotels, setSavedHotels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch saved hotels from backend
    useEffect(() => {
        const fetchSavedHotels = async () => {
            try {
                setLoading(true);
                const response = await userService.getSavedHotels();
                setSavedHotels(response.savedHotels || []);
            } catch (error) {
                console.error('Error fetching saved hotels:', error);
                toast.error('Failed to load saved places');
            } finally {
                setLoading(false);
            }
        };

        fetchSavedHotels();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-8 rounded-b-[30px] shadow-lg sticky top-0 z-30">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Saved Places</h1>
                </div>
                <h2 className="text-2xl font-black">Your Favorites</h2>
                <p className="text-sm text-white/70">Hotels you have loved and saved.</p>
            </div>

            <div className="max-w-7xl mx-auto px-5 pt-8 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 size={32} className="animate-spin text-surface" />
                    </div>
                ) : savedHotels.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savedHotels.map((hotel) => (
                            <PropertyCard key={hotel._id || hotel.id} data={hotel} isSaved={true} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                        <Heart size={48} className="text-gray-300 mb-2" />
                        <p className="text-gray-500 font-bold">No saved places yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Start exploring and save your favorites!</p>
                        <button
                            onClick={() => navigate('/search')}
                            className="mt-6 bg-surface text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Explore Hotels
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedPlacesPage;
