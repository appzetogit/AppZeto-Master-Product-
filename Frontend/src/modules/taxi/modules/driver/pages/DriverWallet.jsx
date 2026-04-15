import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowLeft,
    ArrowUpRight,
    CheckCircle2,
    History,
    RefreshCw,
    ShieldAlert,
    Wallet,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DriverBottomNav from '../../shared/components/DriverBottomNav';
import api from '../../../shared/api/axiosInstance';
import { socketService } from '../../../shared/api/socket';

const formatMoney = (value) => {
    const amount = Number(value || 0);
    const sign = amount < 0 ? '-' : '';
    return `${sign}Rs ${Math.abs(amount).toFixed(2)}`;
};

const toNumber = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : fallback;
};

const isEnabled = (value, fallback = true) => {
    if (value === undefined || value === null || value === '') return fallback;
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const formatTransactionType = (type = '') => {
    const labels = {
        ride_earning: 'Ride earning',
        commission_deduction: 'Cash ride commission',
        top_up: 'Wallet top-up',
        adjustment: 'Wallet adjustment',
    };

    return labels[type] || String(type || 'Wallet activity').replace(/_/g, ' ');
};

const formatDateTime = (value) => {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Just now';

    return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

const normalizeWalletResponse = (payload) => {
    const data = payload?.data || payload || {};
    return {
        wallet: data.wallet || { balance: 0, cashLimit: 0, minimumBalanceForOrders: 0, availableForOrders: 0, isBlocked: false },
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        settings: data.settings || {},
    };
};

const RuleCard = ({ label, value, help }) => (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <p className="mt-2 text-[18px] font-black text-slate-950">{value}</p>
        {help && <p className="mt-1 text-[11px] font-bold leading-relaxed text-slate-500">{help}</p>}
    </div>
);

const DriverWallet = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState('Weekly');
    const [showTopUp, setShowTopUp] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('500');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [wallet, setWallet] = useState({ balance: 0, cashLimit: 0, minimumBalanceForOrders: 0, availableForOrders: 0, isBlocked: false });
    const [transactions, setTransactions] = useState([]);
    const [walletError, setWalletError] = useState('');
    const [walletSettings, setWalletSettings] = useState({});

    const loadWallet = useCallback(async ({ quiet = false } = {}) => {
        if (!quiet) setIsRefreshing(true);
        setWalletError('');

        try {
            const response = await api.get('/drivers/wallet');
            const next = normalizeWalletResponse(response);
            setWallet(next.wallet);
            setTransactions(next.transactions);
            setWalletSettings(next.settings);
        } catch (error) {
            setWalletError(error?.message || 'Could not load wallet.');
        } finally {
            if (!quiet) setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadWallet({ quiet: true });

        const socket = socketService.connect({ role: 'driver' });
        const onWalletUpdated = (payload) => {
            if (payload?.wallet) {
                setWallet(payload.wallet);
            }
            if (payload?.transaction) {
                setTransactions((prev) => [payload.transaction, ...prev.filter((tx) => tx._id !== payload.transaction._id)].slice(0, 50));
            }
        };

        if (socket) {
            socketService.on('driver:wallet:updated', onWalletUpdated);
        }

        return () => {
            socketService.off('driver:wallet:updated', onWalletUpdated);
        };
    }, [loadWallet]);

    const walletRules = useMemo(() => {
        const minimumBalanceForOrders = toNumber(
            wallet.minimumBalanceForOrders,
            toNumber(walletSettings.driver_wallet_minimum_amount_to_get_an_order, 0),
        );
        const availableForOrders = toNumber(wallet.availableForOrders, toNumber(wallet.balance) - minimumBalanceForOrders);
        const minimumTopUpAmount = toNumber(wallet.minimumTopUpAmount, toNumber(walletSettings.minimum_amount_added_to_wallet, 0));
        const minimumTransferAmount = toNumber(wallet.minimumTransferAmount, toNumber(walletSettings.minimum_wallet_amount_for_transfer, 0));
        const walletEnabled = wallet.isWalletEnabled ?? isEnabled(walletSettings.show_wallet_feature_for_driver, true);
        const transferEnabled = wallet.isTransferEnabled ?? isEnabled(walletSettings.enable_wallet_transfer_driver, true);
        const canReceiveOrders = walletEnabled && !wallet.isBlocked && availableForOrders >= 0;

        return {
            minimumBalanceForOrders,
            availableForOrders,
            minimumTopUpAmount,
            minimumTransferAmount,
            walletEnabled,
            transferEnabled,
            canReceiveOrders,
        };
    }, [wallet, walletSettings]);

    const filteredTransactions = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - (period === 'Weekly' ? 7 : 30));

        return transactions.filter((tx) => {
            const createdAt = tx.createdAt ? new Date(tx.createdAt) : null;
            return !createdAt || Number.isNaN(createdAt.getTime()) || createdAt >= cutoff;
        });
    }, [period, transactions]);

    const quickAmounts = useMemo(() => {
        const minimum = Math.max(walletRules.minimumTopUpAmount, 100);
        return [minimum, minimum * 2, minimum * 5].map((amount) => String(Math.round(amount)));
    }, [walletRules.minimumTopUpAmount]);

    const handleTopUp = async () => {
        const amount = Number(topUpAmount);
        if (!walletRules.walletEnabled) {
            setWalletError('Wallet is disabled by admin.');
            return;
        }
        if (!Number.isFinite(amount) || amount <= 0) {
            setWalletError('Enter a valid top-up amount.');
            return;
        }
        if (walletRules.minimumTopUpAmount > 0 && amount < walletRules.minimumTopUpAmount) {
            setWalletError(`Minimum top-up amount is ${formatMoney(walletRules.minimumTopUpAmount)}.`);
            return;
        }

        setIsProcessing(true);
        setWalletError('');

        try {
            const response = await api.post('/drivers/wallet/top-up', {
                amount,
                source: 'driver-wallet-page',
            });
            const data = response?.data || response || {};
            if (data.wallet) {
                setWallet(data.wallet);
            }
            if (data.transaction) {
                setTransactions((prev) => [data.transaction, ...prev.filter((tx) => tx._id !== data.transaction._id)].slice(0, 50));
            }
            setIsSuccess(true);
            setTimeout(() => {
                setIsSuccess(false);
                setShowTopUp(false);
            }, 1400);
        } catch (error) {
            setWalletError(error?.message || 'Top-up failed.');
        } finally {
            setIsProcessing(false);
        }
    };

    const statusText = walletRules.walletEnabled
        ? walletRules.canReceiveOrders
            ? 'Ready for orders'
            : 'Top up to receive orders'
        : 'Wallet disabled by admin';

    return (
        <div className="min-h-screen bg-[#F6F4EF] px-4 pb-28 pt-5 font-sans text-slate-950">
            <AnimatePresence>
                {showTopUp && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="w-full rounded-t-[2rem] bg-white p-5 pb-8 shadow-2xl"
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-950">Top up wallet</h3>
                                    <p className="text-xs font-bold text-slate-500">Minimum: {formatMoney(walletRules.minimumTopUpAmount)}</p>
                                </div>
                                <button onClick={() => setShowTopUp(false)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                                    <X size={18} />
                                </button>
                            </div>

                            {isSuccess ? (
                                <div className="grid place-items-center py-10 text-center">
                                    <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                                        <CheckCircle2 size={38} strokeWidth={3} />
                                    </div>
                                    <p className="mt-4 text-lg font-black">Wallet updated</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">Your order eligibility refreshed instantly.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Amount</p>
                                        <input
                                            type="number"
                                            min="1"
                                            value={topUpAmount}
                                            onChange={(event) => setTopUpAmount(event.target.value)}
                                            className="mt-2 w-full bg-transparent text-center text-4xl font-black text-slate-950 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {quickAmounts.map((amount) => (
                                            <button
                                                key={amount}
                                                onClick={() => setTopUpAmount(amount)}
                                                className="rounded-2xl border border-slate-100 bg-white py-3 text-sm font-black text-slate-700 shadow-sm"
                                            >
                                                {formatMoney(amount)}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleTopUp}
                                        disabled={isProcessing || !walletRules.walletEnabled}
                                        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black uppercase tracking-widest text-white disabled:bg-slate-200 disabled:text-slate-400"
                                    >
                                        {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : 'Add money'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <header className="mb-5 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <ArrowLeft size={19} strokeWidth={2.5} />
                </button>
                <div className="text-center">
                    <h1 className="text-base font-black uppercase tracking-[0.18em]">Wallet</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Admin controlled</p>
                </div>
                <button onClick={() => loadWallet()} disabled={isRefreshing} className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-900 shadow-sm">
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-emerald-600' : ''} />
                </button>
            </header>

            <main className="space-y-4">
                <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">Current balance</p>
                            <h2 className="mt-2 text-4xl font-black tracking-tight">{formatMoney(wallet.balance)}</h2>
                            <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${walletRules.canReceiveOrders ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
                                {statusText}
                            </p>
                        </div>
                        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                            <Wallet size={26} />
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Need for orders</p>
                            <p className="mt-1 text-lg font-black">{formatMoney(walletRules.minimumBalanceForOrders)}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/45">Above minimum</p>
                            <p className={`mt-1 text-lg font-black ${walletRules.availableForOrders >= 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                                {formatMoney(walletRules.availableForOrders)}
                            </p>
                        </div>
                    </div>
                </section>

                {walletError && (
                    <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600">
                        {walletError}
                    </p>
                )}

                <section className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowTopUp(true)}
                        disabled={!walletRules.walletEnabled}
                        className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-wider text-white shadow-sm disabled:bg-slate-200 disabled:text-slate-400"
                    >
                        Top up <ArrowUpRight size={17} strokeWidth={3} />
                    </button>
                    <button
                        disabled
                        className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-black uppercase tracking-wider text-slate-400"
                    >
                        Transfer {walletRules.transferEnabled ? 'Soon' : 'Off'}
                    </button>
                </section>

                <section className="grid grid-cols-2 gap-3">
                    <RuleCard
                        label="Minimum top-up"
                        value={formatMoney(walletRules.minimumTopUpAmount)}
                        help="Set from admin wallet settings."
                    />
                    <RuleCard
                        label="Transfer minimum"
                        value={formatMoney(walletRules.minimumTransferAmount)}
                        help={walletRules.transferEnabled ? 'Transfer is enabled by admin.' : 'Transfer is disabled by admin.'}
                    />
                </section>

                <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className={`grid h-11 w-11 place-items-center rounded-2xl ${walletRules.canReceiveOrders ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-950">How this wallet is controlled</p>
                            <p className="mt-1 text-xs font-bold leading-relaxed text-slate-500">
                                Admin settings decide wallet visibility, minimum balance for orders, top-up minimum, and transfer availability.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Transactions</h3>
                        <div className="rounded-2xl bg-white p-1 shadow-sm">
                            {['Weekly', 'Monthly'].map((nextPeriod) => (
                                <button
                                    key={nextPeriod}
                                    onClick={() => setPeriod(nextPeriod)}
                                    className={`rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${period === nextPeriod ? 'bg-slate-950 text-white' : 'text-slate-400'}`}
                                >
                                    {nextPeriod}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredTransactions.length === 0 ? (
                        <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                            <History size={28} className="mx-auto text-slate-300" />
                            <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">No wallet transactions yet</p>
                        </div>
                    ) : (
                        filteredTransactions.map((tx, index) => {
                            const isDebit = Number(tx.amount || 0) < 0;
                            return (
                                <motion.div
                                    key={tx._id || tx.id || index}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${isDebit ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {isDebit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-950">{formatTransactionType(tx.type)}</p>
                                            <p className="mt-1 text-[11px] font-bold text-slate-400">{formatDateTime(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${isDebit ? 'text-rose-500' : 'text-emerald-600'}`}>{formatMoney(tx.amount)}</p>
                                        <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">Bal {formatMoney(tx.balanceAfter)}</p>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </section>
            </main>

            <DriverBottomNav />
        </div>
    );
};

export default DriverWallet;
