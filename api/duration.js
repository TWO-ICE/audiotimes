/**
 * Audio Duration Detection API for Vercel Edge Functions
 * 基于Cloudflare Workers代码适配到Vercel平台
 */

// 支持的音频格式
const SUPPORTED_FORMATS = [
  'audio/mpeg', 'audio/mp3',
  'audio/wav', 'audio/wave',
  'audio/ogg', 'audio/vorbis',
  'audio/aac', 'audio/mp4',
  'audio/flac', 'audio/x-flac',
  'audio/webm', 'audio/x-m4a'
];

// CORS 头部配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Token',
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

  // 只处理POST请求
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method Not Allowed',
      message: 'Only POST method is allowed for this endpoint'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    // 验证token
    const authResult = await validateToken(request);
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
    const precisionMode = formData.get('precision') || 'simple';

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
 * 获取音频时长（移植自Cloudflare Workers版本）
 */
async function getAudioDuration(file) {
  try {
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
  const view = new DataView(arrayBuffer);
  
  // 检查OGG文件头
  const oggSignature = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  if (oggSignature !== 'OggS') {
    throw new Error('Invalid OGG file format');
  }
  
  // 简单估算（基于文件大小和平均比特率）
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
 * 格式化时长
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
 * 验证请求token
 * @param {Request} request - 请求对象
 * @returns {Object} 验证结果
 */
async function validateToken(request) {
  // 从环境变量获取配置的token
  const validToken = process.env.API_TOKEN;
  
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