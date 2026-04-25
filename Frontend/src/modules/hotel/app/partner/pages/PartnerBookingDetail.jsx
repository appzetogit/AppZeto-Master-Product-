import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar, User, Phone, Mail, MapPin,
  CreditCard, CheckCircle, XCircle, Clock,
  ChevronLeft, AlertTriangle, LogIn, LogOut
} from 'lucide-react';
import { bookingService } from '../../../services/apiService';
import toast from 'react-hot-toast';

const PartnerBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const data = await bookingService.getPartnerBookingDetail(id);
      setBooking(data);
    } catch (error) {
      toast.error("Failed to load booking details");
      navigate('/hotel/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleMarkPaid = async () => {
    if (!window.confirm("Confirm: Guest has paid the full amount at the hotel?")) return;
    try {
      await bookingService.markAsPaid(id);
      toast.success("Marked as Paid Successfully");
      fetchBooking(); // Refresh
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleNoShow = async () => {
    if (!window.confirm("Confirm: Guest did NOT arrive? This will cancel the booking and release inventory.")) return;
    try {
      await bookingService.markNoShow(id);
      toast.success("Marked as No Show");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckIn = async () => {
    if (!window.confirm("Confirm Guest Check-In?")) return;
    try {
      await bookingService.checkIn(id);
      toast.success("Checked In Successfully");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Action Failed");
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!window.confirm("Confirm Guest Check-Out?")) return;
      await bookingService.checkOut(id);
      toast.success("Checked Out Successfully");
      fetchBooking();
    } catch (error) {
      if (error.requirePayment) {
        if (window.confirm(`${error.message}\n\nDo you want to FORCE check-out anyway?`)) {
          try {
            await bookingService.checkOut(id, true);
            toast.success("Checked Out (Forced)");
            fetchBooking();
          } catch (e) {
            toast.error(e.message || "Force Check-out Failed");
          }
        }
      } else {
        toast.error(error.message || "Action Failed");
      }
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm("Are you sure you want to cancel this booking? This will release the inventory block.")) return;
    try {
      await bookingService.cancelBooking(id);
      toast.success("Booking Cancelled Successfully");
      fetchBooking();
    } catch (error) {
      toast.error(error.message || "Cancellation Failed");
    }
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>;
  if (!booking) return null;

  const user = booking.userId || {};
  const property = booking.propertyId || {};
  const room = booking.roomTypeId || {};

  const isPayAtHotel = booking.paymentStatus !== 'paid';
  const canMarkPaid = isPayAtHotel && ['confirmed', 'checked_in'].includes(booking.bookingStatus);
  const canMarkNoShow = ['confirmed'].includes(booking.bookingStatus);
  const canCheckIn = booking.bookingStatus === 'confirmed';
  const canCheckOut = booking.bookingStatus === 'checked_in';
  const canCancel = ['confirmed', 'awaiting_payment'].includes(booking.bookingStatus);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/hotel/bookings')} className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg">Booking Details</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Status Card - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Booking ID</span>
            <p className="text-sm font-black text-gray-900 break-all">#{booking.bookingId || booking._id}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${booking.bookingStatus === 'confirmed' ? 'bg-green-50 text-green-700 border-green-100' :
            booking.bookingStatus === 'cancelled' ? 'bg-red-50 text-red-700 border-red-100' :
              booking.bookingStatus === 'no_show' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                'bg-yellow-50 text-yellow-700 border-yellow-100'
            }`}>
            {booking.bookingStatus.replace('_', ' ')}
          </div>
        </div>

        {/* Guest Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <User size={16} className="text-gray-400" /> Guest Details
          </h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-base text-gray-500">
              {user.name?.[0] || 'G'}
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{user.name || 'Guest'}</p>
              <p className="text-xs text-gray-500">Joined via App</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href={`tel:${user.phone}`} className="flex flex-col p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Phone</p>
              <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs">
                <Phone size={12} className="text-gray-400" /> {user.phone || 'N/A'}
              </div>
            </a>
            <div className="flex flex-col p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Email</p>
              <div className="flex items-center gap-1.5 font-semibold text-gray-900 text-xs truncate">
                <Mail size={12} className="text-gray-400" /> <span className="truncate">{user.email || 'N/A'}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              <span className="text-[10px] text-gray-500 font-bold uppercase">Total Guests</span>
            </div>
            <p className="font-bold text-gray-900 text-sm">
              {booking.guests?.adults || 1} Adult{(booking.guests?.adults || 1) !== 1 ? 's' : ''}
              {booking.guests?.children > 0 ? `, ${booking.guests.children} Child${booking.guests.children !== 1 ? 'ren' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Stay Info - Compact */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" /> Stay Details
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Check-in</p>
              <p className="font-bold text-gray-900 text-sm">{new Date(booking.checkInDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
            </div>
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <p className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Check-out</p>
              <p className="font-bold text-gray-900 text-sm">{new Date(booking.checkOutDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
            <div>
              <p className="text-[9px] text-gray-400 font-bold uppercase">Room Type</p>
              <p className="font-bold text-gray-900 text-sm">{room.name || room.type || 'Standard Room'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-900 font-bold">
                {Math.round(booking.baseAmount / (booking.pricePerNight * booking.totalNights)) || 1} {booking.bookingUnit === 'entire' ? 'Unit' : booking.bookingUnit === 'bed' ? 'Bed' : 'Room'}{(Math.round(booking.baseAmount / (booking.pricePerNight * booking.totalNights)) || 1) > 1 ? 's' : ''}
              </p>
              <p className="text-[10px] text-gray-500 font-medium">{booking.totalNights} Night{booking.totalNights > 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Payment & Payout Breakdown */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 text-sm flex items-center gap-2">
            <CreditCard size={16} className="text-teal-600" /> Payment & Payout Breakdown
          </h3>
          
          <div className="space-y-3">
            {/* 1. Gross Calculation */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Gross Room Price</span>
              <span className="font-bold text-gray-900">₹{(booking.baseAmount + (booking.extraCharges || 0)).toLocaleString()}</span>
            </div>

            {/* 2. Discounts (Show only if applicable) */}
            {(booking.discount > 0 || booking.prepaidDiscount > 0) && (
              <div className="space-y-1.5 pl-3 border-l-2 border-red-100">
                {booking.discount > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-red-500 font-medium">Coupon Discount ({booking.couponCode})</span>
                    <span className="text-red-600 font-bold">- ₹{booking.discount.toLocaleString()}</span>
                  </div>
                )}
                {booking.prepaidDiscount > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-red-500 font-medium">Prepaid Offer (5% Off)</span>
                    <span className="text-red-600 font-bold">- ₹{booking.prepaidDiscount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* 3. Taxes */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">GST / Taxes</span>
              <span className="font-bold text-gray-900">+ ₹{booking.taxes.toLocaleString()}</span>
            </div>

            {/* 4. Total Guest Paid */}
            <div className="flex justify-between items-center py-2 border-t border-b border-gray-50 bg-gray-50/50 px-2 -mx-2">
              <span className="text-xs font-bold text-gray-700">Total Guest Price</span>
              <span className="font-black text-gray-900">₹{booking.totalAmount.toLocaleString()}</span>
            </div>

            {/* 5. Platform Commission (Internal) */}
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-gray-500">Platform Commission</span>
              <span className="text-gray-900 font-medium">- ₹{booking.adminCommission.toLocaleString()}</span>
            </div>

            {/* 6. Partner Earnings (Demoted Visual Priority) */}
            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-tight text-[10px]">Your Net Earnings (Payout)</span>
              <span className="font-bold text-gray-700">₹{booking.partnerPayout.toLocaleString()}</span>
            </div>

            {/* 7. Collection Status (CRITICAL - HIGH VISIBILITY) */}
            <div className={`mt-4 p-4 rounded-2xl border-2 space-y-2 shadow-sm ${booking.remainingAmount > 0 || booking.paymentStatus === 'pending' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-500 font-bold uppercase tracking-wider">{booking.remainingAmount === 0 && booking.paymentStatus === 'paid' ? 'Total Paid Online' : 'Already Paid Online'}</span>
                <span className="text-gray-900 font-bold">₹{(booking.amountPaid > 0 ? booking.amountPaid : (booking.paymentStatus === 'paid' ? booking.totalAmount : 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                <span className={`${booking.remainingAmount > 0 || booking.paymentStatus === 'pending' ? 'text-red-800' : 'text-green-800'} font-black text-sm uppercase tracking-tight`}>
                  {booking.remainingAmount > 0 || booking.paymentStatus === 'pending' ? 'COLLECT AT HOTEL' : 'BALANCED / PAID'}
                </span>
                <span className={`${booking.remainingAmount > 0 || booking.paymentStatus === 'pending' ? 'text-red-600' : 'text-green-600'} font-black text-2xl`}>
                  ₹{(booking.remainingAmount > 0 ? booking.remainingAmount : (booking.paymentStatus === 'pending' ? booking.totalAmount : 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Status Information */}
            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-gray-500 font-bold uppercase tracking-tight text-[10px]">Payment Status</span>
              <div className="flex items-center gap-2">
                <span className={`font-bold px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wide border ${
                  booking.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-100' : 
                  booking.paymentStatus === 'partial' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                  'bg-yellow-50 text-yellow-700 border-yellow-100'
                }`}>
                  {booking.paymentStatus === 'partial' ? 'Partial (30% Paid)' : booking.paymentStatus === 'paid' ? 'Fully Paid' : 'Pay At Hotel'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        {canCheckIn && (
          <button
            onClick={handleCheckIn}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogIn size={20} /> Check In Guest
          </button>
        )}

        {canCheckOut && (
          <button
            onClick={handleCheckOut}
            className="col-span-2 bg-black text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <LogOut size={20} /> Check Out Guest
          </button>
        )}

        {canMarkPaid && (
          <button
            onClick={handleMarkPaid}
            className={`bg-green-600 text-white font-bold py-3 rounded-xl shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <CheckCircle size={18} /> Mark Payment
          </button>
        )}

        {canMarkNoShow && (
          <button
            onClick={handleNoShow}
            className={`bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <AlertTriangle size={18} /> No Show
          </button>
        )}

        {canCancel && (
          <button
            onClick={handleCancelBooking}
            className={`bg-red-50 border border-red-200 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 active:scale-95 transition-transform flex items-center justify-center gap-2 ${canCheckIn || canCheckOut ? 'col-span-1' : 'col-span-2'}`}
          >
            <XCircle size={18} /> Cancel Booking
          </button>
        )}
      </div>
    </div>
  );
};

export default PartnerBookingDetail;
