/**
 * API Documentation Page for Vercel Edge Functions
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
    return new Response(getApiDocumentation(), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Documentation error:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * 获取API文档HTML
 */
function getApiDocumentation() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Duration API Documentation - Vercel</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { background: #007bff; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .method.post { background: #28a745; }
        .method.get { background: #17a2b8; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
        .platform-badge { background: #000; color: white; padding: 5px 10px; border-radius: 15px; font-size: 12px; margin-left: 10px; }
    </style>
</head>
<body>
    <h1>🎵 Audio Duration API <span class="platform-badge">Vercel</span></h1>
    <p>基于HTML工具移植的音频时长检测API服务 - 部署在Vercel平台</p>
    
    <div class="endpoint">
        <h3><span class="method post">POST</span> /api/duration</h3>
        <p>上传音频文件并获取时长信息（微秒精度）</p>
        
        <h4>🔐 认证要求：</h4>
        <p>此接口需要API Token认证。请在请求头中提供以下任一方式：</p>
        <ul>
            <li><code>Authorization: Bearer your-token</code></li>
            <li><code>X-API-Token: your-token</code></li>
        </ul>
        
        <h4>请求参数：</h4>
        <ul>
            <li><code>audio</code> (file, required): 音频文件</li>
            <li><code>precision</code> (string, optional): 精度模式，"simple" 或 "precise"，默认为 "simple"</li>
        </ul>
        
        <h4>支持的音频格式：</h4>
        <p>MP3, WAV, OGG, AAC, FLAC, WebM, M4A</p>
        
        <h4>返回数据说明：</h4>
        <ul>
            <li><code>duration</code>: 音频时长（微秒），1秒 = 1000000微秒</li>
            <li><code>formatted</code>: 格式化的时长字符串</li>
            <li><code>timelines</code>: 音频时间轴数组，包含start和end（微秒）</li>
            <li><code>all_timelines</code>: 总时长时间轴数组</li>
        </ul>
        
        <h4>响应示例：</h4>
        <pre>{
  "success": true,
  "data": {
    "filename": "example.mp3",
    "fileSize": "3.2 MB",
    "mimeType": "audio/mpeg",
    "duration": 185123456,
    "formatted": "3:05",
    "precision": "simple",
    "timelines": [
      {
        "start": 0,
        "end": 185123456
      }
    ],
    "all_timelines": [
      {
        "start": 0,
        "end": 185123456
      }
    ],
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}</pre>
    </div>
    
    <div class="endpoint">
        <h3><span class="method get">GET</span> /health</h3>
        <p>健康检查端点</p>
    </div>
    
    <h3>使用示例：</h3>
    <pre>// JavaScript fetch 示例（使用Bearer Token）
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('precision', 'precise');

fetch('/api/duration', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-api-token'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));</pre>
    
    <pre>// JavaScript fetch 示例（使用X-API-Token）
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('precision', 'precise');

fetch('/api/duration', {
  method: 'POST',
  headers: {
    'X-API-Token': 'your-api-token'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));</pre>
    
    <pre># cURL 示例（使用Bearer Token）
curl -X POST \
  -H "Authorization: Bearer your-api-token" \
  -F "audio=@example.mp3" \
  -F "precision=precise" \
  https://your-project.vercel.app/api/duration</pre>
  
    <pre># cURL 示例（使用X-API-Token）
curl -X POST \
  -H "X-API-Token: your-api-token" \
  -F "audio=@example.mp3" \
  -F "precision=precise" \
  https://your-project.vercel.app/api/duration</pre>
  
    <h4>🔧 Token配置说明（Vercel平台）：</h4>
    <p>管理员可以通过以下方式配置API Token：</p>
    <ul>
        <li>在Vercel Dashboard中设置环境变量 <code>API_TOKEN</code></li>
        <li>使用Vercel CLI: <code>vercel env add API_TOKEN</code></li>
        <li>在项目根目录创建 <code>.env.local</code> 文件（仅用于本地开发）</li>
    </ul>
    
    <h4>❌ 错误响应示例：</h4>
    <pre>// 401 Unauthorized - 缺少token
{
  "error": "Unauthorized",
  "message": "Missing API token. Please provide token in Authorization header (Bearer token) or X-API-Token header"
}

// 401 Unauthorized - token无效
{
  "error": "Unauthorized",
  "message": "Invalid API token"
}</pre>

    <h4>🚀 部署平台对比：</h4>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background: #f8f9fa;">
            <th style="border: 1px solid #ddd; padding: 8px;">特性</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Cloudflare Workers</th>
            <th style="border: 1px solid #ddd; padding: 8px;">Vercel Edge Functions</th>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">冷启动时间</td>
            <td style="border: 1px solid #ddd; padding: 8px;">~5ms</td>
            <td style="border: 1px solid #ddd; padding: 8px;">~10ms</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">全球边缘节点</td>
            <td style="border: 1px solid #ddd; padding: 8px;">200+</td>
            <td style="border: 1px solid #ddd; padding: 8px;">100+</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">免费额度</td>
            <td style="border: 1px solid #ddd; padding: 8px;">100,000 请求/天</td>
            <td style="border: 1px solid #ddd; padding: 8px;">100,000 请求/月</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">部署方式</td>
            <td style="border: 1px solid #ddd; padding: 8px;">wrangler deploy</td>
            <td style="border: 1px solid #ddd; padding: 8px;">vercel deploy</td>
        </tr>
    </table>
</body>
</html>`;
}