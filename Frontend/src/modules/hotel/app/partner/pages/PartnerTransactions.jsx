import React, { useState, useEffect, useRef } from 'react';
import { ArrowUpRight, ArrowDownLeft, FileText, Download, Filter, Search, Calendar, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import walletService from '../../../services/walletService';

const TransactionRow = ({ txn }) => {
    const isCredit = txn.type === 'credit';

    return (
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCredit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {isCredit ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                    <h4 className="font-bold text-[#003836] text-sm group-hover:text-[#004F4D] transition-colors">{txn.description}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium mt-0.5">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 uppercase tracking-wide">{txn._id?.slice(-8).toUpperCase()}</span>
                        <span>•</span>
                        <span>{new Date(txn.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <div className={`font-black text-sm ${isCredit ? 'text-green-600' : 'text-[#003836]'}`}>
                    {isCredit ? '+' : '-'}₹{txn.amount?.toLocaleString('en-IN')}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wide mt-0.5 ${txn.status === 'completed' || txn.status === 'success' ? 'text-green-500' :
                    txn.status === 'pending' ? 'text-orange-500' : 'text-red-500'
                    }`}>
                    {txn.status}
                </div>
            </div>
        </div>
    );
};

const PartnerTransactions = () => {
    const listRef = useRef(null);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await walletService.getTransactions({
                viewAs: 'partner',
                type: filter === 'all' ? undefined : filter
            });
            if (data.success) {
                setTransactions(data.transactions);
            }
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, [filter]);

    useEffect(() => {
        if (listRef.current && !loading) {
            gsap.fromTo(listRef.current.children,
                { y: 10, opacity: 0 },
                { y: 0, opacity: 1, stagger: 0.05, duration: 0.3, ease: 'power2.out', clearProps: 'all' }
            );
        }
    }, [loading, transactions]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title="Transactions" subtitle="History & Statements" />

            {/* Filters & Actions */}
            <div className="bg-white sticky top-[73px] z-30 border-b border-gray-100 px-4 py-3 shadow-sm">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">

                    {/* Segmented Control */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white shadow-sm text-[#004F4D]' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('credit')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'credit' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Credits
                        </button>
                        <button
                            onClick={() => setFilter('debit')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'debit' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Debits
                        </button>
                    </div>

                    {/* Date / Download */}
                    <div className="flex gap-2">
                        <button className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg text-gray-500 hover:bg-[#004F4D] hover:text-white transition-colors" title="Filter by date">
                            <Calendar size={16} />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg text-gray-500 hover:bg-[#004F4D] hover:text-white transition-colors" title="Download report">
                            <Download size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 pt-6">

                {/* Search */}
                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Search by ID or Description..."
                        className="w-full h-12 bg-white rounded-2xl pl-12 pr-4 text-sm font-medium border border-gray-200 shadow-sm focus:outline-none focus:border-[#004F4D]/20 transition-colors"
                    />
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#004F4D]" />
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden" ref={listRef}>
                        {transactions.length > 0 ? transactions.map((txn, idx) => (
                            <TransactionRow key={txn._id || idx} txn={txn} />
                        )) : (
                            <div className="text-center py-12">
                                <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-400 font-bold">No transactions found</p>
                            </div>
                        )}
                    </div>
                )}

                <p className="text-center text-[10px] text-gray-400 mt-6 font-medium uppercase tracking-widest">
                    Showing latest transactions
                </p>

            </main>
        </div>
    );
};

export default PartnerTransactions;
