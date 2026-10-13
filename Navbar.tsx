import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useKhata } from './KhataContext';
import { FiBook, FiSettings, FiPlusCircle, FiUsers, FiLogOut } from 'react-icons/fi';

export const Navbar: React.FC<{ onOpenAddCustomer?: () => void }> = ({ onOpenAddCustomer }) => {
  const { shop, customers, logout } = useKhata();
  const location = useLocation();
  const navigate = useNavigate();

  if (!shop) return null;

  const handleLogout = async () => {
    if (window.confirm('क्या आप वाकई लॉगआउट करना चाहते हैं?\n(आपका डेटा फोन और क्लाउड में सुरक्षित रहेगा)')) {
      await logout();
      navigate('/onboarding');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-colors">
      {/* Safe-area top spacing for mobile phone notch / dynamic island / camera cutout */}
      <div className="pt-6 sm:pt-2 px-4 max-w-4xl mx-auto">
        <div className="h-14 flex items-center justify-between">
          {/* Left: Brand & Shop Info */}
          <Link to="/" className="flex items-center gap-3 group text-slate-900 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
              {shop.shopName ? shop.shopName.charAt(0).toUpperCase() : <FiBook className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {shop.shopName}
                </span>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200/60 hidden xs:inline-block">
                  Offline
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {shop.ownerName} • <span className="text-slate-700 font-semibold">{customers.length} ग्राहक (Customers)</span>
              </p>
            </div>
          </Link>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenAddCustomer && (
              <button
                onClick={onOpenAddCustomer}
                className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Add Customer"
              >
                <FiPlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Add Customer</span>
              </button>
            )}

            <Link
              to="/settings"
              className={`p-2 rounded-xl transition-all ${
                location.pathname === '/settings'
                  ? 'bg-blue-50 text-blue-600 font-bold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title="Settings (सेटिंग्स)"
            >
              <FiSettings className="w-4 h-4" />
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
              title="लॉगआउट / दुकान बदलें (Logout)"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
