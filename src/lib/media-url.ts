/**
 * Media CDN URL utilities
 * CDN Worker: media-funprofile.ecosystem.org
 * R2 Bucket: (configured in Cloudflare)
 */

// CDN domain for media files
export const MEDIA_CDN_URL = 'https://media-funprofile.ecosystem.org';

/**
 * Build CDN URL from storage key
 * @param storageKey - The r2_key from database
 * @returns Full CDN URL
 */
export function buildCdnUrl(storageKey: string | null | undefined): string {
  if (!storageKey || storageKey.trim() === '') return '';
  const key = storageKey.startsWith('/') ? storageKey.slice(1) : storageKey;
  return `${MEDIA_CDN_URL}/${encodeURIComponent(key).replace(/%2F/g, '/')}`;
}

/**
 * Check if a mime type is MOV/QuickTime (may have browser compatibility issues)
 */
export function isMovFile(mimeType?: string | null, filename?: string | null): boolean {
  if (mimeType === 'video/quicktime') return true;
  if (filename?.toLowerCase().endsWith('.mov')) return true;
  return false;
}
