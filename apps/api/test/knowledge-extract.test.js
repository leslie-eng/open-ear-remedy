import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractText, splitIntoPassages } from '../src/knowledge/extract.js';

/** A minimal one-page PDF. With `text`, the page shows it; without, the page is blank (like a scan). */
function pdf(text) {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : '';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/** A minimal EPUB with chapters given as HTML bodies, in reading order. */
async function epub(chapters) {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip');
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
      <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`,
  );
  const items = chapters.map((_, i) => `<item id="c${i}" href="text/c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('');
  // Spine order is the reading order, deliberately the reverse of the manifest order here.
  const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).reverse().join('');
  zip.file('OEBPS/content.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0">
    <manifest>${items}</manifest><spine>${spine}</spine></package>`);
  chapters.forEach((body, i) => {
    zip.file(`OEBPS/text/c${i}.xhtml`, `<html><head><title>t</title><style>p{color:red}</style></head><body>${body}</body></html>`);
  });
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('reading knowledge files', () => {
  it('reads the text of a PDF', async () => {
    expect(await extractText(pdf('Slow breathing calms the body.'), '.pdf')).toBe('Slow breathing calms the body.');
  });

  it('rejects a PDF with no text, such as a scan', async () => {
    await expect(extractText(pdf(null), '.pdf')).rejects.toMatchObject({ code: 'NO_TEXT' });
  });

  it('reads EPUB chapters in reading order, without markup or styles', async () => {
    const book = await epub(['<h1>Two</h1><p>Second &amp; last.</p>', '<p>First chapter.</p>']);
    expect(await extractText(book, '.epub')).toBe('First chapter.\n\nTwo\nSecond & last.');
  });

  it('reads plain text and tidies its whitespace', async () => {
    const text = Buffer.from('﻿Line one.  \r\n\r\n\r\n\r\nLine   two.\n');
    expect(await extractText(text, '.txt')).toBe('Line one.\n\nLine two.');
  });

  it('refuses file types it cannot read', async () => {
    await expect(extractText(Buffer.from('x'), '.docx')).rejects.toMatchObject({ code: 'UNSUPPORTED' });
  });
});

describe('splitting text into passages', () => {
  const words = (from, to) => Array.from({ length: to - from }, (_, i) => `w${from + i}`).join(' ');

  it('keeps a short text as a single passage', () => {
    expect(splitIntoPassages('A short note.')).toEqual(['A short note.']);
  });

  it('splits long text into passages of about 300 words that overlap by 50', () => {
    const passages = splitIntoPassages(words(0, 650));
    expect(passages).toEqual([words(0, 300), words(250, 550), words(500, 650)]);
  });
});
