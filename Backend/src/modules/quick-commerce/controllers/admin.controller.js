import mongoose from 'mongoose';
import { QuickCategory } from '../models/category.model.js';
import { QuickProduct } from '../models/product.model.js';
import { QuickOrder } from '../models/order.model.js';
import { Seller } from '../seller/models/seller.model.js';
import { SellerOrder } from '../seller/models/sellerOrder.model.js';
import { QuickZone } from '../models/quick_zone.model.js';
import { ensureQuickCommerceSeedData } from '../services/seed.service.js';
import { uploadImageBuffer } from '../../../services/cloudinary.service.js';
import { getIO, rooms } from '../../../config/socket.js';
import {
  getQuickExperienceSections,
  createQuickExperienceSection,
  updateQuickExperienceSection,
  deleteQuickExperienceSection,
  reorderQuickExperienceSections,
  setQuickHeroConfig,
  getQuickHeroConfig,
  getQuickOfferSections,
  createQuickOfferSection,
  updateQuickOfferSection,
  deleteQuickOfferSection,
  reorderQuickOfferSections,
} from '../services/content.service.js';

const toCategory = (category) => ({
  id: category._id,
  _id: category._id,
  name: category.name,
  slug: category.slug,
  image: category.image,
  accentColor: category.accentColor,
  description: category.description || '',
  type: category.type || 'header',
  status: category.status || (category.isActive ? 'active' : 'inactive'),
  parentId: category.parentId || null,
  iconId: category.iconId || '',
  adminCommission: Number(category.adminCommission || 0),
  handlingFees: Number(category.handlingFees || 0),
  headerColor: category.headerColor || category.accentColor,
  sortOrder: category.sortOrder,
  isActive: category.isActive,
  approvalStatus: category.approvalStatus || 'approved',
  approvedAt: category.approvedAt || null,
});

const toProduct = (product) => ({
  id: product._id,
  _id: product._id,
  name: product.name,
  slug: product.slug,
  image: product.mainImage || product.image,
  mainImage: product.mainImage || product.image,
  galleryImages: Array.isArray(product.galleryImages) ? product.galleryImages : [],
  categoryId: product.categoryId,
  subcategoryId: product.subcategoryId || null,
  headerId: product.headerId || null,
  price: product.price,
  mrp: product.mrp,
  salePrice: product.salePrice || 0,
  unit: product.unit,
  description: product.description || '',
  stock: Number(product.stock || 0),
  status: product.status || (product.isActive ? 'active' : 'inactive'),
  brand: product.brand || '',
  weight: product.weight || '',
  sku: product.sku || '',
  tags: Array.isArray(product.tags) ? product.tags : [],
  variants: Array.isArray(product.variants) ? product.variants : [],
  isFeatured: Boolean(product.isFeatured),
  badge: product.badge,
  isActive: product.isActive,
  approvalStatus: product.approvalStatus || 'approved',
  approvedAt: product.approvedAt || null,
  sellerId: product.sellerId || null,
  seller: product.seller || null,
  storeName: product.storeName || '',
  restaurantName: product.restaurantName || '',
});

const buildProductSellerMap = async (products = []) => {
  const sellerIds = [...new Set(
    products
      .map((product) => String(product?.sellerId || '').trim())
      .filter(Boolean),
  )];

  if (!sellerIds.length) return {};

  const sellers = await Seller.find({ _id: { $in: sellerIds } })
    .select('_id shopName name')
    .lean();

  return sellers.reduce((acc, seller) => {
    acc[String(seller._id)] = seller;
    return acc;
  }, {});
};

const withProductSeller = (product, sellerMap = {}) => {
  const seller = sellerMap[String(product?.sellerId || '')] || null;
  const sellerInfo = seller
    ? {
        _id: seller._id,
        id: seller._id,
        name: seller.name || '',
        shopName: seller.shopName || seller.name || 'Store',
      }
    : null;

  return {
    ...product,
    sellerId: product?.sellerId || sellerInfo?._id || null,
    seller: sellerInfo,
    storeName: sellerInfo?.shopName || sellerInfo?.name || '',
    restaurantName: sellerInfo?.shopName || sellerInfo?.name || '',
  };
};

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBool = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

const parseVariants = (value = '[]') => {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.map((variant) => ({
      name: String(variant?.name || '').trim(),
      price: parseNumber(variant?.price, 0),
      salePrice: parseNumber(variant?.salePrice, 0),
      stock: parseNumber(variant?.stock, 0),
      sku: String(variant?.sku || '').trim(),
    })) : [];
  } catch {
    return [];
  }
};

