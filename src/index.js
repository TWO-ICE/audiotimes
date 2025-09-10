/**
 * Audio Duration Detection API for Cloudflare Workers
 * 基于HTML工具的音频解析逻辑移植到服务端
 */

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
  'Access-Control-Max-Age': '86400',
};

// 支持的音频格式
const SUPPORTED_FORMATS = [
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/wave',
  'audio/ogg', 'audio/vorbis',
  'audio/aac', 'audio/mp4',
  'audio/flac', 'audio/x-flac',
  'audio/webm', 'audio/x-m4a'
];

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // API 路由 - 需要token验证
      if (path === '/api/duration' && request.method === 'POST') {
        // 验证token
        const authResult = await validateToken(request, env);
        if (!authResult.valid) {
          return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: authResult.message
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        return await handleAudioDuration(request);
      }
      
      // 新增：通过URL获取音频时长的API端点
      if (path === '/api/duration-url' && (request.method === 'POST' || request.method === 'GET')) {
        // 验证token
        const authResult = await validateToken(request, env);
        if (!authResult.valid) {
          return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: authResult.message
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }
        
        return await handleAudioDurationFromUrl(request);
      }
      
      // 根路径返回API文档
      if (path === '/' && request.method === 'GET') {
        return new Response(getApiDocumentation(), {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            ...corsHeaders
          }
        });
      }

      // 健康检查端点
      if (path === '/health' && request.method === 'GET') {
        return new Response(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'audio-duration-api'
        }), {
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }

      // 404 处理
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'API endpoint not found',
        availableEndpoints: [
          'POST /api/duration - 上传音频文件获取时长',
        'POST/GET /api/duration-url - 通过URL获取远程音频时长',
        'GET /health - 健康检查',
        'GET / - API文档'
        ]
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });

    } catch (error) {
      console.error('API Error:', error);
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
};

/**
 * 处理通过URL获取音频时长的请求
 */
