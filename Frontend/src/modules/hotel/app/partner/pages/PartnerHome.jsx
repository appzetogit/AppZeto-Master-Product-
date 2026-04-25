import React, { useEffect } from 'react';
import { useLenis } from '../../shared/hooks/useLenis';
import { playHeroAnimation } from '../../shared/animations/heroAnimations';
import { initScrollReveal } from '../../shared/animations/scrollReveal';
import { ArrowRight, TrendingUp, ShieldCheck, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const PartnerHome = () => {
    // 1. Initialize Smooth Scroll
    useLenis();

    // 2. Trigger Animations (Desktop Only to prevent mobile flicker/layout shifts)
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        let heroTl;

        if (!isMobile) {
            heroTl = playHeroAnimation();
            setTimeout(() => initScrollReveal(), 500);
        }

        return () => {
            if (heroTl) heroTl.kill();
        };
    }, []);

    // 3. Carousel Intersection Observer (Mobile Center Zoom)
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('mobile-card-active');
                } else {
                    entry.target.classList.remove('mobile-card-active');
                }
            });
        }, { root: null, threshold: 0.7 }); // 70% visibility triggers active

        const cards = document.querySelectorAll('.mobile-card-zoom');
        cards.forEach(card => observer.observe(card));

        return () => observer.disconnect();
    }, []);

    return (
        <div className="w-full bg-partner-bg overflow-x-hidden">
            {/* 1️⃣ HERO SECTION */}
            <section className="relative min-h-[60vh] md:min-h-[90vh] flex flex-col justify-center items-center text-center px-4 pt-12 pb-12 md:pt-20 md:pb-20">
                <div className="max-w-4xl mx-auto z-10">
                    <h1 className="hero-title text-4xl md:text-7xl font-black text-partner-text-primary tracking-tight leading-[1.1] mb-4 md:mb-6">
                        Grow Your Revenue <br /> with <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-[#004F4D]">Rukkoo Hub</span>
                    </h1>
                    <p className="hero-subtitle text-base md:text-xl text-partner-text-secondary max-w-xl mx-auto mb-8 font-medium px-2">
                        List your property. Reach verified guests. Earn up to 30% more.
                        <br className="hidden md:block" /> Seamless onboarding in under 10 minutes.
                    </p>

                    {/* <Link to="/hotel/join">
                        <button className="hero-btn group relative px-8 py-3.5 md:px-10 md:py-4 bg-partner-btn text-white text-base md:text-lg font-bold rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all active:scale-95">
                            <span className="relative z-10 flex items-center gap-2 md:gap-3">
                                Start Your Journey <ArrowRight size={18} className="md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                    </Link> */}
                </div>

                {/* Abstract Background Elements WITH HD IMAGE */}
                <div className="absolute inset-0 w-full h-full -z-0">
                    <img
                        src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop"
                        alt="Hotel Background"
                        className="w-full h-full object-cover opacity-20 md:opacity-10" // Low opacity for white theme
                    />
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/90 via-white/70 to-white" />
                </div>
            </section>

            {/* 2️⃣ HOW IT WORKS (Mobile: Scroll Snap Carousel | Desktop: Grid) */}
            <section className="py-12 md:py-24 px-0 md:px-12 max-w-7xl mx-auto">
                <div className="px-6 mb-8 md:mb-16 reveal">
                    <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-gray-400 mb-2 block">Process</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-partner-text-primary">How Rukkoo Hub Works</h2>
                </div>

                {/* Mobile: Horizontal Scroll | Desktop: Grid */}
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 md:grid md:grid-cols-4 md:gap-6 md:px-0 pb-10 reveal-stagger no-scrollbar items-center">
                    {[
                        { title: "Register", desc: "Add details in 10 mins", step: "01", img: "https://images.unsplash.com/photo-1517840901100-8179e982acb7?w=500&auto=format&fit=crop&q=60", tag: "Fast" },
                        { title: "Verify", desc: "Instant KYC approval", step: "02", img: "https://images.unsplash.com/photo-1563911302283-d2bc129e7c1f?w=500&auto=format&fit=crop&q=60", tag: "Secure" },
                        { title: "List", desc: "Go live to millions", step: "03", img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500&auto=format&fit=crop&q=60", tag: "Global" },
                        { title: "Earn", desc: "Weekly payouts", step: "04", img: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60", tag: "Easy" },
                    ].map((card, i) => (
                        <div key={i} className="min-w-[260px] md:min-w-0 snap-center bg-white rounded-3xl overflow-hidden shadow-lg border border-gray-100 group cursor-default flex flex-col h-[360px] transition-transform duration-300 mobile-card-zoom relative">
                            {/* Card Image (Top Half) */}
                            <div className="h-1/2 relative overflow-hidden">
                                <img src={card.img} alt={card.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#004F4D]/60 to-transparent flex items-end p-5 justify-between">
                                    <span className="text-5xl font-black text-white/30">{card.step}</span>
                                    <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 self-end mb-1">{card.tag}</span>
                                </div>
                            </div>

                            {/* Card Content (Bottom Half) */}
                            <div className="p-5 flex flex-col justify-center h-1/2 bg-white relative z-10">
                                <h3 className="text-xl font-bold mb-2 text-partner-text-primary">{card.title}</h3>
                                <p className="text-partner-text-secondary text-sm leading-relaxed mb-4">{card.desc}</p>

                                {/* Animated Bottom Line - Desktop Hover Only */}
                                <div className="hidden md:block absolute bottom-0 left-0 w-0 h-1 bg-[#004F4D] group-hover:w-full transition-all duration-500 ease-out" />

                                {/* Mobile Active Indicator (Always visible if active class present) */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#004F4D] opacity-0 transition-opacity duration-300 mobile-active-line md:hidden" />
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* INLINE SCRIPT FOR MOBILE CARD ZOOM (IntersectionObserver) */}
            <style>{`
                @media (max-width: 768px) {
                    .mobile-card-zoom { opacity: 0.7; transform: scale(0.9); transition: all 0.4s ease-out; }
                    /* Active state applied by IntersectionObserver */
                    .mobile-card-active { opacity: 1; transform: scale(1); border-color: #004F4D; box-shadow: 0 20px 25px -5px rgb(0 79 77 / 0.1); }
                    .mobile-card-active .mobile-active-line { opacity: 1; }
                }
            `}</style>

            {/* 3️⃣ BENEFITS GRID (Compact Mobile) */}
            <section className="py-12 md:py-24 bg-gray-50 border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4 md:gap-6 reveal">
                        <div>
                            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-gray-400 mb-2 block">Why Us</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-partner-text-primary max-w-lg leading-tight">Everything you need to run your business.</h2>
                        </div>
                        <p className="text-partner-text-secondary text-sm md:text-base max-w-md">We provide the tools, you provide the hospitality. Together we create unforgettable experiences.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 reveal-stagger">
                        {[
                            { icon: TrendingUp, title: "Smart Pricing", text: "AI-driven dynamic pricing to maximize revenue." },
                            { icon: ShieldCheck, title: "Verified Guests", text: "ID-verified guests for safety and trust." },
                            { icon: Star, title: "Marketing Boost", text: "Premium placement for top-rated properties." },
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 flex md:block items-center gap-4 md:gap-0">
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#004F4D] text-white rounded-xl md:rounded-2xl flex items-center justify-center md:mb-6 shrink-0">
                                    <item.icon size={24} className="md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-bold mb-1 md:mb-3">{item.title}</h3>
                                    <p className="text-partner-text-secondary text-sm leading-relaxed">{item.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4️⃣ COMPARISON SECTION */}
            <section className="py-12 md:py-24 px-4 md:px-12 max-w-5xl mx-auto reveal">
                <div className="bg-[#004F4D] text-white rounded-3xl md:rounded-[2.5rem] p-8 md:p-16 text-center shadow-xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-5xl font-bold mb-4 md:mb-6">Ready to transform your business?</h2>
                        <p className="text-white/80 mb-8 text-sm md:text-lg">Join 500+ hotel partners growing with Rukkoo Hub today.</p>
                        <Link to="/hotel/join">
                            <button className="bg-white text-[#004F4D] px-8 py-3.5 md:px-10 md:py-4 rounded-full font-bold text-sm md:text-base hover:bg-gray-100 hover:scale-105 transition-all">
                                List Your Property
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default PartnerHome;
