import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, Mail, Phone, Calendar, MapPin, Shield, CreditCard,
    History, AlertTriangle, Ban, CheckCircle, Lock, Unlock, Loader2,
    Building, FileText, CheckSquare, XSquare, ArrowDownLeft, ArrowUpRight, Plus, Minus, X
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import walletService from '../../../services/walletService';
import toast from 'react-hot-toast';

const PartnerPropertiesTab = ({ properties }) => (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                <tr>
                    <th className="p-4 font-bold text-gray-600">Property Name</th>
                    <th className="p-4 font-bold text-gray-600">Location</th>
                    <th className="p-4 font-bold text-gray-600">Type</th>
                    <th className="p-4 font-bold text-gray-600">Status</th>
                    <th className="p-4 font-bold text-gray-600 text-right">Added On</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {properties && properties.length > 0 ? (
                    properties.map((property, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                            <td className="p-4 font-bold text-gray-900">
                                <Link to={`/hotel/admin/hotels/${property._id}`} className="hover:text-blue-600 hover:underline">
                                    {property.propertyName}
                                </Link>
                            </td>
                            <td className="p-4 text-xs font-bold text-gray-500 uppercase">{property.address?.city}, {property.address?.state}</td>
                            <td className="p-4 text-xs font-bold text-gray-500 uppercase">{property.propertyType}</td>
                            <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${property.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    property.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {property.status}
                                </span>
                            </td>
                            <td className="p-4 text-right font-bold text-xs uppercase text-gray-400">
                                {new Date(property.createdAt).toLocaleDateString()}
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">No properties listed</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const PartnerDocumentsTab = ({ partner }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 border border-gray-200 rounded-xl">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Identity Proof (Aadhaar)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block">Aadhaar Number</span>
                    <span className="text-sm font-bold text-gray-900">{partner.aadhaarNumber || 'Not provided'}</span>
                </div>
                <div className="flex gap-4">
                    {partner.aadhaarFront ? (
                        <a href={partner.aadhaarFront} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            Front Missing
                        </div>
                    )}
                    {partner.aadhaarBack ? (
                        <a href={partner.aadhaarBack} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            Back Missing
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="bg-white p-6 border border-gray-200 rounded-xl">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                <FileText size={16} /> Tax Proof (PAN)
            </h3>
            <div className="space-y-4">
                <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block">PAN Number</span>
                    <span className="text-sm font-bold text-gray-900">{partner.panNumber || 'Not provided'}</span>
                </div>
                <div>
                    {partner.panCardImage ? (
                        <a href={partner.panCardImage} target="_blank" rel="noopener noreferrer" className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity">
                            <img src={partner.panCardImage} alt="PAN Card" className="w-full h-full object-cover" />
                        </a>
                    ) : (
                        <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
                            PAN Image Missing
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const PartnerTransactionsTab = ({ partnerId }) => {
    const [wallet, setWallet] = useState(null);
    const [stats, setStats] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isAdjusting, setIsAdjusting] = useState(false);
    const [adjConfig, setAdjConfig] = useState({ type: 'credit', amount: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchWalletData = async () => {
        try {
            setLoading(true);
            const [wRes, sRes, tRes] = await Promise.all([
                walletService.getWallet({ ownerId: partnerId, viewAs: 'partner' }),
                walletService.getWalletStats({ ownerId: partnerId, viewAs: 'partner' }),
                walletService.getTransactions({ ownerId: partnerId, viewAs: 'partner', limit: 50 })
            ]);
            if (wRes.success) setWallet(wRes.wallet);
            if (sRes.success) setStats(sRes.stats);
            if (tRes.success) setTransactions(tRes.transactions);
        } catch (error) {
            console.error('Error fetching partner wallet:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
    }, [partnerId]);

    const handleAdjustSubmit = async () => {
        if (!adjConfig.amount || parseFloat(adjConfig.amount) <= 0) return toast.error("Enter valid amount");
        try {
            setSubmitting(true);
            const res = await walletService.adminAdjustWallet({
                targetUserId: partnerId,
                action: adjConfig.type,
                amount: adjConfig.amount,
                reason: adjConfig.reason,
                viewAs: 'partner'
            });
            if (res.success) {
                toast.success(`Wallet ${adjConfig.type}ed successfully`);
                fetchWalletData(); // Refresh data
                setIsAdjusting(false);
                setAdjConfig({ type: 'credit', amount: '', reason: '' });
            }
        } catch (err) {
            toast.error(err.message || "Adjustment failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-300" /></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center md:text-left">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Available Balance</p>
                            <h3 className="text-2xl font-black text-gray-900">₹{wallet?.balance?.toLocaleString() || 0}</h3>
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => { setAdjConfig({ ...adjConfig, type: 'credit' }); setIsAdjusting(true); }}
                                className="flex-1 bg-green-50 text-green-600 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-green-100 transition-colors flex items-center justify-center gap-1"
                            >
                                <Plus size={12} /> Add
                            </button>
                            <button
                                onClick={() => { setAdjConfig({ ...adjConfig, type: 'debit' }); setIsAdjusting(true); }}
                                className="flex-1 bg-red-50 text-red-600 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                            >
                                <Minus size={12} /> Deduct
                            </button>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Earnings</p>
                    <h3 className="text-2xl font-black text-green-600">₹{stats?.totalEarnings?.toLocaleString() || 0}</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tight">+₹{stats?.thisMonthEarnings?.toLocaleString() || 0} this month</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Payouts</p>
                    <h3 className="text-2xl font-black text-orange-600">₹{stats?.totalWithdrawals?.toLocaleString() || 0}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pending Clearance</p>
                    <h3 className="text-2xl font-black text-blue-600">₹{stats?.pendingClearance?.toLocaleString() || 0}</h3>
                </div>
            </div>

            {/* Adjustment Modal */}
            <AnimatePresence>
                {isAdjusting && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                    {adjConfig.type === 'credit' ? 'Credit Partner Wallet' : 'Debit Partner Wallet'}
                                </h3>
                                <button onClick={() => setIsAdjusting(false)} className="text-gray-400 hover:text-black">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={adjConfig.amount}
                                        onChange={(e) => setAdjConfig({ ...adjConfig, amount: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black focus:outline-none focus:border-black transition-colors"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Reason / Note</label>
                                    <textarea
                                        value={adjConfig.reason}
                                        onChange={(e) => setAdjConfig({ ...adjConfig, reason: e.target.value })}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-black transition-colors"
                                        placeholder="e.g., Commission adjustment"
                                        rows={3}
                                    />
                                </div>
                                <button
                                    onClick={handleAdjustSubmit}
                                    disabled={submitting}
                                    className={`w-full py-4 rounded-xl text-white font-black uppercase text-sm shadow-lg transition-all active:scale-95 ${adjConfig.type === 'credit' ? 'bg-green-600 shadow-green-100' : 'bg-red-600 shadow-red-100'
                                        }`}
                                >
                                    {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : `Confirm ${adjConfig.type === 'credit' ? 'Credit' : 'Debit'}`}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</h3>
                <div className="space-y-3">
                    {transactions && transactions.length > 0 ? (
                        transactions.map((txn, i) => {
                            const isAdminAdj = txn.category === 'admin_adjustment';
                            const isDebit = txn.type === 'debit';
                            const isBooking = txn.category?.includes('booking');

                            return (
                                <div key={i} className={`flex items-center justify-between p-4 border rounded-2xl hover:bg-gray-50 transition-colors bg-white ${isAdminAdj ? 'border-purple-100 bg-purple-50/10' : 'border-gray-100'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${isAdminAdj ? 'bg-purple-100 text-purple-600' :
                                            isBooking ? 'bg-orange-50 text-orange-500' :
                                                !isDebit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                                            }`}>
                                            {isAdminAdj ? <Shield size={20} /> :
                                                isBooking ? <Calendar size={20} /> :
                                                    !isDebit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate pr-2">{txn.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                    {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })} • {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                                {isAdminAdj && <span className="text-[8px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase">Admin</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-lg font-black tracking-tight ${!isDebit ? 'text-green-600' : 'text-gray-900'}`}>
                                            {!isDebit ? '+' : '-'}₹{txn.amount?.toLocaleString()}
                                        </p>
                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${txn.status === 'completed' || txn.status === 'success' ? 'bg-green-50 text-green-600' :
                                            txn.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'
                                            }`}>
                                            {txn.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
                            <CreditCard size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-xs font-bold uppercase text-gray-400">No transactions history</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminPartnerDetail = () => {
    const { id } = useParams();
    const [partner, setPartner] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('properties');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });

    const fetchPartnerDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getPartnerDetails(id);
            if (data.success) {
                setPartner(data.partner);
                setProperties(data.properties);
            }
        } catch (error) {
            console.error('Error fetching partner details:', error);
            toast.error('Failed to load partner information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPartnerDetails();
    }, [id]);

    const handleBlockToggle = async () => {
        const isBlocked = partner.isBlocked;
        setModalConfig({
            isOpen: true,
            title: isBlocked ? 'Unblock Partner?' : 'Block Partner?',
            message: isBlocked
                ? `Partner ${partner.name} will regain access to their dashboard.`
                : `Blocking ${partner.name} will prevent them from managing properties.`,
            type: isBlocked ? 'success' : 'danger',
            confirmText: isBlocked ? 'Unblock' : 'Block',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerStatus(partner._id, !isBlocked);
                    if (res.success) {
                        toast.success(`Partner ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error('Failed to update partner status');
                }
            }
        });
    };

    const handleApproval = async (status) => {
        setModalConfig({
            isOpen: true,
            title: `${status === 'approved' ? 'Approve' : 'Reject'} Partner?`,
            message: `Are you sure you want to ${status} ${partner.name}?`,
            type: status === 'approved' ? 'success' : 'danger',
            confirmText: status === 'approved' ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    const res = await adminService.updatePartnerApproval(partner._id, status);
                    if (res.success) {
                        toast.success(`Partner ${status} successfully`);
                        fetchPartnerDetails();
                    }
                } catch {
                    toast.error(`Failed to ${status} partner`);
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-gray-400" size={48} />
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading partner profile...</p>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="text-center py-20">
                <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900">Partner Not Found</h2>
                <p className="text-gray-500 mt-2">The partner you're looking for doesn't exist or has been deleted.</p>
                <Link to="/hotel/admin/partners" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Partners</Link>
            </div>
        );
    }

    const tabs = [
        { id: 'properties', label: 'Properties', icon: Building },
        { id: 'transactions', label: 'Transactions', icon: CreditCard },
        { id: 'documents', label: 'Documents', icon: FileText },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to="/hotel/admin/partners" className="hover:text-black transition-colors">Partners</Link>
                <span>/</span>
                <span className="text-black">{partner.name}</span>
            </div>

            <div className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${partner.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
                    <div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg relative uppercase">
                        {partner.profileImage ? (
                            <img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            partner.name.charAt(0)
                        )}
                        {partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                                <Ban size={16} />
                            </div>
                        )}
                        {partner.partnerApprovalStatus === 'approved' && !partner.isBlocked && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                                <CheckCircle size={16} />
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID: #{partner._id.slice(-6)}</p>
                        <div className="flex flex-col gap-1 mt-2">
                            {partner.isBlocked && <span className="text-xs font-bold text-red-600 uppercase">ACCOUNT BLOCKED</span>}
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded w-fit mx-auto md:mx-0 ${partner.partnerApprovalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                                partner.partnerApprovalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                }`}>
                                {partner.partnerApprovalStatus}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <Phone size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.phone}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <User size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">{partner.ownerName || 'Owner Name N/A'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <MapPin size={16} className="text-gray-400" />
                            <span className="text-gray-900 font-bold">
                                {[partner.address?.city, partner.address?.state, partner.address?.country].filter(Boolean).join(', ') || 'Address N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="p-3 bg-white/50 rounded-lg border border-gray-200/50 flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Total Properties</span>
                            <span className="text-lg font-bold text-gray-900">{properties.length}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 min-w-[160px]">
                    <button
                        onClick={handleBlockToggle}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase transition-colors ${partner.isBlocked
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {partner.isBlocked ? <Unlock size={16} /> : <Ban size={16} />}
                        {partner.isBlocked ? 'Unblock' : 'Block'}
                    </button>

                    {partner.partnerApprovalStatus === 'pending' && (
                        <>
                            <button
                                onClick={() => handleApproval('approved')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                                <CheckSquare size={16} /> Approve
                            </button>
                            <button
                                onClick={() => handleApproval('rejected')}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                                <XSquare size={16} /> Reject
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div>
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTabBadgePartner"
                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                                />
                            )}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                    >
                        {activeTab === 'properties' && <PartnerPropertiesTab properties={properties} />}
                        {activeTab === 'transactions' && <PartnerTransactionsTab partnerId={id} />}
                        {activeTab === 'documents' && <PartnerDocumentsTab partner={partner} />}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminPartnerDetail;