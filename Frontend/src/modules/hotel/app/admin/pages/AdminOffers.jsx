import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag, Plus, Trash2, Edit3, Search,
  Filter, ChevronRight, Calendar, Users,
  CheckCircle, XCircle, Clock, Sparkles,
  TicketPercent, Image as ImageIcon, LayoutGrid, List
} from 'lucide-react';
import { axiosInstance } from '../store/adminStore';
import toast from 'react-hot-toast';

const AdminOffers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minBookingAmount: '',
    maxDiscount: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    usageLimit: '1000',
    userLimit: '1',
    isActive: true,
    offerType: 'coupon'
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get('/offers/all');
      setOffers(res.data);
    } catch {
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (offer) => {
    setFormData({
      title: offer.title || '',
      subtitle: offer.subtitle || '',
      code: offer.code || '',
      discountType: offer.discountType || 'percentage',
      discountValue: offer.discountValue || '',
      minBookingAmount: offer.minBookingAmount || '',
      maxDiscount: offer.maxDiscount || '',
      description: offer.description || '',
      startDate: offer.startDate ? new Date(offer.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      endDate: offer.endDate ? new Date(offer.endDate).toISOString().split('T')[0] : '',
      image: offer.image || '',
      usageLimit: offer.usageLimit || '1000',
      userLimit: offer.userLimit || '1',
      isActive: offer.isActive ?? true,
      offerType: offer.offerType || 'coupon'
    });
    setSelectedOfferId(offer._id);
    setIsEditing(true);
    setImagePreview(offer.image);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      await axiosInstance.delete(`/offers/${id}`);
      toast.success("Offer deleted successfully");
      fetchOffers();
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "Title is required";

    if (formData.offerType === 'coupon') {
      if (!formData.code.trim()) return "Coupon code is required";
      if (formData.code.length < 3) return "Code must be at least 3 characters";
      if (!formData.discountValue || formData.discountValue <= 0) return "Valid discount value is required";

      if (formData.discountType === 'percentage' && formData.discountValue > 100) {
        return "Percentage discount cannot exceed 100%";
      }
      if (formData.usageLimit < 1) return "Overall usage limit must be at least 1";
      if (formData.userLimit < 1) return "User limit must be at least 1";
    }

    if (!formData.startDate) return "Start date is required";
    if (!formData.endDate) return "End date is required";

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      return "End date cannot be before start date";
    }

    if (!isEditing && !imageFile) return "Offer image is required";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      let data;
      let headers = {};

      if (imageFile) {
        data = new FormData();
        Object.keys(formData).forEach(key => {
          data.append(key, formData[key]);
        });
        data.append('image', imageFile);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        data = formData;
      }

      if (isEditing) {
        await axiosInstance.put(`/offers/${selectedOfferId}`, data, { headers });
        toast.success("Offer updated successfully");
      } else {
        await axiosInstance.post('/offers', data, { headers });
        toast.success("Offer created successfully");
      }

      setShowAddModal(false);
      setIsEditing(false);
      setSelectedOfferId(null);
      setImageFile(null);
      setImagePreview('');
      fetchOffers();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} offer`);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-surface flex items-center gap-2">
            <Tag className="text-accent" />
            Offer Management
          </h1>
          <p className="text-sm text-gray-500 font-medium">Create and manage promo codes for users</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-surface text-white shadow-md' : 'text-gray-400 hover:text-surface'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface text-white shadow-md' : 'text-gray-400 hover:text-surface'}`}
            >
              <List size={18} />
            </button>
          </div>

          <button
            onClick={() => {
              setIsEditing(false);
              setFormData({
                title: '', subtitle: '', code: '', discountType: 'percentage',
                discountValue: '', minBookingAmount: '', maxDiscount: '',
                description: '', startDate: new Date().toISOString().split('T')[0],
                endDate: '', image: '', usageLimit: '1000', userLimit: '1', isActive: true
              });
              setImagePreview('');
              setImageFile(null);
              setShowAddModal(true);
            }}
            className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Create New Offer
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Offers", value: offers.length, icon: Tag, color: "blue" },
          { label: "Active Now", value: offers.filter(o => o.isActive).length, icon: CheckCircle, color: "green" },
          { label: "Total Redemptions", value: offers.reduce((acc, o) => acc + (o.usageCount || 0), 0), icon: Sparkles, color: "orange" },
          { label: "Highest Discount", value: "75%", icon: TicketPercent, color: "purple" },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center`}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-black text-surface">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Offers Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-500 font-bold">Synchronizing offers...</p>
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-[32px] p-12 text-center border-2 border-dashed border-gray-200">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <TicketPercent size={40} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-surface mb-2">No active offers found</h3>
          <p className="text-sm text-gray-400 max-w-xs mx-auto mb-6">Start by creating your first promotional offer to attract more bookings.</p>
          <button onClick={() => setShowAddModal(true)} className="text-accent font-bold text-sm underline">Create your first offer</button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <motion.div
              layout
              key={offer._id}
              className="bg-white rounded-[28px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="relative h-48 bg-gray-200">
                <img src={offer.image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-5">
                  <div className="flex justify-between items-end">
                    <div>
                      {offer.offerType !== 'banner' && (
                        <span className="bg-accent text-[10px] font-black px-2 py-0.5 rounded uppercase text-white mb-2 inline-block">
                          {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ' FLAT'} OFF
                        </span>
                      )}
                      <h3 className="text-xl font-black text-white leading-tight">{offer.title}</h3>
                    </div>
                    {offer.offerType !== 'banner' && (
                      <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl border border-white/30 text-white font-black text-sm">
                        {offer.code}
                      </div>
                    )}
                  </div>
                </div>
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${offer.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                  {offer.isActive ? 'Active' : 'Paused'}
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs text-gray-500 font-medium line-clamp-2 mb-4">{offer.subtitle}</p>

                {offer.offerType !== 'banner' ? (
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-1">Redemptions</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-surface">{offer.usageCount || 0}</span>
                        <span className="text-[9px] text-gray-400">/ {offer.usageLimit}</span>
                      </div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-accent transition-all duration-1000"
                          style={{ width: `${Math.min(100, ((offer.usageCount || 0) / offer.usageLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-1">Min. Booking</p>
                      <span className="text-sm font-black text-surface">₹{offer.minBookingAmount}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 mb-5">
                     <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon size={12} /> Informational Banner
                     </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(offer)}
                    className="flex-1 bg-surface text-white py-2.5 rounded-xl text-xs font-bold hover:bg-surface/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={14} /> Edit Offer
                  </button>
                  <button
                    onClick={() => handleDelete(offer._id)}
                    className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Offer Detail</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usage</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {offers.map(offer => (
                <tr key={offer._id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={offer.image} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface">{offer.title}</p>
                        <p className="text-[10px] text-gray-400 font-medium line-clamp-1">{offer.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {offer.offerType === 'coupon' ? (
                      <span className="bg-surface text-white px-2 py-1 rounded text-[10px] font-black tracking-widest">
                        {offer.code}
                      </span>
                    ) : (
                      <span className="text-gray-300 font-bold text-xs uppercase tracking-widest">Banner</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-surface">
                      {offer.offerType === 'coupon' ? (
                        `${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' FLAT'}`
                      ) : (
                        '-'
                      )}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    {offer.offerType === 'coupon' ? (
                      <div className="flex flex-col gap-1 w-24">
                        <div className="flex justify-between text-[9px] font-bold text-gray-400">
                          <span>{offer.usageCount || 0}</span>
                          <span>{offer.usageLimit}</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-accent" style={{ width: `${(offer.usageCount / offer.usageLimit) * 100}%` }} />
                        </div>
                      </div>
                    ) : (
                       <span className="text-gray-300">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black uppercase ${offer.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      <div className={`w-1 h-1 rounded-full ${offer.isActive ? 'bg-green-600 animate-pulse' : 'bg-red-600'}`} />
                      {offer.isActive ? 'Active' : 'Paused'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(offer)} className="p-2 text-surface hover:bg-gray-100 rounded-lg transition-all"><Edit3 size={16} /></button>
                      <button onClick={() => handleDelete(offer._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-surface/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-surface">{isEditing ? 'Edit Offer' : 'Create New Offer'}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{isEditing ? 'Update Promotion Details' : 'Promotion Details'}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                  }}
                  className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all"
                >
                  <Trash2 size={20} className="text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 overflow-y-auto">
                <div className="space-y-6">
                  {/* Type Selector */}
                  <div className="bg-gray-50 p-1.5 rounded-2xl border border-gray-100 flex shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, offerType: 'coupon' })}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.offerType === 'coupon' ? 'bg-white text-accent shadow-md' : 'text-gray-400 hover:text-accent'}`}
                    >
                      <TicketPercent size={14} className="inline mr-2" />
                      Promotion Coupon
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, offerType: 'banner' })}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.offerType === 'banner' ? 'bg-white text-accent shadow-md' : 'text-gray-400 hover:text-accent'}`}
                    >
                      <ImageIcon size={14} className="inline mr-2" />
                      Informational Banner
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="group">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                          {formData.offerType === 'coupon' ? 'Offer Title' : 'Banner Title'}
                        </label>
                        <input
                          required
                          type="text"
                          placeholder={formData.offerType === 'coupon' ? 'e.g. Welcome Special' : 'e.g. Summer Vibes'}
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>

                      {formData.offerType === 'coupon' && (
                        <>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Offer Code</label>
                            <input
                              required
                              type="text"
                              placeholder="e.g. WELCOME100"
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-black text-surface tracking-widest transition-all outline-none uppercase"
                              value={formData.code}
                              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Type</label>
                              <select
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-surface transition-all outline-none"
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                              >
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat Cash (₹)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Value</label>
                              <input
                                required
                                type="number"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                              />
                            </div>
                          </div>
                          {formData.discountType === 'percentage' && (
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Max Discount Cap (₹)</label>
                              <input
                                type="number"
                                placeholder="Leave empty for no limit"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                                value={formData.maxDiscount}
                                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                              />
                            </div>
                          )}
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Start Date</label>
                          <input
                            required
                            type="date"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">End Date</label>
                          <input
                            required
                            type="date"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {formData.offerType === 'coupon' && (
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Subtitle / Short Description</label>
                          <textarea
                            required
                            rows="1"
                            placeholder="Flat ₹100 Off on your first stay"
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none resize-none"
                            value={formData.subtitle}
                            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                          {formData.offerType === 'coupon' ? 'Detailed Terms/Description' : 'Detailed Info / Description'}
                        </label>
                        <textarea
                          rows="2"
                          placeholder="Enter full details..."
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none resize-none"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>

                      {formData.offerType === 'coupon' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Min. Booking (₹)</label>
                              <input
                                type="number"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                                value={formData.minBookingAmount}
                                onChange={(e) => setFormData({ ...formData, minBookingAmount: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Overall Usage Limit</label>
                              <input
                                type="number"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                                value={formData.usageLimit}
                                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Limit Per User</label>
                            <input
                              type="number"
                              placeholder="e.g. 1"
                              className="w-full bg-gray-50 border-2 border-transparent focus:border-accent focus:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all outline-none"
                              value={formData.userLimit}
                              onChange={(e) => setFormData({ ...formData, userLimit: e.target.value })}
                            />
                          </div>
                        </>
                      )}

                      <div className="flex flex-col">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Status</label>
                        <div
                          onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                          className={`w-full cursor-pointer h-[48px] rounded-2xl flex items-center px-5 transition-all border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${formData.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                          <span className="text-sm font-bold uppercase tracking-widest">{formData.isActive ? 'Active' : 'Paused'}</span>
                        </div>
                      </div>

                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">
                        {formData.offerType === 'coupon' ? 'Offer Image' : 'Banner Image'}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-accent transition-colors">
                          {imagePreview || formData.image ? (
                            <img src={imagePreview || formData.image} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="text-gray-300" size={24} />
                          )}
                        </div>
                        <div className="flex-1">
                          <label className="cursor-pointer bg-gray-50 border-2 border-transparent hover:border-accent hover:bg-white rounded-2xl px-5 py-3 text-sm font-bold text-surface transition-all flex items-center justify-center gap-2">
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                            <Sparkles size={16} className="text-accent" />
                            {imageFile ? imageFile.name : 'Upload Image'}
                          </label>
                          <p className="text-[9px] text-gray-400 mt-2 ml-1">PNG, JPG or WEBP (Max 5MB)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-surface text-white py-4 rounded-[20px] font-black text-sm uppercase tracking-widest mt-8 shadow-2xl shadow-surface/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  {isEditing ? 'Update Offer' : 'Launch Offer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOffers;
