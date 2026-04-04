const STANDALONE_BASE = "/quick-commerce/user";
const EMBEDDED_HOME = "/food/user/quick";
const SHARED_FOOD_CART = "/food/user/cart";

export const isEmbeddedQuickPath = (pathname = "") =>
  String(pathname).startsWith(EMBEDDED_HOME);

export const getQuickHomePath = (pathname = "") =>
  isEmbeddedQuickPath(pathname) ? EMBEDDED_HOME : STANDALONE_BASE;

export const getQuickCartPath = (pathname = "") =>
  isEmbeddedQuickPath(pathname) ? SHARED_FOOD_CART : `${STANDALONE_BASE}/cart`;

export const getQuickCheckoutPath = (pathname = "") =>
  isEmbeddedQuickPath(pathname) ? SHARED_FOOD_CART : `${STANDALONE_BASE}/checkout`;

export const getQuickSearchPath = () => `${STANDALONE_BASE}/search`;
export const getQuickProductsPath = () => `${STANDALONE_BASE}/products`;
export const getQuickProductPath = (productId) =>
  `${STANDALONE_BASE}/product/${productId}`;
export const getQuickCategoriesPath = () => `${STANDALONE_BASE}/categories`;
export const getQuickCategoryPath = (categoryId) =>
  `${STANDALONE_BASE}/categories/${categoryId}`;
export const getQuickProfilePath = () => `${STANDALONE_BASE}/profile`;
export const getQuickWishlistPath = () => `${STANDALONE_BASE}/wishlist`;
export const getQuickOffersPath = () => `${STANDALONE_BASE}/offers`;
export const getQuickOrdersPath = () => `${STANDALONE_BASE}/orders`;
export const getQuickAddressesPath = () => `${STANDALONE_BASE}/addresses`;
export const getQuickSupportPath = () => `${STANDALONE_BASE}/support`;
export const getQuickWalletPath = () => `${STANDALONE_BASE}/wallet`;
