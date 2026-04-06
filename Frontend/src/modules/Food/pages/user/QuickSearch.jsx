import SearchPage from "../../../quickCommerce/user/pages/SearchPage";
import { CartProvider as QuickCartProvider } from "../../../quickCommerce/user/context/CartContext";
import { LocationProvider as QuickLocationProvider } from "../../../quickCommerce/user/context/LocationContext";
import { ProductDetailProvider as QuickProductDetailProvider } from "../../../quickCommerce/user/context/ProductDetailContext";
import { WishlistProvider as QuickWishlistProvider } from "../../../quickCommerce/user/context/WishlistContext";
import { CartAnimationProvider as QuickCartAnimationProvider } from "../../../quickCommerce/user/context/CartAnimationContext";

export default function QuickSearch() {
  return (
    <div className="min-h-screen bg-white">
      <QuickLocationProvider>
        <QuickWishlistProvider>
          <QuickCartProvider>
            <QuickCartAnimationProvider>
              <QuickProductDetailProvider>
                <SearchPage />
              </QuickProductDetailProvider>
            </QuickCartAnimationProvider>
          </QuickCartProvider>
        </QuickWishlistProvider>
      </QuickLocationProvider>
    </div>
  );
}
