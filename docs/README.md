# 夜棂 API 参考文档

> 本文档记录夜棂 APP 所有后端 API 的规格、前端调用方式和业务规则。

## 文档结构

| 模块 | 文件 | 说明 |
|------|------|------|
| 认证 | [auth.md](./auth.md) | 登录、注册、用户信息 |
| 会话/梦境 | [session.md](./session.md) | 梦境创建、问答、故事生成、解读 |
| 分享/积分 | [share.md](./share.md) | 分享奖励、积分系统、邀请好友 |
| 好友 | [friend.md](./friend.md) | 好友关系、搜索、请求管理 |
| 梦墙 | [wall.md](./wall.md) | 故事广场、点赞、评论 |
| 故事反馈 | [storyFeedback.md](./storyFeedback.md) | 故事评分、个性化推荐 |
| 通知 | [notifications.md](./notifications.md) | 通知中心、点赞、评论、好友请求 |

---

## 文档更新日志

| 日期 | 更新内容 |
|------|---------|
| 2026-04-27 | 完成 auth.md、session.md、share.md、friend.md 文档 |
| 2026-04-27 | 完成 wall.md 文档 |
| 2026-04-28 | 完成 storyFeedback.md 文档 |
| 2026-04-28 | 完成 notifications.md 文档 |
| 2026-04-28 | GET /api/wall 新增 keyword 搜索参数 |

---

## 快速索引

### 认证相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/auth/wechat` | POST | 微信登录 | 否 |
| `/api/auth/phone-login` | POST | 手机号密码登录 | 否 |
| `/api/auth/register` | POST | 注册新用户 | 否 |
| `/api/auth/update-profile` | POST | 更新用户资料 | 否 |
| `/api/auth/user/:openid` | GET | 获取用户信息 | 否 |
| `/api/auth/verify-token` | POST | 验证 Token | 否 |

### 会话/梦境相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/sessions` | POST | 创建会话 | 否 |
| `/api/sessions/:sessionId/dream` | POST | 提交梦境 | 否 |
| `/api/sessions/:sessionId/answer` | POST | 提交回答 | 否 |
| `/api/sessions/:sessionId/story` | GET | 获取故事 | 否 |
| `/api/sessions/users/:openid/history` | GET | 获取用户历史 | 否 |
| `/api/sessions/:sessionId/interpret` | POST | 生成梦境解读 | 否 |
| `/api/sessions/:sessionId/interpretation` | GET | 获取已有解读 | 否 |
| `/api/sessions/migrate` | POST | 迁移游客会话 | 否 |

### 分享/积分相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/share/log` | POST | 记录分享 | **是** |
| `/api/share/stats/:openid` | GET | 获取分享统计 | **是** |
| `/api/share/invite` | POST | 创建邀请码 | **是** |
| `/api/share/use-invite` | POST | 使用邀请码 | **是** |

### 好友相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/friends/request` | POST | 发送好友请求 | **是** |
| `/api/friends/accept` | POST | 接受好友请求 | **是** |
| `/api/friends/reject` | POST | 拒绝好友请求 | **是** |
| `/api/friends/:friendOpenid` | DELETE | 删除好友 | **是** |
| `/api/friends` | GET | 获取好友列表 | **是** |
| `/api/friends/requests` | GET | 获取收到的请求 | **是** |
| `/api/friends/sent` | GET | 获取发出的请求 | **是** |
| `/api/friends/:openid/posts` | GET | 获取好友公开帖子 | **是** |

### 梦墙相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/wall` | GET | 获取梦墙列表 | 否 |
| `/api/wall` | POST | 发布到梦墙 | **是** |
| `/api/wall/my` | GET | 获取我发布的 | **是** |
| `/api/wall/:postId/like` | POST | 点赞/取消点赞 | **是** |
| `/api/wall/:postId/comments` | GET | 获取评论 | 否 |
| `/api/wall/:postId/comments` | POST | 添加评论 | **是** |

### 故事反馈相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/story-feedback` | POST | 提交故事反馈 | **是** |
| `/api/story-feedback/:sessionId` | GET | 获取反馈 | 否 |
| `/api/story-feedback/:sessionId/all` | GET | 获取所有反馈及统计 | 否 |
| `/api/story-feedback/:sessionId/check` | GET | 检查是否已提交 | 否 |
| `/api/story-feedback/analytics` | GET | AI 质量分析 | 否 |
| `/api/story-feedback/recommendations` | GET | 个性化推荐 | **是** |

### 通知相关

| 端点 | 方法 | 功能 | 需要认证 |
|------|------|------|----------|
| `/api/notifications` | GET | 获取通知列表 | **是** |
| `/api/notifications/unread-count` | GET | 获取未读数 | **是** |
| `/api/notifications/mark-read` | POST | 全部已读 | **是** |
| `/api/notifications/:notificationId/read` | POST | 单条已读 | **是** |

---

## 认证机制

### Token 格式

使用自定义 Base64 编码的 Token（非标准 JWT）：

```
yeelin_<base64_payload>
```

Payload 结构：
```json
{
  "userId": "cuid_xxx",
  "exp": 1234567890123  // 过期时间戳
}
```

有效期：7 天

### 认证传递方式

- Header: `Authorization: Bearer <token>`
- 部分接口在 body 中传 openid（需与 token 对应）

### 游客支持

未登录用户（游客）可以：
- 创建会话记录梦境
- 浏览梦墙

不可用功能：
- 发布到梦墙
- 点赞、评论
- 分享得积分
- 好友功能

游客 openid 格式：`web_<timestamp>_<random>`

---

## 数据库模型

```
User
├── Session (1:N)
│   ├── Message (1:N)
│   ├── Answer (1:N)
│   └── Story (1:1)
├── ShareLog (1:N)
├── Invite (1:N - as inviter)
├── Invite (1:N - as invitee)
├── Friend (1:N - as user)
├── Friend (1:N - as friend)
├── DreamWall (1:N)
├── DreamWallLike (1:N)
└── DreamWallComment (1:N)
```

---

## 前端页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | 启动页、开始做梦 |
| 做梦 | `/dream` | 记录梦境片段 |
| 问答 | `/questions` | AI 梦境问答 |
| 故事 | `/story/:sessionId` | 生成的故事阅读页 |
| 历史 | `/history` | 用户梦境历史记录 |
| 收藏 | `/favorites` | 用户收藏的梦境故事 |
| 梦墙 | `/wall` | 故事广场、公开分享 |
| 登录 | `/login` | 登录页 |
| 注册 | `/register` | 注册页 |
| 我的 | `/profile` | 个人中心 |
| 好友 | `/friends` | 好友列表 |
| 好友主页 | `/friends/:openid` | 好友个人页 |
| 通知 | `/notifications` | 通知中心 |

---

## 尚未集成的 API（前端未调用）

| API | 说明 |
|-----|------|
| `api.getInterpretation` | 已定义但未使用 |
| `shareApi.useInvite` | 已定义但未使用 |
| `authApi.updateProfile` | 已定义但未使用 |
| `authApi.getUser` | 已定义但未使用 |
| `friendApi.blockUser` | 已定义但未使用 |
| `friendApi.getFriendCount` | 已定义但未使用 |
| `wallApi.getComments` | 已定义但未使用 |
| `wallApi.addComment` | 已定义但未使用 |
