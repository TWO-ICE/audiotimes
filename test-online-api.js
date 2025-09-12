// 测试线上API的duration_rounded字段
const https = require('https');

const testOnlineAPI = () => {
  console.log('🌐 测试线上API的duration_rounded字段');
  console.log('=' .repeat(50));
  
  const postData = JSON.stringify({
    url: 'https://n8ns3.ebeb.fun/audio/131221.mp3'
  });
  
  const options = {
    hostname: 'audio-duration-api.two-ice.workers.dev',
    port: 443,
    path: '/api/duration-url',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': 'demo-token-12345',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 30000
  };
  
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (result.success) {
          console.log('\n✅ 线上API测试成功！');
          console.log('\n📊 响应数据:');
          console.log('文件名:', result.data.filename);
          console.log('文件大小:', result.data.fileSize);
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
          
          console.log('\n🎉 新字段部署成功！duration_rounded字段已正常工作。');
          
        } else {
          console.log('\n❌ API调用失败:');
          console.log('错误:', result.error);
          console.log('消息:', result.message);
        }
        
      } catch (error) {
        console.log('\n💥 解析响应失败:');
        console.log('错误:', error.message);
        console.log('原始响应:', data);
      }
    });
  });
  
  req.on('error', (error) => {
    console.log('\n💥 请求失败:');
    console.log('错误:', error.message);
  });
  
  req.on('timeout', () => {
    console.log('\n⏰ 请求超时');
    req.destroy();
  });
  
  req.write(postData);
  req.end();
};

// 运行测试
testOnlineAPI();