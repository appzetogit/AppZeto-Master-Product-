import referralService from '../services/referralService.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralCode from '../models/ReferralCode.js';

export const getMyReferral = async (req, res) => {
    try {
        const data = await referralService.getReferralStats(req.user._id);
        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Get My Referral Error:', error);
        res.status(500).json({ message: 'Failed to fetch referral data' });
    }
};

export const createReferralProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.create(req.body);
        res.status(201).json({ success: true, program });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getActiveProgram = async (req, res) => {
    try {
        const program = await ReferralProgram.findOne({ isActive: true });
        res.json({ success: true, program });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const generateCustomCode = async (req, res) => {
    try {
        const { code, userId, role } = req.body;
        // Admin only function
        const newCode = await ReferralCode.create({
            code: code.toUpperCase(),
            ownerId: userId, // ID of user receiving the code
            ownerType: role === 'partner' ? 'HotelPartner' : 'HotelUser',
            isActive: true,
            isCustom: true
        });
        res.json({ success: true, code: newCode });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
