import React, { useState, useEffect } from 'react';
import {
    Calendar, User, Users, MapPin, CreditCard, Clock,
    CheckCircle, XCircle, AlertTriangle, FileText,
    Download, ShieldCheck, Phone, Mail, Loader2, Tag
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminBookingDetail = () => {
    const { id } = useParams();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelReason, setCancelReason] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', confirmText: 'Confirm', onConfirm: () => {}, extraContent: null });

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const data = await adminService.getBookingDetails(id);
            if (data.success) {
                setBooking(data.booking);
            }
        } catch (error) {
            console.error('Error fetching booking details:', error);
            toast.error('Failed to load booking information');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookingDetails();
    }, [id]);

    // Status Colors
    const handleDownloadReceipt = async () => {
        try {
            const data = await adminService.downloadReceipt(id);
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `receipt-${booking?.bookingId || id}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            toast.success('Receipt downloaded successfully');
        } catch (error) {
            console.error('Download Receipt Error:', error);
            toast.error('Failed to download receipt');
        }
    };

    // Status Colors
    const getStatusColor = (s) => {
        if (s === 'confirmed') return 'text-green-600 bg-green-50 border-green-200 font-bold';
        if (s === 'cancelled') return 'text-red-600 bg-red-50 border-red-200 font-bold';
        if (s === 'completed') return 'text-blue-600 bg-blue-50 border-blue-200 font-bold';
        return 'text-amber-600 bg-amber-50 border-amber-200 font-bold';
    };

    const handleCancel = () => {
        setCancelReason('');
        setModalConfig({
            isOpen: true,
            title: 'Cancel Booking?',
            message: `Are you sure you want to cancel booking #${booking.bookingId}? This will trigger any applicable refund processes.`,
            type: 'danger',
            confirmText: 'Yes, Cancel Booking',
            extraContent: (
                <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-tight">Reason for cancellation (optional)</label>
                    <textarea
                        className="w-full min-h-[72px] px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="e.g. Guest request, property unavailable..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                    />
                </div>
            ),
            onConfirm: async () => {
                try {
                    const res = await adminService.updateBookingStatus(booking._id, 'cancelled', cancelReason);
                    if (res.success) {
                        let msg = 'Booking cancelled successfully.';
                        if (res.walletStatus) {
                            const ws = res.walletStatus;
                            if (ws.userRefunded != null) msg += ` User refunded: ₹${Number(ws.userRefunded).toLocaleString()}.`;
                            if (ws.partnerDeducted != null && ws.partnerDeducted > 0) msg += ` Partner wallet deducted: ₹${Number(ws.partnerDeducted).toLocaleString()}.`;
                            if (ws.partnerRefunded != null) msg += ` Partner commission refunded: ₹${Number(ws.partnerRefunded).toLocaleString()}.`;
                        }
                        toast.success(msg);
                        setCancelReason('');
                        fetchBookingDetails();
                    }
                } catch (err) {
                    const apiMsg = err?.response?.data?.message;
                    toast.error(apiMsg || 'Failed to cancel booking');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-gray-400" size={48} />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading booking details...</p>
        </div>
    );

    if (!booking) return (
        <div className="text-center py-20">
            <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Booking Not Found</h2>
            <Link to="/hotel/admin/bookings" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Bookings</Link>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            {/* Nav */}
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to="/hotel/admin/bookings" className="hover:text-black transition-colors">Bookings</Link>
                <span>/</span>
                <span className="text-black">#{booking.bookingId || booking._id.slice(-6)}</span>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-gray-900 uppercase">Booking #{booking.bookingId || booking._id.slice(-6)}</h1>
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border uppercase ${getStatusColor(booking.bookingStatus || booking.status)} flex items-center gap-1`}>
                            {(booking.bookingStatus || booking.status) === 'confirmed' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {booking.bookingStatus || booking.status}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold uppercase text-gray-400 tracking-tight">Booked on {new Date(booking.createdAt).toLocaleDateString()} • {new Date(booking.createdAt).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDownloadReceipt}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-50 transition-colors">
                        <Download size={14} /> Download Receipt
                    </button>
                    {['confirmed', 'pending', 'awaiting_payment'].includes(booking.bookingStatus || booking.status) && (
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100 transition-colors"
                        >
                            Cancel Booking
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col: Main Details */}
                <div className="md:col-span-2 space-y-6">
                    {/* Stay Details */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <Calendar size={14} /> Stay Details
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-in</p>
                                <p className="text-lg font-bold text-gray-900">{new Date(booking.checkInDate || booking.checkIn).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">After 12:00 PM</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Check-out</p>
                                <p className="text-lg font-bold text-gray-900">{new Date(booking.checkOutDate || booking.checkOut).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase">Before 11:00 AM</p>
                            </div>
                            <div className="col-span-2 pt-4 border-t border-gray-100">
                                <p className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-tight">Hotel: {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Property'}</p>
                                <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase">
                                    <MapPin size={12} /> {booking.propertyId?.address?.fullAddress || `${booking.propertyId?.address?.city}, ${booking.propertyId?.address?.state}`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Guest Details */}
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <User size={14} /> Guest Information
                        </div>
                        <div className="p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold uppercase">
                                {booking.userId?.name?.charAt(0) || 'G'}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{booking.userId?.name || 'Guest User'}</h4>
                                <div className="flex flex-col gap-1 mt-1 font-bold uppercase text-[10px]">
                                    <p className="text-gray-400 flex items-center gap-2">
                                        <Mail size={12} /> {booking.userId?.email || 'No email provided'}
                                    </p>
                                    <p className="text-gray-400 flex items-center gap-2">
                                        <Phone size={12} /> {booking.userId?.phone || 'N/A'}
                                    </p>
                                    <p className="text-gray-400 flex items-center gap-2">
                                        <Users size={12} /> {booking.guests?.adults || 1} Adults, {booking.guests?.children || 0} Children
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col: Payment */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 font-bold uppercase text-gray-500 text-[10px] flex items-center gap-2">
                            <CreditCard size={14} /> Payment Summary
                        </div>
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-400">Total Calculation</span>
                                <span className="text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                            </div>

                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-400">Taxes & Fees</span>
                                <span className="text-gray-900">Included</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className="text-gray-400">Payment Method</span>
                                <span className="text-gray-900">{booking.paymentMethod?.replace(/_/g, ' ') || 'N/A'}</span>
                            </div>

                            {booking.paymentMethod === 'pay_at_hotel' && (
                                <div className="flex justify-between text-xs font-bold uppercase">
                                    <span className="text-gray-400">Platform Commission</span>
                                    <span className="text-amber-600">₹{((booking.adminCommission || 0) + (booking.taxes || 0)).toLocaleString()}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-xs font-bold uppercase">
                                <span className={booking.paymentStatus === 'paid' ? 'text-emerald-600' : booking.paymentStatus === 'refunded' ? 'text-gray-500' : booking.paymentStatus === 'partial' ? 'text-orange-600' : 'text-amber-600'}>
                                    Payment Status
                                </span>
                                <span className={booking.paymentStatus === 'paid' ? 'text-emerald-700' : booking.paymentStatus === 'refunded' ? 'text-gray-600' : booking.paymentStatus === 'partial' ? 'text-orange-700' : 'text-amber-700'}>
                                    {booking.paymentStatus === 'partial' ? 'PARTIAL (PREPAID)' : (booking.paymentStatus?.toUpperCase() || 'PENDING')}
                                </span>
                            </div>

                            {booking.couponCode && (
                                <div className="flex items-center justify-between p-2.5 bg-green-50 rounded-xl border border-green-100 mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                                            <Tag size={14} />
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-green-600 uppercase leading-none mb-0.5">Applied Coupon</p>
                                            <p className="text-[11px] font-extrabold text-green-700 uppercase leading-none">{booking.couponCode}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-bold text-green-600 uppercase leading-none mb-0.5">Discount</p>
                                        <p className="text-[11px] font-extrabold text-green-700 leading-none">-₹{booking.discount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {booking.paymentMethod === 'prepaid' && (
                                <>
                                    <div className="flex justify-between text-xs font-bold uppercase mt-2 pt-2 border-t border-gray-50">
                                        <span className="text-gray-500">Advance Paid (30%)</span>
                                        <span className="text-green-600 font-extrabold">₹{booking.amountPaid?.toLocaleString() || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold uppercase pb-2">
                                        <span className="text-gray-500">Pending Balance (Hotel)</span>
                                        <span className="text-orange-600 font-extrabold">₹{booking.remainingAmount?.toLocaleString() || 0}</span>
                                    </div>
                                </>
                            )}
                            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-gray-900 uppercase text-xs">Total Amount</span>
                                <span className="text-xl font-bold text-gray-900">₹{booking.totalAmount?.toLocaleString()}</span>
                            </div>
                            <div className="pt-2">
                                {booking.paymentStatus === 'paid' ? (
                                    <span className="flex items-center justify-center w-full py-1.5 bg-green-50 text-green-700 text-[10px] font-bold rounded border border-green-100 uppercase">
                                        <ShieldCheck size={12} className="mr-1" /> Payment Verified
                                    </span>
                                ) : booking.paymentStatus === 'refunded' ? (
                                    <span className="flex items-center justify-center w-full py-1.5 bg-gray-50 text-gray-700 text-[10px] font-bold rounded border border-gray-100 uppercase">
                                        <ArrowRight size={12} className="mr-1" /> Amount Refunded
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center w-full py-1.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded border border-amber-100 uppercase">
                                        <Clock size={12} className="mr-1" /> Awaiting Payment
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-900 text-[10px] uppercase mb-2 flex items-center gap-1">
                            <AlertTriangle size={14} /> Admin Note
                        </h4>
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase tracking-tight">
                            System verified booking. This transaction is secured and final. Review any cancellation policies before manual intervention.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBookingDetail;
