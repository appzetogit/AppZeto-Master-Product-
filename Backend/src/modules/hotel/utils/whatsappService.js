import axios from 'axios';

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WA_API_URL || 'http://bhashsms.com/api/sendmsgutil.php';
    this.user = process.env.WA_USER;
    this.pass = process.env.WA_PASS;
    this.sender = process.env.WA_SENDER;
    this.template = process.env.WA_TEMPLATE;
    this.stype = process.env.WA_STYPE || 'utility'; // Default to utility for booking
  }

  normalizePhoneNumber(phone) {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('91') && digits.length === 12) return digits;
    if (digits.length === 10) return '91' + digits;
    return '91' + digits.slice(-10);
  }

  async sendBookingConfirmation(booking) {
    try {
      if (!this.apiUrl || !this.user || !this.pass) {
        console.warn('⚠️ [WhatsApp] Missing API credentials. Notification NOT SENT.');
        return { success: false, error: 'Missing credentials' };
      }

      const user = booking.userId;
      const property = booking.propertyId;
      
      if (!user || !user.phone) {
        console.warn('⚠️ [WhatsApp] No user phone found.');
        return { success: false, error: 'No phone number' };
      }

      const guestName = user.name || 'Guest';
      const hotelName = property?.propertyName || 'Hotel';
      const checkInDate = new Date(booking.checkInDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const totalAmount = booking.totalAmount;
      
      let hotelLocationLink = "https://www.google.com/maps/dir/?api=1&destination=";
      if (property?.location?.coordinates && property.location.coordinates.length === 2) {
        const [lng, lat] = property.location.coordinates;
        hotelLocationLink += `${lat}%2C${lng}`;
      } else {
        const address = property?.address?.fullAddress || property?.propertyName || 'Hotel';
        hotelLocationLink += encodeURIComponent(address);
      }

      // Cleanup variables: Replace literal commas with encoded %2C
      const cleanVar = (val) => val ? val.toString().replace(/,/g, '%2C') : '';

      // Template Variables (6 variables for booking_2503)
      const variables = [
        cleanVar(guestName),           // {{1}}
        cleanVar(hotelName),           // {{2}}
        cleanVar(checkInDate),         // {{3}}
        cleanVar(totalAmount),         // {{4}}
        cleanVar(guestName),           // {{5}}
        cleanVar(hotelLocationLink)    // {{6}}
      ].join(',');

      const normalizedPhone = this.normalizePhoneNumber(user.phone);

      // Create Form Data for POST (application/x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('user', this.user);
      formData.append('pass', this.pass);
      formData.append('sender', this.sender);
      formData.append('phone', normalizedPhone);
      formData.append('text', this.template); // Template ID/Name
      formData.append('priority', 'wa');
      formData.append('stype', 'normal');     // Fixed as 'normal' per user snippet for POST API
      formData.append('Params', variables);

      console.log(`📨 Sending WhatsApp via POST [${this.template}] to ${normalizedPhone} (Priority: wa, SType: normal)...`);
      
      const response = await axios.post(this.apiUrl, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000 
      });

      console.log('✅ WhatsApp Response:', response.data);

      // BhashSMS success usually contains "S." (S.MessageID)
      if (typeof response.data === 'string' && response.data.includes('S.')) {
        return { success: true, response: response.data };
      } else {
        console.warn('⚠️ WhatsApp API Warning:', response.data);
        return { success: false, response: response.data };
      }

    } catch (error) {
      console.error('❌ WhatsApp Service Error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

export default new WhatsAppService();
