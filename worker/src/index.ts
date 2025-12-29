/**
 * Media Gateway Worker
 * 
 * Cloudflare Worker làm CDN gateway cho R2 bucket.
 * Sử dụng R2 Binding (không cần access key/secret).
 * 
 * Domain: media.camly.co
 */

export interface Env {
  MEDIA_BUCKET: R2Bucket;
}

// MIME type fallbacks
const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function getMimeType(key: string): string {
  const ext = key.toLowerCase().match(/\.[^.]+$/)?.[0];
  return ext ? MIME_TYPES[ext] || 'application/octet-stream' : 'application/octet-stream';
}

// Cache headers
const CACHE_HEADERS = {
  // Browser cache 1 ngày, Edge cache 30 ngày, immutable
  'Cache-Control': 'public, max-age=86400, s-maxage=2592000, immutable',
  // CORS - cho phép mọi domain
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, If-None-Match, If-Modified-Since',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CACHE_HEADERS,
      });
    }

    // Chỉ cho phép GET và HEAD
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { 
        status: 405,
        headers: CACHE_HEADERS,
      });
    }

    // Lấy key từ URL path (bỏ dấu / đầu)
    const key = decodeURIComponent(url.pathname.slice(1));

    // Nếu không có key, trả về 400
    if (!key) {
      return new Response('Bad Request: Missing object key', { 
        status: 400,
        headers: CACHE_HEADERS,
      });
    }

    try {
      // Parse Range header first (for video streaming)
      const rangeHeader = request.headers.get('Range');
      let rangeOptions: { offset: number; length?: number } | undefined;
      let requestedStart = 0;
      let requestedEnd: number | undefined;

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
        if (match) {
          requestedStart = match[1] ? parseInt(match[1]) : 0;
          requestedEnd = match[2] ? parseInt(match[2]) : undefined;
          
          rangeOptions = {
            offset: requestedStart,
            length: requestedEnd !== undefined ? requestedEnd - requestedStart + 1 : undefined,
          };
        }
      }

      // Lấy object từ R2 với range option (nếu có)
      const object = rangeOptions 
        ? await env.MEDIA_BUCKET.get(key, { range: rangeOptions })
        : await env.MEDIA_BUCKET.get(key);

      if (!object) {
        return new Response('Not Found', { 
          status: 404,
          headers: CACHE_HEADERS,
        });
      }

      // Tạo headers
      const headers = new Headers();
      
      // Set cache headers
      Object.entries(CACHE_HEADERS).forEach(([k, v]) => {
        headers.set(k, v);
      });
      
      // ETag nếu có
      if (object.httpEtag) {
        headers.set('ETag', object.httpEtag);
      }

      // Preserve http metadata (content-type, content-disposition, etc.)
      object.writeHttpMetadata(headers);

      // Fallback Content-Type nếu không có từ R2 metadata
      if (!headers.get('Content-Type')) {
        headers.set('Content-Type', getMimeType(key));
      }

      // Accept-Ranges cho video streaming
      headers.set('Accept-Ranges', 'bytes');

      // HEAD request chỉ trả headers với full size
      if (request.method === 'HEAD') {
        headers.set('Content-Length', object.size.toString());
        return new Response(null, { headers });
      }

      // Handle Range response
      if (rangeOptions && 'range' in object && object.range) {
        const range = object.range as { offset: number; length: number };
        const actualEnd = range.offset + range.length - 1;
        
        headers.set('Content-Range', `bytes ${range.offset}-${actualEnd}/${object.size}`);
        headers.set('Content-Length', range.length.toString());

        return new Response(object.body, {
          status: 206,
          headers,
        });
      }

      // Normal full response
      headers.set('Content-Length', object.size.toString());
      return new Response(object.body, { headers });
    } catch (error) {
      console.error('Error fetching from R2:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: CACHE_HEADERS,
      });
    }
  },
};
