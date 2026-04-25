import apiService from './apiService';

class PaymentService {
  /**
   * Create Razorpay order for booking payment
   */
  async createOrder(bookingId) {
    const response = await apiService.post('/payments/create-order', { bookingId });
    return response.data;
  }

  /**
   * Verify Razorpay payment
   */
  async verifyPayment(verificationData) {
    const response = await apiService.post('/payments/verify', verificationData);
    return response.data;
  }

  /**
   * Process refund
   */
  async processRefund(bookingId, amount, reason) {
    const response = await apiService.post(`/payments/refund/${bookingId}`, {
      amount,
      reason
    });
    return response.data;
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId) {
    const response = await apiService.get(`/payments/${paymentId}`);
    return response.data;
  }

  /**
   * Load Razorpay script
   */
  loadRazorpayScript() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  /**
   * Open Razorpay checkout
   */
  async openCheckout(options) {
    const loaded = await this.loadRazorpayScript();

    if (!loaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        ...options,
        handler: function (response) {
          resolve(response);
        },
        modal: {
          ondismiss: function () {
            reject(new Error('Payment cancelled by user'));
          }
        }
      });

      rzp.open();
    });
  }
}

export default new PaymentService();
