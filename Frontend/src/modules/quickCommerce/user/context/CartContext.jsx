import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { customerApi } from "../services/customerApi";
import { useAuth } from "@core/context/AuthContext";
import { useCart as useFoodCart } from "@food/context/CartContext";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const getProductId = (product) => product?.id || product?._id;

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
    try {
      const savedCart = localStorage.getItem("cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error("Failed to load cart from localStorage", error);
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const pendingRequestsRef = useRef(0);

  const normalizeBackendCart = (items) => {
    if (!items) return [];
    return items.map((item) => ({
      ...item.productId,
      id: item.productId?._id || item.productId?.id,
      quantity: item.quantity,
      image: item.productId?.mainImage || item.productId?.image,
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
      fetchCart();
    } else {
      try {
        const savedCart = localStorage.getItem("cart");
        setCart(savedCart ? JSON.parse(savedCart) : []);
      } catch (error) {
        setCart([]);
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  const addToCart = async (product) => {
    const id = getProductId(product);
    setCart((prev) => {
      const existingItem = prev.find((item) => getProductId(item) === id);
      if (existingItem) {
        return prev.map((item) =>
          getProductId(item) === id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [
        ...prev,
        { ...product, id, quantity: 1, image: product.image || product.mainImage },
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
    setCart((prev) => prev.filter((item) => getProductId(item) !== productId));
    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.removeFromCart(productId);
        pendingRequestsRef.current -= 1;
        syncCart(response.data?.result?.items || response.data?.items);
      } catch (error) {
        pendingRequestsRef.current -= 1;
        if (pendingRequestsRef.current === 0) await fetchCart();
      }
    }
  };

  const updateQuantity = async (productId, delta) => {
    const currentItem = cart.find((item) => getProductId(item) === productId);
    if (!currentItem) return;
    const newQty = Math.max(0, currentItem.quantity + delta);
    if (newQty === 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        getProductId(item) === productId ? { ...item, quantity: newQty } : item,
      ),
    );
    if (isAuthenticated) {
      pendingRequestsRef.current += 1;
      try {
        const response = await customerApi.updateCartQuantity({ productId, quantity: newQty });
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
      foodCart.removeFromCart(productId);
    };

    const updateQuantity = async (productId, delta) => {
      const currentItem = foodCart.getCartItem(productId);
      if (!currentItem) return;
      const nextQuantity = Math.max(0, (currentItem.quantity || 0) + delta);
      foodCart.updateQuantity(productId, nextQuantity);
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
