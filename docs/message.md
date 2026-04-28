# 私信消息 API

> 异步私信系统，支持好友之间发送消息（非实时聊天）。

---

## 端点一览

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/messages/conversations` | GET | 获取会话列表 | **是** |
| `/api/messages/:friendOpenid` | GET | 获取与好友的消息历史 | **是** |
| `/api/messages` | POST | 发送消息 | **是** |
| `/api/messages/:messageId/read` | POST | 标记消息为已读 | **是** |

---

## 业务规则

1. **好友限制**：只有好友关系（ACCEPTED 状态）才能互相发送消息
2. **发送者身份**：发送者的 openid 从认证 Token 中获取
3. **消息存储**：消息存储在 Message 表中，通过 fromOpenid 和 toOpenid 索引

---

## GET /api/messages/conversations

**功能：** 获取当前用户的所有会话列表，每个会话显示最新一条消息和未读数

**需要认证：** 是

**请求：**
无参数

**响应 (200)：**
```json
{
  "success": true,
  "conversations": [
    {
      "friendOpenid": "openid_xxx",
      "friendNickname": "好友昵称",
      "friendAvatar": "头像URL",
      "lastMessage": {
        "id": "msg_xxx",
        "content": "消息内容",
        "fromOpenid": "openid_xxx",
        "createdAt": "2026-04-28T10:00:00.000Z",
        "isRead": false
      },
      "unreadCount": 3
    }
  ]
}
```

**业务逻辑：**
1. 获取当前用户的所有 ACCEPTED 好友关系
2. 对每个好友查询最新一条消息（按 createdAt 倒序取第一条）
3. 统计每个好友发来的未读消息数
4. 按最后消息时间排序

---

## GET /api/messages/:friendOpenid

**功能：** 获取与指定好友的消息历史记录

**需要认证：** 是

**路径参数：**
- `friendOpenid` - 好友的 openid

**Query 参数：**
- `page` - 页码（默认 1）
- `limit` - 每页数量（默认 50）

**响应 (200)：**
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_xxx",
      "fromOpenid": "openid_a",
      "toOpenid": "openid_b",
      "content": "消息内容",
      "isRead": true,
      "createdAt": "2026-04-28T10:00:00.000Z",
      "isMine": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

**业务逻辑：**
1. 验证目标用户是否存在
2. 验证发送者与目标用户是否为好友（ACCEPTED 状态）
3. 查询双方之间的所有消息，按 createdAt 升序排列
4. 返回时添加 `isMine` 字段标识是否为自己发送

**错误响应：**
- 403：`{ success: false, reason: "你们不是好友关系" }`
- 404：`{ success: false, reason: "用户不存在" }`

---

## POST /api/messages

**功能：** 向指定好友发送消息

**需要认证：** 是

**请求 Body：**
```json
{
  "toOpenid": "openid_xxx",
  "content": "消息内容"
}
```

**响应 (200)：**
```json
{
  "success": true,
  "message": {
    "id": "msg_xxx",
    "fromOpenid": "openid_a",
    "toOpenid": "openid_b",
    "content": "消息内容",
    "isRead": false,
    "createdAt": "2026-04-28T10:00:00.000Z",
    "isMine": true
  }
}
```

**业务逻辑：**
1. 验证收件人存在
2. 验证发送者与收件人为好友关系
3. 验证消息内容非空
4. 创建消息记录

**错误响应：**
- 400：`{ success: false, reason: "消息内容不能为空" }`
- 400：`{ success: false, reason: "不能给自己发消息" }`
- 403：`{ success: false, reason: "你们不是好友关系" }`
- 404：`{ success: false, reason: "用户不存在" }`

---

## POST /api/messages/:messageId/read

**功能：** 标记指定消息为已读

**需要认证：** 是

**路径参数：**
- `messageId` - 消息 ID

**响应 (200)：**
```json
{
  "success": true
}
```

**业务逻辑：**
1. 验证消息存在
2. 验证当前用户是消息的接收者（toOpenid）
3. 更新 isRead 为 true

**错误响应：**
- 403：`{ success: false, reason: "无法标记该消息为已读" }`
- 404：`{ success: false, reason: "消息不存在" }`

---

## 数据库模型

```prisma
model Message {
  id          String   @id @default(cuid())
  fromOpenid  String
  toOpenid    String
  content     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@index([toOpenid, createdAt])
  @@index([fromOpenid, toOpenid])
}
```

---

## 前端调用

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Chat.tsx` | `loadConversations()` | 页面加载时 |
| `src/pages/Chat.tsx` | `loadMessages()` | 选择会话时 |
| `src/pages/Chat.tsx` | `handleSend()` | 点击发送按钮时 |
| `src/pages/Chat.tsx` | `markRead()` | 查看消息时自动调用 |
| `src/pages/FriendProfile.tsx` | navigate to `/chat?openid=...` | 点击发消息按钮时 |