const getCategoryImage = async (req) => {
  if (req.file?.buffer) {
    return uploadImageBuffer(req.file.buffer, 'quick-commerce/categories');
  }
  return String(req.body?.image || '').trim();
};

const getProductImages = async (req) => {
  const mainFile = req.files?.mainImage?.[0];
  const galleryFiles = Array.isArray(req.files?.galleryImages) ? req.files.galleryImages : [];

  const mainImage = mainFile?.buffer
    ? await uploadImageBuffer(mainFile.buffer, 'quick-commerce/products/main')
    : String(req.body?.mainImage || req.body?.image || '').trim();

  const existingGallery = []
    .concat(req.body?.galleryImages || [])
    .flat()
    .filter(Boolean)
    .map((value) => String(value).trim());

  const uploadedGallery = await Promise.all(
    galleryFiles.map((file) => uploadImageBuffer(file.buffer, 'quick-commerce/products/gallery'))
  );

  const galleryImages = [...existingGallery, ...uploadedGallery].filter(Boolean);

  return {
    mainImage,
    galleryImages,
    image: mainImage || galleryImages[0] || '',
  };
};

const buildCategoryTree = (categories) => {
  const byId = new Map();
  const roots = [];

  categories.forEach((category) => {
    byId.set(String(category._id), { ...toCategory(category), children: [] });
  });

  byId.forEach((category) => {
    const parentId = category.parentId ? String(category.parentId) : null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId).children.push(category);
    } else {
      roots.push(category);
    }
  });

  return roots;
};

const toSellerRequest = (seller) => ({
  id: seller._id,
  _id: seller._id,
  shopName: seller.shopName || seller.name || 'Store',
  ownerName: seller.name || 'Seller',
  email: seller.email || '',
  phone: seller.phoneLast10 || seller.phone || '',
  location: seller.location?.formattedAddress || seller.location?.address || '',
  category: seller.shopInfo?.businessType || 'General',
  applicationDate: seller.createdAt,
  status:
    seller.approvalStatus ||
    (seller.approved === false ? 'pending' : 'approved'),
  approved: seller.approved !== false,
  onboardingSubmitted: seller.onboardingSubmitted === true,
  serviceRadius: Number(seller.serviceRadius || 0),
  bankInfo: seller.bankInfo || {},
  documents: seller.documents || {},
  shopInfo: seller.shopInfo || {},
  approvalNotes: seller.approvalNotes || '',
});

export const getAdminStats = async (_req, res) => {
  await ensureQuickCommerceSeedData();

  const [categories, products, orders, revenueAgg] = await Promise.all([
    QuickCategory.countDocuments({ isActive: true }),
    QuickProduct.countDocuments({ isActive: true }),
    QuickOrder.countDocuments({ orderType: 'quick' }),
    QuickOrder.aggregate([
      { $match: { orderType: 'quick' } },
      { $group: { _id: null, total: { $sum: '$pricing.total' } } },
    ]),
  ]);

  return res.json({
    success: true,
    result: {
      categories,
      products,
      orders,
      revenue: Number(revenueAgg?.[0]?.total || 0),
    },
  });
};