async function handleAudioDurationFromUrl(request) {
  try {
    let audioUrl;
    let precisionMode = 'simple';
    
    // 根据请求方法获取参数
    if (request.method === 'GET') {
      const url = new URL(request.url);
      audioUrl = url.searchParams.get('url');
      precisionMode = url.searchParams.get('precision') || 'simple';
    } else if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        const body = await request.json();
        audioUrl = body.url;
        precisionMode = body.precision || 'simple';
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        audioUrl = formData.get('url');
        precisionMode = formData.get('precision') || 'simple';
      } else {
        return new Response(JSON.stringify({
          error: 'Bad Request',
          message: 'Content-Type must be application/json or multipart/form-data for POST requests'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }
    
    // 验证URL参数
    if (!audioUrl) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Missing required parameter: url'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 验证URL格式
    const urlValidation = validateAudioUrl(audioUrl);
    if (!urlValidation.valid) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: urlValidation.message
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 下载远程音频文件
    const downloadResult = await downloadAudioFile(audioUrl);
    if (!downloadResult.success) {
      return new Response(JSON.stringify({
        error: 'Download Error',
        message: downloadResult.message
      }), {
        status: downloadResult.status || 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 创建虚拟文件对象
    const audioFile = {
      name: getFilenameFromUrl(audioUrl),
      type: downloadResult.contentType,
      size: downloadResult.arrayBuffer.byteLength,
      arrayBuffer: () => Promise.resolve(downloadResult.arrayBuffer)
    };
    
    // 验证文件类型
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return new Response(JSON.stringify({
        error: 'Unsupported Format',
        message: `Unsupported audio format: ${audioFile.type}`,
        supportedFormats: SUPPORTED_FORMATS
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 检查文件大小（限制为50MB）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File Too Large',
        message: `File size exceeds limit. Maximum allowed: ${formatFileSize(maxSize)}`,
        fileSize: formatFileSize(audioFile.size)
      }), {
        status: 413,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // 获取音频时长
    const duration = await getAudioDurationFromBuffer(downloadResult.arrayBuffer, audioFile.type);
    
    // 转换为微秒格式 (1秒 = 1000000微秒)
    const durationMicroseconds = Math.round(duration * 1000000);
    
    // 格式化时长
    const formattedDuration = formatDuration(duration, precisionMode);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        url: audioUrl,
        filename: audioFile.name,
        fileSize: formatFileSize(audioFile.size),
        mimeType: audioFile.type,
        duration: durationMicroseconds, // 微秒格式的时长
        formatted: formattedDuration, // 格式化后的时长字符串
        precision: precisionMode,
        timelines: [
          {
            start: 0,
            end: durationMicroseconds
          }
        ],
        all_timelines: [
          {
            start: 0,
            end: durationMicroseconds
          }
        ],
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('URL audio processing error:', error);
    return new Response(JSON.stringify({
      error: 'Processing Error',
      message: error.message || 'Failed to process remote audio file'
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
 * 处理音频时长检测请求
 */
async function handleAudioDuration(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Content-Type must be multipart/form-data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const precisionMode = formData.get('precision') || 'simple'; // simple 或 precise

    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'No audio file provided. Please upload a file with field name "audio"'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 验证文件类型
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return new Response(JSON.stringify({
        error: 'Unsupported Format',
        message: `Unsupported audio format: ${audioFile.type}`,
        supportedFormats: SUPPORTED_FORMATS
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 检查文件大小（限制为50MB）
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > maxSize) {
      return new Response(JSON.stringify({
        error: 'File Too Large',
        message: `File size exceeds limit. Maximum allowed: ${formatFileSize(maxSize)}`,
        fileSize: formatFileSize(audioFile.size)
      }), {
        status: 413,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // 获取音频时长
    const duration = await getAudioDuration(audioFile);
    
    // 转换为微秒格式 (1秒 = 1000000微秒)
    const durationMicroseconds = Math.round(duration * 1000000);
    
    // 格式化时长
    const formattedDuration = formatDuration(duration, precisionMode);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        filename: audioFile.name,
        fileSize: formatFileSize(audioFile.size),
        mimeType: audioFile.type,
        duration: durationMicroseconds, // 微秒格式的时长
        formatted: formattedDuration, // 格式化后的时长字符串
        precision: precisionMode,
        timelines: [
          {
            start: 0,
            end: durationMicroseconds
          }
        ],
        all_timelines: [
          {
            start: 0,
            end: durationMicroseconds
          }
        ],
        timestamp: new Date().toISOString()
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Audio processing error:', error);
    return new Response(JSON.stringify({
      error: 'Processing Error',
      message: error.message || 'Failed to process audio file'
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
 * 验证音频URL
 */
function validateAudioUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // 检查协议
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        message: 'Only HTTP and HTTPS protocols are supported'
      };
    }
    
    // 检查文件扩展名
    const pathname = urlObj.pathname.toLowerCase();
    const supportedExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.webm'];
    const hasValidExtension = supportedExtensions.some(ext => pathname.endsWith(ext));
    
    if (!hasValidExtension) {
      return {
        valid: false,
        message: `URL must point to a supported audio file. Supported extensions: ${supportedExtensions.join(', ')}`
      };
    }
    
    return {
      valid: true,
      message: 'URL is valid'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Invalid URL format'
    };
  }
}

/**
 * 下载远程音频文件
 */
async function downloadAudioFile(url) {
  try {
    // 设置请求超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Audio-Duration-API/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        success: false,
        message: `Failed to download file: HTTP ${response.status} ${response.statusText}`,
        status: response.status
      };
    }
    
    // 检查Content-Type
    const contentType = response.headers.get('content-type') || '';
    const isAudioType = SUPPORTED_FORMATS.some(format => contentType.includes(format.split('/')[1]));
    
    if (!isAudioType) {
      // 尝试根据URL扩展名推断MIME类型
      const inferredType = inferMimeTypeFromUrl(url);
      if (!inferredType) {
        return {
          success: false,
          message: `Invalid content type: ${contentType}. Expected audio file.`,
          status: 400
        };
      }
    }
    
    // 检查Content-Length
    const contentLength = response.headers.get('content-length');
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return {
        success: false,
        message: `File too large: ${formatFileSize(parseInt(contentLength))}. Maximum allowed: ${formatFileSize(maxSize)}`,
        status: 413
      };
    }
    
    // 下载文件内容
    const arrayBuffer = await response.arrayBuffer();
    
    // 再次检查实际文件大小
    if (arrayBuffer.byteLength > maxSize) {
      return {
        success: false,
        message: `File too large: ${formatFileSize(arrayBuffer.byteLength)}. Maximum allowed: ${formatFileSize(maxSize)}`,
        status: 413
      };
    }
    
    return {
      success: true,
      arrayBuffer: arrayBuffer,
      contentType: contentType || inferMimeTypeFromUrl(url) || 'audio/mpeg'
    };
    
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Download timeout (30 seconds)',
        status: 408
      };
    }
    
    return {
      success: false,
      message: `Download failed: ${error.message}`,
      status: 500
    };
  }
}

/**
 * 从URL推断MIME类型
 */
function inferMimeTypeFromUrl(url) {
  const pathname = url.toLowerCase();
  
  if (pathname.endsWith('.mp3')) return 'audio/mpeg';
  if (pathname.endsWith('.wav')) return 'audio/wav';
  if (pathname.endsWith('.ogg')) return 'audio/ogg';
  if (pathname.endsWith('.aac')) return 'audio/aac';
  if (pathname.endsWith('.flac')) return 'audio/flac';
  if (pathname.endsWith('.m4a')) return 'audio/mp4';
  if (pathname.endsWith('.webm')) return 'audio/webm';
  
  return null;
}

/**
 * 从URL提取文件名
 */
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'audio';
    return filename;
  } catch (error) {
    return 'audio';
  }
}

/**
 * 获取音频时长（移植自HTML工具的逻辑）
 * 在Cloudflare Workers环境中，我们需要使用Web Audio API的替代方案
 */
async function getAudioDuration(file) {
  try {
    // 在Workers环境中，我们需要解析音频文件的元数据
    // 这里实现一个简化版本，主要支持常见格式
    const arrayBuffer = await file.arrayBuffer();
    
    // 尝试解析不同格式的音频文件
    if (file.type.includes('mp3') || file.type.includes('mpeg')) {
      return await parseMp3Duration(arrayBuffer);
    } else if (file.type.includes('wav')) {
      return await parseWavDuration(arrayBuffer);
    } else if (file.type.includes('ogg')) {
      return await parseOggDuration(arrayBuffer);
    } else {
      // 对于其他格式，尝试通用解析
      return await parseGenericAudioDuration(arrayBuffer, file.type);
    }
  } catch (error) {
    throw new Error(`Failed to parse audio duration: ${error.message}`);
  }
}

/**
 * 从ArrayBuffer获取音频时长（用于URL下载的文件）
 */
async function getAudioDurationFromBuffer(arrayBuffer, mimeType) {
  try {
    // 尝试解析不同格式的音频文件
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      return await parseMp3Duration(arrayBuffer);
    } else if (mimeType.includes('wav')) {
      return await parseWavDuration(arrayBuffer);
    } else if (mimeType.includes('ogg')) {
      return await parseOggDuration(arrayBuffer);
    } else {
      // 对于其他格式，尝试通用解析
      return await parseGenericAudioDuration(arrayBuffer, mimeType);
    }
  } catch (error) {
    throw new Error(`Failed to parse audio duration: ${error.message}`);
  }
}

/**
 * 解析MP3文件时长
 */
async function parseMp3Duration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // 查找第一个MP3帧头
  for (let i = 0; i < view.byteLength - 4; i++) {
    if (view.getUint8(i) === 0xFF && (view.getUint8(i + 1) & 0xE0) === 0xE0) {
      // 找到帧头，解析帧信息
      const header = view.getUint32(i, false);
      const frameInfo = parseMp3FrameHeader(header);
      
      if (frameInfo) {
        // 修复时长计算公式
        const bitrate = frameInfo.bitrate; // bps
        const fileSize = arrayBuffer.byteLength; // bytes
        
        // 正确的时长计算：文件大小(字节) / (比特率(bps) / 8) = 秒数
        const duration = fileSize / (bitrate / 8);
        return duration;
      }
    }
  }
  
  throw new Error('Invalid MP3 file format');
}

/**
 * 解析WAV文件时长
 */
async function parseWavDuration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // 检查WAV文件头
  const riff = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  const wave = String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4));
  
  if (riff !== 'RIFF' || wave !== 'WAVE') {
    throw new Error('Invalid WAV file format');
  }
  
  // 查找fmt chunk
  let offset = 12;
  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4));
    const chunkSize = view.getUint32(offset + 4, true);
    
    if (chunkId === 'fmt ') {
      const sampleRate = view.getUint32(offset + 12, true);
      const byteRate = view.getUint32(offset + 16, true);
      
      // 查找data chunk
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < view.byteLength - 8) {
        const dataChunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, dataOffset, 4));
        const dataChunkSize = view.getUint32(dataOffset + 4, true);
        
        if (dataChunkId === 'data') {
          // 计算时长：数据大小 / 字节率
          const duration = dataChunkSize / byteRate;
          return duration;
        }
        
        dataOffset += 8 + dataChunkSize;
      }
      break;
    }
    
    offset += 8 + chunkSize;
  }
  
  throw new Error('Invalid WAV file structure');
}

