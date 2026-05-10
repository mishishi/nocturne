# 通知 API (notifications)

## 概述

通知中心用于提醒用户关于其内容收到的互动，包括点赞、评论、好友请求等事件。用户可以查看通知列表、获取未读数量、标记已读。

### 通知类型

| 类型 | 说明 |
|------|------|
| `LIKE` | 有人点赞了你的故事 |
| `COMMENT` | 有人评论了你的故事 |
| `FRIEND_REQUEST` | 有人向你发送了好友请求 |
| `FRIEND_ACCEPTED` | 你的好友请求被接受 |

---

## 端点详情

### GET /api/v1/notifications

**功能：** 获取通知列表

**需要认证：** **是**（需 Bearer Token）

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | `1` | 页码 |
| `limit` | number | `20` | 每页数量 |

**响应 (200)：**
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
    },
    {
      "id": "notif_cuid2",
      "type": "COMMENT",
      "fromOpenid": "user_yyy",
      "fromNickname": "星空漫步者",
      "targetId": "post_cuid",
      "targetTitle": "飞翔的梦",
      "message": "星空漫步者 评论了你的故事《飞翔的梦》",
      "isRead": true,
      "createdAt": "2024-01-15T09:00:00.000Z"
    },
    {
      "id": "notif_cuid3",
      "type": "FRIEND_REQUEST",
      "fromOpenid": "user_zzz",
      "fromNickname": "梦境探险家",
      "targetId": null,
      "targetTitle": null,
      "message": "梦境探险家 向你发送了好友请求",
      "isRead": false,
      "createdAt": "2024-01-15T08:00:00.000Z"
    },
    {
      "id": "notif_cuid4",
      "type": "FRIEND_ACCEPTED",
      "fromOpenid": "user_aaa",
      "fromNickname": "追梦少年",
      "targetId": null,
      "targetTitle": null,
      "message": "追梦少年 接受了你的好友请求",
      "isRead": true,
      "createdAt": "2024-01-15T07:00:00.000Z"
    }
  ],
  "unreadCount": 2,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 4,
    "hasMore": false
  }
}
```

**业务逻辑：**
1. 验证用户认证
2. 查询该用户的所有通知，按 `createdAt` 降序排列
3. 计算未读通知数量（`isRead` 为 false）
4. 返回分页结果

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Notifications.tsx` | `loadNotifications()` | 进入通知页面时 |
| `src/pages/Notifications.tsx` | `handleLoadMore()` | 点击"加载更多"时 |

---

### GET /api/v1/notifications/unread-count

**功能：** 获取未读通知数量

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true,
  "unreadCount": 5
}
```

**业务逻辑：**
1. 验证用户认证
2. 统计该用户 `isRead` 为 false 的通知数量

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Notifications.tsx` | `checkUnreadCount()` | 页面加载时 |
| `src/components/Header.tsx` | `loadUnreadCount()` | 每次进入应用时 |

---

### POST /api/v1/notifications/mark-read

**功能：** 将所有通知标记为已读

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true
}
```

**业务逻辑：**
1. 验证用户认证
2. 将该用户所有 `isRead` 为 false 的通知更新为已读

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Notifications.tsx` | `handleMarkAllRead()` | 点击"全部已读"按钮 |

---

### POST /api/v1/notifications/:notificationId/read

**功能：** 将单条通知标记为已读

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `notificationId`: 通知 ID

**响应 (200)：**
```json
{
  "success": true
}
```

**响应 (404)：**
```json
{
  "success": false,
  "reason": "通知不存在"
}
```