export const getAdminCategories = async (_req, res) => {
  await ensureQuickCommerceSeedData();
  const {
    type,
    search,
    approvalStatus,
    tree,
    flat,
    page = 1,
    limit = 50,
  } = _req.query || {};

  const query = {};
  // If tree is requested, we fetch all (or by search) and filter roots by type in JS
  // to ensure children (which might be of different type) are included.
  if (type && String(tree) !== 'true') query.type = String(type);
  if (search) query.name = { $regex: String(search).trim(), $options: 'i' };
  if (approvalStatus && approvalStatus !== 'all') query.approvalStatus = String(approvalStatus);

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = String(tree) === 'true' ? 5000 : Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));

  const [categories, total] = await Promise.all([
    QuickCategory.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(String(tree) === 'true' ? 0 : (currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    QuickCategory.countDocuments(query),
  ]);

  const mapped = categories.map(toCategory);
  if (String(tree) === 'true') {
    let fullTree = buildCategoryTree(categories);
    console.log(`[getAdminCategories] Built tree with ${fullTree.length} roots from ${categories.length} raw categories`);
    if (type) {
      const originalCount = fullTree.length;
      // When filtering for headers in the tree, we allow any root category that is either explicitly marked as the type
      // OR has no type (which defaults to 'header' in the mapper).
      fullTree = fullTree.filter(root => 
        !root.parentId && 
        (String(root.type).toLowerCase() === String(type).toLowerCase() || !root.type || root.type === 'default')
      );
      console.log(`[getAdminCategories] Filtered roots by type ${type}: ${originalCount} -> ${fullTree.length}`);
    }
    return res.json({ success: true, results: fullTree });
  }
  if (String(flat) === 'true') {
    return res.json({ success: true, results: mapped });
  }

  return res.json({
    success: true,
    result: {
      items: mapped,
      page: currentPage,
      limit: perPage,
      total,
    },
    results: mapped,
  });
};

export const createCategory = async (req, res) => {
  const {
    name,
    accentColor,
    sortOrder,
    description,
    type,
    status,
    approvalStatus,
    parentId,
    iconId,
    adminCommission,
    handlingFees,
    headerColor,
  } = req.body || {};
  const image = await getCategoryImage(req);

  if (!name) {
    return res.status(400).json({ success: false, message: 'name is required' });
  }

  const baseSlug = slugify(name);
  const count = await QuickCategory.countDocuments({ slug: { $regex: `^${baseSlug}` } });
  const slug = count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;

  const category = await QuickCategory.create({
    name,
    slug,
    image,
    description: description || '',
    type: type || 'header',
    status: status || 'active',
    approvalStatus:
      type === 'subcategory'
        ? (approvalStatus || 'pending')
        : (approvalStatus || 'approved'),
    approvedAt:
      (type === 'subcategory' ? approvalStatus || 'pending' : approvalStatus || 'approved') === 'approved'
        ? new Date()
        : null,
    parentId: mongoose.isValidObjectId(parentId) ? parentId : null,
    iconId: iconId || '',
    adminCommission: parseNumber(adminCommission, 0),
    handlingFees: parseNumber(handlingFees, 0),
    headerColor: headerColor || accentColor || '#0c831f',
    accentColor: accentColor || '#0c831f',
    sortOrder: Number(sortOrder || 0),
    isActive: (status || 'active') === 'active',
  });

  return res.status(201).json({ success: true, result: toCategory(category) });
};

export const updateCategory = async (req, res) => {
  const category = await QuickCategory.findById(req.params.categoryId);
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const image = await getCategoryImage(req);
  const {
    name,
    slug,
    accentColor,
    sortOrder,
    description,
    type,
    status,
    approvalStatus,
    parentId,
    iconId,
    adminCommission,
    handlingFees,
    headerColor,
  } = req.body || {};

  if (name !== undefined) category.name = name;
  if (slug !== undefined) category.slug = slugify(slug || name || category.name);
  if (image) category.image = image;
  if (description !== undefined) category.description = description;
  if (type !== undefined) category.type = type || 'header';
  if (status !== undefined) {
    category.status = status;
    category.isActive = status === 'active';
  }
  if (approvalStatus !== undefined) {
    category.approvalStatus = approvalStatus || 'pending';
    category.approvedAt = category.approvalStatus === 'approved' ? new Date() : null;
  }
  if (accentColor !== undefined) category.accentColor = accentColor || '#0c831f';
  if (headerColor !== undefined) category.headerColor = headerColor || category.accentColor;
  if (sortOrder !== undefined) category.sortOrder = parseNumber(sortOrder, 0);
  if (parentId !== undefined) category.parentId = mongoose.isValidObjectId(parentId) ? parentId : null;
  if (iconId !== undefined) category.iconId = iconId || '';
  if (adminCommission !== undefined) category.adminCommission = parseNumber(adminCommission, 0);
  if (handlingFees !== undefined) category.handlingFees = parseNumber(handlingFees, 0);

  await category.save();
  return res.json({ success: true, result: toCategory(category) });
};

export const removeCategory = async (req, res) => {
  const categoryId = req.params.categoryId;
  const childCount = await QuickCategory.countDocuments({ parentId: categoryId });
  const productCount = await QuickProduct.countDocuments({
    $or: [{ categoryId }, { subcategoryId: categoryId }, { headerId: categoryId }],
  });

  if (childCount > 0 || productCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Category has linked children or products. Remove dependencies first.',
    });
  }

  await QuickCategory.findByIdAndDelete(categoryId);
  return res.json({ success: true, result: { deleted: true } });
};

