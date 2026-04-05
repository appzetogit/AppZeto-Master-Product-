import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "@core/context/AuthContext";
import { useCart as useFoodCart } from "@food/context/CartContext";

const CartContext = createContext();
const QUICK_CART_STORAGE_KEY = "quick_commerce_cart";

export const useCart = () => useContext(CartContext);

const readStoredQuickCart = () => {
  try {
    const quickCart = localStorage.getItem(QUICK_CART_STORAGE_KEY);
    if (quickCart) return JSON.parse(quickCart);

    const legacyCart = localStorage.getItem("cart");
    if (!legacyCart) return [];

    const parsedLegacyCart = JSON.parse(legacyCart);
    if (Array.isArray(parsedLegacyCart)) {
      localStorage.setItem(QUICK_CART_STORAGE_KEY, JSON.stringify(parsedLegacyCart));
    }
    return Array.isArray(parsedLegacyCart) ? parsedLegacyCart : [];
  } catch (error) {
    console.error("Failed to load quick cart from localStorage", error);
    return [];
  }
};

const normalizeProductId = (value) => {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  return rawValue.split("::")[0];
};

const getProductId = (product) =>
  normalizeProductId(
    product?.productId || product?.itemId || product?.id || product?._id,
  );

const getQuickStoreName = (product) =>
  product?.restaurant ||
  product?.restaurantName ||
  product?.storeName ||
  product?.store?.name ||
  product?.storeId?.name ||
  product?.seller?.name ||
  product?.sellerId?.name ||
  "Quick Commerce";

const getQuickStoreId = (product) =>
  product?.restaurantId ||
  product?.restaurant?._id ||
  product?.storeId?._id ||
  product?.storeId?.id ||
  product?.store?._id ||
  product?.store?.id ||
  product?.sellerId?._id ||
  product?.sellerId?.id ||
  product?.seller?._id ||
  product?.seller?.id ||
  "quick-commerce";

const normalizeQuickProductForSharedCart = (product) => {
  const id = getProductId(product);
  return {
    ...product,
    id,
    _id: product?._id || id,
    orderType: "quick",
    type: "quick",
    image: product?.image || product?.mainImage,
    mainImage: product?.mainImage || product?.image,
    price:
      typeof product?.price === "number"
        ? product.price
        : product?.salePrice ?? 0,
    originalPrice: product?.originalPrice ?? product?.price ?? product?.salePrice ?? 0,
    quickStoreName: getQuickStoreName(product),
    quickStoreId: getQuickStoreId(product),
    sourceId: getQuickStoreId(product),
    sourceName: getQuickStoreName(product),
    restaurant: "Quick Commerce",
    restaurantId: "quick-commerce",
  };
};

