const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const TOKEN_KEY = 'openear_access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return API_BASE ? `${API_BASE}${p}` : p;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(apiUrl(path), { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || res.statusText || 'Request failed',
      res.status,
    );
  }
  return data as T;
}

export interface CoverUploadResult {
  path: string;
  publicUrl: string;
}

export interface EbookUploadResult {
  path: string;
  fileName: string;
  size: number;
  format: 'PDF' | 'EPUB';
  /** Not returned for private ebook uploads; kept optional for backward compatibility. */
  publicUrl?: string;
}

export async function apiUpload(kind: 'cover', file: File): Promise<CoverUploadResult>;
export async function apiUpload(kind: 'ebook', file: File): Promise<EbookUploadResult>;
export async function apiUpload(
  kind: 'ebook' | 'cover',
  file: File,
): Promise<CoverUploadResult | EbookUploadResult> {
  const form = new FormData();
  form.append('file', file);
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(`/api/uploads/${kind}`), {
    method: 'POST',
    headers,
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || 'Upload failed', res.status);
  }
  return data as CoverUploadResult | EbookUploadResult;
}

/* ---------- Ebook store types & helpers ---------- */

export interface Ebook {
  id: string;
  title: string;
  slug: string | null;
  author: string | null;
  description: string;
  short_description: string;
  category: string;
  price: number;
  currency: string;
  cover_image_url: string | null;
  file_format: 'PDF' | 'EPUB' | null;
  file_size: number;
  publication_date: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AdminEbook extends Ebook {
  file_url: string | null;
  purchase_count: number;
}

export interface EbookOrder {
  reference: string;
  status: 'pending' | 'completed' | 'failed';
  total: number;
  currency: string;
  created_at: string;
  completed_at: string | null;
  items: { ebook_id: string; title: string; price: number }[];
}

export function formatMoney(amount: number, currency = 'USD'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/**
 * Downloads an owned ebook. The endpoint requires the Authorization header,
 * so a plain link cannot be used: fetch -> blob -> object URL -> click.
 */
export async function downloadEbook(ebookId: string, fallbackFilename: string): Promise<void> {
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(apiUrl(`/api/ebooks/${encodeURIComponent(ebookId)}/download`), {
    headers,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      (data as { error?: string }).error || res.statusText || 'Download failed',
      res.status,
    );
  }
  const blob = await res.blob();
  const filename =
    filenameFromDisposition(res.headers.get('Content-Disposition')) || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
