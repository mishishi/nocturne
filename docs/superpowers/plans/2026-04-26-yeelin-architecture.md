# 夜棂 (Yeelin) MVP 技术架构方案

> **目标：** 为"夜棂"——微信机器人形态的梦境记录产品——提供完整 MVP 技术架构
>
> **核心流程：** 用户发送梦境碎片 → AI 生成5个追问 → 用户依次回答 → AI 生成完整故事（1500-3000字）→ 发回用户 → 存档
>
> **约束：** 1-2周上线、成本最低、技术选型最简单、后续可扩展为小程序/App
>
> **文档依据：** 夜棂-需求文档.md / 模拟流程.md / 夜棂-功能扩展.md

---

## 一、核心流程

```
用户发送语音/文字
       │
       ▼
┌──────────────────┐
│ 接收消息          │
│ - 语音转文字（微信）│
│ - 存储碎片        │
│ - 状态=PENDING   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 调用 MiniMax     │──── 第1次 AI 调用
│ 生成5个追问问题   │
│ 状态=WAITING_Q1 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送第1个问题给用户│
└────────┬─────────┘
         │
         │ (用户回答)
         ▼
┌──────────────────┐
│ 存储回答1         │
│ 状态=WAITING_Q2 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送第2个问题给用户│
└────────┬─────────┘
         │
         │ (用户回答)
         ▼
┌──────────────────┐
│ 存储回答2         │
│ 状态=WAITING_Q3 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送第3个问题给用户│
└────────┬─────────┘
         │
         │ (用户回答)
         ▼
┌──────────────────┐
│ 存储回答3         │
│ 状态=WAITING_Q4 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送第4个问题给用户│
└────────┬─────────┘
         │
         │ (用户回答)
         ▼
┌──────────────────┐
│ 存储回答4         │
│ 状态=WAITING_Q5 │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送第5个问题给用户│
└────────┬─────────┘
         │
         │ (用户回答)
         ▼
┌──────────────────┐
│ 存储回答5         │
│ 状态=COLLECTING  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 调用 MiniMax     │──── 第2次 AI 调用
│ 生成1500-3000字  │
│ 故事              │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 发送故事给用户    │
│ + 存档           │
│ 状态=COMPLETED  │
└──────────────────┘
```

> **最多追问3轮（15个问题）**，3轮后强制生成故事

---

## 二、系统架构图

```
                                    ┌─────────────────┐
                                    │   微信公众平台    │
                                    │  (WeChat Robot)  │
                                    └────────┬────────┘
                                             │ 消息收发 (Webhook/HTTP)
                                             ▼
┌──────────┐    ┌─────────────────────────────────────────────────────────┐
│  用户    │───▶│                     API 网关层                          │
│ (微信)   │◀───│              (Nginx 443 SSL → Node.js 3000)             │
└──────────┘    └────────────────────────┬────────────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
          ┌──────────────────┐                     ┌──────────────────┐
          │   微信消息处理    │                     │   MiniMax API    │
          │   服务           │                     │   追问(1次/梦)   │
          │   (Node.js)     │────────────────────▶ │   故事(1次/梦)  │
          └────────┬─────────┘                     └──────────────────┘
                   │
                   ▼
          ┌──────────────────┐
          │     MongoDB      │
          │   sessions/      │
          │   messages/      │
          │   answers/       │
          │   stories/       │
          └──────────────────┘
```

---

## 三、技术选型

| 层次 | 技术选型 | 选择理由 |
|------|---------|---------|
| **后端 runtime** | **Node.js 18+** | 异步 I/O 适合消息处理，微信 SDK 成熟 |
| **框架** | **Express** | 稳定，文档全，微信 SDK 兼容性好 |
| **数据库** | **MongoDB** | 文档模型，存储灵活，开发快 |
| **微信 SDK** | **wechaty** | 开源微信机器人框架，支持个人微信号 |
| **AI** | **MiniMax API** | 追问问题生成 + 故事生成（2次/梦）|
| **部署** | **单台 2C2G 云服务器** | 成本最低 |
| **语音识别** | **微信服务器自带** | 微信语音消息自动转文字，零成本 |

### 重要说明：个人微信号 vs 公众号

| 方案 | 优点 | 缺点 |
|------|------|------|
| **个人微信号 + wechaty** | 零成本、即开即用 | 有封号风险 |
| **微信公众平台（服务号）** | 稳定、官方支持 | 需要认证（300元/年）|

**MVP 推荐：个人微信号 + wechaty** — 先跑通流程，验证后再迁移服务号

---

## 四、数据库设计（MongoDB）

