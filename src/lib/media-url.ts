/**
 * Media CDN URL utilities
 * Simple flow: Browser → Worker CDN (media.camly.co) → R2
 */

// CDN domain for media files
export const MEDIA_CDN_URL = 'https://media.camly.co';

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
