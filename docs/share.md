# 分享/积分 API (share)

## 概述

分享模块负责记录用户分享行为、发放积分奖励、解锁勋章、管理邀请系统。

### 分享类型

| 类型 | type 值 | 积分奖励 | 每日上限 |
|------|---------|----------|----------|
| 海报分享 | `poster` | +5 分 | 3 次 |
| 朋友圈分享 | `moment` | +5 分 + 月光勋章 | 1 次 |
| 复制链接 | `link` | +2 分 | 5 次 |
| 好友分享 | `friend` | +10 分 | 2 次 |

### 每日积分上限

30 分/天

### 勋章系统

| 勋章 ID | 名称 | 图标 | 解锁条件 |
|---------|------|------|----------|
| `moonlight` | 月光勋章 | 🌙 | 朋友圈首次分享 |
| `newmoon` | 新月勋章 | 🌑 | 邀请好友成功 |
| `meteor` | 流星成就 | ☄️ | 连续分享 7 天 |

---

## 端点详情

### POST /api/share/log

**功能：** 记录分享行为并发放奖励

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "openid": "string",  // 必填，用户 openid
  "type": "string"     // 必填，poster | moment | link | friend
}
```

**响应 (200)：**
```json
// 成功
{
  "success": true,
  "pointsEarned": 5,
  "totalPoints": 25,
  "consecutiveDays": 3,
  "medalsUnlocked": [],
  "shareId": "cuid_xxx"
}

// 次数已达上限
{
  "success": false,
  "reason": "分享次数已达今日上限"
}

// 积分已达上限
{
  "success": false,
  "reason": "今日积分已达上限"
}
```

**业务逻辑：**
1. 验证 Token 与 openid 匹配
2. 检查当日该类型分享次数是否达上限
3. 检查当日已获积分是否达上限（30分）
4. 记录分享到 ShareLog
5. 增加用户积分
6. 更新连续分享天数
7. 检查并解锁月光勋章（朋友圈首次分享）
8. 检查并解锁流星成就（连续7天）

**前端调用：**

| 文件 | 位置 | 触发时机 |
|------|------|----------|
| `src/pages/Story.tsx` | `handleShareToWeChat()` | Web Share API 分享成功（微信好友/朋友圈）后 |
| `src/pages/Story.tsx` | `handleCopyLink()` | 复制链接成功后 |
| `src/components/SharePoster.tsx` | `onShare` 回调 | 海报分享成功 |

**前端代码位置：**
- `src/pages/Story.tsx:132` - 微信分享
- `src/pages/Story.tsx:175` - 复制链接
- `src/pages/Story.tsx:502` - SharePoster 组件

---

### GET /api/share/stats/:openid

**功能：** 获取用户分享统计信息

**需要认证：** **是**（需 Bearer Token）

**URL 参数：**
- `openid`: 用户 openid

**响应 (200)：**
```json
{
  "points": 25,
  "medals": ["moonlight", "meteor"],
  "consecutiveShares": 3,
  "lastShareDate": "2024-01-15T10:30:00.000Z",
  "todayShareCount": 2,
  "inviteCode": "NLXXXX1234"
}
```

**业务逻辑：**
- 如果用户不存在，自动创建（积分0）
- 统计今日分享次数
- 生成邀请码

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Profile.tsx` | `fetchStats()` | Profile 页面加载时 |

**前端代码位置：** `src/pages/Profile.tsx:51`

```typescript
const stats = await shareApi.getStats(openid)
```

---

### POST /api/share/invite

**功能：** 创建邀请码

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "openid": "string"  // 必填，用户 openid
}
```

**响应 (200)：**
```json
{
  "success": true,
  "inviteCode": "NLXXXX1234",
  "inviteUrl": "https://yeelin.app/invite/NLXXXX1234"
}
```

**业务逻辑：**
- 生成基于 openid 和时间戳的邀请码
- 格式：`NL<openid后4位><时间戳后4位>`
- 保存邀请记录到 Invite 表

**邀请奖励：**
- 被邀请人注册成功：邀请人 +20 积分 + 新月勋章
- 被邀请人完成首个故事：邀请人额外 +10 积分

**前端调用：**

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/Profile.tsx` | `handleCreateInvite()` | 点击"邀请"按钮 |

