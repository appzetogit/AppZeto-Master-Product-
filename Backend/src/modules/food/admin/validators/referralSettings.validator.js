import { z } from 'zod';
import { ValidationError } from '../../../../core/auth/errors.js';

const rewardBucketSchema = z.object({
    referrerReward: z.number().min(0),
    refereeReward: z.number().min(0),
    limit: z.number().min(0)
});

const schema = z.object({
    user: rewardBucketSchema,
    delivery: rewardBucketSchema,
    isActive: z.boolean().optional()
});

const toOptionalNumber = (value) => (
    value === undefined || value === null || value === ''
        ? undefined
        : Number(value)
);

const normalizeLegacyRewardBucket = (body, prefix) => {
    const legacyReward = toOptionalNumber(body?.[`referralReward${prefix}`]);
    const legacyReferrerReward = toOptionalNumber(body?.[`referralReward${prefix}Referrer`]);
    const legacyRefereeReward = toOptionalNumber(body?.[`referralReward${prefix}Referee`]);
    const legacyLimit = toOptionalNumber(body?.[`referralLimit${prefix}`]);

    return {
        referrerReward: legacyReferrerReward ?? legacyReward,
        refereeReward: legacyRefereeReward,
        limit: legacyLimit
    };
};

export const validateReferralSettingsUpsertDto = (body) => {
    const userLegacy = normalizeLegacyRewardBucket(body, 'User');
    const deliveryLegacy = normalizeLegacyRewardBucket(body, 'Delivery');

    const normalized = {
        user: {
            referrerReward: toOptionalNumber(body?.user?.referrerReward) ?? userLegacy.referrerReward ?? 0,
            refereeReward: toOptionalNumber(body?.user?.refereeReward) ?? userLegacy.refereeReward ?? 0,
            limit: toOptionalNumber(body?.user?.limit) ?? userLegacy.limit ?? 0
        },
        delivery: {
            referrerReward: toOptionalNumber(body?.delivery?.referrerReward) ?? deliveryLegacy.referrerReward ?? 0,
            refereeReward: toOptionalNumber(body?.delivery?.refereeReward) ?? deliveryLegacy.refereeReward ?? 0,
            limit: toOptionalNumber(body?.delivery?.limit) ?? deliveryLegacy.limit ?? 0
        },
        isActive: body?.isActive !== undefined ? Boolean(body.isActive) : undefined
    };

    const result = schema.safeParse(normalized);
    if (!result.success) {
        throw new ValidationError(result.error.errors[0].message);
    }
    return result.data;
};
