---
name: api-documentation-maintenance
description: Maintain API docs in docs/ folder whenever backend APIs change
type: project
---

# API 文档维护指南

## 规则

**每次修改或新建后端 API 后，必须同步更新 `docs/` 目录下的文档。**

## 维护范围

| 修改类型 | 需要更新的文档 |
|---------|---------------|
| 新建路由文件 (`server/src/routes/*.js`) | 在对应模块文档新增端点（如 `docs/wall.md`） |
| 修改现有端点的参数/响应/逻辑 | 更新对应端点的详细说明 |
| 新增数据库模型 | 更新对应文档的"数据库模型"章节 |
| 前端新增 API 调用 | 更新对应端点的"前端调用"表格 |

## 文档结构

```
docs/
├── README.md        # 总索引，包含快速索引表
├── auth.md          # 认证 API (6 endpoints)
├── session.md       # 会话/梦境 API (8 endpoints)
├── share.md         # 分享/积分 API (4 endpoints)
├── friend.md        # 好友 API (9 endpoints)
└── wall.md          # 梦墙 API (6 endpoints)
```

## 端点文档模板

每个端点需要包含：
1. **端点签名**（方法、路径、是否需要认证）
2. **请求参数**（Body/Query/URL params）
3. **响应格式**（成功/错误示例）
4. **业务逻辑说明**
5. **前端调用表格**（文件、函数、行号、触发时机）
6. **前端代码片段**

## 更新时机

- 完成 PR merge 后
- 每次 `server/src/routes/` 或 `server/src/services/` 下的文件变更后
- 每次 `src/services/api.ts` 变更后

## 为什么重要

夜棂 APP 有 33 个 API 端点，文档是开发协作的基础。不维护文档会导致：
- 前后端接口不一致
- 新开发者难以入手
- 问题排查困难
