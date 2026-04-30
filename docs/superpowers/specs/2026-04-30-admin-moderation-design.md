# Admin 内容审核系统设计方案

**项目：** Nocturne（夜棂）
**日期：** 2026-04-30
**类型：** 功能设计
**优先级：** P0

---

## 1. 背景与目标

### 现状问题
- 帖子发布后直接公开，无内容安全审核
- 违规内容可被发布，无管控手段
- 管理员直接在数据库修改状态，无 UI 界面

### 目标
1. 帖子发布时经过内容安全检查，分级处理
2. 建立 Admin 后台，提供帖子审核和评论管理功能
3. 违规内容被拒时通知用户，提升用户体验

---

## 2. 总体流程

### 2.1 帖子发布流程

```
用户提交发布
    ↓
内容安全检查
    ↓
┌──────────────────────────────────────┐
│  safe     → 直接 approved，公开        │
│  review   → pending，通知 admin 复核   │
│  blocked  → 直接 rejected，通知用户    │
└──────────────────────────────────────┘
```

### 2.2 Admin 审核流程

```
有新 pending → 系统通知 admin
    ↓
Admin 登录 /admin
    ↓
查看待审核列表 → 通过/拒绝
    ↓
拒绝 → 选原因 → 用户收到通知
通过 → 公开
```

---

## 3. 数据库改动

### 3.1 User 表加 isAdmin 字段

```prisma
model User {
  // ... 现有字段
  isAdmin  Boolean  @default(false)
}
```

### 3.2 DreamWall 表状态说明

| status | 说明 | 处理方式 |
|--------|------|----------|
| `pending` | 待审核（内容可疑） | Admin 人工复核 |
| `approved` | 已通过 | 公开显示 |
| `rejected` | 已拒绝 | 仅用户可见，拒绝时发通知 |

### 3.3 新增审核记录表（可选，方便追溯）

```prisma
model ModerationLog {
  id        String   @id @default(cuid())
  targetId  String   // DreamWall.id 或 DreamWallComment.id
  targetType String  // 'post' | 'comment'
  action    String   // 'approve' | 'reject' | 'delete'
  adminOpenid String
  reason    String?  // 拒绝原因
  createdAt DateTime @default(now())
}
```

> 本期先不做 ModerationLog，后续追溯需求不明确时可再加。

---

## 4. API 设计

### 4.1 Admin 认证

复用现有 `authMiddleware`，额外校验 `user.isAdmin === true`：

```javascript
async function adminMiddleware(req, res) {
  await authMiddleware(req, res)
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user?.isAdmin) {
    return res.status(403).send(errorResponse('无管理员权限', 'FORBIDDEN'))
  }
}
```

### 4.2 Admin 帖子 API

#### GET /api/admin/posts/pending

**功能**：获取待审核帖子列表

**需要认证**：Admin

**Query 参数**：
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |

**响应**：
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "xxx",
        "sessionId": "xxx",
        "openid": "xxx",
        "nickname": "匿名用户",
        "storyTitle": "...",
        "storySnippet": "...",
        "createdAt": "2026-04-30T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "hasMore": false
    }
  }
}
```

---

#### POST /api/admin/posts/:postId/approve

**功能**：通过审核

**需要认证**：Admin

**响应**：
```json
{
  "success": true,
  "data": { "approved": true }
}
```

**业务逻辑**：
1. 更新 `DreamWall.status = 'approved'`
2. 不通知发帖用户（默认已通过，用户无需特别得知）

---

#### POST /api/admin/posts/:postId/reject

**功能**：拒绝审核

**需要认证**：Admin

**请求 Body**：
```json
{
  "reason": "内容违规"  // 必填
}
```

**拒绝原因选项**：
- `内容违规` - 包含违规内容
- `与梦境无关` - 不符合社区定位
- `包含敏感信息` - 涉及隐私或敏感话题
- `其他` - 需配合备注

**响应**：
```json
{
  "success": true,
  "data": { "rejected": true }
}
```

**业务逻辑**：
1. 更新 `DreamWall.status = 'rejected'`
2. 发送系统通知给发帖用户：
   - type: `POST_REJECTED`
   - message: `您的帖子"xxx"因【{reason}】已被撤回`

---

### 4.3 Admin 评论 API

#### GET /api/admin/comments

**功能**：获取所有评论列表（支持过滤）

**需要认证**：Admin

**Query 参数**：
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 50 | 每页数量 |
| wallId | string | - | 按帖子筛选（可选） |

**响应**：
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "xxx",
        "wallId": "xxx",
        "openid": "xxx",
        "nickname": "匿名用户",
        "content": "评论内容...",
        "createdAt": "2026-04-30T10:00:00Z",
        "wallTitle": "关联帖子标题"
      }
    ],
    "pagination": { ... }
  }
}
```

---

#### DELETE /api/admin/comments/:commentId

**功能**：删除违规评论

**需要认证**：Admin

**响应**：
```json
{
  "success": true,
  "data": { "deleted": true }
}
```

**业务逻辑**：
1. 删除评论
2. 更新关联帖子的 `commentCount`（减 1）

---

## 5. 前端 Admin 页面

### 5.1 路由

```
/admin              → 帖子审核列表（默认页）
/admin/comments     → 评论管理
```

### 5.2 Admin 页面结构

