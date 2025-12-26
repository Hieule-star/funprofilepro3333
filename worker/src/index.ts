/**
 * Media Gateway Worker
 * 
 * Cloudflare Worker làm CDN gateway cho R2 bucket.
 * Sử dụng R2 Binding (không cần access key/secret).
 * 
 * Domain: media.richkid.cloud
 */

export interface Env {
  MEDIA_BUCKET: R2Bucket;
}

// Cache headers
const CACHE_HEADERS = {
  // Browser cache 1 ngày, Edge cache 30 ngày, immutable
  'Cache-Control': 'public, max-age=86400, s-maxage=2592000, immutable',
  // CORS - cho phép mọi domain
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
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

    // TODO: Image Resizing khi bật Cloudflare Image Resizing
    // Uncomment và sử dụng khi có Cloudflare Images subscription
    /*
    const width = url.searchParams.get('w');
    const height = url.searchParams.get('h');
    const format = url.searchParams.get('format');
    
    if ((width || height) && isImageKey(key)) {
      return fetch(request, {
        cf: {
          image: {
            width: width ? parseInt(width) : undefined,
            height: height ? parseInt(height) : undefined,
            format: (format as 'webp' | 'avif' | 'auto') || 'auto',
            fit: 'scale-down',
            quality: 85,
          },
        },
      });
    }
    */

    try {
      // Lấy object từ R2
      const object = await env.MEDIA_BUCKET.get(key);

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

      // Content-Length
      headers.set('Content-Length', object.size.toString());
      
      // Preserve http metadata (content-type, content-disposition, etc.)
      object.writeHttpMetadata(headers);

      // Accept-Ranges cho video streaming
      headers.set('Accept-Ranges', 'bytes');

      // HEAD request chỉ trả headers
      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }

      // Handle Range requests cho video streaming
      const range = request.headers.get('Range');
      if (range) {
        return handleRangeRequest(object, range, headers);
      }

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

/**
 * Handle HTTP Range requests cho video streaming
 */
async function handleRangeRequest(
  object: R2ObjectBody,
  range: string,
  baseHeaders: Headers
): Promise<Response> {
  const size = object.size;
  const match = range.match(/bytes=(\d*)-(\d*)/);
  
  if (!match) {
    return new Response('Invalid Range', { status: 416 });
  }

  let start = match[1] ? parseInt(match[1]) : 0;
  let end = match[2] ? parseInt(match[2]) : size - 1;

  // Validate range
  if (start >= size || end >= size || start > end) {
    baseHeaders.set('Content-Range', `bytes */${size}`);
    return new Response('Range Not Satisfiable', { 
      status: 416,
      headers: baseHeaders,
    });
  }

  const contentLength = end - start + 1;
  
  baseHeaders.set('Content-Range', `bytes ${start}-${end}/${size}`);
  baseHeaders.set('Content-Length', contentLength.toString());

  // Slice the body để lấy đúng range
  const slicedBody = object.body.slice(start, end + 1);

  return new Response(slicedBody as unknown as BodyInit, {
    status: 206,
    headers: baseHeaders,
  });
}

/**
 * Helper function để check xem key có phải là image không
 * Dùng cho Image Resizing feature
 */
function isImageKey(key: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
  const lowerKey = key.toLowerCase();
  return imageExtensions.some(ext => lowerKey.endsWith(ext));
}
