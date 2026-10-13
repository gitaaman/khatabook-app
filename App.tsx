import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { KhataProvider, useKhata } from './KhataContext';
import { ToastProvider } from './ToastContext';
import { Navbar } from './Navbar';
import { Onboarding } from './Onboarding';
import { Dashboard } from './Dashboard';
import { CustomerDetail } from './CustomerDetail';
import { BillCreate } from './BillCreate';
import { Settings } from './Settings';
import { FiSmartphone, FiMonitor } from 'react-icons/fi';

const AppRoutes: React.FC = () => {
  const { isOnboarded, loading } = useKhata();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-600">Loading Khata Book (खाता लोड हो रहा है)...</p>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      <main className="grow">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customer/:id" element={<CustomerDetail />} />
          <Route path="/bill/new" element={<BillCreate />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  // Simulator mode: 'phone' (390px mobile frame) or 'full' (desktop screen)
  const [previewMode, setPreviewMode] = useState<'phone' | 'full'>('phone');

  return (
    <ToastProvider>
      <KhataProvider>
        <BrowserRouter>
          {/* Top Control Bar for Laptop / Desktop Users to toggle Phone Preview */}
          <div className="hidden md:flex items-center justify-between px-6 py-2.5 bg-slate-900 text-white text-xs font-semibold z-50 sticky top-0 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-200">📱 Mobile Screen Preview Mode</span>
              <span className="text-[11px] text-slate-400 font-normal">
                (लैपटॉप में फोन की स्क्रीन जैसा अनुभव)
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setPreviewMode('phone')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'phone'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FiSmartphone className="w-3.5 h-3.5" />
                Phone View (390px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('full')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
                  previewMode === 'full'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FiMonitor className="w-3.5 h-3.5" />
                Full Desktop View
              </button>
            </div>
          </div>

          {/* Container: If previewMode === 'phone' on desktop, center inside a smartphone frame */}
          <div className={`min-h-screen ${previewMode === 'phone' ? 'md:bg-slate-950/90 md:py-8 md:px-4' : 'bg-slate-100'}`}>
            <div
              className={
                previewMode === 'phone'
                  ? 'mx-auto md:max-w-[400px] md:min-h-[820px] md:bg-slate-100 md:rounded-[42px] md:border-[10px] md:border-slate-800 md:shadow-2xl md:overflow-hidden md:relative transition-all'
                  : 'w-full'
              }
            >
              {/* Optional Phone Notch decoration only on desktop phone preview */}
              {previewMode === 'phone' && (
                <div className="hidden md:flex justify-center absolute top-0 left-0 right-0 z-50 pointer-events-none">
                  <div className="w-28 h-5 bg-slate-800 rounded-b-2xl flex items-center justify-center">
                    <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  </div>
                </div>
              )}

              <AppRoutes />
            </div>
          </div>
        </BrowserRouter>
      </KhataProvider>
    </ToastProvider>
  );
};

export default App;
