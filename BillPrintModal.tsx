import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPrinter, FiDownload } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import type { Customer, Bill, BillItem } from './database.types';
import { useKhata } from './KhataContext';
import { generateQRCodeDataURL } from './qrUtils';
import { generateInvoicePDF, generateConsolidatedPDF } from './pdfGenerator';
import { formatWhatsAppBillMessage, openWhatsApp } from './whatsappUtils';
import { useToast } from './ToastContext';

interface BillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  bill?: Bill | null;
  billsList?: Bill[];
  title?: string;
}

export const BillPrintModal: React.FC<BillPrintModalProps> = ({
  isOpen,
  onClose,
  customer,
  bill,
  billsList,
  title,
}) => {
  const { shop } = useKhata();
  const { showToast } = useToast();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [downloading, setDownloading] = useState(false);

  const isConsolidated = Array.isArray(billsList) && billsList.length > 0;

  const allItems: { item: BillItem; billNum?: string; date?: string }[] = [];
  let grandTotal = 0;

  if (isConsolidated && billsList) {
    billsList.forEach((b) => {
      grandTotal += b.totalAmount;
      b.items.forEach((item) => {
        allItems.push({ item, billNum: b.billNumber, date: b.billDate });
      });
    });
  } else if (bill) {
    grandTotal = bill.totalAmount;
    bill.items.forEach((item) => {
      allItems.push({ item, billNum: bill.billNumber, date: bill.billDate });
    });
  }

  useEffect(() => {
    if (isOpen && shop?.upiId && grandTotal > 0) {
      generateQRCodeDataURL(
        shop.upiId,
        shop.shopName,
        grandTotal,
        bill ? bill.billNumber : 'KhataTotal',
        240
      )
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [isOpen, shop?.upiId, grandTotal, bill]);

  if (!isOpen || !shop) return null;

  const handleNativePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      if (isConsolidated && billsList) {
        await generateConsolidatedPDF(shop, customer, billsList);
      } else if (bill) {
        await generateInvoicePDF(shop, customer, bill);
      }
      showToast('PDF बिल सफलतापूर्वक डाउनलोड हो गया!', 'success');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      showToast('PDF डाउनलोड करने में समस्या: ' + err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleWhatsAppShare = () => {
    const message = formatWhatsAppBillMessage(shop, customer, bill, billsList);
    openWhatsApp(customer.phone, message);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-w-2xl w-full bg-white text-slate-900 rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[92vh] border border-slate-200"
        >
          {/* Header Action Bar */}
          <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
            <div>
              <h3 className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                <FiPrinter className="w-4 h-4 text-emerald-400" />
                {title || (isConsolidated ? 'पूरा खाता विवरण (Ledger Statement)' : `बिल रसीद: ${bill?.billNumber}`)}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                शुद्ध हिंदी और अंग्रेजी में 100% ऑफ़लाइन प्रिंट, PDF डाउनलोड या WhatsApp शेयर करें
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="बंद करें"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-center sm:justify-start gap-2 shrink-0">
            <button
              onClick={handleNativePrint}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <FiPrinter className="w-4 h-4" /> 🖨️ डायरेक्ट प्रिंट (Print Now)
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <FiDownload className="w-4 h-4" /> {downloading ? 'PDF बन रहा है...' : '📥 PDF डाउनलोड करें'}
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <FaWhatsapp className="w-4 h-4 text-emerald-300" /> 📲 WhatsApp पर भेजें
            </button>
          </div>

          {/* Printable Bill Area */}
          <div className="p-4 sm:p-6 overflow-y-auto grow bg-white">
            <div id="printable-receipt-area" className="w-full max-w-xl mx-auto font-['Noto_Sans_Devanagari',sans-serif] text-slate-900">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b-2 border-slate-900 mb-4">
                <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                  {shop.shopName}
                </h1>
                <p className="text-xs font-bold text-slate-600 mt-1">
                  दुकानदार: <strong className="text-slate-900">{shop.ownerName}</strong> | मो.: <strong className="text-slate-900">{shop.phone}</strong>
                </p>
                <div className="mt-2 inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-black text-slate-800 border border-slate-300">
                  {isConsolidated ? 'खाता विवरण (CONSOLIDATED STATEMENT)' : 'बिल रसीद (TAX / CASH INVOICE)'}
                </div>
              </div>

              {/* Customer & Bill Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 block">ग्राहक का विवरण (CUSTOMER)</span>
                  <strong className="text-sm text-slate-900 block mt-0.5">{customer.name}</strong>
                  <span className="text-slate-600 block mt-0.5">मो.: {customer.phone}</span>
                  {customer.address && <span className="text-slate-500 block">पता: {customer.address}</span>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-500 block">रसीद विवरण (DETAILS)</span>
                  <strong className="text-slate-900 block mt-0.5">
                    {bill ? bill.billNumber : `कुल रसीदें: ${billsList?.length || 0}`}
                  </strong>
                  <span className="text-slate-600 block mt-0.5">
                    तारीख: {bill ? bill.billDate : new Date().toISOString().split('T')[0]}
                  </span>
                  {bill?.paymentStatus && (
                    <span className={`inline-block px-2 py-0.5 mt-1 rounded text-[10px] font-black ${
                      bill.paymentStatus === 'pending' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {bill.paymentStatus === 'pending' ? 'उधार (PENDING)' : 'चुकता (PAID)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-[11px]">
                      <th className="p-2 text-center w-10">क्र.</th>
                      <th className="p-2">सामान का नाम (Item Description)</th>
                      <th className="p-2 text-right w-16">दर</th>
                      <th className="p-2 text-center w-16">मात्रा</th>
                      <th className="p-2 text-right w-20">कुल (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allItems.map((row, idx) => {
                      const itemTotal = row.item.total || ((row.item.rate || row.item.price || 0) * row.item.quantity);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-black text-slate-900 font-['Noto_Sans_Devanagari',sans-serif]">
                            {row.item.name}
                            {row.billNum && isConsolidated && (
                              <span className="text-[10px] text-slate-400 font-normal ml-1 font-mono">
                                ({row.billNum})
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-700">
                            ₹{(row.item.rate || row.item.price || 0).toFixed(2)}
                          </td>
                          <td className="p-2 text-center font-bold text-slate-900">
                            {row.item.quantity} {row.item.unit || ''}
                          </td>
                          <td className="p-2 text-right font-black text-slate-950">
                            ₹{itemTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Total & QR Section */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-300 flex flex-wrap items-center justify-between gap-4 mb-4">
                {qrDataUrl && (
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white border border-emerald-500 rounded-xl shadow-sm">
                      <img src={qrDataUrl} alt="UPI QR" className="w-20 h-20 object-contain block" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black text-emerald-800 block">⚡ ऑटो-अमाउंट UPI QR</span>
                      <strong className="text-xs text-slate-900 font-mono block mt-0.5">{shop.upiId}</strong>
                      <span className="text-[10px] text-slate-500 block">PhonePe, GPay, Paytm से स्कैन करें</span>
                    </div>
                  </div>
                )}

                <div className="text-right ml-auto">
                  <span className="text-[11px] font-black uppercase text-slate-500 block">
                    {isConsolidated ? 'कुल बकाया राशि (GRAND TOTAL)' : 'कुल बिल राशि (BILL TOTAL)'}
                  </span>
                  <div className="text-2xl font-black text-rose-600 mt-0.5">
                    ₹{grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-500 font-bold">
                खाता बुक (100% ऑफ़लाइन डिजिटल बही-खाता) • धन्यवाद, पुनः पधारें!
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
