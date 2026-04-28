# 创作者反馈面板设计

## 概述

让故事创作者查看读者对其故事的评分和反馈，同时让所有用户都能看到评论内容。

## 数据结构

评论（Comment）和反馈面板（Feedback Panel）是分开的：
- **评论内容**：所有用户都能看到
- **反馈面板（含统计）**：仅作者能看到

## 入口

### Story页面

**评论区域**（所有从梦墙进入的用户都能看到）：
- 评论数量
- 全部评论列表（overallRating星星 + 评论内容 + 相对时间）

**反馈面板入口**（仅作者可见）：
- "查看反馈"按钮
- 点击展开完整反馈面板

### 梦墙列表

每条故事卡片显示：
- 评论数量
- 最新1-2条评论内容预览

## Story页面权限

| 用户角色 | 评论数量 | 评论内容 | 反馈按钮 | 反馈面板（含统计） |
|----------|----------|----------|----------|-------------------|
| 非作者 | ✅ 可见 | ✅ 可见 | ❌ 不显示 | ❌ 不显示 |
| 作者 | ✅ 可见 | ✅ 可见 | ✅ 显示 | ✅ 显示 |

作者判断逻辑：
- `fromDreamWall && storyAuthorOpenid && currentUserOpenid === storyAuthorOpenid`
- 或 `!fromDreamWall && currentUserOpenid`

## 反馈面板内容

### 整体评分
- 显示平均分（1-5星，保留1位小数）
- 反馈数量：如 "4.2分 · 12条反馈"
- 无反馈时显示 "暂无反馈"

### 各维度评分
5个维度的平均分，以柱状图或列表形式展示：

| 维度 | 字段 |
|------|------|
| 人物 | characterRating |
| 地点 | locationRating |
| 物品 | objectRating |
| 情绪 | emotionRating |
| 剧情 | plotRating |

- 各维度满分5分，显示平均分（保留1位小数）
- 未评分的维度不显示

## API设计

### GET /api/story-feedback/:sessionId/all

返回该session的所有反馈（用于反馈面板统计）。

Response:
```json
{
  "success": true,
  "feedbacks": [
    {
      "id": "xxx",
      "overallRating": 5,
      "elementRatings": {
        "character": 4,
        "location": 5,
        "object": 4,
        "emotion": 5,
        "plot": 4
      },
      "comment": "很棒的故事！",
      "createdAt": "2026-04-28T10:00:00Z"
    }
  ],
  "stats": {
    "count": 12,
    "overallAvg": 4.2,
    "elementAvgs": {
      "character": 4.1,
      "location": 4.3,
      "object": 3.9,
      "emotion": 4.0,
      "plot": 4.2
    }
  }
}
```

## 组件结构

### StoryCommentList（新组件）
- Props: sessionId
- 显示所有评论
- 所有用户可见

### StoryFeedbackPanel（新组件）
- Props: sessionId, isAuthor
- 仅 isAuthor=true 时渲染
- 展开/收起状态
- 调用API获取反馈数据
- 渲染统计数据

### StoryFeedbackForm
保持独立，仅负责提交反馈。

## 实现任务

1. 后端：新增 GET /api/story-feedback/:sessionId/all 路由
2. 前端：创建 StoryCommentList 组件（评论列表）
3. 前端：创建 StoryFeedbackPanel 组件（反馈面板）
4. 前端：在 Story 页面集成评论列表（所有用户可见）
5. 前端：在 Story 页面集成反馈面板入口（仅作者）
6. 前端：更新 DreamWall 卡片显示评论预览
7. 测试完整流程
