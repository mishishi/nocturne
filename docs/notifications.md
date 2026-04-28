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

### GET /api/notifications

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

### GET /api/notifications/unread-count

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

### POST /api/notifications/mark-read

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

### POST /api/notifications/:notificationId/read

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
- `server/src/services/notifications.js` - 业务逻辑
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（notificationsApi 对象）
- `src/pages/Notifications.tsx` - 通知中心页面
