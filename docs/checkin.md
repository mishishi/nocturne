# 签到模块 (CheckIn)

> 签到模块用于记录用户每日的梦境记录签到，跟踪连续签到天数。

---

## 数据模型

### CheckIn

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键，cuid 格式 |
| openid | String | 用户 openid |
| date | String | 签到日期，格式为 `YYYY-MM-DD` |
| createdAt | DateTime | 记录创建时间 |

**约束：**
- `@@unique([openid, date])` - 同一用户同一天只能有一条签到记录

---

## API 端点

### POST /api/checkin

**功能：** 用户每日签到

**需要认证：** 是

**请求 Body：** 无

**响应 (200)：**
```json
{
  "success": true,
  "consecutiveDays": 5,
  "alreadyCheckedIn": false
}
```

**响应说明：**
- `consecutiveDays`: 连续签到天数
- `alreadyCheckedIn`: 是否已经签到过（当天重复签到时为 true）

**业务逻辑：**
1. 从 auth middleware 获取用户的 openid
2. 获取今天的日期 (YYYY-MM-DD 格式)
3. 查询是否已经签到过
4. 如果已签到，返回现有记录和连续天数
5. 如果未签到，创建新的签到记录
6. 计算连续签到天数并返回

**错误响应 (401)：**
```json
{
  "success": false,
  "reason": "未授权"
}
```

---

### GET /api/checkin/status

**功能：** 获取用户签到状态

**需要认证：** 是

**请求 Body：** 无

**响应 (200)：**
```json
{
  "success": true,
  "checkedInToday": true,
  "consecutiveDays": 5
}
```

**响应说明：**
- `checkedInToday`: 今日是否已签到
- `consecutiveDays`: 连续签到天数

**业务逻辑：**
1. 从 auth middleware 获取用户的 openid
2. 查询今日是否有签到记录
3. 计算连续签到天数（从今天或昨天开始向前计算）

**连续天数计算规则：**
- 如果今天已签到，从今天开始向前计算连续天数
- 如果今天未签到但昨天已签到，从昨天开始向前计算
- 否则返回 0

---

### GET /api/checkin/history

**功能：** 获取用户签到历史

**需要认证：** 是

**请求 Body：** 无

**响应 (200)：**
```json
{
  "success": true,
  "records": [
    {
      "id": "cuid_xxx",
      "date": "2026-04-28",
      "createdAt": "2026-04-28T10:30:00.000Z"
    },
    {
      "id": "cuid_yyy",
      "date": "2026-04-27",
      "createdAt": "2026-04-27T09:15:00.000Z"
    }
  ]
}
```

**业务逻辑：**
1. 从 auth middleware 获取用户的 openid
2. 查询该用户所有签到记录
3. 按日期倒序返回

---

## 前端调用

| 文件 | 函数 | 触发时机 |
|------|------|----------|
| `src/hooks/useDreamStore.ts` | `addToHistory()` | 完成梦境记录后自动签到 |
| `src/pages/Profile.tsx` | `fetchCheckInStatus()` | Profile 页面加载时 |

---

## 签到状态存储

签到状态存储在 Zustand store 中：

```typescript
interface DreamState {
  checkedInToday: boolean   // 今日是否已签到
  consecutiveDays: number    // 连续签到天数
  setCheckInStatus: (checkedInToday: boolean, consecutiveDays: number) => void
}
```

---

## 注意事项

- 签到与分享是独立的系统，签到记录梦境，分享记录分享行为
- 签到状态在用户完成梦境记录后自动触发
- 签到数据持久化在 PostgreSQL 数据库中
