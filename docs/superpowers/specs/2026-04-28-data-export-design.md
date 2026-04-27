# 数据导出设计方案

## 1. 概述

依据《个人信息保护法》「数据可携带权」要求，为「夜棂」用户提供完整的个人数据导出功能（JSON 格式，前端直接下载）。

## 2. 功能定义

### 导出格式
- JSON，全量导出，不可选类别

### 触发入口
「设置」页面 → 「导出我的数据 →」

### 导出字段

```json
{
  "exportedAt": "2026-04-28T10:00:00Z",
  "appVersion": "1.0.0",
  "user": {
    "openid": "xxx",
    "nickname": "梦境旅人",
    "phone": "138****0000",
    "createdAt": "2026-01-01T00:00:00Z",
    "isMember": false,
    "points": 100,
    "medals": ["first_dream", "week_streak"]
  },
  "dreams": [
    {
      "id": "session_xxx",
      "createdAt": "2026-01-01T10:00:00Z",
      "status": "COMPLETED",
      "answers": [
        {
          "questionIndex": 0,
          "questionText": "梦里你在做什么？",
          "answerText": "我在天上飞",
          "answeredAt": "2026-01-01T10:01:00Z"
        }
      ],
      "story": {
        "id": "story_xxx",
        "title": "飞翔的梦境",
        "content": "完整故事内容...",
        "interpretation": "AI 解读内容...",
        "createdAt": "2026-01-01T10:05:00Z"
      }
    }
  ],
  "wallPosts": [
    {
      "id": "post_xxx",
      "storyTitle": "飞翔的梦境",
      "storySnippet": "故事摘要（前200字）",
      "isAnonymous": true,
      "likeCount": 12,
      "commentCount": 3,
      "createdAt": "2026-01-01T12:00:00Z",
      "comments": [
        {
          "content": "评论内容",
          "isAnonymous": true,
          "createdAt": "2026-01-01T12:30:00Z"
        }
      ]
    }
  ],
  "friends": [
    {
      "friendOpenid": "xxx",
      "friendNickname": "好友昵称",
      "status": "ACCEPTED",
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ],
  "shareLogs": [
    {
      "type": "poster",
      "createdAt": "2026-01-10T00:00:00Z"
    }
  ]
}
```

### 隐私处理
- `openid` 在导出 JSON 中保留（用户数据，用户有权导出完整信息）
- `phone` 保留真实值（已加密存储于 DB，可携带）
- `passwordHash` 不导出

## 3. API 设计

### `POST /api/auth/export-data`

**认证**：需要 Bearer Token（通过 authMiddleware）

**数据查询**（Prisma）：
```javascript
// 1. 用户基础信息
const user = await prisma.user.findUnique({ where: { id: userId } })

// 2. 所有梦境 session（含 answer 和 story）
const sessions = await prisma.session.findMany({
  where: { openid: user.openid },
  include: { answers: true, story: true }
})

// 3. 墙帖（含评论，不含点赞 openid）
const posts = await prisma.dreamWall.findMany({
  where: { openid: user.openid },
  include: { comments: true }
})

// 4. 好友关系
const friends = await prisma.friend.findMany({
  where: { userId: user.id, status: 'ACCEPTED' },
  include: { friend: true }
})

// 5. 分享记录
const shareLogs = await prisma.shareLog.findMany({
  where: { openid: user.openid }
})
```

**Response**：
- `Content-Type: application/json`
- `Content-Disposition: attachment; filename="yeelin_data_20260428.json"`
- HTTP 200，body 为 JSON 字符串

**Error**：
- 401：未登录或 Token 失效
- 500：服务端查询异常

## 4. 前端交互

### 流程
1. 用户进入「设置」页面
2. 点击「导出我的数据 →」
3. 弹出确认对话框：
   - 标题：「导出我的数据」
   - 内容：「将导出你的所有个人信息，包括梦境记录、社区帖子、好友关系等」
   - 按钮：「取消」| 「确认导出」
4. 用户点击「确认导出」
5. 请求 `POST /api/auth/export-data`
6. 返回后触发浏览器下载，文件名 `yeelin_data_YYYYMMDD.json`

### 状态处理
- 加载中：按钮显示「正在导出...」+ loading spinner
- 成功：无额外提示，直接下载
- 失败：Toast 提示「导出失败，请重试」

## 5. 文件清单

### 后端
| 操作 | 文件 |
|------|------|
| 修改 | `server/src/routes/auth.js`（新增 `/export-data` 路由） |

### 前端
| 操作 | 文件 |
|------|------|
| 修改 | `src/pages/Profile.tsx`（新增导出入口） |
| 修改 | `src/services/api.ts`（新增 `exportData()` 方法） |
| 新增 | `src/components/ExportDataModal.tsx`（确认弹窗） |
| 新增 | `src/components/ExportDataModal.module.css` |

## 6. 测试场景

- [ ] 未登录用户不可导出（返回 401）
- [ ] 导出 JSON 包含所有字段（非空列表正确返回）
- [ ] 下载文件名格式正确
- [ ] 确认弹窗取消不触发下载
- [ ] 网络错误时 toast 提示
