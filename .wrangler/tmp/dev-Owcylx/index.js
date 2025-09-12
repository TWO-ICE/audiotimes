var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-auNAlC/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-auNAlC/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Token",
  "Access-Control-Max-Age": "86400"
};
var SUPPORTED_FORMATS = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/vorbis",
  "audio/aac",
  "audio/mp4",
  "audio/flac",
  "audio/x-flac",
  "audio/webm",
  "audio/x-m4a"
];
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/duration" && request.method === "POST") {
        const authResult = await validateToken(request, env);
        if (!authResult.valid) {
          return new Response(JSON.stringify({
            error: "Unauthorized",
            message: authResult.message
          }), {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
        return await handleAudioDuration(request);
      }
      if (path === "/api/duration-url" && (request.method === "POST" || request.method === "GET")) {
        const authResult = await validateToken(request, env);
        if (!authResult.valid) {
          return new Response(JSON.stringify({
            error: "Unauthorized",
            message: authResult.message
          }), {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders
            }
          });
        }
        return await handleAudioDurationFromUrl(request);
      }
      if (path === "/" && request.method === "GET") {
        return new Response(getApiDocumentation(), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            ...corsHeaders
          }
        });
      }
      if (path === "/health" && request.method === "GET") {
        return new Response(JSON.stringify({
          status: "ok",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          service: "audio-duration-api"
        }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
      return new Response(JSON.stringify({
        error: "Not Found",
        message: "API endpoint not found",
        availableEndpoints: [
          "POST /api/duration - \u4E0A\u4F20\u97F3\u9891\u6587\u4EF6\u83B7\u53D6\u65F6\u957F",
          "POST/GET /api/duration-url - \u901A\u8FC7URL\u83B7\u53D6\u8FDC\u7A0B\u97F3\u9891\u65F6\u957F",
          "GET /health - \u5065\u5EB7\u68C0\u67E5",
          "GET / - API\u6587\u6863"
        ]
      }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(JSON.stringify({
        error: "Internal Server Error",
        message: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
  }
};
async function handleAudioDurationFromUrl(request) {
  try {
    let audioUrl;
    let precisionMode = "simple";
    if (request.method === "GET") {
      const url = new URL(request.url);
      audioUrl = url.searchParams.get("url");
      precisionMode = url.searchParams.get("precision") || "simple";
    } else if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        audioUrl = body.url;
        precisionMode = body.precision || "simple";
      } else if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        audioUrl = formData.get("url");
        precisionMode = formData.get("precision") || "simple";
      } else {
        return new Response(JSON.stringify({
          error: "Bad Request",
          message: "Content-Type must be application/json or multipart/form-data for POST requests"
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      }
    }
    if (!audioUrl) {
      return new Response(JSON.stringify({
        error: "Bad Request",
        message: "Missing required parameter: url"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const urlValidation = validateAudioUrl(audioUrl);
    if (!urlValidation.valid) {
      return new Response(JSON.stringify({
        error: "Bad Request",
        message: urlValidation.message
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const downloadResult = await downloadAudioFile(audioUrl);
    if (!downloadResult.success) {
      return new Response(JSON.stringify({
        error: "Download Error",
        message: downloadResult.message
      }), {
        status: downloadResult.status || 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const audioFile = {
      name: getFilenameFromUrl(audioUrl),
      type: downloadResult.contentType,
      size: downloadResult.arrayBuffer.byteLength,
      arrayBuffer: () => Promise.resolve(downloadResult.arrayBuffer)
    };
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return new Response(JSON.stringify({
        error: "Unsupported Format",
        message: `Unsupported audio format: ${audioFile.type}`,
        supportedFormats: SUPPORTED_FORMATS
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const maxSize = 50 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return new Response(JSON.stringify({
        error: "File Too Large",
        message: `File size exceeds limit. Maximum allowed: ${formatFileSize(maxSize)}`,
        fileSize: formatFileSize(audioFile.size)
      }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const duration = await getAudioDurationFromBuffer(downloadResult.arrayBuffer, audioFile.type);
    const durationMicroseconds = Math.round(duration * 1e6);
    const formattedDuration = formatDuration(duration, precisionMode);
    return new Response(JSON.stringify({
      success: true,
      data: {
        url: audioUrl,
        filename: audioFile.name,
        fileSize: formatFileSize(audioFile.size),
        mimeType: audioFile.type,
        duration: durationMicroseconds,
        // 微秒格式的时长
        formatted: formattedDuration,
        // 格式化后的时长字符串
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("URL audio processing error:", error);
    return new Response(JSON.stringify({
      error: "Processing Error",
      message: error.message || "Failed to process remote audio file"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}
__name(handleAudioDurationFromUrl, "handleAudioDurationFromUrl");
async function handleAudioDuration(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(JSON.stringify({
        error: "Bad Request",
        message: "Content-Type must be multipart/form-data"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const formData = await request.formData();
    const audioFile = formData.get("audio");
    const precisionMode = formData.get("precision") || "simple";
    if (!audioFile || !(audioFile instanceof File)) {
      return new Response(JSON.stringify({
        error: "Bad Request",
        message: 'No audio file provided. Please upload a file with field name "audio"'
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    if (!SUPPORTED_FORMATS.includes(audioFile.type)) {
      return new Response(JSON.stringify({
        error: "Unsupported Format",
        message: `Unsupported audio format: ${audioFile.type}`,
        supportedFormats: SUPPORTED_FORMATS
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const maxSize = 50 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return new Response(JSON.stringify({
        error: "File Too Large",
        message: `File size exceeds limit. Maximum allowed: ${formatFileSize(maxSize)}`,
        fileSize: formatFileSize(audioFile.size)
      }), {
        status: 413,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    const duration = await getAudioDuration(audioFile);
    const durationMicroseconds = Math.round(duration * 1e6);
    const formattedDuration = formatDuration(duration, precisionMode);
    return new Response(JSON.stringify({
      success: true,
      data: {
        filename: audioFile.name,
        fileSize: formatFileSize(audioFile.size),
        mimeType: audioFile.type,
        duration: durationMicroseconds,
        // 微秒格式的时长
        formatted: formattedDuration,
        // 格式化后的时长字符串
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    }), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Audio processing error:", error);
    return new Response(JSON.stringify({
      error: "Processing Error",
      message: error.message || "Failed to process audio file"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}
__name(handleAudioDuration, "handleAudioDuration");
function validateAudioUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return {
        valid: false,
        message: "Only HTTP and HTTPS protocols are supported"
      };
    }
    const pathname = urlObj.pathname.toLowerCase();
    const supportedExtensions = [".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a", ".webm"];
    const hasValidExtension = supportedExtensions.some((ext) => pathname.endsWith(ext));
    if (!hasValidExtension) {
      return {
        valid: false,
        message: `URL must point to a supported audio file. Supported extensions: ${supportedExtensions.join(", ")}`
      };
    }
    return {
      valid: true,
      message: "URL is valid"
    };
  } catch (error) {
    return {
      valid: false,
      message: "Invalid URL format"
    };
  }
}
__name(validateAudioUrl, "validateAudioUrl");
async function downloadAudioFile(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Audio-Duration-API/1.0"
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
    const contentType = response.headers.get("content-type") || "";
    const isAudioType = SUPPORTED_FORMATS.some((format) => contentType.includes(format.split("/")[1]));
    if (!isAudioType) {
      const inferredType = inferMimeTypeFromUrl(url);
      if (!inferredType) {
        return {
          success: false,
          message: `Invalid content type: ${contentType}. Expected audio file.`,
          status: 400
        };
      }
    }
    const contentLength = response.headers.get("content-length");
    const maxSize = 50 * 1024 * 1024;
    if (contentLength && parseInt(contentLength) > maxSize) {
      return {
        success: false,
        message: `File too large: ${formatFileSize(parseInt(contentLength))}. Maximum allowed: ${formatFileSize(maxSize)}`,
        status: 413
      };
    }
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > maxSize) {
      return {
        success: false,
        message: `File too large: ${formatFileSize(arrayBuffer.byteLength)}. Maximum allowed: ${formatFileSize(maxSize)}`,
        status: 413
      };
    }
    return {
      success: true,
      arrayBuffer,
      contentType: contentType || inferMimeTypeFromUrl(url) || "audio/mpeg"
    };
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        success: false,
        message: "Download timeout (30 seconds)",
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
__name(downloadAudioFile, "downloadAudioFile");
function inferMimeTypeFromUrl(url) {
  const pathname = url.toLowerCase();
  if (pathname.endsWith(".mp3"))
    return "audio/mpeg";
  if (pathname.endsWith(".wav"))
    return "audio/wav";
  if (pathname.endsWith(".ogg"))
    return "audio/ogg";
  if (pathname.endsWith(".aac"))
    return "audio/aac";
  if (pathname.endsWith(".flac"))
    return "audio/flac";
  if (pathname.endsWith(".m4a"))
    return "audio/mp4";
  if (pathname.endsWith(".webm"))
    return "audio/webm";
  return null;
}
__name(inferMimeTypeFromUrl, "inferMimeTypeFromUrl");
function getFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || "audio";
    return filename;
  } catch (error) {
    return "audio";
  }
}
__name(getFilenameFromUrl, "getFilenameFromUrl");
async function getAudioDuration(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    if (file.type.includes("mp3") || file.type.includes("mpeg")) {
      return await parseMp3Duration(arrayBuffer);
    } else if (file.type.includes("wav")) {
      return await parseWavDuration(arrayBuffer);
    } else if (file.type.includes("ogg")) {
      return await parseOggDuration(arrayBuffer);
    } else {
      return await parseGenericAudioDuration(arrayBuffer, file.type);
    }
  } catch (error) {
    throw new Error(`Failed to parse audio duration: ${error.message}`);
  }
}
__name(getAudioDuration, "getAudioDuration");
async function getAudioDurationFromBuffer(arrayBuffer, mimeType) {
  try {
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      return await parseMp3Duration(arrayBuffer);
    } else if (mimeType.includes("wav")) {
      return await parseWavDuration(arrayBuffer);
    } else if (mimeType.includes("ogg")) {
      return await parseOggDuration(arrayBuffer);
    } else {
      return await parseGenericAudioDuration(arrayBuffer, mimeType);
    }
  } catch (error) {
    throw new Error(`Failed to parse audio duration: ${error.message}`);
  }
}
__name(getAudioDurationFromBuffer, "getAudioDurationFromBuffer");
async function parseMp3Duration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let dataStart = 0;
  if (view.getUint8(0) === 73 && view.getUint8(1) === 68 && view.getUint8(2) === 51) {
    const tagSize = (view.getUint8(6) & 127) << 21 | (view.getUint8(7) & 127) << 14 | (view.getUint8(8) & 127) << 7 | view.getUint8(9) & 127;
    dataStart = 10 + tagSize;
  }
  let dataEnd = arrayBuffer.byteLength;
  if (arrayBuffer.byteLength >= 128) {
    const tagStart = arrayBuffer.byteLength - 128;
    const tagHeader = String.fromCharCode(...new Uint8Array(arrayBuffer, tagStart, 3));
    if (tagHeader === "TAG") {
      dataEnd = tagStart;
    }
  }
  for (let i = dataStart; i < Math.min(dataStart + 8192, view.byteLength - 4); i++) {
    if (view.getUint8(i) === 255 && (view.getUint8(i + 1) & 224) === 224) {
      const header = view.getUint32(i, false);
      const frameInfo = parseMp3FrameHeader(header);
      if (frameInfo && frameInfo.bitrate > 0 && frameInfo.sampleRate > 0) {
        const audioDataSize = dataEnd - dataStart;
        const duration = audioDataSize * 8 / frameInfo.bitrate;
        return duration;
      }
    }
  }
  throw new Error("Invalid MP3 file format");
}
__name(parseMp3Duration, "parseMp3Duration");
async function parseWavDuration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const riff = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  const wave = String.fromCharCode(...new Uint8Array(arrayBuffer, 8, 4));
  if (riff !== "RIFF" || wave !== "WAVE") {
    throw new Error("Invalid WAV file format");
  }
  let offset = 12;
  while (offset < view.byteLength - 8) {
    const chunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, offset, 4));
    const chunkSize = view.getUint32(offset + 4, true);
    if (chunkId === "fmt ") {
      const sampleRate = view.getUint32(offset + 12, true);
      const byteRate = view.getUint32(offset + 16, true);
      let dataOffset = offset + 8 + chunkSize;
      while (dataOffset < view.byteLength - 8) {
        const dataChunkId = String.fromCharCode(...new Uint8Array(arrayBuffer, dataOffset, 4));
        const dataChunkSize = view.getUint32(dataOffset + 4, true);
        if (dataChunkId === "data") {
          const duration = dataChunkSize / byteRate;
          return duration;
        }
        dataOffset += 8 + dataChunkSize;
      }
      break;
    }
    offset += 8 + chunkSize;
  }
  throw new Error("Invalid WAV file structure");
}
__name(parseWavDuration, "parseWavDuration");
async function parseOggDuration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const oggSignature = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  if (oggSignature !== "OggS") {
    throw new Error("Invalid OGG file format");
  }
  let lastGranulePosition = 0;
  let sampleRate = 48e3;
  for (let i = view.byteLength - 65536; i >= 0; i -= 1024) {
    const searchStart = Math.max(0, i);
    const searchEnd = Math.min(view.byteLength - 4, searchStart + 65536);
    for (let j = searchEnd - 4; j >= searchStart; j--) {
      if (view.getUint8(j) === 79 && view.getUint8(j + 1) === 103 && view.getUint8(j + 2) === 103 && view.getUint8(j + 3) === 83) {
        if (j + 26 < view.byteLength) {
          const granuleLow = view.getUint32(j + 6, true);
          const granuleHigh = view.getUint32(j + 10, true);
          const granulePosition = granuleLow + granuleHigh * 4294967296;
          if (granulePosition > lastGranulePosition) {
            lastGranulePosition = granulePosition;
          }
        }
      }
    }
    if (lastGranulePosition > 0)
      break;
  }
  for (let i = 0; i < Math.min(8192, view.byteLength - 30); i++) {
    if (view.getUint8(i) === 1 && String.fromCharCode(...new Uint8Array(arrayBuffer, i + 1, 6)) === "vorbis") {
      if (i + 15 < view.byteLength) {
        sampleRate = view.getUint32(i + 12, true);
        break;
      }
    }
  }
  if (lastGranulePosition > 0 && sampleRate > 0) {
    const duration = lastGranulePosition / sampleRate;
    return duration;
  }
  throw new Error("Could not determine OGG file duration");
}
__name(parseOggDuration, "parseOggDuration");
async function parseGenericAudioDuration(arrayBuffer, mimeType) {
  if (mimeType.includes("flac")) {
    return await parseFlacDuration(arrayBuffer);
  } else if (mimeType.includes("aac") || mimeType.includes("m4a") || mimeType.includes("mp4")) {
    return await parseM4aDuration(arrayBuffer);
  } else {
    const estimatedBitrate = 128e3;
    const fileSize = arrayBuffer.byteLength;
    const duration = fileSize * 8 / estimatedBitrate;
    return duration;
  }
}
__name(parseGenericAudioDuration, "parseGenericAudioDuration");
function parseMp3FrameHeader(header) {
  const version = header >> 19 & 3;
  const layer = header >> 17 & 3;
  const bitrateIndex = header >> 12 & 15;
  const sampleRateIndex = header >> 10 & 3;
  const padding = header >> 9 & 1;
  if (version === 1 || layer === 0)
    return null;
  const bitrateTables = {
    1: {
      // MPEG-1
      1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
      // Layer I
      2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
      // Layer II
      3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
      // Layer III
    },
    2: {
      // MPEG-2
      1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
      2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
      3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    }
  };
  const sampleRateTables = {
    1: [44100, 48e3, 32e3, 0],
    // MPEG-1
    2: [22050, 24e3, 16e3, 0],
    // MPEG-2
    3: [11025, 12e3, 8e3, 0]
    // MPEG-2.5
  };
  const mpegVersion = version === 3 ? 1 : version === 2 ? 2 : version;
  const layerNum = 4 - layer;
  if (!bitrateTables[mpegVersion] || !bitrateTables[mpegVersion][layerNum]) {
    return null;
  }
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
    return null;
  }
  const bitrate = bitrateTables[mpegVersion][layerNum][bitrateIndex];
  const sampleRate = sampleRateTables[mpegVersion][sampleRateIndex];
  if (!bitrate || !sampleRate)
    return null;
  let frameSize;
  let samplesPerFrame;
  if (layerNum === 1) {
    frameSize = Math.floor((12 * bitrate * 1e3 / sampleRate + padding) * 4);
    samplesPerFrame = 384;
  } else {
    frameSize = Math.floor(144 * bitrate * 1e3 / sampleRate + padding);
    samplesPerFrame = mpegVersion === 1 ? 1152 : 576;
  }
  return {
    bitrate: bitrate * 1e3,
    sampleRate,
    frameSize,
    samplesPerFrame,
    version: mpegVersion,
    layer: layerNum
  };
}
__name(parseMp3FrameHeader, "parseMp3FrameHeader");
async function parseFlacDuration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const flacSignature = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));
  if (flacSignature !== "fLaC") {
    throw new Error("Invalid FLAC file format");
  }
  let offset = 4;
  while (offset < view.byteLength - 4) {
    const blockHeader = view.getUint8(offset);
    const blockType = blockHeader & 127;
    const isLast = (blockHeader & 128) !== 0;
    const blockSize = view.getUint8(offset + 1) << 16 | view.getUint8(offset + 2) << 8 | view.getUint8(offset + 3);
    if (blockType === 0) {
      if (offset + 4 + 18 <= view.byteLength) {
        const sampleRateHigh = view.getUint16(offset + 14, false);
        const sampleRateLow = view.getUint8(offset + 16);
        const sampleRate = sampleRateHigh << 4 | sampleRateLow >> 4;
        const totalSamplesHigh = (sampleRateLow & 15) << 32;
        const totalSamplesLow = view.getUint32(offset + 17, false);
        const totalSamples = totalSamplesHigh + totalSamplesLow;
        if (sampleRate > 0 && totalSamples > 0) {
          const duration = totalSamples / sampleRate;
          return duration;
        }
      }
      break;
    }
    offset += 4 + blockSize;
    if (isLast)
      break;
  }
  throw new Error("Could not find FLAC STREAMINFO block");
}
__name(parseFlacDuration, "parseFlacDuration");
async function parseM4aDuration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let duration = 0;
  let timeScale = 1;
  function findAtom(offset, targetAtom, maxDepth = 10) {
    if (maxDepth <= 0 || offset >= view.byteLength - 8)
      return null;
    while (offset < view.byteLength - 8) {
      const atomSize = view.getUint32(offset, false);
      const atomType = String.fromCharCode(...new Uint8Array(arrayBuffer, offset + 4, 4));
      if (atomSize < 8)
        break;
      if (atomType === targetAtom) {
        return { offset: offset + 8, size: atomSize - 8 };
      }
      if (["moov", "trak", "mdia"].includes(atomType)) {
        const result = findAtom(offset + 8, targetAtom, maxDepth - 1);
        if (result)
          return result;
      }
      offset += atomSize;
    }
    return null;
  }
  __name(findAtom, "findAtom");
  const mvhdAtom = findAtom(0, "mvhd");
  if (mvhdAtom && mvhdAtom.size >= 24) {
    const mvhdOffset = mvhdAtom.offset;
    const version = view.getUint8(mvhdOffset);
    if (version === 0) {
      timeScale = view.getUint32(mvhdOffset + 12, false);
      duration = view.getUint32(mvhdOffset + 16, false);
    } else if (version === 1) {
      timeScale = view.getUint32(mvhdOffset + 20, false);
      duration = view.getUint32(mvhdOffset + 28, false);
    }
  }
  if (duration > 0 && timeScale > 0) {
    return duration / timeScale;
  }
  throw new Error("Could not determine M4A/AAC file duration");
}
__name(parseM4aDuration, "parseM4aDuration");
function formatFileSize(bytes) {
  if (bytes === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
__name(formatFileSize, "formatFileSize");
function formatDuration(seconds, precisionMode = "simple") {
  if (precisionMode === "precise") {
    return formatDurationPrecise(seconds);
  } else {
    return formatDurationSimple(seconds);
  }
}
__name(formatDuration, "formatDuration");
function formatDurationSimple(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}
__name(formatDurationSimple, "formatDurationSimple");
function formatDurationPrecise(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const wholeSecs = Math.floor(seconds % 60);
  const microseconds = Math.floor(seconds % 1 * 1e6);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${wholeSecs.toString().padStart(2, "0")}.${microseconds.toString().padStart(6, "0")}`;
}
__name(formatDurationPrecise, "formatDurationPrecise");
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
    <h1>\u{1F3B5} Audio Duration API</h1>
    <p>\u57FA\u4E8EHTML\u5DE5\u5177\u79FB\u690D\u7684\u97F3\u9891\u65F6\u957F\u68C0\u6D4BAPI\u670D\u52A1</p>
    
    <div class="endpoint">
        <h3><span class="method post">POST</span> /api/duration</h3>
        <p>\u4E0A\u4F20\u97F3\u9891\u6587\u4EF6\u5E76\u83B7\u53D6\u65F6\u957F\u4FE1\u606F\uFF08\u5FAE\u79D2\u7CBE\u5EA6\uFF09</p>
        
        <h4>\u{1F510} \u8BA4\u8BC1\u8981\u6C42\uFF1A</h4>
        <p>\u6B64\u63A5\u53E3\u9700\u8981API Token\u8BA4\u8BC1\u3002\u8BF7\u5728\u8BF7\u6C42\u5934\u4E2D\u63D0\u4F9B\u4EE5\u4E0B\u4EFB\u4E00\u65B9\u5F0F\uFF1A</p>
        <ul>
            <li><code>Authorization: Bearer your-token</code></li>
            <li><code>X-API-Token: your-token</code></li>
        </ul>
        
        <h4>\u8BF7\u6C42\u53C2\u6570\uFF1A</h4>
        <ul>
            <li><code>audio</code> (file, required): \u97F3\u9891\u6587\u4EF6</li>
            <li><code>precision</code> (string, optional): \u7CBE\u5EA6\u6A21\u5F0F\uFF0C"simple" \u6216 "precise"\uFF0C\u9ED8\u8BA4\u4E3A "simple"</li>
        </ul>
        
        <h4>\u652F\u6301\u7684\u97F3\u9891\u683C\u5F0F\uFF1A</h4>
        <p>MP3, WAV, OGG, AAC, FLAC, WebM, M4A</p>
        
        <h4>\u8FD4\u56DE\u6570\u636E\u8BF4\u660E\uFF1A</h4>
        <ul>
            <li><code>duration</code>: \u97F3\u9891\u65F6\u957F\uFF08\u5FAE\u79D2\uFF09\uFF0C1\u79D2 = 1000000\u5FAE\u79D2</li>
            <li><code>formatted</code>: \u683C\u5F0F\u5316\u7684\u65F6\u957F\u5B57\u7B26\u4E32</li>
            <li><code>timelines</code>: \u97F3\u9891\u65F6\u95F4\u8F74\u6570\u7EC4\uFF0C\u5305\u542Bstart\u548Cend\uFF08\u5FAE\u79D2\uFF09</li>
            <li><code>all_timelines</code>: \u603B\u65F6\u957F\u65F6\u95F4\u8F74\u6570\u7EC4</li>
        </ul>
        
        <h4>\u54CD\u5E94\u793A\u4F8B\uFF1A</h4>
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
        <p>\u901A\u8FC7URL\u83B7\u53D6\u8FDC\u7A0B\u97F3\u9891\u65F6\u957F\u4FE1\u606F\uFF08\u5FAE\u79D2\u7CBE\u5EA6\uFF09</p>
        
        <h4>\u{1F510} \u8BA4\u8BC1\u8981\u6C42\uFF1A</h4>
        <p>\u6B64\u63A5\u53E3\u9700\u8981API Token\u8BA4\u8BC1\u3002\u8BF7\u5728\u8BF7\u6C42\u5934\u4E2D\u63D0\u4F9B\u4EE5\u4E0B\u4EFB\u4E00\u65B9\u5F0F\uFF1A</p>
        <ul>
            <li><code>Authorization: Bearer your-token</code></li>
            <li><code>X-API-Token: your-token</code></li>
        </ul>
        
        <h4>\u8BF7\u6C42\u53C2\u6570\uFF1A</h4>
        <ul>
            <li><code>url</code> (string, required): \u97F3\u9891\u6587\u4EF6URL</li>
            <li><code>precision</code> (string, optional): \u7CBE\u5EA6\u6A21\u5F0F\uFF0C"simple" \u6216 "precise"\uFF0C\u9ED8\u8BA4\u4E3A "simple"</li>
        </ul>
        
        <h4>\u8BF7\u6C42\u65B9\u5F0F\uFF1A</h4>
        <ul>
            <li><strong>GET:</strong> \u901A\u8FC7URL\u53C2\u6570\u4F20\u9012 <code>?url=https://example.com/audio.mp3</code></li>
            <li><strong>POST (JSON):</strong> <code>{"url": "https://example.com/audio.mp3"}</code></li>
            <li><strong>POST (Form):</strong> \u8868\u5355\u6570\u636E\u683C\u5F0F</li>
        </ul>
        
        <h4>\u652F\u6301\u7684\u97F3\u9891\u683C\u5F0F\uFF1A</h4>
        <p>MP3, WAV, OGG, AAC, FLAC, WebM, M4A</p>
        
        <h4>\u6587\u4EF6\u5927\u5C0F\u9650\u5236\uFF1A</h4>
        <p>\u6700\u5927 50MB\uFF0C\u4E0B\u8F7D\u8D85\u65F6 30\u79D2</p>
        
        <h4>\u54CD\u5E94\u793A\u4F8B\uFF1A</h4>
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
        <p>\u5065\u5EB7\u68C0\u67E5\u7AEF\u70B9</p>
    </div>
    
    <h3>\u4F7F\u7528\u793A\u4F8B\uFF1A</h3>
    <pre>// JavaScript fetch \u793A\u4F8B\uFF08\u4F7F\u7528Bearer Token\uFF09
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
    
    <pre>// JavaScript fetch \u793A\u4F8B\uFF08\u4F7F\u7528X-API-Token\uFF09
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
    
    <pre># \u4E0A\u4F20\u6587\u4EF6\u83B7\u53D6\u65F6\u957F\uFF08\u4F7F\u7528Bearer Token\uFF09
curl -X POST   -H "Authorization: Bearer your-api-token"   -F "audio=@example.mp3"   -F "precision=precise"   https://your-worker.your-subdomain.workers.dev/api/duration</pre>
  
    <pre># \u4E0A\u4F20\u6587\u4EF6\u83B7\u53D6\u65F6\u957F\uFF08\u4F7F\u7528X-API-Token\uFF09
curl -X POST   -H "X-API-Token: your-api-token"   -F "audio=@example.mp3"   -F "precision=precise"   https://your-worker.your-subdomain.workers.dev/api/duration</pre>
  
    <pre># \u901A\u8FC7URL\u83B7\u53D6\u97F3\u9891\u65F6\u957F\uFF08POST JSON\uFF09
curl -X POST   -H "Authorization: Bearer your-api-token"   -H "Content-Type: application/json"   -d '{"url": "https://example.com/sample.mp3", "precision": "precise"}'   https://your-worker.your-subdomain.workers.dev/api/duration-url</pre>
  
    <pre># \u901A\u8FC7URL\u83B7\u53D6\u97F3\u9891\u65F6\u957F\uFF08GET\uFF09
curl -X GET   -H "Authorization: Bearer your-api-token"   "https://your-worker.your-subdomain.workers.dev/api/duration-url?url=https://example.com/sample.mp3&precision=precise"</pre>
  
    <h4>\u{1F527} Token\u914D\u7F6E\u8BF4\u660E\uFF1A</h4>
    <p>\u7BA1\u7406\u5458\u53EF\u4EE5\u901A\u8FC7\u4EE5\u4E0B\u65B9\u5F0F\u914D\u7F6EAPI Token\uFF1A</p>
    <ul>
        <li>\u5728 <code>wrangler.toml</code> \u6587\u4EF6\u4E2D\u8BBE\u7F6E <code>API_TOKEN</code> \u53D8\u91CF</li>
        <li>\u4F7F\u7528 <code>wrangler secret put API_TOKEN</code> \u547D\u4EE4\u5B89\u5168\u5730\u8BBE\u7F6Etoken\uFF08\u63A8\u8350\uFF09</li>
    </ul>
    
    <h4>\u274C \u9519\u8BEF\u54CD\u5E94\u793A\u4F8B\uFF1A</h4>
    <pre>// 401 Unauthorized - \u7F3A\u5C11token
{
  "error": "Unauthorized",
  "message": "Missing API token. Please provide token in Authorization header (Bearer token) or X-API-Token header"
}

// 401 Unauthorized - token\u65E0\u6548
{
  "error": "Unauthorized",
  "message": "Invalid API token"
}</pre>
</body>
</html>`;
}
__name(getApiDocumentation, "getApiDocumentation");
async function validateToken(request, env) {
  const validToken = env.API_TOKEN;
  if (!validToken) {
    return {
      valid: false,
      message: "API token not configured on server"
    };
  }
  const authHeader = request.headers.get("Authorization");
  const apiTokenHeader = request.headers.get("X-API-Token");
  let providedToken = null;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      providedToken = authHeader.substring(7);
    } else {
      providedToken = authHeader;
    }
  } else if (apiTokenHeader) {
    providedToken = apiTokenHeader;
  }
  if (!providedToken) {
    return {
      valid: false,
      message: "Missing API token. Please provide token in Authorization header (Bearer token) or X-API-Token header"
    };
  }
  if (providedToken !== validToken) {
    return {
      valid: false,
      message: "Invalid API token"
    };
  }
  return {
    valid: true,
    message: "Token validated successfully"
  };
}
__name(validateToken, "validateToken");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-auNAlC/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-auNAlC/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
