import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, CheckCircle, XCircle, FileText,
    ChevronLeft, Star, Bed, Calendar, ShieldCheck, AlertCircle,
    MoreVertical, Download, Search, Ban, Wifi, Phone, Mail, Tv, Coffee, Wind, Loader2, Clock, Image as ImageIcon, Users, X, Trash2
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

// --- Helpers ---

const FileUpload = ({ onUpload, type = 'hotel', className = "", label = "Upload Image", accept = "image/*", icon: Icon = ImageIcon, multiple = false }) => {
    const [uploading, setUploading] = useState(false);

    const handleChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        try {
            setUploading(true);
            const formData = new FormData();
            files.forEach(file => formData.append('images', file));
            formData.append('type', type);

            const res = await adminService.uploadImage(formData);
            if (res.success) {
                if (multiple) {
                    onUpload(res.files.map(f => f.url));
                } else {
                    onUpload(res.url);
                }
                toast.success(files.length > 1 ? 'Files uploaded' : 'File uploaded');
            }
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <label className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''} ${className}`}>
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {uploading ? 'Uploading...' : label}
            <input type="file" className="hidden" accept={accept} multiple={multiple} onChange={handleChange} />
        </label>
    );
};

// --- Tab Components ---

const OverviewTab = ({ hotel, isEditing, editData, onChange }) => {
    // Local state for free-text fields to allow commas, spaces, and returns during editing
    const [amenitiesText, setAmenitiesText] = useState(editData.amenities?.join(', ') || '');
    const [rulesText, setRulesText] = useState(editData.houseRules?.join('\n') || '');

    useEffect(() => {
        if (isEditing) {
            setAmenitiesText(editData.amenities?.join(', ') || '');
            setRulesText(editData.houseRules?.join('\n') || '');
        }
    }, [isEditing]);

    const handleAmenitiesChange = (e) => {
        const val = e.target.value;
        setAmenitiesText(val);
        // Update parent with raw split for live state, cleaned on save
        onChange('amenities', val.split(','));
    };

    const handleRulesChange = (e) => {
        const val = e.target.value;
        setRulesText(val);
        // Update parent with raw split for live state, cleaned on save
        onChange('houseRules', val.split('\n'));
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <Building2 size={14} /> Property Information
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Name</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editData.propertyName || ''}
                                    onChange={(e) => onChange('propertyName', e.target.value)}
                                    className="bg-white border rounded px-2 py-1 text-sm font-bold w-1/2 outline-none focus:ring-1 focus:ring-black"
                                />
                            ) : (
                                <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                            <span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</span>
                        </div>

                        {/* Display Sub-Types but NOT editable */}
                        {hotel.propertyType === 'hostel' && (hotel.hostelType || editData?.hostelType) && (
                            <div className="flex justify-between items-center min-h-[32px]">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Hostel Type</span>
                                <span className="font-bold text-gray-900 uppercase">{hotel.hostelType || editData?.hostelType} Only</span>
                            </div>
                        )}
                        {hotel.propertyType === 'pg' && (hotel.pgType || editData?.pgType) && (
                            <div className="flex justify-between items-center min-h-[32px]">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">PG Type</span>
                                <span className="font-bold text-gray-900 uppercase">{hotel.pgType || editData?.pgType}</span>
                            </div>
                        )}
                        {hotel.propertyType === 'hotel' && (hotel.hotelCategory || editData?.hotelCategory) && (
                            <div className="flex justify-between items-center min-h-[32px]">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Hotel Category</span>
                                <span className="font-bold text-gray-900 uppercase">{hotel.hotelCategory || editData?.hotelCategory}</span>
                            </div>
                        )}
                        {hotel.propertyType === 'resort' && (hotel.resortType || editData?.resortType) && (
                            <div className="flex justify-between items-center min-h-[32px]">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Resort Type</span>
                                <span className="font-bold text-gray-900 uppercase">{hotel.resortType || editData?.resortType}</span>
                            </div>
                        )}



                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Contact Number</span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editData.contactNumber || ''}
                                    onChange={(e) => onChange('contactNumber', e.target.value)}
                                    className="bg-white border rounded px-2 py-1 text-sm font-bold w-1/2 outline-none focus:ring-1 focus:ring-black"
                                />
                            ) : (
                                <span className="font-bold text-gray-900">{hotel.contactNumber || 'Not Provided'}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Status</span>
                            {isEditing ? (
                                <select
                                    value={editData.status || ''}
                                    onChange={(e) => onChange('status', e.target.value)}
                                    className="bg-white border rounded px-2 py-1 text-sm font-bold w-1/2 outline-none focus:ring-1 focus:ring-black uppercase"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            ) : (
                                <span className={`font-bold uppercase ${hotel.status === 'approved' ? 'text-green-600' : 'text-amber-600'}`}>{hotel.status}</span>
                            )}
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Joined Date</span>
                            <span className="font-bold text-gray-900">{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Suitability</span>
                            {isEditing ? (
                                <select
                                    value={editData.suitability || ''}
                                    onChange={(e) => onChange('suitability', e.target.value)}
                                    className="bg-white border rounded px-2 py-1 text-sm font-bold w-1/2 outline-none focus:ring-1 focus:ring-black uppercase"
                                >
                                    <option value="Family Friendly">Family Friendly</option>
                                    <option value="Couple Friendly">Couple Friendly</option>
                                    <option value="Both">Both</option>
                                    <option value="none">None</option>
                                </select>
                            ) : (
                                <span className="font-bold text-gray-900 uppercase">{hotel.suitability || 'None'}</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center min-h-[32px]">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Live On Platform</span>
                            {isEditing ? (
                                <div className="flex items-center gap-2 w-1/2">
                                    <input
                                        type="checkbox"
                                        checked={editData.isLive || false}
                                        onChange={(e) => onChange('isLive', e.target.checked)}
                                        className="w-4 h-4 rounded text-black border-gray-300 focus:ring-black"
                                    />
                                    <span className="text-[10px] font-bold uppercase text-gray-500">{editData.isLive ? 'Yes' : 'No'}</span>
                                </div>
                            ) : (
                                <span className="font-bold text-gray-900 flex items-center gap-1">
                                    {hotel.isLive ? <CheckCircle size={12} className="text-green-600" /> : <XCircle size={12} className="text-red-500" />}
                                    {hotel.isLive ? 'Yes' : 'No'}
                                </span>
                            )}
                        </div>

                        {/* FAKE PRICE FEATURE */}
                        <div className="flex justify-between items-center min-h-[32px] pt-1 border-t border-gray-100 mt-1">
                            <div className="flex flex-col">
                                <span className="text-red-500 font-bold uppercase text-[10px]">Fake Price (UI Only)</span>
                                <span className="text-[8px] text-gray-400 font-medium lowercase italic">Shown as slashed price to users</span>
                            </div>
                            {isEditing ? (
                                <div className="relative w-1/2">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">₹</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={editData.fakePrice || ''}
                                        onChange={(e) => onChange('fakePrice', e.target.value)}
                                        className="w-full bg-white border border-red-100 rounded pl-5 pr-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-red-500 text-red-600"
                                    />
                                </div>
                            ) : (
                                <span className="font-bold text-red-500">
                                    {hotel.fakePrice ? `₹${hotel.fakePrice.toLocaleString()}` : 'None'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <MapPin size={14} /> Partner & Location
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Partner Name</span>
                            <span className="font-bold text-gray-900">{hotel.partnerId?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Partner Email</span>
                            <span className="font-bold text-gray-900">{hotel.partnerId?.email || 'N/A'}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-gray-500 font-bold uppercase text-[10px] block mb-1">Full Address</span>
                            {isEditing ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editData.address?.fullAddress || ''}
                                        onChange={(e) => onChange('address', { ...editData.address, fullAddress: e.target.value })}
                                        className="w-full bg-white border rounded px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-black uppercase h-20"
                                        placeholder="Full Address"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={editData.address?.city || ''}
                                            onChange={(e) => onChange('address', { ...editData.address, city: e.target.value })}
                                            className="bg-white border rounded px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-black uppercase"
                                            placeholder="City"
                                        />
                                        <input
                                            type="text"
                                            value={editData.address?.state || ''}
                                            onChange={(e) => onChange('address', { ...editData.address, state: e.target.value })}
                                            className="bg-white border rounded px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-black uppercase"
                                            placeholder="State"
                                        />
                                        <input
                                            type="text"
                                            value={editData.address?.pincode || ''}
                                            onChange={(e) => onChange('address', { ...editData.address, pincode: e.target.value })}
                                            className="bg-white border rounded px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-black uppercase"
                                            placeholder="Pincode"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Longitude</span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editData.location?.coordinates[0] || 0}
                                                onChange={(e) => {
                                                    const newCoords = [...editData.location.coordinates];
                                                    newCoords[0] = parseFloat(e.target.value);
                                                    onChange('location', { ...editData.location, coordinates: newCoords });
                                                }}
                                                className="w-full bg-white border rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-black"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase">Latitude</span>
                                            <input
                                                type="number"
                                                step="any"
                                                value={editData.location?.coordinates[1] || 0}
                                                onChange={(e) => {
                                                    const newCoords = [...editData.location.coordinates];
                                                    newCoords[1] = parseFloat(e.target.value);
                                                    onChange('location', { ...editData.location, coordinates: newCoords });
                                                }}
                                                className="w-full bg-white border rounded px-2 py-1 text-[10px] font-bold outline-none focus:ring-1 focus:ring-black"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <span className="font-bold block text-gray-800 leading-relaxed capitalize">
                                    {hotel.address?.fullAddress || hotel.address?.area || 'N/A'}
                                    <br />
                                    {hotel.address?.city}, {hotel.address?.state} {hotel.address?.pincode && `- ${hotel.address.pincode}`}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">About Property</h3>
                {isEditing ? (
                    <textarea
                        value={editData.shortDescription || ''}
                        onChange={(e) => onChange('shortDescription', e.target.value)}
                        className="w-full bg-white border rounded px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-black h-24"
                    />
                ) : (
                    <p className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                        {hotel.shortDescription || 'No description provided for this property.'}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Check In</h4>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editData.checkInTime || ''}
                            onChange={(e) => onChange('checkInTime', e.target.value)}
                            className="w-full bg-gray-50 border rounded px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                        />
                    ) : (
                        <p className="text-sm font-bold text-gray-900">{hotel.checkInTime || 'Not set'}</p>
                    )}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Check Out</h4>
                    {isEditing ? (
                        <input
                            type="text"
                            value={editData.checkOutTime || ''}
                            onChange={(e) => onChange('checkOutTime', e.target.value)}
                            className="w-full bg-gray-50 border rounded px-2 py-1 text-sm font-bold outline-none focus:ring-1 focus:ring-black"
                        />
                    ) : (
                        <p className="text-sm font-bold text-gray-900">{hotel.checkOutTime || 'Not set'}</p>
                    )}
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Average Rating</h4>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1">
                        <Star size={14} className="text-yellow-400" />
                        {hotel.avgRating?.toFixed(1) || '0.0'}
                        <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">
                            ({hotel.totalReviews || 0} Reviews)
                        </span>
                    </p>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-3">
                    {hotel.amenities && hotel.amenities.length > 0 ? (
                        hotel.amenities.map((amenity, i) => (
                            <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700">
                                <CheckCircle size={12} className="text-green-500" />
                                {amenity.replace(/_/g, ' ')}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 font-bold uppercase">No amenities listed</p>
                    )}
                </div>
            </div>

            <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">House Rules</h3>
                <div className="space-y-2">
                    {hotel.houseRules && hotel.houseRules.length > 0 ? (
                        hotel.houseRules.map((rule, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-black mt-1.5 shrink-0" />
                                <p className="text-xs font-bold text-gray-700 uppercase leading-snug">{rule}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-400 font-bold uppercase">No specific rules defined</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const GalleryTab = ({ hotel, isEditing, editData, onChange }) => {
    const handleAddImage = () => {
        onChange('propertyImages', [...(editData.propertyImages || []), '']);
    };

    const handleImageChange = (index, urls) => {
        const newImages = [...editData.propertyImages];
        if (Array.isArray(urls)) {
            // Replace the empty placeholder at index and insert new ones
            newImages.splice(index, 1, ...urls);
        } else {
            newImages[index] = urls;
        }
        onChange('propertyImages', newImages);
    };

    const handleRemoveImage = (index) => {
        const newImages = editData.propertyImages.filter((_, i) => i !== index);
        onChange('propertyImages', newImages);
    };

    return (
        <div className="space-y-10">
            {/* Section: Cover Image */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <ImageIcon size={20} className="text-black" />
                    <h3 className="text-lg font-bold text-gray-900 uppercase">Cover Image</h3>
                </div>
                <div className="max-w-xl">
                    {isEditing ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-4">
                                <FileUpload onUpload={(url) => onChange('coverImage', url)} type="hotel" />
                                {editData.coverImage && (
                                    <button
                                        onClick={() => onChange('coverImage', '')}
                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                            {editData.coverImage && (
                                <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200">
                                    <img src={editData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="aspect-video w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative group">
                            {hotel.coverImage ? (
                                <img src={hotel.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Section: Property Wide Images */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900 uppercase">General Property Photos</h3>
                    </div>
                    {isEditing && (
                        <div className="flex gap-2">
                            <FileUpload
                                label="Bulk Upload"
                                multiple={true}
                                onUpload={(urls) => onChange('propertyImages', [...(editData.propertyImages || []), ...urls])}
                                type="hotel"
                            />
                            <button
                                onClick={handleAddImage}
                                className="px-3 py-1 bg-black text-white rounded text-[10px] font-bold uppercase hover:bg-gray-800"
                            >
                                Add Slot
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {isEditing ? (
                        <>
                            {editData.propertyImages.map((img, i) => (
                                <div key={i} className="space-y-2 group relative">
                                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative">
                                        {img ? (
                                            <>
                                                <img src={img.url || img} alt={`Preview ${i}`} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => handleRemoveImage(i)}
                                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </>
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                <FileUpload
                                                    onUpload={(urls) => handleImageChange(i, urls)}
                                                    type="hotel"
                                                    multiple={true}
                                                    className="bg-transparent text-gray-400 border border-dashed border-gray-300 hover:bg-gray-50 lowercase w-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={handleAddImage}
                                className="aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-black hover:text-black cursor-pointer transition-all uppercase text-[10px] font-bold"
                            >
                                <ImageIcon size={24} />
                                Add Photo Slot
                            </button>
                        </>
                    ) : (
                        hotel.propertyImages && hotel.propertyImages.length > 0 ? (
                            hotel.propertyImages.map((img, i) => (
                                <div key={i} className="aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative group shadow-sm transition-all hover:shadow-md">
                                    <img src={img.url || img} alt={`Property ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-10 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                <p className="text-gray-400 font-bold uppercase text-xs">No General Photos</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const DocumentsTab = ({ hotel, documents, onVerify, verifying, isEditing, editData, onChange }) => {
    const [remark, setRemark] = useState('');

    const handleDocChange = (index, field, value) => {
        const newDocs = [...editData.documents];
        newDocs[index] = { ...newDocs[index], [field]: value };
        onChange('documents', newDocs);
    };

    if (!documents && !isEditing) {
        return (
            <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
                <ShieldCheck size={48} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-gray-900 font-bold uppercase text-sm">No Documents Submitted</h3>
                <p className="text-gray-400 text-xs mt-1">This property has not uploaded any verification documents yet.</p>
            </div>
        );
    }

    const status = documents?.verificationStatus || 'pending';

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <FileText size={16} /> Document Summary
                    </h4>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property</span>
                            <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Verification Status</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${status === 'verified'
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : status === 'rejected'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {status === 'verified' && <ShieldCheck size={10} />}
                                {status === 'rejected' && <XCircle size={10} />}
                                {status === 'pending' && <Clock size={10} />}
                                {status}
                            </span>
                        </div>
                        {documents?.verifiedAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Last Updated</span>
                                <span className="font-bold text-gray-900">
                                    {new Date(documents.verifiedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {documents?.adminRemark && (
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Remark</p>
                                <p className="text-xs font-bold text-gray-800">{documents.adminRemark}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <ShieldCheck size={16} /> Verification Actions
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Rejection Remark</p>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional note in case of rejection"
                                className="w-full min-h-[80px] text-xs font-bold uppercase border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                disabled={verifying || status === 'verified' || isEditing}
                                onClick={() => onVerify && onVerify('approve', '')}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'verified'
                                    ? 'bg-green-100 text-green-500 border border-green-100 cursor-not-allowed'
                                    : 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                                    } ${verifying || isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle size={14} />
                                Approve Documents
                            </button>
                            <button
                                type="button"
                                disabled={verifying || status === 'rejected' || isEditing}
                                onClick={() => onVerify && onVerify('reject', remark)}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'rejected'
                                    ? 'bg-red-100 text-red-500 border border-red-100 cursor-not-allowed'
                                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    } ${verifying || isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <XCircle size={14} />
                                Reject Documents
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
                            Approving documents will move the property to <span className="text-green-700">approved</span> status
                            and make it live on the platform. Rejected properties will stay hidden from users until issues are fixed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                    <FileText size={16} /> Uploaded Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isEditing ? (
                        editData.documents.map((doc, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                                <input
                                    type="text"
                                    value={doc.name || ''}
                                    onChange={(e) => handleDocChange(idx, 'name', e.target.value)}
                                    className="w-full bg-white border rounded px-3 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-black"
                                    placeholder="Document Name (e.g. Trade License)"
                                />
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <FileUpload
                                            onUpload={(url) => handleDocChange(idx, 'fileUrl', url)}
                                            type="document"
                                            label="Upload Document"
                                            accept="image/*,application/pdf"
                                            icon={FileText}
                                            className="w-full justify-center"
                                        />
                                    </div>
                                    {doc.fileUrl && (
                                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold overflow-hidden">
                                            <span className="truncate text-gray-400">{doc.fileUrl}</span>
                                            <button
                                                onClick={() => handleDocChange(idx, 'fileUrl', '')}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={doc.isRequired || false}
                                        onChange={(e) => handleDocChange(idx, 'isRequired', e.target.checked)}
                                        className="rounded border-gray-300 text-black focus:ring-black"
                                    />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">Is Required</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        documents?.documents && documents.documents.length > 0 ? (
                            documents.documents.map((doc, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between bg-gray-50">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-gray-900 uppercase">
                                                {doc.name || doc.type || 'Document'}
                                            </span>
                                            {doc.isRequired && (
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 uppercase">
                                            {doc.type || 'Uploaded File'}
                                        </p>
                                    </div>
                                    <div className="mt-3">
                                        {doc.fileUrl ? (
                                            <a
                                                href={doc.fileUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100"
                                            >
                                                <FileText size={12} />
                                                View File
                                            </a>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                                                <AlertCircle size={11} /> No file
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-8 text-[10px] font-bold uppercase text-gray-400">
                                No individual documents uploaded
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const RoomsTab = ({ rooms, isEditing, editData, onChange }) => {
    const [expandedRoomId, setExpandedRoomId] = useState(null);

    const handleRoomChange = (roomId, field, value) => {
        const updatedRooms = editData.rooms.map(room =>
            room._id === roomId ? { ...room, [field]: value } : room
        );
        onChange('rooms', updatedRooms);
    };

    const handleDeleteRoom = (roomId) => {
        const updatedRooms = editData.rooms.filter(room => room._id !== roomId);
        onChange('rooms', updatedRooms);
    };

    const handleAddRoom = () => {
        const newRoom = {
            _id: `new-${Date.now()}`, // Temporary ID
            name: 'NEW ROOM TYPE',
            inventoryType: 'room',
            roomCategory: 'private',
            maxAdults: 2,
            maxChildren: 0,
            totalInventory: 1,
            pricePerNight: 0,
            extraAdultPrice: 0,
            extraChildPrice: 0,
            bedsPerRoom: 1,
            amenities: [],
            images: ['', '', ''],
            isActive: true
        };
        onChange('rooms', [...(editData.rooms || []), newRoom]);
    };

    const handleAddRoomImage = (roomId) => {
        const updatedRooms = editData.rooms.map(room =>
            room._id === roomId ? { ...room, images: [...(room.images || []), ''] } : room
        );
        onChange('rooms', updatedRooms);
    };

    const handleRemoveRoomImage = (roomId, index) => {
        const updatedRooms = editData.rooms.map(room =>
            room._id === roomId ? { ...room, images: room.images.filter((_, i) => i !== index) } : room
        );
        onChange('rooms', updatedRooms);
    };

    const handleRoomImageUpload = (roomId, index, urls) => {
        const updatedRooms = editData.rooms.map(room => {
            if (room._id === roomId) {
                const newImages = [...room.images];
                if (Array.isArray(urls)) {
                    // Replace the empty slot and add others
                    newImages.splice(index, 1, ...urls);
                } else {
                    newImages[index] = urls;
                }
                return { ...room, images: newImages };
            }
            return room;
        });
        onChange('rooms', updatedRooms);
    };

    const displayRooms = isEditing ? (editData.rooms || []) : (rooms || []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 uppercase">Room Inventory</h3>
                {isEditing && (
                    <button
                        onClick={handleAddRoom}
                        className="px-4 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                        <Bed size={14} /> Add New Room Type
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {displayRooms.length > 0 ? (
                    displayRooms.map((room, i) => {
                        const isExpanded = expandedRoomId === room._id;
                        return (
                            <div key={room._id || i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    className="p-5 flex flex-col md:flex-row items-center gap-6 cursor-pointer"
                                    onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}
                                >
                                    <div className="w-full md:w-32 h-24 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-400 relative overflow-hidden">
                                        {(room.images && room.images[0]) ? (
                                            <img src={room.images[0].url || room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Bed size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={room.name || ''}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleRoomChange(room._id, 'name', e.target.value)}
                                                className="font-bold text-gray-900 text-lg uppercase tracking-tight bg-gray-50 border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-black w-full md:w-auto"
                                            />
                                        ) : (
                                            <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{room.name}</h4>
                                        )}
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-bold uppercase text-gray-400">
                                            <span className="flex items-center gap-1"><Users size={12} /> Max {room.maxAdults} Adults, {room.maxChildren} Child</span>
                                            <span className="flex items-center gap-1"><Building2 size={12} /> {room.totalInventory} Rooms Total</span>
                                            <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={12} /> {room.inventoryType}</span>
                                            <span className="flex items-center gap-1 text-blue-600"><ShieldCheck size={12} /> {room.roomCategory}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                                            {isEditing ? (
                                                <select
                                                    value={room.isActive}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onChange={(e) => handleRoomChange(room._id, 'isActive', e.target.value === 'true')}
                                                    className="bg-gray-50 border rounded px-2 py-1 text-[10px] font-bold uppercase outline-none"
                                                >
                                                    <option value="true">Active</option>
                                                    <option value="false">Inactive</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {room.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Price / Night</p>
                                            {isEditing ? (
                                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <span className="font-bold">₹</span>
                                                    <input
                                                        type="number"
                                                        value={room.pricePerNight || 0}
                                                        onChange={(e) => handleRoomChange(room._id, 'pricePerNight', Number(e.target.value))}
                                                        className="w-20 bg-gray-50 border rounded px-2 py-1 text-sm font-bold outline-none"
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-xl font-bold text-gray-900">₹{room.pricePerNight}</p>
                                            )}
                                        </div>
                                        {isEditing && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRoom(room._id);
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mr-2"
                                                title="Delete Room Type"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <ChevronLeft
                                            size={20}
                                            className={`text-gray-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-gray-100 bg-gray-50"
                                        >
                                            <div className="p-6">
                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Pricing Details</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Base Price</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.pricePerNight} onChange={(e) => handleRoomChange(room._id, 'pricePerNight', Number(e.target.value))} className="w-20 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">₹{room.pricePerNight}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Extra Adult</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.extraAdultPrice} onChange={(e) => handleRoomChange(room._id, 'extraAdultPrice', Number(e.target.value))} className="w-20 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">₹{room.extraAdultPrice}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Extra Child</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.extraChildPrice} onChange={(e) => handleRoomChange(room._id, 'extraChildPrice', Number(e.target.value))} className="w-20 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">₹{room.extraChildPrice}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Configuration</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Max Adults</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.maxAdults} onChange={(e) => handleRoomChange(room._id, 'maxAdults', Number(e.target.value))} className="w-16 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">{room.maxAdults}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Max Children</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.maxChildren} onChange={(e) => handleRoomChange(room._id, 'maxChildren', Number(e.target.value))} className="w-16 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">{room.maxChildren}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Inventory</span>
                                                                {isEditing ? (
                                                                    <input type="number" value={room.totalInventory} onChange={(e) => handleRoomChange(room._id, 'totalInventory', Number(e.target.value))} className="w-16 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                ) : (
                                                                    <span className="font-bold text-gray-900">{room.totalInventory} Units</span>
                                                                )}
                                                            </div>

                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Type</span>
                                                                {isEditing ? (
                                                                    <select
                                                                        value={room.inventoryType}
                                                                        onChange={(e) => handleRoomChange(room._id, 'inventoryType', e.target.value)}
                                                                        className="bg-gray-50 border rounded px-1 py-0.5 font-bold text-right uppercase text-[10px]"
                                                                    >
                                                                        <option value="room">Room</option>
                                                                        <option value="bed">Bed</option>
                                                                        <option value="entire">Entire</option>
                                                                    </select>
                                                                ) : (
                                                                    <span className="font-bold text-gray-900 uppercase">{room.inventoryType}</span>
                                                                )}
                                                            </div>

                                                            {room.inventoryType === 'bed' && (
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="text-gray-500 font-bold uppercase text-[10px]">Beds Per Room</span>
                                                                    {isEditing ? (
                                                                        <input type="number" value={room.bedsPerRoom || 1} onChange={(e) => handleRoomChange(room._id, 'bedsPerRoom', Number(e.target.value))} className="w-16 bg-gray-50 border rounded px-1 py-0.5 font-bold text-right" />
                                                                    ) : (
                                                                        <span className="font-bold text-gray-900">{room.bedsPerRoom} Beds</span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex justify-between items-center text-xs">
                                                                <span className="text-gray-500 font-bold uppercase text-[10px]">Category</span>
                                                                {isEditing ? (
                                                                    <select
                                                                        value={room.roomCategory}
                                                                        onChange={(e) => handleRoomChange(room._id, 'roomCategory', e.target.value)}
                                                                        className="bg-gray-50 border rounded px-1 py-0.5 font-bold text-right uppercase text-[10px]"
                                                                    >
                                                                        <option value="private">Private</option>
                                                                        <option value="shared">Shared</option>
                                                                        <option value="entire">Entire</option>
                                                                    </select>
                                                                ) : (
                                                                    <span className="font-bold text-gray-900 uppercase">{room.roomCategory}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Amenities</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-2 min-h-[96px]">
                                                            {room.amenities && room.amenities.length > 0 ? (
                                                                room.amenities.map((amenity, idx) => (
                                                                    <span key={idx} className="px-2 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                                                        {amenity}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase">No amenities listed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Room Images */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 block">Room Photos</h5>
                                                        {isEditing && (
                                                            <button
                                                                onClick={() => handleAddRoomImage(room._id)}
                                                                className="px-3 py-1 bg-black text-white rounded text-[10px] font-bold uppercase hover:bg-gray-800"
                                                            >
                                                                Add Photo
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {room.images && room.images.map((img, idx) => (
                                                            <div key={idx} className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-200 group relative">
                                                                {img && (
                                                                    <>
                                                                        <img
                                                                            src={img.url || img}
                                                                            alt={`${room.name} ${idx}`}
                                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                        />
                                                                        {isEditing && (
                                                                            <button
                                                                                onClick={() => handleRemoveRoomImage(room._id, idx)}
                                                                                className="absolute top-2 right-2 p-1 bg-white/90 text-red-600 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {!img && isEditing && (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <FileUpload
                                                                            onUpload={(urls) => handleRoomImageUpload(room._id, idx, urls)}
                                                                            type="room"
                                                                            multiple={true}
                                                                            className="bg-transparent text-gray-400 border border-dashed border-gray-300 hover:bg-gray-50 lowercase"
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-10 text-center text-gray-400 font-bold uppercase text-xs">No room data available</div>
                )}
            </div>
        </div>
    );
};

const BookingsTab = ({ bookings }) => (
    <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Guest Name..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-black"
                />
            </div>
            <div className="flex items-center gap-4">
                <div className="text-[10px] font-bold uppercase text-gray-500">
                    Total: <span className="font-bold text-gray-900">{bookings?.length || 0} Bookings</span>
                </div>
            </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                    <tr>
                        <th className="p-4 font-bold text-gray-600">Booking ID</th>
                        <th className="p-4 font-bold text-gray-600">Guest</th>
                        <th className="p-4 font-bold text-gray-600">Check-In</th>
                        <th className="p-4 font-bold text-gray-600">Status</th>
                        <th className="p-4 font-bold text-gray-600 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {bookings && bookings.length > 0 ? (
                        bookings.map((b, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="p-4 font-mono text-xs text-blue-600 hover:underline">
                                    <Link to={`/hotel/admin/bookings/${b._id}`}>
                                        #{b.bookingId || b._id.slice(-6)}
                                    </Link>
                                </td>
                                <td className="p-4 font-bold text-gray-900 uppercase text-xs">{b.userId?.name || 'Guest'}</td>
                                <td className="p-4 text-[10px] font-bold uppercase text-gray-400">{new Date(b.checkInDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${b.bookingStatus === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        b.bookingStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            b.bookingStatus === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                        }`}>
                                        {b.bookingStatus}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-bold">₹{b.totalAmount?.toLocaleString()}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="p-8 text-center text-gray-400 font-bold uppercase text-xs">No bookings found</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

// --- Main Page Component ---

const AdminHotelDetail = () => {
    const { id } = useParams();
    const [hotel, setHotel] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [documents, setDocuments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    const [verifying, setVerifying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchHotelDetails = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminService.getHotelDetails(id);
            if (data.success) {
                setHotel(data.hotel);
                setBookings(data.bookings || []);
                setDocuments(data.documents || null);
                setEditData({
                    propertyName: data.hotel.propertyName || '',
                    propertyType: data.hotel.propertyType || '',
                    contactNumber: data.hotel.contactNumber || '',
                    status: data.hotel.status || '',
                    suitability: data.hotel.suitability || '',
                    isLive: data.hotel.isLive || false,
                    starRating: data.hotel.starRating || 1,
                    pgType: data.hotel.pgType || '',
                    hostelType: data.hotel.hostelType || '',
                    resortType: data.hotel.resortType || '',
                    hotelCategory: data.hotel.hotelCategory || '',
                    address: {
                        fullAddress: data.hotel.address?.fullAddress || '',
                        city: data.hotel.address?.city || '',
                        state: data.hotel.address?.state || '',
                        pincode: data.hotel.address?.pincode || ''
                    },
                    location: data.hotel.location || { type: 'Point', coordinates: [0, 0] },
                    shortDescription: data.hotel.shortDescription || '',
                    checkInTime: data.hotel.checkInTime || '',
                    checkOutTime: data.hotel.checkOutTime || '',
                    amenities: data.hotel.amenities || [],
                    houseRules: data.hotel.houseRules || [],
                    propertyImages: data.hotel.propertyImages || [],
                    coverImage: data.hotel.coverImage || '',
                    documents: data.documents?.documents || [],
                    rooms: data.hotel.rooms || [],
                    fakePrice: data.hotel.fakePrice || 0
                });
            }
        } catch (error) {
            console.error('Error fetching hotel details:', error);
            toast.error('Failed to load hotel information');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchHotelDetails();
    }, [fetchHotelDetails]);

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            // Clean up arrays before saving
            const cleanedData = {
                ...editData,
                amenities: Array.isArray(editData.amenities) ? editData.amenities.map(s => s.trim()).filter(s => s) : [],
                houseRules: Array.isArray(editData.houseRules) ? editData.houseRules.map(s => s.trim()).filter(s => s) : []
            };

            console.log('Saving Property Data:', cleanedData);
            setIsSaving(true);
            const res = await adminService.updateProperty(id, cleanedData);
            if (res.success) {
                toast.success('Property updated successfully');
                await fetchHotelDetails();
                setIsEditing(false);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update property');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reset editData to match currently loaded hotel
        if (hotel) {
            setEditData({
                propertyName: hotel.propertyName || '',
                propertyType: hotel.propertyType || '',
                contactNumber: hotel.contactNumber || '',
                status: hotel.status || '',
                suitability: hotel.suitability || '',
                isLive: hotel.isLive || false,
                starRating: hotel.starRating || 1,
                pgType: hotel.pgType || '',
                hostelType: hotel.hostelType || '',
                resortType: hotel.resortType || '',
                hotelCategory: hotel.hotelCategory || '',
                address: {
                    fullAddress: hotel.address?.fullAddress || '',
                    city: hotel.address?.city || '',
                    state: hotel.address?.state || '',
                    pincode: hotel.address?.pincode || ''
                },
                location: hotel.location || { type: 'Point', coordinates: [0, 0] },
                shortDescription: hotel.shortDescription || '',
                checkInTime: hotel.checkInTime || '',
                checkOutTime: hotel.checkOutTime || '',
                amenities: hotel.amenities || [],
                houseRules: hotel.houseRules || [],
                propertyImages: hotel.propertyImages || [],
                coverImage: hotel.coverImage || '',
                documents: documents?.documents || [],
                rooms: hotel.rooms || [],
                fakePrice: hotel.fakePrice || 0
            });
        }
    };

    const handleVerifyDocuments = (action, remark) => {
        if (!hotel) return;

        const isApprove = action === 'approve';

        setModalConfig({
            isOpen: true,
            title: isApprove ? 'Approve Property Documents?' : 'Reject Property Documents?',
            message: isApprove
                ? 'This will mark all submitted documents as verified and move the property to approved status.'
                : 'This will reject the submitted documents and keep the property hidden from users.',
            type: isApprove ? 'success' : 'danger',
            confirmText: isApprove ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    setVerifying(true);
                    const res = await adminService.verifyPropertyDocuments(hotel._id, action, remark);
                    if (res.success) {
                        toast.success(isApprove ? 'Documents approved successfully' : 'Documents rejected successfully');
                        setHotel(res.property);
                        setDocuments(res.documents);
                    }
                } catch {
                    toast.error('Failed to update document verification');
                } finally {
                    setVerifying(false);
                }
            }
        });
    };

    const handleStatusToggle = async () => {
        const isSuspended = hotel.status === 'suspended';
        const newStatus = isSuspended ? 'approved' : 'suspended';
        setModalConfig({
            isOpen: true,
            title: isSuspended ? 'Activate Hotel?' : 'Suspend Hotel?',
            message: isSuspended
                ? `Hotel "${hotel.propertyName}" will be able to receive bookings again.`
                : `Suspending "${hotel.propertyName}" will prevent it from receiving new bookings.`,
            type: isSuspended ? 'success' : 'danger',
            confirmText: isSuspended ? 'Activate' : 'Suspend',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                    if (res.success) {
                        toast.success(`Hotel ${isSuspended ? 'activated' : 'suspended'} successfully`);
                        fetchHotelDetails();
                    }
                } catch {
                    toast.error('Failed to update hotel status');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-gray-400" size={48} />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading property details...</p>
        </div>
    );

    if (!hotel) return (
        <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Hotel Not Found</h2>
            <Link to="/hotel/admin/hotels" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Hotels</Link>
        </div>
    );

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'gallery', label: 'Full Gallery', icon: ImageIcon },
        { id: 'documents', label: 'KYC Documents', icon: ShieldCheck },
        { id: 'rooms', label: 'Rooms & Pricing', icon: Bed },
        { id: 'bookings', label: 'Booking History', icon: Calendar },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to="/hotel/admin/hotels" className="hover:text-black transition-colors">Hotels</Link>
                <span>/</span>
                <span className="text-black font-bold">{hotel.propertyName}</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 shadow-inner flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                        {hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0]) ? (
                            <img src={hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0].url) || (hotel.propertyImages && hotel.propertyImages[0])} alt="Hotel" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={32} className="text-gray-300" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{hotel.propertyName}</h1>
                            {hotel.status === 'suspended' ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-full flex items-center uppercase">
                                    <Ban size={10} className="mr-1" /> SUSPENDED
                                </span>
                            ) : (
                                <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full flex items-center uppercase ${hotel.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                    {hotel.status === 'approved' ? <CheckCircle size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                                    {hotel.status}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1 flex items-center">
                            <MapPin size={12} className="mr-1 text-gray-400" /> {hotel.address?.city}, {hotel.address?.state}
                            <span className="mx-2 text-gray-300">|</span>
                            Owner: {hotel.partnerId?.name || 'N/A'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="flex-1 md:flex-none px-6 py-2 border border-gray-200 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 md:flex-none px-6 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 disabled:opacity-70 flex items-center gap-2 transition-all"
                            >
                                {isSaving ? <Loader2 size={12} className="animate-spin" /> : 'Save Changes'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 md:flex-none px-6 py-2 bg-black text-white rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition-colors"
                            >
                                Edit Property
                            </button>
                            <button
                                onClick={handleStatusToggle}
                                className={`flex-1 md:flex-none px-6 py-2 border rounded-lg text-[10px] font-bold uppercase transition-colors ${hotel.status === 'suspended'
                                    ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                                    : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                                    }`}
                            >
                                {hotel.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <OverviewTab
                            hotel={hotel}
                            isEditing={isEditing}
                            editData={editData}
                            onChange={handleEditChange}
                        />
                    )}
                    {activeTab === 'gallery' && (
                        <GalleryTab
                            hotel={hotel}
                            isEditing={isEditing}
                            editData={editData}
                            onChange={handleEditChange}
                        />
                    )}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            hotel={hotel}
                            documents={documents}
                            onVerify={handleVerifyDocuments}
                            verifying={verifying}
                            isEditing={isEditing}
                            editData={editData}
                            onChange={handleEditChange}
                        />
                    )}
                    {activeTab === 'rooms' && (
                        <RoomsTab
                            rooms={hotel.rooms}
                            isEditing={isEditing}
                            editData={editData}
                            onChange={handleEditChange}
                        />
                    )}
                    {activeTab === 'bookings' && <BookingsTab bookings={bookings} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminHotelDetail;
