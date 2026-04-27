# 梦墙 API (wall)

## 概述

梦墙是故事分享广场，用户可以浏览、发布故事，点赞和评论。梦墙内容需要审核后才能显示（待审核状态为 pending）。

### 帖子状态

| 状态 | 说明 |
|------|------|
| `pending` | 待审核 |
| `approved` | 已通过审核 |
| `rejected` | 审核未通过 |

### 可见性

| 可见性 | 说明 |
|--------|------|
| `public` | 公开显示 |
| `private` | 仅自己可见 |

---

## 端点详情

### GET /api/wall

**功能：** 获取梦墙帖子列表（公开）

**需要认证：** 否

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tab` | `all` \| `featured` | `all` | 筛选标签，`featured` 仅返回精选 |
| `page` | number | `1` | 页码 |
| `limit` | number | `20` | 每页数量 |

**响应 (200)：**
```json
{
  "posts": [
    {
      "id": "post_cuid",
      "sessionId": "session_cuid",
      "storyTitle": "飞翔的梦",
      "storySnippet": "我梦见自己在天空中飞翔...",
      "isAnonymous": true,
      "nickname": "匿名用户",
      "avatar": null,
      "likeCount": 12,
      "commentCount": 3,
      "isFeatured": false,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "hasLiked": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "hasMore": true
  }
}
```

**业务逻辑：**
- 只返回 `status: 'approved'` 且 `visibility: 'public'` 的帖子
- 按 `isFeatured` 降序，然后按 `createdAt` 降序排列
- 未登录用户 `hasLiked` 固定为 `false`

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/DreamWall.tsx` | `loadPosts()` | 切换到"全部"或"本周精选" Tab 时 |
| `src/pages/DreamWall.tsx` | `handleLoadMore()` | 点击"加载更多"按钮 |

**前端代码位置：** `src/pages/DreamWall.tsx:31`

```typescript
const result = await wallApi.getPosts({
  tab: tab === 'my' ? 'all' : tab,
  page: pageNum,
  limit: 20
})
```

---

### POST /api/wall

**功能：** 发布故事到梦墙

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "openid": "string",          // 必填，用户 openid
  "sessionId": "string",       // 必填，要发布的会话 ID
  "isAnonymous": true,         // 选填，是否匿名，默认 true
  "visibility": "public"       // 选填，public 或 private，默认 public
}
```

**响应 (200 / 400 / 403 / 409)：**
```json
// 发布成功（内容安全）
{
  "success": true,
  "post": { "id": "post_cuid" },
  "message": "发布成功"
}

// 需要审核
{
  "success": true,
  "post": { "id": "post_cuid" },
  "message": "内容待审核，审核通过后将显示在梦墙"
}

// 缺少参数
{
  "success": false,
  "reason": "缺少必要参数"
}

// 无权操作
{
  "success": false,
  "reason": "无权操作"
}

// 故事已在梦墙发布
{
  "success": false,
  "reason": "该故事已在梦墙发布"
}
```

**业务逻辑：**
1. 验证 Token 用户与 openid 匹配
2. 验证 sessionId 对应的故事存在且属于该用户
3. 检查故事是否已在梦墙发布
4. 内容安全检查（手机号、身份证号等敏感信息）
5. 安全内容直接 approved，否则 pending
6. 保存用户信息快照（nickname、avatar）

**内容安全检查：**
- 检测 11 位以上连续数字（手机号）
- 检测 15 位以上连续数字（身份证号）
- 包含敏感信息的内容会进入 pending 审核状态

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Story.tsx` | `handlePublishToWall()` | 点击"发布到梦墙"按钮 |

**前端代码位置：** `src/pages/Story.tsx:284`

```typescript
const result = await wallApi.publish({
  openid,
  sessionId,
  isAnonymous: true,
  visibility: 'public'
})
```

---

### GET /api/wall/my

**功能：** 获取当前用户发布的帖子列表

**需要认证：** **是**（需 Bearer Token）

**Query 参数：**
- `openid`: 用户 openid

**响应 (200)：**
```json
{
  "success": true,
  "posts": [
    {
      "id": "post_cuid",
      "storyTitle": "飞翔的梦",
      "storySnippet": "我梦见自己在天空中飞翔...",
      "isAnonymous": true,
      "likeCount": 12,
      "commentCount": 3,
      "status": "approved",
      "isFeatured": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**业务逻辑：**
- 验证 Token 用户与 openid 匹配
- 返回该用户发布的所有帖子（所有状态）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/DreamWall.tsx` | `loadMyPosts()` | 切换到"我的发布" Tab 时 |

**前端代码位置：** `src/pages/DreamWall.tsx:81`

```typescript
const result = await wallApi.getMyPosts(openid)
```

---

### POST /api/wall/:postId/like

**功能：** 点赞或取消点赞

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `postId`: 帖子 ID

**请求 Body：**
```json
{
  "openid": "string"  // 必填，用户 openid
}
```