### Collections

```javascript
// 1. sessions — 会话表
{
  _id: ObjectId,
  openid: String,              // 微信用户唯一标识
  session_id: String,         // UUID，每次梦境对话唯一
  status: String,             // PENDING | Q1-Q5 | COLLECTING | COMPLETED
  dream_fragment: String,      // 用户发送的原始碎片
  question_round: Number,     // 当前追问轮次（1-3）
  created_at: Date,
  updated_at: Date,
  completed_at: Date
}

// 2. messages — 消息记录表
{
  _id: ObjectId,
  session_id: String,
  role: String,               // "user" | "assistant"
  content: String,            // 消息文本
  msg_type: String,           // "text" | "voice"
  created_at: Date
}

// 3. answers — 用户回答记录（逐题存储）
{
  _id: ObjectId,
  session_id: String,
  question_index: Number,     // 问题序号（1-5）
  question_text: String,     // 问题文本
  answer_text: String,      // 用户回答
  answered_at: Date,
  created_at: Date
}

// 4. stories — 生成的故事表
{
  _id: ObjectId,
  session_id: String,
  story_text: String,         // 故事全文
  word_count: Number,         // 字数统计
  prompt_tokens: Number,      // MiniMax API 消耗
  completion_tokens: Number,
  created_at: Date
}

// 5. users — 用户表
{
  _id: ObjectId,
  openid: String,
  first_seen: Date,
  total_dreams: Number,       // 累计生成故事数
  is_member: Boolean,
  member_since: Date
}
```

### 索引

```javascript
db.sessions.createIndex({ "openid": 1 })
db.sessions.createIndex({ "session_id": 1 }, { unique: true })
db.sessions.createIndex({ "status": 1, "created_at": -1 })
db.messages.createIndex({ "session_id": 1, "created_at": 1 })
db.answers.createIndex({ "session_id": 1, "question_index": 1 })
db.stories.createIndex({ "session_id": 1 }, { unique: true })
db.users.createIndex({ "openid": 1 }, { unique: true })
```

---

## 五、状态机设计

```
用户发送碎片
      │
      ▼
  ┌────────┐
  │ PENDING │ ──MiniMax生成5问──▶ ┌─────────────┐
  └────────┘                      │ WAITING_Q1  │
       │                           └──────┬──────┘
       │                                  │ 用户回答
       │                                  ▼
       │                           ┌─────────────┐
       │                           │ WAITING_Q2  │
       │                           └──────┬──────┘
       │                                  │ 用户回答
       │                                  ▼
       │                           ┌─────────────┐
       │                           │ WAITING_Q3  │
       │                           └──────┬──────┘
       │                                  │ 用户回答
       │                                  ▼
       │                           ┌─────────────┐
       │                           │ WAITING_Q4  │
       │                           └──────┬──────┘
       │                                  │ 用户回答
       │                                  ▼
       │                           ┌─────────────┐
       │                           │ WAITING_Q5  │
       │                           └──────┬──────┘
       │                                  │ 用户回答
       │                                  ▼
       │                           ┌──────────────┐
       └──────────────────────────▶│  COLLECTING  │
                                   └──────┬───────┘
                                          │ MiniMax生成
                                          ▼
                                   ┌──────────────┐
                                   │  COMPLETED   │
                                   └──────────────┘
```

> **每个 openid 同时只能有 1 个活跃 session**

---

## 六、API 设计

### 微信消息处理（wechaty）

```
wechaty 处理消息类型：
- TextMessage      → 处理文字碎片 / 用户回答
- VoiceMessage     → 微信自动转文字后处理
- EmotedMessage    → 友好提示"请发文字或语音"
- ImageMessage     → 友好提示"收到图片了，麻烦描述一下梦"
```

### 内部 API

```
POST /api/sessions
  Body: { openid: string }
  Response: { session_id: string }

POST /api/sessions/:session_id/dream
  Body: { content: string, msg_type: 'text'|'voice' }
  Response: { success: true, question: string }

POST /api/sessions/:session_id/answer
  Body: { answer: string }
  Response: { success: true, next_question: string | null, story: string | null }

GET /api/sessions/:session_id/story
  Response: { story: Story }

GET /api/users/:openid/history
  Response: { sessions: Session[] }
```

---

## 七、MiniMax Prompts

### 追问问题生成 Prompt（第1次调用）

