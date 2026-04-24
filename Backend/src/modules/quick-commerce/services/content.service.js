import mongoose from 'mongoose';
import { QuickCategory } from '../models/category.model.js';
import { QuickProduct } from '../models/product.model.js';
import { QuickExperienceSection } from '../models/experience.model.js';
import { QuickHeroConfig } from '../models/heroConfig.model.js';

const getCollection = (name) => mongoose.connection?.db?.collection(name) || null;

const toIdString = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const normalizeStatusQuery = () => ({
  $or: [
    { status: { $exists: false } },
    { status: 'active' },
    { isActive: true },
  ],
});

const approvedOrLegacyFilter = {
  $or: [
    { approvalStatus: { $exists: false } },
    { approvalStatus: 'approved' },
  ],
};

export const getQuickSettings = async () => {
  const collection = getCollection('quick_settings');
  if (!collection) return null;
  return collection.findOne({}, { sort: { updatedAt: -1, createdAt: -1 } });
};

export const getQuickHeroConfig = async ({ pageType = 'home', headerId = null } = {}) => {
  const collection = getCollection('quick_hero_configs');
  if (!collection) return null;

  const query = { pageType };
  if (pageType === 'header') {
    query.headerId = headerId ? String(headerId) : null;
  }

  return QuickHeroConfig.findOne(query).sort({ updatedAt: -1, createdAt: -1 }).lean();
};

export const setQuickHeroConfig = async (data) => {
  const query = { pageType: data.pageType };
  if (data.pageType === 'header') {
    query.headerId = data.headerId ? String(data.headerId) : null;
  }

  return QuickHeroConfig.findOneAndUpdate(
    query,
    { $set: data },
    { upsert: true, new: true }
  ).lean();
};

export const getQuickExperienceSections = async ({ pageType = 'home', headerId = null } = {}) => {
  const collection = getCollection('quick_experience_sections');
  if (!collection) return [];

  const query = {
    pageType,
    ...normalizeStatusQuery(),
  };

  if (pageType === 'header') {
    query.headerId = headerId ? String(headerId) : null;
  }

  const sections = await QuickExperienceSection.find(query).sort({ order: 1, createdAt: 1 }).lean();
  if (!sections.length) return [];

  // Hydrate data
  const productIds = new Set();
  const categoryIds = new Set();
  const subcategoryIds = new Set();

  sections.forEach((section) => {
    const { config = {} } = section;
    const typeConfig = config[section.displayType] || config; // Handle both nested and flat
    
    // Banners
    const bannerItems = typeConfig.banners?.items || typeConfig.items || [];

    // Categories
    const catIds = typeConfig.categoryIds || [];
    catIds.forEach(id => {
      const nid = toIdString(id);
      if (nid) categoryIds.add(nid);
    });

    // Subcategories
    const subcatIds = typeConfig.subcategoryIds || [];
    subcatIds.forEach(id => {
      const nid = toIdString(id);
      if (nid) subcategoryIds.add(nid);
    });

    // Products
    const prodIds = typeConfig.productIds || [];
    prodIds.forEach(id => {
      const nid = toIdString(id);
      if (nid) productIds.add(nid);
    });
  });

  const [products, categories] = await Promise.all([
    productIds.size
      ? QuickProduct.find({ _id: { $in: Array.from(productIds) }, ...approvedOrLegacyFilter, isActive: true }).lean()
      : Promise.resolve([]),
    (categoryIds.size || subcategoryIds.size)
      ? QuickCategory.find({
          _id: { $in: Array.from(new Set([...Array.from(categoryIds), ...Array.from(subcategoryIds)])) },
          isActive: true
        }).lean()
      : Promise.resolve([]),
  ]);

  const productsById = new Map(products.map((p) => [String(p._id), p]));
  const categoriesById = new Map(categories.map((c) => [String(c._id), c]));

  return sections.map((section) => {
    const { config = {} } = section;
    const typeConfig = config[section.displayType] || config;
    const newConfig = { ...config };

    if (section.displayType === 'categories') {
      const target = config.categories ? { ...config.categories } : { ...config };
      target.items = (target.categoryIds || [])
          .map(id => categoriesById.get(toIdString(id)))
          .filter(Boolean);
      
      if (config.categories) newConfig.categories = target;
      else Object.assign(newConfig, target);
    }

    if (section.displayType === 'subcategories') {
      const target = config.subcategories ? { ...config.subcategories } : { ...config };
      target.items = (target.subcategoryIds || [])
          .map(id => categoriesById.get(toIdString(id)))
          .filter(Boolean);
      
      if (config.subcategories) newConfig.subcategories = target;
      else Object.assign(newConfig, target);
    }

    if (section.displayType === 'products') {
      const target = config.products ? { ...config.products } : { ...config };
      target.items = (target.productIds || [])
          .map(id => productsById.get(toIdString(id)))
          .filter(Boolean);
      
      if (config.products) newConfig.products = target;
      else Object.assign(newConfig, target);
    }

    // For banners, we just ensure they are in the right place if they were flat
    if (section.displayType === 'banners' && !config.banners && config.items) {
       // We don't necessarily need to move them to config.banners, 
       // but we should make sure the items are there.
    }

    return {
      ...section,
      config: newConfig
    };
  });
};