**业务逻辑：**
1. 验证用户认证
2. 检查通知是否存在且属于当前用户
3. 将该通知的 `isRead` 更新为 true

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Notifications.tsx` | `handleNotificationClick()` | 点击某条通知时 |

---

## 数据库模型

```prisma
model Notification {
  id          String   @id @default(cuid())
  openid      String   // 通知接收者
  type        String   // LIKE, COMMENT, FRIEND_REQUEST, FRIEND_ACCEPTED
  fromOpenid  String   // 触发通知的用户
  targetId    String?  // 关联目标（如帖子ID）
  targetTitle String?  // 关联目标标题
  message     String   // 通知消息内容
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  user        User @relation("Notifications", fields: [openid], references: [openid])

  @@index([openid, createdAt])
  @@index([openid, isRead])
}
```

---

## 消息生成规则

通知消息由后端在创建通知时生成：

| 类型 | 消息模板 |
|------|----------|
| `LIKE` | `{fromNickname} 点赞了你的故事《{targetTitle}》` |
| `COMMENT` | `{fromNickname} 评论了你的故事《{targetTitle}》` |
| `FRIEND_REQUEST` | `{fromNickname} 向你发送了好友请求` |
| `FRIEND_ACCEPTED` | `{fromNickname} 接受了你的好友请求` |

---

## 相关文件

- `server/src/routes/notifications.js` - 路由定义
- `server/src/services/notificationService.js` - 通知创建服务（含推送发送）
- `server/src/services/pushService.js` - Web Push 发送服务
- `server/src/routes/push.js` - 推送订阅路由
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（notificationsApi 对象）
- `src/hooks/usePushNotification.ts` - 前端推送订阅 Hook
- `src/pages/Notifications.tsx` - 通知中心页面

---

## 推送订阅 API (Push Subscription)

### 概述

Web Push 通知允许用户通过浏览器接收实时推送通知。用户订阅后，可在浏览器即使关闭的情况下收到通知提醒。

### VAPID 配置

服务端需要配置 VAPID 密钥（在 `server/.env` 中）：

```bash
# 生成 VAPID 密钥
node -e "const webpush = require('web-push'); console.log(webpush.generateVapidKeys())"

# .env 配置
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:admin@yeelin.app
```

### 端点详情

### POST /api/push/subscribe

**功能：** 订阅推送通知

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BIPrp12-jzAIi...",
    "auth": "4gbM..."
  }
}
```

**响应 (200)：**
```json
{
  "success": true,
  "message": "订阅成功"
}
```

**响应 (400)：**
```json
{
  "success": false,
  "reason": "缺少订阅信息",
  "code": "INVALID_SUBSCRIPTION"
}
```

**业务逻辑：**
1. 验证用户认证
2. 解析请求中的 Web Push 订阅信息（endpoint、keys）
3. Upsert 订阅记录（已存在则更新，不存在则创建）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/hooks/usePushNotification.ts` | `subscribeToPush()` | 用户开启通知权限时 |

---

### POST /api/push/unsubscribe

**功能：** 取消订阅推送通知

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**响应 (200)：**
```json
{
  "success": true,
  "message": "取消订阅成功"
}
```

**业务逻辑：**
1. 验证用户认证
2. 删除指定端点的订阅记录

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/hooks/usePushNotification.ts` | `unsubscribeFromPush()` | 用户关闭通知权限时 |

---

### POST /api/push/test

**功能：** 发送测试推送通知

**需要认证：** **是**（需 Bearer Token）

**请求 Body：** 无

**响应 (200)：**
```json
{
  "success": true,
  "message": "测试通知已发送"
}
```

**响应 (404)：**
```json
{
  "success": false,
  "reason": "未找到订阅或发送失败",
  "code": "SUBSCRIPTION_NOT_FOUND"
}
```

**业务逻辑：**
1. 验证用户认证
2. 获取用户的推送订阅
3. 发送测试推送（标题：✨ 夜棂测试通知，内容：恭喜！你的推送通知已配置成功）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Notifications.tsx` | `handleTestPush()` | 测试推送按钮点击 |

---

### GET /api/push/status

**功能：** 获取推送订阅状态

**需要认证：** **是**（需 Bearer Token）

**响应 (200)：**
```json
{
  "success": true,
  "subscribed": true,
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**业务逻辑：**
1. 验证用户认证
2. 查询用户是否有有效的推送订阅
3. 返回订阅状态和端点信息

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/hooks/usePushNotification.ts` | `checkSubscription()` | 初始化时检查订阅状态 |

---

## 推送通知触发场景

推送通知在以下场景自动触发：

| 事件 | 通知标题 | 目标页面 |
|------|----------|----------|
| 收到好友请求 | 新的好友请求 | /friends |
| 好友申请被接受 | 好友申请已通过 | /friends |
| 帖子被点赞 | 收到点赞 | /story/{postId} |
| 帖子被评论 | 收到评论 | /story/{postId} |

---

## 数据库模型

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  openid    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [openid], references: [openid], onDelete: Cascade)

  @@index([openid])
}
```

---

## Service Worker 推送处理

`public/sw.js` 中已实现 push 事件监听：

```javascript
self.addEventListener('push', (event) => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: data.data,
    actions: [
      { action: 'open', title: '查看' },
      { action: 'dismiss', title: '忽略' }
    ]
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})
```
