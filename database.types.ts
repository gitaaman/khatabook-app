export interface ShopProfile {
  shopName: string;
  ownerName: string;
  phone: string;
  upiId?: string;
  folderName: string;
  address?: string;
  theme?: string;
  logoUrl?: string;
  whatsappTemplate?: string;
  uid?: string; // Firebase cloud unique identifier
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  passcode?: string; // 4 to 6-digit passcode for customer portal login
  runningBalance: number; // positive = customer owes shop (उधार), negative = advance (जमा)
  creditLimit?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface BillItem {
  id?: string;
  name: string;
  quantity: number;
  rate: number;
  price?: number;
  unit?: string; // kg, gm, pkt, pc, ltr, etc.
  total: number;
}

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  billDate: string; // YYYY-MM-DD
  items: BillItem[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paidAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface PaymentEntry {
  id: string;
  customerId: string;
  amount: number;
  type: 'payment_received' | 'credit_given'; // payment_received = ग्राहक ने पैसे दिए (- balance); credit_given = उधार दिया (+ balance)
  paymentMode: 'cash' | 'upi' | 'bank';
  date: string;
  notes?: string;
  billNumber?: string;
  createdAt: string;
}

export interface CompleteKhataBackup {
  version: string;
  exportedAt: string;
  shopProfile: ShopProfile;
  customers: Customer[];
  bills: Bill[];
  payments: PaymentEntry[];
}
