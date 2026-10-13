import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ShopProfile, Customer, Bill } from './database.types';
import { generateQRCodeDataURL } from './qrUtils';

const THEME_HEX: { [key: string]: { primary: string; secondary: string; light: string } } = {
  'royal-blue': { primary: '#1e3a8a', secondary: '#2563eb', light: '#eff6ff' },
  'emerald-green': { primary: '#064e3b', secondary: '#059669', light: '#ecfdf5' },
  'royal-purple': { primary: '#4c1d95', secondary: '#7c3aed', light: '#f5f3ff' },
  'orange-gold': { primary: '#7c2d12', secondary: '#ea580c', light: '#fff7ed' },
  'coffee-brown': { primary: '#451a03', secondary: '#92400e', light: '#fffbeb' },
  'black-luxury': { primary: '#0f172a', secondary: '#334155', light: '#f8fafc' },
  'deep-red': { primary: '#7f1d1d', secondary: '#dc2626', light: '#fef2f2' },
  'sky-blue': { primary: '#0c4a6e', secondary: '#0284c7', light: '#f0f9ff' },
};

/**
 * Generate HTML Document for a Single Bill Invoice
 */
const buildInvoiceHTML = (
  shop: ShopProfile,
  themeKey: string,
  customer: Customer,
  bill: Bill,
  qrDataUrl: string
): string => {
  const theme = THEME_HEX[themeKey] || THEME_HEX['royal-blue'];
  const isPending = bill.paymentStatus === 'pending';
  const statusBadge = isPending
    ? `<span style="background: #ffe4e6; color: #e11d48; border: 1px solid #fecdd3; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 11px;">PENDING / उधार</span>`
    : `<span style="background: #d1fae5; color: #059669; border: 1px solid #a7f3d0; padding: 4px 12px; border-radius: 6px; font-weight: 800; font-size: 11px;">PAID / चुकता</span>`;

  const rows = bill.items.map((item, idx) => `
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; text-align: center; font-size: 12px; font-weight: 600; color: #64748b;">${idx + 1}</td>
      <td style="padding: 8px 10px; text-align: left; font-size: 13px; font-weight: 700; color: #0f172a; font-family: 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif;">${item.name}</td>
      <td style="padding: 8px 10px; text-align: right; font-size: 12px; font-weight: 600; color: #334155;">₹${(item.rate || item.price || 0).toFixed(2)}</td>
      <td style="padding: 8px 10px; text-align: center; font-size: 12px; font-weight: 700; color: #0f172a;">${item.quantity} ${item.unit || ''}</td>
      <td style="padding: 8px 10px; text-align: right; font-size: 13px; font-weight: 800; color: ${theme.primary};">₹${(item.total || ((item.rate || item.price || 0) * item.quantity)).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div id="pdf-invoice-container" style="width: 794px; background: #ffffff; padding: 36px 40px; font-family: 'Noto Sans Devanagari', 'Segoe UI', Roboto, sans-serif; color: #0f172a; box-sizing: border-box; line-height: 1.4;">
      <style>
        #pdf-invoice-container, #pdf-invoice-container * {
          font-family: 'Noto Sans Devanagari', 'Segoe UI', Roboto, -apple-system, sans-serif !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      </style>
      
      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${theme.primary}; padding-bottom: 18px; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${shop.logoUrl 
            ? `<img src="${shop.logoUrl}" crossOrigin="anonymous" style="width: 54px; height: 54px; border-radius: 12px; object-fit: cover;" />`
            : `<div style="width: 50px; height: 50px; border-radius: 12px; background: ${theme.primary}; color: #ffffff; font-weight: 900; font-size: 24px; display: flex; align-items: center; justify-content: center;">${(shop.shopName || 'K').charAt(0).toUpperCase()}</div>`
          }
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: ${theme.primary}; font-family: 'Noto Sans Devanagari', sans-serif;">${shop.shopName || 'खाता बुक'}</h1>
            <p style="margin: 2px 0 0; font-size: 12px; font-weight: 600; color: #64748b;">दुकानदार: <strong>${shop.ownerName || 'Owner'}</strong> | फ़ोन: <strong>${shop.phone || ''}</strong></p>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: ${theme.primary}; letter-spacing: 1px;">INVOICE / बिल रसीद</h2>
          <div style="margin-top: 6px;">${statusBadge}</div>
        </div>
      </div>

      <!-- Metadata Box -->
      <div style="display: flex; justify-content: space-between; background: ${theme.light}; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px;">
        <div style="width: 48%;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">BILLED TO / ग्राहक विवरण</span>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: 'Noto Sans Devanagari', sans-serif;">${customer.name}</div>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">फ़ोन: <strong>${customer.phone}</strong></div>
          ${customer.address ? `<div style="font-size: 12px; color: #64748b; margin-top: 1px;">पता: ${customer.address}</div>` : ''}
        </div>
        <div style="width: 48%; text-align: right;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">INVOICE DETAILS / बिल विवरण</span>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">रसीद नं: <strong style="color: ${theme.primary}; font-family: monospace;">${bill.billNumber}</strong></div>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">तारीख: <strong>${bill.billDate}</strong></div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
        <thead>
          <tr style="background: ${theme.primary}; color: #ffffff;">
            <th style="padding: 9px 10px; font-size: 11px; font-weight: 800; width: 45px; text-align: center; text-transform: uppercase;">क्र.सं.</th>
            <th style="padding: 9px 10px; font-size: 11px; font-weight: 800; text-align: left; text-transform: uppercase;">सामान का विवरण (Item Name)</th>
            <th style="padding: 9px 10px; font-size: 11px; font-weight: 800; width: 90px; text-align: right; text-transform: uppercase;">दर (Rate)</th>
            <th style="padding: 9px 10px; font-size: 11px; font-weight: 800; width: 85px; text-align: center; text-transform: uppercase;">मात्रा (Qty)</th>
            <th style="padding: 9px 10px; font-size: 11px; font-weight: 800; width: 100px; text-align: right; text-transform: uppercase;">कुल (Total)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <!-- Bottom Summary & QR Block -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 18px; margin-top: 10px;">
        
        <!-- Left: UPI QR Auto-Pay -->
        <div style="display: flex; align-items: center; gap: 14px;">
          ${qrDataUrl ? `
            <div style="background: #ffffff; padding: 6px; border: 1.5px solid #10b981; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
              <img src="${qrDataUrl}" style="width: 88px; height: 88px; display: block;" alt="UPI QR" />
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #065f46; display: flex; align-items: center; gap: 4px;">
                ⚡ Scan to Auto-Pay via UPI
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #334155; margin-top: 2px; font-family: monospace;">
                UPI ID: ${shop.upiId || ''}
              </div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-top: 2px;">
                PhonePe, GPay, Paytm से स्कैन करें
              </div>
            </div>
          ` : `<div></div>`}
        </div>

        <!-- Right: Grand Total -->
        <div style="text-align: right; background: ${theme.light}; border: 1.5px solid ${theme.secondary}; border-radius: 14px; padding: 12px 22px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">Grand Total / कुल योग</span>
          <div style="font-size: 26px; font-weight: 900; color: ${theme.primary}; margin-top: 2px;">
            ₹${bill.totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="text-align: center; margin-top: 28px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; font-weight: 600; color: #94a3b8;">
        Generated digitally via खाता बुक App • 100% Offline Digital Ledger
      </div>
    </div>
  `;
};

/**
 * Generate HTML Document for Consolidated Ledger Statement (All/Multiple Bills)
 */
const buildConsolidatedHTML = (
  shop: ShopProfile,
  themeKey: string,
  customer: Customer,
  billsList: Bill[],
  qrDataUrl: string
): string => {
  const theme = THEME_HEX[themeKey] || THEME_HEX['royal-blue'];

  let grandTotalOutstanding = 0;
  const flattenedRows: string[] = [];
  let rowIdx = 1;

  billsList.forEach((b) => {
    grandTotalOutstanding += b.totalAmount;
    const isPending = b.paymentStatus === 'pending';

    b.items.forEach((item) => {
      flattenedRows.push(`
        <tr style="background: ${rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 7px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #64748b;">${rowIdx}</td>
          <td style="padding: 7px 8px; text-align: center; font-size: 11px; font-weight: 600; color: #475569;">${b.billDate}</td>
          <td style="padding: 7px 8px; text-align: left; font-size: 12px; font-weight: 700; color: #0f172a; font-family: 'Noto Sans Devanagari', 'Segoe UI', system-ui, sans-serif;">
            ${item.name} <span style="font-size: 10px; color: #64748b; font-weight: 500; font-family: monospace;">(${b.billNumber})</span>
          </td>
          <td style="padding: 7px 8px; text-align: right; font-size: 11px; font-weight: 600; color: #334155;">₹${(item.rate || item.price || 0).toFixed(2)}</td>
          <td style="padding: 7px 8px; text-align: center; font-size: 11px; font-weight: 700; color: #0f172a;">${item.quantity} ${item.unit || ''}</td>
          <td style="padding: 7px 8px; text-align: right; font-size: 12px; font-weight: 800; color: ${isPending ? '#e11d48' : '#059669'};">₹${(item.total || ((item.rate || item.price || 0) * item.quantity)).toFixed(2)}</td>
        </tr>
      `);
      rowIdx++;
    });
  });

  return `
    <div id="pdf-statement-container" style="width: 794px; background: #ffffff; padding: 36px 40px; font-family: 'Noto Sans Devanagari', 'Segoe UI', Roboto, sans-serif; color: #0f172a; box-sizing: border-box; line-height: 1.4;">
      <style>
        #pdf-statement-container, #pdf-statement-container * {
          font-family: 'Noto Sans Devanagari', 'Segoe UI', Roboto, -apple-system, sans-serif !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      </style>
      
      <!-- Top Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid ${theme.primary}; padding-bottom: 18px; margin-bottom: 18px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          ${shop.logoUrl 
            ? `<img src="${shop.logoUrl}" crossOrigin="anonymous" style="width: 54px; height: 54px; border-radius: 12px; object-fit: cover;" />`
            : `<div style="width: 50px; height: 50px; border-radius: 12px; background: ${theme.primary}; color: #ffffff; font-weight: 900; font-size: 24px; display: flex; align-items: center; justify-content: center;">${(shop.shopName || 'K').charAt(0).toUpperCase()}</div>`
          }
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: ${theme.primary}; font-family: 'Noto Sans Devanagari', sans-serif;">${shop.shopName || 'खाता बुक'}</h1>
            <p style="margin: 2px 0 0; font-size: 12px; font-weight: 600; color: #64748b;">दुकानदार: <strong>${shop.ownerName || 'Owner'}</strong> | फ़ोन: <strong>${shop.phone || ''}</strong></p>
          </div>
        </div>
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: 18px; font-weight: 900; color: ${theme.primary}; letter-spacing: 0.5px;">LEDGER STATEMENT</h2>
          <span style="font-size: 11px; font-weight: 800; color: #475569; background: #f1f5f9; padding: 3px 8px; border-radius: 5px; margin-top: 4px; display: inline-block;">खाता विवरण</span>
        </div>
      </div>

      <!-- Metadata Box -->
      <div style="display: flex; justify-content: space-between; background: ${theme.light}; border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px 18px; margin-bottom: 18px;">
        <div style="width: 48%;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">CUSTOMER / ग्राहक</span>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: 'Noto Sans Devanagari', sans-serif;">${customer.name}</div>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">फ़ोन: <strong>${customer.phone}</strong> ${customer.address ? `• पता: ${customer.address}` : ''}</div>
        </div>
        <div style="width: 48%; text-align: right;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">STATEMENT SUMMARY</span>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">तारीख: <strong>${new Date().toISOString().split('T')[0]}</strong></div>
          <div style="font-size: 12px; font-weight: 600; color: #475569; margin-top: 2px;">कुल रसीदें: <strong>${billsList.length} Entries (${flattenedRows.length} Items)</strong></div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
        <thead>
          <tr style="background: ${theme.primary}; color: #ffffff;">
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; width: 40px; text-align: center; text-transform: uppercase;">क्र.</th>
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; width: 80px; text-align: center; text-transform: uppercase;">तारीख</th>
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; text-align: left; text-transform: uppercase;">सामान का विवरण (Item Name)</th>
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; width: 75px; text-align: right; text-transform: uppercase;">दर (Rate)</th>
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; width: 70px; text-align: center; text-transform: uppercase;">मात्रा (Qty)</th>
            <th style="padding: 8px 8px; font-size: 10px; font-weight: 800; width: 90px; text-align: right; text-transform: uppercase;">कुल (Total)</th>
          </tr>
        </thead>
        <tbody>
          ${flattenedRows.join('')}
        </tbody>
      </table>

      <!-- Bottom Summary & QR Block -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #e2e8f0; padding-top: 18px; margin-top: 10px;">
        
        <!-- Left: UPI QR Auto-Pay -->
        <div style="display: flex; align-items: center; gap: 14px;">
          ${qrDataUrl ? `
            <div style="background: #ffffff; padding: 6px; border: 1.5px solid #10b981; border-radius: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06);">
              <img src="${qrDataUrl}" style="width: 88px; height: 88px; display: block;" alt="UPI QR" />
            </div>
            <div>
              <div style="font-size: 12px; font-weight: 800; color: #065f46; display: flex; align-items: center; gap: 4px;">
                ⚡ Scan to Auto-Pay Total Khata
              </div>
              <div style="font-size: 11px; font-weight: 700; color: #334155; margin-top: 2px; font-family: monospace;">
                UPI ID: ${shop.upiId || ''}
              </div>
              <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-top: 2px;">
                PhonePe, GPay, Paytm से स्कैन करें
              </div>
            </div>
          ` : `<div></div>`}
        </div>

        <!-- Right: Grand Total Outstanding -->
        <div style="text-align: right; background: ${theme.light}; border: 1.5px solid ${theme.secondary}; border-radius: 14px; padding: 12px 22px;">
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: ${theme.secondary}; letter-spacing: 0.5px;">Grand Total Outstanding / कुल बकाया</span>
          <div style="font-size: 26px; font-weight: 900; color: #e11d48; margin-top: 2px;">
            ₹${grandTotalOutstanding.toFixed(2)}
          </div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="text-align: center; margin-top: 28px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; font-weight: 600; color: #94a3b8;">
        Generated digitally via खाता बुक App • 100% Offline Digital Ledger
      </div>
    </div>
  `;
};

/**
 * Render HTML container to PDF using html2canvas & jsPDF with multi-page slicing (100% Offline)
 */
const renderHTMLToPDF = async (htmlString: string, filename: string) => {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.zIndex = '-9999';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = htmlString;
  document.body.appendChild(container);

  try {
    if ((document as any).fonts && (document as any).fonts.ready) {
      await (document as any).fonts.ready;
    }

    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    await new Promise((r) => setTimeout(r, 200));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: 794,
      windowWidth: 1000
    });

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const pdfWidth = 210;
    const pdfHeight = 297;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageHeightPx = Math.floor((canvasWidth * pdfHeight) / pdfWidth);

    if (canvasHeight <= pageHeightPx) {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const imgHeightInMm = (canvasHeight * pdfWidth) / canvasWidth;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightInMm);
    } else {
      let currentY = 0;
      let pageIndex = 0;

      while (currentY < canvasHeight) {
        if (pageIndex > 0) {
          pdf.addPage();
        }

        const sliceHeight = Math.min(pageHeightPx, canvasHeight - currentY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, sliceHeight);
          ctx.drawImage(
            canvas,
            0, currentY, canvasWidth, sliceHeight,
            0, 0, canvasWidth, sliceHeight
          );
        }

        const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
        const sliceHeightInMm = (sliceHeight * pdfWidth) / canvasWidth;
        pdf.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, sliceHeightInMm);

        currentY += sliceHeight;
        pageIndex++;
      }
    }

    pdf.save(filename);
  } finally {
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
};

