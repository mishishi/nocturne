# 好友 API (friend)

## 概述

好友模块管理用户之间的好友关系，包括添加、接受/拒绝请求、搜索、拉黑等功能。

### 好友状态

| 状态 | 说明 |
|------|------|
| `PENDING` | 待处理请求 |
| `ACCEPTED` | 已是好友 |
| `BLOCKED` | 已拉黑 |

---

## 端点详情

### POST /api/friends/add

**功能：** 发送好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "userId": "string",    // 必填，发送请求的用户 openid
  "friendId": "string"   // 必填，目标用户 openid
}
```

**响应 (200 / 400 / 403)：**
```json
// 成功
{
  "success": true
}

// 不能添加自己
{
  "success": false,
  "reason": "不能添加自己为好友"
}

// 已是好友
{
  "success": false,
  "reason": "已经是好友了"
}

// 已发送过请求
{
  "success": false,
  "reason": "已发送过好友请求"
}
```

**业务逻辑：**
1. 不能添加自己
2. 检查是否已是好友或有待处理请求
3. 创建 PENDING 状态的 Friend 记录

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleAddFriend()` | 点击搜索结果中的"添加"按钮 |

**前端代码位置：** `src/pages/Friends.tsx:82`

```typescript
const result = await friendApi.addFriend(userId, friendId)
```

---

### POST /api/friends/accept

**功能：** 接受好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "userId": "string",    // 必填，接受请求的用户 openid
  "friendId": "string"   // 必填，发送请求的用户 openid
}
```

**响应 (200 / 400)：**
```json
// 成功
{
  "success": true
}

// 没有待处理请求
{
  "success": false,
  "reason": "没有待处理的好友请求"
}
```

**业务逻辑：**
1. 找到对方发来的 PENDING 请求
2. 更新请求状态为 ACCEPTED
3. 创建双向好友关系（如果反向记录不存在）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleAcceptRequest()` | 点击收到的请求卡片上的"接受"按钮 |

**前端代码位置：** `src/pages/Friends.tsx:105`

```typescript
const result = await friendApi.acceptFriend(userId, friendId)
```

---

### POST /api/friends/reject

**功能：** 拒绝或取消好友请求

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "userId": "string",    // 必填，当前用户 openid
  "friendId": "string"   // 必填，对方的 openid
}
```

**响应 (200 / 400)：**
```json
{
  "success": true
}
```

**业务逻辑：**
- 删除待处理的好友请求记录
- 用于：我收到的请求（拒绝） 或 我发出的请求（取消）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleRejectRequest()` | 点击"拒绝"按钮（收到的请求）或"取消"按钮（发出的请求） |

**前端代码位置：** `src/pages/Friends.tsx:128`

```typescript
const result = await friendApi.rejectFriend(userId, friendId)
```

---

### POST /api/friends/remove

**功能：** 删除好友或解除拉黑

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "userId": "string",    // 必填，当前用户 openid
  "friendId": "string"   // 必填，要删除的好友 openid
}
```

**响应 (200)：**
```json
{
  "success": true
}
```

**业务逻辑：**
- 删除双向好友关系记录
- 也可用于解除拉黑（会同时删除 BLOCKED 记录）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleRemoveFriend()` | 点击好友列表中好友卡片上的 X 按钮 |

**前端代码位置：** `src/pages/Friends.tsx:146`

```typescript
const result = await friendApi.removeFriend(userId, friendId)
```

---

### GET /api/friends/list/:userId

**功能：** 获取好友列表

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `userId`: 用户 openid

**响应 (200)：**
```json
{
  "success": true,
  "friends": [
    {
      "id": "friend_record_id",
      "friendId": "friend_openid",
      "nickname": "好友昵称",
      "avatar": "头像URL",
      "isMember": true,
      "memberSince": "2024-01-01T00:00:00.000Z",
      "friendsSince": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**业务逻辑：**
- 查询状态为 ACCEPTED 的双向记录
- 返回好友的用户信息快照

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadFriends()` | Friends 页面加载时 |

