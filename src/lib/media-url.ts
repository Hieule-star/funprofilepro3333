/**
 * Media CDN URL utilities
 * Transforms R2 URLs to CDN URLs for better performance and caching
 */

// CDN domain for media files
export const MEDIA_CDN_URL = 'https://media.richkid.cloud';

// Pattern to match R2 public URLs
const R2_URL_PATTERN = /^https:\/\/pub-[a-z0-9]+\.r2\.dev\//;

/**
 * Transform an R2 URL to use the CDN domain
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
  ipfs_gateway_url?: string | null;
  pin_status?: string;
}): string {
  // Use IPFS URL if pinned
  if (asset.ipfs_gateway_url && asset.pin_status === 'pinned') {
    return asset.ipfs_gateway_url;
  }
  
  // Otherwise use CDN-transformed R2 URL
  return transformToMediaCdn(asset.r2_url);
}
