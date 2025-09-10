# 🎵 Audio Duration API

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/audio-duration-api)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://workers.cloudflare.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Edge%20Functions-black)](https://vercel.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

一个高性能的音频时长检测API服务，支持多种音频格式，可部署在Cloudflare Workers和Vercel平台上。

## ✨ 功能特性

- 🎧 **多格式支持**: MP3、WAV、M4A、FLAC、AAC、OGG等主流音频格式
- 🌐 **URL支持**: 支持通过URL直接获取远程音频文件时长
- ⚡ **高性能**: 基于音频文件头部解析，无需完整下载文件
- 🔒 **安全认证**: 支持Token认证，保护API访问
- 🌍 **多平台部署**: 支持Cloudflare Workers和Vercel Edge Functions
- 📊 **详细信息**: 返回时长、文件大小、格式等详细信息
- 🔄 **CORS支持**: 支持跨域请求，方便前端调用
- 📖 **完整文档**: 内置API文档和测试页面

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

## 🌐 部署方式

### 方式一：Cloudflare Workers 部署

1. **安装 Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **登录 Cloudflare**
   ```bash
   wrangler login
   ```

3. **配置环境变量**
   ```bash
   # 在 Cloudflare Dashboard 中设置环境变量
   # 或使用 wrangler secret 命令
   wrangler secret put API_TOKEN
   ```

4. **部署到 Cloudflare Workers**
   ```bash
   npm run deploy
   ```

### 方式二：Vercel 部署

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **配置环境变量**
   创建 `.env.local` 文件：
   ```env
   API_TOKEN=your_secret_token_here
   ```

3. **部署到 Vercel**
   ```bash
   npm run deploy:vercel
   ```

   或者点击下方按钮一键部署：
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/audio-duration-api)

## 🔧 本地开发

### Cloudflare Workers 开发

```bash
npm run dev
```

访问 `http://localhost:8787` 查看API文档

### Vercel 开发

```bash
npm run dev:vercel
```

访问 `http://localhost:3000` 查看API文档

## 📚 API 文档

### 基础信息

- **Base URL**: `https://your-domain.com`
- **认证方式**: Bearer Token 或 X-API-Token Header
- **内容类型**: `multipart/form-data`

### 端点列表

#### 1. 上传文件获取音频时长

**POST** `/api/duration`

上传音频文件并获取时长信息。

**请求头**
```http
Authorization: Bearer your_token_here
# 或者
X-API-Token: your_token_here
Content-Type: multipart/form-data
```

**请求参数**
- `audio` (file, required): 音频文件

**响应示例**
```json
{
  "success": true,
  "data": {
    "duration_microseconds": 120061438,
    "duration_seconds": 120.061438,
    "duration_formatted": "2:00.06",
    "file_size": 4825600,
    "file_size_formatted": "4.6 MB",
    "format": "MP3",
    "timelines": [120.061438],
    "all_timelines": [120.061438]
  }
}
```

#### 2. 通过URL获取音频时长

**POST/GET** `/api/duration-url`

通过音频文件URL获取时长信息，无需上传文件。

**请求头**
```http
Authorization: Bearer your_token_here
# 或者
X-API-Token: your_token_here
Content-Type: application/json  # POST请求
```

**请求参数**

**GET请求**：
- `url` (string, required): 音频文件URL
- `precision` (string, optional): 精度模式 (simple/precise)

**POST请求**：
```json
{
  "url": "https://example.com/audio.mp3",
  "precision": "simple"
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "sourceUrl": "https://example.com/audio.mp3",
    "filename": "audio.mp3",
    "fileSize": "4.6 MB",
    "mimeType": "audio/mpeg",
    "duration": 120061438,
    "formatted": "2:00",
    "precision": "simple",
    "timelines": [
      {
        "start": 0,
        "end": 120061438
      }
    ],
    "all_timelines": [
      {
        "start": 0,
        "end": 120061438
      }
    ],
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**支持的URL格式**：
- HTTP/HTTPS协议
- 直接链接到音频文件
- 文件扩展名：.mp3, .wav, .ogg, .aac, .m4a, .flac, .webm
- 文件大小限制：50MB
- 下载超时：30秒

#### 3. 健康检查

**GET** `/api/health`

检查服务状态。

**响应示例**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "platform": "vercel"
}
```

