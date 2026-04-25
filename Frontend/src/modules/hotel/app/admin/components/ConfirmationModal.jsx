import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, type = 'danger', confirmText = 'Confirm', extraContent }) => {
    if (!isOpen) return null;

    const colors = {
        danger: { bg: 'bg-red-50', icon: 'text-red-600', button: 'bg-red-600 hover:bg-red-700' },
        success: { bg: 'bg-green-50', icon: 'text-green-600', button: 'bg-green-600 hover:bg-green-700' },
        warning: { bg: 'bg-amber-50', icon: 'text-amber-600', button: 'bg-amber-600 hover:bg-amber-700' },
    };

    const style = colors[type];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
                >
                    <div className="p-6 text-center">
                        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${style.bg}`}>
                            {type === 'success' ? <CheckCircle className={style.icon} size={24} /> : <AlertTriangle className={style.icon} size={24} />}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{message}</p>
                        {extraContent && <div className="mb-4 text-left">{extraContent}</div>}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => { onConfirm(); onClose(); }}
                                className={`flex-1 px-4 py-2 text-white font-bold rounded-lg transition-colors shadow-lg ${style.button}`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmationModal;
