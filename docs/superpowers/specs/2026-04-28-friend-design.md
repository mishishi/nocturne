# 好友系统设计

> **For agentic workers:** Implementation uses superpowers:subagent-driven-development workflow.

**Goal:** 实现好友关系系统，支持好友请求、好友列表和好友内容发现

**Architecture:**
- 数据库：在 `Friend` 模型扩展状态机（PENDING/ACCEPTED/BLOCKED）
- 后端：好友请求 API、好友列表 API、好友主页 API
- 前端：好友管理页面、好友请求通知

**Tech Stack:** React, CSS Modules, Prisma, Fastify

---

## 数据库设计

### 扩展 Friend 模型

现有模型：
```prisma
model Friend {
  id        String   @id @default(cuid())
  userId    String
  friendId  String
  status    String   @default("PENDING") // PENDING, ACCEPTED, BLOCKED
  createdAt DateTime @default(now())
  user      User     @relation("UserFriends", fields: [userId], references: [id], onDelete: Cascade)
  friend    User     @relation("FriendOf", fields: [friendId], references: [id], onDelete: Cascade)

  @@unique([userId, friendId])
}
```

**约束：**
- `PENDING` - 待接受的好友请求
- `ACCEPTED` - 已接受的好友关系
- `BLOCKED` - 已拉黑（单方面屏蔽）
- 不能重复发送请求（同一用户对同一用户只能有一条 PENDING 记录）
- 删除好友 = 将状态改为 BLOCKED 或直接删除记录

---

## API 设计

### POST /api/friends/request

发送好友请求。

**Request:**
```json
{
  "friendOpenid": "user_openid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "好友请求已发送"
}
```

**约束：**
- 不能给自己发请求
- 不能重复发送请求（已存在 PENDING 或 ACCEPTED 记录返回错误）
- 需要登录

---

### POST /api/friends/accept

接受好友请求。

**Request:**
```json
{
  "requestId": "friend_record_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "已添加好友"
}
```

**约束：**
- 只有收到请求的一方（friendId = 当前用户）可以接受
- 接受后创建双向好友关系（两条记录）

---

### POST /api/friends/reject

拒绝好友请求。

**Request:**
```json
{
  "requestId": "friend_record_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "已拒绝请求"
}
```

---

### DELETE /api/friends/:friendOpenid

删除好友（单方面删除）。

**Response:**
```json
{
  "success": true,
  "message": "已删除好友"
}
```

**约束：**
- 删除的是双向好友关系（删除两条记录）
- 需要登录

---

### GET /api/friends

获取好友列表。

**Response:**
```json
{
  "success": true,
  "friends": [
    {
      "id": "xxx",
      "openid": "user_openid",
      "nickname": "昵称",
      "avatar": "https://...",
      "friendSince": "2026-04-28T10:00:00Z"
    }
  ]
}
```

---

### GET /api/friends/requests

获取收到的待处理好友请求。

**Response:**
```json
{
  "success": true,
  "requests": [
    {
      "id": "xxx",
      "openid": "user_openid",
      "nickname": "昵称",
      "avatar": "https://...",
      "createdAt": "2026-04-28T10:00:00Z"
    }
  ]
}
```

---

### GET /api/friends/:openid/posts

获取好友的公开分享（好友主页）。

**Query:** `?page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "posts": [...],
  "pagination": { "page": 1, "limit": 10, "total": 100 }
}
```

**约束：**
- 只能查看 ACCEPTED 状态的好友
- 只返回 visibility='public' 且 status='approved' 的帖子

---

## 前端页面

### 好友列表页 (/friends)

- 顶部：好友数量统计
- 搜索框：按昵称搜索好友
- 好友卡片列表：头像、昵称、添加日期
- 点击进入好友主页

### 好友请求 Tab

- 待处理请求列表
- 接受/拒绝按钮
- 请求发送者头像、昵称、申请时间

### 好友主页 (/friends/:openid)

- 好友信息（头像、昵称）
- 好友的公开帖子列表
- 返回按钮

---

## 交互流程

1. 用户 A 在某处看到用户 B，想要添加好友
2. A 点击"添加好友" → 发送请求
3. B 收到通知（红点/消息）
4. B 在好友请求页看到 A 的请求
5. B 点击"接受" → 双方成为好友
6. 之后双方可以在好友列表看到彼此

---

## 文件变更

### 数据库
- `server/prisma/schema.prisma` - 无需修改，现有的 Friend 模型已支持

### 后端
- `server/src/routes/friends.js` (新建) - 好友相关 API
- `server/src/routes/storyFeedback.js` - 已有无需修改

### 前端
- `src/services/api.ts` - 添加好友 API 方法
- `src/pages/Friends.tsx` (新建) - 好友列表页
- `src/pages/FriendProfile.tsx` (新建) - 好友主页
- `src/components/FriendRequestButton.tsx` (新建) - 添加好友按钮
