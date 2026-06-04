
const SAFE_IMG_SCHEMES = ['http:', 'https:', 'blob:'];
const SAFE_DATA_IMG_PREFIXES = [
  'data:image/png',
  'data:image/jpeg',
  'data:image/jpg',
  'data:image/gif',
  'data:image/webp',
  'data:image/avif',
  'data:image/bmp',
  'data:image/x-icon',
];

export function isSafeImageUrl(url: string): boolean {
  if (!url) return false;
  try {
    if (url.startsWith('blob:')) return true;
    if (url.startsWith('data:')) {
      if (url.startsWith('data:image/svg+xml')) return false;
      return SAFE_DATA_IMG_PREFIXES.some(p => url.startsWith(p));
    }
    const parsed = new URL(url);
    if (parsed.protocol === 'javascript:' || parsed.protocol === 'data:') return false;
    return SAFE_IMG_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string, fallback: string = ''): string {
  return isSafeImageUrl(url) ? url : fallback;
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, ch => HTML_ENTITIES[ch] || ch);
}

export function safeMimeTypeForExt(ext: string): string {
  const DANGEROUS_EXTS = new Set(['svg', 'html', 'htm', 'xhtml', 'xml']);
  if (DANGEROUS_EXTS.has(ext)) {
    return 'application/octet-stream';
  }
  return '';
}