**前端代码位置：** `src/pages/Friends.tsx:30`

```typescript
const result = await friendApi.getFriends(userId)
```

---

### GET /api/friends/requests/:userId

**功能：** 获取待处理的好友请求

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `userId`: 用户 openid

**响应 (200)：**
```json
{
  "success": true,
  "received": [
    {
      "id": "request_id",
      "fromId": "requester_openid",
      "nickname": "请求者昵称",
      "avatar": "头像URL",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "sent": [
    {
      "id": "request_id",
      "toId": "receiver_openid",
      "nickname": "接收者昵称",
      "avatar": "头像URL",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `loadPendingRequests()` | Friends 页面加载时 |

**前端代码位置：** `src/pages/Friends.tsx:42`

```typescript
const result = await friendApi.getPendingRequests(userId)
```

---

### POST /api/friends/block

**功能：** 拉黑用户

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "userId": "string",      // 必填，当前用户 openid
  "blockedId": "string"    // 必填，要拉黑的用户 openid
}
```

**响应 (200)：**
```json
{
  "success": true
}
```

**业务逻辑：**
1. 删除现有的好友关系（如果有）
2. 创建 BLOCKED 状态的 Friend 记录

**前端调用：** 无（未集成）

---

### GET /api/friends/search

**功能：** 搜索用户

**需要认证：** **是**（需 Bearer Token）

**Query 参数：**
- `query`: 搜索关键词（昵称或手机号）
- `excludeId`: 排除的用户 openid（选填）

**响应 (200)：**
```json
{
  "success": true,
  "users": [
    {
      "id": "user_openid",
      "nickname": "用户昵称",
      "avatar": "头像URL",
      "isMember": true
    }
  ]
}
```

**业务逻辑：**
- 搜索昵称或手机号包含关键词的用户
- 至少 2 个字符才执行搜索
- 返回最多 20 条结果
- 排除指定用户（用于搜索时排除自己）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Friends.tsx` | `handleSearch()` | 在搜索框输入内容时（防抖 300ms） |

**前端代码位置：** `src/pages/Friends.tsx:66`

```typescript
const result = await friendApi.searchUsers(query, excludeId)
```

---

### GET /api/friends/count/:userId

**功能：** 获取好友数量

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `userId`: 用户 openid

**响应 (200)：**
```json
{
  "success": true,
  "count": 15
}
```

**前端调用：** 无（未集成）

---

## Friends 页面功能结构

```
Friends 页面
├── 搜索用户 (searchUsers)
│   └── 添加好友 (addFriend)
├── 收到的请求 (received)
│   ├── 接受 (acceptFriend)
│   └── 拒绝 (rejectFriend)
├── 发出的请求 (sent)
│   └── 取消 (rejectFriend)
└── 好友列表 (friends)
    └── 删除 (removeFriend)
```

---

## 数据库模型

```prisma
model Friend {
  id        String   @id @default(cuid())
  userId    String   // 发起方 openid
  friendId  String   // 接收方 openid
  status    String   @default("PENDING") // PENDING, ACCEPTED, BLOCKED
  createdAt DateTime @default(now())

  @@unique([userId, friendId])
}

model User {
  // ...
  friends   Friend[] @relation("UserFriends")
  friendOf  Friend[] @relation("FriendOf")
}
```

---

## 好友关系数据存储方式

好友关系使用单表自关联，通过 `userId` 和 `friendId` 两个字段记录方向性：

- A 添加 B：创建一条 `{ userId: A, friendId: B, status: PENDING }`
- B 接受 A：更新该记录为 ACCEPTED，并创建反向记录 `{ userId: B, friendId: A, status: ACCEPTED }`

这样设计使得：
1. 可以区分"我发起的请求"和"我收到的请求"
2. 双向查询好友列表只需查询 ACCEPTED 状态

---

## 相关文件

- `server/src/routes/friends.js` - 路由定义
- `server/src/services/friendService.js` - 业务逻辑
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（friendApi 对象）
- `src/pages/Friends.tsx` - 好友页面
