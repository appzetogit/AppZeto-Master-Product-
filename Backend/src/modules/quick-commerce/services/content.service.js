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
  $and: [
    {
      $or: [
        { status: 'active' },
        { status: { $exists: false } },
        { isActive: true },
        { isActive: { $exists: false } },
      ],
    },
  ],
});

const approvedOrLegacyFilter = {
  $and: [
    {
      $or: [
        { approvalStatus: 'approved' },
        { approvalStatus: { $exists: false } },
      ],
    },
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

  // Fetch all categories once to build a recursive lookup for products
  const allCategories = await QuickCategory.find(normalizeStatusQuery()).lean();
  const categoryMap = new Map(allCategories.map(c => [String(c._id), c]));
  const childrenMap = new Map();
  allCategories.forEach(c => {
    if (c.parentId) {
      const pid = String(c.parentId);
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid).push(c);
    }
  });

  const getRecursiveChildIds = (catId, seen = new Set()) => {
    const id = String(catId);
    if (seen.has(id)) return [];
    seen.add(id);
    
    let ids = [id];
    const children = childrenMap.get(id) || [];
    children.forEach(child => {
      ids = [...ids, ...getRecursiveChildIds(child._id, seen)];
    });
    return ids;
  };

  // Hydrate data
  const productIds = new Set();
  const categoryIds = new Set();
  const subcategoryIds = new Set();
  
  const dynamicProductCategoryIds = new Set();
  const dynamicProductSubcategoryIds = new Set();

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

    // If products type and no explicit products, collect categories for dynamic fetch
    if (section.displayType === 'products' && (!prodIds || prodIds.length === 0)) {
       catIds.forEach(id => {
         const nid = toIdString(id);
         if (nid) {
            getRecursiveChildIds(nid).forEach(childId => dynamicProductCategoryIds.add(childId));
         }
       });
       subcatIds.forEach(id => {
         const nid = toIdString(id);
         if (nid) {
            getRecursiveChildIds(nid).forEach(childId => dynamicProductSubcategoryIds.add(childId));
         }
       });
    }
  });

  const [products, categories] = await Promise.all([
    (productIds.size || dynamicProductCategoryIds.size || dynamicProductSubcategoryIds.size)
      ? QuickProduct.find({ 
          $and: [
            { 
              $or: [
                { _id: { $in: Array.from(productIds) } },
                { categoryId: { $in: Array.from(dynamicProductCategoryIds) } },
                { subcategoryId: { $in: Array.from(dynamicProductSubcategoryIds) } },
                { headerId: { $in: Array.from(dynamicProductCategoryIds) } }
              ]
            },
            approvedOrLegacyFilter,
            { 
              $or: [
                { isActive: true },
                { isActive: { $exists: false } }
              ]
            }
          ]
        }).sort({ createdAt: -1 }).limit(300).lean()
      : Promise.resolve([]),
    (categoryIds.size || subcategoryIds.size)
      ? QuickCategory.find({
          _id: { $in: Array.from(new Set([...Array.from(categoryIds), ...Array.from(subcategoryIds)])) },
          $or: [
            { isActive: true },
            { isActive: { $exists: false } }
          ]
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
      
      newConfig.categories = target;
    }

    if (section.displayType === 'subcategories') {
      const target = config.subcategories ? { ...config.subcategories } : { ...config };
      target.items = (target.subcategoryIds || [])
          .map(id => categoriesById.get(toIdString(id)))
          .filter(Boolean);
      
      newConfig.subcategories = target;
    }

    if (section.displayType === 'products') {
      const target = config.products ? { ...config.products } : { ...config };
      const explicitItems = (target.productIds || [])
          .map(id => productsById.get(toIdString(id)))
          .filter(Boolean);
      
      if (explicitItems.length > 0) {
        target.items = explicitItems;
      } else {
        // Fallback: Dynamic products based on categories
        const sectionCatIds = new Set((target.categoryIds || []).map(toIdString).filter(Boolean));
        const sectionSubcatIds = new Set((target.subcategoryIds || []).map(toIdString).filter(Boolean));
        
        // Include children in the section set for filtering
        const expandedCatIds = new Set();
        sectionCatIds.forEach(id => getRecursiveChildIds(id).forEach(cid => expandedCatIds.add(cid)));
        const expandedSubcatIds = new Set();
        sectionSubcatIds.forEach(id => getRecursiveChildIds(id).forEach(cid => expandedSubcatIds.add(cid)));

        target.items = products.filter(p => 
          expandedCatIds.has(toIdString(p.categoryId)) || 
          expandedSubcatIds.has(toIdString(p.subcategoryId)) ||
          expandedCatIds.has(toIdString(p.headerId))
        ).slice(0, (target.rows || 1) * (target.columns || 4) || 20);
      }
      
      // Always put in .products for frontend consistency
      newConfig.products = target;
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

export const getQuickOfferSections = async (query = {}) => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) return [];

  const filter = normalizeStatusQuery();
  if (query.status && query.status !== 'all') {
    // Override normalizeStatusQuery if explicit status is provided
    filter.$and = filter.$and.filter(f => !f.status);
    filter.$and.push({ status: query.status });
  }

  const sections = await collection
    .find(filter)
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
      ? QuickProduct.find({ _id: { $in: Array.from(productIds) } }).lean()
      : Promise.resolve([]),
    categoryIds.size
      ? QuickCategory.find({ _id: { $in: Array.from(categoryIds) } }).lean()
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

export const createQuickOfferSection = async (data) => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) throw new Error('Collection not found');

  const section = {
    ...data,
    order: data.order ?? 0,
    status: data.status || 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await collection.insertOne(section);
  return { ...section, _id: result.insertedId };
};

export const updateQuickOfferSection = async (id, data) => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) throw new Error('Collection not found');

  const update = {
    ...data,
    updatedAt: new Date(),
  };
  delete update._id;

  const result = await collection.findOneAndUpdate(
    { _id: toId(id) },
    { $set: update },
    { returnDocument: 'after' }
  );

  return result;
};

export const deleteQuickOfferSection = async (id) => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) throw new Error('Collection not found');

  await collection.deleteOne({ _id: toId(id) });
  return true;
};

export const reorderQuickOfferSections = async (items = []) => {
  const collection = getCollection('quick_offer_sections');
  if (!collection) throw new Error('Collection not found');

  const ops = items.map((item) => ({
    updateOne: {
      filter: { _id: toId(item.id) },
      update: { $set: { order: item.order, updatedAt: new Date() } },
    },
  }));

  if (ops.length > 0) {
    await collection.bulkWrite(ops);
  }
  return true;
};

export const getQuickCategories = async (query = {}) => {
  const filter = normalizeStatusQuery();

  if (query.parentId) {
    filter.$and.push({ parentId: query.parentId });
  }

  const categories = await QuickCategory.find(filter)
    .sort({ order: 1, name: 1 })
    .lean();

  return categories;
};
