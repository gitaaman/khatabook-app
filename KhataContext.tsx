import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ShopProfile, Customer, Bill, PaymentEntry } from './database.types';
import * as db from './offlineDb';
import { downloadBackupFile } from './backupFile';
import { firebaseSync } from './firebaseSync';
import { autoSaveBackupToDevice, readBackupFromDevice } from './deviceStorage';

interface KhataContextType {
  shop: ShopProfile | null;
  customers: Customer[];
  bills: Bill[];
  payments: PaymentEntry[];
  loading: boolean;
  isOnboarded: boolean;
  createShop: (shopData: Omit<ShopProfile, 'createdAt'>, cloudUid?: string) => Promise<void>;
  updateShop: (shopData: Partial<ShopProfile>) => Promise<void>;
  addCustomer: (data: Omit<Customer, 'id' | 'runningBalance' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addBill: (billData: Omit<Bill, 'id' | 'createdAt'>) => Promise<Bill>;
  deleteBill: (id: string) => Promise<void>;
  addPayment: (paymentData: Omit<PaymentEntry, 'id' | 'createdAt'>) => Promise<PaymentEntry>;
  deletePayment: (id: string) => Promise<void>;
  exportBackup: () => Promise<string>;
  importBackup: (jsonString: string) => Promise<boolean>;
  restoreFromDeviceStorage: () => Promise<boolean>;
  restoreFromCloud: (uid: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  activeCloudUid: string | null;
  refreshData: () => Promise<void>;
}

const KhataContext = createContext<KhataContextType | undefined>(undefined);

export const KhataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      const [shopData, custList, billList, payList] = await Promise.all([
        db.getShopProfile(),
        db.getCustomers(),
        db.getBills(),
        db.getPayments(),
      ]);

      setShop(shopData);
      setCustomers(custList);
      setBills(billList);
      setPayments(payList);

      if (shopData?.theme) {
        document.documentElement.setAttribute('data-theme', shopData.theme);
      }
    } catch (err) {
      console.error('Failed to load offline Khata data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const triggerAutoSaveToDevice = async () => {
    try {
      const backupJson = await db.exportCompleteBackup();
      await autoSaveBackupToDevice(backupJson);
    } catch (err) {
      console.warn('Auto-save to device storage failed:', err);
    }
  };

  const createShop = async (shopData: Omit<ShopProfile, 'createdAt'>, cloudUid?: string) => {
    const cleanPhone = shopData.phone ? shopData.phone.replace(/\D/g, '').slice(-10) : '';
    const uidToUse = cloudUid || (cleanPhone ? `shop_${cleanPhone}` : `shop_${Date.now().toString(36)}`);

    const fullProfile: ShopProfile = {
      ...shopData,
      uid: uidToUse,
      theme: shopData.theme || 'royal-blue',
      folderName: shopData.folderName || shopData.shopName.replace(/\s+/g, '_'),
      createdAt: new Date().toISOString(),
    };
    await db.saveShopProfile(fullProfile);
    setShop(fullProfile);
    document.documentElement.setAttribute('data-theme', fullProfile.theme || 'royal-blue');

    firebaseSync.setActiveUid(uidToUse);
    // Auto-save to Android Documents/KhataBook/json/KhataBook_Backup.json
    triggerAutoSaveToDevice();
    // Auto-sync to Firebase cloud in background
    firebaseSync.syncShop(fullProfile, uidToUse);
  };

  const updateShop = async (shopData: Partial<ShopProfile>) => {
    if (!shop) return;
    const updated: ShopProfile = {
      ...shop,
      ...shopData,
      updatedAt: new Date().toISOString(),
    };
    await db.saveShopProfile(updated);
    setShop(updated);
    if (updated.theme) {
      document.documentElement.setAttribute('data-theme', updated.theme);
    }
    triggerAutoSaveToDevice();
    firebaseSync.syncShop(updated);
  };

  const addCustomer = async (data: Omit<Customer, 'id' | 'runningBalance' | 'createdAt'>): Promise<Customer> => {
    const newCust: Customer = {
      ...data,
      id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      runningBalance: 0,
      passcode: data.passcode || Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: new Date().toISOString(),
    };
    await db.saveCustomer(newCust);
    setCustomers((prev) => [...prev, newCust]);

    triggerAutoSaveToDevice();
    firebaseSync.syncCustomer(newCust, undefined, shop?.shopName);
    return newCust;
  };

  const updateCustomer = async (customer: Customer) => {
    const updated = { ...customer, updatedAt: new Date().toISOString() };
    await db.saveCustomer(updated);
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

    triggerAutoSaveToDevice();
    firebaseSync.syncCustomer(updated, undefined, shop?.shopName);
  };

  const deleteCustomer = async (id: string) => {
    await db.deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));

