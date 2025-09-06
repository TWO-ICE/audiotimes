// 测试新的API数据格式
const testApiFormat = async () => {
  console.log('🎵 音频时长API数据格式验证');
  console.log('=' .repeat(50));
  
  console.log('\n📋 API更新内容:');
  console.log('1. 时长从秒转换为微秒格式 (1秒 = 1,000,000微秒)');
  console.log('2. 添加 timelines 数组，包含每个音频的时间轴');
  console.log('3. 添加 all_timelines 数组，包含总时长时间轴');
  console.log('4. 保持 formatted 字段用于显示格式化时长');
  
  console.log('\n🎵 模拟API响应格式测试...');
  // 模拟新的API响应格式
  const mockResponse = {
    success: true,
    data: {
      filename: "test.mp3",
      fileSize: "1.5 MB",
      mimeType: "audio/mpeg",
      duration: 1500000, // 1.5秒 = 1500000微秒
      formatted: "0:01",
      precision: "simple",
      timelines: [
        {
          start: 0,
          end: 1500000
        }
      ],
      all_timelines: [
        {
          start: 0,
          end: 1500000
        }
      ],
      timestamp: new Date().toISOString()
    }
  };
  
  console.log('✅ 新的API响应格式示例:');
  console.log(JSON.stringify(mockResponse, null, 2));
  
  // 验证数据格式
  const data = mockResponse.data;
  const durationSeconds = data.duration / 1000000;
  console.log('\n📊 数据验证:');
  console.log(`- 微秒时长: ${data.duration.toLocaleString()}`);
  console.log(`- 转换为秒: ${durationSeconds}`);
  console.log(`- 格式化时长: ${data.formatted}`);
  console.log(`- 时间轴: ${data.timelines[0].start} - ${data.timelines[0].end}`);
  console.log(`- 总时长轴: ${data.all_timelines[0].start} - ${data.all_timelines[0].end}`);
};

// 运行测试
testApiFormat().catch(console.error);