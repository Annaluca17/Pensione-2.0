/**
 * Estrazione del testo con coordinate dai PDF, nel browser.
 * Il file non lascia mai il computer: pdf.js lo legge in memoria.
 * pdf.js è caricato solo al primo uso, per non appesantire l'avvio dell'app.
 */

import type { PaginaPdf } from './tipi';

export async function estraiPagine(file: File): Promise<PaginaPdf[]> {
  const pdfjs = await import('pdfjs-dist');
  const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pagine: PaginaPdf[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pg = await doc.getPage(n);
      const altezza = pg.getViewport({ scale: 1 }).height;
      const { items } = await pg.getTextContent();
      const pagina: PaginaPdf = [];
      for (const it of items) {
        if (!('str' in it) || !it.str.trim()) continue;
        const x = it.transform[4];
        pagina.push({ testo: it.str, x, x1: x + it.width, top: altezza - it.transform[5] });
      }
      pagine.push(pagina);
    }
    return pagine;
  } finally {
    await doc.destroy();
  }
}
