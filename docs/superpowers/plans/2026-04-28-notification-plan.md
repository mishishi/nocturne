# Notification Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a notification center for real-time user interaction feedback (likes, comments, friend requests)

**Architecture:** Pull-based notification system with snapshot unread counting. Notifications stored in PostgreSQL with 30-day retention. Triggers from existing endpoints (wall like/comment, friend request/accept).

**Tech Stack:** Fastify backend, Prisma ORM, React frontend with Zustand

---

## Task 1: Add Prisma Schema Changes

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add `lastViewedNotificationsAt` to User model**

Add `lastViewedNotificationsAt DateTime?` field to User model after existing fields.

- [ ] **Step 2: Add Notification model**

```prisma
model Notification {
  id          String   @id @default(cuid())
  openid      String   // 接收通知的用户
  type        String   // LIKE | COMMENT | FRIEND_REQUEST | FRIEND_ACCEPTED
  fromOpenid  String   // 触发通知的用户
  fromNickname String  // 触发通知的用户昵称（快照）
  targetId    String?  // 关联目标ID（如故事ID）
  targetTitle String?  // 关联目标标题（如故事标题）
  message     String   // 通知文案
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
  expiresAt   DateTime // 30天后过期

  user        User     @relation("Notifications", fields: [openid], references: [openid])
  fromUser    User     @relation("NotificationFrom", fields: [fromOpenid], references: [openid])

  @@index([openid, createdAt])
  @@index([openid, isRead])
  @@index([expiresAt])
}
```

- [ ] **Step 3: Update User model relations**

Add to User model:
```prisma
lastViewedNotificationsAt DateTime?
notifications Notification[] @relation("Notifications")
```

- [ ] **Step 4: Push schema to database**

Run: `cd server && npx prisma db push`
Expected: Schema updated successfully

- [ ] **Step 5: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat: add Notification model and User.lastViewedNotificationsAt"
```

---

## Task 2: Create Notification Routes

**Files:**
- Create: `server/src/routes/notifications.js`
- Modify: `server/src/index.js`

- [ ] **Step 1: Create notifications route file**

Create `server/src/routes/notifications.js` with 4 endpoints:
- `GET /api/notifications` - 获取通知列表（分页）
- `GET /api/notifications/unread-count` - 获取未读数
- `POST /api/notifications/mark-read` - 全部已读
- `POST /api/notifications/:notificationId/read` - 单条已读

Each endpoint should:
- Use auth middleware for authentication
- Query/update Notification table via Prisma
- Return appropriate JSON responses per spec

- [ ] **Step 2: Register route in index.js**

Add to `server/src/index.js`:
```javascript
const notificationRoutes = require('./routes/notifications')
fastify.register(notificationRoutes, { prefix: '/api' })
```

- [ ] **Step 3: Test endpoints manually**

Start server and test with curl:
```bash
curl -X GET http://localhost:4000/api/notifications
curl -X GET http://localhost:4000/api/notifications/unread-count
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/notifications.js server/src/index.js
git commit -m "feat: add notification API endpoints"
```

---

## Task 3: Trigger Notifications in DreamWall

**Files:**
- Modify: `server/src/routes/dreamWall.js`

- [ ] **Step 1: Add notification creation helper**

Add helper function to create notification records after like/comment actions.

- [ ] **Step 2: Trigger LIKE notification**

In `POST /wall/:postId/like` endpoint, after successful like:
1. Get post author openid (not the liker)
2. Create Notification with type `LIKE`
3. Store snapshot of liker nickname, post title
4. Set expiresAt = now + 30 days

- [ ] **Step 3: Trigger COMMENT notification**

In `POST /wall/:postId/comments` endpoint, after successful comment:
1. Get post author openid (not the commenter)
2. Create Notification with type `COMMENT`
3. Store snapshot of commenter nickname
4. Set expiresAt = now + 30 days

- [ ] **Step 4: Skip self-notification**

Add check: if post author openid === action actor openid, skip notification creation.

- [ ] **Step 5: Test like notification**

Test with: `curl -X POST http://localhost:4000/api/wall/:postId/like -H "Content-Type: application/json" -d '{"openid":"user_xxx"}'`

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/dreamWall.js
git commit -m "feat: trigger notifications on wall like and comment"
```

---

## Task 4: Trigger Notifications in Friends

**Files:**
- Modify: `server/src/routes/friends.js`

- [ ] **Step 1: Trigger FRIEND_REQUEST notification**

In `POST /friends/request` endpoint, after successful request:
1. Get target user openid
2. Create Notification with type `FRIEND_REQUEST`
3. Store snapshot of requester nickname
4. Set expiresAt = now + 30 days

- [ ] **Step 2: Trigger FRIEND_ACCEPTED notification**

In `POST /friends/accept` endpoint, after successful accept:
1. Get requester openid (not the acceptor)
2. Create Notification with type `FRIEND_ACCEPTED`
3. Store snapshot of acceptor nickname
4. Set expiresAt = now + 30 days

- [ ] **Step 3: Test friend request notification**

Test with: `curl -X POST http://localhost:4000/api/friends/request -H "Content-Type: application/json" -d '{"fromOpenid":"user_xxx","toOpenid":"user_yyy"}'`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/friends.js
git commit -m "feat: trigger notifications on friend request and accept"
```

---

## Task 5: Add Frontend Notification API

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Add notificationApi object**

Add notificationApi with methods:
```typescript
export const notificationApi = {
  getNotifications: (page: number = 1, limit: number = 20) => {...},
  getUnreadCount: () => {...},
  markAllRead: () => {...},
  markOneRead: (notificationId: string) => {...}
}
```

- [ ] **Step 2: Export notificationApi**

Add to exports at bottom of file.

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add notificationApi to frontend"
```

