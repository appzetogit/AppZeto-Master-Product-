import ReferralCode from '../models/ReferralCode.js';
import ReferralProgram from '../models/ReferralProgram.js';
import ReferralTracking from '../models/ReferralTracking.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';
import notificationService from './notificationService.js';
import emailService from './emailService.js';
import mongoose from 'mongoose';

class ReferralService {

    /**
     * Helper to get or create a default active program
     */
    async getOrCreateActiveProgram(role = 'user') {
        try {
            let program = await ReferralProgram.findOne({ isActive: true, eligibleRoles: role });
            if (!program) {
                program = await ReferralProgram.create({
                    name: `Standard Referral Program ${role.toUpperCase()}`,
                    rewardAmount: 100,
                    triggerType: 'first_booking',
                    eligibleRoles: [role],
                    isActive: true,
                    description: 'Get rewarded for inviting friends!'
                });
            }
            return program;
        } catch (error) {
            console.error("Get/Create Program Error:", error);
            return null;
        }
    }

    /**
     * Generates a unique referral code for a user/partner
     * format: NAME + Random Numbers (e.g., JOHN402)
     */
    async generateCodeForUser(user) {
        try {
            // Check if user is partner - Partners don't have referral codes now
            if (user.role === 'partner') {
                return null;
            }

            // Check if already exists
            const existing = await ReferralCode.findOne({
                ownerId: user._id,
                ownerType: 'HotelUser'
            });
            if (existing) return existing;

            // Find active program
            const program = await this.getOrCreateActiveProgram('user');

            // Sanitized name prefix (first 4 chars of name or 'USER')
            const prefix = (user.name || 'USER').replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4);
            let uniqueCode;
            let isUnique = false;

            // Try 10 times to generate unique code
            for (let i = 0; i < 10; i++) {
                const randomNum = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                const candidate = `${prefix}${randomNum}`;
                const check = await ReferralCode.findOne({ code: candidate });
                if (!check) {
                    uniqueCode = candidate;
                    isUnique = true;
                    break;
                }
            }

            if (!isUnique) {
                // Fallback to timestamp if name collision is high
                uniqueCode = `${prefix}${Date.now().toString().slice(-6)}`;
            }

            const newCode = await ReferralCode.create({
                code: uniqueCode,
                ownerId: user._id,
                ownerType: 'HotelUser',
                referralProgramId: program?._id
            });

            return newCode;
        } catch (error) {
            console.error("Generate Referral Code Error:", error);
            throw error;
        }
    }

    /**
     * Called during Signup.
     * Tracks the referral as PENDING.
     */
    async processReferralSignup(newUser, referralCodeString) {
        try {
            console.log(`[REFERRAL_DEBUG] Processing signup for user: ${newUser._id}, Code: ${referralCodeString}`);
            if (!referralCodeString) return null;

            const code = await ReferralCode.findOne({ code: referralCodeString.toUpperCase(), isActive: true });
            if (!code) {
                console.warn(`[REFERRAL_DEBUG] Invalid referral code used: ${referralCodeString}`);
                return null;
            }
            console.log(`[REFERRAL_DEBUG] Found valid code: ${code.code}, Owner: ${code.ownerId}`);

            // self-referral check
            if (code.ownerId.toString() === newUser._id.toString()) {
                console.warn(`Self-referral attempted by ${newUser._id}`);
                return null;
            }

            // Partner Referral Restriction: Partners cannot be referred
            if (newUser.role === 'partner') {
                console.warn(`[REFERRAL_DEBUG] Partner signup attempted with referral code. Skipping referral logic for partner.`);
                return null;
            }

            // Check if already referred (should be unique per user)
            const existing = await ReferralTracking.findOne({ referredUserId: newUser._id });
            if (existing) return null;

            // Get Active Program
            let program = await this.getOrCreateActiveProgram(newUser.role);

            if (!program) {
                console.warn("No active referral program found.");
                return null;
            }

            // Create Tracking Record
            const tracking = await ReferralTracking.create({
                referrerId: code.ownerId,
                referrerModel: code.ownerType,
                referredUserId: newUser._id,
                referredUserModel: newUser.role === 'partner' ? 'HotelPartner' : 'HotelUser',
                referralCodeId: code._id,
                referralProgramId: program._id,
                status: 'pending',
                rewardAmount: program.rewardAmount,
                triggerType: program.triggerType || 'first_booking'
            });

            console.log(`[REFERRAL_DEBUG] Created Tracking Record: ${tracking._id}`);

            // Increment usage count
            code.usageCount += 1;
            await code.save();
            console.log(`[REFERRAL_DEBUG] Incremented usage count for code: ${code.code}`);

            return true;
        } catch (error) {
            console.error("[REFERRAL_DEBUG] Process Referral Signup Error:", error);
            // Don't block signup if referral fails
            return null;
        }
    }

    /**
     * Called when a booking is completed.
     * Checks if this triggers a reward unlock.
     */
    async processBookingCompletion(userId, bookingId) {
        try {
            console.log(`[REFERRAL_DEBUG] Processing booking completion for user: ${userId}, Booking: ${bookingId}`);
            // Find pending referral for this user
            const referral = await ReferralTracking.findOne({
                referredUserId: userId,
                status: 'pending'
            });

            if (!referral) {
                console.log(`[REFERRAL_DEBUG] No pending referral tracking found for user: ${userId}`);
                return;
            }

            console.log(`[REFERRAL_DEBUG] Found pending referral: ${referral._id}, Program: ${referral.referralProgramId}`);

            // Check Program Trigger
            const program = await ReferralProgram.findById(referral.referralProgramId);
            if (!program || program.triggerType !== 'first_booking') {
                console.log(`[REFERRAL_DEBUG] Program trigger is not 'first_booking' or program not found`);
                return;
            }

            // Unlock Reward
            referral.status = 'completed';
            referral.completedAt = new Date();
            referral.triggerBookingId = bookingId;
            await referral.save();
            console.log(`[REFERRAL_DEBUG] Referral status updated to COMPLETED`);

            // Credit Wallet of Referrer
            const wallet = await this.getOrCreateWallet(referral.referrerId, referral.referrerModel);
            await wallet.credit(
                referral.rewardAmount,
                `Referral Reward for ${referral.referredUserId}`,
                referral._id.toString(),
                'referral_bonus'
            );
            console.log(`[REFERRAL_DEBUG] Credited Referrer Wallet: ${referral.referrerId}, Amount: ${referral.rewardAmount}`);

            // ALSO Credit Referee (User who booked) - Prompt said "You Both Earn" in the UI Text
            // The UI says "You Both Earn ₹100". So we should credit the new user too.
            const refereeWallet = await this.getOrCreateWallet(referral.referredUserId, referral.referredUserModel);
            await refereeWallet.credit(
                referral.rewardAmount,
                `Referral Bonus (Welcome Gift)`,
                referral._id.toString(),
                'referral_bonus'
            );
            console.log(`[REFERRAL_DEBUG] Credited Referee Wallet: ${referral.referredUserId}, Amount: ${referral.rewardAmount}`);

            // Send Notifications
            if (referral.referrerModel === 'HotelPartner') {
                await notificationService.sendToPartner(referral.referrerId, {
                    title: 'Referral Reward Unlocked! 💰',
                    body: `You earned ₹${referral.rewardAmount} because your friend completed their first stay!`
                }, { type: 'referral_reward' });
            } else {
                await notificationService.sendToUser(referral.referrerId, {
                    title: 'Referral Reward Unlocked! 🎁',
                    body: `You earned ₹${referral.rewardAmount} because your friend completed their first stay!`
                }, { type: 'referral_reward' }, 'user');
            }

            const refereeRole = referral.referredUserModel.toLowerCase();
            await notificationService.sendToUser(referral.referredUserId, {
                title: 'Welcome Bonus Unlocked! 🎉',
                body: `You earned ₹${referral.rewardAmount} for completing your first stay!`
            }, { type: 'referral_reward' }, refereeRole).catch(e => console.error(e));

            // EMAIL: Notify Referrer
            try {
                const User = mongoose.model('HotelUser');
                const Partner = mongoose.model('HotelPartner');
                let referrer = await User.findById(referral.referrerId);
                if (!referrer) referrer = await Partner.findById(referral.referrerId);

                const refereeModel = mongoose.model(referral.referredUserModel);
                const friend = await refereeModel.findById(referral.referredUserId);

                if (referrer && referrer.email && friend) {
                    emailService.sendReferralEarnedEmail(referrer, friend.name, referral.rewardAmount).catch(e => console.error(e));
                }
            } catch (err) {
                console.error('Referral Email trigger failed:', err);
            }

        } catch (error) {
            console.error("Process Booking Completion Error:", error);
        }
    }

    /**
     * Helper to get wallet
     */
    async getOrCreateWallet(userId, modelType) {
        let role = modelType.toLowerCase();
        // Map 'HotelPartner' modelType to 'partner' role, 'HotelUser' to 'user'
        if (role === 'admin') role = 'admin';

        let wallet = await Wallet.findOne({ partnerId: userId, role });
        if (!wallet) {
            wallet = await Wallet.create({
                partnerId: userId,
                role,
                balance: 0
            });
        }
        return wallet;
    }

    /**
     * Get User Stats for UI
     */
    async getReferralStats(userId) {
        try {
            console.log(`[REFERRAL_DEBUG] Fetching stats for user: ${userId}`);
            // 1. Get My Code
            let myCode = await ReferralCode.findOne({ ownerId: userId });

            // Lazy generate if not exists
            if (!myCode) {
                const User = mongoose.model('HotelUser');
                const Partner = mongoose.model('HotelPartner');
                let user = await User.findById(userId);
                if (!user) user = await Partner.findById(userId);

                if (user) {
                    myCode = await this.generateCodeForUser(user);
                }
            }

            // 2. Stats
            const totalReferrals = await ReferralTracking.countDocuments({ referrerId: userId });
            const completedReferrals = await ReferralTracking.countDocuments({ referrerId: userId, status: 'completed' });

            // UI Mapping:
            // Invited -> Total usage of code (Signups initiated)
            // Joined -> Total tracking records (Signups completed)
            // Bookings -> Status 'completed'
            const stats = {
                invited: myCode ? myCode.usageCount : 0,
                joined: totalReferrals,
                bookings: completedReferrals
            };

            // 3. Earnings
            const User = mongoose.model('HotelUser');
            const Partner = mongoose.model('HotelPartner');
            let userObj = await User.findById(userId);
            if (!userObj) userObj = await Partner.findById(userId);

            const wallet = await Wallet.findOne({ partnerId: userId, role: userObj?.role || 'user' });

            // Sum pending rewards
            const pendingReferrals = await ReferralTracking.find({
                referrerId: userId,
                status: 'pending'
            });
            const pendingEarnings = pendingReferrals.reduce((sum, ref) => sum + ref.rewardAmount, 0);

            // Calculate This Month Earnings (from Wallet/Transactions)
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const Transaction = mongoose.model('HotelTransaction');
            const thisMonthCredits = await Transaction.find({
                partnerId: userId,
                category: 'referral_bonus',
                type: 'credit',
                createdAt: { $gte: startOfMonth }
            });
            const thisMonthEarnings = thisMonthCredits.reduce((sum, t) => sum + t.amount, 0);

            // 4. History
            const history = await ReferralTracking.find({ referrerId: userId })
                .populate('referredUserId', 'name')
                .sort({ createdAt: -1 })
                .limit(30);

            const formattedHistory = history.map(h => ({
                id: h._id,
                name: h.referredUserId ? h.referredUserId.name : 'New Friend',
                status: h.status,
                reward: h.rewardAmount,
                date: h.createdAt,
                avatar: h.referredUserId && h.referredUserId.name
                    ? h.referredUserId.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : 'RU'
            }));

            return {
                code: myCode ? myCode.code : '',
                link: myCode ? `https://play.google.com/store/apps/details?id=com.rukkoin.user&referral=${myCode.code}` : '',
                stats,
                history: formattedHistory,
                earningsTotal: wallet ? wallet.totalEarnings : 0,
                earningsPending: pendingEarnings,
                earningsThisMonth: thisMonthEarnings
            };
        } catch (error) {
            console.error("Get Referral Stats Service Error:", error);
            throw error;
        }
    }

}

export default new ReferralService();
