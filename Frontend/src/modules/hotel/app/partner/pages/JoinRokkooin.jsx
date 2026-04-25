import React, { useState } from 'react';
import usePartnerStore from '../store/partnerStore';
import { useNavigate } from 'react-router-dom';
import StepWrapper from '../components/StepWrapper';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useLenis } from '../../shared/hooks/useLenis';
import { hotelService } from '../../../services/apiService';

// Steps Components
import StepCategory from '../steps/StepCategory';
import StepBasicInfo from '../steps/StepBasicInfo';
import StepLocation from '../steps/StepLocation';
import StepConfiguration from '../steps/StepConfiguration';
import StepInventory from '../steps/StepInventory';
import StepFacilities from '../steps/StepFacilities'; // Amenities
import StepPropertyImages from '../steps/StepPropertyImages'; // Media
import StepContacts from '../steps/StepContacts';
import StepPolicies from '../steps/StepPolicies';
import StepKyc from '../steps/StepKyc'; // Documents
import StepReview from '../steps/StepReview';

const JoinRokkooin = () => {
    useLenis();
    const navigate = useNavigate();
    const { currentStep, nextStep, prevStep, formData, updateFormData, resetForm } = usePartnerStore();
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isVilla = formData.propertyCategory === 'Villa';

    const steps = [
        { id: 1, title: 'Category', desc: 'Select Property Type' },
        { id: 2, title: 'Basics', desc: 'Property Info' },
        { id: 3, title: 'Location', desc: 'Address & Map' },
        { id: 4, title: 'Config', desc: 'Property Configuration' },
        { id: 5, title: isVilla ? 'Pricing' : 'Inventory', desc: isVilla ? 'Rates & Availability' : 'Rooms & Units' },
        { id: 6, title: 'Amenities', desc: 'Facilities' },
        { id: 7, title: 'Media', desc: 'Photos' },
        { id: 8, title: 'Contacts', desc: 'Contact Info' },
        { id: 9, title: 'Policies', desc: 'Rules & Check-in' },
        { id: 10, title: 'Documents', desc: 'Legal Compliance' },
        { id: 11, title: 'Submit', desc: 'Review & Publish' },
    ];

    const currentStepIndex = currentStep - 1;
    const progress = (currentStep / steps.length) * 100;

    const handleExit = () => {
        resetForm();
        navigate('/hotel/dashboard');
    };

    const handleNext = async () => {
        setError('');

        // VALIDATION LOGIC
        if (currentStep === 1 && !formData.propertyCategory) return setError('Please select a property category');

        if (currentStep === 2) {
            if (!formData.name) return setError('Property name is required');
            if (!formData.shortDescription) return setError('Short description is required');
            if (!formData.description) return setError('Detailed description is required');
        }

        if (currentStep === 3) {
            if (!formData.address?.addressLine) return setError('Address Line is required');
            if (!formData.address?.city) return setError('City is required');
            if (!formData.address?.coordinates?.lat) return setError('Location on map is required');
        }

        if (currentStep === 5) {
            const isVilla = formData.propertyCategory === 'Villa';
            if (isVilla) {
                if (!formData.pricing?.basePrice) return setError('Base Price is required');
            } else {
                if (!formData.inventory || formData.inventory.length === 0) {
                    return setError('Please add at least one room/unit/bed type');
                }
            }
        }

        if (currentStep === 6 && (!formData.amenities || formData.amenities.length === 0)) {
            return setError('Select at least one amenity');
        }

        if (currentStep === 7) {
            if (!formData.images?.cover) return setError('Cover image is required');
            if (!formData.images?.gallery || formData.images.gallery.length < 5) return setError('Please upload at least 5 gallery images');
        }

        if (currentStep === 8 && !formData.contacts?.receptionPhone) return setError('Reception phone is required');

        if (currentStep === 9) {
            if (!formData.policies?.cancellationPolicy) return setError('Cancellation policy is required');
            if (!formData.policies?.checkInPolicy) return setError('Check-in policy description is required');
        }

        if (currentStep === 10 && !formData.documents?.ownershipProof) return setError('Ownership proof is required');

        // SAVE DRAFT STEP (Before moving next)
        try {
            // Determine the ID to use: either from an existing draft or an actual property being edited
            const activeId = formData._id || formData.hotelDraftId;

            const payload = {
                ...formData,
                step: currentStep,
                hotelDraftId: activeId // Pass this ID to backend
            };

            // Don't save on Step 11 submit (handled separately) unless we want to autosave draft first
            if (currentStep < 11) {
                const draftResponse = await hotelService.saveOnboardingStep(payload);
                if (draftResponse && draftResponse.hotelId) {
                    // Update store with the draft ID if we didn't have one
                    if (!activeId) {
                        updateFormData({ hotelDraftId: draftResponse.hotelId });
                    }
                }
            }
        } catch (err) {
            console.warn("Failed to save draft:", err);
            // If we fail to create the INITIAL draft (Step 1), block progress.
            // But if we are editing an existing property or subsequent steps fail to autosave, valid to warn but maybe proceed?
            // Prioritizing data integrity: block if on Step 1.
            const activeId = formData._id || formData.hotelDraftId;
            if (!activeId && currentStep === 1) {
                return setError('Failed to create draft. Please try again.');
            }
        }

        if (currentStep < steps.length) {
            nextStep();
        } else {
            // Final Submit Logic
            setIsSubmitting(true);
            try {
                // Use the correct ID (either editing existing property or new draft)
                const activeId = formData._id || formData.hotelDraftId;

                // Submit status = submitted
                const finalPayload = {
                    hotelDraftId: activeId,
                    status: 'submitted'
                    // ...formData is already saved in previous steps
                };

                await hotelService.saveOnboardingStep(finalPayload);

                alert("✅ Application Submitted for Approval!");
                resetForm();
                navigate('/hotel/dashboard');
            } catch (err) {
                console.error("Submission Failed:", err);
                setError(err.message || "Submission Failed. Please try again.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            prevStep();
        } else {
            resetForm();
            navigate('/hotel');
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: return <StepCategory />;
            case 2: return <StepBasicInfo />;
            case 3: return <StepLocation />;
            case 4: return <StepConfiguration />;
            case 5: return <StepInventory />;
            case 6: return <StepFacilities />;
            case 7: return <StepPropertyImages />;
            case 8: return <StepContacts />;
            case 9: return <StepPolicies />;
            case 10: return <StepKyc />;
            case 11: return <StepReview />;
            default: return <div>Unknown Step</div>;
        }
    };

    return (
        <div className="min-h-screen bg-white text-[#003836] flex flex-col font-sans selection:bg-[#004F4D] selection:text-white">
            {/* Top Bar */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 px-4 flex items-center justify-between border-b border-gray-100">
                <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <ArrowLeft size={20} className="text-[#003836]" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Step {currentStep} of {steps.length}</span>
                    <span className="text-xs md:text-sm font-bold text-[#003836] truncate max-w-[150px] md:max-w-none">{steps[currentStepIndex]?.title}</span>
                </div>
                <button onClick={handleExit} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <X size={20} className="text-[#003836]" />
                </button>
            </header>

            {/* Progress Bar */}
            <div className="fixed top-16 left-0 right-0 z-40 bg-gray-100 h-1">
                <div
                    className="h-full bg-[#004F4D] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col pt-20 pb-24 px-4 md:px-0 max-w-lg mx-auto w-full relative">
                <div className="mb-4 md:text-center px-1">
                    <h1 className="text-xl md:text-3xl font-black mb-1 leading-tight">{steps[currentStepIndex]?.title}</h1>
                    <p className="text-gray-500 text-xs md:text-base leading-snug">{steps[currentStepIndex]?.desc}</p>
                </div>

                <div className="flex-1 relative">
                    <StepWrapper stepKey={currentStep}>
                        {renderStep()}
                    </StepWrapper>
                </div>
            </main>

            {/* Bottom Action Bar */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-3 md:p-6 z-50">
                <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBack}
                            className="text-xs font-bold underline px-3 py-2 text-gray-400 hover:text-[#004F4D] transition-colors"
                            disabled={currentStep === 1 || isSubmitting}
                        >
                            Back
                        </button>
                        {currentStep < 11 && !isSubmitting && (
                            <button
                                onClick={() => { if (window.confirm("Clear all fields in this step?")) { usePartnerStore.getState().clearCurrentStep('join'); } }}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors px-3 py-2 ml-1 border border-red-50 hover:bg-red-50 rounded-lg"
                            >
                                Clear Step
                            </button>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col items-end">
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={`bg-[#004F4D] text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2 w-full md:w-auto justify-center ${isSubmitting ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {isSubmitting ? 'Processing...' : currentStep === steps.length ? 'Submit Application' : 'Next'}
                            {!isSubmitting && <ArrowRight size={16} />}
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="absolute top-[-40px] left-0 right-0 flex justify-center w-full px-4">
                        <div className="bg-red-500 text-white text-[10px] md:text-sm font-bold px-4 py-1.5 rounded-full shadow-lg animate-bounce text-center break-words max-w-full">
                            {error}
                        </div>
                    </div>
                )}
            </footer>
        </div>
    );
};

export default JoinRokkooin;