    triggerAutoSaveToDevice();
    firebaseSync.deleteCustomerFromCloud(id);
  };

  const addBill = async (billData: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> => {
    const newBill: Bill = {
      ...billData,
      id: 'bill_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    await db.saveBill(newBill);
    setBills((prev) => [...prev, newBill]);

    // Auto-sync bill to Firebase cloud
    firebaseSync.syncBill(newBill);

    // Recalculate customer running balance
    if (newBill.paymentStatus === 'pending') {
      const cust = customers.find((c) => c.id === newBill.customerId);
      if (cust) {
        const updatedCust: Customer = {
          ...cust,
          runningBalance: cust.runningBalance + newBill.totalAmount,
          updatedAt: new Date().toISOString(),
        };
        await db.saveCustomer(updatedCust);
        setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
        firebaseSync.syncCustomer(updatedCust, undefined, shop?.shopName);
      }
    }

    triggerAutoSaveToDevice();
    return newBill;
  };

  const deleteBill = async (id: string) => {
    const target = bills.find((b) => b.id === id);
    await db.deleteBill(id);
    setBills((prev) => prev.filter((b) => b.id !== id));

    // Auto-sync bill deletion to Firebase cloud
    firebaseSync.deleteBillFromCloud(id);

    // Reverse customer balance impact
    if (target && target.paymentStatus === 'pending') {
      const cust = customers.find((c) => c.id === target.customerId);
      if (cust) {
        const updatedCust: Customer = {
          ...cust,
          runningBalance: Math.max(0, cust.runningBalance - target.totalAmount),
          updatedAt: new Date().toISOString(),
        };
        await db.saveCustomer(updatedCust);
        setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
        firebaseSync.syncCustomer(updatedCust, undefined, shop?.shopName);
      }
    }
    triggerAutoSaveToDevice();
  };

  const addPayment = async (paymentData: Omit<PaymentEntry, 'id' | 'createdAt'>): Promise<PaymentEntry> => {
    const newPayment: PaymentEntry = {
      ...paymentData,
      id: 'pay_' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    await db.savePayment(newPayment);
    setPayments((prev) => [...prev, newPayment]);

    // Auto-sync payment to Firebase cloud
    firebaseSync.syncPayment(newPayment);

    // Adjust customer balance
    const cust = customers.find((c) => c.id === newPayment.customerId);
    if (cust) {
      const delta = newPayment.type === 'payment_received' ? -newPayment.amount : newPayment.amount;
      const updatedCust: Customer = {
        ...cust,
        runningBalance: cust.runningBalance + delta,
        updatedAt: new Date().toISOString(),
      };
      await db.saveCustomer(updatedCust);
      setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
      firebaseSync.syncCustomer(updatedCust, undefined, shop?.shopName);
    }

    triggerAutoSaveToDevice();
    return newPayment;
  };

  const deletePayment = async (id: string) => {
    const target = payments.find((p) => p.id === id);
    await db.deletePayment(id);
    setPayments((prev) => prev.filter((p) => p.id !== id));

    // Auto-sync payment deletion to Firebase cloud
    firebaseSync.deletePaymentFromCloud(id);

    // Reverse balance adjustment
    if (target) {
      const cust = customers.find((c) => c.id === target.customerId);
      if (cust) {
        const delta = target.type === 'payment_received' ? target.amount : -target.amount;
        const updatedCust: Customer = {
          ...cust,
          runningBalance: cust.runningBalance + delta,
          updatedAt: new Date().toISOString(),
        };
        await db.saveCustomer(updatedCust);
        setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
        firebaseSync.syncCustomer(updatedCust, undefined, shop?.shopName);
      }
    }
    triggerAutoSaveToDevice();
  };

  const exportBackup = async (): Promise<string> => {
    const data = await db.exportCompleteBackup();
    const today = new Date().toISOString().split('T')[0];
    const filename = `${shop?.folderName || 'KhataBook'}_Backup_${today}.json`;
    downloadBackupFile(data, filename);
    await autoSaveBackupToDevice(data);
    return data;
  };

  const importBackup = async (jsonString: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await db.importCompleteBackup(jsonString);
      await refreshData();
      triggerAutoSaveToDevice();
      return success;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 1-Tap restore from Android Documents/KhataBook/json/KhataBook_Backup.json
   */
  const restoreFromDeviceStorage = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const fileContent = await readBackupFromDevice();
      if (!fileContent) return false;
      const success = await db.importCompleteBackup(fileContent);
      await refreshData();
      return success;
    } catch (err) {
      console.error('Failed to restore from device storage:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restore and auto-sync an existing shop account directly from Firebase Cloud
   */
  const restoreFromCloud = async (uid: string): Promise<{ success: boolean; message?: string }> => {
    setLoading(true);
    try {
      const cloudData = await firebaseSync.pullAllDataFromCloud(uid);
      if (!cloudData.shop) {
        return {
          success: false,
          message: `Firebase क्लाउड में UID "${uid}" का कोई खाता नहीं मिला। कृपया सही UID दर्ज करें।`
        };
      }

      await db.saveShopProfile(cloudData.shop);
      for (const c of cloudData.customers) {
        await db.saveCustomer(c);
      }
      for (const b of cloudData.bills) {
        await db.saveBill(b);
      }
      for (const p of cloudData.payments) {
        await db.savePayment(p);
      }

      firebaseSync.setActiveUid(cloudData.resolvedUid || uid);
      await refreshData();
      triggerAutoSaveToDevice();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to restore from cloud:', err);
      return { success: false, message: err?.message || 'क्लाउड लोड त्रुटि' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log out of current shop: clears active session so user can switch shops or re-onboard
   */
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.clearAllData();
      firebaseSync.setActiveUid(null);
      setShop(null);
      setCustomers([]);
      setBills([]);
      setPayments([]);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KhataContext.Provider
      value={{
        shop,
        customers,
        bills,
        payments,
        loading,
        isOnboarded: !!shop,
        createShop,
        updateShop,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addBill,
        deleteBill,
        addPayment,
        deletePayment,
        exportBackup,
        importBackup,
        restoreFromDeviceStorage,
        restoreFromCloud,
        logout,
        activeCloudUid: shop?.uid || firebaseSync.getActiveUid(),
        refreshData,
      }}
    >
      {children}
    </KhataContext.Provider>
  );
};

export const useKhata = () => {
  const context = useContext(KhataContext);
  if (!context) throw new Error('useKhata must be used within KhataProvider');
  return context;
};

export default KhataProvider;
