import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiSearch,
  FiUserPlus,
  FiTrendingUp,
  FiTrendingDown,
  FiUsers,
  FiChevronRight,
  FiPlus,
  FiDollarSign,
  FiPhone,
  FiFileText,
} from 'react-icons/fi';
import { FaQrcode } from 'react-icons/fa';
import { useKhata } from './KhataContext';
import { AddCustomerModal } from './AddCustomerModal';
import { PaymentModal } from './PaymentModal';
import { UPIQRCodeModal } from './UPIQRCodeModal';
import type { Customer } from './database.types';

export const Dashboard: React.FC = () => {
  const { shop, customers } = useKhata();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'settled'>('all');
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<Customer | null>(null);
  const [isCounterQrOpen, setIsCounterQrOpen] = useState(false);

  // Ledger totals
  const { totalUdhar, totalAdvance } = useMemo(() => {
    let udhar = 0;
    let advance = 0;
    customers.forEach((c) => {
      if (c.runningBalance > 0) udhar += c.runningBalance;
      else if (c.runningBalance < 0) advance += Math.abs(c.runningBalance);
    });
    return { totalUdhar: udhar, totalAdvance: advance };
  }, [customers]);

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const matchSearch =
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm);
        if (!matchSearch) return false;

        if (filterType === 'pending') return c.runningBalance > 0;
        if (filterType === 'settled') return c.runningBalance <= 0;
        return true;
      })
      .sort((a, b) => b.runningBalance - a.runningBalance);
  }, [customers, searchTerm, filterType]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-36">
      {/* Top Banner & Quick Counter QR */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            Shop Dashboard (दुकान खाता)
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            100% Offline Ledger • {shop?.ownerName || 'व्यापारी'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {shop?.upiId && (
            <button
              onClick={() => setIsCounterQrOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Counter UPI QR Code"
            >
              <FaQrcode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
          )}

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <FiUserPlus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
        {/* Total Udhaar Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              Total Udhaar (बाकी)
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <FiTrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-rose-600">
            ₹{totalUdhar.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Amount to collect</p>
        </div>

        {/* Total Advance Card */}
        <div className="p-3.5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Total Advance (जमा)
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiTrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-emerald-600">
            ₹{totalAdvance.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Customer balance</p>
        </div>

        {/* Total Customers Count */}
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Customers (खाता)
            </span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FiUsers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-black text-slate-800">
            {customers.length}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active accounts</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2 mb-4">
        {/* Search Input */}
        <div className="relative">
          <FiSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Name or Phone (नाम या नंबर से खोजें)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Accounts ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('pending')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'pending'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            Udhaar / बाकी ({customers.filter((c) => c.runningBalance > 0).length})
          </button>
          <button
            onClick={() => setFilterType('settled')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'settled'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Settled / चुकता ({customers.filter((c) => c.runningBalance <= 0).length})
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="space-y-2">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FiUsers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">
              {searchTerm ? 'कोई ग्राहक नहीं मिला' : 'अभी कोई ग्राहक नहीं है'}
            </h3>
            <p className="text-xs text-slate-400 font-medium mt-1 mb-4">
              {searchTerm ? 'कृपया दूसरा नाम या नंबर खोजें' : 'अपने पहले ग्राहक का खाता शुरू करें'}
            </p>
            <button
              onClick={() => setIsAddCustomerOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FiPlus className="w-4 h-4" /> Add First Customer
            </button>
          </div>
        ) : (
          filteredCustomers.map((c) => {
            const owesMoney = c.runningBalance > 0;
            const hasAdvance = c.runningBalance < 0;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-3"
              >
                {/* Left: Customer Info (Click navigates to details) */}
                <Link
                  to={`/customer/${c.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${
                      owesMoney
                        ? 'bg-rose-100 text-rose-700'
                        : hasAdvance
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {c.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <FiPhone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                      {c.address && (
                        <span className="hidden xs:inline-block truncate text-slate-400">
                          • {c.address}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Right: Balance & Quick Payment */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm font-black ${
                        owesMoney
                          ? 'text-rose-600'
                          : hasAdvance
                          ? 'text-emerald-600'
                          : 'text-slate-600'
                      }`}
                    >
                      ₹{Math.abs(c.runningBalance).toFixed(2)}
                    </div>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        owesMoney
                          ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          : hasAdvance
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-slate-50 text-slate-600 border border-slate-200/60'
                      }`}
                    >
                      {owesMoney ? 'बाकी (Due)' : hasAdvance ? 'जमा (Adv)' : 'चुकता (Paid)'}
                    </span>
                  </div>

                  {/* Quick Payment Button */}
                  <button
                    onClick={() => setSelectedCustomerForPayment(c)}
                    className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 border border-slate-200 transition-all cursor-pointer"
                    title="Quick Payment / जमा करें"
                  >
                    <FiDollarSign className="w-4 h-4" />
                  </button>

                  {/* Arrow to detail */}
                  <Link
                    to={`/customer/${c.id}`}
                    className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <FiChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
      />

      {selectedCustomerForPayment && (
        <PaymentModal
          isOpen={true}
          customer={selectedCustomerForPayment}
          onClose={() => setSelectedCustomerForPayment(null)}
        />
      )}

      {shop?.upiId && (
        <UPIQRCodeModal
          isOpen={isCounterQrOpen}
          onClose={() => setIsCounterQrOpen(false)}
          defaultAmount={0}
          customerName={shop.shopName}
        />
      )}
    </div>
  );
};

export default Dashboard;
