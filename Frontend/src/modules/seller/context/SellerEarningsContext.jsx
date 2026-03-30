import { createContext } from "react"

export const defaultEarnings = {
  balances: {},
  ledger: [],
  monthlyChart: [],
}

const SellerEarningsContext = createContext({
  earningsData: defaultEarnings,
  earningsLoading: false,
  refreshEarnings: () => {},
})

export default SellerEarningsContext