const useStandaloneQuickCart = () => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(() => {
    if (isAuthenticated) return [];
    return readStoredQuickCart();
  });

  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const pendingRequestsRef = useRef(0);

  const normalizeBackendCart = (items) => {
    if (!items) return [];
    return items.map((item) => ({
      ...item,
      id: getProductId(item),
      _id: getProductId(item),
      productId: getProductId(item),
      itemId: getProductId(item),
      quantity: Number(item.quantity || 1),
      image: item.image || item.mainImage || "",
      mainImage: item.mainImage || item.image || "",
      price: Number(item.price || 0),
      mrp: Number(item.mrp || item.price || 0),
      orderType: "quick",
      type: "quick",
      restaurant: "Quick Commerce",
      restaurantId: "quick-commerce",
    }));
  };

  const syncCart = (backendItems) => {
    if (pendingRequestsRef.current === 0) {
      setCart(normalizeBackendCart(backendItems));
    }
  };

  const fetchCart = async () => {
    if (isAuthenticated) {
      setLoading(true);
      try {
        const response = await customerApi.getCart();
        const items = response.data?.result?.items || response.data?.items || [];
        setCart(normalizeBackendCart(items));
      } catch (error) {
        console.error("Failed to fetch cart from backend", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      setCart([]);
      fetchCart();
    } else {
      try {
        setLoading(false);
        setCart(readStoredQuickCart());
      } catch (error) {
        setCart([]);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(QUICK_CART_STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  const addToCart = async (product) => {
    const id = getProductId(product);
    if (!id) return;
    setCart((prev) => {
      const existingItem = prev.find((item) => getProductId(item) === id);
      if (existingItem) {
        return prev.map((item) =>
          getProductId(item) === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          ...product,
          id,
          _id: product?._id || id,
          productId: id,
          itemId: id,
          orderType: "quick",
          type: "quick",
          restaurant: "Quick Commerce",
          restaurantId: "quick-commerce",
          quantity: 1,
          image: product.image || product.mainImage,
          mainImage: product.mainImage || product.image,
        },
      ];
    });

    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.addToCart({ productId: id, quantity: 1 });
        pendingRequestsRef.current -= 1;
        syncCart(response.data?.result?.items || response.data?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        if (pendingRequestsRef.current === 0) await fetchCart();
      }
    }
  };

  const removeFromCart = async (productId) => {
    const resolvedProductId = normalizeProductId(productId);
    if (!resolvedProductId) return;
    setCart((prev) => prev.filter((item) => getProductId(item) !== resolvedProductId));
    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.removeFromCart(resolvedProductId);
        pendingRequestsRef.current -= 1;
        syncCart(response.data?.result?.items || response.data?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        if (pendingRequestsRef.current === 0) await fetchCart();
      }
    }
  };

  const updateQuantity = async (productId, delta) => {
    const resolvedProductId = normalizeProductId(productId);
    if (!resolvedProductId) return;
    const currentItem = cart.find((item) => getProductId(item) === resolvedProductId);
    if (!currentItem) return;
    const newQty = Math.max(0, currentItem.quantity + delta);
    if (newQty === 0) {
      removeFromCart(resolvedProductId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        getProductId(item) === resolvedProductId ? { ...item, quantity: newQty } : item,
      ),
    );
    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.updateCartQuantity({
          productId: resolvedProductId,
          quantity: newQty,
        });
        pendingRequestsRef.current -= 1;
        syncCart(response.data?.result?.items || response.data?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        if (pendingRequestsRef.current === 0) await fetchCart();
      }
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        await customerApi.clearCart();
        setCart([]);
      } catch (error) {
        console.error("Error clearing cart on backend", error);
      }
    } else {
      setCart([]);
    }
  };

  const cartTotal = cart.reduce(
    (total, item) => total + (item.price || 0) * item.quantity,
    0,
  );
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    cartCount,
    loading,
  };
};

export const CartProvider = ({ children }) => {
  const foodCart = useFoodCart();
  const standaloneCart = useStandaloneQuickCart();

  const bridgedValue = useMemo(() => {
    const isUsingFoodCart = foodCart?._isProvider === true;
    if (!isUsingFoodCart) {
      return standaloneCart;
    }

    const addToCart = async (product) => {
      foodCart.addToCart(normalizeQuickProductForSharedCart(product));
    };

    const removeFromCart = async (productId) => {
      const resolvedProductId = normalizeProductId(productId);
      if (!resolvedProductId) return;
      foodCart.removeFromCart(resolvedProductId);
    };

    const updateQuantity = async (productId, delta) => {
      const resolvedProductId = normalizeProductId(productId);
      if (!resolvedProductId) return;
      const currentItem = foodCart.getCartItem(resolvedProductId);
      if (!currentItem) return;
      const nextQuantity = Math.max(0, (currentItem.quantity || 0) + delta);
      foodCart.updateQuantity(resolvedProductId, nextQuantity);
    };

    const clearCart = async () => {
      foodCart.clearCart();
    };

    return {
      cart: foodCart.cart || [],
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal: foodCart.total || 0,
      cartCount: foodCart.itemCount || 0,
      loading: false,
    };
  }, [foodCart, standaloneCart]);

  return <CartContext.Provider value={bridgedValue}>{children}</CartContext.Provider>;
};