export const getAdminProducts = async (req, res) => {
  await ensureQuickCommerceSeedData();
  const {
    categoryId,
    category,
    search,
    status,
    approvalStatus,
    page = 1,
    limit = 50,
  } = req.query || {};
  const query = {};

  const categoryFilter = categoryId || category;
  if (categoryFilter && mongoose.isValidObjectId(categoryFilter)) {
    query.$or = [
      { categoryId: categoryFilter },
      { subcategoryId: categoryFilter },
      { headerId: categoryFilter },
    ];
  }
  if (search) query.name = { $regex: String(search).trim(), $options: 'i' };
  if (status && status !== 'all') {
    query.status = status;
    query.isActive = status === 'active';
  }
  if (approvalStatus && approvalStatus !== 'all') query.approvalStatus = approvalStatus;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));

  const [products, total] = await Promise.all([
    QuickProduct.find(query)
      .populate('headerId categoryId subcategoryId', 'name slug')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    QuickProduct.countDocuments(query),
  ]);
  const sellerMap = await buildProductSellerMap(products);

  return res.json({
    success: true,
    result: {
      items: products.map((product) => toProduct(withProductSeller(product, sellerMap))),
      page: currentPage,
      limit: perPage,
      total,
    },
  });
};

export const createProduct = async (req, res) => {
  const {
    name,
    categoryId,
    subcategoryId,
    headerId,
    price,
    mrp,
    salePrice,
    unit,
    badge,
    description,
    stock,
    lowStockAlert,
    status,
    approvalStatus,
    brand,
    weight,
    sku,
    tags,
    isFeatured,
    deliveryTime,
    variants,
  } = req.body || {};
  const images = await getProductImages(req);

  if (!name || !categoryId || !mongoose.isValidObjectId(categoryId)) {
    return res.status(400).json({ success: false, message: 'name and valid categoryId are required' });
  }

  const category = await QuickCategory.findById(categoryId).lean();
  if (!category) {
    return res.status(404).json({ success: false, message: 'Category not found' });
  }

  const baseSlug = slugify(name);
  const count = await QuickProduct.countDocuments({ slug: { $regex: `^${baseSlug}` } });
  const slug = count > 0 ? `${baseSlug}-${count + 1}` : baseSlug;

  const product = await QuickProduct.create({
    name,
    slug,
    image: images.image,
    mainImage: images.mainImage,
    galleryImages: images.galleryImages,
    categoryId,
    subcategoryId: mongoose.isValidObjectId(subcategoryId) ? subcategoryId : null,
    headerId: mongoose.isValidObjectId(headerId) ? headerId : null,
    description: description || '',
    price: Number(price || 0),
    mrp: Number(mrp || salePrice || price || 0),
    salePrice: Number(salePrice || 0),
    unit: unit || '',
    weight: weight || '',
    brand: brand || '',
    sku: sku || '',
    stock: parseNumber(stock, 0),
    lowStockAlert: parseNumber(lowStockAlert, 5),
    status: status || 'active',
    approvalStatus: approvalStatus || 'approved',
    approvedAt: (approvalStatus || 'approved') === 'approved' ? new Date() : null,
    isFeatured: parseBool(isFeatured, false),
    tags: String(tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    variants: parseVariants(variants),
    deliveryTime: deliveryTime || '10 mins',
    badge: badge || '',
    isActive: (status || 'active') === 'active',
  });

  return res.status(201).json({ success: true, result: toProduct(product) });
};

export const updateProduct = async (req, res) => {
  const product = await QuickProduct.findById(req.params.productId);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  const images = await getProductImages(req);
  const body = req.body || {};

  if (body.name !== undefined) product.name = body.name;
  if (body.slug !== undefined || body.name !== undefined) {
    product.slug = slugify(body.slug || body.name || product.name);
  }
  if (body.categoryId && mongoose.isValidObjectId(body.categoryId)) product.categoryId = body.categoryId;
  if (body.subcategoryId !== undefined) product.subcategoryId = mongoose.isValidObjectId(body.subcategoryId) ? body.subcategoryId : null;
  if (body.headerId !== undefined) product.headerId = mongoose.isValidObjectId(body.headerId) ? body.headerId : null;
  if (body.description !== undefined) product.description = body.description;
  if (body.price !== undefined) product.price = parseNumber(body.price, product.price);
  if (body.mrp !== undefined || body.salePrice !== undefined || body.price !== undefined) {
    product.mrp = parseNumber(body.mrp, parseNumber(body.salePrice, parseNumber(body.price, product.mrp)));
  }
  if (body.salePrice !== undefined) product.salePrice = parseNumber(body.salePrice, 0);
  if (body.unit !== undefined) product.unit = body.unit || '';
  if (body.weight !== undefined) product.weight = body.weight || '';
  if (body.brand !== undefined) product.brand = body.brand || '';
  if (body.sku !== undefined) product.sku = body.sku || '';
  if (body.stock !== undefined) product.stock = parseNumber(body.stock, 0);
  if (body.lowStockAlert !== undefined) product.lowStockAlert = parseNumber(body.lowStockAlert, 5);
  if (body.status !== undefined) {
    product.status = body.status || 'active';
    product.isActive = product.status === 'active';
  }
  if (body.approvalStatus !== undefined) {
    product.approvalStatus = body.approvalStatus || 'pending';
    product.approvedAt = product.approvalStatus === 'approved' ? new Date() : null;
  }
  if (body.isFeatured !== undefined) product.isFeatured = parseBool(body.isFeatured, false);
  if (body.tags !== undefined) {
    product.tags = String(body.tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (body.variants !== undefined) product.variants = parseVariants(body.variants);
  if (body.deliveryTime !== undefined) product.deliveryTime = body.deliveryTime || '10 mins';
  if (body.badge !== undefined) product.badge = body.badge || '';
  if (images.mainImage) {
    product.mainImage = images.mainImage;
    product.image = images.image;
  }
  if (Array.isArray(images.galleryImages) && images.galleryImages.length > 0) {
    product.galleryImages = images.galleryImages;
  }

  await product.save();
  const populated = await QuickProduct.findById(product._id)
    .populate('headerId categoryId subcategoryId', 'name slug')
    .lean();
  return res.json({ success: true, result: toProduct(populated) });
};

export const removeProduct = async (req, res) => {
  await QuickProduct.findByIdAndDelete(req.params.productId);
  return res.json({ success: true, result: { deleted: true } });
};

export const getAdminOrders = async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query || {};
  const query = { orderType: { $in: ['quick', 'mixed'] } };
  if (status && status !== 'all') query.orderStatus = status;

  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  const [orders, total] = await Promise.all([
    QuickOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    QuickOrder.countDocuments(query),
  ]);

  return res.json({
    success: true,
    result: {
      items: orders.map((order) => ({
        id: order._id,
        _id: order._id,
        orderId: order.orderId,
        orderNumber: order.orderId,
        orderType: order.orderType || 'quick',
        total: order.pricing?.total || 0,
        status: order.orderStatus,
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        items: order.items || [],
        pricing: order.pricing || {},
        payment: order.payment || {},
        sessionId: order.sessionId,
        createdAt: order.createdAt,
      })),
      page: currentPage,
      limit: perPage,
      total,
    },
  });
};

export const deleteAdminOrder = async (req, res) => {
  const rawOrderId = String(req.params.orderId || '').trim();

  if (!rawOrderId) {
    return res.status(400).json({ success: false, message: 'orderId is required' });
  }

  const orderQuery = {
    orderType: { $in: ['quick', 'mixed'] },
    $or: [
      { orderId: rawOrderId },
      ...(mongoose.isValidObjectId(rawOrderId) ? [{ _id: rawOrderId }] : []),
    ],
  };

  const order = await QuickOrder.findOne(orderQuery).lean();
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  const linkedSellerOrders = await SellerOrder.find({ orderId: order.orderId })
    .select('_id sellerId orderId')
    .lean();

  await Promise.all([
    QuickOrder.deleteOne({ _id: order._id }),
    SellerOrder.deleteMany({ orderId: order.orderId }),
  ]);

  try {
    const io = getIO();
    if (io) {
      const payload = {
        orderId: order.orderId,
        orderMongoId: order._id?.toString?.() || '',
        message: 'Order deleted by admin',
      };

      if (order.userId) {
        io.to(rooms.user(order.userId)).emit('order_deleted', payload);
      }
      io.to(rooms.tracking(order.orderId)).emit('order_deleted', payload);

      linkedSellerOrders.forEach((sellerOrder) => {
        if (!sellerOrder?.sellerId) return;
        io.to(rooms.seller(sellerOrder.sellerId)).emit('order_deleted', {
          ...payload,
          sellerOrderId: sellerOrder._id?.toString?.() || '',
        });
      });

      if (order.dispatch?.deliveryPartnerId) {
        io.to(rooms.delivery(order.dispatch.deliveryPartnerId)).emit('order_deleted', payload);
      }
    }
  } catch {
    // best-effort realtime cleanup
  }

  return res.json({
    success: true,
    result: {
      deleted: true,
      orderId: order.orderId,
      sellerOrdersDeleted: linkedSellerOrders.length,
    },
  });
};

export const getAdminSellerRequests = async (req, res) => {
  const { status = 'pending', page = 1, limit = 50, search = '' } = req.query || {};
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
  const query = {};

  if (status === 'pending') query.approvalStatus = 'pending';
  else if (status === 'approved') query.approvalStatus = 'approved';
  else if (status === 'rejected') query.approvalStatus = 'rejected';
  else if (status === 'draft') query.approvalStatus = 'draft';

  const searchText = String(search || '').trim();
  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: 'i' } },
      { shopName: { $regex: searchText, $options: 'i' } },
      { email: { $regex: searchText, $options: 'i' } },
      { phone: { $regex: searchText, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Seller.find(query)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),
    Seller.countDocuments(query),
  ]);

  return res.json({
    success: true,
    result: {
      items: items.map(toSellerRequest),
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
};

export const approveAdminSellerRequest = async (req, res) => {
  const { sellerId } = req.params;
  const seller = await Seller.findById(sellerId);

  if (!seller) {
    return res.status(404).json({ success: false, message: 'Seller request not found' });
  }

  seller.approved = true;
  seller.approvalStatus = 'approved';
  seller.onboardingSubmitted = true;
  seller.approvedAt = new Date();
  seller.rejectedAt = null;
  seller.approvalNotes = String(req.body?.approvalNotes || '').trim();
  await seller.save();

  return res.json({
    success: true,
    message: 'Seller approved successfully',
    result: toSellerRequest(seller),
  });
};

export const rejectAdminSellerRequest = async (req, res) => {
  const { sellerId } = req.params;
  const seller = await Seller.findById(sellerId);

  if (!seller) {
    return res.status(404).json({ success: false, message: 'Seller request not found' });
  }

  seller.approved = false;
  seller.approvalStatus = 'rejected';
  seller.onboardingSubmitted = true;
  seller.approvedAt = null;
  seller.rejectedAt = new Date();
  seller.approvalNotes = String(req.body?.approvalNotes || req.body?.reason || '').trim();
  await seller.save();

  return res.json({
    success: true,
    message: 'Seller request rejected',
    result: toSellerRequest(seller),
  });
};

export const getAdminZones = async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query || {};
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.max(1, Math.min(parseInt(limit, 10) || 50, 1000));
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: String(search).trim(), $options: 'i' } },
      { zoneName: { $regex: String(search).trim(), $options: 'i' } },
      { serviceLocation: { $regex: String(search).trim(), $options: 'i' } },
    ];
  }

  const [zones, total] = await Promise.all([
    QuickZone.find(filter).sort({ createdAt: -1 }).skip((currentPage - 1) * perPage).limit(perPage).lean(),
    QuickZone.countDocuments(filter),
  ]);

  return res.json({
    success: true,
    data: { zones, total, page: currentPage, limit: perPage },
  });
};

