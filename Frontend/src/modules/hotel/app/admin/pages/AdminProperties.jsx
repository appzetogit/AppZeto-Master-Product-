import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Building2, Search, Filter, MoreVertical, MapPin,
    CheckCircle, XCircle, Clock, Star, ShieldAlert, Trash2, Edit, Eye, Loader2,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const PropertyStatusBadge = ({ status }) => {
    const styles = {
        approved: 'bg-green-100 text-green-700 border-green-200 font-bold',
        pending: 'bg-amber-100 text-amber-700 border-amber-200 font-bold',
        rejected: 'bg-red-100 text-red-700 border-red-200 font-bold',
        suspended: 'bg-gray-100 text-gray-700 border-gray-200 font-bold',
        draft: 'bg-gray-100 text-gray-500 border-gray-200 font-bold',
    };

    const icons = {
        approved: <CheckCircle size={10} className="mr-1" />,
        pending: <Clock size={10} className="mr-1" />,
        rejected: <XCircle size={10} className="mr-1" />,
        suspended: <ShieldAlert size={10} className="mr-1" />,
        draft: <Clock size={10} className="mr-1" />,
    };

    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold border ${styles[status] || styles.pending}`}>
            {icons[status] || icons.pending}
            {status}
        </span>
    );
};

const VerifiedBadge = () => (
    <span className="flex items-center w-fit px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[9px] font-black uppercase tracking-tight shadow-sm">
        <CheckCircle size={10} className="mr-1 fill-blue-500 text-white" />
        Verified
    </span>
);

const AdminProperties = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalProperties, setTotalProperties] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: '',
        type: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchProperties = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                type: currentFilters.type || undefined
            };
            const data = await adminService.getHotels(params);
            if (data.success) {
                setProperties(data.hotels || []);
                setTotalProperties(data.total || 0);
                setTotalPages(Math.ceil((data.total || 0) / limit));
            } else {
                setProperties([]);
                setTotalProperties(0);
                setTotalPages(0);
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching properties:', error);
                toast.error('Failed to load properties');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProperties(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchProperties]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleAction = async (action, property) => {
        setActiveDropdown(null);
        if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            setModalConfig({
                isOpen: true,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Property?`,
                message: `Are you sure you want to ${action} "${property.propertyName}"?`,
                type: action === 'approve' ? 'success' : 'warning',
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(property._id, newStatus);
                        if (res.success) {
                            toast.success(`Property ${action}ed successfully`);
                            fetchProperties(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to update status');
                    }
                }
            });
        } else if (action === 'toggleVerify') {
            const isVerifying = !property.isVerified;
            setModalConfig({
                isOpen: true,
                title: isVerifying ? 'Verify Property?' : 'Remove Verification?',
                message: isVerifying 
                    ? `Are you sure you want to verify "${property.propertyName}"? This will place it at the top of search results.`
                    : `Are you sure you want to remove verification from "${property.propertyName}"?`,
                type: 'warning',
                confirmText: isVerifying ? 'Verify Property' : 'Unverify Property',
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(property._id, { isVerified: isVerifying });
                        if (res.success) {
                            toast.success(`Property ${isVerifying ? 'verified' : 'unverified'} successfully`);
                            fetchProperties(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to update verification');
                    }
                }
            });
        } else if (action === 'setUrgency') {
            const message = window.prompt(`Enter urgency message for "${property.propertyName}" (e.g., 🔥 Only 2 rooms left!):`, property.customUrgencyMessage || '');
            if (message !== null) {
                try {
                    const res = await adminService.updateHotelStatus(property._id, { customUrgencyMessage: message });
                    if (res.success) {
                        toast.success('Urgency message updated');
                        fetchProperties(currentPage, filters);
                    }
                } catch {
                    toast.error('Failed to update urgency message');
                }
            }
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Property?',
                message: `Are you sure you want to delete "${property.propertyName}"? This action cannot be undone and all data related to this property (including bookings) will be affected.`,
                type: 'danger',
                confirmText: 'Delete Property',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteHotel(property._id);
                        if (res.success) {
                            toast.success('Property deleted successfully');
                            fetchProperties(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete property');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (properties.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Property Name', 'Type', 'Owner', 'Status', 'Suitability', 'City'];
        const csvContent = [
            headers.join(','),
            ...properties.map(h => [
                h._id,
                `"${h.propertyName}"`,
                `"${h.propertyType}"`,
                `"${h.partnerId?.name || ''}"`,
                h.status,
                `"${h.suitability || 'none'}"`,
                `"${h.address?.city || ''}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `properties-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV exported successfully');
    };

    return (
        <div className="space-y-6 relative" onClick={() => setActiveDropdown(null)}>
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Property Management ({totalProperties})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">Manage listings, approvals, and quality control.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search properties by name or city..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Types</option>
                        <option value="hotel">Hotel</option>
                        <option value="villa">Villa</option>
                        <option value="hostel">Hostel</option>
                        <option value="pg">PG</option>
                        <option value="resort">Resort</option>
                        <option value="homestay">Homestay</option>
                    </select>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Property Name</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Owner & Wallet</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Suitability</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 uppercase tracking-tight font-bold">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {properties.length > 0 ? (
                                        properties.map((property, index) => (
                                            <motion.tr
                                                key={property._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/properties/${property._id}`} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{property.propertyName || 'Untitled'}</p>
                                                                {property.avgRating > 0 && (
                                                                    <span className="flex items-center bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded text-[9px] font-black border border-yellow-100">
                                                                        <Star size={8} className="fill-yellow-500 text-yellow-500 mr-0.5" />
                                                                        {property.avgRating?.toFixed(1)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">
                                                                <MapPin size={10} className="mr-1" />
                                                                {property.address?.city || 'No Address'}, {property.address?.state || ''}
                                                            </div>
                                                            {property.isVerified && <div className="mt-1"><VerifiedBadge /></div>}
                                                            {property.customUrgencyMessage && (
                                                                <div className="mt-1 flex items-center gap-1 text-[8px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100 uppercase font-black tracking-tight w-fit">
                                                                    🔥 {property.customUrgencyMessage}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[10px] text-gray-700 font-bold uppercase">{property.propertyType || 'N/A'}</p>
                                                </td>
                                                <td className="p-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] text-gray-900 font-black uppercase tracking-tight">{property.partnerId?.name || 'Unknown Partner'}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold tracking-tighter transition-all group-hover:text-blue-600">{property.partnerId?.phone || 'No Phone'}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-green-50 text-green-700 w-fit px-2 py-0.5 rounded-md border border-green-100 shadow-sm">
                                                            <span className="text-[8px] font-black uppercase opacity-60">Wallet:</span>
                                                            <span className="text-[10px] font-black tracking-tight">₹{property.partnerWalletBalance?.toLocaleString() || 0}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <PropertyStatusBadge status={property.status} />
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[10px] text-gray-700 font-bold uppercase">{property.suitability || 'none'}</p>
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === property._id ? null : property._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === property._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/properties/${property._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Details
                                                            </Link>
                                                            {property.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleAction('approve', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700">
                                                                        <CheckCircle size={14} /> Approve
                                                                    </button>
                                                                    <button onClick={() => handleAction('reject', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                        <XCircle size={14} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button onClick={() => handleAction('toggleVerify', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-blue-50 text-[10px] font-bold uppercase text-blue-700">
                                                                <CheckCircle size={14} /> {property.isVerified ? 'Unverify Property' : 'Verify Property'}
                                                            </button>
                                                            <button onClick={() => handleAction('setUrgency', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-orange-50 text-[10px] font-bold uppercase text-orange-700">
                                                                <Star size={14} /> Set Urgency
                                                            </button>
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', property)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                <Trash2 size={14} /> Delete Property
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Building2 size={32} className="text-gray-300" />
                                                    <p className="text-xs font-bold uppercase">No properties found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminProperties;
