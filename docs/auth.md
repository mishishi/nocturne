# 认证 API (auth)

## 概述

认证模块负责用户注册、登录和用户信息管理。支持微信授权登录和手机号密码登录两种方式。

---

## 端点详情

### POST /api/auth/wechat

**功能：** 微信授权登录（模拟）

**需要认证：** 否

**请求 Body：**
```json
{
  "openid": "string"  // 必填，微信 OpenID
}
```

**响应 (200)：**
```json
{
  "success": true,
  "user": {
    "id": "cuid_xxx",
    "openid": "wx_xxx",
    "nickname": "梦境旅人1234",
    "avatar": null,
    "phone": null,
    "isMember": false,
    "memberSince": null,
    "points": 0,
    "medals": [],
    "consecutiveShares": 0,
    "lastShareDate": null
  },
  "token": "yeelin_eyJ1c2VySWQiOiJjdWlkX3h4eCIsImV4cCI6MTcxMjM0NzIyNn0="
}
```

**业务逻辑：**
- 如果用户不存在，自动创建新用户（nickname 随机生成）
- 更新 lastLogin 字段
- 返回 7 天有效期的 token

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Login.tsx` | `handleWeChatLogin()` | 点击"微信登录"按钮 |

---

### POST /api/auth/phone-login

**功能：** 手机号密码登录

**需要认证：** 否

**请求 Body：**
```json
{
  "phone": "string",   // 必填，11位手机号
  "password": "string" // 必填，密码
}
```

**响应 (200 成功 / 401 失败)：**
```json
// 成功
{
  "success": true,
  "user": { ... },
  "token": "yeelin_..."
}

// 失败
{
  "success": false,
  "reason": "手机号或密码错误"
}
```

**业务逻辑：**
- 验证手机号和密码（bcrypt 比较）
- 更新 lastLogin 字段
- 用户不存在或密码错误返回固定提示（防止用户探测）

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Login.tsx` | `handlePhoneLogin()` | 提交手机登录表单 |

---

### POST /api/auth/register

**功能：** 手机号注册

**需要认证：** 否

**请求 Body：**
```json
{
  "phone": "string",       // 必填，11位手机号
  "password": "string",    // 必填，至少6位
  "nickname": "string",    // 选填，昵称
  "inviteCode": "string"   // 选填，邀请码
}
```

**响应 (200 成功 / 400 失败)：**
```json
// 成功
{
  "success": true,
  "user": { ... },
  "token": "yeelin_..."
}

// 失败
{
  "success": false,
  "reason": "该手机号已注册"  // 或 "密码至少6位"
}
```

**业务逻辑：**
- 检查手机号是否已注册
- bcrypt 加密密码
- 生成唯一 openid：`phone_<phone>_<timestamp>`
- nickname 默认随机生成

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Register.tsx` | `handleNicknameSubmit()` | 点击"进入夜棂"提交注册表单 |

---

### POST /api/auth/update-profile

**功能：** 更新用户资料

**需要认证：** 否（但建议配合 token 验证）

**请求 Body：**
```json
{
  "openid": "string",       // 必填
  "nickname": "string",      // 选填
  "avatar": "string"         // 选填，头像URL
}
```

**响应 (200)：**
```json
{
  "success": true,
  "user": { ... }
}
```

**前端调用：** 无（未使用）

---

### GET /api/auth/user/:openid

**功能：** 通过 openid 获取用户公开信息

**需要认证：** 否

**URL 参数：**
- `openid`: 用户 openid

**响应 (200 / 404)：**
```json
// 成功
{
  "success": true,
  "user": { ... }
}

// 用户不存在
{
  "error": "用户不存在"
}
```

**前端调用：** 无（未使用）

---

### POST /api/auth/verify-token

**功能：** 验证 token 有效性

**需要认证：** 否

**请求 Body：**
```json
{
  "token": "string"  // 必填，yeelin_ 开头的 token
}
```

**响应 (200 / 401)：**
```json
// 有效
{
  "success": true,
  "user": { ... }
}

// 无效或过期
{
  "success": false,
  "reason": "Token无效或已过期"
}
```

**业务逻辑：**
- 解析 Base64 payload
- 检查过期时间

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Register.tsx` | `handleNicknameSubmit()` | 注册成功后使用邀请码时验证 token |

---

### GET /api/auth/wechat/authorize

**功能：** 生成微信授权 URL 并跳转

**需要认证：** 否

**Query 参数：**
- `redirect_uri`: 授权成功后的跳转地址（前端页面路径）

**响应：** 302 重定向到微信授权页面

**业务逻辑：**
- 拼接微信授权 URL，state 参数包含 base64 编码的 redirect_uri
- 授权成功回调到 `/api/auth/wechat/callback`

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Login.tsx` | `handleWeChatLogin()` | 微信登录时跳转授权 |

---

### GET /api/auth/wechat/callback

**功能：** 微信 OAuth 回调，处理 code 换 openid

**需要认证：** 否

**Query 参数：**
- `code`: 微信授权码
- `state`: 原始跳转地址的 base64 编码

**响应：** 302 重定向到前端页面，URL 包含 `wechat_token` 和 `wechat_user` 参数

**业务逻辑：**
1. 用 code 换取 openid
2. 调用 `wechatLogin` 创建或登录用户
3. 生成 7 天有效期 token
4. 重定向到原始页面并携带 token 和用户信息

**错误处理：**
- code 无效或授权失败 → 重定向到前端并带上 `wechat_error=1`

---

### POST /api/auth/export-data

**功能：** 导出用户所有数据（GDPR 数据可携带权）

**需要认证：** **是**（需 Bearer Token）

**请求 Body：** 无

**响应：** JSON 文件下载

```json
{
  "exportedAt": "2024-01-15T10:30:00.000Z",
  "appVersion": "1.0.0",
  "user": { ... },
  "dreams": [...],
  "wallPosts": [...],
  "friends": [...],
  "shareLogs": [...]
}
```

**业务逻辑：**
1. 获取当前用户的完整数据快照
2. 包含：用户信息、会话/故事/问答、梦墙帖子及评论、好友列表、分享记录

---

## 前端存储

登录成功后：
- `token` 存储到 `localStorage.setItem('yeelin_token', token)`
- `openid` 存储到 `localStorage.setItem('yeelin_openid', openid)`
- 用户信息存储到 Zustand store：`setUser(user, token)`

---

## 相关文件

- `server/src/routes/auth.js` - 路由定义
- `server/src/services/authService.js` - 业务逻辑
- `server/src/middleware/auth.js` - Token 验证中间件
- `src/services/api.ts` - 前端 API 封装（authApi 对象）
