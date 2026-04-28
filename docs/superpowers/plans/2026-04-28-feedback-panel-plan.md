# 创作者反馈面板实现计划

## 概述

让故事创作者查看读者对其故事的评分和反馈，同时让所有用户都能看到评论内容。

## 问题

当前 StoryFeedback 模型使用 `sessionId @unique`，意味着每个故事只能有一条反馈记录。需要修改为允许同一故事有多个用户的反馈。

## 文件结构

- server/src/routes/storyFeedback.js - 新增获取所有反馈的API
- src/services/api.ts - 新增storyFeedbackApi.getAll方法
- src/components/StoryCommentList.tsx - 新组件，显示评论列表
- src/components/StoryCommentList.module.css - 新样式文件
- src/components/StoryFeedbackPanel.tsx - 新组件，显示统计面板
- src/components/StoryFeedbackPanel.module.css - 新样式文件
- src/pages/Story.tsx - 集成评论列表和反馈面板

## 实现任务

### Task 1: 修改数据库Schema允许同一Session有多条反馈

**文件:**
- Modify: server/prisma/schema.prisma:179-196

**步骤:**

- [ ] Step 1: 修改StoryFeedback模型的sessionId，去除@unique约束，改为普通String

```prisma
model StoryFeedback {
  id               String   @id @default(cuid())
  sessionId        String   // 去除 @unique 约束
  openid           String
  // ... 其他字段
}
```

- [ ] Step 2: 创建数据库migration

Run: `cd server && npx prisma migrate dev --name allow_multiple_feedbacks_per_session`

### Task 2: 后端API - 获取所有反馈

**文件:**
- Modify: server/src/routes/storyFeedback.js

**步骤:**

- [ ] Step 1: 新增GET /api/story-feedback/:sessionId/all路由

在storyFeedback.js末尾添加新路由：

```javascript
// GET /api/story-feedback/:sessionId/all - 获取该session的所有反馈
fastify.get('/story-feedback/:sessionId/all', async (req, res) => {
  const { sessionId } = req.params

  const feedbacks = await prisma.storyFeedback.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' }
  })

  // 计算统计数据
  const count = feedbacks.length
  if (count === 0) {
    return {
      success: true,
      feedbacks: [],
      stats: {
        count: 0,
        overallAvg: 0,
        elementAvgs: null
      }
    }
  }

  const overallSum = feedbacks.reduce((sum, f) => sum + f.overallRating, 0)
  const overallAvg = parseFloat((overallSum / count).toFixed(1))

  // 计算各维度平均
  const elementAvgs = {
    character: calculateAvg(feedbacks, 'characterRating'),
    location: calculateAvg(feedbacks, 'locationRating'),
    object: calculateAvg(feedbacks, 'objectRating'),
    emotion: calculateAvg(feedbacks, 'emotionRating'),
    plot: calculateAvg(feedbacks, 'plotRating')
  }

  return {
    success: true,
    feedbacks: feedbacks.map(f => ({
      id: f.id,
      overallRating: f.overallRating,
      elementRatings: {
        character: f.characterRating,
        location: f.locationRating,
        object: f.objectRating,
        emotion: f.emotionRating,
        plot: f.plotRating
      },
      comment: f.comment,
      createdAt: f.createdAt
    })),
    stats: {
      count,
      overallAvg,
      elementAvgs
    }
  }
})

function calculateAvg(feedbacks, field) {
  const values = feedbacks.map(f => f[field]).filter(v => v !== null)
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  return parseFloat((sum / values.length).toFixed(1))
}
```

- [ ] Step 2: 测试API

Run: `curl http://localhost:4000/api/story-feedback/{sessionId}/all`

### Task 3: 前端API - 添加getAll方法

**文件:**
- Modify: src/services/api.ts:563-587

**步骤:**

- [ ] Step 1: 在storyFeedbackApi中添加getAll方法

在api.ts的storyFeedbackApi对象中添加：

```typescript
// Get all feedbacks for a session
async getAll(sessionId: string): Promise<{
  feedbacks: Array<{
    id: string
    overallRating: number
    elementRatings: {
      character?: number
      location?: number
      object?: number
      emotion?: number
      plot?: number
    }
    comment?: string
    createdAt: string
  }>
  stats: {
    count: number
    overallAvg: number
    elementAvgs: {
      character?: number
      location?: number
      object?: number
      emotion?: number
      plot?: number
    }
  }
}> {
  const res = await fetchWithTimeout(`${API_BASE}/story-feedback/${sessionId}/all`)
  if (!res.ok) throw new Error(`获取反馈失败: ${res.status}`)
  return res.json()
}
```

### Task 4: StoryCommentList组件

**文件:**
- Create: src/components/StoryCommentList.tsx
- Create: src/components/StoryCommentList.module.css

**步骤:**

- [ ] Step 1: 创建组件

