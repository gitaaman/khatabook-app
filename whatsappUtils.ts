import type { ShopProfile, Customer, Bill, PaymentEntry } from './database.types';

export const DEFAULT_WHATSAPP_TEMPLATE = `🛒 *{shopName}*
👤 ग्राहक: *{customerName}*
📄 खाता / रसीद नं: {accountUid}
📅 तारीख: {todayDate}

💰 *कुल देय राशि: ₹{totalAmount}*
{upiSection}
_धन्यवाद, पुनः पधारें!_`;

// Helper: Format date DD-MM-YYYY
export const getFormattedTodayDate = (): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper: Get Clean Customer UID
export const getCustomerCleanUid = (customer: Customer): string => {
  return customer.id.length > 8 ? `KB-${customer.id.slice(-6).toUpperCase()}` : customer.id;
};

/**
 * 1. Payment Reminder Message (पेमेंट तकादा)
 * Highlights special UID, date, total amount due, UPI ID without grocery items list
 */
export const formatWhatsAppBillMessage = (
  shop: ShopProfile,
  customer: Customer,
  bill?: Bill | null,
  billsList?: Bill[],
  customTemplate?: string
): string => {
  const template = customTemplate || shop.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  const shopName = shop.shopName || 'खाता बुक';
  const customerName = customer.name;
  const cleanCustUid = getCustomerCleanUid(customer);

  const accountUid = bill ? `${bill.billNumber} (${cleanCustUid})` : cleanCustUid;
  const todayDate = getFormattedTodayDate();

  let totalAmount = 0;
  if (bill) {
    totalAmount = bill.totalAmount;
  } else if (Array.isArray(billsList) && billsList.length > 0) {
    billsList.forEach((b) => { totalAmount += b.totalAmount; });
  } else {
    totalAmount = customer.runningBalance > 0 ? customer.runningBalance : Math.abs(customer.runningBalance);
  }

  const upiSection = shop.upiId
    ? `⚡ GooglePay/PhonePe/Paytm से भुगतान हेतु UPI ID: *${shop.upiId}*\n`
    : '';

  return template
    .replace('{shopName}', shopName)
    .replace('{customerName}', customerName)
    .replace('{accountUid}', accountUid)
    .replace('{todayDate}', todayDate)
    .replace('{totalAmount}', totalAmount.toFixed(2))
    .replace('{upiSection}', upiSection)
    .replace('{balance}', Math.abs(customer.runningBalance).toFixed(2));
};

/**
 * 2. Monthly Account Statement Message (पिछले 30 दिनों का हिसाब / रिपोर्ट)
 * Shows total bills taken, payments made, and current balance
 */
export const formatWhatsAppMonthlySummaryMessage = (
  shop: ShopProfile,
  customer: Customer,
  bills: Bill[],
  payments: PaymentEntry[]
): string => {
  const shopName = shop.shopName || 'खाता बुक';
  const customerName = customer.name;
  const cleanCustUid = getCustomerCleanUid(customer);
  const todayDate = getFormattedTodayDate();

  // Filter last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentBills = bills.filter((b) => new Date(b.createdAt || b.billDate).getTime() >= thirtyDaysAgo);
  const recentPayments = payments.filter((p) => new Date(p.createdAt || p.date).getTime() >= thirtyDaysAgo);

  const totalBillsAmount = recentBills.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const totalPaidAmount = recentPayments
    .filter((p) => p.type === 'payment_received')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = customer.runningBalance;
  const isDue = balance > 0;

  const upiSection = shop.upiId && isDue
    ? `⚡ GooglePay/PhonePe/Paytm से भुगतान हेतु UPI ID: *${shop.upiId}*\n`
    : '';

  return `🛒 *${shopName}*
👤 ग्राहक: *${customerName}*
📄 खाता आईडी: ${cleanCustUid}
📅 तारीख: ${todayDate}

📊 *खाता विवरण (पिछला 30 दिन):*
🛍️ कुल खरीदारी: ₹${totalBillsAmount.toFixed(2)} (${recentBills.length} बिल)
💵 कुल जमा राशि: ₹${totalPaidAmount.toFixed(2)} (${recentPayments.length} लेन-देन)
${isDue ? `🔴 *कुल बकाया राशि: ₹${balance.toFixed(2)}*` : `🟢 *वर्तमान खाता शेष: ₹${Math.abs(balance).toFixed(2)} (जमा)*`}

${upiSection}_सदा आपकी सेवा में तत्पर! धन्यवाद!_`;
};

/**
 * 3. Thank You Greeting Message (धन्यवाद संदेश)
 * Polite greeting expressing gratitude for being a valued customer
 */
export const formatWhatsAppThankYouMessage = (
  shop: ShopProfile,
  customer: Customer
): string => {
  const shopName = shop.shopName || 'खाता बुक';
  const customerName = customer.name;
  const balance = customer.runningBalance;

  let balanceNote = '';
  if (balance <= 0) {
    balanceNote = `✨ आपका खाता पूरी तरह चुकता है। समय पर भुगतान के लिए विशेष आभार!`;
  } else {
    balanceNote = `💼 वर्तमान खाता शेष: ₹${balance.toFixed(2)}।`;
  }

  return `🛒 *${shopName}*
👤 आदरणीय *${customerName}* जी,

🙏 *${shopName}* परिवार से जुड़ने और हम पर विश्वास बनाए रखने के लिए आपका हार्दिक आभार!

आप हमारे अत्यंत सम्मानित ग्राहक हैं। आपके साथ यह विश्वास और संबंध बनाए रखना हमारे लिए गौरव की बात है।

${balanceNote}

_सदा आपकी सेवा में उपस्थित। पुनः पधारें!_`;
};

// Open WhatsApp
export const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const encoded = encodeURIComponent(message);
  const url = cleanPhone.length === 10
    ? `https://wa.me/91${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
};
