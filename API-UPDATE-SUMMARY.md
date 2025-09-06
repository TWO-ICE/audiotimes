# 音频时长API数据格式更新总结

## 🎯 更新目标
根据用户需求，将API接口的时长返回数据格式进行以下修改：
- 1秒返回1000000（微秒格式）
- 1.5秒返回1500000（微秒格式）
- 增加timelines和all_timelines数组

## 📋 具体更新内容

### 1. 时长格式转换
- **原格式**: `duration.raw` (秒数，如 1.5)
- **新格式**: `duration` (微秒数，如 1500000)
- **转换公式**: 微秒 = 秒数 × 1,000,000

### 2. 数据结构调整

#### 原始响应格式:
```json
{
  "success": true,
  "data": {
    "filename": "example.mp3",
    "fileSize": "3.2 MB",
    "mimeType": "audio/mpeg",
    "duration": {
      "raw": 185.123456,
      "formatted": "3:05",
      "precision": "simple"
    },
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

#### 新响应格式:
```json
{
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
}
```

### 3. 新增字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `duration` | number | 音频时长（微秒），1秒=1000000微秒 |
| `formatted` | string | 格式化的时长字符串（如"3:05"） |
| `precision` | string | 精度模式（"simple"或"precise"） |
| `timelines` | array | 音频时间轴数组，包含start和end（微秒） |
| `all_timelines` | array | 总时长时间轴数组 |

## 🔧 技术实现

### 1. 后端API修改 (src/index.js)
- 修改 `handleAudioDuration` 函数
- 添加微秒转换逻辑: `Math.round(duration * 1000000)`
- 重构响应数据结构
- 更新API文档

### 2. 前端测试页面修改 (test-online-api.html)
- 更新结果显示逻辑
- 添加微秒格式显示
- 显示时间轴信息
- 保持秒数转换显示

## 📊 示例数据对比

| 原始秒数 | 微秒格式 | 格式化显示 | 时间轴 |
|----------|----------|------------|--------|
| 1.0 | 1000000 | "0:01" | 0-1000000 |
| 1.5 | 1500000 | "0:01" | 0-1500000 |
| 5.23 | 5230000 | "0:05" | 0-5230000 |
| 185.123456 | 185123456 | "3:05" | 0-185123456 |

## 🚀 部署状态
- ✅ API代码已更新
- ✅ 测试页面已更新
- ✅ 已重新部署到Cloudflare Workers
- ✅ API文档已更新
- ✅ 数据格式验证通过

## 🔗 相关链接
- API端点: https://audio-duration-api.two-ice.workers.dev/api/duration
- API文档: https://audio-duration-api.two-ice.workers.dev
- 健康检查: https://audio-duration-api.two-ice.workers.dev/health

## 📝 使用示例

### cURL请求:
```bash
curl -X POST \
  -F "audio=@example.mp3" \
  -F "precision=simple" \
  https://audio-duration-api.two-ice.workers.dev/api/duration
```

### JavaScript请求:
```javascript
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('precision', 'simple');

fetch('https://audio-duration-api.two-ice.workers.dev/api/duration', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('时长(微秒):', data.data.duration);
  console.log('时长(秒):', data.data.duration / 1000000);
  console.log('格式化时长:', data.data.formatted);
  console.log('时间轴:', data.data.timelines);
});
```

---

**更新完成时间**: 2024年1月
**版本**: v2.0 - 微秒精度版本