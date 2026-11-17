/* Barras Studio PDF renderer: no jsPDF dependency. Builds a standard PDF 1.4
   using high-resolution, browser-rendered JPEG pages. */
(function (global) {
  'use strict';
  const encoder = new TextEncoder();
  const mmToPt = mm => mm * 72 / 25.4;
  const utf8 = text => encoder.encode(text);

  class PDFWriter {
    constructor() { this.objects = [null, null]; this.pages = []; }
    add(body) { this.objects.push(body); return this.objects.length; }
    addImagePage(jpeg, widthMm, heightMm) {
      const width = mmToPt(widthMm), height = mmToPt(heightMm);
      const imageRef = this.add([utf8(`<< /Type /XObject /Subtype /Image /Width ${Math.round(widthMm * 6)} /Height ${Math.round(heightMm * 6)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, utf8('\nendstream')]);
      const commands = utf8(`q\n${width.toFixed(4)} 0 0 ${height.toFixed(4)} 0 0 cm\n/Img Do\nQ\n`);
      const contentRef = this.add([utf8(`<< /Length ${commands.length} >>\nstream\n`), commands, utf8('endstream')]);
      const pageRef = this.add(utf8(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(4)} ${height.toFixed(4)}] /Resources << /XObject << /Img ${imageRef} 0 R >> >> /Contents ${contentRef} 0 R >>`));
      this.pages.push(pageRef);
    }
    save(filename) {
      this.objects[0] = utf8('<< /Type /Catalog /Pages 2 0 R >>');
      this.objects[1] = utf8(`<< /Type /Pages /Kids [${this.pages.map(n => `${n} 0 R`).join(' ')}] /Count ${this.pages.length} >>`);
      const chunks = [], offsets = [0]; let length = 0;
      const push = data => { chunks.push(data); length += data.byteLength; };
      push(utf8('%PDF-1.4\n%\xD0\xD4\xC5\xD8\n'));
      for (let i = 0; i < this.objects.length; i++) {
        offsets.push(length); push(utf8(`${i + 1} 0 obj\n`));
        const body = this.objects[i];
        for (const chunk of Array.isArray(body) ? body : [body]) push(chunk);
        push(utf8('\nendobj\n'));
      }
      const xref = length;
      push(utf8(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`));
      for (const offset of offsets.slice(1)) push(utf8(`${String(offset).padStart(10, '0')} 00000 n \n`));
      push(utf8(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
      const file = new Blob(chunks, { type: 'application/pdf' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a'); link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return { pages: this.pages.length, bytes: file.size };
    }
  }

  function decodedJpeg(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw Error('No se pudo codificar la página PDF.');
    const binary = atob(base64), data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
    return data;
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(Error('No se pudo preparar un código para imprimir.'));
      img.src = src;
      if (img.complete && img.naturalWidth) resolve(img);
    });
  }
  function truncate(ctx, value, maxWidth) {
    let text = String(value ?? '');
    if (ctx.measureText(text).width <= maxWidth) return text;
    while (text.length && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
    return text + '…';
  }
  function twoLineText(ctx, name, maxWidth) {
    const words = String(name).split(/\s+/); let lines = [], current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (current && ctx.measureText(next).width > maxWidth) { lines.push(current); current = word; }
      else current = next;
    }
    if (current) lines.push(current);
    return lines.slice(0, 2).map((line, index) => index === 1 && lines.length > 2 ? truncate(ctx, line + '…', maxWidth) : truncate(ctx, line, maxWidth));
  }
  function drawLabel(ctx, product, image, opts, x, y, w, h) {
    ctx.strokeStyle = '#c7d2d0'; ctx.lineWidth = 0.16;
    ctx.strokeRect(x + 0.15, y + 0.15, w - 0.3, h - 0.3);
    ctx.fillStyle = '#102735'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const center = x + w / 2; const available = w - 6;
    let cursor = y + 2.0;
    if (opts.showName) {
      const titleSize = Math.min(3.4, Math.max(2.4, w / 27));
      ctx.font = `700 ${titleSize}px Arial, sans-serif`;
      for (const line of twoLineText(ctx, product.name, available)) { ctx.fillText(line, center, cursor); cursor += titleSize * 1.18; }
      cursor += 0.7;
    }
    const footer = (opts.showCode ? 4.3 : 0) + (opts.showPrice && product.price ? 3.5 : 0) + 2.0;
    const remaining = Math.max(7, y + h - cursor - footer);
    if (opts.format === 'QR') {
      const size = Math.min(remaining, available, h * 0.67);
      ctx.drawImage(image, center - size / 2, cursor, size, size); cursor += size + 0.7;
    } else {
      // Preserve barcode ratio and quiet zones; never stretch bars horizontally.
      const ratio = image.naturalWidth / image.naturalHeight;
      const imgW = Math.min(available, remaining * ratio);
      const imgH = Math.min(remaining, imgW / ratio);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, center - imgW / 2, cursor, imgW, imgH);
      ctx.imageSmoothingEnabled = true;
      cursor += imgH + 0.5;
    }
    if (opts.showCode) {
      ctx.font = `500 ${Math.min(2.6, Math.max(1.8, w / 35))}px Arial, sans-serif`;
      ctx.fillText(truncate(ctx, product.code, available), center, Math.min(cursor, y + h - (opts.showPrice && product.price ? 6 : 4)));
      cursor += 3.2;
    }
    if (opts.showPrice && product.price) {
      ctx.font = '700 2.5px Arial, sans-serif';
      ctx.fillText(truncate(ctx, product.price, available), center, Math.min(cursor, y + h - 3.3));
    }
  }
  async function create({ labels, format, paper, cols, rows, showName, showCode, showPrice, getImage, onProgress }) {
    if (!Array.isArray(labels) || !labels.length) throw Error('No hay artículos para imprimir.');
    const width = paper === 'letter' ? 215.9 : 210;
    const height = paper === 'letter' ? 279.4 : 297;
    const perPage = cols * rows, margin = 9, gap = 2;
    const cw = (width - 2 * margin - (cols - 1) * gap) / cols;
    const ch = (height - 2 * margin - (rows - 1) * gap) / rows;
    const scale = 6; // 152.4 DPI, with crisp high-contrast codes
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw Error('El navegador no permite crear el documento PDF.');
    const pdf = new PDFWriter();
    for (let start = 0; start < labels.length; start += perPage) {
      const pageProducts = labels.slice(start, start + perPage);
      const unique = [...new Set(pageProducts.map(p => p.code))];
      const images = new Map();
      await Promise.all(unique.map(async code => { images.set(code, await loadImage(getImage(code, format))); }));
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
      pageProducts.forEach((product, index) => {
        const col = index % cols, row = Math.floor(index / cols);
        drawLabel(ctx, product, images.get(product.code), { format, showName, showCode, showPrice }, margin + col * (cw + gap), margin + row * (ch + gap), cw, ch);
      });
      const jpeg = decodedJpeg(canvas.toDataURL('image/jpeg', .91));
      pdf.addImagePage(jpeg, width, height);
      if (onProgress) onProgress(pdf.pages.length, Math.ceil(labels.length / perPage));
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return pdf.save('barras-studio-etiquetas.pdf');
  }
  global.BarrasPdf = { create };
})(window);
