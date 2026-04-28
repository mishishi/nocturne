# 好友 API (friend)

## 概述

好友模块管理用户之间的好友关系，包括发送请求、接受/拒绝、查看好友帖子等功能。

### 好友状态

| 状态 | 说明 |
|------|------|
| `PENDING` | 待处理请求 |
| `ACCEPTED` | 已是好友 |

---

## 端点详情

### POST /api/friends/request

**功能：** 发送好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "friendOpenid": "string"   // 必填，目标用户 openid
}
```

**响应 (200 / 400 / 403 / 409)：**
```json
// 成功
{
  "success": true,
  "requestId": "friend_record_id",
  "message": "好友请求已发送"
}

// 不能添加自己
{
  "success": false,
  "reason": "不能添加自己为好友"
}

// 用户不存在
{
  "success": false,
  "reason": "用户不存在"
}

// 已是好友或已有请求
{
  "success": false,
  "reason": "你们已经是好友或已有待处理请求"
}
```

**业务逻辑：**
1. 不能添加自己
2. 检查是否已是好友或有待处理请求（双向检查）
3. 创建 PENDING 状态的 Friend 记录

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleAddFriend()` | 点击搜索结果中的"添加"按钮 |

---

### POST /api/friends/accept

**功能：** 接受好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "requestId": "string"   // 必填，好友请求记录 ID
}
```

**响应 (200 / 400 / 404)：**
```json
// 成功
{
  "success": true,
  "message": "已添加好友"
}

// 缺少 requestId
{
  "success": false,
  "reason": "缺少 requestId"
}

// 请求不存在或已处理
{
  "success": false,
  "reason": "好友请求不存在或已处理"
}
```

**业务逻辑：**
1. 验证请求是否存在且属于当前用户（friendId = 当前用户, status = PENDING）
2. 更新请求状态为 ACCEPTED
3. 创建反向的 ACCEPTED 记录（双向好友）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleAcceptRequest()` | 点击收到的请求卡片上的"接受"按钮 |

---

### POST /api/friends/reject

**功能：** 拒绝好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "requestId": "string"   // 必填，好友请求记录 ID
}
```

**响应 (200 / 400 / 404)：**
```json
// 成功
{
  "success": true,
  "message": "已拒绝请求"
}

// 请求不存在或已处理
{
  "success": false,
  "reason": "好友请求不存在或已处理"
}
```

**业务逻辑：**
1. 验证请求是否存在且属于当前用户
2. 删除该 PENDING 记录

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleRejectRequest()` | 点击"拒绝"按钮 |

---

### DELETE /api/friends/:friendOpenid

**功能：** 删除好友

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `friendOpenid`: 好友的 openid

**响应 (200 / 400 / 404)：**
```json
// 成功
{
  "success": true,
  "message": "已删除好友"
}

// 用户不存在
{
  "success": false,
  "reason": "用户不存在"
}
```

**业务逻辑：**
1. 删除双向好友关系记录（userId ↔ friendId 两边的记录都删）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleRemoveFriend()` | 点击好友列表中好友卡片上的删除按钮 |

---

### GET /api/friends

**功能：** 获取好友列表

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true,
  "friends": [
    {
      "id": "friend_record_id",
      "openid": "friend_openid",
      "nickname": "好友昵称",
      "avatar": "头像URL或null",
      "friendSince": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**业务逻辑：**
- 查询当前用户的 ACCEPTED 记录，返回好友的用户信息

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadFriends()` | Friends 页面加载时（我的好友 Tab） |

---

### GET /api/friends/requests

**功能：** 获取收到的待处理好友请求

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true,
  "requests": [
    {
      "id": "request_id",
      "openid": "请求者openid",
      "nickname": "请求者昵称",
      "avatar": "头像URL或null",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**业务逻辑：**
- 查询 friendId = 当前用户且 status = PENDING 的记录
- 返回发送请求的用户信息

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadPendingRequests()` | Friends 页面加载时（收到的请求 Tab） |

---

### GET /api/friends/sent

**功能：** 获取发出的好友请求

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true,
  "sentRequests": [
    {
      "id": "request_id",
      "openid": "接收者openid",
      "nickname": "接收者昵称",
      "avatar": "头像URL或null",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**业务逻辑：**
- 查询 userId = 当前用户且 status = PENDING 的记录
- 返回接收请求的用户信息

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadSentRequests()` | Friends 页面加载时（发出的请求 Tab） |

---

### GET /api/friends/:openid/posts

**功能：** 获取好友的公开帖子

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `openid`: 好友的 openid

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `limit` | number | `10` | 每页数量 |

**响应 (200 / 403 / 404)：**
```json
// 成功
{
  "success": true,
  "posts": [
    {
      "id": "post_cuid",
      "sessionId": "session_cuid",
      "storyTitle": "飞翔的梦",
      "storySnippet": "我梦见自己在天空中飞翔...",
      "nickname": "好友昵称",
      "avatar": "头像URL或null",
      "likeCount": 12,
      "commentCount": 3,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}

// 不是好友
{
  "success": false,
  "reason": "你们不是好友关系"
}
```

**业务逻辑：**
1. 验证请求者与该 openid 是好友关系
2. 查询该用户公开且已审核的帖子

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadFriendPosts()` | 点击好友卡片时 |

---

## Friends 页面功能结构

```
Friends 页面
├── 搜索用户
│   └── 发送请求 (POST /friends/request)
├── 收到的请求 (GET /friends/requests)
│   ├── 接受 (POST /friends/accept)
│   └── 拒绝 (POST /friends/reject)
├── 发出的请求 (GET /friends/sent)
│   └── （无取消功能）
└── 好友列表 (GET /friends)
    ├── 查看好友帖子 (GET /friends/:openid/posts)
    └── 删除好友 (DELETE /friends/:friendOpenid)
```

---

## 数据库模型

```prisma
model Friend {
  id        String   @id @default(cuid())
  userId    String   // 发起方用户 ID（prisma id，非 openid）
  friendId  String   // 接收方用户 ID（prisma id，非 openid）
  status    String   @default("PENDING") // PENDING, ACCEPTED
  createdAt DateTime @default(now())

  @@unique([userId, friendId])
}

model User {
  id        String @id @default(cuid())
  openid    String @unique  // 微信 openid
  // ...
}
```

**注意：** Friend 表存储的是 prisma User id，不是 openid。前端交互使用 openid，后端自动转换为 id。

---

## 相关文件

- `server/src/routes/friends.js` - 路由定义
- `server/src/services/authService.js` - 用户服务
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（friendApi 对象）
- `src/pages/Friends.tsx` - 好友页面
