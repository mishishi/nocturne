# 通知中心设计方案

## 概述

通知中心用于实时触达用户互动反馈，提升用户回访率和留存。用户在故事、好友等场景产生互动时，生成通知推送给内容作者。

## 通知类型

| 类型 | 触发场景 | 通知内容示例 |
|------|----------|--------------|
| `LIKE` | 他人点赞我的故事 | "梦境旅人1234 点赞了你的故事《飞翔的梦》" |
| `COMMENT` | 他人评论我的故事 | "梦境旅人5678 评论了你的故事" |
| `FRIEND_REQUEST` | 他人申请加我为好友 | "梦境旅人9999 申请加你为好友" |
| `FRIEND_ACCEPTED` | 好友申请被通过 | "梦境旅人8888 已通过你的好友申请" |

## 核心设计决策

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 实时性 | 拉取刷新 | 用户打开APP时主动拉取，不做推送/轮询 |
| 已读计数 | 快照计数 | User表新增 `lastViewedNotificationsAt`，红点消失即"已读" |
| 保留策略 | 30天 | 超过30天的通知自动清理 |
| 点击跳转 | 场景化 | 点赞/评论→故事详情，好友→好友页面 |

## 数据模型

```prisma
model Notification {
  id          String   @id @default(cuid())
  openid      String   // 接收通知的用户
  type        String   // LIKE | COMMENT | FRIEND_REQUEST | FRIEND_ACCEPTED
  fromOpenid  String   // 触发通知的用户
  fromNickname String  // 触发通知的用户昵称（快照）
  targetId    String?  // 关联目标ID（如故事ID、好友请求ID）
  targetTitle String?  // 关联目标标题（如故事标题）
  message     String   // 通知文案
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
  expiresAt   DateTime // 30天后过期

  user        User     @relation("Notifications", fields: [openid], references: [openid])
  fromUser    User     @relation("NotificationFrom", fields: [fromOpenid], references: [openid])

  @@index([openid, createdAt])
  @@index([openid, isRead])
  @@index([expiresAt])
}

model User {
  // ... existing fields
  lastViewedNotificationsAt DateTime?
  notifications Notification[] @relation("Notifications")
}
```

**注意**：`expiresAt` 字段用于定时清理，可通过数据库定时任务或应用层定期删除。

## API 设计

### GET /api/notifications

**功能**：获取通知列表

**需要认证**：**是**

**Query 参数**：
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `limit` | number | 20 | 每页数量 |

**响应 (200)**：
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif_cuid",
      "type": "LIKE",
      "fromOpenid": "user_xxx",
      "fromNickname": "梦境旅人1234",
      "targetId": "post_cuid",
      "targetTitle": "飞翔的梦",
      "message": "梦境旅人1234 点赞了你的故事《飞翔的梦》",
      "isRead": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "unreadCount": 5,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "hasMore": false
  }
}
```

**业务逻辑**：
1. 验证 Token
2. 查询 `openid = 当前用户` 且 `createdAt > 30天前` 的通知
3. 按 `createdAt` 降序排列
4. 计算 `unreadCount`（`createdAt > lastViewedNotificationsAt` 的数量）

---

### GET /api/notifications/unread-count

**功能**：获取未读通知数（用于 Navbar badge）

**需要认证**：**是**

**响应 (200)**：
```json
{
  "success": true,
  "unreadCount": 5
}
```

---

### POST /api/notifications/mark-read

**功能**：标记通知为已读（用户进入通知列表时调用）

**需要认证**：**是**

**响应 (200)**：
```json
{
  "success": true
}
```

**业务逻辑**：更新 `User.lastViewedNotificationsAt = now()`

---

### POST /api/notifications/:notificationId/read

**功能**：标记单条通知为已读

**需要认证**：**是**

**响应 (200 / 404)**：
```json
{
  "success": true
}
```

---

## 通知触发时机

| 事件 | 触发位置 | 写入逻辑 |
|------|----------|----------|
| 点赞故事 | `POST /api/wall/:postId/like` | 写入 `LIKE` 通知 |
| 评论故事 | `POST /api/wall/:postId/comments` | 写入 `COMMENT` 通知 |
| 发送好友请求 | `POST /api/friends/request` | 写入 `FRIEND_REQUEST` 通知 |
| 接受好友请求 | `POST /api/friends/accept` | 写入 `FRIEND_ACCEPTED` 通知 |

**注意**：自己触发的事件不通知自己（如自己点赞自己的帖子）。

## 前端交互

### Navbar Badge
- 显示未读通知数红点
- 点击跳转 `/notifications` 页面

### 通知列表页面 `/notifications`
- 顶部"全部已读"按钮
- 通知卡片展示：头像 + 通知内容 + 时间
- 点击跳转到对应详情页

### 跳转映射
| type | 跳转路径 |
|------|----------|
| `LIKE` | `/story/:sessionId` |
| `COMMENT` | `/story/:sessionId` |
| `FRIEND_REQUEST` | `/friends` (定位到请求列表) |
| `FRIEND_ACCEPTED` | `/friends` |

## 清理机制

定期清理过期通知（2种方案）：
1. **数据库定时任务**：`DELETE FROM Notification WHERE expiresAt < NOW()`
2. **应用层清理**：在查询通知时顺便删除过期数据

推荐方案1，可使用 PostgreSQL 的 `pg_cron` 扩展或外部定时任务。

## 页面结构

```
通知页面 /notifications
├── 顶部栏
│   ├── 返回按钮
│   └── "全部已读" 文字按钮
└── 通知列表
    └── 通知卡片
        ├── 左侧：触发用户头像（默认匿名图标）
        ├── 中间：通知内容 + 时间
        └── 右侧：未读红点（如有）
```

---

## 尚未包含的范围

- 推送通知（FCM/APNs）
- 通知偏好设置（哪些类型通知可以关闭）
- @提及类通知
- 系统公告类通知
