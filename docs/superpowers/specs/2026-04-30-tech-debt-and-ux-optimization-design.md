# 技术债务清理与体验优化方案

**项目：** Nocturne（夜棂）
**日期：** 2026-04-30
**类型：** 技术优化
**优先级：** P0-P2

---

## 1. 背景与目标

### 现状问题
- `createNotification` 在 `friends.js` 和 `dreamWall.js` 中重复定义，违反 DRY 原则
- API 响应格式不一致，影响前端错误处理
- Prisma 查询缺少 `take` 限制，存在数据泄漏和性能风险
- 前端缺少 Error Boundary，错误体验不友好
- 骨架屏和空状态设计不完整

### 优化目标
1. 消除代码重复，统一通知创建逻辑
2. 统一 API 响应格式，建立前后端契约
3. 添加查询安全限制，防止数据泄漏
4. 提升前端错误处理和加载体验

---

## 2. 改动详情

### 2.1 P0 - 核心问题修复

#### 2.1.1 合并 `createNotification` 函数

**问题位置：**
- `server/src/routes/friends.js` - `createNotification` 定义
- `server/src/routes/dreamWall.js` - `createNotification` 定义

**解决方案：**
将 `createNotification` 提取到 `server/src/services/notificationService.js` 作为共享服务。

```javascript
// server/src/services/notificationService.js
async function createNotification({ db, userId, type, content, sourceId, sourceType }) {
  return db.notification.create({
    data: {
      userId,
      type,
      content,
      sourceId,
      sourceType,
      isRead: false,
      createdAt: new Date()
    }
  });
}
```

**改动文件：**
| 文件 | 操作 |
|------|------|
| `server/src/services/notificationService.js` | 新建 |
| `server/src/routes/friends.js` | 删除重复函数，改为 import |
| `server/src/routes/dreamWall.js` | 删除重复函数，改为 import |

---

#### 2.1.2 统一 API 响应格式

**当前问题：**
部分接口返回 `{ success: true, data: {...} }`，部分直接返回数据

**解决方案：**
在 `server/src/config/response.js` 或 `server/src/middleware/response.js` 中定义统一响应格式：

```javascript
// server/src/config/response.js
const successResponse = (data, message = 'OK') => ({
  success: true,
  message,
  data,
  timestamp: new Date().toISOString()
});

const errorResponse = (message, code = 'ERROR', details = null) => ({
  success: false,
  error: { code, message, details },
  timestamp: new Date().toISOString()
});

module.exports = { successResponse, errorResponse };
```

**改动范围：**
- 审计所有 route 文件，统一响应格式
- 前端 `api.ts` 相应调整，统一解析逻辑

---

### 2.2 P1 - 安全与体验

#### 2.2.1 Prisma 查询添加 take 限制

**问题：**
以下查询缺少 `take` 限制：
- `wallApi.getPosts` 相关查询
- `friendApi.getFriends` 相关查询
- `sessionApi.getSessions` 相关查询

**解决方案：**
为所有列表查询添加合理的 `take` 默认值（如 20-50 条），并在需要时支持分页参数。

```javascript
// 示例
const posts = await db.dreamWall.findMany({
  where: { ... },
  take: Math.min(limit || 20, 100),  // 最大不超过 100
  orderBy: { createdAt: 'desc' }
});
```

---

#### 2.2.2 前端 Error Boundary

**解决方案：**
在 `src/App.tsx` 或 `src/components/` 中添加 React Error Boundary：

```tsx
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
```

---

#### 2.2.3 骨架屏（仅 DreamWall 和 Friends）

**范围（仅两个核心页面）：**
- `src/pages/DreamWall.tsx` - 梦墙列表页
- `src/pages/Friends.tsx` - 好友列表页

**解决方案：**
创建 `src/components/Skeleton/` 目录：

```
src/components/Skeleton/
├── SkeletonCard.tsx      # 通用卡片骨架
├── SkeletonList.tsx      # 列表骨架
└── index.ts
```

**DreamWall 骨架布局：**
```
┌─────────────────────────────────┐
│  [头像]  昵称        时间        │
│  ████████████████████████████   │
│  ████████████                   │
│  [❤️ 123]  [💬 45]              │
└─────────────────────────────────┘
```

**Friends 骨架布局：**
```
┌─────────────────────────────────┐
│  [○头像]  昵称                   │
│          简介文字...             │
│                      [添加]      │
└─────────────────────────────────┘
```

**实现方式：**
使用 Framer Motion（项目已有）实现脉冲动画，不引入新依赖。

```tsx
// SkeletonCard.tsx 示例
const SkeletonCard = () => (
  <motion.div
    className="skeleton-card"
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ duration: 1.5, repeat: Infinity }}
  >
    {/* 占位元素 */}
  </motion.div>
);
```

---

### 2.3 P2 - 预留扩展点

#### 2.3.1 内容安全接口预留

**解决方案：**
在 `server/src/services/contentSafety.js` 中预留接口：

```javascript
// server/src/services/contentSafety.js
async function checkContentSafety(text, options = {}) {
  // 当前：正则检查
  const regexResult = checkRegex(text);

  // 预留：AI 审核集成点
  if (options.enableAI && process.env.AI_MODERATION_ENDPOINT) {
    // const aiResult = await callAIModeration(text);
    // return mergeResults(regexResult, aiResult);
  }

  return regexResult;
}

module.exports = { checkContentSafety };
```

---

## 3. 实施计划

| 阶段 | 任务 | 工作量 | 风险 |
|------|------|--------|------|
| **Phase 1** | 新建 notificationService.js 并迁移 | 0.5 天 | 低 |
| **Phase 1** | 更新 friends.js 和 dreamWall.js import | 0.5 小时 | 低 |
| **Phase 1** | 创建统一响应格式配置 | 0.5 小时 | 低 |
| **Phase 1** | 审计所有 route 文件，统一响应 | 1 天 | 中 |
| **Phase 2** | 添加 Prisma 查询 take 限制 | 0.5 天 | 低 |
| **Phase 2** | 实现前端 Error Boundary | 0.5 天 | 低 |
| **Phase 2** | 实现骨架屏组件 | 1 天 | 中 |
| **Phase 3** | 预留 contentSafety 接口 | 0.5 天 | 低 |

**总工期：约 3-4 天**

---

## 4. 测试验证

### 4.1 回归测试
- [ ] 通知功能在 friends 和 dreamWall 流程中正常工作
- [ ] 所有 API 响应格式一致
- [ ] 分页查询正常工作

### 4.2 边界测试
- [ ] 大数据量查询（>100条）被正确截断
- [ ] 错误场景下 Error Boundary 正常捕获
- [ ] 网络错误时前端正确提示

---

## 5. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 响应格式改动影响前端 | 中 | 分批次灰度发布 |
| 合并 createNotification 遗漏调用点 | 高 | 全局搜索确认所有引用 |
| take 限制影响现有功能 | 中 | 与产品确认合理的默认值 |
