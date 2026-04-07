import { Routes, Route, Navigate } from "react-router-dom"
import { Suspense, lazy } from "react"
import Loader from "@food/components/Loader"
import UserLayout from "./user/UserLayout"

// Lazy-load the new Blinkit-style pages
const Home = lazy(() => import("./user/pages/Home"))
const Cart = lazy(() => import("./user/pages/CartPage"))
const Orders = lazy(() => import("./user/pages/OrdersPage"))
const OrderDetail = lazy(() => import("./user/pages/OrderDetailPage"))
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
                    <Route index element={<Home />} />
                    <Route path="cart" element={<Navigate to="/food/user/cart" replace />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:orderId" element={<OrderDetail />} />
                    <Route path="products" element={<Products />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="categories/:categoryId" element={<CategoryProducts />} />
                    <Route path="product/:productId" element={<ProductDetail />} />
                    <Route path="checkout" element={<Navigate to="/food/user/cart" replace />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="wallet" element={<Wallet />} />
                    <Route path="addresses" element={<Addresses />} />
                    <Route path="support" element={<Support />} />
                    <Route path="search" element={<Search />} />
                    <Route path="user" element={<Navigate to="/quick" replace />} />
                    <Route path="user/*" element={<Navigate to="/quick" replace />} />
                  </Route>
                  
                  {/* Redirects */}
                  <Route path="/" element={<Navigate to="/quick" replace />} />
                  <Route path="*" element={<Navigate to="/quick" replace />} />
                </Routes>
              </ProductDetailProvider>
            </CartAnimationProvider>
          </WishlistProvider>
        </LocationProvider>
      </CartProvider>
    </Suspense>
  )
}
