import { createContext } from "react"

const SellerOrdersContext = createContext({
  orders: [],
  ordersLoading: false,
  refreshOrders: () => {},
})

export default SellerOrdersContext

