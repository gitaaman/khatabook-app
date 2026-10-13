import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSmartphone } from 'react-icons/fi';
import { useKhata } from './KhataContext';
import { generateQRCodeDataURL } from './qrUtils';

interface UPIQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAmount?: number;
  customerName?: string;
}

export const UPIQRCodeModal: React.FC<UPIQRCodeModalProps> = ({
  isOpen,
  onClose,
  defaultAmount,
  customerName,
}) => {
  const { shop } = useKhata();
  const [amount, setAmount] = useState<string>(defaultAmount ? defaultAmount.toString() : '');
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (defaultAmount && defaultAmount > 0) {
      setAmount(defaultAmount.toString());
    }
  }, [defaultAmount]);

  useEffect(() => {
    if (isOpen && shop?.upiId) {
      const parsed = parseFloat(amount);
      const cleanAmt = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
      generateQRCodeDataURL(shop.upiId, shop.shopName, cleanAmt, 'Counter', 300)
        .then((url) => setQrUrl(url))
        .catch(() => {});
    }
  }, [isOpen, shop?.upiId, shop?.shopName, amount]);

  if (!isOpen || !shop) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-sm w-full bg-white rounded-3xl shadow-2xl p-6 z-10 text-center border border-slate-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FiSmartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">UPI QR कोड पेमेंट</h3>
                <p className="text-[11px] text-slate-500">{shop.shopName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {customerName && (
            <p className="text-xs font-bold text-slate-600 mb-2">
              ग्राहक: <span className="text-slate-900 font-black">{customerName}</span>
            </p>
          )}

          {/* Amount input */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
              भुगतान राशि (₹)
            </label>
            <input
              type="number"
              step="any"
              placeholder="राशि दर्ज करें"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-center py-2 px-3 rounded-xl border border-slate-200 text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* QR Code display */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-3">
            {qrUrl ? (
              <img src={qrUrl} alt="UPI QR Code" className="w-56 h-56 mx-auto object-contain block" />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400 font-bold">
                QR कोड बनाया जा रहा है...
              </div>
            )}
          </div>

          <div className="text-xs font-mono font-bold text-slate-700 mb-1">
            UPI ID: <span className="text-emerald-700">{shop.upiId || 'Not set'}</span>
          </div>

          <p className="text-[11px] font-semibold text-slate-500">
            PhonePe, Google Pay, Paytm या अन्य किसी भी UPI ऐप से स्कैन करें
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
