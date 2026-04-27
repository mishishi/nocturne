# Error Boundary 设计方案

## 1. 概述

为「夜棂」前端应用添加 React Error Boundary 机制，实现全局崩溃兜底和页面级局部容错，提升线上稳定性。

## 2. 架构

### 分层设计

```
<App>
  <GlobalErrorBoundary>           ← 最外层，捕获整应用崩溃
    <Routes>
      <Route element={<PageErrorBoundary>}>  ← 每页面独立兜底
        <Home />
      </Route>
      <Route element={<PageErrorBoundary>}>
        <DreamWall />
      </Route>
      ...
    </Routes>
  </GlobalErrorBoundary>
</App>
```

### GlobalErrorBoundary（全局层）
- 位置：App.tsx 最外层
- 作用：捕获所有未被页面级 Error Boundary 捕获的顶层崩溃
- 触发后：渲染静态错误提示，提供刷新按钮

### PageErrorBoundary（页面级）
- 位置：每个 Route 包裹
- 作用：单页面崩溃不影响其他页面
- 触发后：该页面区域渲染错误兜底卡片，其他页面正常

## 3. 兜底 UI 设计

### 样式原则
- 与「夜棂」暗黑星空主题保持一致
- 不使用 emoji，用 SVG 图标

### 全局崩溃兜底
```
[星空背景 + 装饰性图形]
「页面出错了」
「抱歉，内容加载时遇到问题」
[ 刷新页面 ]   ← primary button
```

### 页面级崩溃兜底
```
[装饰性星星图形]
「该页面暂时无法加载」
[ 重新加载 ]   ← text button，触发 componentDidCatch 重渲染
```

## 4. 错误捕获范围

| 捕获 | 不捕获 |
|------|--------|
| 渲染时的 JS 错误 | 事件处理器的同步错误（用 try/catch） |
| 子组件渲染错误 | 异步错误（Promise rejection，用 .catch） |
| 构造函数错误 | Server Side Rendering 错误 |

## 5. 组件实现

### GlobalErrorBoundary.tsx
- 继承 `React.Component`
- 实现 `componentDidCatch(error, errorInfo)`
- state: `{ hasError: boolean }`
- 提供 `resetError` 方法（通过刷新页面重置）

### PageErrorBoundary.tsx
- 同上，但仅覆盖当前路由页面
- 支持通过 `window.history.back()` 导航离开崩溃页面

## 6. 文件清单

| 操作 | 文件 |
|------|------|
| 新增 | `src/components/GlobalErrorBoundary.tsx` |
| 新增 | `src/components/PageErrorBoundary.tsx` |
| 修改 | `src/App.tsx`（包裹 GlobalErrorBoundary） |
| 新增 | `src/components/ErrorFallback.module.css` |

## 7. 测试场景

- [ ] Home 页面崩溃，Dream Wall 仍可访问
- [ ] 全局崩溃后点击刷新恢复
- [ ] 页面级崩溃点击「重新加载」后恢复
- [ ] 无错误时正常渲染