export const generateInvoicePDF = async (
  shop: ShopProfile,
  customer: Customer,
  bill: Bill
) => {
  let qrDataUrl = '';
  if (shop.upiId && bill.totalAmount > 0) {
    try {
      qrDataUrl = await generateQRCodeDataURL(
        shop.upiId,
        shop.shopName,
        bill.totalAmount,
        bill.billNumber,
        240
      );
    } catch (_) {}
  }

  const themeKey = shop.theme || 'royal-blue';
  const html = buildInvoiceHTML(shop, themeKey, customer, bill, qrDataUrl);
  await renderHTMLToPDF(html, `Invoice_${bill.billNumber}.pdf`);
};

export const generateConsolidatedPDF = async (
  shop: ShopProfile,
  customer: Customer,
  billsList: Bill[]
) => {
  let computedGrandTotal = 0;
  billsList.forEach((b) => { computedGrandTotal += b.totalAmount; });

  let qrDataUrl = '';
  if (shop.upiId && computedGrandTotal > 0) {
    try {
      qrDataUrl = await generateQRCodeDataURL(
        shop.upiId,
        shop.shopName,
        computedGrandTotal,
        'KhataTotal',
        240
      );
    } catch (_) {}
  }

  const themeKey = shop.theme || 'royal-blue';
  const html = buildConsolidatedHTML(shop, themeKey, customer, billsList, qrDataUrl);
  const safeName = (customer.name || 'Customer').replace(/\s+/g, '_');
  await renderHTMLToPDF(html, `LedgerStatement_${safeName}.pdf`);
};
