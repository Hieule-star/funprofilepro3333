/**
 * Agora Token Worker for FUN Profile Livestreaming
 * 
 * Endpoints:
 * - POST /agora/rtc-token - Generate RTC token for livestream
 * 
 * Required secrets:
 * - AGORA_APP_ID
 * - AGORA_APP_CERTIFICATE
 */

import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

interface Env {
  AGORA_APP_ID: string;
  AGORA_APP_CERTIFICATE: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  CORS_ORIGIN: string;
}

interface TokenRequest {
  channel: string;
  role: 'host' | 'audience';
}

interface SupabaseUser {
  id: string;
  email?: string;
}

function getCorsHeaders(origin: string, corsOrigin: string): HeadersInit {
  const allowedOrigins = corsOrigin.split(',').map(o => o.trim());
  const isAllowed = corsOrigin === '*' || allowedOrigins.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info, apikey',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

async function validateSupabaseToken(
  authHeader: string,
  env: Env
): Promise<SupabaseUser | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: env.SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      console.error('[agora-token-worker] Supabase validation failed:', response.status);
      return null;
    }

    const user = await response.json() as SupabaseUser;
    return user;
  } catch (error) {
    console.error('[agora-token-worker] Token validation error:', error);
    return null;
  }
}

function generateUid(userId: string): number {
  // Generate a numeric UID from user ID (hash to 32-bit integer)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % 100000000; // Keep it within reasonable range
}

async function handleTokenRequest(
  request: Request,
  env: Env,
  corsHeaders: HeadersInit
): Promise<Response> {
  // Validate authorization
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(
      { success: false, error: 'Missing or invalid Authorization header' },
      401,
      corsHeaders
    );
  }

  // Validate user with Supabase
  const user = await validateSupabaseToken(authHeader, env);
  if (!user) {
    return jsonResponse(
      { success: false, error: 'Invalid or expired token' },
      401,
      corsHeaders
    );
  }

  // Parse request body
  let body: TokenRequest;
  try {
    body = await request.json() as TokenRequest;
  } catch {
    return jsonResponse(
      { success: false, error: 'Invalid JSON body' },
      400,
      corsHeaders
    );
  }

  // Validate request
  if (!body.channel || typeof body.channel !== 'string') {
    return jsonResponse(
      { success: false, error: 'Missing or invalid channel name' },
      400,
      corsHeaders
    );
  }

  if (!['host', 'audience'].includes(body.role)) {
    return jsonResponse(
      { success: false, error: 'Role must be "host" or "audience"' },
      400,
      corsHeaders
    );
  }

  // Check for Agora credentials
  if (!env.AGORA_APP_ID || !env.AGORA_APP_CERTIFICATE) {
    console.error('[agora-token-worker] Missing Agora credentials');
    return jsonResponse(
      { success: false, error: 'Server configuration error' },
      500,
      corsHeaders
    );
  }

  // Generate token
  const uid = generateUid(user.id);
  const role = body.role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const expirationTimeInSeconds = 3600; // 1 hour
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      env.AGORA_APP_ID,
      env.AGORA_APP_CERTIFICATE,
      body.channel,
      uid,
      role,
      privilegeExpiredTs
    );

    console.log('[agora-token-worker] Token generated for user:', user.id, 'channel:', body.channel, 'role:', body.role);

    return jsonResponse(
      {
        success: true,
        data: {
          appId: env.AGORA_APP_ID,
          token,
          channel: body.channel,
          uid,
          expiresAt: privilegeExpiredTs,
        },
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error('[agora-token-worker] Token generation error:', error);
    return jsonResponse(
      { success: false, error: 'Failed to generate token' },
      500,
      corsHeaders
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '*';
    const corsHeaders = getCorsHeaders(origin, env.CORS_ORIGIN);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Route: POST /agora/rtc-token
    if (url.pathname === '/agora/rtc-token' && request.method === 'POST') {
      return handleTokenRequest(request, env, corsHeaders);
    }

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok', service: 'agora-token-worker' }, 200, corsHeaders);
    }

    // 404 for unknown routes
    return jsonResponse({ success: false, error: 'Not found' }, 404, corsHeaders);
  },
};