export const listPublicZones = async (_req, res) => {
  const zones = await QuickZone.find({ isActive: true })
    .select('name zoneName serviceLocation country unit isActive coordinates createdAt')
    .sort({ createdAt: 1 })
    .lean();

  return res.json({
    success: true,
    message: 'Zones fetched successfully',
    data: { zones },
  });
};

export const getAdminZoneById = async (req, res) => {
  const zone = await QuickZone.findById(req.params.zoneId).lean();
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  return res.json({ success: true, data: { zone } });
};

export const createAdminZone = async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : (body.zoneName && String(body.zoneName).trim()) || '';
  const coordinates = Array.isArray(body.coordinates) ? body.coordinates : [];

  if (!name) {
    return res.status(400).json({ success: false, message: 'Zone name is required' });
  }

  if (coordinates.length < 3) {
    return res.status(400).json({ success: false, message: 'Zone must have at least 3 coordinates' });
  }

  const zone = await QuickZone.create({
    name,
    zoneName: body.zoneName && String(body.zoneName).trim() ? String(body.zoneName).trim() : name,
    country: body.country ? String(body.country).trim() : 'India',
    serviceLocation: body.serviceLocation ? String(body.serviceLocation).trim() : name,
    unit: body.unit === 'miles' ? 'miles' : 'kilometer',
    isActive: body.isActive !== false,
    coordinates: coordinates.map((coord) => ({
      latitude: Number(coord?.latitude ?? coord?.lat),
      longitude: Number(coord?.longitude ?? coord?.lng),
    })),
  });

  return res.status(201).json({ success: true, data: { zone } });
};

