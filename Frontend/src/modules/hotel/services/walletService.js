import { api as apiService } from './apiService';

class WalletService {
  /**
   * Get wallet balance and details
   */
  /**
   * Get wallet balance and details
   */
  async getWallet(params = {}) {
    const response = await apiService.get('/wallet', { params });
    return response.data;
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(params = {}) {
    const response = await apiService.get('/wallet/stats', { params });
    return response.data;
  }

  /**
   * Get transaction history
   */
  async getTransactions(params = {}) {
    const response = await apiService.get('/wallet/transactions', { params });
    return response.data;
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(amount) {
    const response = await apiService.post('/wallet/withdraw', { amount });
    return response.data;
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawals(params = {}) {
    const { page = 1, limit = 20, status } = params;
    const queryParams = new URLSearchParams({
      page,
      limit,
      ...(status && { status })
    });

    const response = await apiService.get(`/wallet/withdrawals?${queryParams}`);
    return response.data;
  }

  /**
   * Update bank details
   */
  async updateBankDetails(bankDetails) {
    const response = await apiService.put('/wallet/bank-details', bankDetails);
    return response.data;
  }

  /**
   * Delete bank details
   */
  async deleteBankDetails() {
    const response = await apiService.delete('/wallet/bank-details');
    return response.data;
  }

  /**
   * Create Add Money Order
   */
  async addMoney(amount) {
    const response = await apiService.post('/wallet/add-money', { amount });
    return response.data;
  }

  /**
   * Verify Add Money Payment
   */
  async verifyAddMoney(paymentData) {
    const response = await apiService.post('/wallet/verify-add-money', paymentData);
    return response.data;
  }

  /**
   * Admin Adjust Wallet (Credit/Debit)
   */
  async adminAdjustWallet({ targetUserId, action, amount, reason, viewAs }) {
    const response = await apiService.post('/admin/wallet/adjust', {
      targetUserId,
      action,
      amount,
      reason,
      viewAs
    });
    return response.data;
  }

  /**
   * Format amount to INR currency
   */
  formatAmount(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}

export default new WalletService();
