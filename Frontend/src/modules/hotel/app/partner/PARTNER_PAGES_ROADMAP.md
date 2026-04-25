# 🗺️ Partner Module Expansion Roadmap

## 🎯 Objective
Create a premium, "App-Like" experience for the Partner Dashboard extensions, strictly following the `hotel_document.txt` design philosophy (Mobile-First, Low Cognitive Load, Premium Feel).

---

## 🏗️ Phase 1: Foundation (Zero Code Duplication)

### 1. Unified Layout Strategy
To ensure the "App Feel" is consistent:
*   **`PartnerPageWrapper`**: Create a shared wrapper that handles:
    *   The `Header` with Sidebar Trigger (JD Icon).
    *   `Lenis` scroll smoothing.
    *   Page transitions (GSAP/Framer).
    *   *Why?* Keeps every page code clean and focused on content.

### 2. Route Architecture
Define these routes in `App.jsx` under `HotelLayout`:
*   `/hotel/bookings`
*   `/hotel/wallet`
*   `/hotel/transactions`
*   `/hotel/reviews`
*   `/hotel/notifications`
*   `/hotel/kyc`
*   `/hotel/support`
*   `/hotel/settings`
*   `/hotel/profile`

---

## 📱 Phase 2: The Core "App" Features

### 1. Bookings Manager (`/hotel/bookings`) 📅
*The daily driver for partners.*
*   **UX Pattern:** Sticky Tabs + Infinite Scroll List.
*   **Card Design:**
    *   **Compact Mode:** Guest Name, Room, Dates, Status (Good for list).
    *   **Expanded Mode:** Price breakdown, Guest Phone, Special Requests.
*   **Actions:** "One-Tap Check-in", "Call Guest".

### 2. Wallet & Payouts (`/hotel/wallet`) 💰
*Financial clarity.*
*   **UX Pattern:** Dashboard-style Widget.
*   **Key Elements:**
    *   **Big Balance Card:** Black gradient, "Available to Withdraw".
    *   **History List:** Clean rows of credit/debit.
    *   **Bottom Sheet:** For "Withdraw Request" form (Smooth slide-up).

### 3. Reviews Hub (`/hotel/reviews`) ⭐
*Reputation management.*
*   **UX Pattern:** Feed.
*   **Key Elements:**
    *   **Rating Header:** Big visual score.
    *   **Review Cards:** Guest text with "Reply" input inline.

---

## 🛡️ Phase 3: Administrative Pages

### 1. Profile & Settings
*   **Profile:** Read-only "Preview" of their hotel listing (reuses Wizard components).
*   **Settings:** Simple toggles (Notifications) and Password reset.

### 2. KYC & Support
*   **KYC:** Step-tracker (Submitted -> In Review -> Verified).
*   **Support:** "Chat with us" floating action or clean FAQ accordion.

---

## 🎨 Design Rules (From `hotel_document.txt`)
1.  **Colors:** `bg-gray-50` for page backgrounds, `bg-white` for content cards.
2.  **Typography:** Black headings, Gray-500 secondary text.
3.  **Motion:** Pages should slide in or fade up (GSAP). Lists should stagger in.
4.  **Touch:** Buttons must be at least 44px height. Active states must shrink (`scale-95`).

## ✅ Execution Steps
1.  Extract `PartnerHeader` component.
2.  Setup Routes.
3.  Build `bookings` and `wallet` pages first (High Value).
4.  Build remaining support pages.
