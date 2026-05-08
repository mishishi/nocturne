# 管理后台 API

> 管理员用于审核梦墙帖子、管理评论的 API。

## 认证

所有管理后台 API 需要：
1. 有效的用户认证 Token（`Authorization: Bearer <token>`）
2. 用户 `isAdmin` 字段为 `true`

非管理员用户会返回 `403 Forbidden`。

---

## 审核统计数据

### GET /api/v1/admin/stats

获取审核统计数据（包含趋势数据）。

**需要认证：** 是（管理员）

**响应：**
```json
{
  "success": true,
  "data": {
    "pendingPosts": 5,
    "totalPosts": 128,
    "totalComments": 342,
    "trends": {
      "postsLast7Days": 23,
      "postsGrowth": 15,
      "approvedLast7Days": 20,
      "rejectedLast7Days": 3
    }
  }
}
```

**趋势数据说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `postsLast7Days` | number | 最近7天新增帖子数 |
| `postsGrowth` | number | 相对上一个7天周期的增长率（百分比） |
| `approvedLast7Days` | number | 最近7天审核通过的帖子数 |
| `rejectedLast7Days` | number | 最近7天审核拒绝的帖子数 |

---

## 帖子审核

### GET /api/v1/admin/posts/pending

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

### POST /api/v1/admin/posts/:postId/approve

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
4. 记录操作日志到 `AdminOperationLog`

---

### POST /api/v1/admin/posts/:postId/reject

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
5. 记录操作日志到 `AdminOperationLog`

---

### POST /api/v1/admin/posts/batch-approve

批量通过审核帖子。

**需要认证：** 是（管理员）

**请求 Body：**
```json
{
  "postIds": ["clx123...", "clx456..."]
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| postIds | string[] | 是 | 要通过的帖子 ID 数组 |

**响应：**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "count": 5
  }
}
```

**业务逻辑：**
1. 只通过状态为 `pending` 的帖子
2. 批量更新帖子状态为 `approved`
3. 记录操作日志到 `AdminOperationLog`（包含所有操作的帖子 ID）

---

### POST /api/v1/admin/posts/batch-reject

批量拒绝审核帖子。

**需要认证：** 是（管理员）

**请求 Body：**
```json
{
  "postIds": ["clx123...", "clx456..."],
  "reason": "内容违规"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| postIds | string[] | 是 | 要拒绝的帖子 ID 数组 |
| reason | string | 是 | 拒绝原因 |

**响应：**
```json
{
  "success": true,
  "data": {
    "rejected": true,
    "count": 5
  }
}
```

**业务逻辑：**
1. 只拒绝状态为 `pending` 的帖子
2. 批量更新帖子状态为 `rejected`
3. 向所有被拒绝帖子的作者发送 `POST_REJECTED` 类型通知
4. 记录操作日志到 `AdminOperationLog`（包含所有操作的帖子 ID 和拒绝原因）

---

## 每日精选

### POST /api/v1/admin/posts/:postId/feature

将帖子设为精选，同时奖励作者 20 积分。

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
    "featured": true,
    "rewardPoints": 20
  }
}
```

**业务逻辑：**
1. 验证帖子存在且已审核通过
2. 检查帖子是否已是精选（不能重复设为精选）
3. 将 `isFeatured` 设为 `true`，记录 `featuredAt` 时间
4. 创建 `DailyHighlight` 记录
5. 给作者增加 20 积分
6. 向帖子作者发送 `POST_FEATURED` 类型通知
7. 记录操作日志到 `AdminOperationLog`

---

### DELETE /api/v1/admin/posts/:postId/feature

