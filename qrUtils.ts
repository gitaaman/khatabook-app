import QRCode from 'qrcode';

/**
 * Generate standard NPCI UPI URI string
 */
export const generateUPIPaymentURI = (
  upiId: string,
  payeeName: string,
  amount?: number,
  billNumber?: string
): string => {
  const cleanUpi = (upiId || '').toLowerCase().trim();
  const cleanName = (payeeName || 'Shop').trim();

  let uri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanName)}&cu=INR`;

  if (amount && amount > 0) {
    uri += `&am=${amount.toFixed(2)}`;
  }

  if (billNumber) {
    uri += `&tn=${encodeURIComponent(`Bill ${billNumber}`)}`;
  }

  return uri;
};

/**
 * Generate QR Code data URL locally (100% Offline)
 */
export const generateQRCodeDataURL = async (
  upiId: string,
  payeeName: string,
  amount?: number,
  billNumber?: string,
  width: number = 240
): Promise<string> => {
  if (!upiId) return '';
  const uri = generateUPIPaymentURI(upiId, payeeName, amount, billNumber);

  try {
    const dataUrl = await QRCode.toDataURL(uri, {
      width,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Offline QR generation error:', err);
    return '';
  }
};
