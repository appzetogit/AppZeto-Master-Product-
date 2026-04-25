import React, { useEffect, useState } from 'react';
import { propertyService, userService } from '../../services/apiService';
import PropertyCard from './PropertyCard';
import { Loader2 } from 'lucide-react';

const PropertyFeed = ({ selectedType, selectedCity }) => {
  const [properties, setProperties] = useState([]);
  const [savedHotelIds, setSavedHotelIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPropertiesAndSaved = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {};
        if (selectedType && selectedType !== 'All') filters.type = selectedType;

        // Always fetch public properties (no auth needed)
        const data = await propertyService.getPublic(filters);

        // Fetch saved hotels separately only if logged in — don't let this fail the whole page
        if (localStorage.getItem('token')) {
          try {
            const savedRes = await userService.getSavedHotels();
            const list = savedRes?.savedHotels || [];
            setSavedHotelIds(list.map(h => (typeof h === 'object' ? h._id : h)));
          } catch (savedErr) {
            // Silently ignore saved hotels error (e.g. 401 if token is invalid)
            console.warn("Could not fetch saved hotels:", savedErr);
            setSavedHotelIds([]);
          }
        }

        let filteredData = data;
        if (selectedCity && selectedCity !== 'All') {
          filteredData = data.filter(p => p.address?.city?.toLowerCase() === selectedCity.toLowerCase());
        }

        setProperties(Array.isArray(filteredData) ? filteredData : []);
      } catch (err) {
        console.error("Failed to fetch properties:", err);
        setError("Could not load properties. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertiesAndSaved();
  }, [selectedType, selectedCity]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-surface" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>No properties found in this category.</p>
      </div>
    );
  }

  return (
    <div className="px-5 pb-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {properties.map(property => (
        <PropertyCard
          key={property._id}
          data={property}
          isSaved={savedHotelIds.includes(property._id)}
        />
      ))}
    </div>
  );
};

export default PropertyFeed;