```
你是一个梦境解读者。用户分享了一个梦境片段，请生成5个引导问题来帮助用户回忆更多细节。

要求：
1. 问题要具体、有深度，能激发用户回忆
2. 每个问题聚焦一个维度（场景、情绪、人物、物品、事件）
3. 语言温柔、有好奇心
4. 只返回5个问题，用中文，每行一个问题，不要加编号

用户梦境：
{用户输入}
```

### 故事生成 Prompt（第2次调用）

```
你是一个故事作家，基于用户分享的梦境碎片，创作一个1500-3000字的完整故事。

要求：
1. 故事要有开头、发展、高潮、结尾
2. 融入用户梦境中的关键元素（场景、人物、情绪）
3. 可以适度想象和延展，但保留梦境的神秘氛围
4. 语言优美、有画面感
5. 故事要有深层情感或隐喻

用户的梦境碎片：
{dream_fragment}

用户补充细节：
{5个问题的回答，按顺序整理}

---
请直接输出故事正文，不要任何前缀说明。
```

---

## 八、部署方案

### Docker Compose（单服务器）

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/yeelin
      - MINIMAX_API_KEY=${MINIMAX_API_KEY}
      - WECHATY_TOKEN=${WECHATY_TOKEN}
      - PORT=3000
    restart: always
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    restart: always

volumes:
  mongo_data:
```

### Nginx HTTPS 配置

```nginx
server {
    listen 443 ssl;
    server_name yeelin.yourdomain.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 九、第三方服务依赖

| 服务 | 用途 | 费用 |
|------|------|------|
| **MiniMax API** | 追问生成（1次/梦）+ 故事生成（1次/梦）| ~¥0.05-0.15/梦 |
| **wechaty** | 微信机器人接入 | 免费 |
| **MongoDB Atlas M0** | 数据存储 | 免费 |
| **云服务器 2C2G** | 部署后端 | ~¥50/月 |
| **域名 + Let's Encrypt** | HTTPS | ~¥40/年 |

### 月度成本估算（100用户/天，约3000梦/月）

| 项目 | 费用 |
|------|------|
| 云服务器 | ¥50 |
| MongoDB Atlas M0 | ¥0 |
| 域名 + SSL | ¥4 |
| MiniMax API | ~¥150 |
| **合计** | **~¥204/月** |

---

## 十、开发周期（1-2周）

| Day | 任务 | 产出 |
|-----|------|------|
| 1 | 项目初始化 + wechaty 接入个人微信号 | 能收发消息 |
| 2 | 消息处理：文字/语音 + session 创建 | 碎片存入 MongoDB |
| 3-4 | MiniMax 追问问题生成集成 | AI 生成5个追问 |
| 5 | 追问流程：逐题发送/收集/存储 | 完整追问流程 |
| 6-7 | MiniMax 故事生成集成 + Prompt 调优 | 能生成完整故事 |
| 8 | 故事发送 + 存档 | 完整交付流程 |
| 9-10 | Docker 部署 + Nginx + SSL | 可上线 |
| 11-12 | 内部测试 + Bug 修复 | 稳定可用 |
| 13-14 | 灰度发布（种子用户）| 冷启动 |

**总工时：** 约 80-100 人时

---

## 十一、文件结构

```
yeelin/
├── src/
│   ├── app.js                      # Express 入口
│   ├── config/
│   │   └── index.js                 # 环境变量
│   ├── models/
│   │   ├── Session.js
│   │   ├── Message.js
│   │   ├── Answer.js
│   │   ├── Story.js
│   │   └── User.js
│   ├── services/
│   │   ├── wechatService.js         # wechaty 消息处理
│   │   ├── sessionService.js        # 会话状态管理
│   │   ├── questionService.js       # 追问问题生成（MiniMax）
│   │   └── storyService.js          # 故事生成（MiniMax）
│   ├── prompts/
│   │   ├── questionPrompt.js        # 追问 prompt
│   │   └── storyPrompt.js           # 故事 prompt
│   └── utils/
│       └── textUtils.js
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .env.example
└── README.md
```

---

## 十二、扩展预留（不影响 MVP）

| 扩展方向 | 预留设计 |
|---------|---------|
| 服务号迁移 | Session 层抽象，替换 wechaty 为公众号 SDK |
| 会员体系 | users.is_member 字段 + Redis 限流 |
| 定时提醒 | 独立的 scheduler 服务 |
| 小程序 | 复用现有 API，新增小程序前端 |
| 插图生成 | stories 表预留 image_url 字段 |
| 续写功能 | storyService 新增 continueStory() 方法 |
| 追销引导 | 故事完成后追加会员引导话术 |

---

**文档版本：** 2.0
**创建日期：** 2026-04-26
**状态：** 待确认后进入实施阶段
