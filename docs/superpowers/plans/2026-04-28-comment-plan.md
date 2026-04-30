# 评论系统实现计划

> **For agentic workers:** Implementation uses superpowers:subagent-driven-development.

**Goal:** 为Dream Wall故事添加嵌套评论功能

**Architecture:** 数据库parentId自关联 + 后端嵌套API + 前端CommentThread组件

**Tech Stack:** React, CSS Modules, Prisma, Fastify

---

## 文件结构

- server/prisma/schema.prisma - parentId字段
- server/src/routes/dreamWall.js - 嵌套评论API
- src/services/api.ts - 评论API方法
- src/components/CommentThread.tsx - 评论组件
- src/components/CommentThread.module.css - 样式
- src/pages/DreamWall.tsx - 集成评论

---

## Task 1: 数据库 - 添加parentId字段

**Files:**
- Modify: server/prisma/schema.prisma

### Step 1: 修改DreamWallComment模型

在DreamWallComment模型中添加:
- parentId String? (可选的父评论ID)
- parent DreamWallComment? @relation(...)
- replies DreamWallComment[] @relation(...)

### Step 2: 同步数据库

Run: npx prisma db push

### Step 3: Commit

git add server/prisma/schema.prisma
git commit -m "feat: add parentId for nested comments"

---

## Task 2: 后端 - 修改GET评论接口

**Files:**
- Modify: server/src/routes/dreamWall.js:317-348

### Step 1: 修改GET /api/wall/:postId/comments

修改返回结构为嵌套格式，添加isAuthor字段，排序改为倒序

### Step 2: 测试API

访问 GET /api/wall/{postId}/comments 验证返回嵌套结构

### Step 3: Commit

git add server/src/routes/dreamWall.js
git commit -m "feat: return nested comment structure in GET API"

---

## Task 3: 后端 - 修改POST评论接口

**Files:**
- Modify: server/src/routes/dreamWall.js:350-414

### Step 1: 修改POST /api/wall/:postId/comments

支持parentId参数，添加嵌套规则校验

### Step 2: 测试API

POST新评论和回复，验证嵌套逻辑

### Step 3: Commit

git add server/src/routes/dreamWall.js
git commit -m "feat: support nested comments in POST API"

---

## Task 4: 前端 - 添加API方法

**Files:**
- Modify: src/services/api.ts

### Step 1: 添加评论API方法

添加getComments和postComment方法到wallApi

### Step 2: Commit

git add src/services/api.ts
git commit -m "feat: add comment API methods"

---

## Task 5: 前端 - 创建CommentThread组件

**Files:**
- Create: src/components/CommentThread.tsx
- Create: src/components/CommentThread.module.css

### Step 1: 创建组件基础结构

CommentThread组件：加载评论列表、显示嵌套评论

### Step 2: 实现回复功能

点击回复展开输入框，提交回复

### Step 3: 样式

对应CSS样式

### Step 4: Commit

git add src/components/CommentThread.tsx src/components/CommentThread.module.css
git commit -m "feat: add CommentThread component"

---

## Task 6: 前端 - 集成到DreamWall

**Files:**
- Modify: src/pages/DreamWall.tsx

### Step 1: 导入并使用CommentThread

在故事详情区域添加评论组件

### Step 2: Commit

git add src/pages/DreamWall.tsx
git commit -m "feat: integrate CommentThread into DreamWall"
