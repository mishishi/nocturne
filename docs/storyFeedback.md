# 故事反馈 API (storyFeedback)

## 概述

故事反馈模块用于收集用户对 AI 生成故事的评价，包含总体评分和五个维度评分（角色塑造、场景描写、物品细节、情感表达、情节设计）。系统根据用户偏好提供个性化推荐。

### 评分维度

| 维度 | 字段 | 说明 |
|------|------|------|
| 角色塑造 | `character` | 故事中角色的刻画 |
| 场景描写 | `location` | 故事发生场景的描写 |
| 物品细节 | `object` | 物品细节描写 |
| 情感表达 | `emotion` | 情感表达 |
| 情节设计 | `plot` | 整体情节设计 |

### 评分规则

- `overallRating`: 总体评分，1-5 分
- 各维度评分: 1-5 分，可选
- 评论: 最多 200 字

---

## 端点详情

### POST /api/story-feedback

**功能：** 提交故事反馈

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "sessionId": "string",           // 必填，故事会话 ID
  "overallRating": 5,              // 必填，总体评分 1-5
  "elementRatings": {              // 选填，各维度评分
    "character": 5,                // 角色塑造 1-5
    "location": 4,                 // 场景描写 1-5
    "object": 4,                   // 物品细节 1-5
    "emotion": 5,                  // 情感表达 1-5
    "plot": 4                      // 情节设计 1-5
  },
  "comment": "string"              // 选填，评论，最多 200 字
}
```

**响应 (200 / 400 / 401 / 403 / 409 / 404)：**
```json
// 成功
{
  "success": true,
  "feedback": {
    "id": "feedback_cuid",
    "sessionId": "session_cuid",
    "overallRating": 5,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}

// 缺少 sessionId
{
  "success": false,
  "reason": "缺少 sessionId"
}

// 缺少 overallRating
{
  "success": false,
  "reason": "缺少 overallRating"
}

// overallRating 超范围
{
  "success": false,
  "reason": "overallRating 必须在 1-5 之间"
}

// 评论过长
{
  "success": false,
  "reason": "评论字数不超过 200"
}

// 无权为他人提交
{
  "success": false,
  "reason": "无权为他人提交反馈"
}

// 已提交过
{
  "success": false,
  "reason": "该故事已提交过反馈"
}

// Session 不存在
{
  "success": false,
  "reason": "Session not found"
}
```

**业务逻辑：**
1. 验证 Token 用户与 openid 匹配
2. 验证 sessionId 对应的会话存在
3. 检查用户是否已对该故事提交过反馈（每人只能提交一次）
4. 保存反馈记录

**前端调用：** 无（未使用）

---

### GET /api/story-feedback/:sessionId

**功能：** 获取故事的单个反馈（按时间排序的第一个）

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**响应 (200 / 404)：**
```json
// 成功
{
  "success": true,
  "feedback": {
    "id": "feedback_cuid",
    "sessionId": "session_cuid",
    "openid": "user_openid",
    "overallRating": 5,
    "elementRatings": {
      "character": 5,
      "location": 4,
      "object": 4,
      "emotion": 5,
      "plot": 4
    },
    "comment": "这个故事太棒了！",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}

// 反馈不存在
{
  "success": false,
  "reason": "反馈不存在"
}
```

**业务逻辑：**
- 返回该会话的第一个反馈（按 createdAt 升序）

**前端调用：** 无（未使用）

---

### GET /api/story-feedback/:sessionId/all

**功能：** 获取该会话的所有反馈及统计

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**响应 (200)：**
```json
{
  "success": true,
  "feedbacks": [
    {
      "id": "feedback_cuid",
      "overallRating": 5,
      "elementRatings": {
        "character": 5,
        "location": 4,
        "object": 4,
        "emotion": 5,
        "plot": 4
      },
      "comment": "这个故事太棒了！",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "stats": {
    "count": 10,
    "overallAvg": 4.5,
    "elementAvgs": {
      "character": 4.6,
      "location": 4.2,
      "object": 4.3,
      "emotion": 4.7,
      "plot": 4.4
    }
  }
}
```

**业务逻辑：**
- 按 `createdAt` 降序返回所有反馈
- 统计各维度平均值

**前端调用：** 无（未使用）

---

### GET /api/story-feedback/:sessionId/check

**功能：** 检查当前用户是否已对某故事提交反馈

**需要认证：** 否

**URL 参数：**
- `sessionId`: 会话 ID

**Query 参数：**
- `openid`: 用户 openid（必填）

**响应 (200)：**
```json
// 已提交
{
  "success": true,
  "hasSubmitted": true,
  "feedback": {
    "id": "feedback_cuid",
    "overallRating": 5,
    "elementRatings": {
      "character": 5,
      "location": 4,
      "object": 4,
      "emotion": 5,
      "plot": 4
    },
    "comment": "这个故事太棒了！",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}

// 未提交
{
  "success": true,
  "hasSubmitted": false,
  "feedback": null
}

// 缺少 openid
{
  "success": false,
  "reason": "缺少openid参数"
}
```

**前端调用：** 无（未使用）

---

### GET /api/story-feedback/analytics

**功能：** AI 质量分析（全局统计）

**需要认证：** 否

**响应 (200)：**
```json
{
  "success": true,
  "analytics": {
    "totalFeedbacks": 100,
    "overallAvg": 4.2,
    "dimensionAvgs": {
      "character": 4.3,
      "location": 4.1,
      "object": 4.2,
      "emotion": 4.4,
      "plot": 4.0
    },
    "ratingDistribution": {
      "1": 2,
      "2": 5,
      "3": 15,
      "4": 38,
      "5": 40
    },
    "weakestDimension": "plot",
    "weakestValue": 4.0,
    "suggestions": [
      "AI生成质量良好，继续保持当前prompt策略"
    ]
  }
}
```

**业务逻辑：**
1. 计算所有反馈的总体平均分
2. 计算各维度平均分
3. 统计评分分布
4. 找出最弱维度
5. 根据分析生成优化建议

**建议生成规则：**
- 总体平均 < 3.5 → 建议审视整体质量
- 最弱维度 < 3.5 → 建议加强该维度 prompt
- 1-2 分占比 > 30% → 建议排查生成异常
- 上述都不满足 → 鼓励继续保持

**前端调用：** 无（未使用）

---

### GET /api/story-feedback/recommendations

**功能：** 基于用户偏好的个性化故事推荐

**需要认证：** **是**（需 Bearer Token）

**Query 参数：**
- `openid`: 用户 openid（必填）

**响应 (200)：**
```json
// 有偏好数据
{
  "success": true,
  "recommendations": [
    {
      "id": "post_cuid",
      "sessionId": "session_cuid",
      "storyTitle": "飞翔的梦",
      "storySnippet": "我梦见自己在天空中飞翔...",
      "nickname": "匿名用户",
      "likeCount": 12,
      "commentCount": 3,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "score": 0.95,
      "reason": "匹配你的角色塑造偏好"
    }
  ],
  "hasPreferences": true
}

// 无偏好数据（返回热门推荐）
{
  "success": true,
  "recommendations": [
    {
      "id": "post_cuid",
      "sessionId": "session_cuid",
      "storyTitle": "飞翔的梦",
      "storySnippet": "我梦见自己在天空中飞翔...",
      "nickname": "匿名用户",
      "likeCount": 12,
      "commentCount": 3,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "score": 18,
      "reason": "热门推荐"
    }
  ],
  "hasPreferences": false
}
```

**业务逻辑：**
1. 获取用户历史反馈，构建偏好画像
2. 计算用户在各维度的平均评分
3. 遍历所有已发布故事，计算与用户偏好的余弦相似度
4. 返回相似度最高的 10 个故事
5. 无历史反馈时返回热门故事（likeCount + commentCount * 2 排序）

**推荐理由：**
- 根据故事评分最高的维度匹配用户偏好维度
- 无偏好时显示"热门推荐"

**前端调用：** 无（未使用）

---

## 数据库模型

```prisma
model StoryFeedback {
  id              String   @id @default(cuid())
  sessionId       String
  openid          String
  overallRating   Int
  characterRating Int?
  locationRating  Int?
  objectRating    Int?
  emotionRating   Int?
  plotRating      Int?
  comment         String?
  createdAt       DateTime @default(now())

  session Session @relation(fields: [sessionId], references: [id])
  user    User    @relation(fields: [openid], references: [openid])

  @@unique([sessionId, openid])
  @@index([sessionId])
  @@index([openid])
}
```

**注意：** `sessionId + openid` 联合唯一约束，确保每个用户对每个故事只能提交一次反馈。

---

## 相关文件

- `server/src/routes/storyFeedback.js` - 路由定义
- `server/src/services/authService.js` - 认证服务
- `server/src/middleware/auth.js` - 认证中间件
- `server/src/config/database.js` - Prisma 客户端