取消帖子精选状态。

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
    "unfeatured": true
  }
}
```

**业务逻辑：**
1. 验证帖子存在且当前为精选状态
2. 将 `isFeatured` 设为 `false`，清除 `featuredAt` 时间
3. 删除 `DailyHighlight` 记录
4. 记录操作日志到 `AdminOperationLog`

---

## 精选候选管理

系统通过算法自动生成精选候选，管理员可以人工确认或拒绝。

### 精选候选状态

| 状态 | 说明 |
|------|------|
| `pending` | 待确认 |
| `approved` | 已确认设为精选 |
| `rejected` | 已拒绝 |

### 热度评分算法

```
engagementScore = (likeCount * 1) + (commentCount * 2)
```

时间衰减：新帖子权重更高，7天前的帖子评分降低 50%。

---

### POST /api/v1/admin/highlights/generate

运行算法生成精选候选。

**需要认证：** 是（管理员）

**响应：**
```json
{
  "success": true,
  "data": {
    "generated": 5,
    "candidates": [
      {
        "id": "clx123...",
        "wallId": "clx456...",
        "engagementScore": 42,
        "rank": 1,
        "status": "pending",
        "generatedAt": "2026-05-06T10:00:00.000Z",
        "reviewedAt": null,
        "reviewerOpenid": null,
        "storyTitle": "梦到在云端飞翔",
        "storySnippet": "今天我梦见自己长出了翅膀...",
        "nickname": "小明",
        "avatar": "https://...",
        "likeCount": 30,
        "commentCount": 6,
        "createdAt": "2026-05-05T10:00:00.000Z"
      }
    ]
  }
}
```

**业务逻辑：**
1. 清除旧的 pending 状态的候选记录
2. 查询最近 7 天内已审核通过的帖子
3. 计算每篇帖子的 engagementScore（点赞*1 + 评论*2）
4. 应用时间衰减（新帖子权重更高）
5. 按评分降序排列，取前 10 名作为候选
6. 保存到 HighlightCandidate 表

---

### GET /api/v1/admin/highlights/candidates

获取精选候选列表。

**需要认证：** 是（管理员）

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | string | pending | 筛选状态 |
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |

**响应：**
```json
{
  "success": true,
  "data": {
    "candidates": [...],
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

### POST /api/v1/admin/highlights/:candidateId/approve

确认精选候选，将帖子设为精选并奖励作者 20 积分。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| candidateId | string | 候选 ID |

**响应：**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "featured": true,
    "rewardPoints": 20
  }
}
```

**业务逻辑：**
1. 验证候选存在且状态为 pending
2. 更新候选状态为 approved
3. 将对应帖子 isFeatured 设为 true，记录 featuredAt
4. 创建 DailyHighlight 记录
5. 给帖子作者增加 20 积分
6. 发送 POST_FEATURED 通知
7. 记录操作日志

---

### DELETE /api/v1/admin/highlights/:candidateId

拒绝精选候选。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| candidateId | string | 候选 ID |

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
1. 验证候选存在
2. 更新候选状态为 rejected
3. 记录操作日志

---

### POST /api/v1/admin/highlights/batch-approve

批量确认精选候选。

**需要认证：** 是（管理员）

**请求 Body：**
```json
{
  "candidateIds": ["clx123...", "clx456..."]
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "approved": true,
    "count": 3,
    "featured": 3,
    "rewardPoints": 60
  }
}
```

**业务逻辑：**
1. 只确认状态为 pending 的候选
2. 批量更新候选状态为 approved
3. 批量将对应帖子设为精选
4. 批量奖励作者积分（每人 20 分）
5. 批量发送通知
6. 记录批量操作日志

---

## 故事资产管理

用于管理梦境图书馆的故事资产，支持质量等级升级和自动候选生成。

### 质量等级

| 等级 | 说明 |
|------|------|
| `normal` | 普通 |
| `premium` | 优质 |
| `curated` | 精选 |

### 候选生成条件

| 目标等级 | 点赞数 | 评论数 |
|----------|--------|--------|
| `premium` | ≥10 | ≥3 |
| `curated` | ≥30 | ≥10 |

### 热度评分算法

```
engagementScore = likeCount * 1 + commentCount * 2
```

---

### POST /api/v1/admin/assets/generate-candidates

运行算法生成故事资产候选列表。

**需要认证：** 是（管理员）

**响应：**
```json
{
  "success": true,
  "data": {
    "generatedCount": 5,
    "totalScanned": 128
  }
}
```

**业务逻辑：**
1. 扫描所有已审核通过的梦墙帖子
2. 跳过已是 premium 或 curated 的故事
3. 跳过已有 pending 状态的候选
4. 根据条件确定目标等级（premium 或 curated）
5. 创建或更新 StoryAssetCandidate 记录

---

### GET /api/v1/admin/assets/candidates

获取故事资产候选列表。

**需要认证：** 是（管理员）

**Query 参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| status | string | pending | 筛选状态（pending/approved/rejected/all） |
| page | number | 1 | 页码 |
| limit | number | 20 | 每页数量 |

**响应：**
```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "id": "clx123...",
        "sessionId": "clx456...",
        "storyTitle": "梦到在云端飞翔",
        "targetLevel": "premium",
        "likeCount": 15,
        "commentCount": 4,
        "engagementScore": 23,
        "status": "pending",
        "generatedAt": "2026-05-06T10:00:00.000Z"
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