**响应 (200 / 403 / 404)：**
```json
// 点赞成功
{
  "success": true,
  "liked": true
}

// 取消点赞成功
{
  "success": true,
  "liked": false
}

// 帖子不存在
{
  "success": false,
  "reason": "帖子不存在"
}
```

**业务逻辑：**
1. 验证 Token 用户与 openid 匹配
2. 检查帖子是否存在
3. 检查用户是否已点赞
4. 已点赞则取消（删除 like 记录，减 likeCount）
5. 未点赞则添加（创建 like 记录，增 likeCount）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/DreamWall.tsx` | `handleLike()` | 点击帖子卡片的点赞按钮 |

**前端代码位置：** `src/pages/DreamWall.tsx:124`

```typescript
const result = await wallApi.toggleLike(postId, user.openid)
```

---

### GET /api/wall/:postId/comments

**功能：** 获取帖子的评论列表

**需要认证：** 否

**URL 参数：**
- `postId`: 帖子 ID

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `limit` | number | `20` | 每页数量 |

**响应 (200)：**
```json
{
  "comments": [
    {
      "id": "comment_cuid",
      "content": "这个梦好有意思！",
      "isAnonymous": true,
      "nickname": "匿名用户",
      "avatar": null,
      "createdAt": "2024-01-15T11:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5
  }
}
```

**业务逻辑：**
- 按 `createdAt` 升序排列（先发布的在前）

**前端调用：** 无（评论功能前端未集成）

---

### POST /api/wall/:postId/comments

**功能：** 添加评论

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `postId`: 帖子 ID

**请求 Body：**
```json
{
  "openid": "string",          // 必填，用户 openid
  "content": "string",          // 必填，评论内容
  "isAnonymous": true           // 选填，是否匿名，默认 true
}
```

**响应 (200 / 400 / 403 / 404)：**
```json
// 成功
{
  "success": true,
  "comment": {
    "id": "comment_cuid",
    "content": "这个梦好有意思！",
    "isAnonymous": true,
    "nickname": "匿名用户",
    "avatar": null,
    "createdAt": "2024-01-15T11:00:00.000Z"
  }
}

// 缺少参数
{
  "success": false,
  "reason": "缺少必要参数"
}

// 评论过长
{
  "success": false,
  "reason": "评论字数不超过500"
}
```

**业务逻辑：**
1. 验证 Token 用户与 openid 匹配
2. 验证内容长度不超过 500 字
3. 验证帖子存在
4. 保存评论，累加帖子的 commentCount

**前端调用：** 无（评论功能前端未集成）

---

## DreamWall 页面功能结构

```
梦墙页面
├── 全部 (all)
│   └── 加载更多
├── 本周精选 (featured)
│   └── 加载更多
└── 我的发布 (my)
    └── 查看自己发布的帖子

帖子卡片
├── 点击卡片 → 跳转故事页
├── 点赞按钮 → toggleLike
├── 评论按钮 → (未集成)
└── 复制按钮 → 复制标题+摘要到剪贴板
```

---

## 数据库模型

```prisma
model DreamWall {
  id           String   @id @default(cuid())
  sessionId    String   @unique  // 关联原始故事
  openid       String
  nickname     String?  // 发布时快照
  avatar       String?
  storyTitle   String
  storySnippet String   // 故事摘要（前200字）
  storyFull    String   // 完整故事内容
  isAnonymous  Boolean  @default(true)
  visibility   String   @default("public") // public, private
  status       String   @default("pending") // pending, approved, rejected
  likeCount    Int      @default(0)
  commentCount Int      @default(0)
  isFeatured   Boolean  @default(false)
  featuredAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User      @relation("WallPosts", fields: [openid], references: [openid])
  likes        DreamWallLike[]
  comments     DreamWallComment[]

  @@index([openid])
  @@index([status, visibility])
  @@index([isFeatured, createdAt])
}

model DreamWallLike {
  id        String   @id @default(cuid())
  wallId    String
  openid    String
  createdAt DateTime @default(now())

  wall      DreamWall @relation(fields: [wallId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [openid], references: [openid])

  @@unique([wallId, openid])
  @@index([wallId])
}

model DreamWallComment {
  id         String   @id @default(cuid())
  wallId     String
  openid     String
  nickname   String?
  avatar     String?
  content    String
  isAnonymous Boolean @default(true)
  createdAt  DateTime @default(now())

  wall       DreamWall @relation(fields: [wallId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [openid], references: [openid])

  @@index([wallId])
}
```

---

## 内容审核机制

发布时自动进行内容安全检查：

```javascript
const blockedPatterns = [
  /[0-9]{11,}/,  // 手机号（11位以上数字）
  /[0-9]{15,}/,  // 身份证号（15位以上数字）
]
```

- 检查故事标题和完整内容的拼接文本
- 包含敏感信息 → `status: 'pending'`
- 无敏感信息 → `status: 'approved'`

---

## 相关文件

- `server/src/routes/dreamWall.js` - 路由定义
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（wallApi 对象）
- `src/pages/DreamWall.tsx` - 梦墙页面
- `src/pages/Story.tsx` - 故事页（发布入口）
