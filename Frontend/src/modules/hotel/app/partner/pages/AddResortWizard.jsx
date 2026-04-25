import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { propertyService, hotelService } from '../../../services/apiService';
// Compression removed - Cloudinary handles optimization
import {
  CheckCircle, FileText, Home, Image, Plus, Trash2, MapPin, Search,
  BedDouble, Wifi, Tv, Snowflake, Coffee, ShowerHead, Umbrella, Waves, Mountain, Trees, Sun, ArrowLeft, ArrowRight, Clock, Loader2, Camera, X
} from 'lucide-react';

import logo from '../../../assets/rokologin-removebg-preview.png';
import { isFlutterApp, openFlutterCamera } from '../../../utils/flutterBridge';

const REQUIRED_DOCS_RESORT = [
  { type: "trade_license", name: "Trade License", required: true },
  { type: "electricity_bill", name: "Electricity Bill", required: false }
];

const RESORT_AMENITIES = ["Swimming Pool", "Restaurant", "Bar", "Parking"];
const RESORT_ACTIVITIES = ["Water Sports", "Spa", "Bonfire", "Indoor Games"];
const RESORT_TYPES = [
  { value: 'beach', label: 'Beach Resort', icon: Waves },
  { value: 'hill', label: 'Hill Resort', icon: Mountain },
  { value: 'jungle', label: 'Jungle Resort', icon: Trees },
  { value: 'desert', label: 'Desert Resort', icon: Sun }
];
const ROOM_AMENITIES_OPTIONS = [
  { key: 'seaview', label: 'Sea View', icon: Waves },
  { key: 'ac', label: 'AC', icon: Snowflake },
  { key: 'minibar', label: 'Mini Bar', icon: Coffee },
  { key: 'wifi', label: 'WiFi', icon: Wifi },
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'geyser', label: 'Geyser', icon: ShowerHead }
];
const HOUSE_RULES_OPTIONS = ["No smoking", "No pets", "No loud music", "ID required at check-in", "Visitors not allowed"];

const AddResortWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const existingProperty = location.state?.property || null;
  const isEditMode = !!existingProperty;
  const initialStep = location.state?.initialStep || 1;
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState(null);

  // Maps / Location State
  const [nearbySearchQuery, setNearbySearchQuery] = useState('');
  const [nearbyResults, setNearbyResults] = useState([]);
  const [editingNearbyIndex, setEditingNearbyIndex] = useState(null);
  const [tempNearbyPlace, setTempNearbyPlace] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);

  // Image Upload State (Ref matching Hotel wizard)
  const [uploading, setUploading] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isFlutter, setIsFlutter] = useState(false);

  useEffect(() => {
    setIsFlutter(isFlutterApp());
  }, []);
  const coverImageFileInputRef = useRef(null);
  const propertyImagesFileInputRef = useRef(null);
  const roomImagesFileInputRef = useRef(null);
  const documentInputRefs = useRef([]);

  // Form State
  const [propertyForm, setPropertyForm] = useState({
    propertyName: '',
    description: '',
    shortDescription: '',
    resortType: '',
    activities: [],
    coverImage: '',
    propertyImages: [],
    address: { country: '', state: '', city: '', area: '', fullAddress: '', pincode: '' },
    location: { type: 'Point', coordinates: ['', ''] },
    nearbyPlaces: [],
    amenities: [],
    checkInTime: '',
    checkOutTime: '',
    contactNumber: '',
    cancellationPolicy: '',
    suitability: 'none',
    houseRules: [],
    documents: REQUIRED_DOCS_RESORT.map(d => ({ type: d.type, name: d.name, required: d.required, fileUrl: '' }))
  });

  const [roomTypes, setRoomTypes] = useState([]);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRoomTypeIndex, setEditingRoomTypeIndex] = useState(null);
  const [originalRoomTypeIds, setOriginalRoomTypeIds] = useState([]);

  // --- Persistence Logic ---
  const STORAGE_KEY = `rukko_resort_wizard_draft_${existingProperty?._id || 'new'}`;

  // 1. Load from localStorage
  useEffect(() => {
    if (isEditMode) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step: savedStep, propertyForm: savedForm, roomTypes: savedRooms, createdProperty: savedProp } = JSON.parse(saved);
        setStep(savedStep);
        setPropertyForm(savedForm);
        setRoomTypes(savedRooms);
        if (savedProp) setCreatedProperty(savedProp);
      } catch (e) {
        console.error("Failed to load resort draft", e);
      }
    }
  }, []);

  // 2. Save to localStorage
  useEffect(() => {
    if (isEditMode) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, propertyForm, roomTypes, createdProperty }));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [step, propertyForm, roomTypes, createdProperty]);

  // --- WebView History / Back Button Fix ---
  useEffect(() => {
    const currentHash = window.location.hash;
    const targetHash = `#step${step}`;
    if (currentHash !== targetHash) {
      if (step === 1 && (!currentHash || currentHash === '#step1')) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${targetHash}`);
      } else {
        window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${targetHash}`);
      }
    }
  }, [step]);

  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#step')) {
        const hashStep = parseInt(hash.replace('#step', ''), 10);
        if (!isNaN(hashStep)) {
          setStep(hashStep);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Helper Functions
  const updatePropertyForm = (path, value) => {
    setPropertyForm(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
  };

  const updateRoomType = (path, value) => {
    if (!editingRoomType) return;
    setEditingRoomType(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      const keys = Array.isArray(path) ? path : String(path).split('.');
      let ref = clone;
      for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
      ref[keys[keys.length - 1]] = value;
      return clone;
    });
  };

  // --- API / Maps Logic ---
  const useCurrentLocation = async () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    try {
      // 1. Get Coordinates
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // 2. Call Backend API
      const res = await hotelService.getAddressFromCoordinates(lat, lng);

      updatePropertyForm(['location', 'coordinates'], [String(lng), String(lat)]);
      updatePropertyForm('address', {
        country: res.country || '',
        state: res.state || '',
        city: res.city || '',
        area: res.area || '',
        fullAddress: res.fullAddress || '',
        pincode: res.pincode || ''
      });
    } catch (err) {
      console.error("Location Error:", err);
      if (err.code === 1) { // PERMISSION_DENIED
        setError('Location permission denied. Please enable it in browser settings.');
      } else if (err.code === 2) { // POSITION_UNAVAILABLE
        setError('Location unavailable. Check your GPS/network.');
      } else if (err.code === 3) { // TIMEOUT
        setError('Location request timed out.');
      } else {
        setError(err.message || 'Failed to fetch address from coordinates');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  const searchLocationForAddress = async () => {
    try {
      setError('');
      if (!locationSearchQuery.trim()) return;
      const res = await hotelService.searchLocation(locationSearchQuery.trim());
      setLocationResults(Array.isArray(res?.results) ? res.results : []);
    } catch {
      setError('Failed to search location');
    }
  };

  const selectLocationResult = async (place) => {
    try {
      setError('');
      const lat = place.lat;
      const lng = place.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return;
      const res = await hotelService.getAddressFromCoordinates(lat, lng);
      updatePropertyForm(['location', 'coordinates'], [String(lng), String(lat)]);
      updatePropertyForm('address', {
        country: res.country || '',
        state: res.state || '',
        city: res.city || '',
        area: res.area || '',
        fullAddress: res.fullAddress || '',
        pincode: res.pincode || ''
      });
      setLocationResults([]);
    } catch {
      setError('Failed to use selected location');
    }
  };

  const searchNearbyPlaces = async () => {
    try {
      setError('');
      if (!nearbySearchQuery.trim()) return;
      const res = await hotelService.searchLocation(nearbySearchQuery.trim());
      setNearbyResults(Array.isArray(res?.results) ? res.results : []);
    } catch {
      setError('Failed to search places');
    }
  };

  const selectNearbyPlace = async (place) => {
    try {
      console.log('Selecting nearby place:', place);
      // Initialize state for name and type immediately
      setTempNearbyPlace(prev => ({
        ...prev,
        name: place.name || '',
        type: place.type || 'tourist',
        distanceKm: ''
      }));
      setNearbyResults([]);
      setNearbySearchQuery('');

      let originLat = Number(propertyForm.location.coordinates[1] || 0);
      let originLng = Number(propertyForm.location.coordinates[0] || 0);
      const destLat = place.lat;
      const destLng = place.lng;

      // Auto-fix: If coordinates are missing, try to geocode based on ANY available address info
      if (!originLat || !originLng) {
        console.log('Coordinates missing. Attempting to auto-geocode from property address...');
        const { fullAddress, area, city, state, country } = propertyForm.address;
        // Construct query from most specific to least specific available fields
        const addressParts = [fullAddress, area, city, state, country].filter(part => part && String(part).trim());

        if (addressParts.length > 0) {
          try {
            const query = addressParts.join(', ');
            console.log(`Auto-geocoding with query: "${query}"`);
            const res = await hotelService.searchLocation(query);

            if (res?.results?.[0]?.lat) {
              originLat = res.results[0].lat;
              originLng = res.results[0].lng;
              updatePropertyForm(['location', 'coordinates'], [String(originLng), String(originLat)]);
              console.log('Auto-geocoded coordinates success:', originLat, originLng);
            } else {
              console.warn('Auto-geocode returned no results.');
            }
          } catch (e) {
            console.warn("Failed to auto-geocode address error:", e);
          }
        } else {
          console.warn('No address fields available to auto-geocode.');
        }
      }

      if (originLat && originLng && destLat && destLng) {
        console.log(`Calculating distance: ${originLat},${originLng} -> ${destLat},${destLng}`);
        const distRes = await hotelService.calculateDistance(originLat, originLng, destLat, destLng);
        console.log('Distance calculation result:', distRes);

        // Update distanceKm if valid result found
        if (distRes && typeof distRes.distanceKm !== 'undefined') {
          setTempNearbyPlace(prev => ({
            ...prev,
            distanceKm: String(distRes.distanceKm)
          }));
        }
      } else {
        console.warn('Missing coordinates for distance calculation after auto-geocode attempt', { originLat, originLng, destLat, destLng });
      }
    } catch (err) {
      console.error('Error selecting nearby place:', err);
    }
  };

  const startAddNearbyPlace = () => {
    if (propertyForm.nearbyPlaces.length >= 5) {
      setError('Maximum 5 nearby places allowed');
      return;
    }
    setError('');
    setEditingNearbyIndex(-1);
    setTempNearbyPlace({ name: '', type: 'tourist', distanceKm: '' });
    setNearbySearchQuery('');
    setNearbyResults([]);
  };

  const startEditNearbyPlace = (index) => {
    setError('');
    setEditingNearbyIndex(index);
    setTempNearbyPlace({ ...propertyForm.nearbyPlaces[index] });
    setNearbySearchQuery('');
    setNearbyResults([]);
  };

  const saveNearbyPlace = () => {
    if (!tempNearbyPlace.name || !tempNearbyPlace.distanceKm) {
      setError('Name and Distance are required');
      return;
    }
    const arr = [...propertyForm.nearbyPlaces];
    if (editingNearbyIndex === -1) {
      arr.push(tempNearbyPlace);
    } else {
      arr[editingNearbyIndex] = tempNearbyPlace;
    }
    updatePropertyForm('nearbyPlaces', arr);
    setEditingNearbyIndex(null);
    setError('');
  };

  const deleteNearbyPlace = (index) => {
    const arr = propertyForm.nearbyPlaces.filter((_, i) => i !== index);
    updatePropertyForm('nearbyPlaces', arr);
  };

  const cancelEditNearbyPlace = () => {
    setEditingNearbyIndex(null);
    setError('');
  };

  // --- Room Type ---
  const startAddRoomType = () => {
    setError('');
    setEditingRoomTypeIndex(-1);
    setEditingRoomType({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: '',
      inventoryType: 'room',
      roomCategory: 'private',
      maxAdults: '',
      maxChildren: 0,
      totalInventory: '',
      pricePerNight: '',
      extraAdultPrice: 0,
      extraChildPrice: 0,
      images: [],
      amenities: [],
      isActive: true
    });
  };

  const startEditRoomType = (index) => {
    setError('');
    setEditingRoomTypeIndex(index);
    const rt = roomTypes[index];
    setEditingRoomType({
      ...rt,
      images: Array.isArray(rt.images) ? rt.images : [],
      amenities: Array.isArray(rt.amenities) ? rt.amenities : []
    });
  };

  const deleteRoomType = (index) => {
    setRoomTypes(prev => prev.filter((_, i) => i !== index));
    if (editingRoomTypeIndex === index) {
      setEditingRoomType(null);
      setEditingRoomTypeIndex(null);
    }
  };

  const cancelEditRoomType = () => {
    setEditingRoomType(null);
    setEditingRoomTypeIndex(null);
    setError('');
  };

  const saveRoomType = () => {
    if (!editingRoomType) return;
    if (!editingRoomType.name || !editingRoomType.pricePerNight) {
      setError('Room type name and price required');
      return;
    }
    if ((editingRoomType.images || []).filter(Boolean).length < 3) {
      setError('Please upload at least 3 room images');
      return;
    }
    const next = [...roomTypes];
    if (editingRoomTypeIndex === -1 || editingRoomTypeIndex == null) {
      next.push(editingRoomType);
    } else {
      next[editingRoomTypeIndex] = editingRoomType;
    }
    setRoomTypes(next);
    setEditingRoomType(null);
    setEditingRoomTypeIndex(null);
    setError('');
  };

  const toggleRoomAmenity = (label) => {
    setEditingRoomType(prev => {
      if (!prev) return prev;
      const has = prev.amenities.includes(label);
      return {
        ...prev,
        amenities: has ? prev.amenities.filter(a => a !== label) : [...prev.amenities, label]
      };
    });
  };

  useEffect(() => {
    setIsFlutter(isFlutterApp());
  }, []);

  const handleCameraUpload = async (type, onDone) => {
    try {
      setError('');
      console.log('[Camera] Opening Flutter camera...');

      const result = await openFlutterCamera();
      setUploading(type);

      if (!result.success || !result.base64) {
        throw new Error('Camera capture failed');
      }

      console.log('[Camera] Image captured, uploading...');

      const isSingle = type === 'cover' || type === 'room' || type.startsWith('doc');

      const res = await hotelService.uploadImagesBase64(result.images || [result]);
      console.log('[Camera] Upload success:', res);

      if (res && res.success && res.files && res.files.length > 0) {
        if (isSingle) {
          onDone(res.files[0].url);
        } else {
          // Pass all uploaded URLs
          const urls = res.files.map(f => f.url);
          onDone(urls);
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('[Camera] Error:', err);
      setError(err.message || 'Camera capture failed');
    } finally {
      setUploading(null);
    }
  };

  const handleImageUpload = (e, type) => {
    if (e.target.files && e.target.files.length > 0) {
      if (type === 'cover') {
        uploadImages(e.target.files, type, (urls) => {
          if (urls && urls.length > 0) updatePropertyForm('coverImage', urls[0]);
        });
      } else if (type === 'gallery') {
        uploadImages(e.target.files, type, (urls) => {
          if (urls && urls.length > 0) updatePropertyForm('propertyImages', [...propertyForm.propertyImages, ...urls]);
        });
      }
    }
  };

  const uploadImages = async (files, type, onDone) => {
    try {
      setUploading(type);
      const fd = new FormData();

      const fileArray = Array.from(files);
      console.log(`Processing ${fileArray.length} images...`);

      for (const file of fileArray) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }
        if (file.size > 25 * 1024 * 1024) {
          throw new Error(`Image ${file.name} is too large. Maximum 25MB allowed.`);
        }
        console.log(`Adding ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)...`);
        fd.append('images', file);
      }

      const res = await hotelService.uploadImages(fd);
      const urls = Array.isArray(res?.urls) ? res.urls : [];
      console.log('Upload done, urls:', urls);
      onDone(urls);
    } catch (err) {
      console.error("Upload failed", err);
      let msg = 'Upload failed';
      if (typeof err === 'string') msg = err;
      else if (err?.response?.data?.message) msg = err.response.data.message;
      else if (err?.message) msg = err.message;

      if (msg === 'Network Error' || (err?.response && err.response.status === 413)) {
        msg = 'Upload failed: File size may be too large (Max 10MB).';
      }
      setError(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveImage = async (url, type, index = null) => {
    if (!url) return;
    try {
      if (url.includes('cloudinary.com') && url.includes('rukkoin')) {
        await hotelService.deleteImage(url);
      }
    } catch (err) {
      console.warn("Delete image failed:", err);
    }

    if (type === 'cover') {
      updatePropertyForm('coverImage', '');
    } else if (type === 'gallery') {
      const arr = [...propertyForm.propertyImages];
      arr.splice(index, 1);
      updatePropertyForm('propertyImages', arr);
    } else if (type === 'room') {
      setEditingRoomType(prev => {
        const next = [...(prev.images || [])];
        next.splice(index, 1);
        return { ...prev, images: next };
      });
    }
  };

  // --- Load Edit ---
  useEffect(() => {
    const loadForEdit = async () => {
      if (!isEditMode || !existingProperty?._id) return;
      setLoading(true);
      setError('');
      try {
        const res = await propertyService.getDetails(existingProperty._id);
        const prop = res.property || existingProperty;
        const docs = res.documents?.documents || [];
        const rts = res.roomTypes || [];
        setCreatedProperty(prop);
        setPropertyForm({
          propertyName: prop.propertyName || '',
          description: prop.description || '',
          shortDescription: prop.shortDescription || '',
          resortType: prop.resortType || 'beach',
          activities: prop.activities || [],
          coverImage: prop.coverImage || '',
          propertyImages: prop.propertyImages || [],
          address: {
            country: prop.address?.country || '',
            state: prop.address?.state || '',
            city: prop.address?.city || '',
            area: prop.address?.area || '',
            fullAddress: prop.address?.fullAddress || '',
            pincode: prop.address?.pincode || ''
          },
          location: {
            type: 'Point',
            coordinates: [
              typeof prop.location?.coordinates?.[0] === 'number' ? String(prop.location.coordinates[0]) : '',
              typeof prop.location?.coordinates?.[1] === 'number' ? String(prop.location.coordinates[1]) : ''
            ]
          },
          nearbyPlaces: Array.isArray(prop.nearbyPlaces) && prop.nearbyPlaces.length
            ? prop.nearbyPlaces.map(p => ({
              name: p.name || '',
              type: p.type || 'tourist',
              distanceKm: typeof p.distanceKm === 'number' ? String(p.distanceKm) : ''
            })) : [],
          amenities: prop.amenities || [],
          checkInTime: prop.checkInTime || '',
          checkOutTime: prop.checkOutTime || '',
          cancellationPolicy: prop.cancellationPolicy || '',
          houseRules: prop.houseRules || [],
          contactNumber: prop.contactNumber || '',
          suitability: prop.suitability || 'none',
          documents: docs.length
            ? docs.map(d => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '', required: REQUIRED_DOCS_RESORT.find(rd => rd.type === (d.type || d.name))?.required || false }))
            : REQUIRED_DOCS_RESORT.map(d => ({ type: d.type, name: d.name, required: d.required, fileUrl: '' }))
        });

        if (rts.length) {
          setRoomTypes(rts.map(rt => ({
            id: rt._id, backendId: rt._id,
            name: rt.name,
            inventoryType: rt.inventoryType || 'room',
            roomCategory: rt.roomCategory || 'private',
            maxAdults: rt.maxAdults ?? 1, maxChildren: rt.maxChildren ?? 0,
            totalInventory: rt.totalInventory ?? 1,
            pricePerNight: rt.pricePerNight ?? '',
            extraAdultPrice: rt.extraAdultPrice ?? 0, extraChildPrice: rt.extraChildPrice ?? 0,
            images: rt.images || [], amenities: rt.amenities || [], isActive: rt.isActive ?? true
          })));
          setOriginalRoomTypeIds(rts.map(rt => rt._id));
        } else {
          setOriginalRoomTypeIds([]);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    loadForEdit();
  }, [isEditMode, existingProperty]);

  // --- Strict Validation ---
  const nextFromBasic = () => {
    setError('');
    if (!propertyForm.propertyName || !propertyForm.shortDescription) {
      setError('Property Name and Short Description required');
      return;
    }
    if (!propertyForm.resortType) {
      setError('Please select a Resort Type');
      return;
    }
    setStep(2);
  };
  const nextFromLocation = () => {
    setError('');
    if (!propertyForm.address.fullAddress || !propertyForm.address.city || !propertyForm.location.coordinates[0]) {
      setError('Full Address and Map Location are required');
      return;
    }
    setStep(3);
  };
  const nextFromAmenities = () => {
    setError('');
    // Resort might not strictly require amenities, but usually good to have.
    setStep(4);
  };
  const nextFromNearby = () => {
    setError('');
    if (propertyForm.nearbyPlaces.length < 1) {
      setError('Please add at least 1 nearby place');
      return;
    }
    setStep(5);
  };
  const nextFromImages = () => {
    setError('');
    if (!propertyForm.coverImage) {
      setError('Cover Image is required');
      return;
    }
    if (propertyForm.propertyImages.length < 4) {
      setError('At least 4 Property Images required');
      return;
    }
    setStep(6);
  };
  const nextFromRoomTypes = () => {
    setError('');
    if (!roomTypes.length) {
      setError('At least one Room/Cottage Type required');
      return;
    }
    // Validate each room if needed, but basic checks on add/edit are usually enough.
    setStep(7);
  };
  const nextFromRules = () => {
    setError('');
    if (!propertyForm.checkInTime || !propertyForm.checkOutTime) {
      setError('Check-in and Check-out times required');
      return;
    }
    if (!propertyForm.cancellationPolicy) {
      setError('Cancellation Policy required');
      return;
    }
    setStep(8);
  };
  const nextFromDocs = () => {
    setError('');
    const missing = propertyForm.documents.filter(d => d.required && !d.fileUrl);
    if (missing.length > 0) {
      setError(`Please upload required documents: ${missing.map(d => d.name).join(', ')}`);
      return;
    }
    setStep(9);
  };

  const submitAll = async () => {
    setLoading(true);
    setError('');
    try {
      const propertyPayload = {
        propertyType: 'resort',
        propertyName: propertyForm.propertyName,
        contactNumber: propertyForm.contactNumber,
        description: propertyForm.description,
        shortDescription: propertyForm.shortDescription,
        resortType: propertyForm.resortType,
        activities: propertyForm.activities,
        coverImage: propertyForm.coverImage,
        propertyImages: propertyForm.propertyImages.filter(Boolean),
        address: propertyForm.address,
        location: {
          type: 'Point',
          coordinates: [Number(propertyForm.location.coordinates[0]), Number(propertyForm.location.coordinates[1])]
        },
        nearbyPlaces: propertyForm.nearbyPlaces.map(p => ({
          name: p.name, type: p.type, distanceKm: Number(p.distanceKm || 0)
        })),
        amenities: propertyForm.amenities,
        checkInTime: propertyForm.checkInTime,
        checkOutTime: propertyForm.checkOutTime,
        cancellationPolicy: propertyForm.cancellationPolicy,
        suitability: propertyForm.suitability,
        houseRules: propertyForm.houseRules,
        documents: propertyForm.documents
      };

      let propId = createdProperty?._id;
      if (propId) {
        const updated = await propertyService.update(propId, propertyPayload);
        propId = updated.property?._id || propId;

        const existingIds = new Set(isEditMode ? originalRoomTypeIds : []);
        const persistedIds = [];
        for (const rt of roomTypes) {
          const payload = {
            name: rt.name,
            inventoryType: 'room',
            roomCategory: rt.roomCategory,
            maxAdults: Number(rt.maxAdults),
            maxChildren: Number(rt.maxChildren || 0),
            totalInventory: Number(rt.totalInventory || 0),
            pricePerNight: Number(rt.pricePerNight),
            extraAdultPrice: Number(rt.extraAdultPrice || 0),
            extraChildPrice: Number(rt.extraChildPrice || 0),
            images: rt.images.filter(Boolean),
            amenities: rt.amenities
          };
          if (rt.backendId) {
            await propertyService.updateRoomType(propId, rt.backendId, payload);
            persistedIds.push(rt.backendId);
          } else {
            const created = await propertyService.addRoomType(propId, payload);
            if (created.roomType?._id) persistedIds.push(created.roomType._id);
          }
        }
        for (const id of existingIds) {
          if (!persistedIds.includes(id)) await propertyService.deleteRoomType(propId, id);
        }
      } else {
        // Atomic Create
        propertyPayload.roomTypes = roomTypes.map(rt => ({
          name: rt.name,
          inventoryType: 'room',
          roomCategory: rt.roomCategory,
          maxAdults: Number(rt.maxAdults),
          maxChildren: Number(rt.maxChildren || 0),
          totalInventory: Number(rt.totalInventory || 0),
          pricePerNight: Number(rt.pricePerNight),
          extraAdultPrice: Number(rt.extraAdultPrice || 0),
          extraChildPrice: Number(rt.extraChildPrice || 0),
          images: rt.images.filter(Boolean),
          amenities: rt.amenities
        }));
        const res = await propertyService.create(propertyPayload);
        propId = res.property?._id;
        setCreatedProperty(res.property);
      }
      localStorage.removeItem(STORAGE_KEY);
      setStep(10);
    } catch (e) {
      setError(e?.message || 'Failed to submit resort');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      navigate(-1);
    }
  };

  const clearCurrentStep = () => {
    if (!window.confirm("Clear all fields in this step?")) return;
    if (step === 1) {
      setPropertyForm(prev => ({ ...prev, propertyName: '', description: '', shortDescription: '', resortType: 'beach', activities: [] }));
    } else if (step === 2) {
      updatePropertyForm('address', { country: '', state: '', city: '', area: '', fullAddress: '', pincode: '' });
      updatePropertyForm(['location', 'coordinates'], ['', '']);
    } else if (step === 3) {
      updatePropertyForm('amenities', []);
    } else if (step === 4) {
      updatePropertyForm('nearbyPlaces', []);
    } else if (step === 5) {
      setPropertyForm(prev => ({ ...prev, coverImage: '', propertyImages: [] }));
    } else if (step === 6) {
      setRoomTypes([]);
    } else if (step === 7) {
      setPropertyForm(prev => ({ ...prev, checkInTime: '', checkOutTime: '', cancellationPolicy: '', houseRules: [] }));
    } else if (step === 8) {
      updatePropertyForm('documents', REQUIRED_DOCS_RESORT.map(d => ({ type: d.type, name: d.name, fileUrl: '' })));
    }
  };

  const handleNext = () => {
    if (loading) return;
    switch (step) {
      case 1:
        nextFromBasic();
        break;
      case 2:
        setStep(3);
        break;
      case 3:
        setStep(4);
        break;
      case 4:
        nextFromNearby();
        break;
      case 5:
        nextFromImages();
        break;
      case 6:
        nextFromRoomTypes();
        break;
      case 7:
        setStep(8);
        break;
      case 8:
        nextFromDocs();
        break;
      case 9:
        submitAll();
        break;
      default:
        break;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Basic Info';
      case 2: return 'Location';
      case 3: return 'Amenities';
      case 4: return 'Nearby Places';
      case 5: return 'Resort Images';
      case 6: return 'Cottages & Rooms';
      case 7: return 'Resort Rules';
      case 8: return 'Documents';
      case 9: return 'Review & Submit';
      default: return '';
    }
  };

  const isEditingSubItem = (step === 4 && editingNearbyIndex !== null) || (step === 6 && editingRoomType !== null);

  const handleExit = () => {
    localStorage.removeItem(STORAGE_KEY);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
        <button onClick={handleBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-sm font-bold text-gray-900">
          {step <= 9 ? `Step ${step} of 9` : 'Registration Complete'}
        </div>
        <button onClick={handleExit} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
          <X size={20} />
        </button>
      </header>

      <div className="w-full h-1 bg-gray-200 sticky top-16 z-20">
        <div className="h-full bg-emerald-600 transition-all duration-500 ease-out" style={{ width: `${(step / 9) * 100}%` }} />
      </div>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-6 pb-32">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{getStepTitle()}</h1>
        </div>

        <div className="bg-white md:p-6 md:rounded-2xl md:shadow-sm md:border md:border-gray-100 space-y-6">
          {step === 1 && (
            <div className="space-y-6">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Resort Name</label>
                  <input className="input w-full" placeholder="e.g. Blue Lagoon Resort" value={propertyForm.propertyName} onChange={e => updatePropertyForm('propertyName', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Resort Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {RESORT_TYPES.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => updatePropertyForm('resortType', type.value)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${propertyForm.resortType === type.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500'
                          : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-gray-600'
                          }`}
                      >
                        <div className={`p-2 rounded-lg ${propertyForm.resortType === type.value ? 'bg-white text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                          <type.icon size={20} />
                        </div>
                        <span className="text-sm font-bold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500">Activities</label>
                  <div className="flex flex-wrap gap-2">
                    {RESORT_ACTIVITIES.map(act => (
                      <button
                        key={act} type="button"
                        onClick={() => {
                          const has = propertyForm.activities.includes(act);
                          updatePropertyForm('activities', has ? propertyForm.activities.filter(a => a !== act) : [...propertyForm.activities, act]);
                        }}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${propertyForm.activities.includes(act)
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-[1.02]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Description</label>
                  <textarea className="input w-full h-24" placeholder="Brief summary for listings..." value={propertyForm.shortDescription} onChange={e => updatePropertyForm('shortDescription', e.target.value)} />
                </div>

                <div className="hidden">
                  <label className="text-xs font-semibold text-gray-500">Detailed Description</label>
                  <textarea className="input w-full min-h-[100px]" placeholder="Tell guests what makes your resort unique..." value={propertyForm.description} onChange={e => updatePropertyForm('description', e.target.value)} />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Contact Number (For Guest Inquiries)</label>
                  <input
                    type="tel"
                    className="input w-full"
                    placeholder="9876543210"
                    value={propertyForm.contactNumber}
                    onChange={e => {
                      // Filter non-digits and limit to 10 digits
                      const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                      updatePropertyForm('contactNumber', digitsOnly);
                    }}
                    maxLength={10}
                  />
                  {propertyForm.contactNumber && propertyForm.contactNumber.length === 10 && (
                    /^[6-9]\d{9}$/.test(propertyForm.contactNumber) ? (
                      <p className="text-[10px] text-green-600 font-medium flex items-center gap-1 mt-1">
                        <span>✓</span> Valid mobile number
                      </p>
                    ) : (
                      <p className="text-[10px] text-red-500 font-medium flex items-center gap-1 mt-1">
                        <span>⚠</span> Mobile number must start with 6, 7, 8, or 9
                      </p>
                    )
                  )}
                  {propertyForm.contactNumber && propertyForm.contactNumber.length > 0 && propertyForm.contactNumber.length < 10 && (
                    <p className="text-[10px] text-gray-500 font-medium mt-1">
                      {10 - propertyForm.contactNumber.length} more digit(s) required
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Suitability</label>
                  <select
                    className="input w-full appearance-none"
                    value={propertyForm.suitability}
                    onChange={e => updatePropertyForm('suitability', e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="Couple Friendly">Couple Friendly</option>
                    <option value="Family Friendly">Family Friendly</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Search Address</label>
                <div className="flex gap-2">
                  <input
                    className="input w-full"
                    placeholder="Search location..."
                    value={locationSearchQuery}
                    onChange={e => setLocationSearchQuery(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={searchLocationForAddress}
                    className="px-4 py-2 bg-[#004F4D] text-white rounded-xl font-bold text-sm hover:bg-[#003d3b] transition-colors"
                  >
                    Search
                  </button>
                </div>
                {locationResults.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mt-1 shadow-lg bg-white max-h-48 overflow-y-auto z-10 relative">
                    {locationResults.map((p, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectLocationResult(p)}
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 text-sm transition-colors"
                      >
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.formatted_address}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-medium">Or Enter Manually</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input className="input col-span-2" placeholder="Full Address" value={propertyForm.address.fullAddress} onChange={e => updatePropertyForm(['address', 'fullAddress'], e.target.value)} />
                <input className="input" placeholder="City" value={propertyForm.address.city} onChange={e => updatePropertyForm(['address', 'city'], e.target.value)} />
                <input className="input" placeholder="State" value={propertyForm.address.state} onChange={e => updatePropertyForm(['address', 'state'], e.target.value)} />
                <input className="input" placeholder="Country" value={propertyForm.address.country} onChange={e => updatePropertyForm(['address', 'country'], e.target.value)} />
                <input className="input" placeholder="Pincode" value={propertyForm.address.pincode} onChange={e => updatePropertyForm(['address', 'pincode'], e.target.value)} />
                <input className="input" placeholder="Area" value={propertyForm.address.area} onChange={e => updatePropertyForm(['address', 'area'], e.target.value)} />
              </div>

              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={loadingLocation}
                className="w-full py-4 rounded-xl border border-dashed border-[#004F4D] text-[#004F4D] bg-[#004F4D]/5 font-bold flex items-center justify-center gap-2 hover:bg-[#004F4D]/10 transition-colors disabled:opacity-50"
              >
                {loadingLocation ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>Fetching Location...</span>
                  </>
                ) : (
                  <>
                    <MapPin size={18} />
                    <span>Use Current Location</span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {RESORT_AMENITIES.map(am => {
                  const isSelected = propertyForm.amenities.includes(am);
                  return (
                    <button
                      key={am}
                      type="button"
                      onClick={() => {
                        const has = propertyForm.amenities.includes(am);
                        updatePropertyForm('amenities', has ? propertyForm.amenities.filter(x => x !== am) : [...propertyForm.amenities, am]);
                      }}
                      className={`
                          relative p-4 rounded-2xl border text-left transition-all duration-200
                          ${isSelected
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md transform scale-[1.02]'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }
                        `}
                    >
                      <span className="font-semibold text-sm">{am}</span>
                      {isSelected && <div className="absolute top-2 right-2 text-white/80"><CheckCircle size={14} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              {/* Check if not editing (editingNearbyIndex is null) */}
              {!isEditingSubItem && (
                <div className="space-y-3">
                  {propertyForm.nearbyPlaces.map((place, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:border-emerald-200 transition-colors shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{place.name}</div>
                          <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {place.type} • <span className="text-emerald-600">{place.distanceKm} km</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => startEditNearbyPlace(idx)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteNearbyPlace(idx)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {propertyForm.nearbyPlaces.length === 0 && (
                    <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MapPin size={24} />
                      </div>
                      <p className="text-gray-500 font-medium">No nearby places added yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add tourist spots, transport hubs, etc.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startAddNearbyPlace}
                    disabled={propertyForm.nearbyPlaces.length >= 5}
                    className="w-full py-4 border border-emerald-200 text-emerald-700 bg-emerald-50/50 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={20} />
                    Add Nearby Place
                  </button>
                </div>
              )}

              {/* Editing Mode */}
              {isEditingSubItem && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-sm">
                      {editingNearbyIndex === -1 ? 'Add New Place' : 'Edit Place'}
                    </span>
                    <button onClick={cancelEditNearbyPlace} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded-md">
                      <span className="text-xs font-bold">Close</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="relative">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Search Place</label>
                      <div className="flex gap-2">
                        <input
                          className="input w-full"
                          placeholder="Type to search..."
                          value={nearbySearchQuery}
                          onChange={e => setNearbySearchQuery(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={searchNearbyPlaces}
                          className="px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm"
                        >
                          Search
                        </button>
                      </div>
                      {nearbyResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {nearbyResults.slice(0, 6).map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => selectNearbyPlace(p)}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-0 text-sm"
                            >
                              <div className="font-semibold text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500 truncate">{p.address || p.formatted_address}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Name</label>
                        <input className="input w-full" value={tempNearbyPlace.name} onChange={e => setTempNearbyPlace({ ...tempNearbyPlace, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Type</label>
                          <select className="input w-full appearance-none" value={tempNearbyPlace.type} onChange={e => setTempNearbyPlace({ ...tempNearbyPlace, type: e.target.value })}>
                            <option value="tourist">Tourist Attraction</option>
                            <option value="airport">Airport</option>
                            <option value="market">Market</option>
                            <option value="railway">Railway Station</option>
                            <option value="bus_stop">Bus Stop</option>
                            <option value="hospital">Hospital</option>
                            <option value="restaurant">Restaurant</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500">Distance (km)</label>
                          <input className="input w-full" type="number" value={tempNearbyPlace.distanceKm} onChange={e => setTempNearbyPlace({ ...tempNearbyPlace, distanceKm: e.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={cancelEditNearbyPlace} className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                      <button type="button" onClick={saveNearbyPlace} className="flex-1 py-3 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all transform active:scale-95">Save Place</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-900">Cover Image</label>
                  <div
                    onClick={() => !uploading && (isFlutter ? handleCameraUpload('cover', url => updatePropertyForm('coverImage', url)) : coverImageFileInputRef.current?.click())}
                    className="relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group"
                  >
                    {propertyForm.coverImage ? (
                      <img src={propertyForm.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                        <Image size={40} className="mb-2 opacity-50" />
                        <span className="text-xs font-bold">{isFlutter ? 'Take/Upload Cover Photo' : 'Upload Cover Photo'}</span>
                      </div>
                    )}
                    {uploading === 'cover' && <div className="absolute inset-0 bg-white/80 flex flex-col gap-2 items-center justify-center"><Loader2 className="animate-spin text-emerald-600" size={32} /><span className="text-sm font-bold text-emerald-700">Uploading...</span></div>}
                    {propertyForm.coverImage && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(propertyForm.coverImage, 'cover'); }}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 shadow-lg hover:bg-red-700 transition-all z-10"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <input ref={coverImageFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'cover')} />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-900">Property Gallery</label>
                    <span className="text-xs text-gray-500">{propertyForm.propertyImages.length} images</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {propertyForm.propertyImages.map((img, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group">
                        <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img, 'gallery', i)}
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => isFlutter ? handleCameraUpload('gallery', urls => updatePropertyForm('propertyImages', [...propertyForm.propertyImages, ...urls])) : propertyImagesFileInputRef.current?.click()}
                      disabled={!!uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all"
                    >
                      {uploading === 'gallery' ? <Loader2 className="animate-spin text-emerald-600" size={24} /> : (isFlutter ? <Camera size={24} /> : <Plus size={24} />)}
                    </button>
                  </div>
                  <input ref={propertyImagesFileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'gallery')} />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              {!editingRoomType && (
                <div className="space-y-4">
                  {roomTypes.length === 0 ? (
                    <div className="text-center py-10 px-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BedDouble size={24} />
                      </div>
                      <p className="text-gray-500 font-medium">No cottages or rooms added yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add details for atleast one category.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {roomTypes.map((rt, index) => (
                        <div key={rt.id || index} className="p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-gray-900">{rt.name}</h3>
                              <div className="text-xs text-gray-500 font-medium mt-0.5">
                                Inventory: <span className="text-gray-900">{rt.totalInventory}</span> · Capacity: <span className="text-gray-900">{rt.maxAdults}A, {rt.maxChildren}C</span>
                              </div>
                            </div>
                            <div className="text-lg font-bold text-emerald-600">₹{rt.pricePerNight}</div>
                          </div>

                          {rt.amenities && rt.amenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {rt.amenities.slice(0, 3).map(a => (
                                <span key={a} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-medium border border-gray-200">{a}</span>
                              ))}
                              {rt.amenities.length > 3 && <span className="px-2 py-0.5 text-[10px] text-gray-400">+{rt.amenities.length - 3} more</span>}
                            </div>
                          )}

                          <div className="flex gap-2 mt-2 pt-3 border-t border-gray-100">
                            <button onClick={() => startEditRoomType(index)} className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                              Edit
                            </button>
                            <button onClick={() => deleteRoomType(index)} className="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={startAddRoomType}
                    className="w-full py-4 border border-emerald-200 text-emerald-700 bg-emerald-50/50 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
                  >
                    <Plus size={20} />
                    Add Cottage / Room
                  </button>
                </div>
              )}

              {editingRoomType && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-sm">
                      {editingRoomTypeIndex === -1 || editingRoomTypeIndex == null ? 'Add Cottage/Room' : 'Edit Cottage/Room'}
                    </span>
                    <button onClick={cancelEditRoomType} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded-md">
                      <span className="text-xs font-bold">Close</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Name</label>
                      <input
                        className="input w-full"
                        placeholder="e.g. Deluxe Beach Cottage"
                        value={editingRoomType.name}
                        onChange={e => setEditingRoomType({ ...editingRoomType, name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Price / Night (₹)</label>
                        <input className="input w-full" type="number" value={editingRoomType.pricePerNight} onChange={e => setEditingRoomType({ ...editingRoomType, pricePerNight: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Total Units</label>
                        <input className="input w-full" type="number" value={editingRoomType.totalInventory} onChange={e => setEditingRoomType({ ...editingRoomType, totalInventory: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Max Adults</label>
                        <input className="input w-full" type="number" value={editingRoomType.maxAdults} onChange={e => setEditingRoomType({ ...editingRoomType, maxAdults: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Max Children</label>
                        <input className="input w-full" type="number" value={editingRoomType.maxChildren} onChange={e => setEditingRoomType({ ...editingRoomType, maxChildren: e.target.value })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Extra Adult Price (₹)</label>
                        <input className="input w-full" type="number" value={editingRoomType.extraAdultPrice} onChange={e => setEditingRoomType({ ...editingRoomType, extraAdultPrice: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Extra Child Price (₹)</label>
                        <input className="input w-full" type="number" value={editingRoomType.extraChildPrice} onChange={e => setEditingRoomType({ ...editingRoomType, extraChildPrice: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-500">Photos</label>
                        <span className="text-[10px] text-gray-400">{(editingRoomType.images || []).filter(Boolean).length} / 3 min</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(editingRoomType.images || []).filter(Boolean).map((img, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                            <img src={img} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => handleRemoveImage(img, 'room', i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white text-red-500 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => isFlutter ? handleCameraUpload('room', url => setEditingRoomType(prev => ({ ...prev, images: [...(prev.images || []), url] }))) : roomImagesFileInputRef.current?.click()} disabled={!!uploading} className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                          {uploading === 'room' ? <Loader2 size={20} className="animate-spin text-emerald-600" /> : <Plus size={20} />}
                        </button>
                        <input ref={roomImagesFileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => {
                          if (e.target.files?.length) uploadImages(e.target.files, 'room', urls => urls.length && setEditingRoomType(prev => ({ ...prev, images: [...(prev.images || []), ...urls] })));
                        }} />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <label className="text-xs font-semibold text-gray-500">Amenities</label>
                      <div className="flex flex-wrap gap-2">
                        {ROOM_AMENITIES_OPTIONS.map(opt => {
                          const selected = editingRoomType.amenities.includes(opt.label);
                          const Icon = opt.icon;
                          return (
                            <button key={opt.key} type="button" onClick={() => toggleRoomAmenity(opt.label)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                              <Icon size={14} /> {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={cancelEditRoomType} className="flex-1 py-3 text-gray-600 font-semibold bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
                      <button type="button" onClick={saveRoomType} className="flex-1 py-3 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-md shadow-emerald-200 transition-all transform active:scale-95">Save</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Check-in Time</label>
                    <div className="relative">
                      <input className="input w-full pl-9" placeholder="3:00 PM" value={propertyForm.checkInTime} onChange={e => updatePropertyForm('checkInTime', e.target.value)} />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="text-xs">🕒</span></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500">Check-out Time</label>
                    <div className="relative">
                      <input className="input w-full pl-9" placeholder="11:00 AM" value={propertyForm.checkOutTime} onChange={e => updatePropertyForm('checkOutTime', e.target.value)} />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><span className="text-xs">🕒</span></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Cancellation Policy</label>
                  <textarea
                    className="input w-full min-h-[100px]"
                    placeholder="e.g., Free cancellation before 10 days..."
                    value={propertyForm.cancellationPolicy}
                    onChange={e => updatePropertyForm('cancellationPolicy', e.target.value)}
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-xs font-semibold text-gray-500">Resort Rules</label>
                  <div className="flex flex-wrap gap-2">
                    {HOUSE_RULES_OPTIONS.map(r => {
                      const isSelected = propertyForm.houseRules.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            const has = propertyForm.houseRules.includes(r);
                            updatePropertyForm('houseRules', has ? propertyForm.houseRules.filter(x => x !== r) : [...propertyForm.houseRules, r]);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-emerald-50'}`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
              <div className="space-y-4">
                <div className="text-sm font-semibold text-gray-700">Please provide the following documents</div>
                <div className="grid gap-3">
                  {propertyForm.documents.map((doc, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-2xl bg-white hover:border-emerald-200 transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-gray-900">{doc.name}</div>
                          <div className={`text-xs mt-0.5 ${doc.required ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            {doc.required ? 'Required *' : 'Optional'}
                          </div>
                        </div>
                        {doc.fileUrl ? (
                          <div className="bg-emerald-50 text-emerald-700 p-1.5 rounded-full"><CheckCircle size={18} /></div>
                        ) : (
                          <div className="bg-gray-100 text-gray-400 p-1.5 rounded-full"><FileText size={18} /></div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => isFlutter
                            ? handleCameraUpload(`doc_${idx}`, url => {
                              const next = [...propertyForm.documents];
                              next[idx].fileUrl = url;
                              updatePropertyForm('documents', next);
                            })
                            : documentInputRefs.current[idx]?.click()
                          }
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-bold transition-all ${doc.fileUrl
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-gray-300 bg-gray-50 text-gray-600 hover:bg-white hover:border-emerald-400 hover:text-emerald-600'
                            }`}
                        >
                          {uploading === `doc_${idx}` ? (
                            <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                          ) : doc.fileUrl ? (
                            <>Change File</>
                          ) : (
                            <><Plus size={16} /> Upload</>
                          )}
                        </button>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-2.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors border border-gray-200 hover:border-emerald-200 bg-white">
                            <Search size={18} />
                          </a>
                        )}
                      </div>

                      <input
                        type="file"
                        className="hidden"
                        ref={el => (documentInputRefs.current[idx] = el)}
                        onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          uploadImages([file], `doc_${idx}`, urls => {
                            if (urls[0]) {
                              const updated = [...propertyForm.documents];
                              updated[idx] = { ...updated[idx], fileUrl: urls[0] };
                              updatePropertyForm('documents', updated);
                            }
                          });
                          e.target.value = '';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-6">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex gap-3">
                <div className="bg-emerald-100 text-emerald-700 p-2 rounded-full h-fit"><CheckCircle size={20} /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Review Compliance</h3>
                  <p className="text-xs text-gray-600 mt-1">Please review the details below carefully before submitting.</p>
                </div>
              </div>

              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              <div className="space-y-4">
                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3">Property Details</h3>
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-emerald-900">{propertyForm.propertyName || 'No Name'}</div>
                    <div className="text-sm font-semibold text-emerald-600">{propertyForm.resortType} Resort</div>
                    <div className="text-sm text-gray-600 flex items-start gap-1">
                      <MapPin size={14} className="mt-0.5 shrink-0" /> {propertyForm.address.fullAddress || 'No Address'}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3">Cottages & Rooms ({roomTypes.length})</h3>
                  {roomTypes.length > 0 ? (
                    <div className="space-y-2">
                      {roomTypes.map((rt, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600 font-medium">{rt.name}</span>
                          <span className="font-bold text-gray-900">₹{rt.pricePerNight}</span>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg">No room types added!</div>}
                </div>

                <div className="border border-gray-200 rounded-2xl p-5 bg-white shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 mb-3">Documents ({propertyForm.documents.filter(d => d.fileUrl).length}/{propertyForm.documents.length})</h3>
                  <div className="space-y-2">
                    {propertyForm.documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {doc.fileUrl ? <CheckCircle size={14} className="text-emerald-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300 bg-gray-50"></div>}
                          <span className={doc.fileUrl ? 'text-gray-700' : 'text-gray-500'}>{doc.name}</span>
                        </div>
                        <span className="text-xs text-gray-400">{doc.fileUrl ? 'Attached' : 'Optional'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 10 && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center transition-all animate-bounce">
                <CheckCircle size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-gray-900">Registration Submitted!</h2>
                <p className="text-gray-500 max-w-sm mx-auto">Your resort registration has been sent for verification. Our team will review it and get back to you shortly.</p>
              </div>
              <button
                onClick={() => navigate('/hotel/properties')}
                className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Go to My Properties
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:px-6 z-40 bg-white/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={step === 1 || loading}
            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Back
          </button>
          {step < 9 && (
            <button
              onClick={clearCurrentStep}
              disabled={loading}
              className="px-4 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 disabled:opacity-50 transition-all text-sm"
            >
              Clear Step
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={loading || (step === 6 && roomTypes.length === 0)}
            className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {step === 9 ? (loading ? 'Submitting...' : 'Submit Property') : 'Continue'}
          </button>
        </div>
      </footer>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AddResortWizard;