export const updateAdminZone = async (req, res) => {
  const zone = await QuickZone.findById(req.params.zoneId);
  if (!zone) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  const body = req.body || {};
  if (body.name !== undefined) zone.name = String(body.name || '').trim();
  if (body.zoneName !== undefined) zone.zoneName = String(body.zoneName || '').trim();
  if (body.country !== undefined) zone.country = String(body.country || '').trim() || 'India';
  if (body.serviceLocation !== undefined) zone.serviceLocation = String(body.serviceLocation || '').trim();
  if (body.unit !== undefined) zone.unit = body.unit === 'miles' ? 'miles' : 'kilometer';
  if (body.isActive !== undefined) zone.isActive = body.isActive !== false;
  if (Array.isArray(body.coordinates) && body.coordinates.length >= 3) {
    zone.coordinates = body.coordinates.map((coord) => ({
      latitude: Number(coord?.latitude ?? coord?.lat),
      longitude: Number(coord?.longitude ?? coord?.lng),
    }));
  }
  if (!zone.zoneName) zone.zoneName = zone.name;
  if (!zone.serviceLocation) zone.serviceLocation = zone.name;

  await zone.save();
  return res.json({ success: true, data: { zone: zone.toObject() } });
};

export const deleteAdminZone = async (req, res) => {
  const deleted = await QuickZone.findByIdAndDelete(req.params.zoneId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Zone not found' });
  }

  return res.json({ success: true, data: { id: req.params.zoneId } });
};

