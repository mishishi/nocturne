# 会话/梦境 API (session)

## 概述

会话模块是核心功能，负责从用户输入梦境片段到生成完整故事的完整流程。

### 流程概览

```
创建会话 → 提交梦境 → 回答5个问题 → 生成故事 → (可选)生成解读
```

---

## 端点详情

### POST /api/sessions

**功能：** 创建新的梦境会话

**需要认证：** 否（游客可用）

**请求 Body：**
```json
{
  "openid": "string"  // 必填，用户唯一标识
}
```

**响应 (200)：**
```json
{
  "sessionId": "cuid_xxx",
  "status": "PENDING"
}
```

**业务逻辑：**
- 在数据库创建 Session 记录
- status 初始为 "PENDING"
- 游客使用 `web_<timestamp>` 格式 openid

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Dream.tsx` | `handleSubmit()` | 点击"生成故事"按钮提交梦境时调用 |

**前端代码位置：** `src/pages/Dream.tsx:212`

```typescript
const { sessionId } = await api.createSession(openid)
```

---

### POST /api/sessions/:sessionId/dream

**功能：** 提交梦境片段，AI 生成问题

**需要认证：** 否（游客可用）

**URL 参数：**
- `sessionId`: 会话 ID

**请求 Body：**
```json
{
  "content": "string"  // 必填，用户描述的梦境内容
}
```

**响应 (200)：**
```json
{
  "success": true,
  "questions": [
    "梦里你在做什么？",
    "你感受到了什么情绪？",
    "梦中有什么特别的事物吗？",
    "这个梦境让你想起了什么？",
    "你希望这个故事有什么结局？"
  ],
  "questionIndex": 0
}
```

**业务逻辑：**
- 保存梦境片段到 Session.dreamFragment
- 调用 questionService.generateQuestions(content) 生成5个问题
- 更新 Session.status 为 "Q1" ~ "Q5"
- 保存问题数组到 Session.questions

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Dream.tsx` | `handleSubmit()` | 点击"生成故事"按钮提交梦境时调用（紧接着 createSession） |

**前端代码位置：** `src/pages/Dream.tsx:219`

```typescript
const { questions } = await api.submitDream(sessionId, currentSession.dreamText)
```

---

### POST /api/sessions/:sessionId/answer

**功能：** 提交问题的回答

**需要认证：** 否（游客可用）

**URL 参数：**
- `sessionId`: 会话 ID

**请求 Body：**
```json
{
  "answer": "string"  // 必填，用户对当前问题的回答
}
```

**响应 (200)：**

```json
// 非最后一题
{
  "success": true,
  "nextQuestion": "下一个问题内容",
  "nextIndex": 1
}

// 最后一题且已回答
{
  "success": true,
  "story": {
    "title": "故事标题",
    "content": "完整故事内容..."
  }
}
```

**业务逻辑：**
- 根据 session.currentQuestionIndex 获取当前问题
- 保存回答到 Answer 表
- 递增 currentQuestionIndex
- 如果是最后一题：
  - 收集所有回答
  - 调用 storyService.generateStory 生成故事
  - 保存故事到 Story 表
  - 更新 Session.status 为 "COMPLETED"
- 否则返回下一题

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Questions.tsx` | `handleNext()` | 点击"下一题"按钮提交当前回答 |
| `src/pages/Questions.tsx` | `handleFinalSubmit()` | 最后一题时点击"生成故事"按钮 |

**前端代码位置：**
- `src/pages/Questions.tsx:55` - handleNext
- `src/pages/Questions.tsx:135` - handleFinalSubmit（循环提交剩余答案）

---

### GET /api/sessions/:sessionId/story

**功能：** 获取已生成的故事

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**响应 (200 / 404)：**
```json
// 成功
{
  "story": {
    "title": "故事标题",
    "content": "完整故事内容..."
  }
}

// 不存在
{
  "error": "Story not found"
}
```

**前端调用：** 无（故事通过 answer 接口直接返回）

---

### GET /api/sessions/users/:openid/history

**功能：** 获取用户的所有历史会话

**需要认证：** 否

**URL 参数：**
- `openid`: 用户 openid

**响应 (200)：**
```json
{
  "sessions": [
    {
      "id": "session_id",
      "date": "2024-01-15",
      "dreamFragment": "我梦见自己在飞...",
      "storyTitle": "飞翔的梦",
      "story": "完整故事内容..."
    }
  ]
}
```

**业务逻辑：**
- 查询该 openid 的所有已完成会话
- 按创建时间倒序排列

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/History.tsx` | `syncHistoryFromBackend()` | History 页面加载时调用 |

**前端代码位置：** `src/pages/History.tsx:56`

```typescript
const history = await api.getHistory(openid)
```

