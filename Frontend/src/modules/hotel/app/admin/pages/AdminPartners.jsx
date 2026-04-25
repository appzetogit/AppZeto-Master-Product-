import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Filter, MoreVertical, Ban, CheckCircle,
    Mail, Phone, Shield, Trash2, Unlock, Eye,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const StatusBadge = ({ label, type }) => {
    const map = {
        blocked: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Ban },
        active: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Shield },
        approved: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
        rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: Ban },
    };
    const Icon = map[type]?.icon || CheckCircle;
    const cls = map[type] || map.active;
    return (
        <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls.bg} ${cls.text} ${cls.border}`}>
            <Icon size={10} className="mr-1" />
            {label}
        </span>
    );
};

const AdminPartners = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [limit] = useState(10);

    // Force role to 'partner'
    const [filters, setFilters] = useState({
        search: '',
        role: 'partner',
        status: '',
        approvalStatus: ''
    });

    const [activeDropdown, setActiveDropdown] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchUsers = useCallback(async (page, currentFilters) => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;

        try {
            setLoading(true);
            const params = {
                page,
                limit,
                search: currentFilters.search,
                status: currentFilters.status,
                approvalStatus: currentFilters.approvalStatus
            };
            const data = await adminService.getPartners(params);
            if (data.success) {
                setUsers(data.partners);
                setTotalUsers(data.total);
                setTotalPages(Math.ceil(data.total / limit));
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error('Error fetching partners:', error);
                toast.error('Failed to load partners');
            }
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchUsers(currentPage, filters);
        }, 300); // 300ms debounce for search
        return () => clearTimeout(timer);
    }, [currentPage, filters, fetchUsers]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleUpdateStatus = async (userId, isBlocked) => {
        try {
            const res = await adminService.updatePartnerStatus(userId, isBlocked);
            if (res.success) {
                toast.success(`Partner ${isBlocked ? 'blocked' : 'unblocked'} successfully`);
                fetchUsers(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update partner status');
        }
    };

    const handleApproval = async (userId, status) => {
        try {
            const res = await adminService.updatePartnerApproval(userId, status);
            if (res.success) {
                toast.success(`Partner ${status}`);
                fetchUsers(currentPage, filters);
            }
        } catch {
            toast.error('Failed to update approval status');
        }
    };

    const handleAction = (action, user) => {
        setActiveDropdown(null);
        if (action === 'block') {
            setModalConfig({
                isOpen: true,
                title: 'Block Partner?',
                message: `Are you sure you want to block ${user.name}? They will not be able to login or manage properties.`,
                type: 'danger',
                confirmText: 'Block Partner',
                onConfirm: () => handleUpdateStatus(user._id, true)
            });
        } else if (action === 'unblock') {
            setModalConfig({
                isOpen: true,
                title: 'Unblock Partner?',
                message: `Are you sure you want to unblock ${user.name}?`,
                type: 'success',
                confirmText: 'Unblock Partner',
                onConfirm: () => handleUpdateStatus(user._id, false)
            });
        } else if (action === 'approve') {
            setModalConfig({
                isOpen: true,
                title: 'Approve Partner?',
                message: `Approve ${user.name} to access partner app.`,
                type: 'success',
                confirmText: 'Approve',
                onConfirm: () => handleApproval(user._id, 'approved')
            });
        } else if (action === 'reject') {
            setModalConfig({
                isOpen: true,
                title: 'Reject Partner?',
                message: `Reject ${user.name} partner access.`,
                type: 'danger',
                confirmText: 'Reject',
                onConfirm: () => handleApproval(user._id, 'rejected')
            });
        } else if (action === 'delete') {
            setModalConfig({
                isOpen: true,
                title: 'Delete Partner?',
                message: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
                type: 'danger',
                confirmText: 'Delete Partner',
                onConfirm: async () => {
                    try {
                        const res = await adminService.deletePartner(user._id);
                        if (res.success) {
                            toast.success('Partner deleted successfully');
                            fetchUsers(currentPage, filters);
                        }
                    } catch {
                        toast.error('Failed to delete partner');
                    }
                }
            });
        }
    };

    const handleExportCSV = () => {
        if (users.length === 0) {
            toast.error('No data to export');
            return;
        }

        const headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Joined Date'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u._id,
                `"${u.name}"`,
                u.email,
                u.phone,
                u.isBlocked ? 'Blocked' : 'Active',
                new Date(u.createdAt).toLocaleDateString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `partners-export-${new Date().toISOString().split('T')[0]}.csv`);
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

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 uppercase">Partner Management ({totalUsers})</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">View, track, and manage property partners.</p>
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

            {/* Filter Bar */}
            <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search via name, email or phone..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Role select removed as this is strictly for Partners */}
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                                <th className="p-4">Partner Details</th>
                                <th className="p-4">Contact Info</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Account Status</th>
                                <th className="p-4">Approval</th>
                                <th className="p-4">Joined Date</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                                    </tr>
                                ))
                            ) : (
                                <AnimatePresence>
                                    {users.length > 0 ? (
                                        users.map((user, index) => (
                                            <motion.tr
                                                key={user._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="hover:bg-gray-50/50 transition-colors group relative font-bold"
                                            >
                                                <td className="p-4">
                                                    <Link to={`/hotel/admin/partners/${user._id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                                        <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-bold uppercase text-xs overflow-hidden">
                                                            {user.profileImage ? (
                                                                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                user.name?.charAt(0) || 'P'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{user.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: {user._id.slice(-6)}</p>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                            <Mail size={12} className="mr-1.5 text-gray-400" />
                                                            {user.email || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                                                            <Phone size={12} className="mr-1.5 text-gray-400" />
                                                            {user.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-[10px] font-bold uppercase py-1 px-2 rounded-md bg-blue-100 text-blue-700 font-bold">
                                                        PARTNER
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge label={user.isBlocked ? 'BLOCKED' : 'ACTIVE'} type={user.isBlocked ? 'blocked' : 'active'} />
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge label={(user.partnerApprovalStatus || 'pending').toUpperCase()} type={user.partnerApprovalStatus || 'pending'} />
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-gray-500 uppercase">
                                                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="p-4 text-center relative">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === user._id ? null : user._id); }}
                                                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-black transition-colors"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    {activeDropdown === user._id && (
                                                        <div className="absolute right-8 top-8 w-40 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 text-left">
                                                            <Link to={`/hotel/admin/partners/${user._id}`} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-[10px] font-bold uppercase text-gray-700">
                                                                <Eye size={14} /> View Details
                                                            </Link>
                                                            {user.partnerApprovalStatus !== 'approved' && (
                                                                <button onClick={() => handleAction('approve', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700">
                                                                    <CheckCircle size={14} /> Approve
                                                                </button>
                                                            )}
                                                            {user.partnerApprovalStatus !== 'rejected' && (
                                                                <button onClick={() => handleAction('reject', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                    <Ban size={14} /> Reject
                                                                </button>
                                                            )}
                                                            {user.isBlocked ? (
                                                                <button onClick={() => handleAction('unblock', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-green-50 text-[10px] font-bold uppercase text-green-700">
                                                                    <Unlock size={14} /> Unblock Partner
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleAction('block', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                    <Ban size={14} /> Block Partner
                                                                </button>
                                                            )}
                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                            <button onClick={() => handleAction('delete', user)} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-[10px] font-bold uppercase text-red-700">
                                                                <Trash2 size={14} /> Delete Partner
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
                                                    <Users size={32} className="text-gray-300" />
                                                    <p className="text-xs font-bold uppercase">No partners found</p>
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

export default AdminPartners;
