import { useState, useCallback, useEffect, useMemo } from 'react';
import api, { restaurantAPI } from "@food/api";
import { normalizeImageUrl, extractImages, calculateDistance, slugify } from "@food/utils/common";

export const useHomeData = (location, zoneId) => {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [landingCategories, setLandingCategories] = useState([]);
  const [exploreMoreItems, setExploreMoreItems] = useState([]);
  const [exploreMoreHeading, setExploreMoreHeading] = useState("Explore More");
  
  const [loadingBanners, setLoadingBanners] = useState(true);
  const [heroBannerImages, setHeroBannerImages] = useState([]);
  const [heroBannersData, setHeroBannersData] = useState([]);

  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [restaurantsData, setRestaurantsData] = useState([]);
  const [recommendedRestaurants, setRecommendedRestaurants] = useState([]);
  
  const [menuCategories, setMenuCategories] = useState([]);
  const [loadingMenuCategories, setLoadingMenuCategories] = useState(false);
  const [restaurantDietMeta, setRestaurantDietMeta] = useState({});

  const fetchLandingConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await api.get('/landing-settings/public');
      if (res.data.success) {
        const { categories, exploreMore, exploreMoreHeading, recommendedRestaurants: recs } = res.data.data;
        setLandingCategories(categories || []);
        setExploreMoreItems(exploreMore || []);
        setExploreMoreHeading(exploreMoreHeading || "Explore More");
        setRecommendedRestaurants(recs || []);
      }
    } catch (err) {
      console.error("Failed to fetch landing config", err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      setLoadingBanners(true);
      const res = await api.get('/hero-banners/public');
      if (res.data.success) {
        const banners = res.data.data.banners || [];
        setHeroBannersData(banners);
        setHeroBannerImages(banners.map(b => normalizeImageUrl(b.imageUrl)).filter(Boolean));
      }
    } catch (err) {
      console.error("Failed to fetch banners", err);
    } finally {
      setLoadingBanners(false);
    }
  }, []);

  const fetchRestaurants = useCallback(async (filters = {}) => {
    try {
      setLoadingRestaurants(true);
      const params = {
        _ts: Date.now(),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.cuisine && { cuisine: filters.cuisine }),
        ...(zoneId && { zoneId })
      };
      const res = await restaurantAPI.getRestaurants(params);
      if (res.data?.success) {
        const raw = res.data.data.restaurants || [];
        const userLat = location?.latitude;
        const userLng = location?.longitude;

        const transformed = raw.map(r => {
          const rLoc = r.location;
          const rLat = rLoc?.latitude || (rLoc?.coordinates?.[1]);
          const rLng = rLoc?.longitude || (rLoc?.coordinates?.[0]);
          
          let distInKm = calculateDistance(userLat, userLng, rLat, rLng);
          const profileImgs = extractImages(r.profileImage || r.image);
          const coverImgs = extractImages(r.coverImages);
          const allImgs = Array.from(new Set([...profileImgs, ...coverImgs]));

          return {
            ...r,
            id: r.restaurantId || r._id,
            mongoId: r._id,
            distanceInKm: distInKm,
            image: allImgs[0] || "",
            images: allImgs,
            rating: r.rating || 4.5,
            cuisine: r.cuisines?.[0] || "Multi-cuisine"
          };
        });
        setRestaurantsData(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch restaurants", err);
    } finally {
      setLoadingRestaurants(false);
    }
  }, [location, zoneId]);

  const fetchMenuMeta = useCallback(async () => {
    if (!restaurantsData.length) return;
    setLoadingMenuCategories(true);
    try {
      const categoryMap = new Map();
      const dietMeta = {};

      const menuResponses = await Promise.all(
        restaurantsData.slice(0, 50).map(async (r) => {
          try {
            const res = await restaurantAPI.getMenuByRestaurantId(r.id);
            return { id: r.id, menu: res?.data?.data?.menu };
          } catch {
            return { id: r.id, menu: null };
          }
        })
      );

      menuResponses.forEach(({ id, menu }) => {
        let hasVeg = false, hasNonVeg = false;
        const sections = menu?.sections || [];
        sections.forEach(s => {
          const items = s.items || [];
          items.forEach(i => {
            const type = String(i.foodType || "").toLowerCase();
            if (type === "veg") hasVeg = true;
            if (type.includes("non")) hasNonVeg = true;
          });
          const slug = slugify(s.name);
          if (slug && !categoryMap.has(slug)) {
            categoryMap.set(slug, {
              id: slug, name: s.name, slug, label: s.name,
              image: items[0]?.image ? normalizeImageUrl(items[0].image) : ""
            });
          }
        });
        dietMeta[id] = { hasVeg, hasNonVeg, isPureVeg: hasVeg && !hasNonVeg };
      });

      setMenuCategories(Array.from(categoryMap.values()));
      setRestaurantDietMeta(dietMeta);
    } finally {
      setLoadingMenuCategories(false);
    }
  }, [restaurantsData]);

  useEffect(() => {
    fetchLandingConfig();
    fetchBanners();
  }, [fetchLandingConfig, fetchBanners]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    fetchMenuMeta();
  }, [fetchMenuMeta]);

  return {
    loadingConfig, landingCategories, exploreMoreItems, exploreMoreHeading, recommendedRestaurants,
    loadingBanners, heroBannerImages, heroBannersData,
    loadingRestaurants, restaurantsData, setRestaurantsData,
    loadingMenuCategories, menuCategories, restaurantDietMeta,
    fetchRestaurants
  };
};
