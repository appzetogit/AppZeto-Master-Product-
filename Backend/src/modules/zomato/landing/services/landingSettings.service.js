import { ZomatoLandingSettings } from '../models/landingSettings.model.js';

export const getLandingSettings = async () => {
    let doc = await ZomatoLandingSettings.findOne().lean();
    if (!doc) {
        doc = (await ZomatoLandingSettings.create({})).toObject();
    }
    return doc;
};

export const updateLandingSettings = async (payload) => {
    const doc = await ZomatoLandingSettings.findOneAndUpdate({}, payload, {
        new: true,
        upsert: true
    }).lean();
    return doc;
};