### POST /api/v1/admin/assets/candidates/:sessionId/approve

确认候选，创建或升级故事资产。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 故事会话 ID |

**响应：**
```json
{
  "success": true,
  "data": {
    "message": "已确认候选"
  }
}
```

**业务逻辑：**
1. 验证候选存在且状态为 pending
2. 创建或更新 StoryAsset，质量等级设为目标等级
3. 更新候选状态为 approved
4. 记录审核人和审核时间

---

### DELETE /api/v1/admin/assets/candidates/:sessionId

拒绝候选。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 故事会话 ID |

**响应：**
```json
{
  "success": true,
  "data": {
    "message": "已拒绝候选"
  }
}
```

**业务逻辑：**
1. 验证候选存在
2. 更新候选状态为 rejected
3. 记录审核人和审核时间

---

### POST /api/v1/admin/assets/auto-upgrade

自动升级达标故事的质量等级（点赞≥20 且评论≥5）。

**需要认证：** 是（管理员）

**响应：**
```json
{
  "success": true,
  "data": {
    "upgradedCount": 3,
    "totalScanned": 50
  }
}
```

---

### PUT /api/v1/admin/assets/:sessionId/upgrade

手动提升故事质量等级。

**需要认证：** 是（管理员）

**路径参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| sessionId | string | 故事会话 ID |

**请求 Body：**
```json
{
  "qualityLevel": "premium"
}
```

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| qualityLevel | string | 是 | 目标等级（normal/premium/curated） |

**响应：**
```json
{
  "success": true,
  "data": {
    "asset": {
      "id": "clx789...",
      "sessionId": "clx456...",
      "qualityLevel": "premium",
      "createdAt": "2026-05-06T10:00:00.000Z"
    }
  }
}
```

---

## 评论管理

### GET /api/v1/admin/comments

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

### DELETE /api/v1/admin/comments/:commentId

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

---

## 操作日志

系统记录所有管理后台操作到 `AdminOperationLog` 表。

### 数据库模型

```prisma
model AdminOperationLog {
  id          String   @id @default(cuid())
  adminOpenid String   // 管理员 openid
  action      String   // APPROVE_POST, REJECT_POST, BATCH_APPROVE, BATCH_REJECT, DELETE_COMMENT
  targetType  String   // post, comment
  targetId    String?  // 单一操作的目标ID
  targetIds   String[] // 批量操作的目标ID列表
  reason      String?  // 拒绝原因（仅拒绝操作）
  createdAt   DateTime @default(now())
}
```

### 日志字段说明

| 字段 | 说明 |
|------|------|
| `adminOpenid` | 执行操作的管理员 openid |
| `action` | 操作类型 |
| `targetType` | 目标类型（post/comment） |
| `targetId` | 单一操作的帖子/评论 ID |
| `targetIds` | 批量操作的 ID 列表 |
| `reason` | 拒绝原因（仅拒绝操作） |

### 操作类型

| action 值 | 说明 |
|-----------|------|
| `APPROVE_POST` | 通过单个帖子 |
| `REJECT_POST` | 拒绝单个帖子 |
| `BATCH_APPROVE` | 批量通过帖子 |
| `BATCH_REJECT` | 批量拒绝帖子 |
| `DELETE_COMMENT` | 删除评论 |
| `FEATURE_POST` | 设为精选 |
| `UNFEATURE_POST` | 取消精选 |
| `GENERATE_CANDIDATES` | 生成精选候选 |
| `APPROVE_CANDIDATE` | 确认精选候选 |
| `REJECT_CANDIDATE` | 拒绝精选候选 |
| `BATCH_APPROVE_CANDIDATES` | 批量确认精选候选 |