/**
 * 解析OGG文件时长（简化版）
 */
async function parseOggDuration(arrayBuffer) {
  // OGG格式比较复杂，这里提供一个简化的实现
  // 实际应用中可能需要更完整的OGG解析器
  const view = new DataView(arrayBuffer);
  
  // 检查OGG文件头
  const oggSignature = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  if (oggSignature !== 'OggS') {
    throw new Error('Invalid OGG file format');
  }
  
  // 简单估算（基于文件大小和平均比特率）
  // 这是一个粗略的估算，实际应用中需要解析OGG页面结构
  const estimatedBitrate = 128000; // 假设128kbps
  const fileSize = arrayBuffer.byteLength; // bytes
  
  // 修复时长计算：文件大小(字节) / (比特率(bps) / 8) = 秒数
  const duration = fileSize / (estimatedBitrate / 8);
  
  return duration;
}

/**
 * 通用音频时长解析（回退方案）
 */
async function parseGenericAudioDuration(arrayBuffer, mimeType) {
  // 对于不支持的格式，提供一个基于文件大小的粗略估算
  // 这不是准确的方法，但可以作为最后的回退方案
  
  let estimatedBitrate;
  
  // 根据文件类型估算比特率
  if (mimeType.includes('flac')) {
    estimatedBitrate = 1000000; // 1Mbps for FLAC
  } else if (mimeType.includes('aac') || mimeType.includes('m4a')) {
    estimatedBitrate = 128000; // 128kbps for AAC
  } else {
    estimatedBitrate = 192000; // 192kbps default
  }
  
  const fileSize = arrayBuffer.byteLength; // bytes
  
  // 修复时长计算：文件大小(字节) / (比特率(bps) / 8) = 秒数
  const duration = fileSize / (estimatedBitrate / 8);
  return duration;
}

