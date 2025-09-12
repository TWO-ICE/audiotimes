// 测试新增的 duration_rounded 字段
const testDurationRounded = async () => {
  console.log('🎵 测试 duration_rounded 字段功能');
  console.log('=' .repeat(50));
  
  const apiUrl = 'http://127.0.0.1:8787/api/duration-url';
  const testAudioUrl = 'https://n8ns3.ebeb.fun/audio/131221.mp3';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Token': 'demo-token-12345'
      },
      body: JSON.stringify({
        url: testAudioUrl
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ API调用成功！');
      console.log('\n📊 响应数据:');
      console.log('文件名:', result.data.filename);
      console.log('文件大小:', result.data.fileSize);
      console.log('MIME类型:', result.data.mimeType);
      console.log('\n⏱️ 时长信息:');
      console.log('精确时长(微秒):', result.data.duration);
      console.log('精确时长(秒):', result.data.duration / 1000000);
      console.log('向上取整时长(秒):', result.data.duration_rounded);
      console.log('格式化时长:', result.data.formatted);
      
      // 验证向上取整逻辑
      const exactSeconds = result.data.duration / 1000000;
      const expectedRounded = Math.ceil(exactSeconds * 10) / 10;
      
      console.log('\n🔍 验证向上取整逻辑:');
      console.log('精确时长:', exactSeconds, '秒');
      console.log('期望的向上取整结果:', expectedRounded, '秒');
      console.log('实际的duration_rounded:', result.data.duration_rounded, '秒');
      console.log('验证结果:', result.data.duration_rounded === expectedRounded ? '✅ 正确' : '❌ 错误');
      
      // 测试几个示例
      console.log('\n📝 向上取整规则示例:');
      const testCases = [9.701, 9.68, 19.123, 19.999, 10.0];
      testCases.forEach(testValue => {
        const rounded = Math.ceil(testValue * 10) / 10;
        console.log(`${testValue}秒 → ${rounded}秒`);
      });
      
    } else {
      console.log('\n❌ API调用失败:');
      console.log('错误:', result.error);
      console.log('消息:', result.message);
    }
    
  } catch (error) {
    console.log('\n💥 请求失败:');
    console.log('错误:', error.message);
  }
};

// 运行测试
testDurationRounded();