/**
 * Media CDN URL utilities
 * Transforms R2 URLs to CDN URLs for better performance and caching
 */

// CDN domain for media files (Worker proxy)
export const MEDIA_CDN_URL = 'https://media.richkid.cloud';

// R2 public bucket URL (origin fallback)
export const R2_PUBLIC_URL = 'https://pub-3b3220edd327468ea9f453204f9384ca.r2.dev';

// Pattern to match R2 public URLs
const R2_URL_PATTERN = /^https:\/\/pub-[a-z0-9]+\.r2\.dev\//;

// Cache for CDN health check results
const cdnHealthCache = new Map<string, { status: 'healthy' | 'unhealthy'; timestamp: number }>();
const HEALTH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Normalize a storage key (remove leading slash if present)
 */
function normalizeKey(key: string): string {
  return key.startsWith('/') ? key.slice(1) : key;
}

/**
 * Encode storage key for URL (preserve path slashes)
 */
function encodeStorageKey(key: string): string {
  return encodeURIComponent(key).replace(/%2F/g, '/');
}

/**
 * Build CDN URL from storage key
 * @param storageKey - The r2_key from database
 * @returns Full CDN URL
 */
export function buildCdnUrl(storageKey: string): string {
  if (!storageKey) return '';
  const key = normalizeKey(storageKey);
  return `${MEDIA_CDN_URL}/${encodeStorageKey(key)}`;
}

/**
 * Build Origin (R2 public) URL from storage key
 * @param storageKey - The r2_key from database
 * @returns Full R2 public URL
 */
export function buildOriginUrl(storageKey: string): string {
  if (!storageKey) return '';
  const key = normalizeKey(storageKey);
  return `${R2_PUBLIC_URL}/${encodeStorageKey(key)}`;
}

/**
 * Extract storage key from a CDN or R2 URL
 * @param url - CDN or R2 URL
 * @returns Storage key or null if not extractable
 */
export function extractStorageKey(url: string): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
}

/**
 * Check if CDN is healthy for a given storage key
 * Uses HEAD request with Range header to verify 200/206 response
 * @param storageKey - The r2_key from database
 * @returns true if CDN is healthy, false if should use origin
 */
export async function checkCdnHealth(storageKey: string): Promise<boolean> {
  if (!storageKey) return false;
  
  const key = normalizeKey(storageKey);
  
  // Check cache first
  const cached = cdnHealthCache.get(key);
  if (cached && Date.now() - cached.timestamp < HEALTH_CACHE_TTL) {
    return cached.status === 'healthy';
  }
  
  const cdnUrl = buildCdnUrl(key);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const response = await fetch(cdnUrl, {
      method: 'HEAD',
      headers: { 'Range': 'bytes=0-1' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const isHealthy = response.status === 200 || response.status === 206;
    
    // Cache the result
    cdnHealthCache.set(key, { 
      status: isHealthy ? 'healthy' : 'unhealthy', 
      timestamp: Date.now() 
    });
    
    if (!isHealthy) {
      console.warn('[CDN Health Check] Unhealthy response:', {
        url: cdnUrl,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        acceptRanges: response.headers.get('accept-ranges'),
      });
    }
    
    return isHealthy;
  } catch (error) {
    console.error('[CDN Health Check] Request failed:', {
      url: cdnUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    // Cache as unhealthy
    cdnHealthCache.set(key, { status: 'unhealthy', timestamp: Date.now() });
    return false;
  }
}

/**
 * Check if a mime type is MOV/QuickTime (may have browser compatibility issues)
 */
export function isMovFile(mimeType?: string | null, filename?: string | null): boolean {
  if (mimeType === 'video/quicktime') return true;
  if (filename?.toLowerCase().endsWith('.mov')) return true;
  return false;
}

/**
 * Transform an R2 URL to use the CDN domain
 * @deprecated Use buildCdnUrl with storageKey instead
 * @param url - Original URL (may be R2, CDN, IPFS, or other)
 * @returns Transformed URL using CDN domain if applicable
 */
export function transformToMediaCdn(url: string | null | undefined): string {
  if (!url) return '';
  
  // Already using CDN
  if (url.startsWith(MEDIA_CDN_URL)) {
    return url;
  }
  
  // Match R2 public URL pattern and replace with CDN
  if (R2_URL_PATTERN.test(url)) {
    // Extract the path after the R2 domain
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    return `${MEDIA_CDN_URL}${path}`;
  }
  
  // Return as-is for IPFS, local, or other URLs
  return url;
}

/**
 * Get the best URL for a media asset
 * Prioritizes IPFS gateway if available and pinned, otherwise uses CDN
 * @param asset - Media asset with r2_url and optional IPFS fields
 * @returns Best available URL for the media
 */
export function getMediaUrl(asset: {
  r2_url?: string | null;
  r2_key?: string | null;
  ipfs_gateway_url?: string | null;
  pin_status?: string;
}): string {
  // Use IPFS URL if pinned
  if (asset.ipfs_gateway_url && asset.pin_status === 'pinned') {
    return asset.ipfs_gateway_url;
  }
  
  // Prefer building URL from storage key
  if (asset.r2_key) {
    return buildCdnUrl(asset.r2_key);
  }
  
  // Fallback to transforming existing URL
  return transformToMediaCdn(asset.r2_url);
}

/**
 * Clear CDN health cache (useful for retrying after network recovery)
 */
export function clearCdnHealthCache(): void {
  cdnHealthCache.clear();
}
