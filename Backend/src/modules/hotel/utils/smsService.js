import axios from 'axios';

class SMSIndiaHubService {
  constructor() {
    this.apiKey = process.env.SMSINDIAHUB_API_KEY;
    this.senderId = process.env.SMSINDIAHUB_SENDER_ID || 'SMSHUB';
    this.baseUrl = 'https://cloud.smsindiahub.in/vendorsms/pushsms.aspx';
  }

  normalizePhoneNumber(phone) {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return '91' + digits;
    if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.substring(1);
    return '91' + digits.slice(-10);
  }

  async sendOTP(phone, otp, purpose = 'registration') {
    const message = `Welcome to the Rukkoo.in powered by SMSINDIAHUB. Your OTP for registration is ${otp}`;
    return this.sendSMS(phone, message);
  }

  async sendSMS(phone, message) {
    try {
      // Load credentials dynamically at runtime to ensure dotenv has loaded
      const apiKey = this.apiKey || process.env.SMSINDIAHUB_API_KEY;
      const senderId = this.senderId || process.env.SMSINDIAHUB_SENDER_ID;

      if (!apiKey) {
        console.warn('⚠️ [SMSIndiaHub] Missing API Key. SMS NOT SENT.');
        return { success: false, error: 'Missing API Key' };
      }

      const normalizedPhone = this.normalizePhoneNumber(phone);

      const params = new URLSearchParams({
        APIKey: apiKey,
        msisdn: normalizedPhone,
        sid: senderId,
        msg: message,
        fl: '0',
        dc: '0',
        gwid: '2'
      });

      const apiUrl = `${this.baseUrl}?${params.toString()}`;
      console.log(`📨 Sending SMS to ${normalizedPhone}...`);

      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': 'Rukkooin/1.0' },
        timeout: 10000
      });

      const responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

      if (responseData.ErrorCode === '000') {
        console.log('✅ SMS Sent Successfully');
        return { success: true, response: responseData };
      } else {
        console.error('❌ SMS Failed:', responseData);
        return { success: false, error: responseData.ErrorMessage };
      }

    } catch (error) {
      console.error('❌ SMS Service Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new SMSIndiaHubService();
