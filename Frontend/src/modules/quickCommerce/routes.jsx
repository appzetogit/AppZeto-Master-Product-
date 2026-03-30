import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense, lazy } from "react"
import Loader from "@food/components/Loader"
import UserLayout from "./user/UserLayout"

// Lazy-load the new Blinkit-style pages
const Home = lazy(() => import("./user/pages/Home"))
const Cart = lazy(() => import("./user/pages/CartPage"))
const Orders = lazy(() => import("./user/pages/OrdersPage"))
const Products = lazy(() => import("./user/pages/ProductsPage"))
const Categories = lazy(() => import("./user/pages/CategoriesPage"))
const CategoryProducts = lazy(() => import("./user/pages/CategoryProductsPage"))
const ProductDetail = lazy(() => import("./user/pages/ProductDetailPage"))
const Checkout = lazy(() => import("./user/pages/CheckoutPage"))
const Profile = lazy(() => import("./user/pages/ProfilePage"))
const Wallet = lazy(() => import("./user/pages/WalletPage"))
const Addresses = lazy(() => import("./user/pages/AddressesPage"))
const Support = lazy(() => import("./user/pages/SupportPage"))
const Search = lazy(() => import("./user/pages/SearchPage"))

import { CartProvider } from "./user/context/CartContext"
import { LocationProvider } from "./user/context/LocationContext"
import { ProductDetailProvider } from "./user/context/ProductDetailContext"
import { WishlistProvider } from "./user/context/WishlistContext"
import { CartAnimationProvider } from "./user/context/CartAnimationContext"

export default function QuickCommerceRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <CartProvider>
        <LocationProvider>
          <WishlistProvider>
            <CartAnimationProvider>
              <ProductDetailProvider>
                <Routes>
                  <Route element={<UserLayout />}>
                    <Route path="user" element={<Home />} />
                    <Route path="user/cart" element={<Cart />} />
                    <Route path="user/orders" element={<Orders />} />
                    <Route path="user/products" element={<Products />} />
                    <Route path="user/categories" element={<Categories />} />
                    <Route path="user/categories/:categoryId" element={<CategoryProducts />} />
                    <Route path="user/product/:productId" element={<ProductDetail />} />
                    <Route path="user/checkout" element={<Checkout />} />
                    <Route path="user/profile" element={<Profile />} />
                    <Route path="user/wallet" element={<Wallet />} />
                    <Route path="user/addresses" element={<Addresses />} />
                    <Route path="user/support" element={<Support />} />
                    <Route path="user/search" element={<Search />} />
                  </Route>
                  
                  {/* Redirects */}
                  <Route path="/" element={<Navigate to="user" replace />} />
                  <Route path="*" element={<Navigate to="user" replace />} />
                </Routes>
              </ProductDetailProvider>
            </CartAnimationProvider>
          </WishlistProvider>
        </LocationProvider>
      </CartProvider>
    </Suspense>
  )
}
