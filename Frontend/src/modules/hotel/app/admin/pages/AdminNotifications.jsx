import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Trash2, CheckCircle,
  Circle, Users, Building2, Globe, Search,
  ImagePlus, X, Loader2
} from 'lucide-react';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';

const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [targetAudience, setTargetAudience] = useState('users'); // 'users', 'partners', 'all'
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // Mark all as read if viewing Received tab
      if (activeTab === 'received') {
        try {
          await adminService.markAllNotificationsRead();
        } catch (err) {
          console.error('Failed to mark notifications read', err);
        }
      }

      // Re-using getNotifications. For 'received', we use default.
      // For 'sent', strictly speaking we need to filter by type='broadcast_log'.
      // Currently backend returns all admin notifications.
      // Ideally we filter client side or add type param to backend.
      // Let's fetch all and filter client side for now as volume is low.
      const data = await adminService.getNotifications(1, 100);
      if (data.success) {
        if (activeTab === 'received') {
          // Show everything EXCEPT broadcast logs
          const received = data.notifications.filter(n => n.type !== 'broadcast_log');
          setNotifications(received);
        } else {
          // Show ONLY broadcast logs
          const sent = data.notifications.filter(n => n.type === 'broadcast_log');
          setNotifications(sent);
        }
      }
    } catch (error) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit (e.g., 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('images', file);
    formData.append('type', 'notifications'); // For folder organization

    try {
      const data = await adminService.uploadImage(formData);
      if (data.success) {
        setBroadcastImage(data.url);
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Upload Error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastBody) return;

    setSending(true);
    try {
      await adminService.sendNotification({
        title: broadcastTitle,
        body: broadcastBody,
        image: broadcastImage,
        url: broadcastUrl,
        targetAudience
      });
      toast.success('Broadcast sent successfully');
      setBroadcastTitle('');
      setBroadcastBody('');
      setBroadcastImage('');
      setBroadcastUrl('');
      // Refresh list if on Sent tab
      if (activeTab === 'sent') fetchNotifications();
    } catch (error) {
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map(n => n._id));
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} notifications?`)) return;

    try {
      await adminService.deleteNotifications(selectedIds);
      toast.success('Deleted successfully');
      setNotifications(notifications.filter(n => !selectedIds.includes(n._id)));
      setSelectedIds([]);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 text-sm">Manage system alerts and broadcasts</p>
        </div>

        <div className="flex bg-white rounded-lg p-1 border shadow-sm self-start">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'received' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
          >
            Received
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'sent' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
          >
            Sent (Broadcasts)
          </button>
        </div>
      </div>

      {/* Broadcast Creation Form (Only visible in Sent tab) */}
      <AnimatePresence>
        {activeTab === 'sent' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 overflow-hidden"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Send size={20} className="text-blue-500" />
              Send New Broadcast
            </h2>
            <form onSubmit={handleSendBroadcast} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-gray-500">Target Audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTargetAudience('users')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'users' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Users size={20} />
                      <span className="text-xs font-bold">Users</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('partners')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'partners' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Building2 size={20} />
                      <span className="text-xs font-bold">Partners</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetAudience('all')}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${targetAudience === 'all' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <Globe size={20} />
                      <span className="text-xs font-bold">Everyone</span>
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Title</label>
                      <input
                        type="text"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        placeholder="Notification Title"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all"
                        required
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Notification Image (Optional)</label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      
                      {!broadcastImage ? (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all group h-[48px]"
                        >
                          {uploadingImage ? (
                            <Loader2 size={20} className="animate-spin text-blue-500" />
                          ) : (
                            <>
                              <ImagePlus size={20} className="text-gray-400 group-hover:text-blue-500" />
                              <span className="text-xs font-bold text-gray-500 group-hover:text-blue-700">Click to Upload Image</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="relative group w-fit">
                          <img
                            src={broadcastImage}
                            alt="Preview"
                            className="h-12 w-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setBroadcastImage('')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Redirect URL (e.g., /bookings)</label>
                    <input
                      type="text"
                      value={broadcastUrl}
                      onChange={(e) => setBroadcastUrl(e.target.value)}
                      placeholder="/offers or /bookings"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Message Body</label>
                    <textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Type your message here..."
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all resize-none"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sending}
                      className="px-6 py-2.5 bg-black text-white rounded-lg font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send size={18} />
                      {sending ? 'Sending...' : 'Send Broadcast'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-gray-400 hover:text-black transition-colors">
              {selectedIds.length > 0 && selectedIds.length === notifications.length ? <CheckCircle size={20} className="text-black" /> : <Circle size={20} />}
            </button>
            <span className="text-sm font-bold text-gray-600">
              {selectedIds.length > 0 ? `${selectedIds.length} Selected` : `${notifications.length} Messages`}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDelete}
              className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400 italic">No notifications found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`p-4 flex gap-4 hover:bg-gray-50 transition-colors group cursor-pointer ${selectedIds.includes(notif._id) ? 'bg-blue-50/30' : ''}`}
                onClick={() => toggleSelect(notif._id)}
              >
                <div onClick={(e) => { e.stopPropagation(); toggleSelect(notif._id); }}>
                  {selectedIds.includes(notif._id) ?
                    <CheckCircle size={20} className="text-black mt-1" /> :
                    <Circle size={20} className="text-gray-300 group-hover:text-gray-500 mt-1" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`font-bold text-gray-900 truncate ${!notif.isRead && activeTab === 'received' ? 'text-black' : 'text-gray-700'}`}>
                      {notif.title}
                      {!notif.isRead && activeTab === 'received' && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">{notif.body}</p>

                  {/* Additional Data Display for Broadcast Logs */}
                  {activeTab === 'sent' && notif.data && (
                    <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded inline-block">
                      Target: <span className="font-bold uppercase text-gray-600">{notif.data.targetAudience}</span> •
                      Recipients: <span className="font-bold text-gray-600">{notif.data.recipientCount}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotifications;
