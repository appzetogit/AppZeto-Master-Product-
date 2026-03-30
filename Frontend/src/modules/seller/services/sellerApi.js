const emptyList = Promise.resolve({
  data: { success: true, result: { notifications: [], unreadCount: 0, items: [] } },
})

export const sellerApi = {
  getNotifications: () => emptyList,
  markNotificationRead: async () => ({ data: { success: true } }),
  markAllNotificationsRead: async () => ({ data: { success: true } }),
  getOrders: async () => ({ data: { success: true, result: { items: [] } } }),
  getEarnings: async () => ({ data: { success: true, result: { balances: {}, ledger: [], monthlyChart: [] } } }),
  updateOrderStatus: async () => ({ data: { success: true } }),
}

