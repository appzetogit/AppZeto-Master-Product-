import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const PartnerLandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-surface relative overflow-hidden text-white">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>

            <main className="relative z-10 p-6 flex flex-col min-h-screen">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition backdrop-blur-md">
                        <ArrowLeft size={20} />
                    </button>
                    <span className="text-sm font-bold tracking-widest text-white/70 uppercase">Rukko Partner</span>
                </div>

                <div className="flex-1 flex flex-col justify-center pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8"
                    >
                        <h1 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                            Grow your <br />
                            <span className="text-accent">Business</span> with us.
                        </h1>
                        <p className="text-white/80 text-lg leading-relaxed max-w-sm">
                            Join thousands of hotels and homeowners who trust Rukko to increase their revenue.
                        </p>
                    </motion.div>

                    <div className="space-y-4 mb-10">
                        {[
                            { icon: TrendingUp, text: "Increase revenue by up to 30%" },
                            { icon: Users, text: "Reach millions of travellers" },
                            { icon: CheckCircle, text: "Hassle-free management" }
                        ].map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + idx * 0.1 }}
                                className="flex items-center gap-3"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-accent">
                                    <item.icon size={20} />
                                </div>
                                <span className="font-bold text-base">{item.text}</span>
                            </motion.div>
                        ))}
                    </div>

                    <button
                        onClick={() => navigate('/hotel/join')}
                        className="w-full py-4 bg-accent text-surface text-lg font-black rounded-2xl shadow-xl shadow-accent/20 hover:scale-[1.02] transition-transform active:scale-95"
                    >
                        List Your Property
                    </button>

                    <p className="text-center text-xs text-white/50 mt-4">
                        Already a partner? <button onClick={() => navigate('/hotel/login')} className="text-white font-bold underline">Login here</button>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default PartnerLandingPage;
