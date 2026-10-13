import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSave,
  FiDownload,
  FiUpload,
  FiSmartphone,
  FiCheck,
  FiRotateCcw,
  FiShield,
  FiFolder,
  FiCloud,
  FiCopy,
  FiLogOut,
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';
import { DEFAULT_WHATSAPP_TEMPLATE } from './whatsappUtils';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { shop, updateShop, exportBackup, importBackup, customers, bills, payments, logout, activeCloudUid } = useKhata();
  const { showToast } = useToast();

  const [shopName, setShopName] = useState(shop?.shopName || '');
  const [folderName, setFolderName] = useState(shop?.folderName || '');
  const [ownerName, setOwnerName] = useState(shop?.ownerName || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [upiId, setUpiId] = useState(shop?.upiId || '');
  const [theme, setTheme] = useState(shop?.theme || 'royal-blue');
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    shop?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE
  );

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!shop) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      showToast('दुकान का नाम आवश्यक है', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateShop({
        shopName: shopName.trim(),
        folderName: (folderName.trim() || shopName.trim()).replace(/[^\w\u0900-\u097F]/g, '_'),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        upiId: upiId.trim() || undefined,
        theme,
        whatsappTemplate,
      });

      showToast('दुकान विवरण और सेटिंग्स सफलतापूर्वक सहेजे गए!', 'success');
    } catch (err: any) {
      showToast('सेव करने में त्रुटि: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Export Complete Backup JSON File
  const handleExportBackup = async () => {
    try {
      const jsonString = await exportBackup();
      const safeName = (shop.folderName || shop.shopName).replace(/[^\w\u0900-\u097F]/g, '_');
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `khata_backup_${safeName}_${dateStr}.json`;

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`बैकअप फाइल "${filename}" सफलतापूर्वक डाउनलोड हो गई!`, 'success');
    } catch (err: any) {
      showToast('बैकअप बनाने में त्रुटि: ' + err.message, 'error');
    }
  };

  // Import Backup File
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      window.confirm(
        'क्या आप वाकई इस बैकअप फाइल को लोड करना चाहते हैं? इससे वर्तमान डेटा अपडेट/मर्ज हो जाएगा।'
      )
    ) {
      try {
        const text = await file.text();
        await importBackup(text);
        showToast('बैकअप फाइल से डेटा सफलतापूर्वक रीस्टोर हो गया!', 'success');
        navigate('/');
      } catch (err: any) {
        showToast('इम्पोर्ट करने में त्रुटि: ' + err.message, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleCopyUid = () => {
    const uid = activeCloudUid || shop?.uid;
    if (uid) {
      navigator.clipboard?.writeText(uid);
      showToast('UID कॉपी हो गया: ' + uid, 'success');
    }
  };

  const handleLogout = async () => {
    if (
      window.confirm(
        'क्या आप वाकई दुकान से लॉगआउट करना चाहते हैं?\n\nचिंता न करें: आपका डेटा फोन में और क्लाउड में सुरक्षित रहेगा। आप जब चाहें दोबारा UID डालकर या बैकअप फाइल से अपना खाता खोल सकेंगे।'
      )
    ) {
      await logout();
      showToast('सफलतापूर्वक लॉगआउट हो गए', 'info');
      navigate('/onboarding');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
        >
          <FiArrowLeft className="w-4 h-4" /> डैशबोर्ड
        </button>

        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 inline-flex items-center gap-1">
          <FiShield className="w-3.5 h-3.5" /> 100% ऑफ़लाइन सुरक्षित
        </span>
      </div>

      <div className="space-y-6">
        {/* Shop Profile Form */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-black text-slate-900 mb-1">दुकान एवं खाता सेटिंग्स</h2>
          <p className="text-xs text-slate-500 mb-4">दुकान का नाम, फ़ोल्डर, मोबाइल और UPI ID बदलें</p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दुकान / व्यापार का नाम *
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  फ़ोल्डर का नाम (Folder Name)
                </label>
                <div className="relative">
                  <FiFolder className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  दुकानदार का नाम *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  मोबाइल नंबर *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            {/* UPI ID */}
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
              <label className="block text-xs font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FiSmartphone className="w-4 h-4 text-emerald-600" />
                दुकान की UPI ID (ऑटो-अमाउंट QR कोड हेतु)
              </label>
              <input
                type="text"
                placeholder="उदा. 9876543210@paytm या shop@axl"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 bg-white text-slate-900 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                ⚡ यह UPI ID डालते ही सभी बिलों और काउंटर QR पर ग्राहक स्कैन करके सीधा पेमेंट कर सकेंगे।
              </p>
            </div>

            {/* WhatsApp Template Customization */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <FaWhatsapp className="w-4 h-4 text-emerald-600" /> WhatsApp संदेश प्रारूप (Template)
                </label>
                <button
                  type="button"
                  onClick={() => setWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <FiRotateCcw className="w-3 h-3" /> डिफ़ॉल्ट करें
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mb-2">
                उपलब्ध कोड: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;shopName&#125;</code>,{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;customerName&#125;</code>,{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;accountUid&#125;</code>,{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;todayDate&#125;</code>,{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;totalAmount&#125;</code>,{' '}
                <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">&#123;upiSection&#125;</code>
              </p>
              <textarea
                rows={6}
                value={whatsappTemplate}
                onChange={(e) => setWhatsappTemplate(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              {saving ? 'सहेजा जा रहा है...' : 'सेटिंग्स सहेजें (Save Changes)'}
            </button>
          </form>
        </div>

        {/* Backup & Restore Card */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-black text-slate-900 mb-1">डेटा बैकअप एवं रीस्टोर (100% Offline)</h2>
          <p className="text-xs text-slate-500 mb-4">
            कुल <strong className="text-slate-800">{customers.length} ग्राहक</strong>,{' '}
            <strong className="text-slate-800">{bills.length} बिल</strong> और{' '}
            <strong className="text-slate-800">{payments.length} लेन-देन</strong> आपके फोन में सुरक्षित हैं।
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export */}
            <button
              onClick={handleExportBackup}
              className="p-4 rounded-2xl border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-50 text-left flex items-start gap-3 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <FiDownload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-blue-950">पूरा बैकअप डाउनलोड करें</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  एक क्लिक में .json बैकअप फाइल फोन में सेव करें या व्हाट्सएप पर भेजें।
                </p>
              </div>
            </button>

            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-left flex items-start gap-3 transition-all cursor-pointer active:scale-95"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <FiUpload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950">पुराना बैकअप लोड करें</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  दूसरे फोन या पुराने बैकअप फाइल से सारा डेटा वापस लाएं।
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Firebase Cloud Sync & UID Card */}
        <div className="p-6 bg-white rounded-3xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FiCloud className="w-5 h-5 text-emerald-600" />
              क्लाउड सिंक एवं खाता UID (Firebase Cloud)
            </h2>
            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              सिंक सक्रिय
            </span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            यह आपकी ऑनलाइन दुकान की यूनीक पहचान (UID) है। किसी दूसरे फोन या नए डिवाइस में ऐप इंस्टॉल करके यह UID डालने पर आपका पूरा खाता वापस आ जाएगा:
          </p>

          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shop Cloud UID</span>
              <span className="font-mono font-bold text-xs text-slate-900 break-all select-all">
                {activeCloudUid || shop.uid || 'उपलब्ध नहीं'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUid}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 shrink-0 transition-all"
            >
              <FiCopy className="w-3.5 h-3.5" /> कॉपी करें
            </button>
          </div>
        </div>

        {/* Logout / Switch Account Card */}
        <div className="p-6 bg-white rounded-3xl border border-rose-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-rose-950 flex items-center gap-2">
                <FiLogOut className="w-5 h-5 text-rose-600" />
                लॉगआउट / दुकान बदलें (Logout & Switch Shop)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
                लॉगआउट करने पर आपका फोन बैकअप और क्लाउड डेटा 100% सुरक्षित रहेगा। आप नई दुकान बना सकेंगे या दूसरी दुकान का UID डालकर खाता बदल सकेंगे।
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <FiLogOut className="w-4 h-4" /> लॉगआउट करें
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
