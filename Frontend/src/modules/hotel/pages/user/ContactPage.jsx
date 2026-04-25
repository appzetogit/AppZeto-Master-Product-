import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const ContactPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-surface text-white p-6 pb-12 rounded-b-[30px] shadow-lg sticky top-0 z-20">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold">Contact Us</h1>
        </div>
        <p className="text-sm text-white/80 max-w-xs">
          We're here to help you. Reach out to us for any queries or support.
        </p>
      </div>

      <div className="px-5 -mt-6 relative z-10 space-y-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-start gap-5 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-surface/5 flex items-center justify-center text-surface shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Office Address</p>
              <p className="text-sm font-bold text-gray-800 leading-relaxed">
                401 A Rajani bhawan high court square<br />
                Indore, Madhya Pradesh - 452001
              </p>
            </div>
          </div>

          <a
            href="mailto:rajnishpanchal.fr@gmail.com"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 no-underline text-inherit hover:border-surface hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface/5 flex items-center justify-center text-surface group-hover:bg-surface group-hover:text-white transition-colors">
              <Mail size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Email Support</p>
              <p className="text-sm font-bold text-gray-800 break-all">rajnishpanchal.fr@gmail.com</p>
            </div>
          </a>

          <a
            href="tel:+919244554429"
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 no-underline text-inherit hover:border-surface hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 rounded-2xl bg-surface/5 flex items-center justify-center text-surface group-hover:bg-surface group-hover:text-white transition-colors">
              <Phone size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Call Us</p>
              <p className="text-lg font-bold text-gray-800">+91-9244554429</p>
            </div>
          </a>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center space-y-2">
          <h3 className="font-bold text-gray-800">Business Hours</h3>
          <p className="text-sm text-gray-500 font-medium">Monday - Sunday: 9:00 AM - 9:00 PM</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

