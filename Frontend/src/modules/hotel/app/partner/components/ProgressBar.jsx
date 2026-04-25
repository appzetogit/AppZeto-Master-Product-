import React from 'react';

const ProgressBar = ({ currentStep, totalSteps }) => {
    const progress = (currentStep / totalSteps) * 100;

    return (
        <div className="w-full h-1 bg-gray-100 fixed top-0 left-0 z-50">
            <div
                className="h-full bg-[#004F4D] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};

export default ProgressBar;
