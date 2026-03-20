import mongoose from 'mongoose';
import { FoodOrder } from '../../orders/models/order.model.js';
import { FoodRestaurantCommissionLedger } from '../../orders/models/restaurantCommissionLedger.model.js';
import { FoodRestaurant } from '../models/restaurant.model.js';

function toTwoDigitYearString(dateObj) {
    const y = String(dateObj.getFullYear());
    return y.slice(-2);
}

function monthShort(monthIndex) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex] || 'Jan';
}

function getFixedCurrentCycleWindow(now = new Date()) {
    const startDay = 15;
    const endDay = 21;

    let year = now.getFullYear();
    let month = now.getMonth();

    // If before start day, settlement belongs to previous month cycle.
    if (now.getDate() < startDay) {
        month = month - 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    const start = new Date(year, month, startDay, 0, 0, 0, 0);
    const end = new Date(year, month, endDay, 23, 59, 59, 999);

    return {
        start,
        end,
        startMeta: { day: String(startDay), month: monthShort(month), year: toTwoDigitYearString(new Date(year, month, startDay)) },
        endMeta: { day: String(endDay), month: monthShort(month), year: toTwoDigitYearString(new Date(year, month, endDay)) }
    };
}

function parseISODateParam(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
}

function parseISODateParamEnd(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
}

export async function getRestaurantFinance(restaurantId, query = {}) {
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) return null;
    const rid = new mongoose.Types.ObjectId(restaurantId);

    // Fetch restaurant profile for header display.
    const restaurant = await FoodRestaurant.findById(rid)
        .select('restaurantName addressLine1 addressLine2 area city state pincode location')
        .lean();

    const address =
        restaurant?.location?.formattedAddress ||
        (restaurant?.addressLine1
            ? [restaurant.addressLine1, restaurant.addressLine2, restaurant.area].filter(Boolean).join(', ')
            : restaurant?.addressLine1 || '');

    const nowWindow = getFixedCurrentCycleWindow(new Date());

    // Current cycle: sum ledger payouts in the fixed window.
    const currentLedgerRows = await FoodRestaurantCommissionLedger.find({
        restaurantId: rid,
        status: 'posted',
        createdAt: { $gte: nowWindow.start, $lte: nowWindow.end }
    })
        .sort({ createdAt: -1 })
        .lean();

    const orderIds = currentLedgerRows.map((r) => r.orderId).filter(Boolean);
    const orders = orderIds.length
        ? await FoodOrder.find({ _id: { $in: orderIds } })
            .select('orderId createdAt items pricing deliveryState')
            .lean()
        : [];

    const orderByMongoId = new Map(orders.map((o) => [String(o._id), o]));

    const currentCycleOrders = currentLedgerRows.map((row) => {
        const order = orderByMongoId.get(String(row.orderId)) || {};
        const items = Array.isArray(order.items) ? order.items : [];
        const foodNames = items.map((it) => it?.name).filter(Boolean).join(', ');
        const orderTotalExclTax = Math.max(
            0,
            Number(order?.pricing?.total ?? 0) - Number(order?.pricing?.tax ?? 0) || 0
        );
        return {
            orderId: order?.orderId || row.orderReadableId,
            createdAt: order?.createdAt || row.postedAt,
            items,
            foodNames,
            orderTotal: orderTotalExclTax,
            totalAmount: Number(order?.pricing?.total ?? row.orderTotal ?? 0) || 0,
            payout: Number(row?.payout ?? row?.commissionAmount ?? 0) || 0
        };
    });

    const currentCycleEstimatedPayout = currentCycleOrders.reduce(
        (sum, o) => sum + (Number(o.payout) || 0),
        0
    );

    const currentCycle = {
        start: { ...nowWindow.startMeta },
        end: { ...nowWindow.endMeta },
        estimatedPayout: currentCycleEstimatedPayout,
        totalOrders: currentCycleOrders.length,
        payoutDate: null,
        orders: currentCycleOrders
    };

    // Past cycles: build from provided startDate/endDate query.
    const startDate = parseISODateParam(query.startDate);
    const endDate = parseISODateParamEnd(query.endDate);

    let pastCycles = { orders: [], totalOrders: 0 };
    if (startDate && endDate) {
        const pastLedgerRows = await FoodRestaurantCommissionLedger.find({
            restaurantId: rid,
            status: 'posted',
            createdAt: { $gte: startDate, $lte: endDate }
        })
            .sort({ createdAt: -1 })
            .lean();

        const pastOrderIds = pastLedgerRows.map((r) => r.orderId).filter(Boolean);
        const pastOrders = pastOrderIds.length
            ? await FoodOrder.find({ _id: { $in: pastOrderIds } })
                .select('orderId createdAt items pricing')
                .lean()
            : [];

        const pastOrderByMongoId = new Map(pastOrders.map((o) => [String(o._id), o]));

        const pastCycleOrders = pastLedgerRows.map((row) => {
            const order = pastOrderByMongoId.get(String(row.orderId)) || {};
            const items = Array.isArray(order.items) ? order.items : [];
            const foodNames = items.map((it) => it?.name).filter(Boolean).join(', ');
            const orderTotalExclTax = Math.max(
                0,
                Number(order?.pricing?.total ?? 0) - Number(order?.pricing?.tax ?? 0) || 0
            );

            return {
                orderId: order?.orderId || row.orderReadableId,
                createdAt: order?.createdAt || row.postedAt,
                items,
                foodNames,
                orderTotal: orderTotalExclTax,
                totalAmount: Number(order?.pricing?.total ?? row.orderTotal ?? 0) || 0,
                payout: Number(row?.payout ?? row?.commissionAmount ?? 0) || 0
            };
        });

        pastCycles = {
            orders: pastCycleOrders,
            totalOrders: pastCycleOrders.length
        };
    }

    return {
        restaurant: {
            name: restaurant?.restaurantName || '',
            restaurantId: restaurant?._id ? `REST${restaurant._id.toString().slice(-6).padStart(6, '0')}` : 'N/A',
            address
        },
        currentCycle,
        pastCycles
    };
}

