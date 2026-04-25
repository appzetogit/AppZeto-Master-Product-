import React from 'react';
import PartnerHeader from '../components/PartnerHeader';

const PartnerPage = ({ title, subtitle }) => {
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PartnerHeader title={title} subtitle={subtitle} />
            <div className="max-w-3xl mx-auto px-4 py-8 text-center text-gray-500">
                <p>{title} Feature Coming Soon</p>
            </div>
        </div>
    );
};

export default PartnerPage;
