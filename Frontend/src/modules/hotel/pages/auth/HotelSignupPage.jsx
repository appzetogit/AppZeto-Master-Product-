import React, { useState, useEffect } from 'react';
import usePartnerStore from '../../app/partner/store/partnerStore';
import { useNavigate } from 'react-router-dom';
import StepWrapper from '../../app/partner/components/StepWrapper';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLenis } from '../../app/shared/hooks/useLenis';
import { authService, userService } from '../../services/apiService';

// Updated Steps Components
import StepUserRegistration from '../../app/partner/steps/StepUserRegistration';
import StepOwnerDetails from '../../app/partner/steps/StepOwnerDetails';

const steps = [
    { id: 1, title: 'Registration', desc: 'Create your partner account' },
    { id: 2, title: 'Owner Details', desc: 'Identity and Address' },
];

const HotelSignup = () => {
    useLenis();
    const navigate = useNavigate();
    const { currentStep, nextStep, prevStep, formData, setStep } = usePartnerStore();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle error timeout
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Handle auto-scroll on input focus for webview keyboard
    useEffect(() => {
        const handleFocusIn = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };

        window.addEventListener('focusin', handleFocusIn);
        return () => window.removeEventListener('focusin', handleFocusIn);
    }, []);

    const currentStepIndex = currentStep - 1;
    const progress = (currentStep / steps.length) * 100;

    const handleNext = async () => {
        setError('');

        // --- STEP 1: BASIC INFO & PROACTIVE VALIDATION ---
        if (currentStep === 1) {
            if (!formData.full_name || formData.full_name.length < 3) return setError('Please enter a valid full name');
            if (!formData.email || !formData.email.includes('@')) return setError('Please enter a valid email');
            if (!formData.phone || formData.phone.length !== 10) return setError('Please enter a valid 10-digit phone number');
            if (!formData.termsAccepted) return setError('You must accept the Terms & Conditions');

            setLoading(true);
            try {
                // Check if already exists before moving to heavy Step 2
                await authService.checkExists(formData.phone, formData.email, 'partner');
                nextStep();
            } catch (err) {
                const isDuplicate = err.status === 409 || (err.message && err.message.toLowerCase().includes('exists'));
                if (isDuplicate) {
                    setError(`${err.message} Please login instead.`);
                } else {
                    setError(err.message || 'Validation failed. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        }

        // --- STEP 2: OWNER DETAILS SUBMISSION & REGISTRATION ---
        else if (currentStep === 2) {
            // Validation
            if (!formData.aadhaar_number || formData.aadhaar_number.length !== 12) return setError('Valid 12-digit Aadhaar Number is required');
            if (!formData.aadhaar_front?.url) return setError('Aadhaar Front Image is required');
            if (!formData.aadhaar_back?.url) return setError('Aadhaar Back Image is required');
            if (!formData.pan_number || formData.pan_number.length !== 10) return setError('Valid 10-digit PAN Number is required');

            // PAN Regex Validation
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(formData.pan_number)) {
                return setError('Invalid PAN format. Please use (e.g., ABCDE1234F)');
            }

            if (!formData.pan_card_image?.url) return setError('PAN Card Image is required');

            // SUBMIT REGISTRATION TO BACKEND
            setLoading(true);
            try {
                // Prepare clean payload with only required fields (Referral removed for partners)
                const payload = {
                    full_name: formData.full_name,
                    email: formData.email,
                    phone: formData.phone,
                    aadhaar_number: formData.aadhaar_number,
                    aadhaar_front: formData.aadhaar_front,
                    aadhaar_back: formData.aadhaar_back,
                    pan_number: formData.pan_number,
                    pan_card_image: formData.pan_card_image,
                    termsAccepted: formData.termsAccepted,
                    role: 'partner'
                };

                console.log(`[REFERRAL_DEBUG] Partner Registration Payload:`, payload);
                const response = await authService.registerPartner(payload);
                setLoading(false);

                // Removed referral handling for partners

                // Show success message
                alert(response.message || 'Registration successful! Your account is pending admin approval. You can login once approved.');

                // Clear store and redirect
                usePartnerStore.getState().resetForm();
                navigate('/hotel/login');
            } catch (err) {
                setLoading(false);
                console.error("Registration Error:", err);
                setError(err.message || "Registration failed. Please check your details.");
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            prevStep();
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <StepUserRegistration />;
            case 2: return <StepOwnerDetails />;
            default: return <div>Unknown Step</div>;
        }
    };

    return (
        <div className="h-screen overflow-hidden bg-white text-[#003836] flex flex-col font-sans selection:bg-[#004F4D] selection:text-white">
            {/* Top Bar */}
            <header className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 px-4 flex items-center justify-between border-b border-gray-100">
                <button
                    onClick={handleBack}
                    className={`p-2 rounded-full transition-colors ${currentStep === 1 ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                    disabled={currentStep === 1}
                >
                    <ArrowLeft size={20} className="text-[#003836]" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Step {currentStep} of {steps.length}</span>
                    <span className="text-xs md:text-sm font-bold text-[#003836] truncate">{steps[currentStepIndex]?.title}</span>
                </div>
                <button onClick={() => navigate('/hotel/login')} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X size={20} className="text-[#003836]" />
                </button>
            </header>

            {/* Progress Bar */}
            <div className="absolute top-16 left-0 right-0 z-40 bg-gray-100 h-1">
                <div
                    className="h-full bg-[#004F4D] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Main Content Area - Scrollable */}
            <main className="flex-1 overflow-y-auto pt-24 pb-32 px-4 md:px-0 scroll-smooth">
                <div className="max-w-lg mx-auto w-full">
                    <div className="mb-6 md:text-center px-1">
                        <h1 className="text-2xl md:text-3xl font-black mb-1 leading-tight">{steps[currentStepIndex]?.title}</h1>
                        <p className="text-gray-500 text-sm md:text-base leading-snug">{steps[currentStepIndex]?.desc}</p>
                    </div>

                    <div className="relative">
                        <StepWrapper stepKey={currentStep}>
                            {renderStep()}
                        </StepWrapper>

                        {currentStep === 1 && (
                            <div className="mt-8 text-center border-t border-gray-100 pt-6">
                                <p className="text-gray-500 text-sm">
                                    Already have a partner account?{' '}
                                    <button
                                        onClick={() => navigate('/hotel/login')}
                                        className="text-[#004F4D] font-bold hover:underline"
                                    >
                                        Login Here
                                    </button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Bottom Action Bar */}
            <footer className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 md:p-6 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBack}
                            className={`text-xs font-bold underline px-3 py-2 transition-colors ${currentStep === 1 || loading ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-[#004F4D]'}`}
                            disabled={currentStep === 1 || loading}
                        >
                            Back
                        </button>
                    </div>

                    <div className="flex-1 flex flex-col items-end">
                        <button
                            onClick={handleNext}
                            disabled={loading}
                            className={`bg-[#004F4D] text-white px-8 py-3.5 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 w-full md:w-auto justify-center ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    {currentStep === steps.length ? 'Submit Registration' : 'Next Step'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="absolute top-0 left-0 right-0 flex justify-center w-full px-4 transform -translate-y-[120%]">
                        <div className="bg-red-500 text-white text-[10px] md:text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-bounce text-center break-words max-w-full">
                            {error}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default HotelSignup;
