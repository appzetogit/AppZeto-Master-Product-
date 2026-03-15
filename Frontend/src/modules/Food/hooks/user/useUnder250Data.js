import { useState, useCallback, useEffect } from 'react';
import { restaurantAPI } from "@food/api";
import api from "@food/api";

export const useUnder250Data = (zoneId) => {
  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [restRes, catRes, bannerRes] = await Promise.all([
        restaurantAPI.getRestaurantsUnder250(zoneId),
        api.get('/categories/public').catch(() => ({ data: { success: false } })),
        api.get('/hero-banners/under-250/public').catch(() => ({ data: { success: false } }))
      ]);

      if (restRes.data?.success) setRestaurants(restRes.data.data.restaurants || []);
      if (catRes.data?.success) setCategories(catRes.data.data.categories || []);
      if (bannerRes.data?.success && bannerRes.data.data.banners?.length > 0) {
        setBanner(bannerRes.data.data.banners[0]);
      }
    } catch (err) {
      console.error("Failed to fetch Under 250 data", err);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { restaurants, categories, banner, loading };
};
