import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { propertyService, hotelService } from '../../../services/apiService';
// Compression removed - Cloudinary handles optimization
import { CheckCircle, FileText, Home, Image, Plus, Trash2, MapPin, Search, BedDouble, Wifi, Snowflake, Coffee, ShowerHead, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Upload, X, Clock, Loader2, Camera } from 'lucide-react';
import logo from '../../../assets/rokologin-removebg-preview.png';
import { isFlutterApp, openFlutterCamera } from '../../../utils/flutterBridge';

const REQUIRED_DOCS_VILLA = [
  { type: "trade_license", name: "Trade License", required: true },
  { type: "electricity_bill", name: "Electricity Bill", required: false }
];
const VILLA_AMENITIES = ["Private Pool", "Garden", "Parking", "Kitchen", "WiFi"];
const HOUSE_RULES_OPTIONS = ["No smoking", "No pets", "No loud music", "ID required at check-in", "Visitors not allowed"];
const ROOM_AMENITIES = [
  { key: 'pool', label: 'Private Pool', icon: Snowflake },
  { key: 'wifi', label: 'WiFi', icon: Wifi },
  { key: 'kitchen', label: 'Kitchen', icon: Coffee },
  { key: 'geyser', label: 'Geyser', icon: ShowerHead },
  { key: 'balcony', label: 'Balcony', icon: BedDouble }
];

const AddVillaWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const existingProperty = location.state?.property || null;
  const isEditMode = !!existingProperty;
  const initialStep = location.state?.initialStep || 1;
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdProperty, setCreatedProperty] = useState(null);
  const [nearbySearchQuery, setNearbySearchQuery] = useState('');
  const [nearbyResults, setNearbyResults] = useState([]);
  const [editingNearbyIndex, setEditingNearbyIndex] = useState(null);
  const [tempNearbyPlace, setTempNearbyPlace] = useState({ name: '', type: 'tourist', distanceKm: '' });
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [uploading, setUploading] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [isFlutter, setIsFlutter] = useState(false);
  const [customHouseRulesDraft, setCustomHouseRulesDraft] = useState('');

  useEffect(() => {
    setIsFlutter(isFlutterApp());
  }, []);

  useEffect(() => {
    if (step === 7) {
      setCustomHouseRulesDraft(propertyForm.houseRules.filter(r => !HOUSE_RULES_OPTIONS.includes(r)).join(', '));
    }
  }, [step]);
  const coverImageFileInputRef = useRef(null);
  const propertyImagesFileInputRef = useRef(null);
  const roomImagesFileInputRef = useRef(null);
  const documentInputRefs = useRef([]);

  const [propertyForm, setPropertyForm] = useState({
    propertyName: '',
    description: '',
    shortDescription: '',
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
    documents: REQUIRED_DOCS_VILLA.map(d => ({ type: d.type, name: d.name, required: d.required, fileUrl: '' }))
  });

  const [roomTypes, setRoomTypes] = useState([]);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [editingRoomTypeIndex, setEditingRoomTypeIndex] = useState(null);

  const [originalRoomTypeIds, setOriginalRoomTypeIds] = useState([]);

  // --- Persistence Logic ---
  const STORAGE_KEY = `rukko_villa_wizard_draft_${existingProperty?._id || 'new'}`;

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
        console.error("Failed to load villa draft", e);
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
              typeof prop.location?.coordinates?.[0] === 'number'
                ? String(prop.location.coordinates[0])
                : '',
              typeof prop.location?.coordinates?.[1] === 'number'
                ? String(prop.location.coordinates[1])
                : ''
            ]
          },
          nearbyPlaces: Array.isArray(prop.nearbyPlaces) && prop.nearbyPlaces.length
            ? prop.nearbyPlaces.map(p => ({
              name: p.name || '',
              type: p.type || 'tourist',
              distanceKm: typeof p.distanceKm === 'number' ? String(p.distanceKm) : ''
            }))
            : [],
          amenities: prop.amenities || [],
          checkInTime: prop.checkInTime || '',
          checkOutTime: prop.checkOutTime || '',
          cancellationPolicy: prop.cancellationPolicy || '',
          houseRules: prop.houseRules || [],
          contactNumber: prop.contactNumber || '',
          suitability: prop.suitability || 'none',
          documents: docs.length
            ? docs.map(d => ({ type: d.type || d.name, name: d.name, fileUrl: d.fileUrl || '', required: REQUIRED_DOCS_VILLA.find(rd => rd.type === (d.type || d.name))?.required || false }))
            : REQUIRED_DOCS_VILLA.map(d => ({ type: d.type, name: d.name, required: d.required, fileUrl: '' }))
        });
        if (rts.length) {
          setRoomTypes(
            rts.map(rt => ({
              id: rt._id,
              backendId: rt._id,
              name: rt.name || 'Entire Villa',
              inventoryType: 'entire',
              roomCategory: 'entire',
              maxAdults: rt.maxAdults ?? 6,
              maxChildren: rt.maxChildren ?? 3,
              totalInventory: rt.totalInventory ?? 1,
              pricePerNight: rt.pricePerNight ?? '',
              extraAdultPrice: rt.extraAdultPrice ?? 0,
              extraChildPrice: rt.extraChildPrice ?? 0,
              images: rt.images || ['', '', '', ''],
              amenities: rt.amenities || ['Private Pool', 'Kitchen', 'WiFi'],
              isActive: typeof rt.isActive === 'boolean' ? rt.isActive : true
            }))
          );
          setOriginalRoomTypeIds(rts.map(rt => rt._id));
        } else {
          setOriginalRoomTypeIds([]);
          setRoomTypes([]);
        }
      } catch (e) {
        setError(e?.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    loadForEdit();
  }, [isEditMode, existingProperty]);

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
      let originLat = Number(propertyForm.location.coordinates[1] || 0);
      let originLng = Number(propertyForm.location.coordinates[0] || 0);
      const destLat = place.lat;
      const destLng = place.lng;

      // Auto-fix: If coordinates are missing, try to geocode the address
      if ((!originLat || !originLng) && propertyForm.address.fullAddress) {
        try {
          console.log('Auto-geocoding address for distance calculation...');
          const query = `${propertyForm.address.fullAddress}, ${propertyForm.address.city}`;
          const res = await hotelService.searchLocation(query);
          if (res?.results?.[0]?.lat) {
            originLat = res.results[0].lat;
            originLng = res.results[0].lng;
            // Update the form state with these coordinates so we don't need to geocode again
            updatePropertyForm(['location', 'coordinates'], [String(originLng), String(originLat)]);
            console.log('Auto-geocoded coordinates:', originLat, originLng);
          }
        } catch (e) {
          console.warn("Failed to auto-geocode address", e);
        }
      }

      let km = '';
      if (originLat && originLng && destLat && destLng) {
        console.log(`Calculating distance: ${originLat},${originLng} -> ${destLat},${destLng}`);
        const distRes = await hotelService.calculateDistance(originLat, originLng, destLat, destLng);
        console.log('Distance calculation result:', distRes);
        if (distRes && typeof distRes.distanceKm !== 'undefined') {
          km = String(distRes.distanceKm);
        }
      } else {
        console.warn('Missing coordinates for distance calculation', { originLat, originLng, destLat, destLng });
      }

      const newPlace = {
        name: place.name || '',
        type: place.type || 'tourist',
        distanceKm: km
      };

      // Preserve existing type if just updating
      setTempNearbyPlace(prev => ({
        ...prev,
        name: newPlace.name,
        distanceKm: newPlace.distanceKm
      }));

      setNearbyResults([]);
      setNearbySearchQuery('');
    } catch (err) {
      console.error('Error selecting nearby place:', err);
      // Ensure we at least set the name even if distance calc fails
      setTempNearbyPlace(prev => ({ ...prev, name: place.name || '' }));
      setNearbyResults([]);
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

  const deleteNearbyPlace = (index) => {
    const arr = propertyForm.nearbyPlaces.filter((_, i) => i !== index);
    updatePropertyForm('nearbyPlaces', arr);
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

  const cancelEditNearbyPlace = () => {
    setEditingNearbyIndex(null);
    setError('');
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
        msg = 'Upload failed: File size may be too large.';
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


  const startAddRoomType = () => {
    setError('');
    setEditingRoomTypeIndex(-1);
    setEditingRoomType({
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      name: '',
      inventoryType: 'entire',
      roomCategory: 'entire',
      maxAdults: '',
      maxChildren: 0,
      totalInventory: '1',
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

  const cancelEditRoomType = () => {
    setEditingRoomTypeIndex(null);
    setEditingRoomType(null);
    setError('');
  };

  const saveEditingRoomType = () => {
    const rt = editingRoomType;
    if (!rt.name || !rt.pricePerNight) {
      setError('Room type name and price required');
      return;
    }
    if (!rt.images || rt.images.filter(Boolean).length < 4) {
      setError('At least 4 images required');
      return;
    }
    const payload = { ...rt, totalInventory: 1 };
    if (editingRoomTypeIndex === -1) {
      setRoomTypes(prev => [{ ...payload }, ...prev]);
    } else {
      setRoomTypes(prev => prev.map((x, i) => (i === editingRoomTypeIndex ? payload : x)));
    }
    setEditingRoomTypeIndex(null);
    setEditingRoomType(null);
    setError('');
  };

  const deleteRoomType = (index) => {
    setRoomTypes(prev => prev.filter((_, i) => i !== index));
  };

  const nextFromBasic = () => {
    setError('');
    if (!propertyForm.propertyName || !propertyForm.shortDescription) {
      setError('Name and short description required');
      return;
    }
    setStep(2);
  };

  const nextFromLocation = () => {
    setError('');
    const { country, state, city, area, fullAddress, pincode } = propertyForm.address;
    if (!country || !state || !city || !area || !fullAddress || !pincode) {
      setError('All address fields are required');
      return;
    }
    if (!propertyForm.location.coordinates[0] || !propertyForm.location.coordinates[1]) {
      setError('Location coordinates are required');
      return;
    }
    setStep(3);
  };

  const nextFromAmenities = () => {
    setError('');
    setStep(4);
  };

  const nextFromNearbyPlaces = () => {
    if (propertyForm.nearbyPlaces.length < 1) {
      setError('Please add at least 1 nearby place');
      return;
    }
    setStep(5);
  };

  const nextFromImages = () => {
    setError('');
    if (!propertyForm.coverImage) {
      setError('Cover image required');
      return;
    }
    if ((propertyForm.propertyImages || []).filter(Boolean).length < 4) {
      setError('Minimum 4 property images required');
      return;
    }
    setStep(6);
  };

  const nextFromRoomTypes = () => {
    setError('');
    if (!roomTypes.length) {
      setError('At least one RoomType required');
      return;
    }
    for (const rt of roomTypes) {
      if (!rt.name || !rt.pricePerNight) {
        setError('Room type name and price required');
        return;
      }
      if (!rt.images || rt.images.filter(Boolean).length < 4) {
        setError('Each room type must have at least 4 images');
        return;
      }
    }
    setStep(7);
  };

  const syncHouseRulesFromDraft = () => {
    const customRules = customHouseRulesDraft.split(',').map(s => s.trim()).filter(Boolean);
    const selectedPredefined = propertyForm.houseRules.filter(r => HOUSE_RULES_OPTIONS.includes(r));
    updatePropertyForm('houseRules', [...selectedPredefined, ...customRules]);
  };

  const nextFromRules = () => {
    setError('');
    syncHouseRulesFromDraft();
    if (!propertyForm.checkInTime || !propertyForm.checkOutTime) {
      setError('Check-in and Check-out times are required');
      return;
    }
    setStep(8);
  };

  const nextFromDocuments = () => {
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
        propertyType: 'villa',
        propertyName: propertyForm.propertyName,
        contactNumber: propertyForm.contactNumber,
        description: propertyForm.description,
        shortDescription: propertyForm.shortDescription,
        coverImage: propertyForm.coverImage,
        propertyImages: propertyForm.propertyImages.filter(Boolean),
        address: propertyForm.address,
        location: {
          type: 'Point',
          coordinates: [
            Number(propertyForm.location.coordinates[0]),
            Number(propertyForm.location.coordinates[1])
          ]
        },
        nearbyPlaces: propertyForm.nearbyPlaces.map(p => ({
          name: p.name,
          type: p.type,
          distanceKm: Number(p.distanceKm || 0)
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
            inventoryType: 'entire',
            roomCategory: 'entire',
            maxAdults: Number(rt.maxAdults),
            maxChildren: Number(rt.maxChildren || 0),
            totalInventory: Number(rt.totalInventory || 1),
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
          if (!persistedIds.includes(id)) {
            await propertyService.deleteRoomType(propId, id);
          }
        }
      } else {
        // Atomic Create
        propertyPayload.roomTypes = roomTypes.map(rt => ({
          name: rt.name,
          inventoryType: 'entire',
          roomCategory: 'entire',
          maxAdults: Number(rt.maxAdults),
          maxChildren: Number(rt.maxChildren || 0),
          totalInventory: Number(rt.totalInventory || 1),
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
      setError(e?.message || 'Failed to submit property');
    } finally {
      setLoading(false);
    }
  };

  const isEditingSubItem = editingRoomType !== null || editingNearbyIndex !== null;

  const handleBack = () => {
    if (step === 1) {
      localStorage.removeItem(STORAGE_KEY);
      navigate(-1);
    } else {
      if (step === 7) syncHouseRulesFromDraft();
      setStep(prev => prev - 1);
    }
  };

  const clearCurrentStep = () => {
    if (!window.confirm("Clear all fields in this step?")) return;
    if (step === 1) {
      setPropertyForm(prev => ({ ...prev, propertyName: '', description: '', shortDescription: '', coverImage: '' }));
    } else if (step === 2) {
      updatePropertyForm('address', { country: '', state: '', city: '', area: '', fullAddress: '', pincode: '' });
      updatePropertyForm(['location', 'coordinates'], ['', '']);
    } else if (step === 3) {
      updatePropertyForm('amenities', []);
    } else if (step === 4) {
      updatePropertyForm('nearbyPlaces', []);
    } else if (step === 5) {
      updatePropertyForm('propertyImages', []);
    } else if (step === 6) {
      setRoomTypes([]);
    } else if (step === 7) {
      setPropertyForm(prev => ({ ...prev, checkInTime: '', checkOutTime: '', cancellationPolicy: '', houseRules: [] }));
      setCustomHouseRulesDraft('');
    } else if (step === 8) {
      updatePropertyForm('documents', REQUIRED_DOCS_VILLA.map(d => ({ type: d.type, name: d.name, fileUrl: '' })));
    }
  };

  const handleNext = () => {
    if (loading) return;
    if (step === 1) nextFromBasic();
    else if (step === 2) nextFromLocation();
    else if (step === 3) nextFromAmenities();
    else if (step === 4) nextFromNearbyPlaces();
    else if (step === 5) nextFromImages();
    else if (step === 6) nextFromRoomTypes();
    else if (step === 7) nextFromRules();
    else if (step === 8) nextFromDocuments();
    else if (step === 9) submitAll();
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Basic Info";
      case 2: return "Location";
      case 3: return "Amenities";
      case 4: return "Nearby Places";
      case 5: return "Property Images";
      case 6: return "Villa Details";
      case 7: return "House Rules";
      case 8: return "Documents";
      case 9: return "Review & Submit";
      default: return "";
    }
  };

  const handleExit = () => {
    localStorage.removeItem(STORAGE_KEY);
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="text-sm font-bold text-gray-900">
            {step <= 9 ? `Step ${step} of 9` : 'Registration Complete'}
          </div>
          <button onClick={handleExit} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="h-1 bg-gray-100 w-full">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${(step / 9) * 100}%` }}
          />
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6 pb-32">
        <div className="max-w-xl mx-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property Name</label>
                  <input
                    className="input"
                    placeholder="e.g. Sunset Villa"
                    value={propertyForm.propertyName}
                    onChange={e => updatePropertyForm('propertyName', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</label>
                  <textarea
                    className="input min-h-[100px] leading-relaxed"
                    placeholder="Brief summary (e.g. Luxury 3BHK Villa with Private Pool)"
                    value={propertyForm.shortDescription}
                    onChange={e => updatePropertyForm('shortDescription', e.target.value)}
                  />
                  <div className="flex justify-end text-[10px] text-gray-400">{propertyForm.shortDescription.length} chars</div>
                </div>

                <div className="hidden">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">About Property</label>
                  <textarea
                    className="input min-h-[120px] leading-relaxed"
                    placeholder="Describe the villa, its unique features, and surroundings..."
                    value={propertyForm.description}
                    onChange={e => updatePropertyForm('description', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Number (For Guest Inquiries)</label>
                  <input
                    type="tel"
                    className="input"
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
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Suitability</label>
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

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2"><CheckCircle size={16} className="rotate-45" /> {error}</div>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-1 relative z-20">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-none rounded-xl text-gray-800 placeholder:text-gray-400 focus:ring-0"
                    placeholder="Search area, street or landmark..."
                    value={locationSearchQuery}
                    onChange={e => {
                      setLocationSearchQuery(e.target.value);
                      if (e.target.value.length > 2) searchLocationForAddress();
                    }}
                  />
                  {locationResults.length > 0 && locationSearchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-60 overflow-y-auto">
                      {locationResults.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => { selectLocationResult(p); setLocationSearchQuery(''); setLocationResults([]); }}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-0 text-sm text-gray-600 transition-colors"
                        >
                          <span className="font-medium text-gray-900 block mb-0.5">{p.name}</span>
                          <span className="text-xs text-gray-400 truncate block">{p.display_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Or Enter Manually</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Country</label>
                  <input className="input" value={propertyForm.address.country} onChange={e => updatePropertyForm(['address', 'country'], e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">State/Province</label>
                  <input className="input" value={propertyForm.address.state} onChange={e => updatePropertyForm(['address', 'state'], e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">City</label>
                  <input className="input" value={propertyForm.address.city} onChange={e => updatePropertyForm(['address', 'city'], e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Area/Sector</label>
                  <input className="input" value={propertyForm.address.area} onChange={e => updatePropertyForm(['address', 'area'], e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Full Street Address</label>
                  <input className="input" placeholder="House/Flat No, Building Name..." value={propertyForm.address.fullAddress} onChange={e => updatePropertyForm(['address', 'fullAddress'], e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Pincode/Zip</label>
                  <input className="input" value={propertyForm.address.pincode} onChange={e => updatePropertyForm(['address', 'pincode'], e.target.value)} />
                </div>
              </div>

              <button
                onClick={useCurrentLocation}
                disabled={loadingLocation}
                className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 text-emerald-700 font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                {loadingLocation ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Fetching Location...</span>
                  </>
                ) : (
                  <>
                    <MapPin size={20} />
                    <span>Use Current Location</span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {VILLA_AMENITIES.map(am => (
                  <button
                    key={am}
                    type="button"
                    onClick={() => {
                      const has = propertyForm.amenities.includes(am);
                      const arr = has ? propertyForm.amenities.filter(x => x !== am) : [...propertyForm.amenities, am];
                      updatePropertyForm('amenities', arr);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${propertyForm.amenities.includes(am) ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500' : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${propertyForm.amenities.includes(am) ? 'bg-white text-emerald-600' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-emerald-600'}`}>
                        {am === 'Private Pool' && <Snowflake size={20} />}
                        {am === 'Garden' && <Home size={20} />}
                        {am === 'Parking' && <Home size={20} />}
                        {am === 'Kitchen' && <Coffee size={20} />}
                        {am === 'WiFi' && <Wifi size={20} />}
                        {!['Private Pool', 'Garden', 'Parking', 'Kitchen', 'WiFi'].includes(am) && <CheckCircle size={20} />}
                      </div>
                      <span className={`font-bold text-sm ${propertyForm.amenities.includes(am) ? 'text-emerald-800' : 'text-gray-700'}`}>{am}</span>
                    </div>
                    {propertyForm.amenities.includes(am) && (
                      <div className="absolute top-3 right-3 text-emerald-500">
                        <CheckCircle size={18} className="fill-current" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

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
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cover Image</label>
                  <button
                    onClick={() => !uploading && (isFlutter ? handleCameraUpload('cover', u => updatePropertyForm('coverImage', u)) : coverImageFileInputRef.current?.click())}
                    className="w-full aspect-video sm:aspect-[21/9] rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-3 overflow-hidden group hover:border-emerald-400 hover:bg-emerald-50/10 transition-all relative"
                  >
                    {uploading === 'cover' ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <Loader2 className="animate-spin" size={32} />
                        <span className="text-sm font-bold">Uploading Cover...</span>
                      </div>
                    ) : propertyForm.coverImage ? (
                      <>
                        <img src={propertyForm.coverImage} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-bold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/50">Change Cover</span>
                        </div>
                        <div
                          onClick={(e) => { e.stopPropagation(); updatePropertyForm('coverImage', ''); }}
                          className="absolute top-3 right-3 p-2 bg-white text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        >
                          <X size={16} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Plus size={24} />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-gray-600 group-hover:text-emerald-700">{isFlutter ? 'Take/Upload Cover Photo' : 'Add Cover Photo'}</div>
                          <div className="text-xs text-gray-400">High quality landscape image</div>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={coverImageFileInputRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImages(e.target.files, 'cover', u => updatePropertyForm('coverImage', u[0]))} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Property Gallery</label>
                    <span className="text-[10px] text-gray-400">{propertyForm.propertyImages.length} images (min 4)</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {propertyForm.propertyImages.map((img, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-gray-100 relative group overflow-hidden border border-gray-200">
                        <img src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                        <button
                          onClick={() => updatePropertyForm('propertyImages', propertyForm.propertyImages.filter((_, x) => x !== i))}
                          className="absolute top-1 right-1 p-1.5 bg-white text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => isFlutter ? handleCameraUpload('gallery', u => updatePropertyForm('propertyImages', [...propertyForm.propertyImages, ...u])) : propertyImagesFileInputRef.current?.click()}
                      disabled={!!uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all"
                    >
                      {uploading === 'gallery' ? <Loader2 className="animate-spin text-emerald-600" size={20} /> : (isFlutter ? <Camera size={20} className="text-gray-400" /> : <Plus size={20} className="text-gray-400" />)}
                      {uploading !== 'gallery' && <span className="text-[10px] font-bold text-gray-500">Add</span>}
                    </button>
                  </div>
                  <input ref={propertyImagesFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => uploadImages(e.target.files, 'gallery', u => updatePropertyForm('propertyImages', [...propertyForm.propertyImages, ...u]))} />
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}

              {!isEditingSubItem && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">Add details for the villa (e.g., entire villa, specific rooms).</p>
                  </div>

                  <div className="grid gap-3">
                    {roomTypes.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                          <BedDouble size={24} />
                        </div>
                        <p className="text-gray-500 font-medium">No details added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Add 'Entire Villa' or individual rooms</p>
                      </div>
                    ) : (
                      roomTypes.map((rt, index) => (
                        <div key={rt.id} className="p-4 border border-gray-200 rounded-2xl bg-white group hover:border-emerald-200 transition-all shadow-sm">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-4">
                              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                                {rt.images?.[0] ? (
                                  <img src={rt.images[0]} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400"><BedDouble size={20} /></div>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-lg">{rt.name}</div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">₹{rt.pricePerNight} / night</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">Adults: {rt.maxAdults}</span>
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded flex items-center gap-1">Children: {rt.maxChildren}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => startEditRoomType(index)} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                                <FileText size={16} />
                              </button>
                              <button onClick={() => deleteRoomType(index)} className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={startAddRoomType}
                    className="w-full py-4 border border-emerald-200 text-emerald-700 bg-emerald-50/50 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors"
                  >
                    <Plus size={20} /> Add Villa Details
                  </button>
                </div>
              )}

              {editingRoomType && (
                <div className="bg-white rounded-2xl border border-emerald-100 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-sm">
                      {editingRoomTypeIndex === -1 ? 'Add Details' : 'Edit Details'}
                    </span>
                    <button onClick={cancelEditRoomType} className="text-emerald-600 hover:bg-emerald-100 p-1 rounded-md">
                      <span className="text-xs font-bold">Close</span>
                    </button>
                  </div>

                  <div className="p-4 space-y-5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500">Name</label>
                      <input className="input" placeholder="e.g. Entire Villa" value={editingRoomType.name} onChange={e => setEditingRoomType({ ...editingRoomType, name: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Price per Night (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                          <input className="input pl-7" type="number" placeholder="0" value={editingRoomType.pricePerNight} onChange={e => setEditingRoomType({ ...editingRoomType, pricePerNight: e.target.value })} />
                        </div>
                      </div>
                      {/* Total Units Hidden for Villa - Always 1 */}
                      <input type="hidden" value="1" />
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Max Adults</label>
                        <input className="input" type="number" placeholder="1" value={editingRoomType.maxAdults} onChange={e => setEditingRoomType({ ...editingRoomType, maxAdults: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Max Children</label>
                        <input className="input" type="number" placeholder="0" value={editingRoomType.maxChildren} onChange={e => setEditingRoomType({ ...editingRoomType, maxChildren: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Extra Adult Price</label>
                        <input className="input" type="number" placeholder="0" value={editingRoomType.extraAdultPrice} onChange={e => setEditingRoomType({ ...editingRoomType, extraAdultPrice: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Extra Child Price</label>
                        <input className="input" type="number" placeholder="0" value={editingRoomType.extraChildPrice} onChange={e => setEditingRoomType({ ...editingRoomType, extraChildPrice: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-500">Images (Max 4)</label>
                        <span className="text-[10px] text-gray-400">{(editingRoomType.images || []).length}/4</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {(editingRoomType.images || []).map((img, i) => (
                          <div key={i} className="relative w-20 h-20 flex-shrink-0 rounded-xl border border-gray-200 overflow-hidden group">
                            <img src={img} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => handleRemoveImage(img, 'room', i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white text-red-500 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
                          </div>
                        ))}
                        {(editingRoomType.images || []).length < 4 && (
                          <button type="button" onClick={() => isFlutter ? handleCameraUpload('room', url => setEditingRoomType(prev => ({ ...prev, images: [...(prev.images || []), url].slice(0, 4) }))) : roomImagesFileInputRef.current?.click()} disabled={!!uploading} className="w-20 h-20 flex-shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/20 transition-all">
                            {uploading === 'room' ? <Loader2 size={20} className="animate-spin text-emerald-600" /> : <Plus size={20} />}
                          </button>
                        )}
                        <input ref={roomImagesFileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => {
                          if (e.target.files?.length) uploadImages(e.target.files, 'room', urls => urls.length && setEditingRoomType(prev => ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 4) })));
                        }} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500">Amenities & Features</label>
                      <div className="flex flex-wrap gap-2">
                        {ROOM_AMENITIES.map(opt => {
                          const isSelected = editingRoomType.amenities.includes(opt.label);
                          return (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => {
                                const updated = isSelected
                                  ? editingRoomType.amenities.filter(x => x !== opt.label)
                                  : [...editingRoomType.amenities, opt.label];
                                setEditingRoomType({ ...editingRoomType, amenities: updated });
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isSelected ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                              <opt.icon size={12} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                      <button onClick={cancelEditRoomType} className="flex-1 py-3 text-gray-600 font-bold bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                      <button onClick={saveEditingRoomType} className="flex-1 py-3 text-white font-bold bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">{editingRoomTypeIndex === -1 ? 'Add Details' : 'Save Changes'}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Check-In Time</label>
                  <div className="relative">
                    <input className="input !pl-12" placeholder="e.g. 12:00 PM" value={propertyForm.checkInTime} onChange={e => updatePropertyForm('checkInTime', e.target.value)} />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Clock size={18} /></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500">Check-Out Time</label>
                  <div className="relative">
                    <input className="input !pl-12" placeholder="e.g. 11:00 AM" value={propertyForm.checkOutTime} onChange={e => updatePropertyForm('checkOutTime', e.target.value)} />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"><Clock size={18} /></div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500">Cancellation Policy</label>
                <select
                  className="input w-full appearance-none"
                  value={propertyForm.cancellationPolicy}
                  onChange={e => updatePropertyForm('cancellationPolicy', e.target.value)}
                >
                  <option value="">Select a policy</option>
                  <option value="No refund after check-in">No refund after check-in</option>
                  <option value="Free cancellation up to 24hrs">Free cancellation up to 24hrs</option>
                  <option value="Strict">Strict (No refund)</option>
                  <option value="Moderate">Moderate</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500">House Rules</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {HOUSE_RULES_OPTIONS.map(rule => (
                    <button
                      key={rule}
                      onClick={() => {
                        const customRules = customHouseRulesDraft.split(',').map(s => s.trim()).filter(Boolean);
                        const selectedPredefined = propertyForm.houseRules.filter(r => HOUSE_RULES_OPTIONS.includes(r));
                        const has = selectedPredefined.includes(rule);
                        const newPredefined = has ? selectedPredefined.filter(x => x !== rule) : [...selectedPredefined, rule];
                        updatePropertyForm('houseRules', [...newPredefined, ...customRules]);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${propertyForm.houseRules.includes(rule) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
                <textarea
                  className="input w-full min-h-[100px]"
                  placeholder="Add other rules (e.g. No alcohol, No guests after 9 PM...)"
                  value={customHouseRulesDraft}
                  onChange={e => setCustomHouseRulesDraft(e.target.value)}
                  onBlur={syncHouseRulesFromDraft}
                />
                <p className="text-xs text-gray-400">Separate custom rules with commas.</p>
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
              <div className="bg-emerald-50 rounded-2xl p-6 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-emerald-600">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold text-emerald-900">Ready to Submit!</h3>
                <p className="text-emerald-700 text-sm mt-1">Review your villa details below.</p>
              </div>

              <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden p-4 space-y-3">
                  <div className="flex gap-4">
                    <img src={propertyForm.coverImage} className="w-20 h-20 rounded-lg object-cover bg-gray-100" />
                    <div>
                      <div className="font-bold text-gray-900">{propertyForm.propertyName}</div>
                      <div className="text-sm text-gray-500 mt-1 line-clamp-1">{propertyForm.address.fullAddress}</div>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded uppercase">{roomTypes.length} Details Added</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="font-bold text-gray-900 text-sm mb-3">Submission Checklist</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Villa Details</span>
                      <span className={roomTypes.length > 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>{roomTypes.length > 0 ? "Complete" : "Missing"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Documents</span>
                      <span className="text-gray-500 font-medium">{propertyForm.documents.filter(d => d.fileUrl).length}/{propertyForm.documents.length} (Optional)</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Photos</span>
                      <span className={propertyForm.propertyImages.length >= 4 ? "text-emerald-600 font-bold" : "text-orange-500 font-bold"}>{propertyForm.propertyImages.length}/4</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">House Rules</span>
                      <span className={propertyForm.houseRules.length > 0 ? "text-emerald-600 font-bold" : "text-gray-400 italic"}>{propertyForm.houseRules.length > 0 ? "Added" : "None"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center font-medium">{error}</div>}
            </div>
          )}
          {step === 10 && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center transition-all animate-bounce">
                <CheckCircle size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-extrabold text-gray-900">Registration Submitted!</h2>
                <p className="text-gray-500 max-w-sm mx-auto">Your villa registration has been sent for verification. Our team will review it and get back to you shortly.</p>
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={step === 1 || loading || isEditingSubItem}
            className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            onClick={step === 9 ? submitAll : handleNext}
            disabled={
              loading ||
              isEditingSubItem ||
              (step === 6 && roomTypes.length === 0)
            }
            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              step === 9 ? 'Submit Property' : 'Next Step'
            )}
          </button>
        </div>
      </div>


    </div>
  );
};

export default AddVillaWizard;
