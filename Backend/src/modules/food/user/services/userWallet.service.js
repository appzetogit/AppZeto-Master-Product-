import mongoose from 'mongoose';
import { ValidationError } from '../../../../core/auth/errors.js';
import { FoodUserWallet } from '../models/userWallet.model.js';
import { createRazorpayOrder, getRazorpayKeyId, isRazorpayConfigured, verifyPaymentSignature } from '../../orders/razorpay.helper.js';

const ensureWallet = async (userId) => {
    const id = String(userId || '');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('User not found');
    }
    const oid = new mongoose.Types.ObjectId(id);
    const existing = await FoodUserWallet.findOne({ userId: oid });
    if (existing) return existing;
    return FoodUserWallet.create({ userId: oid, balance: 0, transactions: [] });
};

export const getUserWallet = async (userId) => {
    const wallet = await ensureWallet(userId);
    // Return newest first (UI expects recent transactions on top)
    const tx = Array.isArray(wallet.transactions) ? [...wallet.transactions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) : [];
    return {
        balance: Number(wallet.balance) || 0,
        referralEarnings: Number(wallet.referralEarnings) || 0,
        transactions: tx.map((t) => ({
            id: String(t._id),
            _id: t._id,
            type: t.type,
            amount: Number(t.amount) || 0,
            status: t.status || 'Completed',
            description: t.description || '',
            date: t.createdAt,
            createdAt: t.createdAt,
            metadata: t.metadata || {}
        }))
    };
};

export const createWalletTopupOrder = async (userId, amountInr) => {
    const amount = Number(amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new ValidationError('Amount must be greater than 0');
    }
    if (amount > 50000) {
        throw new ValidationError('Maximum amount is 50,000');
    }

    const wallet = await ensureWallet(userId);
    const amountPaise = Math.round(amount * 100);

    if (!isRazorpayConfigured()) {
        // Dev fallback: still return a shape compatible with the frontend.
        const orderId = `order_dev_${Date.now()}`;
        wallet.transactions.unshift({
            type: 'addition',
            amount,
            status: 'Pending',
            description: 'Wallet top-up (dev)',
            metadata: { source: 'wallet_topup', mode: 'dev' },
            razorpayOrderId: orderId
        });
        await wallet.save();

        return {
            razorpay: {
                key: getRazorpayKeyId() || 'rzp_test_dummy',
                orderId,
                amount: amountPaise,
                currency: 'INR'
            }
        };
    }

    const receipt = `wallet_topup_${String(userId).slice(-8)}_${Date.now()}`;
    const order = await createRazorpayOrder(amountPaise, 'INR', receipt);

    wallet.transactions.unshift({
        type: 'addition',
        amount,
        status: 'Pending',
        description: 'Wallet top-up',
        metadata: { source: 'wallet_topup', mode: 'razorpay' },
        razorpayOrderId: String(order.id)
    });
    await wallet.save();

    return {
        razorpay: {
            key: getRazorpayKeyId(),
            orderId: String(order.id),
            amount: Number(order.amount) || amountPaise,
            currency: order.currency || 'INR'
        }
    };
};

export const verifyWalletTopupPayment = async (userId, payload) => {
    const orderId = String(payload?.razorpayOrderId || '').trim();
    const paymentId = String(payload?.razorpayPaymentId || '').trim();
    const signature = String(payload?.razorpaySignature || '').trim();
    const amount = Number(payload?.amount);

    if (!orderId) throw new ValidationError('razorpayOrderId is required');
    if (!paymentId) throw new ValidationError('razorpayPaymentId is required');
    if (!signature) throw new ValidationError('razorpaySignature is required');
    if (!Number.isFinite(amount) || amount <= 0) throw new ValidationError('amount is required');

    const wallet = await ensureWallet(userId);
    const tx = wallet.transactions.find((t) => String(t.razorpayOrderId || '') === orderId);
    if (!tx) {
        throw new ValidationError('Top-up transaction not found');
    }
    if (String(tx.status).toLowerCase() === 'completed') {
        return { wallet: await getUserWallet(userId) };
    }

    // If razorpay not configured (dev), accept and credit wallet.
    const ok = isRazorpayConfigured()
        ? verifyPaymentSignature(orderId, paymentId, signature)
        : true;
    if (!ok) {
        tx.status = 'Failed';
        tx.razorpayPaymentId = paymentId;
        tx.razorpaySignature = signature;
        await wallet.save();
        throw new ValidationError('Payment verification failed');
    }

    tx.status = 'Completed';
    tx.razorpayPaymentId = paymentId;
    tx.razorpaySignature = signature;
    tx.amount = amount;

    wallet.balance = Number(wallet.balance || 0) + amount;
    await wallet.save();

    return { wallet: await getUserWallet(userId) };
};

