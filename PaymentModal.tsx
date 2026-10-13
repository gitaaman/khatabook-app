import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck } from 'react-icons/fi';
import type { Customer } from './database.types';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  defaultType?: 'payment_received' | 'credit_given';
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  defaultType = 'payment_received',
}) => {
  const { addPayment } = useKhata();
  const { showToast } = useToast();

  const [type, setType] = useState<'payment_received' | 'credit_given'>(defaultType);
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = parseFloat(amount);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      showToast('कृपया सही राशि दर्ज करें', 'error');
      return;
    }

    setLoading(true);
    try {
      await addPayment({
        customerId: customer.id,
        amount: cleanAmount,
        type,
        paymentMode,
        date: new Date().toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      });

      const label = type === 'payment_received' ? 'जमा (Cash In)' : 'उधार (Credit)';
      showToast(`₹${cleanAmount} का ${label} दर्ज हो गया!`, 'success');
      setAmount('');
      setNotes('');
      onClose();
    } catch (err: any) {
      showToast('प्रविष्टि दर्ज करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuickAmount = (val: number) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(current + val));
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative max-w-sm w-full bg-white rounded-2xl shadow-xl p-5 z-10 border border-slate-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Add Transaction (लेन-देन दर्ज)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {customer.name} (बकाया: ₹{customer.runningBalance.toFixed(2)})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Type Toggle: Jama Received vs Udhar Given */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('payment_received')}
                className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  type === 'payment_received'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                💰 पैसे मिले (जमा)
              </button>
              <button
                type="button"
                onClick={() => setType('credit_given')}
                className={`py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  type === 'credit_given'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📉 उधार दिया (बाकी)
              </button>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Amount / राशि (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-base font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Quick Amount Chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {[100, 200, 500, 1000].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleAddQuickAmount(chip)}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 cursor-pointer"
                  >
                    +₹{chip}
                  </button>
                ))}
                {customer.runningBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(customer.runningBalance))}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200 cursor-pointer"
                  >
                    Full Due (₹{customer.runningBalance.toFixed(0)})
                  </button>
                )}
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Payment Mode (माध्यम)
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['cash', 'upi', 'bank'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border cursor-pointer ${
                      paymentMode === mode
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'cash' ? '💵 Cash (नकद)' : mode === 'upi' ? '⚡ UPI / QR' : '🏦 Bank'}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Note / टिप्पणी (वैकल्पिक)
              </label>
              <input
                type="text"
                placeholder="उदा. गूगल पे, फोन पे, नकद"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50 ${
                  type === 'payment_received' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                <FiCheck className="w-4 h-4" />
                {loading ? 'Saving...' : type === 'payment_received' ? 'Save Payment (जमा दर्ज)' : 'Save Udhaar (उधार दर्ज)'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PaymentModal;
