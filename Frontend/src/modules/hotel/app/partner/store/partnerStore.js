import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const INITIAL_DATA = {
    // --- User Registration (HotelSignup) ---
    full_name: '',
    email: '',
    phone: '',
    role: 'partner',
    termsAccepted: false,
    otpCode: '', // Shared with auth
    referralCode: '',

    // Owner Details
    aadhaar_number: '',
    aadhaar_front: { url: '', publicId: '' },
    aadhaar_back: { url: '', publicId: '' },
    pan_number: '',
    pan_card_image: { url: '', publicId: '' },

    // --- Property Onboarding (JoinRokkooin) ---
    hotelDraftId: null,

    // Step 1
    propertyCategory: '',
    bookingType: '',
    inventoryType: '',

    // Step 2
    name: '', // Property Name
    description: '',
    shortDescription: '',

    // Step 3
    address: {
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
        coordinates: { lat: 20.5937, lng: 78.9629 }
    },

    // Step 4
    config: {},

    // Step 5
    inventory: [],
    pricing: {
        basePrice: '',
        extraGuestPrice: '',
        cleaningFee: ''
    },
    availabilityRules: {
        minStay: 1,
        maxStay: 30,
        blockedDates: []
    },

    // Step 6
    amenities: [],

    // Step 7
    images: {
        cover: '',
        gallery: [],
        inventory: [] // Optional if tracking inventory images separately here
    },

    // Step 8
    contacts: {
        receptionPhone: '',
        managerPhone: '',
        emergencyContact: ''
    },

    // Step 9
    policies: {
        checkInPolicy: '',
        cancellationPolicy: '',
        idRequirement: '',
        genderRules: '',
        partiesAllowed: false,
        petsAllowed: false,
        smokingAllowed: false,
        alcoholAllowed: false
    },

    // Step 10
    documents: {
        ownershipProof: '',
        businessRegistration: '',
        fireSafety: ''
    },

    status: 'draft',
    isLive: false
};

const usePartnerStore = create(
    devtools(
        persist(
            (set) => ({
                currentStep: 1,
                totalSteps: 11,
                formData: INITIAL_DATA,
                setStep: (step) => set({ currentStep: step }),
                nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, state.totalSteps) })),
                prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 1) })),
                updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
                updatePolicies: (updates) => set((state) => ({
                    formData: {
                        ...state.formData,
                        policies: { ...(state.formData.policies || {}), ...updates }
                    }
                })),
                updateDetails: (updates) => set((state) => ({
                    formData: {
                        ...state.formData,
                        details: { ...(state.formData.details || {}), ...updates }
                    }
                })),
                resetForm: () => set({ currentStep: 1, formData: INITIAL_DATA }),

                // Room Management Actions
                addRoom: (room) => set((state) => ({
                    formData: {
                        ...state.formData,
                        rooms: [...(state.formData.rooms || []), {
                            ...room,
                            id: room.id || Date.now().toString(),
                            images: room.images || [],
                            createdAt: new Date()
                        }]
                    }
                })),
                updateRoom: (roomId, updates) => set((state) => ({
                    formData: {
                        ...state.formData,
                        rooms: (state.formData.rooms || []).map(r => r.id === roomId ? { ...r, ...updates } : r)
                    }
                })),
                deleteRoom: (roomId) => set((state) => ({
                    formData: {
                        ...state.formData,
                        rooms: (state.formData.rooms || []).filter(r => r.id !== roomId)
                    }
                })),
                clearCurrentStep: (mode = 'signup') => set((state) => {
                    const step = state.currentStep;
                    const newData = { ...state.formData };

                    if (mode === 'signup') {
                        if (step === 1) {
                            newData.full_name = '';
                            newData.email = '';
                            newData.phone = '';
                            newData.termsAccepted = false;
                            newData.referralCode = '';
                        } else if (step === 2) {
                            newData.aadhaar_number = '';
                            newData.aadhaar_front = { url: '', publicId: '' };
                            newData.aadhaar_back = { url: '', publicId: '' };
                            newData.pan_number = '';
                            newData.pan_card_image = { url: '', publicId: '' };
                        }
                    } else if (mode === 'join') {
                        if (step === 1) {
                            newData.propertyCategory = '';
                            newData.bookingType = '';
                            newData.inventoryType = '';
                        } else if (step === 2) {
                            newData.name = '';
                            newData.description = '';
                            newData.shortDescription = '';
                        } else if (step === 3) {
                            newData.address = {
                                addressLine: '',
                                city: '',
                                state: '',
                                pincode: '',
                                coordinates: { lat: 20.5937, lng: 78.9629 }
                            };
                        } else if (step === 4) {
                            newData.config = {};
                        } else if (step === 5) {
                            newData.inventory = [];
                            newData.pricing = { basePrice: '', extraGuestPrice: '', cleaningFee: '' };
                        } else if (step === 6) {
                            newData.amenities = [];
                        } else if (step === 7) {
                            newData.images = { cover: '', gallery: [], inventory: [] };
                        } else if (step === 8) {
                            newData.contacts = { receptionPhone: '', managerPhone: '', emergencyContact: '' };
                        } else if (step === 9) {
                            newData.policies = {
                                checkInPolicy: '',
                                cancellationPolicy: '',
                                idRequirement: '',
                                genderRules: '',
                                partiesAllowed: false,
                                petsAllowed: false,
                                smokingAllowed: false,
                                alcoholAllowed: false
                            };
                        } else if (step === 10) {
                            newData.documents = { ownershipProof: '', businessRegistration: '', fireSafety: '' };
                        }
                    }

                    return { formData: newData };
                }),
            }),
            {
                name: 'partner-registration-storage', // unique name
            }
        )
    )
);

export default usePartnerStore;
