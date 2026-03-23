import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChefHat, MapPin, Phone, 
  ChevronDown, ChevronUp, Package, 
  Navigation, CheckCircle2, Camera, Loader2
} from 'lucide-react';
import { ActionSlider } from '@/modules/DeliveryV2/components/ui/ActionSlider';
import { uploadAPI } from '@food/api';
import { toast } from 'sonner';

/**
 * PickupActionModal - Unified White/Green Theme with Slider Actions.
 * Includes Bill Upload feature prior to pickup.
 */
export const PickupActionModal = ({ 
  order, 
  status, 
  isWithinRange, 
  onReachedPickup, 
  onPickedUp 
}) => {
  const [showItems, setShowItems] = useState(false);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [billImageUploaded, setBillImageUploaded] = useState(false);
  const [billImageUrl, setBillImageUrl] = useState(null);
  const cameraInputRef = useRef(null);

  if (!order) return null;

  const handleBillImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploadingBill(true);
    try {
      const res = await uploadAPI.uploadMedia(file, { folder: 'appzeto/delivery/bills' });
      if (res?.data?.success && res?.data?.data) {
        setBillImageUrl(res.data.data.url || res.data.data.secure_url);
        setBillImageUploaded(true);
        toast.success('Bill image uploaded!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      toast.error('Failed to upload bill image');
      setBillImageUploaded(false);
      setBillImageUrl(null);
    } finally {
      setIsUploadingBill(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const isAtPickup = status === 'REACHED_PICKUP';
  const restaurantName = order.restaurantName || order.restaurant_name || 'Restaurant';
  const restaurantAddress = order.restaurantAddress || order.restaurant_address || order.restaurantLocation?.address || 'Address not available';
  const restaurantPhone = order.restaurantPhone || order.restaurant_phone || order.restaurantId?.phone || '';
  const items = order.items || [];

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] p-0 sm:p-4 h-full flex items-end">
      {/* Background Dim */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm -z-10" 
      />

      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="w-full bg-white rounded-t-[2.5rem] shadow-[0_-20px_60px_rgba(0,0,0,0.3)] p-6 pb-12"
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

        {/* Restaurant Header */}
        <div className="flex items-start justify-between mb-8 pb-4 border-b border-gray-50">
          <div className="flex gap-4">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-gray-950 text-xl font-bold">{restaurantName}</h3>
              <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {restaurantAddress}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {restaurantPhone && (
              <button 
                onClick={() => window.location.href = `tel:${restaurantPhone}`}
                className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 border border-green-100"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurantAddress)}`, '_blank')}
              className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-white shadow-lg"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Sliders */}
        <div className="space-y-6">
          {!isAtPickup ? (
            <div>
              <p className={`text-center text-[10px] font-bold uppercase tracking-widest mb-3 transition-colors ${
                isWithinRange ? 'text-green-600' : 'text-orange-500 animate-pulse'
              }`}>
                {isWithinRange ? 'Ready - Swipe to confirm arrival' : 'Get closer to restaurant'}
              </p>
              <ActionSlider 
                key="action-reach"
                label="Slide to Reach" 
                successLabel="Reached!"
                disabled={!isWithinRange}
                onConfirm={onReachedPickup}
                color="bg-green-600"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center flex-col items-center gap-2">
                 <button
                   onClick={() => cameraInputRef.current?.click()}
                   disabled={isUploadingBill}
                   className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${
                     isUploadingBill
                       ? "bg-gray-100 text-gray-400"
                       : billImageUploaded
                         ? "bg-green-100 text-green-700 border border-transparent shadow-none"
                         : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                   }`}
                 >
                   {isUploadingBill ? (
                     <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                   ) : billImageUploaded ? (
                     <><CheckCircle2 className="w-4 h-4" /> Bill Uploaded</>
                   ) : (
                     <><Camera className="w-4 h-4" /> Capture Bill Photo</>
                   )}
                 </button>
                 <input
                   ref={cameraInputRef}
                   type="file"
                   accept="image/*"
                   capture="environment"
                   onChange={handleBillImageSelect}
                   className="hidden"
                 />
              </div>

              <div>
                <p className={`text-center text-[10px] font-bold uppercase tracking-widest mb-3 ${billImageUploaded ? 'text-green-600' : 'text-gray-400'}`}>
                  {billImageUploaded ? "Found the restaurant - Swipe to Pick up" : "Upload bill to unlock swipe"}
                </p>
                <ActionSlider 
                  key="action-pickup"
                  label="Slide to Pick Up" 
                  successLabel="Picked Up!"
                  disabled={!billImageUploaded}
                  onConfirm={() => onPickedUp(billImageUrl)}
                  color="bg-orange-500"
                />
              </div>
            </div>
          )}

          {/* Collapsible Order Summary */}
          <button 
            onClick={() => setShowItems(!showItems)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3 text-gray-900 font-bold text-xs uppercase tracking-widest">
              <Package className="w-5 h-5 text-gray-400" />
              <span>Order Details ({items.length || 0})</span>
            </div>
            {showItems ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          {showItems && (
            <div className="overflow-hidden space-y-2 px-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 text-sm font-bold">{item.name || 'Item Name'}</span>
                  <span className="text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-lg text-xs">x{item.quantity || 1}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