#### 3. API 文档

**GET** `/` 或 `/api`

访问完整的API文档页面。

### 使用示例

#### cURL 示例

**文件上传方式**：
```bash
# 使用 Authorization header
curl -X POST "https://your-domain.com/api/duration" \
  -H "Authorization: Bearer your_token_here" \
  -F "audio=@/path/to/your/audio.mp3"

# 使用 X-API-Token header
curl -X POST "https://your-domain.com/api/duration" \
  -H "X-API-Token: your_token_here" \
  -F "audio=@/path/to/your/audio.mp3"
```

**URL方式**：
```bash
# GET请求
curl -X GET "https://your-domain.com/api/duration-url?url=https://example.com/audio.mp3&precision=simple" \
  -H "Authorization: Bearer your_token_here"

# POST请求
curl -X POST "https://your-domain.com/api/duration-url" \
  -H "Authorization: Bearer your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/audio.mp3", "precision": "simple"}'
```

#### JavaScript 示例

**文件上传方式**：
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

fetch('https://your-domain.com/api/duration', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_token_here'
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('音频时长:', data.data.duration, '微秒');
})
.catch(error => {
  console.error('错误:', error);
});
```

**URL方式**：
```javascript
// GET请求
const audioUrl = 'https://example.com/audio.mp3';
const apiUrl = `https://your-domain.com/api/duration-url?url=${encodeURIComponent(audioUrl)}&precision=simple`;

fetch(apiUrl, {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_token_here'
  }
})
.then(response => response.json())
.then(data => {
  console.log('音频时长:', data.data.formatted);
  console.log('文件大小:', data.data.fileSize);
})
.catch(error => {
  console.error('错误:', error);
});

// POST请求
fetch('https://your-domain.com/api/duration-url', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_token_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://example.com/audio.mp3',
    precision: 'simple'
  })
})
.then(response => response.json())
.then(data => {
  console.log('音频信息:', data.data);
})
.catch(error => {
  console.error('错误:', error);
});
```

#### Python 示例

**文件上传方式**：
```python
import requests

url = "https://your-domain.com/api/duration"
headers = {
    "Authorization": "Bearer your_token_here"
}

with open("audio.mp3", "rb") as f:
    files = {"audio": f}
    response = requests.post(url, headers=headers, files=files)
    
if response.status_code == 200:
    data = response.json()
    print(f"音频时长: {data['data']['duration']} 微秒")
    print(f"格式化时长: {data['data']['formatted']}")
else:
    print(f"错误: {response.status_code}")
```

**URL方式**：
```python
import requests

# GET请求
url = "https://your-domain.com/api/duration-url"
headers = {
    "Authorization": "Bearer your_token_here"
}
params = {
    "url": "https://example.com/audio.mp3",
    "precision": "simple"
}

response = requests.get(url, headers=headers, params=params)

if response.status_code == 200:
    data = response.json()
    print(f"音频时长: {data['data']['formatted']}")
    print(f"文件大小: {data['data']['fileSize']}")
    print(f"MIME类型: {data['data']['mimeType']}")
else:
    print(f"错误: {response.status_code}")

# POST请求
import json

url = "https://your-domain.com/api/duration-url"
headers = {
    "Authorization": "Bearer your_token_here",
    "Content-Type": "application/json"
}
data = {
    "url": "https://example.com/audio.mp3",
    "precision": "simple"
}