---

## Task 6: Create Notifications Page Component

**Files:**
- Create: `src/pages/Notifications.tsx`

- [ ] **Step 1: Create Notifications page**

Create page with:
- Navbar with back button and "全部已读" button
- Notification list with cards showing:
  - Left: trigger user avatar (default anonymous icon)
  - Middle: notification content + time
  - Right: unread red dot (if unread)
- Click handler to navigate to target page based on type

- [ ] **Step 2: Style with CSS Module**

Create `src/pages/Notifications.module.css` with styles.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Notifications.tsx src/pages/Notifications.module.css
git commit -m "feat: add Notifications page component"
```

---

## Task 7: Add Route and Navbar Badge

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add /notifications route**

Add route in App.tsx:
```tsx
<Route path="/notifications" element={<Notifications />} />
```

- [ ] **Step 2: Add notification badge to Navbar**

In Navbar.tsx:
1. Add `notificationUnreadCount` state
2. Add interval to poll `notificationApi.getUnreadCount()` every 60s
3. Show red badge with count on notification icon
4. Add notification bell icon click handler to navigate to /notifications

- [ ] **Step 3: Test navigation**

Click notification icon should navigate to /notifications

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Navbar.tsx
git commit -m "feat: add notifications route and navbar badge"
```

---

## Task 8: Update Documentation

**Files:**
- Create: `docs/notifications.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Create notifications.md**

Document all notification API endpoints per spec format.

- [ ] **Step 2: Update README.md**

Add to quick index table and update log.

- [ ] **Step 3: Commit**

```bash
git add docs/notifications.md docs/README.md
git commit -m "docs: add notification API documentation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Notification types: LIKE, COMMENT, FRIEND_REQUEST, FRIEND_ACCEPTED | Tasks 3, 4 |
| GET /api/notifications (paginated) | Task 2 |
| GET /api/notifications/unread-count | Task 2 |
| POST /api/notifications/mark-read | Task 2 |
| POST /api/notifications/:notificationId/read | Task 2 |
| Snapshot-based unread counting (lastViewedNotificationsAt) | Tasks 1, 2 |
| 30-day retention (expiresAt) | Tasks 1, 3, 4 |
| Trigger on wall like | Task 3 |
| Trigger on wall comment | Task 3 |
| Trigger on friend request | Task 4 |
| Trigger on friend accept | Task 4 |
| No self-notification | Tasks 3, 4 |
| Navbar badge | Task 7 |
| Notifications page | Task 6 |
| Click navigation mapping | Task 6 |
| Documentation | Task 8 |

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-04-28-notification-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
