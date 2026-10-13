import type { ShopProfile, Customer, Bill, PaymentEntry, CompleteKhataBackup } from './database.types';

const DB_NAME = 'KhataBookOfflineDB';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const initDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('shopProfile')) {
        db.createObjectStore('shopProfile', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customers')) {
        const custStore = db.createObjectStore('customers', { keyPath: 'id' });
        custStore.createIndex('phone', 'phone', { unique: false });
        custStore.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('bills')) {
        const billStore = db.createObjectStore('bills', { keyPath: 'id' });
        billStore.createIndex('customerId', 'customerId', { unique: false });
        billStore.createIndex('billDate', 'billDate', { unique: false });
      }
      if (!db.objectStoreNames.contains('payments')) {
        const payStore = db.createObjectStore('payments', { keyPath: 'id' });
        payStore.createIndex('customerId', 'customerId', { unique: false });
        payStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event: any) => {
      dbInstance = event.target.result;
      resolve(event.target.result as IDBDatabase);
    };

    request.onerror = (event: any) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
  });
};

// Generic Transaction Helpers
const performTx = async <T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest
): Promise<T> => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = callback(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAllFromStore = async <T>(storeName: string): Promise<T[]> => {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Shop Profile
export const getShopProfile = async (): Promise<ShopProfile | null> => {
  try {
    const item: any = await performTx('shopProfile', 'readonly', (store) => store.get('current'));
    if (item && item.profile) return item.profile;
  } catch (_) {}

  // Fallback to localStorage
  const local = localStorage.getItem('kb_shop_profile');
  return local ? JSON.parse(local) : null;
};

export const saveShopProfile = async (profile: ShopProfile): Promise<void> => {
  try {
    await performTx('shopProfile', 'readwrite', (store) =>
      store.put({ id: 'current', profile, updatedAt: new Date().toISOString() })
    );
  } catch (_) {}
  localStorage.setItem('kb_shop_profile', JSON.stringify(profile));
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    return await getAllFromStore<Customer>('customers');
  } catch (_) {
    const local = localStorage.getItem('kb_customers');
    return local ? JSON.parse(local) : [];
  }
};

export const saveCustomer = async (customer: Customer): Promise<void> => {
  try {
    await performTx('customers', 'readwrite', (store) => store.put(customer));
  } catch (_) {}
  // Sync localStorage
  const current = await getCustomers();
  const index = current.findIndex((c) => c.id === customer.id);
  if (index >= 0) current[index] = customer;
  else current.push(customer);
  localStorage.setItem('kb_customers', JSON.stringify(current));
};

export const deleteCustomer = async (id: string): Promise<void> => {
  try {
    await performTx('customers', 'readwrite', (store) => store.delete(id));
  } catch (_) {}
  const current = (await getCustomers()).filter((c) => c.id !== id);
  localStorage.setItem('kb_customers', JSON.stringify(current));
};

// Bills
export const getBills = async (customerId?: string): Promise<Bill[]> => {
  try {
    const all = await getAllFromStore<Bill>('bills');
    if (customerId) return all.filter((b) => b.customerId === customerId);
    return all;
  } catch (_) {
    const local = localStorage.getItem('kb_bills');
    const all: Bill[] = local ? JSON.parse(local) : [];
    if (customerId) return all.filter((b) => b.customerId === customerId);
    return all;
  }
};

export const saveBill = async (bill: Bill): Promise<void> => {
  try {
    await performTx('bills', 'readwrite', (store) => store.put(bill));
  } catch (_) {}
  const current = await getBills();
  const index = current.findIndex((b) => b.id === bill.id);
  if (index >= 0) current[index] = bill;
  else current.push(bill);
  localStorage.setItem('kb_bills', JSON.stringify(current));
};

export const deleteBill = async (id: string): Promise<void> => {
  try {
    await performTx('bills', 'readwrite', (store) => store.delete(id));
  } catch (_) {}
  const current = (await getBills()).filter((b) => b.id !== id);
  localStorage.setItem('kb_bills', JSON.stringify(current));
};

// Payments
export const getPayments = async (customerId?: string): Promise<PaymentEntry[]> => {
  try {
    const all = await getAllFromStore<PaymentEntry>('payments');
    if (customerId) return all.filter((p) => p.customerId === customerId);
    return all;
  } catch (_) {
    const local = localStorage.getItem('kb_payments');
    const all: PaymentEntry[] = local ? JSON.parse(local) : [];
    if (customerId) return all.filter((p) => p.customerId === customerId);
    return all;
  }
};

export const savePayment = async (payment: PaymentEntry): Promise<void> => {
  try {
    await performTx('payments', 'readwrite', (store) => store.put(payment));
  } catch (_) {}
  const current = await getPayments();
  const index = current.findIndex((p) => p.id === payment.id);
  if (index >= 0) current[index] = payment;
  else current.push(payment);
  localStorage.setItem('kb_payments', JSON.stringify(current));
};

export const deletePayment = async (id: string): Promise<void> => {
  try {
    await performTx('payments', 'readwrite', (store) => store.delete(id));
  } catch (_) {}
  const current = (await getPayments()).filter((p) => p.id !== id);
  localStorage.setItem('kb_payments', JSON.stringify(current));
};

// Complete Khata Backup & Restore
export const exportCompleteBackup = async (): Promise<string> => {
  const shopProfile = (await getShopProfile()) || {
    shopName: 'खाता बुक',
    ownerName: 'दुकानदार',
    phone: '',
    folderName: 'KhataBook',
    createdAt: new Date().toISOString()
  };
  const customers = await getCustomers();
  const bills = await getBills();
  const payments = await getPayments();

  const backup: CompleteKhataBackup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    shopProfile,
    customers,
    bills,
    payments
  };

  return JSON.stringify(backup, null, 2);
};

export const importCompleteBackup = async (jsonString: string): Promise<boolean> => {
  try {
    const backup: CompleteKhataBackup = JSON.parse(jsonString);
    if (!backup.shopProfile || !Array.isArray(backup.customers)) {
      throw new Error('अमान्य बैकअप फाइल प्रारूप (Invalid backup file structure)');
    }

    // Save Shop Profile
    await saveShopProfile(backup.shopProfile);

    // Clear and Save Customers
    for (const c of backup.customers) {
      await saveCustomer(c);
    }

    // Save Bills
    if (Array.isArray(backup.bills)) {
      for (const b of backup.bills) {
        await saveBill(b);
      }
    }

    // Save Payments
    if (Array.isArray(backup.payments)) {
      for (const p of backup.payments) {
        await savePayment(p);
      }
    }

    return true;
  } catch (err) {
    console.error('Backup import error:', err);
    throw err;
  }
};

/**
 * Clear all local records from IndexedDB and localStorage (used for Logout)
 */
export const clearAllData = async (): Promise<void> => {
  try {
    const db = await initDb();
    const stores = ['shopProfile', 'customers', 'bills', 'payments'];
    for (const storeName of stores) {
      if (db.objectStoreNames.contains(storeName)) {
        await performTx(storeName, 'readwrite', (store) => store.clear());
      }
    }
  } catch (err) {
    console.error('Error clearing offline DB:', err);
  }
  localStorage.removeItem('kb_shop_profile');
  localStorage.removeItem('kb_customers');
  localStorage.removeItem('kb_bills');
  localStorage.removeItem('kb_payments');
  localStorage.removeItem('kb_firebase_uid');
};
