# Order & dispatch implementation summary

## What was implemented

### Backend

1. **Models**
   - **FoodOrder** (`Backend/src/modules/food/orders/order.model.js`): `orderId`, `userId`, `restaurantId`, `zoneId`, `items[]`, `deliveryAddress`, `pricing`, `payment` (method: cash/razorpay/razorpay_qr/wallet; status; amountDue; razorpay order/payment/signature; qr for COD collect), `orderStatus`, `dispatch` (modeAtCreation, status, deliveryPartnerId, assignedAt, acceptedAt), `statusHistory[]`.
   - **FoodSettings** (same file): single-doc store for global **dispatch mode** (`auto` | `manual`).

2. **Validators** (`order.validator.js`): Zod DTOs for calculate, create, verify-payment, cancel, order-status, assign-delivery, dispatch-settings.

3. **Order service** (`order.service.js`)
   - **User**: `calculateOrder`, `createOrder`, `verifyPayment`, `listOrdersUser`, `getOrderById`, `cancelOrder`.
   - **Restaurant**: `listOrdersRestaurant`, `updateOrderStatusRestaurant`.
   - **Delivery**: `listOrdersAvailableDelivery`, `acceptOrderDelivery`, `rejectOrderDelivery`, `updateOrderStatusDelivery`, `createCollectQr` (dynamic Razorpay payment link for COD-at-doorstep), `getPaymentStatus`.
   - **Admin**: `listOrdersAdmin`, `getOrderById`, `assignDeliveryPartnerAdmin`, `getDispatchSettings`, `updateDispatchSettings`.
   - **Dispatch**: `tryAutoAssign` – when dispatch mode is `auto`, finds nearest **online** delivery partner (by `lastLat`/`lastLng`) within 15 km and sets `dispatch.status = assigned`, `dispatch.deliveryPartnerId`. Called after order create (COD) or after verify-payment (online).

4. **Razorpay** (`razorpay.helper.js`): `createRazorpayOrder` (for online payment), `createPaymentLink` (for COD QR collect), `verifyPaymentSignature`. Env: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (and `config.razorpayKeyId` / `config.razorpayKeySecret` in `config/env.js`).

5. **Routes**
   - **User** (Bearer USER): `POST /api/v1/food/orders/calculate`, `POST /api/v1/food/orders`, `POST /api/v1/food/orders/verify-payment`, `GET /api/v1/food/orders`, `GET /api/v1/food/orders/:orderId`, `PATCH /api/v1/food/orders/:orderId/cancel`.
   - **Restaurant** (Bearer RESTAURANT): `GET /api/v1/food/restaurant/orders`, `PATCH /api/v1/food/restaurant/orders/:orderId/status`.
   - **Delivery** (Bearer DELIVERY_PARTNER): `GET /api/v1/food/delivery/orders/available`, `GET /api/v1/food/delivery/orders/:orderId`, `PATCH .../accept`, `.../reject`, `.../status`, `POST .../collect/qr`, `GET .../payment-status`.
   - **Admin** (Bearer ADMIN): `GET /api/v1/food/admin/orders`, `GET /api/v1/food/admin/orders/:orderId`, `PATCH /api/v1/food/admin/orders/:orderId/assign-delivery`, `GET /api/v1/food/admin/settings/dispatch`, `PATCH /api/v1/food/admin/settings/dispatch`.

### Frontend

1. **orderAPI** (no longer a stub): `calculateOrder`, `createOrder`, `verifyPayment`, `getOrders`, `getOrderDetails`, `cancelOrder` – all call the backend under `/food/orders` with `contextModule: "user"` so the correct Bearer token is sent.

2. **Admin API**: `getOrders`, `getOrderById`, `assignDeliveryPartner`, `getDispatchSettings`, `updateDispatchSettings` for orders and dispatch settings.

3. **Admin Settings – dispatch toggle**: In **AdminSettings**, a card “Order dispatch” with two buttons (Auto-assign / Manual). Loads current mode via `getDispatchSettings`, updates via `updateDispatchSettings`. One load on mount; one API call per toggle.

4. **Redux (food slice)**: Added `zoneId`, `selectedAddressId`, and `orderTrackingByOrderId` (cache for order + tracking per `orderId`). Actions: `setZoneId`, `setSelectedAddressId`, `setOrderTracking`, `clearOrderTracking`; all reset in `resetFood`. Lets home/cart/checkout and tracking screens read from store to reduce duplicate API calls and keep UI fast.

### How it works end-to-end

- **Place order (user)**  
  Cart builds payload (items, address, restaurantId, pricing, paymentMethod, zoneId) and calls `orderAPI.createOrder(payload)`.  
  - **Cash**: Order is saved with `payment.status = cod_pending`. If dispatch mode is **auto**, `tryAutoAssign` runs and may set a delivery partner. Response: `{ order, razorpay: null }`.  
  - **Razorpay**: Backend creates a Razorpay order and returns `{ order, razorpay: { key, orderId, amount, currency } }`. User completes payment in the browser; frontend calls `orderAPI.verifyPayment({ orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature })`. Backend verifies signature, sets `payment.status = paid`, then runs auto-assign if mode is auto.

- **Admin**  
  Settings → “Order dispatch”: switch **Auto-assign** or **Manual**. When **Manual**, new orders stay `unassigned` until admin assigns from the orders screen (use `assignDeliveryPartner` with order id and delivery partner id).

- **Delivery – COD QR**  
  For a COD order, delivery partner can call `POST /food/delivery/orders/:orderId/collect/qr` (optional body: customer name/email/phone). Backend creates a Razorpay payment link for `amountDue` and returns `shortUrl` (e.g. to show as QR). When the customer pays, Razorpay can notify via webhook (webhook handler can be added later to set `payment.status = paid`).

- **Firebase & map usage**  
  Existing `realtimeTracking.js` and paths (`delivery/{id}/location`, `restaurant/{id}/location`, `orders/{orderId}/tracking`) are unchanged. Polyline and coordinates can be written once (e.g. when order is assigned or when DP starts navigation) and read from Firebase to minimise map API calls. Redux `orderTrackingByOrderId` can be updated from the Firebase listener so the tracking screen reads from the store.

### Minimal API usage

- User: single `createOrder` (and optionally `verifyPayment` for online). List/details only when user opens orders or tracking.
- Admin: dispatch settings loaded once on Settings open; toggle triggers one PATCH. Orders list/details/assign as needed.
- Redux holds zoneId, selectedAddressId, and order tracking cache so multiple components can use the same data without refetching.

### Env (backend)

- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` for payments and COD QR.  
- Optional: `PORT`, `MONGO_URI`, etc. as before.

### Dependency

- Backend: **razorpay** added to `package.json`. Run `npm install` in `Backend`.