```tsx
import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import styles from './StoryCommentList.module.css'

interface StoryCommentListProps {
  sessionId: string
}

interface Comment {
  id: string
  overallRating: number
  comment?: string
  createdAt: string
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={`${styles.star} ${star <= rating ? styles.filled : ''}`}>
          ★
        </span>
      ))}
    </div>
  )
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays}天前`
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function StoryCommentList({ sessionId }: StoryCommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const result = await storyFeedbackApi.getAll(sessionId)
        // 只取有评论的内容
        setComments(result.feedbacks.filter(f => f.comment))
      } catch (err) {
        console.error('Failed to load comments:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  if (comments.length === 0) {
    return <div className={styles.empty}>暂无评论</div>
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>评论 ({comments.length})</h3>
      <div className={styles.list}>
        {comments.map(comment => (
          <div key={comment.id} className={styles.item}>
            <div className={styles.header}>
              <StarDisplay rating={comment.overallRating} />
              <span className={styles.date}>{formatDate(comment.createdAt)}</span>
            </div>
            <p className={styles.content}>{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] Step 2: 创建样式文件StoryCommentList.module.css

```css
.container {
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-top: 16px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.loading,
.empty {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  background: white;
  padding: 12px;
  border-radius: 6px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #ddd;
  font-size: 14px;
}

.star.filled {
  color: #ffd666;
}

.date {
  font-size: 12px;
  color: #999;
}

.content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  margin: 0;
}
```

### Task 5: StoryFeedbackPanel组件

**文件:**
- Create: src/components/StoryFeedbackPanel.tsx
- Create: src/components/StoryFeedbackPanel.module.css

**步骤:**

- [ ] Step 1: 创建组件

```tsx
import { useState, useEffect } from 'react'
import { storyFeedbackApi } from '../services/api'
import styles from './StoryFeedbackPanel.module.css'

interface StoryFeedbackPanelProps {
  sessionId: string
}

interface Stats {
  count: number
  overallAvg: number
  elementAvgs: {
    character?: number
    location?: number
    object?: number
    emotion?: number
    plot?: number
  }
}

const ELEMENT_LABELS = {
  character: '人物',
  location: '地点',
  object: '物品',
  emotion: '情绪',
  plot: '剧情'
}

export function StoryFeedbackPanel({ sessionId }: StoryFeedbackPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const result = await storyFeedbackApi.getAll(sessionId)
        setStats(result.stats)
      } catch (err) {
        console.error('Failed to load feedback stats:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return <div className={styles.loading}>加载中...</div>
  }

  if (!stats || stats.count === 0) {
    return (
      <div className={styles.empty}>
        <p>暂无反馈</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <button 
        className={styles.toggleBtn}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>查看反馈</span>
        <span className={`${styles.arrow} ${isExpanded ? styles.expanded : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {/* 整体评分 */}
          <div className={styles.overall}>
            <span className={styles.avgScore}>{stats.overallAvg}</span>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <span 
                  key={star} 
                  className={`${styles.star} ${star <= Math.round(stats.overallAvg) ? styles.filled : ''}`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className={styles.count}>{stats.count}条反馈</span>
          </div>

          {/* 各维度评分 */}
          <div className={styles.elements}>
            <h4 className={styles.elementsTitle}>各维度评分</h4>
            {Object.entries(stats.elementAvgs).map(([key, value]) => {
              if (value === null || value === undefined) return null
              return (
                <div key={key} className={styles.elementRow}>
                  <span className={styles.elementLabel}>{ELEMENT_LABELS[key as keyof typeof ELEMENT_LABELS]}</span>
                  <div className={styles.elementBar}>
                    <div 
                      className={styles.elementFill} 
                      style={{ width: `${(value / 5) * 100}%` }}
                    />
                  </div>
                  <span className={styles.elementValue}>{value}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] Step 2: 创建样式文件StoryFeedbackPanel.module.css

```css
.container {
  margin-top: 16px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.toggleBtn {
  width: 100%;
  padding: 12px 16px;
  background: #f8f8f8;
  border: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.arrow {
  font-size: 10px;
  transition: transform 0.2s;
}

.arrow.expanded {
  transform: rotate(180deg);
}

.content {
  padding: 16px;
  border-top: 1px solid #eee;
}

.loading,
.empty {
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.overall {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.avgScore {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stars {
  display: flex;
  gap: 2px;
}

.star {
  color: #ddd;
  font-size: 16px;
}

.star.filled {
  color: #ffd666;
}

.count {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.elements {
  background: #f8f8f8;
  padding: 12px;
  border-radius: 6px;
}

.elementsTitle {
  font-size: 13px;
  color: #666;
  margin: 0 0 8px 0;
}

.elementRow {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.elementRow:last-child {
  margin-bottom: 0;
}

.elementLabel {
  width: 40px;
  font-size: 12px;
  color: #666;
}

.elementBar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.elementFill {
  height: 100%;
  background: #ffd666;
  border-radius: 3px;
  transition: width 0.3s;
}

.elementValue {
  width: 24px;
  font-size: 12px;
  color: #333;
  text-align: right;
}
```

### Task 6: Story页面集成

**文件:**
- Modify: src/pages/Story.tsx

**步骤:**

- [ ] Step 1: 引入新组件

在Story.tsx顶部添加：
```tsx
import { StoryCommentList } from '../components/StoryCommentList'
import { StoryFeedbackPanel } from '../components/StoryFeedbackPanel'
```

- [ ] Step 2: 在StoryFeedbackForm上方添加评论列表

在StoryFeedbackForm组件上方添加：
```tsx
{/* Comments - visible to all users from Dream Wall */}
{fromDreamWall && (
  <StoryCommentList sessionId={sessionId} />
)}

{/* Feedback Panel - only visible to author */}
{fromDreamWall && isAuthor && (
  <StoryFeedbackPanel sessionId={sessionId} />
)}
```

放置位置：在StoryFeedbackForm之前（约第984行附近）

- [ ] Step 3: 验证

验证以下场景：
1. 从梦墙进入他人故事：能看到评论列表，无反馈按钮
2. 从梦墙进入自己故事：能看到评论列表，有反馈按钮，点击展开统计
3. 从历史记录进入自己故事：能看到评论列表，有反馈按钮

### Task 7: DreamWall评论预览（可选，后续Task 2需要）

此任务在精选算法实现时处理。

## 总结

实现顺序：
1. Schema修改（允许同一session多条反馈）
2. 后端API
3. 前端API方法
4. StoryCommentList组件
5. StoryFeedbackPanel组件
6. Story页面集成
