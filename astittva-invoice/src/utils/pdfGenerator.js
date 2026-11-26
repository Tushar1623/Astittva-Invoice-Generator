/**
 * Client-Side PDF Generation and Print Utilities
 * Compliant with PRD Section 9
 */

/**
 * Triggers clean browser print dialog with print-specific styles
 */
export function printInvoice() {
  window.print();
}

/**
 * Downloads the invoice element as a high-quality A4 PDF using html2pdf.js
 */
export async function downloadInvoicePDF(elementId, invoiceNumber = 'invoice') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const safeFileName = `Tax_Invoice_${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  // Dynamic import of html2pdf.js to support client environments
  try {
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default || html2pdfModule;

    const opt = {
      margin: [8, 8, 8, 8], // mm
      filename: safeFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    return await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.warn('html2pdf execution error, triggering browser print as fallback:', err);
    window.print();
  }
}