export const getAdminExperienceSections = async (req, res) => {
  const { pageType = 'home', headerId = null } = req.query || {};
  const sections = await getQuickExperienceSections({ pageType, headerId });
  return res.json({ success: true, results: sections });
};

export const createAdminExperienceSection = async (req, res) => {
  const section = await createQuickExperienceSection(req.body);
  return res.status(201).json({ success: true, result: section });
};

export const updateAdminExperienceSection = async (req, res) => {
  const section = await updateQuickExperienceSection(req.params.id, req.body);
  if (!section) {
    return res.status(404).json({ success: false, message: 'Section not found' });
  }
  return res.json({ success: true, result: section });
};

export const deleteAdminExperienceSection = async (req, res) => {
  await deleteQuickExperienceSection(req.params.id);
  return res.json({ success: true, result: { deleted: true } });
};

export const reorderAdminExperienceSections = async (req, res) => {
  await reorderQuickExperienceSections(req.body);
  return res.json({ success: true, result: { reordered: true } });
};

export const getAdminHeroConfig = async (req, res) => {
  const { pageType = 'home', headerId = null } = req.query || {};
  const config = await getQuickHeroConfig({ pageType, headerId });
  return res.json({ success: true, result: config || { banners: { items: [] }, categoryIds: [] } });
};

export const setAdminHeroConfig = async (req, res) => {
  const config = await setQuickHeroConfig(req.body);
  return res.json({ success: true, result: config });
};

export const getAdminOfferSections = async (req, res) => {
  const sections = await getQuickOfferSections(req.query);
  return res.json({ success: true, results: sections });
};

export const createAdminOfferSection = async (req, res) => {
  const section = await createQuickOfferSection(req.body);
  return res.status(201).json({ success: true, result: section });
};

export const updateAdminOfferSection = async (req, res) => {
  const section = await updateQuickOfferSection(req.params.id, req.body);
  if (!section) {
    return res.status(404).json({ success: false, message: 'Section not found' });
  }
  return res.json({ success: true, result: section });
};

export const deleteAdminOfferSection = async (req, res) => {
  await deleteQuickOfferSection(req.params.id);
  return res.json({ success: true, result: { deleted: true } });
};

export const reorderAdminOfferSections = async (req, res) => {
  await reorderQuickOfferSections(req.body);
  return res.json({ success: true, result: { reordered: true } });
};