/**
 * 解析MP3帧头信息
 */
function parseMp3FrameHeader(header) {
  // MP3帧头解析（简化版）
  const version = (header >> 19) & 3;
  const layer = (header >> 17) & 3;
  const bitrateIndex = (header >> 12) & 15;
  const sampleRateIndex = (header >> 10) & 3;
  
  // 比特率表（MPEG-1 Layer III）
  const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const sampleRates = [44100, 48000, 32000, 0];
  
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
    return null; // 无效帧
  }
  
  const bitrate = bitrates[bitrateIndex];
  const sampleRate = sampleRates[sampleRateIndex];
  
  return {
    bitrate: bitrate * 1000,
    sampleRate: sampleRate,
    frameSize: Math.floor((144 * bitrate * 1000) / sampleRate)
  };
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时长（移植自HTML工具）
 */
function formatDuration(seconds, precisionMode = 'simple') {
  if (precisionMode === 'precise') {
    return formatDurationPrecise(seconds);
  } else {
    return formatDurationSimple(seconds);
  }
}

/**
 * 简单格式化时长
 */
function formatDurationSimple(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 微秒精度格式化时长
 */
function formatDurationPrecise(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const wholeSecs = Math.floor(seconds % 60);
  const microseconds = Math.floor((seconds % 1) * 1000000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')}.${microseconds.toString().padStart(6, '0')}`;
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
    <title>Audio Duration API Documentation</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { background: #007bff; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .method.post { background: #28a745; }
        .method.get { background: #17a2b8; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🎵 Audio Duration API</h1>
    <p>基于HTML工具移植的音频时长检测API服务</p>
    
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
        <h3><span class="method get">GET</span> <span class="method post">POST</span> /api/duration-url</h3>
        <p>通过URL获取远程音频时长信息（微秒精度）</p>
        
        <h4>🔐 认证要求：</h4>
        <p>此接口需要API Token认证。请在请求头中提供以下任一方式：</p>
        <ul>
            <li><code>Authorization: Bearer your-token</code></li>
            <li><code>X-API-Token: your-token</code></li>
        </ul>
        
        <h4>请求参数：</h4>
        <ul>
            <li><code>url</code> (string, required): 音频文件URL</li>
            <li><code>precision</code> (string, optional): 精度模式，"simple" 或 "precise"，默认为 "simple"</li>
        </ul>
        
        <h4>请求方式：</h4>
        <ul>
            <li><strong>GET:</strong> 通过URL参数传递 <code>?url=https://example.com/audio.mp3</code></li>
            <li><strong>POST (JSON):</strong> <code>{"url": "https://example.com/audio.mp3"}</code></li>
            <li><strong>POST (Form):</strong> 表单数据格式</li>
        </ul>
        
        <h4>支持的音频格式：</h4>
        <p>MP3, WAV, OGG, AAC, FLAC, WebM, M4A</p>
        
        <h4>文件大小限制：</h4>
        <p>最大 50MB，下载超时 30秒</p>
        
        <h4>响应示例：</h4>
        <pre>{
  "success": true,
  "data": {
    "url": "https://example.com/audio.mp3",
    "filename": "audio.mp3",
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
    
    <pre># 上传文件获取时长（使用Bearer Token）
curl -X POST \
  -H "Authorization: Bearer your-api-token" \
  -F "audio=@example.mp3" \
  -F "precision=precise" \
  https://your-worker.your-subdomain.workers.dev/api/duration</pre>
  
    <pre># 上传文件获取时长（使用X-API-Token）
curl -X POST \
  -H "X-API-Token: your-api-token" \
  -F "audio=@example.mp3" \
  -F "precision=precise" \
  https://your-worker.your-subdomain.workers.dev/api/duration</pre>
  
    <pre># 通过URL获取音频时长（POST JSON）
curl -X POST \
  -H "Authorization: Bearer your-api-token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/sample.mp3", "precision": "precise"}' \
  https://your-worker.your-subdomain.workers.dev/api/duration-url</pre>
  
    <pre># 通过URL获取音频时长（GET）
curl -X GET \
  -H "Authorization: Bearer your-api-token" \
  "https://your-worker.your-subdomain.workers.dev/api/duration-url?url=https://example.com/sample.mp3&precision=precise"</pre>
  
    <h4>🔧 Token配置说明：</h4>
    <p>管理员可以通过以下方式配置API Token：</p>
    <ul>
        <li>在 <code>wrangler.toml</code> 文件中设置 <code>API_TOKEN</code> 变量</li>
        <li>使用 <code>wrangler secret put API_TOKEN</code> 命令安全地设置token（推荐）</li>
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
</body>
</html>`;
}

/**
 * 验证请求token
 * @param {Request} request - 请求对象
 * @param {Object} env - 环境变量
 * @returns {Object} 验证结果
 */
async function validateToken(request, env) {
  // 从环境变量获取配置的token
  const validToken = env.API_TOKEN;
  
  // 如果没有配置token，则跳过验证
  if (!validToken) {
    return {
      valid: false,
      message: 'API token not configured on server'
    };
  }
  
  // 从请求头获取token
  const authHeader = request.headers.get('Authorization');
  const apiTokenHeader = request.headers.get('X-API-Token');
  
  let providedToken = null;
  
  // 支持两种token传递方式
  if (authHeader) {
    // Bearer token格式
    if (authHeader.startsWith('Bearer ')) {
      providedToken = authHeader.substring(7);
    } else {
      providedToken = authHeader;
    }
  } else if (apiTokenHeader) {
    // 直接在X-API-Token头中传递
    providedToken = apiTokenHeader;
  }
  
  // 检查是否提供了token
  if (!providedToken) {
    return {
      valid: false,
      message: 'Missing API token. Please provide token in Authorization header (Bearer token) or X-API-Token header'
    };
  }
  
  // 验证token
  if (providedToken !== validToken) {
    return {
      valid: false,
      message: 'Invalid API token'
    };
  }
  
  return {
    valid: true,
    message: 'Token validated successfully'
  };
}