---

### POST /api/sessions/:sessionId/interpret

**功能：** AI 生成梦境解读

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**请求 Body：**
```json
{
  "openid": "string",  // 必填，用户 openid（用于扣积分）
  "visibility": "private"  // 可选，可见性设置：private(仅自己)、friends(仅好友)、public(公开)，默认 private
}
```

**响应 (200)：**
```json
{
  "success": true,
  "interpretation": "这是一段关于...的梦境解读",
  "interpretationVisibility": "private",
  "depthLevel": "standard",
  "hasAuxiliaryClue": true,
  "pointsUsed": 10,
  "remainingPoints": 20,
  "shouldShowModal": true
}

// 积分不足
{
  "success": false,
  "reason": "解读需要 10 积分，你的积分不足"
}

// 已有解读
{
  "success": true,
  "interpretation": "...",
  "alreadyExists": true
}
```

**业务逻辑：**
- 验证 openid 对应的用户存在
- 检查积分是否足够（10 积分/次）
- 收集 session 的问题和回答作为上下文
- 获取用户的解读偏好设置（基于历史反馈调整深度）
- 获取用户的历史梦境数据构建辅助线索（发布到梦墙的故事 + 问答记录）
- 调用 storyService.generateInterpretation 生成解读（传入深度级别和辅助线索）
- 扣除用户积分
- 保存解读到 Story.interpretation

**个性化深度机制：**
- 系统跟踪用户对解读的反馈（准确/不准确）
- 如果用户历史反馈中不准确率超过 40%，自动切换到详细模式
- 详细模式（detailed）：更深入的分析，更多探索角度，max_tokens 翻倍
- 标准模式（standard）：基础深度分析

**辅助线索关联机制：**
- 系统分析用户历史梦境数据（已发布的梦墙故事 + 问答记录）
- 提取梦境主题偏好（如：飞翔与自由、人际关系等）
- 识别重复出现的元素（如：动物、场景、情绪词）
- 推断用户近期情绪倾向（积极/消极/中性）
- 将辅助线索以"参考"形式加入 AI prompt，帮助生成更个性化的解读
- 辅助线索仅作参考，AI 保持开放性解读

**积分规则：**
- 每次解读消耗 10 积分

**shouldShowModal 标志：**
- 首次生成解读时返回 `shouldShowModal: true`，前端应显示解读弹窗
- 后续查看已存在的解读时返回 `shouldShowModal: false`，前端应显示折叠的解读卡片
- 该标志基于用户的 `interpretationAutoShow` 字段，在首次生成解读后会被设为 false

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Story.tsx` | `handleInterpret()` | 点击"听听解读"按钮 |

**前端代码位置：** `src/pages/Story.tsx:237`

```typescript
const result = await api.interpret(sessionId, openid)
```

---

### GET /api/sessions/:sessionId/interpretation

**功能：** 获取已有的梦境解读

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**响应 (200)：**
```json
{
  "interpretation": "解读内容..."  // 或 null（未解读过）
}
```

**前端调用：** 无（未使用）

---

### PATCH /api/sessions/:sessionId/interpretation-visibility

**功能：** 更新已有解读的可见性设置

**需要认证：** 是

**URL 参数：**
- `sessionId`: 会话 ID

**请求 Body：**
```json
{
  "visibility": "private"  // 必填，可见性：private(仅自己)、friends(仅好友)、public(公开)
}
```

**响应 (200)：**
```json
{
  "success": true,
  "interpretationVisibility": "private"
}

// 权限不足
{
  "success": false,
  "reason": "无权限修改此解读的可见性"
}

// 解读不存在
{
  "success": false,
  "reason": "解读不存在，无法设置可见性"
}
```

**业务逻辑：**
- 验证用户是否拥有该 session
- 更新 Story.interpretationVisibility 字段

**可见性规则：**
- `private`：仅自己可见
- `friends`：仅好友可见
- `public`：公开可见

---

### POST /api/sessions/:sessionId/interpretation-feedback

**功能：** 提交梦境解读的反馈

**需要认证：** 是

**URL 参数：**
- `sessionId`: 会话 ID

**请求 Body：**
```json
{
  "isAccurate": true,    // 必填，解读是否准确
  "comment": "string"     // 选填，补充说明
}
```

**响应 (200)：**
```json
{
  "success": true,
  "feedback": {
    "id": "feedback_id",
    "isAccurate": true,
    "comment": "补充说明..."
  }
}

// 参数错误
{
  "success": false,
  "reason": "isAccurate (boolean) is required"
}

