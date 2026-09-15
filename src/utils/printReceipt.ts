/**
 * Helper to reliably print an HTML element or thermal receipt directly
 * across all desktop and mobile browsers, including iframe environments and WebViews.
 */
export const printElementDirectly = (elementId: string, title = 'Comprovante de Venda') => {
  const element = document.getElementById(elementId);
  
  // 1. Direct window print approach with dedicated print stylesheet isolation
  const printStyleId = 'direct-receipt-print-style';
  let existingStyle = document.getElementById(printStyleId);
  if (!existingStyle) {
    existingStyle = document.createElement('style');
    existingStyle.id = printStyleId;
    existingStyle.innerHTML = `
      @media print {
        body.is-printing-direct-receipt * {
          visibility: hidden !important;
        }
        body.is-printing-direct-receipt #${elementId},
        body.is-printing-direct-receipt #${elementId} * {
          visibility: visible !important;
        }
        body.is-printing-direct-receipt #${elementId} {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          max-width: 80mm !important;
          margin: 0 auto !important;
          padding: 4mm !important;
          background: #fff !important;
          color: #000 !important;
          box-shadow: none !important;
          border: none !important;
          font-family: monospace, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
        }
        body.is-printing-direct-receipt #${elementId} .print\\:hidden,
        body.is-printing-direct-receipt #${elementId} button {
          display: none !important;
        }
        body.is-printing-direct-receipt #${elementId} .hidden {
          display: flex !important;
          visibility: visible !important;
        }
      }
    `;
    document.head.appendChild(existingStyle);
  }

  // If element exists on current DOM, trigger direct print with body class
  if (element) {
    document.body.classList.add('is-printing-direct-receipt');
    
    const cleanup = () => {
      document.body.classList.remove('is-printing-direct-receipt');
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);

    // Also fallback cleanup timeout in case afterprint does not fire
    setTimeout(() => {
      document.body.classList.remove('is-printing-direct-receipt');
    }, 2000);

    try {
      window.focus();
      window.print();
      return;
    } catch (err) {
      console.warn('Direct window.print encountered error, attempting iframe fallback:', err);
    }
  }

  // Fallback iframe print method
  if (!element) {
    try {
      window.print();
    } catch (e) {
      console.warn('Fallback window.print failed', e);
    }
    return;
  }

  // Clone element HTML so we can clean up any interactive buttons
  const clone = element.cloneNode(true) as HTMLElement;
  const printHiddenElements = clone.querySelectorAll('.print\\:hidden, button');
  printHiddenElements.forEach(el => el.remove());

  // Make sure hidden print-only elements are displayed
  const printOnlyElements = clone.querySelectorAll('.hidden');
  printOnlyElements.forEach(el => {
    (el as HTMLElement).classList.remove('hidden');
    (el as HTMLElement).style.display = 'flex';
  });

  const contentHtml = clone.innerHTML;

  const iframeId = 'receipt-direct-print-frame';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!iframeDoc) {
    try {
      window.print();
    } catch (e) {
      console.warn('Fallback window.print failed', e);
    }
    return;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, Courier, sans-serif;
            margin: 0;
            padding: 8px;
            color: #000;
            background: #fff;
            width: 100%;
            max-width: 320px;
            font-size: 11px;
            line-height: 1.35;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin-left: auto;
            margin-right: auto;
          }
          .border-b { border-bottom: 1px solid #000; }
          .border-t { border-top: 1px solid #000; }
          .border-dashed { border-style: dashed; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .flex-col { flex-direction: column; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .space-y-1 > * + * { margin-top: 4px; }
          .space-y-1\\.5 > * + * { margin-top: 6px; }
          .space-y-2 > * + * { margin-top: 8px; }
          .pb-1 { padding-bottom: 4px; }
          .pb-2 { padding-bottom: 8px; }
          .pb-3 { padding-bottom: 12px; }
          .pt-2 { padding-top: 8px; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mt-1 { margin-top: 4px; }
          .mt-2 { margin-top: 8px; }
          .mt-12 { margin-top: 32px; }
          .w-full { width: 100%; }
          .w-4\\/5 { width: 80%; }
          .mx-auto { margin-left: auto; margin-right: auto; }
          .max-h-12 { max-height: 48px; }
          .max-h-16 { max-height: 64px; }
          .text-xs { font-size: 11px; }
          .text-\\[10px\\] { font-size: 10px; }
          .text-\\[9px\\] { font-size: 9px; }
          .text-sm { font-size: 13px; }
          .text-lg { font-size: 16px; }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `);
  iframeDoc.close();

  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print error, attempting direct window.print fallback:', err);
      try {
        window.print();
      } catch (e) {
        console.error('Fallback print also failed:', e);
      }
    }
  }, 250);
};
