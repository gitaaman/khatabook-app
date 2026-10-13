import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBook, FiPlus, FiDownloadCloud, FiUser, FiPhone, FiCheck, FiArrowLeft, FiCloud } from 'react-icons/fi';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';

export const Onboarding: React.FC = () => {
  const { createShop, addCustomer, addBill, importBackup, restoreFromDeviceStorage, restoreFromCloud } = useKhata();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<'choose' | 'create_form' | 'cloud_login'>('choose');

  // Form State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [theme, setTheme] = useState('royal-blue');
  const [cloudUidInput, setCloudUidInput] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick 1-tap demo mode with 100% fictional dummy data
  const handleQuickDemo = async () => {
    setLoading(true);
    try {
      await createShop({
        shopName: 'श्री गणेश किराना स्टोर (डेमो)',
        ownerName: 'रमेश कुमार',
        phone: '9876543210',
        upiId: 'ganeshkirana@upi',
        folderName: 'Ganesh_Kirana_Demo',
        theme: 'royal-blue',
      });

      // Add sample customers with bills for instant rich demo
      const cust1 = await addCustomer({
        name: 'सुरेश वर्मा',
        phone: '9812345678',
        address: 'मेन मार्केट',
        passcode: '1234',
      });

      await addBill({
        billNumber: 'BILL-101',
        customerId: cust1.id,
        billDate: new Date().toISOString().split('T')[0],
        totalAmount: 1000,
        paymentStatus: 'pending',
        items: [
          { name: 'सरसों तेल 1L', quantity: 2, rate: 500, price: 500, total: 1000, unit: 'ltr' },
        ],
      });

      await addCustomer({
        name: 'राजेश गुप्ता',
        phone: '9876512345',
        address: 'सदर बाजार',
        passcode: '5678',
      });

      showToast('डेमो खाता (2 ग्राहक व ₹1000 बिल) शुरू हो गया!', 'success');
      navigate('/');
    } catch (err: any) {
      showToast('त्रुटि: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Restore from Android phone storage (Documents/KhataBook/json/KhataBook_Backup.json)
  const handleRestoreFromDevice = async () => {
    setLoading(true);
    try {
      const ok = await restoreFromDeviceStorage();
      if (ok) {
        showToast('Documents/KhataBook से सारा डेटा लोड हो गया!', 'success');
        navigate('/');
      } else {
        showToast('फोन में कोई पूर्व बैकअप फाइल नहीं मिली। कृपया JSON फाइल चुनें।', 'info');
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      showToast('रीस्टोर त्रुटि: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Restore existing Firebase shop by UID
  const handleRestoreExistingCloudShop = async (uid: string) => {
    if (!uid.trim()) {
      showToast('कृपया क्लाउड यूआईडी (UID) या मोबाइल नंबर दर्ज करें', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await restoreFromCloud(uid.trim());
      if (res.success) {
        showToast('क्लाउड से डेटा सफलतापूर्वक लोड हो गया!', 'success');
        navigate('/');
      } else {
        showToast(res.message || 'क्लाउड डेटा नहीं मिला या इंटरनेट कनेक्शन जांचें', 'error');
      }
    } catch (err: any) {
      showToast('क्लाउड लोड त्रुटि: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      showToast('कृपया दुकान का नाम दर्ज करें', 'error');
      return;
    }
    if (!ownerName.trim()) {
      showToast('कृपया अपना नाम दर्ज करें', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('कृपया मोबाइल नंबर दर्ज करें', 'error');
      return;
    }

    setLoading(true);
    try {
      await createShop({
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        upiId: upiId.trim() || undefined,
        folderName: shopName.trim().replace(/\s+/g, '_'),
        theme,
      });

      showToast(`खाता बुक तैयार है!`, 'success');
      navigate('/');
    } catch (err: any) {
      showToast('खाता शुरू करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Import Backup JSON File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      await importBackup(text);
      showToast('डेटा सफलतापूर्वक लोड हो गया!', 'success');
      navigate('/');
    } catch (err: any) {
      showToast('बैकअप फाइल पढ़ने में समस्या: ' + err.message, 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl p-6 border border-slate-200"
      >
        {/* Brand Logo & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-blue-500/20">
            <FiBook className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">खाता बुक (Khata Book)</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            100% ऑफ़लाइन सुरक्षित • ऑटो क्लाउड बैकअप
          </p>
        </div>

        {/* STEP 1: CHOOSE ACTION */}
        {step === 'choose' && (
          <div className="space-y-3">
            {/* 1. Quick Instant Demo (Skippable Login) */}
            <button
              onClick={handleQuickDemo}
              disabled={loading}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center gap-3.5 shadow-md shadow-blue-600/20 hover:opacity-95 transition-all text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                🚀
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm">तुरंत टेस्ट करें (Skip & Test Demo)</h3>
                <p className="text-[11px] text-blue-100 font-medium">बिना फॉर्म भरे सीधे ऐप का डेमो और UI देखें</p>
              </div>
            </button>

            {/* 2. Device Storage 1-Click Restore */}
            <button
              onClick={handleRestoreFromDevice}
              disabled={loading}
              className="w-full p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 hover:border-amber-400 text-amber-950 flex items-center gap-3.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-lg">
                📂
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm">फोन स्टोरेज से ऑटो-रीस्टोर</h3>
                <p className="text-[11px] text-amber-800 font-medium">Documents/KhataBook/json से 1-क्लिक में डेटा लाएं</p>
              </div>
            </button>

            {/* 3. Create New Custom Shop */}
            <button
              onClick={() => setStep('create_form')}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 flex items-center gap-3.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FiPlus className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm">नया खाता बनाएं (Create New Shop)</h3>
                <p className="text-[11px] text-slate-500 font-medium">अपनी दुकान/व्यापार के नाम से शुरू करें</p>
              </div>
            </button>

            {/* 4. Existing Cloud Account Connect */}
            <button
              onClick={() => setStep('cloud_login')}
              className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-400 text-slate-800 flex items-center gap-3.5 transition-all text-left cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FiCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm">क्लाउड बैकअप जोड़ें (Firebase Sync)</h3>
                <p className="text-[11px] text-slate-500 font-medium">UID से ऑनलाइन डेटा रीस्टोर करें</p>
              </div>
            </button>

            {/* 5. Import JSON Backup File */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-600 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <FiDownloadCloud className="w-4 h-4 text-slate-500" />
              <span>बैकअप फाइल चुनें (.json)</span>
            </button>
          </div>
        )}

        {/* STEP 2: CREATE SHOP FORM */}
        {step === 'create_form' && (
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" /> वापस
              </button>
              <span className="text-xs font-bold text-slate-700">दुकान की जानकारी</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">दुकान का नाम *</label>
              <input
                type="text"
                required
                placeholder="उदा. श्री गणेश किराना स्टोर, जनता जनरल स्टोर"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">दुकानदार / आपका नाम *</label>
              <input
                type="text"
                required
                placeholder="उदा. रमेश कुमार"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">मोबाइल नंबर *</label>
              <input
                type="tel"
                required
                placeholder="उदा. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">UPI ID (QR कोड व पेमेंट हेतु - वैकल्पिक)</label>
              <input
                type="text"
                placeholder="उदा. ganeshkirana@upi या 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" />
              {loading ? 'सहेजा जा रहा है...' : 'खाता बुक शुरू करें'}
            </button>
          </form>
        )}

        {/* STEP 3: CLOUD SYNC EXISTING SHOPS */}
        {step === 'cloud_login' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <FiArrowLeft className="w-3.5 h-3.5" /> वापस
              </button>
              <span className="text-xs font-bold text-slate-700">क्लाउड रीस्टोर (Firebase)</span>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 text-xs">
              <p className="font-bold mb-1">UID क्या है?</p>
              <p className="text-[11px] leading-relaxed text-emerald-900">
                जब आप अपनी दुकान बनाते हैं तो आपकी दुकान को एक यूनीक कोड (UID) मिलता है (जैसे <code className="bg-white/80 px-1 py-0.5 rounded font-mono">shop_9876543210</code> या आपका मोबाइल नंबर)।
                यह कोड डालकर आप किसी भी फोन में अपना पूरा खाता तुरंत खोल सकते हैं।
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">अपनी दुकान का UID या मोबाइल नंबर</label>
              <input
                type="text"
                placeholder="उदा. shop_9876543210 या UID"
                value={cloudUidInput}
                onChange={(e) => setCloudUidInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setCloudUidInput('o2lWfVkMqNPTFoSc1CY9dtqE0xL2')}
                  className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  🧪 लाइव क्लाउड दुकान टेस्ट करें (Shiv Shankar Kirana)
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleRestoreExistingCloudShop(cloudUidInput)}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all active:scale-95"
              >
                <FiCloud className="w-4 h-4" /> {loading ? 'लोड हो रहा है...' : 'क्लाउड से खाता लोड करें'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
