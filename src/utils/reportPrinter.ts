/**
 * Native Browser Print Triggers for Report Center & Monthly Register
 * 
 * Sets the appropriate print mode on document.body, triggers window.print(),
 * and automatically resets after the print dialog finishes.
 * Eliminates all iframe injection failures in sandboxed environments.
 */

function setDynamicPageStyle(css: string) {
  let styleEl = document.getElementById('dynamic-print-page-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-print-page-style';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}

function removeDynamicPageStyle() {
  const styleEl = document.getElementById('dynamic-print-page-style');
  if (styleEl && styleEl.parentNode) {
    styleEl.parentNode.removeChild(styleEl);
  }
}

export function triggerReportPrint(
  mode: 'all' | 'cmda1' | 'cmda2' | 'pmmdcf1' | 'pmmdcf2',
  documentTitle?: string
) {
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  setDynamicPageStyle(`
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
  `);

  // Remove any previous print mode classes
  document.body.classList.remove(
    'print-mode-active',
    'print-mode-all',
    'print-mode-cmda1',
    'print-mode-cmda2',
    'print-mode-pmmdcf1',
    'print-mode-pmmdcf2',
    'print-mode-monthly-register'
  );

  // Add the active print mode classes
  document.body.classList.add('print-mode-active', `print-mode-${mode}`);

  const cleanup = () => {
    document.body.classList.remove(
      'print-mode-active',
      'print-mode-all',
      'print-mode-cmda1',
      'print-mode-cmda2',
      'print-mode-pmmdcf1',
      'print-mode-pmmdcf2',
      'print-mode-monthly-register'
    );
    document.title = originalTitle;
    removeDynamicPageStyle();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Trigger print after a brief frame render
  requestAnimationFrame(() => {
    setTimeout(() => {
      window.focus();
      window.print();
      // Safety cleanup fallback for browsers without reliable afterprint
      setTimeout(cleanup, 2000);
    }, 100);
  });
}

/**
 * Native Browser Print Trigger for Master Monthly Daily Register
 * Uses landscape orientation for optimal fit of the wide multi-column table.
 */
export function triggerMonthlyRegisterPrint(documentTitle?: string) {
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  setDynamicPageStyle(`
    @page {
      size: A4 landscape;
      margin: 6mm;
    }
  `);

  document.body.classList.remove(
    'print-mode-active',
    'print-mode-all',
    'print-mode-cmda1',
    'print-mode-cmda2',
    'print-mode-pmmdcf1',
    'print-mode-pmmdcf2',
    'print-mode-monthly-register'
  );

  document.body.classList.add('print-mode-active', 'print-mode-monthly-register');

  const cleanup = () => {
    document.body.classList.remove(
      'print-mode-active',
      'print-mode-all',
      'print-mode-cmda1',
      'print-mode-cmda2',
      'print-mode-pmmdcf1',
      'print-mode-pmmdcf2',
      'print-mode-monthly-register'
    );
    document.title = originalTitle;
    removeDynamicPageStyle();
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  requestAnimationFrame(() => {
    setTimeout(() => {
      window.focus();
      window.print();
      setTimeout(cleanup, 2000);
    }, 100);
  });
}