**前端代码位置：** `src/pages/Profile.tsx:71`

```typescript
const result = await shareApi.createInvite(openid)
// 然后复制 inviteUrl 到剪贴板
navigator.clipboard.writeText(result.inviteUrl)
```

---

### POST /api/share/use-invite

**功能：** 使用邀请码（接受邀请）

**需要认证：** **是**（需 Bearer Token）

**请求 Body：**
```json
{
  "inviteCode": "string",  // 必填，邀请码
  "openid": "string"       // 必填，使用者的 openid
}
```

**响应 (200)：**
```json
// 成功
{
  "success": true,
  "inviterOpenid": "xxx"
}

// 邀请码无效
{
  "success": false,
  "reason": "邀请码无效"
}

// 邀请码已使用
{
  "success": false,
  "reason": "邀请码已使用"
}

// 不能邀请自己
{
  "success": false,
  "reason": "不能邀请自己"
}
```

**业务逻辑：**
- 验证邀请码存在且未使用
- 验证不能邀请自己
- 更新 Invite 状态为 COMPLETED
- 给邀请者 +20 积分
- 给邀请者解锁新月勋章（如未解锁）
- 被邀请人（当前用户）获得奖励

**前端调用：** 无（未集成）

---

## 邀请系统业务流程

### 创建邀请
1. 用户在 Profile 页面点击"邀请"
2. 调用 `createInvite` 获取邀请码和链接
3. 用户分享邀请链接给好友

### 接受邀请
1. 好友通过链接打开应用（目前未集成 `useInvite`）
2. 好友注册时如填写邀请码，调用 `verifyToken` 验证
3. 注册成功后后台处理奖励（需要对接）

### 邀请奖励

| 事件 | 邀请者奖励 | 被邀请者奖励 |
|------|-----------|-------------|
| 好友注册成功 | +20 积分 + 新月勋章 | - |
| 好友完成首个故事 | +10 积分 | - |

---

## 连续分享机制

**规则：**
- 首次分享：连续天数 = 1
- 次日继续分享：连续天数 +1
- 中间断开：连续天数重置为 1
- 连续 7 天：解锁流星成就 ☄️

**判断逻辑：**
- 今天已分享：不增加天数
- 昨天已分享：天数 +1
- 更早或从未分享：天数重置为 1

---

## 数据库模型

```prisma
model ShareLog {
  id        String   @id @default(cuid())
  openid    String
  type      String   // poster | moment | link | friend
  createdAt DateTime @default(now())
}

model Invite {
  id           String    @id @default(cuid())
  inviterOpenid String
  inviteeOpenid String?
  inviteCode   String   @unique
  status       String   @default("PENDING") // PENDING, COMPLETED
  createdAt    DateTime @default(now())
  completedAt  DateTime?
}

model User {
  // ...
  points           Int       @default(0)
  medals           String[]  @default([])
  consecutiveShares Int       @default(0)
  lastShareDate    DateTime?
}
```

---

## 防刷机制

1. **每日次数限制**：每种分享类型有独立上限
2. **每日积分上限**：30 分/天
3. **IP 限制**：同一 IP 每日最多 50 次（代码中定义但未完全启用）
4. **Token 验证**：所有操作验证 token 对应的用户身份

---

## 前端积分展示

Profile 页面调用 `getStats` 获取：
- 当前积分
- 已解锁勋章列表
- 连续分享天数
- 今日分享次数

Story 页面分享成功后：
- 显示 Toast 提示获得积分
- 如解锁勋章，显示勋章名称

---

## 相关文件

- `server/src/routes/share.js` - 路由定义
- `server/src/services/shareService.js` - 业务逻辑、积分规则、勋章定义
- `server/src/middleware/auth.js` - 认证中间件
- `src/services/api.ts` - 前端 API 封装（shareApi 对象）
- `src/pages/Profile.tsx` - 邀请入口、统计展示
- `src/pages/Story.tsx` - 分享触发、积分提示
- `src/components/SharePoster.tsx` - 海报生成组件
