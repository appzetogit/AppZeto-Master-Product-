import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HotelShellSkeleton } from '@food/components/ui/loading-skeletons';

// Lazy Imports - Admin Pages
const AdminSignup = lazy(() => import('../pages/AdminSignup'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminHotelDetail = lazy(() => import('../pages/AdminHotelDetail'));
const AdminUsers = lazy(() => import('../pages/AdminUsers'));
const AdminUserDetail = lazy(() => import('../pages/AdminUserDetail'));
const AdminBookings = lazy(() => import('../pages/AdminBookings'));
const AdminBookingDetail = lazy(() => import('../pages/AdminBookingDetail'));
const AdminPartners = lazy(() => import('../pages/AdminPartners'));
const AdminPartnerDetail = lazy(() => import('../pages/AdminPartnerDetail'));
const AdminReviews = lazy(() => import('../pages/AdminReviews'));
const AdminFinance = lazy(() => import('../../../pages/admin/FinanceAndPayoutsPage'));
const AdminSettings = lazy(() => import('../pages/AdminSettings'));
const AdminOffers = lazy(() => import('../pages/AdminOffers'));
const AdminProperties = lazy(() => import('../pages/AdminProperties'));
const AdminLegalPages = lazy(() => import('../pages/AdminLegalPages'));
const AdminContactMessages = lazy(() => import('../pages/AdminContactMessages'));
const AdminNotifications = lazy(() => import('../pages/AdminNotifications'));
const AdminFaqs = lazy(() => import('../pages/AdminFaqs'));

const PageLoader = () => <HotelShellSkeleton />;

const HotelAdminRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="bookings/:id" element={<AdminBookingDetail />} />
        <Route path="partners" element={<AdminPartners />} />
        <Route path="partners/:id" element={<AdminPartnerDetail />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="legal" element={<AdminLegalPages />} />
        <Route path="contact-messages" element={<AdminContactMessages />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="properties" element={<AdminProperties />} />
        <Route path="properties/:id" element={<AdminHotelDetail />} />
        <Route path="offers" element={<AdminOffers />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="faqs" element={<AdminFaqs />} />
      </Routes>
    </Suspense>
  );
};

export default HotelAdminRoutes;
