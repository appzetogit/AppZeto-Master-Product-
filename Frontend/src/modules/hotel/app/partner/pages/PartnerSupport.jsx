import React, { useRef, useState, useEffect } from 'react';
import { CircleHelp, ChevronDown, Mail, Phone, MessageSquare, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import PartnerHeader from '../components/PartnerHeader';
import { faqService } from '../../../services/apiService';

const FaqItem = ({ question, answer }) => {
    /* ... existing FaqItem code ... */
    const [isOpen, setIsOpen] = useState(false);
    const contentRef = useRef(null);

    const toggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            gsap.to(contentRef.current, { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(contentRef.current, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in' });
        }
    };

    return (
        <div className="border border-gray-200 rounded-2xl mb-3 bg-white overflow-hidden transition-all hover:border-gray-300">
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <span className="font-bold text-sm text-[#003836]">{question}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div ref={contentRef} className="h-0 opacity-0 overflow-hidden px-4">
                <p className="text-xs text-gray-500 leading-relaxed pb-4 pt-0">
                    {answer}
                </p>
            </div>
        </div>
    );
};

const PartnerSupport = () => {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const data = await faqService.getFaqs('partner');
                setFaqs(data);
            } catch (error) {
                console.error('Failed to fetch FAQs');
            } finally {
                setLoading(false);
            }
        };
        fetchFaqs();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title="Support Center" subtitle="We are here to help" />

            <div className="max-w-3xl mx-auto px-4 pt-6">

                {/* Contact Options */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button
                        onClick={() => window.open('https://wa.me/919244554429', '_blank')}
                        className="bg-[#004F4D] text-white p-5 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <MessageSquare size={24} />
                        <span className="text-sm font-bold">WhatsApp Chat</span>
                    </button>
                    <a
                        href="tel:919244554429"
                        className="bg-white border border-gray-200 text-[#003836] p-5 rounded-2xl shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
                    >
                        <Phone size={24} />
                        <span className="text-sm font-bold">Call Support</span>
                    </a>
                </div>

                <div className="flex items-center gap-2 mb-4">
                    <CircleHelp size={18} className="text-gray-400" />
                    <h3 className="font-black text-[#003836]">Frequently Asked Questions</h3>
                </div>

                <div>
                    {loading ? (
                        <div className="p-8 flex justify-center">
                            <Loader2 className="animate-spin text-[#004F4D]" />
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No FAQs available.</div>
                    ) : (
                        faqs.map((faq, i) => (
                            <FaqItem key={faq._id || i} question={faq.question} answer={faq.answer} />
                        ))
                    )}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-400 mb-2">Still have questions?</p>
                    <a href="mailto:partners@rokkooin.com" className="inline-flex items-center gap-2 text-sm font-bold text-[#004F4D] border-b border-[#004F4D]/20 pb-0.5 hover:border-[#004F4D] transition-colors">
                        <Mail size={14} /> Email us at partners@rokkooin.com
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PartnerSupport;
