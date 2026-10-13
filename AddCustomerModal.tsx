import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiPhone, FiMapPin, FiCheck } from 'react-icons/fi';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose }) => {
  const { addCustomer } = useKhata();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [passcode, setPasscode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('कृपया ग्राहक का नाम दर्ज करें', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('कृपया मोबाइल नंबर दर्ज करें', 'error');
      return;
    }

    setLoading(true);
    try {
      await addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        passcode: passcode.trim() || Math.floor(1000 + Math.random() * 9000).toString(),
      });

      showToast(`ग्राहक "${name}" जोड़ा गया! (पासकोड: ${passcode})`, 'success');
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setPasscode(Math.floor(1000 + Math.random() * 9000).toString());
      onClose();
    } catch (err: any) {
      showToast('ग्राहक जोड़ने में समस्या: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
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
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FiUser className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Add Customer (नया ग्राहक)</h3>
                <p className="text-[11px] text-slate-500">नया खाता बही रजिस्टर करें</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Customer Name (नाम) *
              </label>
              <div className="relative">
                <FiUser className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="उदा. रामनिवास शर्मा"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Mobile Number (फोन नंबर) *
              </label>
              <div className="relative">
                <FiPhone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="10 अंकों का फोन नंबर"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Address / City (पता/स्थान - वैकल्पिक)
              </label>
              <div className="relative">
                <FiMapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="उदा. सदर बाजार, टूंगा"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-600">
                  Portal Passcode (ग्राहक पोर्टल पासकोड / PIN)
                </label>
                <button
                  type="button"
                  onClick={() => setPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
                  className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  🎲 नया कोड बनाएं
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs">🔑</span>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="4 से 6 अंकों का पासकोड (उदा. 4821)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                ग्राहक वेबसाइट पर इस पासकोड से लॉगिन करके अपना खाता व QR कोड देख सकेगा।
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                <FiCheck className="w-4 h-4" />
                {loading ? 'सहेजा जा रहा है...' : 'Save Customer (खाता खोलें)'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddCustomerModal;
