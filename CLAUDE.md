# 夜棂 (Nocturne) 项目指南

> 夜棂是一个 AI 梦境分享应用，用户可以记录梦境、AI 生成故事、发布到梦墙、与好友分享。

---

## 项目结构

```
nocturne/
├── src/                      # React 前端 (Vite + TypeScript)
│   ├── pages/                # 页面组件
│   ├── components/           # 公共组件
│   ├── hooks/                # Zustand stores 和自定义 hooks
│   ├── services/            # API 调用封装 (api.ts)
│   └── App.tsx
├── server/                   # Fastify 后端
│   ├── prisma/
│   │   └── schema.prisma    # 数据库模型
│   └── src/
│       ├── index.js         # 服务端入口
│       ├── routes/          # API 路由定义
│       ├── services/        # 业务逻辑服务
│       ├── middleware/      # 中间件 (认证等)
│       └── config/          # 配置 (数据库等)
├── docs/                     # API 文档
│   ├── README.md            # 文档索引
│   ├── auth.md             # 认证模块
│   ├── session.md          # 会话/梦境模块
│   ├── share.md            # 分享/积分模块
│   ├── friend.md           # 好友模块
│   ├── wall.md             # 梦墙模块
│   └── storyFeedback.md    # 故事反馈模块
└── CLAUDE.md               # 本文件
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18 + TypeScript | Vite 构建 |
| 路由 | React Router v6 | 页面导航 |
| 状态管理 | Zustand | 前端全局状态 |
| 动画 | Framer Motion | 页面和组件动画 |
| 后端框架 | Fastify | Node.js 高性能框架 |
| 数据库 | PostgreSQL + Prisma ORM | 关系型数据库 |
| 认证 | 自定义 Base64 Token | `yeelin_<base64_payload>` 格式，7 天有效期 |

---

## 端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 4001 | Vite 开发服务器 |
| 后端 | 4000 | Fastify API 服务 |
| PostgreSQL | 5432 | 数据库 |

---

## API 文档要求

### 核心规则：API 变更必须同步更新文档

**任何新增、修改、删除 API 的操作，必须同时更新对应文档。**

文档位置在 `docs/` 目录下，按模块分为：
- `auth.md` - 认证相关
- `session.md` - 会话/梦境相关
- `share.md` - 分享/积分相关
- `friend.md` - 好友相关
- `wall.md` - 梦墙相关
- `storyFeedback.md` - 故事反馈相关

### 具体要求

#### 1. 新增 API
- 在对应模块的 `.md` 文档中添加端点详情
- 在 `docs/README.md` 的快速索引表中添加条目
- 更新 `docs/README.md` 的更新日志

#### 2. 修改 API
- 更新对应文档中的请求/响应格式
- 更新业务逻辑说明（如有变化）
- 更新 README.md 索引表（如端点路径变化）

#### 3. 删除 API
- 从对应模块文档中移除端点详情
- 从 `docs/README.md` 快速索引表中移除
- 更新 `docs/README.md` 的更新日志

### 文档格式规范

每个 API 端点文档应包含：

```markdown
### METHOD /api/endpoint

**功能：** 简短描述

**需要认证：** 是/否

**请求 Body / Query 参数：**
```json
{
  "field": "description"
}
```

**响应 (状态码)：**
```json
{
  "success": true,
  ...
}
```

**业务逻辑：**
1. 步骤1
2. 步骤2

**前端调用：**
| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/pages/xxx.tsx` | `handleXxx()` | 点击按钮时 |
```

---

## 数据库模型

### 主要模型关系

```
User
├── Session (1:N)         # 用户梦境会话
│   ├── Message (1:N)     # 对话消息
│   ├── Answer (1:N)     # 问答记录
│   ├── Story (1:1)      # 生成的故事
│   └── StoryFeedback (1:N)  # 故事反馈
├── ShareLog (1:N)       # 分享记录
├── Invite (1:N)        # 邀请记录
├── Friend (1:N)         # 好友关系
├── DreamWall (1:N)      # 梦墙帖子
├── DreamWallLike (1:N)  # 点赞
└── DreamWallComment (1:N) # 评论
```

### Prisma 注意事项

- `findUnique` 只用于唯一字段（如 `id`、`openid`）
- 非唯一字段查询使用 `findFirst`
- 复合唯一约束使用 `@@unique([field1, field2])`

---

## 认证机制

### Token 格式

```
yeelin_<base64_payload>
```

Payload 结构：
```json
{
  "userId": "cuid_xxx",
  "exp": 1234567890123
}
```

### 认证中间件

```javascript
// server/src/middleware/auth.js
const authMiddleware = async (req, res) => {
  // 解析 Bearer Token
  // 验证过期时间
  // 将 userId 挂载到 req.userId
}
```

### 游客支持

未登录用户（游客）可以：
- 创建会话记录梦境
- 浏览梦墙

不可用功能：发布梦墙、点赞、评论、分享、好友

---

## 前端状态管理

使用 Zustand 的 `useDreamStore`：

```typescript
interface User {
  id: string
  openid: string
  nickname: string
  avatar: string | null
  points: number
  isMember: boolean
  // ...
}

interface DreamStore {
  user: User | null
  token: string | null
  setUser: (user: User, token: string) => void
  logout: () => void
  // ...
}
```

---

## 路由注册

后端路由在 `server/src/index.js` 中注册：

```javascript
fastify.register(sessionRoutes, { prefix: '/api' })
fastify.register(shareRoutes, { prefix: '/api' })
fastify.register(authRoutes, { prefix: '/api' })
fastify.register(friendRoutes, { prefix: '/api' })
fastify.register(dreamWallRoutes, { prefix: '/api' })
fastify.register(storyFeedbackRoutes, { prefix: '/api' })
```

---

## 前端 API 封装

前端 API 集中在 `src/services/api.ts`：

```typescript
export const api = {
  getInterpretation: (sessionId: string) => {...},
  // ...
}

export const authApi = {...}
export const sessionApi = {...}
export const shareApi = {...}
export const friendApi = {...}
export const wallApi = {...}
```

---

## 常用命令

### 前端
```bash
npm run dev      # 开发模式
npm run build   # 生产构建
```

### 后端
```bash
cd server
npm run dev      # 开发模式
npx prisma db push  # 同步数据库结构
npx prisma studio  # 打开数据库管理界面
```

---

## 注意事项

### 前端
- 所有页面组件放在 `src/pages/` 目录
- 公共组件放在 `src/components/` 目录
- 使用 CSS Module (`.module.css`) 进行样式隔离
- 路由使用 React Router v6

### 后端
- 路由文件放在 `server/src/routes/`
- 服务逻辑放在 `server/src/services/`
- 中间件放在 `server/src/middleware/`
- 使用 async/await 处理异步操作

### 数据库
- 生产环境使用 PostgreSQL
- 修改 Prisma Schema 后需要 `npx prisma db push`
- 生成客户端 `npx prisma generate`

---

## 相关资源

- [React Router 文档](https://reactrouter.com/)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [Fastify 文档](https://www.fastify.io/)
- [Prisma 文档](https://www.prisma.io/docs)
