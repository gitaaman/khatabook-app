import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FaWhatsapp, FaQrcode } from 'react-icons/fa';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';
import { PaymentModal } from './PaymentModal';
import { BillPrintModal } from './BillPrintModal';
import { UPIQRCodeModal } from './UPIQRCodeModal';
import { WhatsAppShareModal } from './WhatsAppShareModal';
import type { Bill, PaymentEntry } from './database.types';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { customers, bills, payments, shop, updateCustomer, deleteBill, deletePayment } = useKhata();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'bills' | 'payments'>('all');
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDefaultType, setPaymentDefaultType] = useState<'payment_received' | 'credit_given'>('payment_received');
  const [isPrintModalOpen, setPrintModalOpen] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  const [isConsolidatedPrint, setIsConsolidatedPrint] = useState(false);
  const [isQRModalOpen, setQRModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);

  const customer = customers.find((c) => c.id === id);

  const customerBills = useMemo(() => {
    return bills
      .filter((b) => b.customerId === id)
      .sort((a, b) => new Date(b.createdAt || b.billDate).getTime() - new Date(a.createdAt || a.billDate).getTime());
  }, [bills, id]);

  const customerPayments = useMemo(() => {
    return payments
      .filter((p) => p.customerId === id)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [payments, id]);

  const combinedHistory = useMemo(() => {
    type HistoryEntry = {
      id: string;
      date: string;
      timestamp: number;
      entryType: 'bill' | 'payment';
      title: string;
      amount: number;
      isDebit: boolean; // true = Maine Diye (Udhar / Debit), false = Mujhe Mile (Jama / Credit)
      status?: string;
      notes?: string;
      bill?: Bill;
      payment?: PaymentEntry;
    };

    const entries: HistoryEntry[] = [];

    customerBills.forEach((b) => {
      entries.push({
        id: b.id,
        date: b.billDate,
        timestamp: new Date(b.createdAt || b.billDate).getTime(),
        entryType: 'bill',
        title: `Bill #${b.billNumber} (${b.items.length} सामान)`,
        amount: b.totalAmount,
        isDebit: true,
        status: b.paymentStatus,
        bill: b,
      });
    });

    customerPayments.forEach((p) => {
      const isJama = p.type === 'payment_received';
      entries.push({
        id: p.id,
        date: p.date,
        timestamp: new Date(p.createdAt || p.date).getTime(),
        entryType: 'payment',
        title: isJama ? 'पैसे मिले (नकद/UPI)' : 'उधार दिया (Credit)',
        amount: p.amount,
        isDebit: !isJama,
        notes: p.notes,
        payment: p,
      });
    });

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }, [customerBills, customerPayments]);

  if (!customer) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-base font-bold text-slate-800">ग्राहक नहीं मिला (Customer Not Found)</h2>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
        >
          डैशबोर्ड पर वापस जाएं
        </button>
      </div>
    );
  }

  const hasUdhar = customer.runningBalance > 0;
  const hasAdvance = customer.runningBalance < 0;

  const handleEditPasscode = async () => {
    const currentCode = customer.passcode || '';
    const newCode = window.prompt(
      `ग्राहक "${customer.name}" के ऑनलाइन पोर्टल के लिए पासकोड (PIN) सेट करें:`,
      currentCode
    );
    if (newCode !== null) {
      const cleanCode = newCode.trim();
      await updateCustomer({ ...customer, passcode: cleanCode });
      showToast('पोर्टल पासकोड अपडेट हो गया: ' + (cleanCode || 'कोई नहीं'), 'success');
    }
  };

  const handleDeleteItem = async (entry: any) => {
    if (!window.confirm('क्या आप इस प्रविष्टि को हटाना चाहते हैं?')) return;
    try {
      if (entry.entryType === 'bill') {
        await deleteBill(entry.id);
        showToast('बिल हटा दिया गया', 'info');
      } else {
        await deletePayment(entry.id);
        showToast('लेन-देन हटा दिया गया', 'info');
      }
    } catch (err: any) {
      showToast('हटाने में समस्या: ' + err.message, 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3.5 py-3 pb-36">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <span className="text-sm">←</span> Dashboard (डैशबोर्ड)
        </button>

        <div className="flex items-center gap-1.5">
          {customer.runningBalance > 0 && shop?.upiId && (
            <button
              onClick={() => setQRModalOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100 transition-all"
            >
              <FaQrcode className="w-3 h-3" /> UPI QR
            </button>
          )}

          <button
            onClick={() => {
              setSelectedBillForPrint(null);
              setIsConsolidatedPrint(true);
              setPrintModalOpen(true);
            }}
            className="p-1.5 px-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-slate-200"
            title="Statement PDF"
          >
            PDF रसीद
          </button>
        </div>
      </div>

      {/* Khatabook Style Customer Header Card */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl font-bold text-base flex items-center justify-center shrink-0 ${
                hasUdhar
                  ? 'bg-rose-100 text-rose-700'
                  : hasAdvance
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
                {customer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium mt-0.5">
                <span>📞 {customer.phone}</span>
                {customer.address && (
                  <span className="truncate text-slate-400">
                    • 📍 {customer.address}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleEditPasscode}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer transition-colors"
                  title="क्लिक करके ऑनलाइन पोर्टल पासकोड बदलें"
                >
                  🔑 पासकोड: <span className="font-mono text-xs">{customer.passcode || '1234'}</span>
                  <span className="text-[9px] text-blue-500">✏️</span>
                </button>
              </div>
            </div>
          </div>

          {/* Running Balance Banner */}
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              {hasUdhar ? 'बाकी (You will get)' : hasAdvance ? 'जमा (Advance)' : 'हिसाब साफ'}
            </span>
            <div
              className={`text-xl font-black mt-0.5 ${
                hasUdhar ? 'text-rose-600' : hasAdvance ? 'text-emerald-600' : 'text-slate-700'
              }`}
            >
              ₹{Math.abs(customer.runningBalance).toFixed(2)}
            </div>
          </div>
        </div>

        {/* 1-Click WhatsApp Bar */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500">
            तकादा / रिपोर्ट / धन्यवाद संदेश:
          </span>
          <button
            type="button"
            onClick={() => setWhatsAppModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
          >
            <FaWhatsapp className="w-3.5 h-3.5 text-emerald-200" /> WhatsApp भेजें
          </button>
        </div>
      </div>

      {/* Khatabook Passbook Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden mb-6">
        {/* Passbook Table Header */}
        <div className="p-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs font-bold text-slate-600">
          <div className="w-1/2">विवरण (ENTRIES)</div>
          <div className="w-1/4 text-right text-rose-700">दिए 🔴 (GAVE)</div>
          <div className="w-1/4 text-right text-emerald-700">मिले 🟢 (GOT)</div>
        </div>

        {/* Passbook Entries List */}
        <div className="divide-y divide-slate-100">
          {combinedHistory.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs font-semibold text-slate-400">
              अभी इस ग्राहक का कोई लेन-देन दर्ज नहीं है।<br />
              नीचे 🔴 दिए या 🟢 मिले बटन दबाकर पहली एंट्री करें।
            </div>
          ) : (
            combinedHistory.map((entry) => {
              return (
                <div
                  key={entry.id}
                  className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between text-xs"
                >
                  {/* Left: Date & Title */}
                  <div className="w-1/2 min-w-0 pr-2">
                    <div className="font-bold text-slate-800 truncate">
                      {entry.title}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                      <span>{entry.date}</span>
                      {entry.notes && <span className="truncate">• {entry.notes}</span>}
                    </div>
                  </div>

                  {/* Middle: You Gave (Debit / Red) */}
                  <div className="w-1/4 text-right font-black text-rose-600">
                    {entry.isDebit ? `₹${entry.amount.toFixed(2)}` : '-'}
                  </div>

                  {/* Right: You Got (Credit / Green) */}
                  <div className="w-1/4 text-right font-black text-emerald-600">
                    {!entry.isDebit ? `₹${entry.amount.toFixed(2)}` : '-'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Khatabook Famous 2-Button Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3">
          {/* 🔴 Maine Diye (You Gave / Udhar) */}
          <Link
            to={`/bill/new?customerId=${customer.id}`}
            className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 active:scale-95 transition-all text-center cursor-pointer"
          >
            <span>🔴 मैंने दिए (YOU GAVE)</span>
          </Link>

          {/* 🟢 Mujhe Mile (You Got / Jama) */}
          <button
            type="button"
            onClick={() => {
              setPaymentDefaultType('payment_received');
              setPaymentModalOpen(true);
            }}
            className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all text-center cursor-pointer"
          >
            <span>🟢 मुझे मिले (YOU GOT)</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        customer={customer}
        defaultType={paymentDefaultType}
      />

      <BillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bill={selectedBillForPrint}
        billsList={isConsolidatedPrint ? customerBills : undefined}
        customer={customer}
      />

      <WhatsAppShareModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setWhatsAppModalOpen(false)}
        shop={shop}
        customer={customer}
        bills={customerBills}
        payments={customerPayments}
      />

      {shop?.upiId && (
        <UPIQRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setQRModalOpen(false)}
          defaultAmount={customer.runningBalance > 0 ? customer.runningBalance : 0}
          customerName={customer.name}
        />
      )}
    </div>
  );
};

export default CustomerDetail;
