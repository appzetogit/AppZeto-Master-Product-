import { QuickCategory } from '../models/category.model.js';
import { QuickProduct } from '../models/product.model.js';
import { ensureQuickCommerceSeedData } from '../services/seed.service.js';

const setNoCache = (res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
};

const mapCategory = (category) => ({
  id: category._id,
  _id: category._id,
  name: category.name,
  slug: category.slug,
  image: category.image,
  status: category.status || (category.isActive ? 'active' : 'inactive'),
  type: category.type || 'header',
  parentId: category.parentId || null,
  iconId: category.iconId || '',
  headerColor: category.headerColor || category.accentColor,
  handlingFees: Number(category.handlingFees || 0),
  adminCommission: Number(category.adminCommission || 0),
  color: category.accentColor,
});

const mapProduct = (product) => ({
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
  salePrice: product.salePrice || 0,
  originalPrice: product.mrp,
  weight: product.unit,
  unit: product.unit,
  stock: Number(product.stock || 0),
  status: product.status || (product.isActive ? 'active' : 'inactive'),
  brand: product.brand || '',
  description: product.description || '',
  tags: Array.isArray(product.tags) ? product.tags : [],
  variants: Array.isArray(product.variants) ? product.variants : [],
  deliveryTime: product.deliveryTime,
  rating: product.rating,
  badge: product.badge,
});

export const getHomeData = async (req, res) => {
  setNoCache(res);
  await ensureQuickCommerceSeedData();

  const [categories, products] = await Promise.all([
    QuickCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    QuickProduct.find({ isActive: true }).sort({ createdAt: -1 }).limit(18).lean(),
  ]);

  const homeData = {
    categories: categories.map(mapCategory),
    bestSellers: products.map(mapProduct),
    hero: {
      title: 'Blinkit style quick delivery',
      subtitle: 'Groceries delivered in minutes',
      banners: [
        {
          id: '1',
          image: '/assets/ExperienceBanner.png',
          link: '/category/all',
        }
      ]
    },
    sections: [
      {
        _id: 'best-sellers-section',
        title: 'Best Sellers',
        displayType: 'products',
        config: {
          products: {
            productIds: products.slice(0, 6).map(p => p._id),
            rows: 1,
            columns: 2,
            singleRowScrollable: true
          }
        }
      }
    ]
  };

  const { pageType, sectionId } = req.query;

  // Partial returns for specialized frontend calls
  if (req.path.includes('/hero')) {
    return res.json({ success: true, result: homeData.hero });
  }

  if (req.path.includes('/experience') && pageType === 'home') {
     return res.json({ success: true, result: homeData.sections });
  }

  return res.json({
    success: true,
    result: homeData,
  });
};

export const getCategories = async (_req, res) => {
  setNoCache(res);
  await ensureQuickCommerceSeedData();
  const categories = await QuickCategory.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  return res.json({ success: true, results: categories.map(mapCategory) });
};

export const getProducts = async (req, res) => {
  setNoCache(res);
  await ensureQuickCommerceSeedData();

  const { categoryId, search, limit } = req.query;
  const query = { isActive: true };

  if (categoryId) query.categoryId = categoryId;
  if (search) query.name = { $regex: String(search).trim(), $options: 'i' };

  const parsedLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 50;
  const products = await QuickProduct.find(query).sort({ createdAt: -1 }).limit(parsedLimit).lean();

  return res.json({
    success: true,
    result: {
      items: products.map(mapProduct),
    },
  });
};

export const getProductById = async (req, res) => {
  setNoCache(res);
  await ensureQuickCommerceSeedData();

  const product = await QuickProduct.findOne({ _id: req.params.productId, isActive: true }).lean();

  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }

  return res.json({ success: true, result: mapProduct(product) });
};
