import React, { useEffect, useRef, useState } from 'react';
import { Shield, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../../../services/apiService';

const Section = ({ title, children }) => (
    <div className="mb-8">
        <h4 className="font-bold text-[#003836] mb-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#004F4D]"></span>
            {title}
        </h4>
        <div className="text-xs text-gray-500 leading-relaxed pl-3.5 border-l border-gray-100">
            {children}
        </div>
    </div>
);

const PartnerTerms = () => {
    const contentRef = useRef(null);
    const [page, setPage] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        gsap.fromTo(contentRef.current,
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
        );
    }, []);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const res = await legalService.getPage('partner', 'terms');
                if (!isMounted) return;
                setPage(res.page);
            } catch (e) {
                if (!isMounted) return;
                setError('Using default partner agreement until admin configures legal copy.');
            }
        };

        load();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title="Terms & Conditions" subtitle="Legal Agreement" />

            <main ref={contentRef} className="max-w-3xl mx-auto px-4 pt-6">

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#003836]">
                                {page?.title || 'Partner Agreement'}
                            </h2>
                            <p className="text-xs text-gray-400">Last updated: August 15, 2024</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl px-4 py-2">
                            {error}
                        </div>
                    )}

                    {page?.content ? (
                        <Section title="">
                            <p className="whitespace-pre-line">
                                {page.content}
                            </p>
                        </Section>
                    ) : (
                        <>
                            <Section title="1. Relationship with Rokkooin">
                                By listing your property on Rokkooin, you agree to act as an independent service provider.
                                Rokkooin acts solely as an intermediary platform to connect you with potential guests.
                            </Section>

                            <Section title="2. Payouts & Commission">
                                Rokkooin charges a flat commission of 15% on every completed booking. Payouts are processed
                                weekly (every Wednesday) for the previous week's check-outs, subject to a minimum withdrawal limit of ₹1,000.
                            </Section>

                            <Section title="3. Cancellation Policy">
                                Partners must adhere to the cancellation policy selected during property listing.
                                Any penalties for guest cancellations will be shared as per the platform rules.
                            </Section>

                            <Section title="4. Quality Standards">
                                You agree to maintain the property standards as verified during onboarding.
                                Consistent negative feedback or failure to honor bookings may result in delisting.
                            </Section>
                        </>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle size={16} />
                            <span className="text-xs font-bold">You accepted these terms on 12 Aug 2024</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs font-bold text-[#004F4D] hover:underline">
                            Download PDF <ExternalLink size={12} />
                        </button>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default PartnerTerms;
