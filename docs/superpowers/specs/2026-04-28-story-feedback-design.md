# 故事反馈机制设计

## 概述

在故事生成后让用户评价AI故事与梦境的匹配度，包括整体满意度和元素还原度。反馈数据用于后续AI模型优化。

## 时机

故事阅读完成后自动出现（用户滚动到故事底部后淡入显示）。

## UI设计

### 反馈表单位置
Story页面底部，评论/分享按钮组下方

### 反馈内容

**1. 整体满意度** - 5星打分

**2. 元素还原度评估** - 5个维度的1-5星打分：
| 维度 | 说明 |
|------|------|
| 人物还原 | 梦境中的人物是否出现在故事中 |
| 地点还原 | 梦境场景是否正确呈现 |
| 物品还原 | 梦境中的重要物品是否出现 |
| 情绪还原 | 整体氛围和情绪是否匹配 |
| 剧情还原 | 故事发展是否合理 |

**3. 文字反馈（选填）** - 最多200字

### UI组件

- 评分使用星星图标，点击/悬停选择
- 元素还原度使用折叠面板，默认展开
- 文字反馈使用textarea
- 提交按钮："提交反馈"
- 跳过按钮："暂时跳过"（用户可选择不反馈）

## 交互流程

1. 用户阅读故事，滚动到底部
2. 反馈表单淡入显示（带0.5s动画）
3. 用户可选择评分或直接跳过
4. 提交后显示"感谢反馈"提示，3秒后自动消失
5. 跳过后表单隐藏，不再显示

## 状态管理

- 已提交过反馈的session不显示反馈表单（localStorage缓存sessionId+已提交标志）
- 用户登录状态下提交反馈关联openid

## API设计

**POST /api/story-feedback**

Request:
```json
{
  "sessionId": "string",
  "openid": "string (optional, if logged in)",
  "overallRating": 1-5,
  "elementRatings": {
    "character": 1-5,
    "location": 1-5,
    "object": 1-5,
    "emotion": 1-5,
    "plot": 1-5
  },
  "comment": "string (optional, max 200)"
}
```

Response:
```json
{
  "success": true
}
```

## 数据存储

新建 `StoryFeedback` model:
```prisma
model StoryFeedback {
  id          String   @id @default(cuid())
  sessionId   String
  openid      String?
  overallRating    Int
  characterRating Int?
  locationRating  Int?
  objectRating    Int?
  emotionRating   Int?
  plotRating      Int?
  comment      String?
  createdAt   DateTime @default(now())
}
```

## 实现任务

1. 创建数据库migration添加StoryFeedback表
2. 后端：创建反馈API路由
3. 前端：创建FeedbackForm组件
4. 前端：在Story页面集成反馈表单
5. 前端：实现滚动检测和淡入动画
6. 前端：localStorage缓存已提交状态
7. 测试完整流程
