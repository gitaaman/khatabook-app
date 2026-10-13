import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFolder, FiBell, FiShield, FiCheckCircle } from 'react-icons/fi';

interface PermissionsModalProps {
  isOpen: boolean;
  onGrant: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onGrant }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 z-10 border border-slate-200"
        >
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <FiShield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-black text-slate-900">ऐप अनुमतियाँ (Permissions)</h2>
            <p className="text-xs text-slate-500 font-semibold mt-1">
              खाता बुक को 100% ऑफ़लाइन सुरक्षित चलाने के लिए निम्नलिखित अनुमतियों की आवश्यकता है:
            </p>
          </div>

          <div className="space-y-3.5 mb-6">
            {/* Storage Permission */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <FiFolder className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  1. फ़ोल्डर एवं स्टोरेज अनुमति (Storage Access)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  आपके मोबाइल में दुकान के नाम का सुरक्षित बैकअप फ़ोल्डर बनाने, ऑफ़लाइन बिल सहेजने और PDF डाउनलोड करने हेतु।
                </p>
              </div>
            </div>

            {/* Notification Permission */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <FiBell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  2. सूचना अनुमति (Notification Alert)
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  बकाया उधारी के रिमाइंडर्स और बैकअप अलर्ट्स दिखाने के लिए।
                </p>
              </div>
            </div>

            {/* Offline Privacy Guarantee */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800 text-xs font-bold">
              <FiCheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>100% ऑफ़लाइन: आपका डेटा सिर्फ आपके फोन में सुरक्षित रहेगा।</span>
            </div>
          </div>

          <button
            onClick={onGrant}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            अनुमति दें और आगे बढ़ें (Accept & Continue)
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
