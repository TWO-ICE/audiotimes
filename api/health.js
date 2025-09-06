/**
 * Health Check API for Vercel Edge Functions
 */

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(request) {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // 只处理GET请求
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only GET method is allowed for this endpoint'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'audio-duration-api',
      platform: 'vercel',
      version: '1.0.0'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'audio-duration-api',
      platform: 'vercel',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}