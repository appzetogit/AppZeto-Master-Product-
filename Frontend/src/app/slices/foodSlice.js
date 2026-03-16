import { createSlice } from '@reduxjs/toolkit'

const findCartItemIndex = (items, id, restaurantId) =>
  items.findIndex(
    (item) =>
      item.id === id &&
      (restaurantId == null || item.restaurantId === restaurantId)
  )

const initialState = {
  // Cart: food delivery items
  cart: {
    items: [], // [{ id, restaurantId, name, price, quantity, ... }]
  },
  // Restaurants list / selected (for UI state, not full catalog)
  restaurants: {
    list: [],
    selectedRestaurantId: null,
  },
  // User's food orders (summary for UI; full data from API)
  orders: {
    list: [],
    activeOrderId: null,
  },
}

const foodSlice = createSlice({
  name: 'food',
  initialState,
  reducers: {
    // —— Cart ——
    addToCart(state, action) {
      const { id, restaurantId, quantity = 1, ...rest } = action.payload || {}
      if (!id) return
      const items = state.cart.items
      const idx = findCartItemIndex(items, id, restaurantId)
      if (idx === -1) {
        state.cart.items.push({ id, restaurantId, quantity, ...rest })
      } else {
        state.cart.items[idx].quantity += quantity
      }
    },
    removeFromCart(state, action) {
      const { id, restaurantId } = action.payload || {}
      state.cart.items = state.cart.items.filter(
        (item) =>
          !(
            item.id === id &&
            (restaurantId == null || item.restaurantId === restaurantId)
          )
      )
    },
    clearCart(state) {
      state.cart.items = []
    },
    setCart(state, action) {
      state.cart.items = Array.isArray(action.payload) ? action.payload : []
    },

    // —— Restaurants ——
    setRestaurantsList(state, action) {
      state.restaurants.list = Array.isArray(action.payload)
        ? action.payload
        : []
    },
    setSelectedRestaurant(state, action) {
      state.restaurants.selectedRestaurantId = action.payload ?? null
    },

    // —— Orders ——
    setOrdersList(state, action) {
      state.orders.list = Array.isArray(action.payload) ? action.payload : []
    },
    setActiveOrderId(state, action) {
      state.orders.activeOrderId = action.payload ?? null
    },

    // Reset entire food slice (e.g. on logout)
    resetFood(state) {
      state.cart.items = []
      state.restaurants.list = []
      state.restaurants.selectedRestaurantId = null
      state.orders.list = []
      state.orders.activeOrderId = null
    },
  },
})

export const {
  addToCart,
  removeFromCart,
  clearCart,
  setCart,
  setRestaurantsList,
  setSelectedRestaurant,
  setOrdersList,
  setActiveOrderId,
  resetFood,
} = foodSlice.actions
export default foodSlice.reducer