response = requests.post(url, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print(f"音频信息: {result['data']}")
else:
    print(f"错误: {response.status_code}")
```

## ⚙️ 环境变量配置

### Cloudflare Workers

在 Cloudflare Dashboard 中设置以下环境变量：

- `API_TOKEN`: API访问令牌

或使用 wrangler 命令：

```bash
wrangler secret put API_TOKEN
```

### Vercel

在项目根目录创建 `.env.local` 文件：

```env
API_TOKEN=your_secret_token_here
```

或在 Vercel Dashboard 中设置环境变量。

## 🎯 支持的音频格式

| 格式 | 扩展名 | 支持状态 |
|------|--------|----------|
| MP3 | .mp3 | ✅ 完全支持 |
| WAV | .wav | ✅ 完全支持 |
| M4A | .m4a | ✅ 完全支持 |
| FLAC | .flac | ✅ 完全支持 |
| AAC | .aac | ✅ 完全支持 |
| OGG | .ogg | ✅ 完全支持 |

## 🔒 安全性

- **Token 认证**: 所有API请求都需要有效的Token
- **CORS 配置**: 合理的跨域资源共享配置
- **文件验证**: 严格的文件格式和大小验证
- **文件大小限制**: 防止过大文件上传导致的资源消耗（上传50MB，URL下载50MB）
- **URL验证**: 验证URL格式和协议，仅支持HTTP/HTTPS
- **下载超时**: URL下载设置30秒超时，防止长时间占用资源
- **错误处理**: 安全的错误信息返回

## 📊 性能特点

- **快速解析**: 基于文件头部信息，无需完整下载
- **内存优化**: 流式处理，内存占用低
- **边缘计算**: 利用CDN边缘节点，全球低延迟
- **自动扩展**: 无服务器架构，自动处理流量峰值

## 🛠️ 开发指南

### 项目结构

```
audio-duration-api/
├── src/
│   └── index.js          # Cloudflare Workers 入口文件
├── api/
│   ├── duration.js       # Vercel API 端点
│   ├── health.js         # 健康检查端点
│   └── index.js          # API 文档页面
├── vercel.json           # Vercel 配置文件
├── wrangler.toml         # Cloudflare Workers 配置
├── package.json          # 项目依赖和脚本
└── README.md             # 项目文档
```

### 添加新的音频格式支持

1. 在 `getAudioDuration` 函数中添加新格式的解析逻辑
2. 更新 `SUPPORTED_FORMATS` 数组
3. 添加相应的测试用例

### 自定义错误处理

可以在代码中自定义错误响应格式和状态码。

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙋‍♂️ 常见问题

### Q: 支持的最大文件大小是多少？
A: 默认支持最大50MB的音频文件（包括上传和URL下载）。如需调整，可以修改配置中的 `MAX_FILE_SIZE` 参数。

### Q: 时长精度如何？
A: 提供两种精度模式：
- `simple`: 快速模式，精度约为秒级
- `precise`: 精确模式，精度可达毫秒级

### Q: URL功能支持哪些类型的链接？
A: 支持：
- HTTP/HTTPS协议的直接音频文件链接
- 常见音频格式：MP3、WAV、OGG、AAC、M4A、FLAC、WEBM
- 文件大小限制：50MB
- 下载超时：30秒

不支持：
- 流媒体URL（如直播流）
- 需要特殊认证的URL
- 重定向次数过多的URL

### Q: 如何处理损坏的音频文件？
A: API会返回相应的错误信息，建议在客户端进行适当的错误处理。

### Q: URL下载失败怎么办？
A: 常见原因及解决方案：
- **404错误**: 检查URL是否正确，文件是否存在
- **超时错误**: 文件过大或网络较慢，可尝试使用文件上传方式
- **格式不支持**: 确认文件扩展名在支持列表中
- **文件过大**: 确保文件小于50MB

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 Issue: [GitHub Issues](https://github.com/your-username/audio-duration-api/issues)
- 邮箱: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给它一个星标！