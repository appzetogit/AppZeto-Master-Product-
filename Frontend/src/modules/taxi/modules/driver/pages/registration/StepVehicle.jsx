import React, { useEffect, useState } from 'react';
import { 
    ArrowLeft, 
    Car, 
    ChevronRight, 
    MapPin, 
    Zap, 
    Package 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getLucideIcon } from '../../utils/iconMapping';
import {
    getStoredDriverRegistrationSession,
    getDriverServiceLocations,
    saveDriverRegistrationSession,
    saveDriverVehicle,
} from '../../services/registrationService';

const StepVehicle = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const session = {
        ...getStoredDriverRegistrationSession(),
        ...(location.state || {}),
    };
    const role = session.role || 'driver';
    const isOwner = role === 'owner';
    const [locations, setLocations] = useState([]);
    const [locationsLoading, setLocationsLoading] = useState(true);
    const [locationsError, setLocationsError] = useState('');

    const vehicleTypes = [
        { id: 'v1', label: 'Bike', icon: 'bike_icon' },
        { id: 'v2', label: 'Cab', icon: 'taxi_icon' },
        { id: 'v3', label: 'Auto', icon: 'auto_icon' }
    ];

    const [formData, setFormData] = useState({
        registerFor: session.registerFor || 'taxi',
        locationId: session.locationId || '',
        vehicleTypeId: session.vehicleTypeId || '',
        make: session.make || '',
        model: session.model || '',
        year: session.year || '',
        number: session.number || '',
        color: session.color || '',
        // Company info for owners
        companyName: session.companyName || '',
        companyAddress: session.companyAddress || '',
        city: session.city || '',
        postalCode: session.postalCode || '',
        taxNumber: session.taxNumber || ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        const loadLocations = async () => {
            try {
                setLocationsLoading(true);
                setLocationsError('');

                const response = await getDriverServiceLocations();
                const results = response?.data?.results || response?.data || [];

                if (active) {
                    setLocations(Array.isArray(results) ? results : []);
                }
            } catch (err) {
                if (active) {
                    setLocationsError(err?.message || 'Unable to load service locations');
                    setLocations([]);
                }
            } finally {
                if (active) {
                    setLocationsLoading(false);
                }
            }
        };

        loadLocations();

        return () => {
            active = false;
        };
    }, []);

    const handleContinue = async () => {
        let required = [];
        if (isOwner) {
            required = ['locationId', 'companyName', 'companyAddress', 'city', 'postalCode', 'taxNumber'];
        } else {
            required = ['locationId', 'vehicleTypeId', 'make', 'model', 'year', 'number', 'color'];
        }

        if (required.every(key => formData[key])) {
            setLoading(true);
            setError('');

            try {
                const selectedServiceLocation = locations.find(
                    (item) => String(item._id || item.id) === String(formData.locationId)
                );

                const response = await saveDriverVehicle({
                    registrationId: session.registrationId,
                    phone: session.phone,
                    registerFor: formData.registerFor,
                    locationId: formData.locationId,
                    locationName: selectedServiceLocation?.name || selectedServiceLocation?.service_location_name || '',
                    serviceLocation: selectedServiceLocation || null,
                    vehicleTypeId: formData.vehicleTypeId,
                    make: formData.make,
                    model: formData.model,
                    year: formData.year,
                    number: formData.number,
                    color: formData.color,
                    companyName: formData.companyName,
                    companyAddress: formData.companyAddress,
                    city: isOwner ? formData.city : selectedServiceLocation?.name || selectedServiceLocation?.service_location_name || formData.city,
                    postalCode: formData.postalCode,
                    taxNumber: formData.taxNumber,
                });

                const nextState = saveDriverRegistrationSession({
                    ...session,
                    ...formData,
                    vehicleSession: response?.data?.session || null,
                });

                navigate('/taxi/driver/step-documents', { state: nextState });
            } catch (err) {
                setError(err?.message || 'Unable to save vehicle details');
            } finally {
                setLoading(false);
            }
        } else {
            setError(isOwner ? 'Please fill all company information fields' : 'Please fill all vehicle information fields');
        }
    };

    return (
        <div className="min-h-screen bg-white font-sans p-5 pt-8 select-none overflow-x-hidden pb-32">
            <header className="mb-6">
                <button onClick={() => navigate(-1)} className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center text-slate-900 active:scale-95 transition-transform">
                    <ArrowLeft size={18} strokeWidth={2.5} />
                </button>
            </header>

            <main className="space-y-6 max-w-sm mx-auto">
                <div className="space-y-1.5">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                        {isOwner ? 'Company Info' : 'Vehicle Info'}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-400 opacity-80 uppercase tracking-widest leading-relaxed">
                        {isOwner ? 'Your business details' : 'Complete your registration'}
                    </p>
                </div>

                {locationsError && (
                    <p className="text-[11px] font-bold text-rose-500">{locationsError}</p>
                )}

                {error && (
                    <p className="text-[11px] font-bold text-rose-500">{error}</p>
                )}

                <div className="space-y-5">
                    {/* Register For Selection (Only for drivers) */}
                    {!isOwner && (
                        <div className="space-y-2.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Register For</label>
                             <div className="grid grid-cols-3 gap-2">
                                 {[
                                     { id: 'taxi', label: 'Taxi', icon: <Car size={14} /> },
                                     { id: 'delivery', label: 'Delivery', icon: <Package size={14} /> },
                                     { id: 'both', label: 'Both', icon: <Zap size={14} /> }
                                 ].map((item) => (
                                     <button
                                         key={item.id}
                                         onClick={() => setFormData(p => ({ ...p, registerFor: item.id }))}
                                         className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl transition-all ${
                                             formData.registerFor === item.id 
                                             ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                             : 'bg-slate-50 text-slate-400'
                                         }`}
                                     >
                                         <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${formData.registerFor === item.id ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                             {item.icon}
                                         </div>
                                         <span className="text-[9px] font-black uppercase tracking-widest leading-none">{item.label}</span>
                                     </button>
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* Service Location Selection */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 ml-0.5">
                           <MapPin size={10} /> Service Location
                        </label>
                        <select 
                            value={formData.locationId}
                            onChange={(e) => setFormData(p => ({ ...p, locationId: e.target.value, vehicleTypeId: '' }))}
                            disabled={locationsLoading || locations.length === 0}
                            className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 appearance-none cursor-pointer disabled:opacity-50"
                        >
                            <option value="">{locationsLoading ? 'Loading service locations...' : 'Select city'}</option>
                            {locations.map(loc => (
                                <option key={loc._id || loc.id} value={loc._id || loc.id}>
                                    {loc.service_location_name || loc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {isOwner ? (
                        /* Company Information for Owners */
                        <div className="space-y-4 pt-2">
                            <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Name</label>
                                <input 
                                    value={formData.companyName}
                                    onChange={(e) => setFormData(p => ({ ...p, companyName: e.target.value }))}
                                    placeholder="Enter company name"
                                    className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                />
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Address</label>
                                <input 
                                    value={formData.companyAddress}
                                    onChange={(e) => setFormData(p => ({ ...p, companyAddress: e.target.value }))}
                                    placeholder="Enter company address"
                                    className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">City</label>
                                    <input 
                                        value={formData.city}
                                        onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                                        placeholder="City"
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>
                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Postal Code</label>
                                    <input 
                                        value={formData.postalCode}
                                        onChange={(e) => setFormData(p => ({ ...p, postalCode: e.target.value }))}
                                        placeholder="Zip"
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Tax Number</label>
                                <input 
                                    value={formData.taxNumber}
                                    onChange={(e) => setFormData(p => ({ ...p, taxNumber: e.target.value.toUpperCase() }))}
                                    placeholder="GST/VAT/TAX ID"
                                    className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200 uppercase"
                                />
                            </div>
                        </div>
                    ) : (
                        /* Vehicle Details for Drivers */
                        <div className="space-y-4">
                            {/* Vehicle Type Selection */}
                            {formData.locationId && (
                                <div className="space-y-2.5 pt-1">
                                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Vehicle Type</label>
                                     <div className="grid grid-cols-2 gap-2.5">
                                         {vehicleTypes.map((type) => (
                                             <button
                                                 key={type.id}
                                                 onClick={() => setFormData(p => ({ ...p, vehicleTypeId: type.id }))}
                                                 className={`p-3.5 rounded-[1.5rem] transition-all flex items-center gap-2.5 ${
                                                     formData.vehicleTypeId === type.id 
                                                     ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                                                     : 'bg-slate-50 text-slate-400'
                                                 }`}
                                             >
                                                 <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${formData.vehicleTypeId === type.id ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                                    {getLucideIcon(type.icon, 16)}
                                                 </div>
                                                 <span className="text-[11px] font-black uppercase tracking-tight leading-none">{type.label}</span>
                                             </button>
                                         ))}
                                     </div>
                                </div>
                            )}

                            {/* Vehicle Details */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Make</label>
                                    <input 
                                        value={formData.make}
                                        onChange={(e) => setFormData(p => ({ ...p, make: e.target.value }))}
                                        placeholder="Suzuki, Hyundai..."
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Model</label>
                                    <input 
                                        value={formData.model}
                                        onChange={(e) => setFormData(p => ({ ...p, model: e.target.value }))}
                                        placeholder="WagonR, i20..."
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Year</label>
                                    <input 
                                        type="tel"
                                        maxLength={4}
                                        value={formData.year}
                                        onChange={(e) => setFormData(p => ({ ...p, year: e.target.value.replace(/\D/g, '') }))}
                                        placeholder="2024"
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Vehicle Number</label>
                                    <input 
                                        value={formData.number}
                                        onChange={(e) => setFormData(p => ({ ...p, number: e.target.value.toUpperCase() }))}
                                        placeholder="MP 09 AB 1234"
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200 uppercase tracking-widest"
                                    />
                                </div>

                                <div className="bg-slate-50 p-3.5 rounded-2xl shadow-sm col-span-2">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Color</label>
                                    <input 
                                        value={formData.color}
                                        onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                                        placeholder="White, Silver, Black..."
                                        className="w-full bg-transparent border-none p-0 text-[13px] font-black text-slate-900 focus:outline-none focus:ring-0 placeholder:text-slate-200"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-50">
                    <button 
                        onClick={handleContinue}
                        disabled={loading}
                        className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-black uppercase tracking-widest shadow-lg transition-all ${
                            (isOwner ? 
                                (formData.locationId && formData.companyName && formData.companyAddress && formData.city && formData.postalCode && formData.taxNumber) : 
                                (formData.locationId && formData.vehicleTypeId && formData.make && formData.model && formData.year && formData.number && formData.color))
                            ? 'bg-slate-900 text-white shadow-slate-900/10' 
                            : 'bg-slate-100 text-slate-300 pointer-events-none'
                        }`}
                    >
                        {loading ? 'Saving...' : 'Continue'} <ChevronRight size={16} strokeWidth={3} />
                    </button>
                </div>
            </main>
        </div>
    );
};

export default StepVehicle;
