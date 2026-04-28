# 评论系统设计

> **For agentic workers:** Implementation uses superpowers:subagent-driven-development workflow.

**Goal:** 为Dream Wall故事添加嵌套评论功能，支持最多2层回复。

**Architecture:**
- 数据库：在 `DreamWallComment` 添加 `parentId` 实现自关联
- 后端：修改 GET/POST 接口支持嵌套评论的查询和创建
- 前端：新建 `CommentThread` 组件，嵌套展示评论

**Tech Stack:** React, CSS Modules, Prisma, Fastify

---

## 数据库设计

### 修改 DreamWallComment 模型

```prisma
model DreamWallComment {
  id         String   @id @default(cuid())
  wallId     String
  openid     String
  nickname   String?
  avatar     String?
  content    String
  isAnonymous Boolean @default(true)
  parentId   String?  // 父评论ID，null表示顶层评论
  createdAt  DateTime @default(now())

  wall       DreamWall @relation(fields: [wallId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [openid], references: [openid])
  parent     DreamWallComment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies    DreamWallComment[] @relation("CommentReplies")

  @@index([wallId])
  @@index([parentId])
}
```

**约束：**
- `parentId` 为空 → 顶层评论
- `parentId` 非空 → 回复，最多追溯一层（两层嵌套）
- 回复的回复不能再有子评论

---

## API 设计

### GET /api/wall/:postId/comments

获取评论列表（嵌套结构）。

**Response:**
```json
{
  "success": true,
  "comments": [
    {
      "id": "xxx",
      "content": "内容",
      "isAnonymous": true,
      "nickname": "匿名用户",
      "avatar": null,
      "isAuthor": false,
      "createdAt": "2026-04-28T10:00:00Z",
      "replies": [
        {
          "id": "yyy",
          "content": "回复内容",
          "isAnonymous": false,
          "nickname": "用户A",
          "avatar": "https://...",
          "isAuthor": true,
          "createdAt": "2026-04-28T11:00:00Z",
          "replies": []
        }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 100 }
}
```

### POST /api/wall/:postId/comments

创建评论或回复。

**Request:**
```json
{
  "openid": "user_openid",
  "content": "评论内容",
  "isAnonymous": true,
  "parentId": null  // 可选，回复时传入父评论ID
}
```

**约束：**
- `parentId` 非空时，父评论必须存在且属于同一 story
- 回复的回复不能再有子评论（parentId 有父评论时，传入的 parentId 必须为顶层评论）
- 评论字数限制：500字

---

## 前端组件

### CommentThread

主组件，负责评论列表展示和交互。

**Props:**
```typescript
interface CommentThreadProps {
  postId: string
}
```

Note: The `isAuthor` field is computed server-side by comparing commenter's openid with story author's openid, so `wallOwnerOpenid` is not needed as a prop.

**功能：**
1. 加载评论列表（嵌套结构）
2. 显示顶层评论和其回复
3. 点击"回复"展开回复输入框
4. 提交新评论/回复

### 评论项展示

**顶层评论：**
```
[头像] 昵称 (作者标签，如果是作者)
       评论内容
       时间 · 回复按钮
```

**回复：**
```
  ↳ [头像] 昵称 (作者标签)
         回复内容
         时间
```

---

## 交互流程

1. 用户点击故事进入详情页
2. 评论组件加载评论列表
3. 用户输入评论，点击发送
4. 评论显示在列表顶部（倒序）
5. 用户点击"回复"按钮
6. 回复输入框展开在父评论下方
7. 用户提交回复，显示在父评论的回复列表中

---

## 文件变更

### 数据库
- `server/prisma/schema.prisma` - 添加 parentId 字段

### 后端
- `server/src/routes/dreamWall.js` - 修改评论接口支持嵌套

### 前端
- `src/components/CommentThread.tsx` (新建)
- `src/components/CommentThread.module.css` (新建)
- `src/services/api.ts` - 添加评论API方法
- `src/pages/DreamWall.tsx` - 集成评论组件
