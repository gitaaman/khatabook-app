import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiPrinter,
  FiUser,
  FiCalendar,
} from 'react-icons/fi';
import { useKhata } from './KhataContext';
import { useToast } from './ToastContext';
import { BillPrintModal } from './BillPrintModal';
import type { BillItem, Bill } from './database.types';

export const BillCreate: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const { customers, bills, addBill, shop } = useKhata();
  const { showToast } = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId);
  const [billDate, setBillDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const paymentStatus = 'pending';

  // Next bill sequence number
  const nextBillNumber = `INV-${String(bills.length + 1).padStart(4, '0')}`;

  // Line items state
  const [items, setItems] = useState<BillItem[]>([
    { name: '', rate: 0, quantity: 1, unit: 'kg', total: 0 },
  ]);

  const [saving, setSaving] = useState(false);
  const [createdBill, setCreatedBill] = useState<Bill | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Recalculate row total
  const handleItemChange = (
    index: number,
    field: keyof BillItem,
    value: any
  ) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Rate or Quantity calculation
    if (field === 'rate' || field === 'quantity' || field === 'unit') {
      const rate = field === 'rate' ? parseFloat(value) || 0 : item.rate;
      const qty = field === 'quantity' ? parseFloat(value) || 0 : item.quantity;
      item.rate = rate;
      item.quantity = qty;
      item.total = Math.round(rate * qty * 100) / 100;
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItemRow = () => {
    setItems([...items, { name: '', rate: 0, quantity: 1, unit: 'kg', total: 0 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) {
      setItems([{ name: '', rate: 0, quantity: 1, unit: 'kg', total: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((acc, curr) => acc + (curr.total || 0), 0);

  const handleSubmit = async (andPrint: boolean = false) => {
    if (!selectedCustomerId) {
      showToast('कृपया पहले ग्राहक का चयन करें', 'error');
      return;
    }

    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      showToast('कृपया कम से कम एक सामान का नाम दर्ज करें', 'error');
      return;
    }

    setSaving(true);
    try {
      const newBill = await addBill({
        billNumber: nextBillNumber,
        customerId: selectedCustomerId,
        billDate,
        items: validItems,
        totalAmount: grandTotal,
        paymentStatus,
      });

      showToast(`बिल ${newBill.billNumber} सहेजा गया!`, 'success');

      if (andPrint) {
        setCreatedBill(newBill);
        setIsPrintModalOpen(true);
      } else {
        navigate(`/customer/${selectedCustomerId}`);
      }
    } catch (err: any) {
      showToast('बिल सहेजने में समस्या: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-36">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(-1)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1"
        >
          <FiArrowLeft className="w-4 h-4" /> Back (वापस)
        </button>

        <span className="text-xs font-mono font-bold text-slate-500">
          Receipt No: <strong className="text-blue-600 font-bold">{nextBillNumber}</strong>
        </span>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Customer & Date Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Select Customer (ग्राहक चुनें) *
            </label>
            <div className="relative">
              <FiUser className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">-- ग्राहक का चयन करें --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone}) - बकाया: ₹{c.runningBalance.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bill Date (बिल तारीख)
            </label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>


        {/* Items Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Items List (सामान की सूची)
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              {items.length} Rows
            </span>
          </div>

          {/* 1. MOBILE RESPONSIVE CARD VIEW (for small screens so inputs are never squashed) */}
          <div className="sm:hidden space-y-2.5">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 relative"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-slate-500">
                    Item #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    title="Remove item"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Item Name - Full width */}
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="सामान का नाम (उदा. चीनी, तेल, साबुन)"
                    value={it.name}
                    onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Rate, Qty, Unit in 3 Wide Boxes (Typing 500 or any amount is 100% visible) */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      दर / Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={it.rate === 0 ? '' : it.rate}
                      onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      मात्रा / Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1"
                      value={it.quantity === 0 ? '' : it.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      इकाई / Unit
                    </label>
                    <select
                      value={it.unit || 'kg'}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="w-full px-1 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 text-center focus:outline-none"
                    >
                      <option value="kg">kg (किलो)</option>
                      <option value="gm">gm (ग्राम)</option>
                      <option value="pkt">pkt (पैकेट)</option>
                      <option value="pc">pc (नग)</option>
                      <option value="ltr">ltr (लीटर)</option>
                      <option value="mtr">mtr (मीटर)</option>
                    </select>
                  </div>
                </div>

                {/* Row Total */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-500">कुल (Total):</span>
                  <span className="text-sm font-black text-slate-900">₹{it.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 2. DESKTOP / TABLET TABLE VIEW (Hidden on mobile, spacious with overflow on larger screens) */}
          <div className="hidden sm:block border border-slate-200/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[550px]">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px]">
                    <th className="p-2.5 text-center w-10">#</th>
                    <th className="p-2.5">Item Description (सामान का नाम)</th>
                    <th className="p-2.5 w-28 text-right">Rate / दर (₹)</th>
                    <th className="p-2.5 w-24 text-center">Qty / मात्रा</th>
                    <th className="p-2.5 w-24 text-center">Unit / इकाई</th>
                    <th className="p-2.5 w-28 text-right">Total / कुल (₹)</th>
                    <th className="p-2.5 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-2">
                        <input
                          type="text"
                          placeholder="उदा. चीनी, तेल, साबुन"
                          value={it.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="0.00"
                          value={it.rate === 0 ? '' : it.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-full text-right px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="any"
                          value={it.quantity === 0 ? '' : it.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full text-center px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={it.unit || 'kg'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full text-center py-1.5 rounded-lg border border-slate-200 text-xs font-semibold focus:outline-none"
                        >
                          <option value="kg">kg</option>
                          <option value="gm">gm</option>
                          <option value="pkt">pkt</option>
                          <option value="pc">pc</option>
                          <option value="ltr">ltr</option>
                          <option value="mtr">mtr</option>
                        </select>
                      </td>
                      <td className="p-2 text-right font-black text-slate-900">
                        ₹{it.total.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddItemRow}
            className="mt-2.5 px-3 py-1.5 rounded-xl border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FiPlus className="w-3.5 h-3.5" /> + Add Item Row (सामान पंक्ति जोड़ें)
          </button>
        </div>

        {/* Grand Total Bar */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Grand Total (कुल राशि)
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {items.filter((i) => i.name.trim()).length} Items
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-400">
            ₹{grandTotal.toFixed(2)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(false)}
            className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <FiCheck className="w-4 h-4" />
            {saving ? 'सहेजा जा रहा है...' : 'Save Bill (सहेजें)'}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit(true)}
            className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <FiPrinter className="w-4 h-4" />
            Save & Print (बिल प्रिंट)
          </button>
        </div>
      </div>

      {/* Print Modal */}
      {selectedCustomer && createdBill && (
        <BillPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            navigate(`/customer/${selectedCustomerId}`);
          }}
          bill={createdBill}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
};

export default BillCreate;