// 未找到解读
{
  "success": false,
  "reason": "解读不存在，无法提交反馈"
}
```

**业务逻辑：**
- 验证用户已登录
- 检查该 session 的故事是否有解读
- 使用 upsert 逻辑，允许用户更新自己的反馈
- 每个用户对每个解读只能提交一次反馈

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/components/DreamInterpretationModal.tsx` | `handleFeedback()` | 用户点击"有帮助"或"不太准确"按钮 |

---

### GET /api/sessions/:sessionId/interpretation-feedback

**功能：** 获取当前用户对解读的反馈状态

**需要认证：** 是

**URL 参数：**
- `sessionId`: 会话 ID

**响应 (200)：**
```json
{
  "success": true,
  "feedback": {
    "id": "feedback_id",
    "isAccurate": true,
    "comment": "补充说明..."
  }
}

// 未提交过反馈
{
  "success": true,
  "feedback": null
}
```

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/components/DreamInterpretationModal.tsx` | `useEffect()` | 打开解读弹窗时检查是否已反馈 |

---

### POST /api/sessions/migrate

**功能：** 迁移游客会话到登录用户

**需要认证：** 否

**请求 Body：**
```json
{
  "guestOpenid": "string",   // 必填，游客 openid（如 web_xxx）
  "userOpenid": "string"     // 必填，登录用户 openid
}
```

**响应 (200)：**
```json
{
  "success": true,
  "migrated": 3,
  "sessionIds": ["id1", "id2", "id3"]
}

// 参数缺失
{
  "success": false,
  "reason": "缺少参数"
}

// 无会话可迁移
{
  "success": true,
  "migrated": 0
}
```

**业务逻辑：**
- 查询 guestOpenid 的所有 Session
- 批量更新 openid 为 userOpenid
- 用于游客注册/登录后关联其历史会话

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Login.tsx` | `handleWeChatLogin()` | 微信登录成功后 |
| `src/pages/Login.tsx` | `handlePhoneLogin()` | 手机号登录成功后 |
| `src/pages/Register.tsx` | `handleNicknameSubmit()` | 注册成功后 |

**前端代码位置：**
- `src/pages/Login.tsx:45`（微信登录）
- `src/pages/Login.tsx:78`（手机登录）
- `src/pages/Register.tsx:60`（注册）

```typescript
// 登录/注册成功后调用
const guestOpenid = localStorage.getItem('yeelin_openid')
if (guestOpenid && guestOpenid !== result.user.openid) {
  await api.migrateSession(guestOpenid, result.user.openid)
}
```

---

## 游客会话流程

1. **创建会话时**：用户打开 Dream 页面创建会话
   - 如果 localStorage 有 yeelin_openid，用已有的
   - 如果没有，生成 `web_${Date.now()}` 并存储

2. **游客限制**：
   - 可以完整走完梦境→问答→故事的流程
   - 无法发布到梦墙、点赞、评论
   - 分享无法获得积分
   - 无法使用好友功能

3. **登录后同步**：
   - 登录时检测 localStorage 中的 guest openid
   - 调用 migrateSession 将guest会话关联到真实用户

---

## 数据库模型

```prisma
model Session {
  id                   String    @id @default(cuid())
  openid               String
  status               String    // PENDING, Q1-Q5, COLLECTING, COMPLETED
  dreamFragment        String    // 用户输入的梦境片段
  questions            String[]  // AI 生成的问题数组
  currentQuestionIndex Int      // 当前问题索引
  createdAt            DateTime
  updatedAt            DateTime
  completedAt          DateTime?
}

model Answer {
  id            String   @id @default(cuid())
  sessionId     String
  questionIndex Int
  questionText  String
  answerText   String
  answeredAt    DateTime
}

model Story {
  id              String   @id @default(cuid())
  sessionId       String   @unique
  title           String
  content         String
  interpretation  String?  // 梦境解读
  interpretationVisibility String @default("private") // private, friends, public
  wordCount       Int?
  promptTokens    Int?
  completionTokens Int?
}

// 梦境解读反馈
model InterpretationFeedback {
  id          String   @id @default(cuid())
  sessionId   String   // 关联的 session
  openid      String   // 提供反馈的用户
  isAccurate  Boolean  // 解读是否准确
  comment     String?  // 用户可选的详细反馈
  createdAt   DateTime @default(now())

  @@unique([sessionId, openid])
}
```

---

## 相关文件

- `server/src/routes/sessions.js` - 路由定义
- `server/src/services/sessionService.js` - 会话业务逻辑
- `server/src/services/questionService.js` - 问题生成
- `server/src/services/storyService.js` - 故事/解读生成
- `src/services/api.ts` - 前端 API 封装（api 对象）
- `src/pages/Dream.tsx` - 梦境输入页
- `src/pages/Questions.tsx` - 问答页
- `src/pages/Story.tsx` - 故事展示页
- `src/pages/History.tsx` - 历史记录页