**布局**：复用现有 `PageErrorBoundary`，左侧 Tab 导航

```
┌─────────────────────────────────────┐
│  [Logo]  管理后台           [退出]   │
├─────────────────────────────────────┤
│  [帖子审核]  [评论管理]              │
├─────────────────────────────────────┤
│                                     │
│  待审核列表                          │
│  ┌─────────────────────────────┐    │
│  │ 《标题》  匿名用户  10分钟前     │    │
│  │ 摘要内容...                   │    │
│  │           [通过] [拒绝]       │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ ...                         │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### 5.3 拒绝弹窗

```
┌─────────────────────────────────┐
│  拒绝原因                       │
├─────────────────────────────────┤
│  ○ 内容违规                     │
│  ○ 与梦境无关                   │
│  ○ 包含敏感信息                 │
│  ○ 其他：_______________        │
├─────────────────────────────────┤
│           [取消]  [确认拒绝]     │
└─────────────────────────────────┘
```

---

## 6. 内容安全服务改动

### 6.1 改动现有 contentSafety.js

```javascript
/**
 * @returns { safe: true }
 * @returns { safe: false, verdict: 'review' | 'blocked', reason: string }
 */
export async function checkContentSafety(text, options = {}) {
  // ... 现有 blocked 词库检查

  // Step 2: review 词库检查（疑似违规但不确定）
  const reviewResult = checkReviewPatterns(text)
  if (reviewResult.found) {
    return {
      safe: false,
      verdict: 'review',
      reason: '内容需要人工审核'
    }
  }

  // Step 3: AI 审核（预留，后续接入）
  if (options.enableAI && process.env.AI_MODERATION_ENDPOINT) {
    // const aiResult = await callAIModeration(text)
    // return parseAIResult(aiResult)
  }

  return { safe: true }
}
```

### 6.2 词库分级

**blocked 词库**：明确违规，直接拒绝
- 政治敏感词
- 色情低俗词
- 暴力恐怖词
- 违法违规词（如野生保护动物交易）

**review 词库**：疑似违规，提交人工
- 个人联系方式（手机号、微信号等）
- 外部链接（疑似广告）
- 极端情绪表达（需结合上下文判断）
- 疑似抄袭/重复内容

> 词库以配置文件形式维护在 `server/src/config/moderation-words.json`

### 6.3 发布流程改动

现有 `dreamWall.js` 的 `POST /wall` 端点：

```javascript
// 发布前内容安全检查
const safetyResult = await checkContentSafety(storyFull)
if (safetyResult.safe) {
  status = 'approved'
} else if (safetyResult.verdict === 'blocked') {
  // 直接拒绝，通知用户
  await createNotification({ type: 'POST_REJECTED', ... })
  return res.status(403).send(errorResponse('内容审核未通过', 'CONTENT_BLOCKED'))
} else {
  // 可疑，转 pending
  status = 'pending'
  // 通知 admin
  await notifyAdminNewPendingPost()
}
```

---

## 7. 通知服务改动

### 7.1 新增通知类型

| type | 触发场景 | 接收人 |
|------|----------|--------|
| `POST_REJECTED` | 帖子被拒 | 发帖用户 |
| `ADMIN_PENDING` | 有新帖子待审核 | Admin |

### 7.2 通知内容模板

**POST_REJECTED**：
```
您的帖子「{storyTitle}」因【{reason}】已被撤回
```

**ADMIN_PENDING**：
```
有新的帖子待审核，请前往管理后台处理
```

---

## 8. 改动文件清单

| 文件 | 操作 |
|------|------|
| `server/prisma/schema.prisma` | User 表加 isAdmin 字段 |
| `server/src/middleware/adminAuth.js` | 新建 Admin 认证中间件 |
| `server/src/services/contentSafety.js` | 改用分级结果（safe/review/blocked） |
| `server/src/config/moderation-words.json` | 新建 词库配置文件 |
| `server/src/routes/admin.js` | 新建 Admin API 路由 |
| `server/src/services/notificationService.js` | 支持 ADMIN_PENDING 和 POST_REJECTED 类型 |
| `server/src/index.js` | 注册 admin 路由 |
| `src/pages/Admin.tsx` | 新建 Admin 页面 |
| `src/pages/AdminComments.tsx` | 新建 评论管理页面 |
| `src/services/api.ts` | 添加 admin API 封装 |
| `src/App.tsx` | 添加 /admin 路由 |

---

## 9. 测试验证

### 9.1 功能测试
- [ ] 普通用户发布 → 直接 approved，公开显示
- [ ] 内容含 blocked 词 → 直接 rejected，用户收到通知
- [ ] 内容含 review 词 → pending，admin 收到通知
- [ ] Admin 登录 → 可看到待审核列表
- [ ] Admin 通过 → 帖子公开
- [ ] Admin 拒绝 → 帖子变 rejected，用户收到通知
- [ ] Admin 删除评论 → 评论消失，commentCount 减 1

### 9.2 权限测试
- [ ] 非 admin 用户访问 /admin → 403
- [ ] 非登录用户访问 /admin → 401

---

## 10. 后续扩展

- ModerationLog 审核日志表
- 用户禁言功能（评论权限封禁）
- AI 审核接入（阿里云/百度内容安全）
- 词库动态配置（后台管理词库）
