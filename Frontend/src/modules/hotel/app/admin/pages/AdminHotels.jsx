import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Building2, Search, MoreVertical, MapPin,
    CheckCircle, XCircle, Clock, ShieldAlert, Trash2, Eye,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const HotelStatusBadge = ({ status }) => {
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

const AdminHotels = () => {
    const [hotels, setHotels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalHotels, setTotalHotels] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    const [filters, setFilters] = useState({
        search: '',
        status: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchHotels = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status
            };
            const data = await adminService.getHotels(params);
            if (data.success) {
                setHotels(data.hotels);
                setTotalHotels(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching hotels:', error);
                toast.error('Failed to load hotels');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHotels(currentPage, filters);
        }, 300);
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchHotels]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const handleAction = (action, hotel) => {
        setActiveDropdown(null);
        if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            setModalConfig({
                isOpen: true,
                title: `${action.charAt(0).toUpperCase() + action.slice(1)} Hotel?`,
                message: `Are you sure you want to ${action} "${hotel.name}"?`,
                type: action === 'approve' ? 'success' : 'warning',
                confirmText: action.charAt(0).toUpperCase() + action.slice(1),
                onConfirm: async () => {
                    try {
                        const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                        if (res.success) {
                            toast.success(`Hotel ${action}ed successfully`);
                            fetchHotels(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to update status');
                    }
                }
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Hotel?',
                message: `Are you sure you want to delete "${hotel.name}"? This action cannot be undone and all data related to this hotel (including bookings) will be affected.`,
                type: 'danger',
                confirmText: 'Delete Hotel',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deleteHotel(hotel._id);
                        if (res.success) {
                            toast.success('Hotel deleted successfully');
                            fetchHotels(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete hotel');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (hotels.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Hotel Name', 'Owner', 'Status', 'City', 'Price'];
        const csvContent = [
            headers.join(','),
            ...hotels.map(h => [
                h._id,
                `"${h.name}"`,
                `"${h.ownerId?.name}"`,
                h.status,
                `"${h.address?.city}"`,
                h.price
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `hotels-export-${new Date().toISOString().split('T')[0]}.csv`);
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
                    <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">Hotel Partners ({totalHotels})</h2>
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
                        placeholder="Search hotels by name or city..."
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
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Hotel Name</th>
                                <th className="p-4">Owner</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Rooms</th>
                                <th className="p-4">Pricing</th>
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
                                    {hotels.length > 0 ? (
                                        hotels.map((hotel, index) => (
                                            <motion.tr
                                                key={hotel._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/hotels/${hotel._id}`} className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{hotel.name || 'Untitled'}</p>
                                                            <div className="flex items-center text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-tighter">
                                                                <MapPin size={10} className="mr-1" />
                                                                {hotel.address?.city || 'No Address'}, {hotel.address?.state || ''}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[10px] text-gray-700 font-bold uppercase">{hotel.ownerId?.name || 'Unknown Partner'}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-tighter">ID: {hotel._id.slice(-6)}</p>
                                                </td>
                                                <td className="p-4">
                                                    <HotelStatusBadge status={hotel.status} />
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-[10px] text-gray-700 font-bold uppercase">{hotel.rooms?.length || 0} Categories</p>
                                                </td>
                                                <td className="p-4">
                                                    <p className="text-sm font-bold text-gray-900 uppercase">₹{hotel.price?.toLocaleString() || 0}<span className="text-[10px] text-gray-400 font-bold ml-1">/NIGHT</span></p>
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === hotel._id ? null : hotel._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === hotel._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/hotels/${hotel._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Details
                                                            </Link>
                                                            {hotel.status === 'pending' && (
                                                                <>
                                                                    <button onClick={() => handleAction('approve', hotel)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700">
                                                                        <CheckCircle size={14} /> Approve
                                                                    </button>
                                                                    <button onClick={() => handleAction('reject', hotel)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                        <XCircle size={14} /> Reject
                                                                    </button>
                                                                </>
                                                            )}
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button
                                                                onClick={() => handleAction('delete', hotel)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-600"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                No hotels found matching criteria
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {!loading && hotels.length > 0 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">
                            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalHotels)} of {totalHotels} properties
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`w-10 h-10 rounded-lg text-[10px] font-bold uppercase transition-all ${currentPage === i + 1 ? 'bg-black text-white shadow-md' : 'hover:bg-gray-100 text-gray-600 border border-transparent hover:border-gray-200'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-black disabled:opacity-50 transition-colors"
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

export default AdminHotels;
