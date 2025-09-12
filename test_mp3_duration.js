/**
 * 测试MP3时长解析算法
 */
import fs from 'fs';

// 复制MP3解析相关函数
function parseMp3FrameHeader(header) {
  const version = (header >> 19) & 3;
  const layer = (header >> 17) & 3;
  const bitrateIndex = (header >> 12) & 15;
  const sampleRateIndex = (header >> 10) & 3;
  const padding = (header >> 9) & 1;
  
  // MPEG版本和层级检查
  if (version === 1 || layer === 0) return null; // 保留值
  
  // 比特率表
  const bitrateTables = {
    1: { // MPEG-1
      1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0], // Layer I
      2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],   // Layer II
      3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]     // Layer III
    },
    2: { // MPEG-2
      1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
      2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
      3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
    }
  };
  
  // 采样率表
  const sampleRateTables = {
    1: [44100, 48000, 32000, 0], // MPEG-1
    2: [22050, 24000, 16000, 0], // MPEG-2
    3: [11025, 12000, 8000, 0]   // MPEG-2.5
  };
  
  const mpegVersion = version === 3 ? 1 : (version === 2 ? 2 : version);
  const layerNum = 4 - layer;
  
  if (!bitrateTables[mpegVersion] || !bitrateTables[mpegVersion][layerNum]) {
    return null;
  }
  
  if (bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) {
    return null;
  }
  
  const bitrate = bitrateTables[mpegVersion][layerNum][bitrateIndex];
  const sampleRate = sampleRateTables[mpegVersion][sampleRateIndex];
  
  if (!bitrate || !sampleRate) return null;
  
  // 计算帧大小
  let frameSize;
  let samplesPerFrame;
  
  if (layerNum === 1) {
    frameSize = Math.floor((12 * bitrate * 1000 / sampleRate + padding) * 4);
    samplesPerFrame = 384;
  } else {
    frameSize = Math.floor(144 * bitrate * 1000 / sampleRate + padding);
    samplesPerFrame = mpegVersion === 1 ? 1152 : 576;
  }
  
  return {
    bitrate: bitrate * 1000,
    sampleRate: sampleRate,
    frameSize: frameSize,
    samplesPerFrame: samplesPerFrame,
    version: mpegVersion,
    layer: layerNum
  };
}

async function parseMp3Duration(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  
  // 查找ID3v2标签（如果存在）
  let dataStart = 0;
  if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
    // ID3v2标签存在，跳过它
    const tagSize = ((view.getUint8(6) & 0x7F) << 21) |
                   ((view.getUint8(7) & 0x7F) << 14) |
                   ((view.getUint8(8) & 0x7F) << 7) |
                   (view.getUint8(9) & 0x7F);
    dataStart = 10 + tagSize;
  }
  
  // 查找ID3v1标签（文件末尾128字节）
  let dataEnd = arrayBuffer.byteLength;
  if (arrayBuffer.byteLength >= 128) {
    const tagStart = arrayBuffer.byteLength - 128;
    const tagHeader = String.fromCharCode(...new Uint8Array(arrayBuffer, tagStart, 3));
    if (tagHeader === 'TAG') {
      dataEnd = tagStart;
    }
  }
  
  // 查找第一个有效的MP3帧头
  for (let i = dataStart; i < Math.min(dataStart + 8192, view.byteLength - 4); i++) {
    if (view.getUint8(i) === 0xFF && (view.getUint8(i + 1) & 0xE0) === 0xE0) {
      const header = view.getUint32(i, false);
      const frameInfo = parseMp3FrameHeader(header);
      
      if (frameInfo && frameInfo.bitrate > 0 && frameInfo.sampleRate > 0) {
        // 计算实际音频数据大小
        const audioDataSize = dataEnd - dataStart;
        
        // 使用比特率计算时长（更准确的方法）
        // 时长 = 音频数据大小(字节) * 8 / 比特率(bps)
        const duration = (audioDataSize * 8) / frameInfo.bitrate;
        
        console.log('MP3解析信息:');
        console.log('- 文件总大小:', arrayBuffer.byteLength, '字节');
        console.log('- ID3v2标签大小:', dataStart, '字节');
        console.log('- 音频数据大小:', audioDataSize, '字节');
        console.log('- 比特率:', frameInfo.bitrate, 'bps');
        console.log('- 采样率:', frameInfo.sampleRate, 'Hz');
        console.log('- 计算时长:', duration, '秒');
        
        return duration;
      }
    }
  }
  
  throw new Error('Invalid MP3 file format');
}

// 测试函数
async function testMp3Duration() {
  try {
    console.log('开始测试MP3时长解析...');
    
    // 读取测试文件
    const fileBuffer = fs.readFileSync('test_audio.mp3');
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    
    console.log('文件读取成功，大小:', arrayBuffer.byteLength, '字节');
    
    // 解析时长
    const duration = await parseMp3Duration(arrayBuffer);
    
    console.log('\n=== 测试结果 ===');
    console.log('解析得到的时长:', duration, '秒');
    console.log('预期时长: 19.68秒');
    console.log('误差:', Math.abs(duration - 19.68), '秒');
    console.log('误差百分比:', (Math.abs(duration - 19.68) / 19.68 * 100).toFixed(2), '%');
    
    if (Math.abs(duration - 19.68) < 0.1) {
      console.log('✅ 测试通过！时长解析准确');
    } else {
      console.log('❌ 测试失败！时长解析不准确');
    }
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
testMp3Duration();