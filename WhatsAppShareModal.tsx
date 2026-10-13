import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiFileText, FiHeart, FiDollarSign } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import type { ShopProfile, Customer, Bill, PaymentEntry } from './database.types';
import {
  formatWhatsAppBillMessage,
  formatWhatsAppMonthlySummaryMessage,
  formatWhatsAppThankYouMessage,
  openWhatsApp,
} from './whatsappUtils';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: ShopProfile | null;
  customer: Customer;
  bills: Bill[];
  payments: PaymentEntry[];
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  shop,
  customer,
  bills,
  payments,
}) => {
  const [selectedType, setSelectedType] = useState<'reminder' | 'monthly' | 'thankyou'>('reminder');

  if (!isOpen || !shop) return null;

  // Generate preview based on selected type
  let message = '';
  if (selectedType === 'reminder') {
    const latestBill = bills[0];
    message = formatWhatsAppBillMessage(shop, customer, latestBill, bills);
  } else if (selectedType === 'monthly') {
    message = formatWhatsAppMonthlySummaryMessage(shop, customer, bills, payments);
  } else {
    message = formatWhatsAppThankYouMessage(shop, customer);
  }

  const handleSend = () => {
    openWhatsApp(customer.phone, message);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-sm w-full bg-white rounded-2xl shadow-xl p-4.5 z-10 border border-slate-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FaWhatsapp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">WhatsApp संदेश चुनें</h3>
                <p className="text-[11px] text-slate-500 font-medium">{customer.name} ({customer.phone})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Message Type Options */}
          <div className="space-y-1.5 mb-3">
            {/* 1. Payment Reminder */}
            <button
              type="button"
              onClick={() => setSelectedType('reminder')}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                selectedType === 'reminder'
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <FiDollarSign className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold">1. बकाया पेमेंट तकादा (Due Reminder)</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  कुल बाकी ₹{Math.abs(customer.runningBalance).toFixed(2)}, UID व UPI लिंक (बिना सामान लिस्ट)
                </div>
              </div>
            </button>

            {/* 2. Monthly Summary */}
            <button
              type="button"
              onClick={() => setSelectedType('monthly')}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                selectedType === 'monthly'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <FiFileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold">2. 30 दिन का खाता हिसाब (Monthly Report)</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  पिछले 30 दिन में कितनी खरीदारी और कितना जमा हुआ उसका पूरा विवरण
                </div>
              </div>
            </button>

            {/* 3. Thank You Greeting */}
            <button
              type="button"
              onClick={() => setSelectedType('thankyou')}
              className={`w-full p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                selectedType === 'thankyou'
                  ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-bold shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <FiHeart className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold">3. धन्यवाद संदेश (Thank You Greeting)</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  विश्वास और खरीदारी के लिए सम्मानित ग्राहक को विनम्र आभार संदेश
                </div>
              </div>
            </button>
          </div>

          {/* Live Message Preview Box */}
          <div className="mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              मैसेज प्रीव्यू (Message Preview)
            </span>
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none">
              {message}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleSend}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <FaWhatsapp className="w-4 h-4 text-emerald-200" />
            WhatsApp पर भेजें (Send on WhatsApp)
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WhatsAppShareModal;
