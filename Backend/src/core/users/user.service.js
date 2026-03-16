import { ZomatoUser } from './user.model.js';
import { buildPaginationOptions, buildPaginatedResult } from '../../utils/helpers.js';

export const findOrCreateUserByPhone = async ({ phone, countryCode = '+91' }) => {
    let user = await ZomatoUser.findOne({ phone }).lean();

    if (!user) {
        const created = await ZomatoUser.create({ phone, countryCode });
        user = created.toObject();
    }

    return user;
};

export const getUsers = async (query) => {
    const { page, limit, skip } = buildPaginationOptions(query);

    const [docs, total] = await Promise.all([
        ZomatoUser.find().skip(skip).limit(limit).lean(),
        ZomatoUser.countDocuments()
    ]);

    return buildPaginatedResult({ docs, total, page, limit });
};

