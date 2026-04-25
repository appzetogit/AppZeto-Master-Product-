import React, { useState } from 'react';
import HeroSection from '../../components/user/HeroSection';
import ExclusiveOffers from '../../components/user/ExclusiveOffers';
import PropertyTypeFilter from '../../components/user/PropertyTypeFilter';
import PropertyFeed from '../../components/user/PropertyFeed';

const Home = () => {
    const [selectedType, setSelectedType] = useState('All');

    return (
        <main className="min-h-screen bg-gray-50 pb-24">
            <HeroSection />

            {/* Sticky Filter Bar */}
            <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md pt-2">
                <PropertyTypeFilter
                    selectedType={selectedType}
                    onSelectType={setSelectedType}
                />
            </div>

            <ExclusiveOffers />

            <div className="mt-2 max-w-7xl mx-auto">
                <PropertyFeed selectedType={selectedType} />
            </div>
        </main>
    );
};

export default Home;
