import JSZip from 'jszip';
import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';

/**
 * Turns a knowledge source file (PDF, EPUB or plain text) into clean text, and clean text into
 * passages for the search index. Scanned books have no text layer and are refused: no OCR.
 */

export class KnowledgeError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.status = 400;
    this.expose = true;
  }
}

export const SUPPORTED_EXTENSIONS = ['.pdf', '.epub', '.txt'];

const PASSAGE_WORDS = 300;
const OVERLAP_WORDS = 50;

export async function extractText(buffer, ext) {
  const readers = { '.pdf': readPdf, '.epub': readEpub, '.txt': (b) => b.toString('utf8') };
  const read = readers[String(ext).toLowerCase()];
  if (!read) throw new KnowledgeError('UNSUPPORTED', `Only ${SUPPORTED_EXTENSIONS.join(', ')} files can be added.`);

  let raw;
  try {
    raw = await read(buffer);
  } catch {
    throw new KnowledgeError('UNREADABLE', 'This file could not be read. It may be damaged or password-protected.');
  }
  const text = tidy(raw);
  if (!/\p{L}{2,}/u.test(text)) {
    throw new KnowledgeError('NO_TEXT', 'No text was found in this file. Scanned books (pictures of pages) cannot be added.');
  }
  return text;
}

/** Overlapping windows of about 300 words, so an idea split across a boundary is still found whole. */
export function splitIntoPassages(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const passages = [];
  for (let start = 0; ; start += PASSAGE_WORDS - OVERLAP_WORDS) {
    passages.push(words.slice(start, start + PASSAGE_WORDS).join(' '));
    if (start + PASSAGE_WORDS >= words.length) break;
  }
  return passages;
}

async function readPdf(buffer) {
  const doc = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractPdfText(doc, { mergePages: true });
  return text;
}

async function readEpub(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  const opf = opfPath && (await zip.file(opfPath)?.async('string'));
  if (!opf) throw new Error('Not an EPUB');

  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
  const hrefs = new Map();
  for (const item of opf.matchAll(/<item\b[^>]*>/g)) {
    const id = item[0].match(/\bid="([^"]+)"/)?.[1];
    const href = item[0].match(/\bhref="([^"]+)"/)?.[1];
    if (id && href) hrefs.set(id, href);
  }

  const chapters = [];
  for (const ref of opf.matchAll(/<itemref\b[^>]*\bidref="([^"]+)"/g)) {
    const href = hrefs.get(ref[1]);
    const html = href && (await zip.file(baseDir + decodeURIComponent(href))?.async('string'));
    if (html) chapters.push(htmlToText(html));
  }
  return chapters.join('\n\n');
}

function htmlToText(html) {
  return decodeEntities(
    html
      .replace(/<(head|style|script)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|section|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

function decodeEntities(s) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return named[e.toLowerCase()] ?? m;
  });
}

function tidy(s) {
  return s
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
