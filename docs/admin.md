# 管理后台 API

> 管理员用于审核梦墙帖子、管理评论的 API。

## 认证

所有管理后台 API 需要：
1. 有效的用户认证 Token（`Authorization: Bearer <token>`）
2. 用户 `isAdmin` 字段为 `true`

非管理员用户会返回 `403 Forbidden`。

---

## 审核统计数据

### GET /api/admin/stats

获取审核统计数据。

**需要认证：** 是（管理员）

**响应：**
```json
{
  "success": true,
  "data": {
    "pendingPosts": 5,
    "totalPosts": 128,
    "totalComments": 342
  }
}
```

---

## 帖子审核

### GET /api/admin/posts/pending

获取待审核帖子列表。

**需要认证：** 是（管理员）

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |

**响应：**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "clx123...",
        "sessionId": "clx456...",
        "openid": "oABC123...",
        "nickname": "用户昵称",
        "avatar": "https://...",
        "storyTitle": "梦到在云端飞翔",
        "storySnippet": "今天我梦见自己长出了翅膀...",
        "isAnonymous": true,
        "createdAt": "2026-04-28T10:00:00.000Z"
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

### POST /api/admin/posts/:postId/approve

通过审核帖子。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| postId | string | 帖子 ID |

**响应：**
```json
{
  "success": true,
  "data": {
    "approved": true
  }
}
```

**业务逻辑：**
1. 验证帖子存在且状态为 `pending`
2. 将帖子状态更新为 `approved`
3. 帖子将在梦墙显示

---

### POST /api/admin/posts/:postId/reject

拒绝审核帖子，并通知用户。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| postId | string | 帖子 ID |

**请求 Body：**
```json
{
  "reason": "内容违规"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| reason | string | 是 | 拒绝原因 |

**拒绝原因选项：**
- `内容违规` - 包含违规内容
- `与梦境无关` - 内容与梦境无关
- `包含敏感信息` - 包含个人隐私或敏感信息
- `其他` - 自定义原因

**响应：**
```json
{
  "success": true,
  "data": {
    "rejected": true
  }
}
```

**业务逻辑：**
1. 验证帖子存在且状态为 `pending`
2. 将帖子状态更新为 `rejected`
3. 向帖子作者发送 `POST_REJECTED` 类型通知
4. 用户在通知中心看到拒绝原因

---

## 评论管理

### GET /api/admin/comments

获取所有评论列表。

**需要认证：** 是（管理员）

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| limit | number | 50 | 每页数量 |
| wallId | string | - | 按帖子筛选（可选） |

**响应：**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "clx789...",
        "wallId": "clx123...",
        "openid": "oABC123...",
        "nickname": "评论者",
        "content": "这个梦好有意思！",
        "createdAt": "2026-04-28T12:00:00.000Z",
        "wallTitle": "梦到在云端飞翔"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 342,
      "hasMore": true
    }
  }
}
```

---

### DELETE /api/admin/comments/:commentId

删除评论。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| commentId | string | 评论 ID |

**响应：**
```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

**业务逻辑：**
1. 验证评论存在
2. 删除评论记录
3. 对应帖子的 `commentCount` 减 1

---

## 内容安全

### 内容审核机制

发布帖子时，系统会对内容进行安全检查：

1. **Blocked（拦截）**
   - 内容包含明确违规词汇
   - 帖子直接被拒绝（`rejected`）
   - 用户收到通知

2. **Review（待审核）**
   - 内容触发审核关键词
   - 帖子状态设为 `pending`
   - 需要管理员人工审核

3. **Safe（安全）**
   - 内容通过审核
   - 帖子直接发布成功（`approved`）

### 审核词库

系统使用 `server/src/config/moderation-words.json` 中的词库：

**Blocked 分类：**
- 政治敏感
- 色情低俗
- 暴力恐怖
- 违法违规

**Review 分类：**
- 个人信息（手机号、邮箱、微信号等正则匹配）
- 外部链接（http/https/www 等）
- 广告内容（加我、联系我、代刷等）
- 极端情绪（想死、恨死等）
