# 好友系统实现计划

> **For agentic workers:** Implementation uses superpowers:subagent-driven-development.

**Goal:** 实现好友关系系统 MVP

**Architecture:** 数据库现有 Friend 模型 + 后端好友 API + 前端好友页面

**Tech Stack:** React, CSS Modules, Prisma, Fastify

---

## 文件结构

- server/src/routes/friends.js - 好友 API
- src/services/api.ts - 前端 API 方法
- src/pages/Friends.tsx - 好友列表页
- src/pages/FriendProfile.tsx - 好友主页
- src/components/FriendRequestButton.tsx - 添加好友按钮

---

## Task 1: 后端 - 创建好友 API

**Files:**
- Create: server/src/routes/friends.js

### Step 1: 创建路由文件

实现以下端点：
- POST /api/friends/request - 发送好友请求
- POST /api/friends/accept - 接受好友请求
- POST /api/friends/reject - 拒绝好友请求
- DELETE /api/friends/:friendOpenid - 删除好友
- GET /api/friends - 获取好友列表
- GET /api/friends/requests - 获取待处理请求
- GET /api/friends/:openid/posts - 获取好友公开帖子

### Step 2: 注册路由

在 server/src/index.js 或 server.js 中注册路由

### Step 3: 测试 API

验证各个端点返回正确数据

### Step 4: Commit

git add server/src/routes/friends.js
git commit -m "feat: add friend system API endpoints"

---

## Task 2: 前端 - 添加 API 方法

**Files:**
- Modify: src/services/api.ts

### Step 1: 添加好友 API 方法

添加以下方法到 api.ts：
- sendFriendRequest(friendOpenid)
- acceptFriendRequest(requestId)
- rejectFriendRequest(requestId)
- removeFriend(friendOpenid)
- getFriends()
- getFriendRequests()
- getFriendPosts(openid, page, limit)

### Step 2: Commit

git add src/services/api.ts
git commit -m "feat: add friend API methods to frontend"

---

## Task 3: 前端 - 创建好友列表页

**Files:**
- Create: src/pages/Friends.tsx
- Create: src/pages/Friends.module.css

### Step 1: 创建好友列表页

- Tab 切换：好友列表 / 好友请求
- 好友列表：卡片展示好友信息
- 好友请求：展示待处理请求，接受/拒绝按钮

### Step 2: 添加路由

在路由配置中添加 /friends 路由

### Step 3: Commit

git add src/pages/Friends.tsx src/pages/Friends.module.css
git commit -m "feat: add Friends page with request management"

---

## Task 4: 前端 - 创建好友主页

**Files:**
- Create: src/pages/FriendProfile.tsx
- Create: src/pages/FriendProfile.module.css

### Step 1: 创建好友主页

- 显示好友信息
- 展示好友的公开帖子列表

### Step 2: Commit

git add src/pages/FriendProfile.tsx src/pages/FriendProfile.module.css
git commit -m "feat: add FriendProfile page"

---

## Task 5: 前端 - 添加好友按钮组件

**Files:**
- Create: src/components/FriendRequestButton.tsx
- Create: src/components/FriendRequestButton.module.css

### Step 1: 创建按钮组件

在需要的地方（如用户卡片、故事作者处）显示"添加好友"按钮

### Step 2: 集成到 DreamWall

在 Dream Wall 帖子详情处添加好友按钮

### Step 3: Commit

git add src/components/FriendRequestButton.tsx src/components/FriendRequestButton.module.css
git commit -m "feat: add FriendRequestButton component"