export const createQuickExperienceSection = async (data) => {
  // Get max order to append at end
  const maxSection = await QuickExperienceSection.findOne({
    pageType: data.pageType,
    headerId: data.headerId || null
  }).sort({ order: -1 });
  
  const order = (maxSection?.order ?? -1) + 1;
  return QuickExperienceSection.create({ ...data, order });
};

export const updateQuickExperienceSection = async (id, data) => {
  return QuickExperienceSection.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
};

export const deleteQuickExperienceSection = async (id) => {
  return QuickExperienceSection.findByIdAndDelete(id);
};

export const reorderQuickExperienceSections = async (items = []) => {
  const ops = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { order: item.order } },
    },
  }));
  if (!ops.length) return;
  return QuickExperienceSection.bulkWrite(ops);
};

export const getQuickCoupons = async () => {
  const collection = getCollection('quick_coupons');
  if (!collection) return [];
  return collection.find(normalizeStatusQuery()).sort({ updatedAt: -1, createdAt: -1 }).toArray();
};

export const getQuickOffers = async () => {
  const collection = getCollection('quick_offers');
  if (!collection) return [];
  return collection.find(normalizeStatusQuery()).sort({ updatedAt: -1, createdAt: -1 }).toArray();
};

export const getQuickOfferSections = async () => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) return [];

  const sections = await collection
    .find(normalizeStatusQuery())
    .sort({ order: 1, createdAt: 1 })
    .toArray();

  if (!sections.length) return [];

  const productIds = new Set();
  const categoryIds = new Set();

  sections.forEach((section) => {
    const rawProductIds = Array.isArray(section.productIds) ? section.productIds : [];
    rawProductIds.forEach((id) => {
      const normalized = toIdString(id);
      if (normalized) productIds.add(normalized);
    });

    const rawCategoryIds = Array.isArray(section.categoryIds)
      ? section.categoryIds
      : section.categoryId
        ? [section.categoryId]
        : [];

    rawCategoryIds.forEach((id) => {
      const normalized = toIdString(id);
      if (normalized) categoryIds.add(normalized);
    });
  });

  const [products, categories] = await Promise.all([
    productIds.size
      ? QuickProduct.find({ _id: { $in: Array.from(productIds) }, ...approvedOrLegacyFilter, isActive: true }).lean()
      : Promise.resolve([]),
    categoryIds.size
      ? QuickCategory.find({
          _id: { $in: Array.from(categoryIds) },
          isActive: true,
          $or: [
            { type: { $ne: 'subcategory' } },
            approvedOrLegacyFilter,
          ],
        }).lean()
      : Promise.resolve([]),
  ]);

  const productsById = new Map(products.map((product) => [String(product._id), product]));
  const categoriesById = new Map(categories.map((category) => [String(category._id), category]));

  return sections.map((section) => {
    const hydratedCategoryIds = (Array.isArray(section.categoryIds) ? section.categoryIds : [])
      .map((id) => categoriesById.get(toIdString(id)) || id);

    const hydratedCategory =
      categoriesById.get(toIdString(section.categoryId)) || section.categoryId || null;

    const hydratedProducts = (Array.isArray(section.productIds) ? section.productIds : [])
      .map((id) => productsById.get(toIdString(id)) || id);

    return {
      ...section,
      categoryId: hydratedCategory,
      categoryIds: hydratedCategoryIds,
      productIds: hydratedProducts,
    };
  });
};
