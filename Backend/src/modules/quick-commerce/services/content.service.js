import mongoose from 'mongoose';
import { QuickCategory } from '../models/category.model.js';
import { QuickProduct } from '../models/product.model.js';

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

  return collection.findOne(query, { sort: { updatedAt: -1, createdAt: -1 } });
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

  return collection.find(query).sort({ order: 1, createdAt: 1 }).toArray();
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
