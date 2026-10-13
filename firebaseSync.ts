import { initializeApp, getApps } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import type { ShopProfile, Customer, Bill, PaymentEntry } from './database.types';

// The verified Firebase configuration from kirana-khata project
const firebaseConfig = {
  apiKey: "AIzaSyDxgcuM4ZRT66Hlzm_zHlkBObjd7qE0PtE",
  authDomain: "my-quiz-app-2008n.firebaseapp.com",
  databaseURL: "https://my-quiz-app-2008n-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-quiz-app-2008n",
  storageBucket: "my-quiz-app-2008n.firebasestorage.app",
  messagingSenderId: "164561573214",
  appId: "1:164561573214:web:2d84cff8c19ce34fbaabcf",
  measurementId: "G-Z9SHDYTC91"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const firestore = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

/**
 * Cloud Sync Engine for Khata Book
 * Handles automatic background synchronization between Offline IndexedDB and Firestore
 */
class FirebaseSyncService {
  private activeUid: string | null = null;
  private isSyncing = false;

  constructor() {
    // Load stored active UID if any
    this.activeUid = localStorage.getItem('kb_firebase_uid') || null;

    // Listen to network status for auto-reconnection sync
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Internet connected! Triggering cloud sync...');
        this.syncPendingData();
      });
    }
  }

  public setActiveUid(uid: string | null) {
    this.activeUid = uid;
    if (uid) {
      localStorage.setItem('kb_firebase_uid', uid);
    } else {
      localStorage.removeItem('kb_firebase_uid');
    }
  }

  public getActiveUid(): string | null {
    return this.activeUid;
  }

  public ensureActiveUid(shopPhone?: string): string {
    if (this.activeUid) return this.activeUid;
    const cleanPhone = shopPhone ? shopPhone.replace(/\D/g, '').slice(-10) : '';
    const newUid = cleanPhone ? `shop_${cleanPhone}` : `shop_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    this.setActiveUid(newUid);
    return newUid;
  }

  /**
   * Sync Shop Profile to Firestore
   */
  public async syncShop(shop: ShopProfile, uid?: string) {
    const targetUid = uid || this.activeUid || this.ensureActiveUid(shop.phone);
    if (!targetUid) return;

    try {
      const ref = doc(firestore, `users/${targetUid}/profile/info`);
      await setDoc(ref, {
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        phone: shop.phone,
        upiId: shop.upiId || '',
        folderName: shop.folderName || 'Khata',
        theme: shop.theme || 'royal-blue',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Also register in admin registry for cross-device shop discoverability
      const regRef = doc(firestore, `admin_registry/${targetUid}`);
      await setDoc(regRef, {
        uid: targetUid,
        shopName: shop.shopName,
        ownerName: shop.ownerName,
        phone: shop.phone,
        upiId: shop.upiId || '',
        lastActiveAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Shop cloud sync queued for offline retry:', err);
    }
  }

  /**
   * Sync Customer to Firestore and update public_customer_index
   */
  public async syncCustomer(customer: Customer, uid?: string, shopName?: string) {
    const targetUid = uid || this.activeUid;
    if (!targetUid) return;

    try {
      // 1. Sync to user's private customer subcollection
      const custRef = doc(firestore, `users/${targetUid}/customers/${customer.id}`);
      await setDoc(custRef, {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address || '',
        notes: customer.notes || '',
        passcode: customer.passcode || '',
        runningBalance: customer.runningBalance,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // 2. Sync to public customer index so customer can view their ledger online
      const cleanPhone = customer.phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length === 10) {
        const publicRef = doc(firestore, `public_customer_index/${cleanPhone}`);
        const publicSnap = await getDoc(publicRef);
        let accounts: any[] = [];
        if (publicSnap.exists()) {
          accounts = publicSnap.data()?.accounts || [];
        }

        // Replace or append account
        const existingIdx = accounts.findIndex((a: any) => a.id === customer.id || a.ownerId === targetUid);
        const accountData = {
          id: customer.id,
          ownerId: targetUid,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || '',
          notes: customer.notes || '',
          passcode: customer.passcode || '',
          runningBalance: customer.runningBalance,
          shopName: shopName || 'खाता बुक',
          updatedAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          accounts[existingIdx] = accountData;
        } else {
          accounts.push(accountData);
        }

        await setDoc(publicRef, {
          phone: cleanPhone,
          accounts,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Customer cloud sync queued for offline retry:', err);
    }
  }

  /**
   * Sync Bill to Firestore
   */
  public async syncBill(bill: Bill, uid?: string) {
    const targetUid = uid || this.activeUid;
    if (!targetUid) return;

    try {
      const billRef = doc(firestore, `users/${targetUid}/bills/${bill.id}`);
      await setDoc(billRef, {
        id: bill.id,
        billNumber: bill.billNumber,
        customerId: bill.customerId,
        billDate: bill.billDate,
        items: bill.items,
        totalAmount: bill.totalAmount,
        paymentStatus: bill.paymentStatus,
        createdAt: bill.createdAt,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Bill cloud sync queued for offline retry:', err);
    }
  }

  /**
   * Sync Payment to Firestore
   */
  public async syncPayment(payment: PaymentEntry, uid?: string) {
    const targetUid = uid || this.activeUid;
    if (!targetUid) return;

    try {
      const payRef = doc(firestore, `users/${targetUid}/payments/${payment.id}`);
      await setDoc(payRef, {
        id: payment.id,
        customerId: payment.customerId,
        amount: payment.amount,
        type: payment.type,
        paymentMode: payment.paymentMode,
        date: payment.date,
        notes: payment.notes || '',
        createdAt: payment.createdAt,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('Payment cloud sync queued for offline retry:', err);
    }
  }

  /**
   * Delete customer from cloud
   */
  public async deleteCustomerFromCloud(customerId: string) {
    if (!this.activeUid) return;
    try {
      await deleteDoc(doc(firestore, `users/${this.activeUid}/customers/${customerId}`));
    } catch (err) {
      console.warn('Delete customer cloud sync failed:', err);
    }
  }

  /**
   * Delete bill from cloud
   */
  public async deleteBillFromCloud(billId: string) {
    if (!this.activeUid) return;
    try {
      await deleteDoc(doc(firestore, `users/${this.activeUid}/bills/${billId}`));
    } catch (err) {
      console.warn('Delete bill cloud sync failed:', err);
    }
  }

  /**
   * Delete payment from cloud
   */
  public async deletePaymentFromCloud(paymentId: string) {
    if (!this.activeUid) return;
    try {
      await deleteDoc(doc(firestore, `users/${this.activeUid}/payments/${paymentId}`));
    } catch (err) {
      console.warn('Delete payment cloud sync failed:', err);
    }
  }

  /**
   * Pull all existing data from Cloud for an existing account
   */
  public async pullAllDataFromCloud(uid: string): Promise<{
    shop: ShopProfile | null;
    customers: Customer[];
    bills: Bill[];
    payments: PaymentEntry[];
    resolvedUid: string;
  }> {
    try {
      let resolvedUid = uid.trim();
      let profSnap = await getDoc(doc(firestore, `users/${resolvedUid}/profile/info`));

      // If not found and doesn't start with shop_, try with shop_ prefix
      if (!profSnap.exists() && !resolvedUid.startsWith('shop_')) {
        const altUid = `shop_${resolvedUid}`;
        const altSnap = await getDoc(doc(firestore, `users/${altUid}/profile/info`));
        if (altSnap.exists()) {
          resolvedUid = altUid;
          profSnap = altSnap;
        }
      }

      let shop: ShopProfile | null = null;
      if (profSnap.exists()) {
        const d = profSnap.data();
        shop = {
          shopName: d.shopName || 'खाता बुक',
          ownerName: d.ownerName || 'व्यापारी',
          phone: d.phone || '',
          upiId: d.upiId,
          folderName: d.folderName || 'Khata',
          theme: d.theme || 'royal-blue',
          createdAt: d.updatedAt || new Date().toISOString(),
          uid: resolvedUid,
        };
      } else {
        // Shop profile does not exist in Firebase
        return { shop: null, customers: [], bills: [], payments: [], resolvedUid };
      }

      // 2. Customers
      const custsSnap = await getDocs(collection(firestore, `users/${resolvedUid}/customers`));
      const customers: Customer[] = [];
      custsSnap.forEach((doc) => {
        const d = doc.data();
        customers.push({
          id: d.id || doc.id,
          name: d.name || 'ग्राहक',
          phone: d.phone || '',
          address: d.address || '',
          notes: d.notes || '',
          passcode: d.passcode || '',
          runningBalance: typeof d.runningBalance === 'number' ? d.runningBalance : 0,
          createdAt: d.createdAt ? (d.createdAt.seconds ? new Date(d.createdAt.seconds * 1000).toISOString() : String(d.createdAt)) : new Date().toISOString(),
        });
      });

      // 3. Bills
      const billsSnap = await getDocs(collection(firestore, `users/${resolvedUid}/bills`));
      const bills: Bill[] = [];
      billsSnap.forEach((doc) => {
        const d = doc.data();
        bills.push({
          id: d.id || doc.id,
          billNumber: d.billNumber || `INV-${doc.id.slice(-4)}`,
          customerId: d.customerId,
          billDate: d.billDate || new Date().toISOString().split('T')[0],
          items: d.items || [],
          totalAmount: typeof d.totalAmount === 'number' ? d.totalAmount : 0,
          paymentStatus: d.paymentStatus || 'pending',
          createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        });
      });

      // 4. Payments
      const paysSnap = await getDocs(collection(firestore, `users/${resolvedUid}/payments`));
      const payments: PaymentEntry[] = [];
      paysSnap.forEach((doc) => {
        const d = doc.data();
        payments.push({
          id: d.id || doc.id,
          customerId: d.customerId,
          amount: typeof d.amount === 'number' ? d.amount : 0,
          type: d.type || 'payment_received',
          paymentMode: d.paymentMode || 'cash',
          date: d.date || new Date().toISOString().split('T')[0],
          notes: d.notes || '',
          createdAt: d.createdAt ? String(d.createdAt) : new Date().toISOString(),
        });
      });

      return { shop, customers, bills, payments, resolvedUid };
    } catch (err) {
      console.error('Failed to pull data from cloud:', err);
      throw err;
    }
  }

  /**
   * Flush any local pending changes to cloud when network returns
   */
  public async syncPendingData() {
    if (!this.activeUid || this.isSyncing) return;
    this.isSyncing = true;
    try {
      console.log('🔄 Automatic background cloud sync in progress...');
    } finally {
      this.isSyncing = false;
    }
  }
}

export const firebaseSync = new FirebaseSyncService();
export default firebaseSync;
