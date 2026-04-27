# Data Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to export all their personal data as a JSON file for GDPR/personal data law compliance.

**Architecture:** Backend exposes `POST /api/auth/export-data` returning JSON stream with all user data. Frontend has a confirm modal and triggers browser download via blob URL.

**Tech Stack:** Express.js (fastify route), Prisma queries, React confirm modal, fetch + blob download.

---

## File Map

| File | Responsibility |
|------|----------------|
| `server/src/routes/auth.js` | New `/export-data` route |
| `src/services/api.ts` | `exportData()` method |
| `src/components/ExportDataModal.tsx` | Confirm dialog |
| `src/components/ExportDataModal.module.css` | Modal styles |
| `src/pages/Profile.tsx` | Add export entry point |

---

## Backend: Export Data Route

### Task 1: Add /export-data Route

**Files:**
- Modify: `server/src/routes/auth.js`
- Test: manual via curl or Postman

- [ ] **Step 1: Read current auth.js end**

```bash
tail -20 server/src/routes/auth.js
```

- [ ] **Step 2: Add the route before the closing `}` of the exports**

Append this route to `server/src/routes/auth.js`:

```javascript
  // POST /api/auth/export-data - 导出用户所有数据
  fastify.post('/auth/export-data', {
    preHandler: async (req, res) => {
      await authMiddleware(req, res)
    }
  }, async (req, res) => {
    try {
      const userId = req.userId
      const user = await authService.getUser(userId)

      if (!user) {
        return res.status(404).send({ error: '用户不存在' })
      }

      // Fetch all user data in parallel
      const [sessions, posts, friends, shareLogs] = await Promise.all([
        // Dreams: sessions with answers and story
        prisma.session.findMany({
          where: { openid: user.openid },
          include: {
            answers: true,
            story: true
          },
          orderBy: { createdAt: 'asc' }
        }),
        // Wall posts with comments
        prisma.dreamWall.findMany({
          where: { openid: user.openid },
          include: {
            comments: {
              select: {
                id: true,
                content: true,
                isAnonymous: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }),
        // Friends (accepted only)
        prisma.friend.findMany({
          where: { userId: user.id, status: 'ACCEPTED' },
          include: { friend: true },
          orderBy: { createdAt: 'asc' }
        }),
        // Share logs
        prisma.shareLog.findMany({
          where: { openid: user.openid },
          orderBy: { createdAt: 'asc' }
        })
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        appVersion: '1.0.0',
        user: {
          openid: user.openid,
          nickname: user.nickname || null,
          phone: user.phone || null,
          createdAt: user.firstSeen,
          isMember: user.isMember,
          points: user.points,
          medals: user.medals
        },
        dreams: sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt,
          status: s.status,
          answers: s.answers.map(a => ({
            questionIndex: a.questionIndex,
            questionText: a.questionText,
            answerText: a.answerText,
            answeredAt: a.answeredAt
          })),
          story: s.story ? {
            id: s.story.id,
            title: s.story.title,
            content: s.story.content,
            interpretation: s.story.interpretation || null,
            createdAt: s.story.createdAt
          } : null
        })),
        wallPosts: posts.map(p => ({
          id: p.id,
          storyTitle: p.storyTitle,
          storySnippet: p.storySnippet,
          isAnonymous: p.isAnonymous,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          createdAt: p.createdAt,
          comments: p.comments.map(c => ({
            content: c.content,
            isAnonymous: c.isAnonymous,
            createdAt: c.createdAt
          }))
        })),
        friends: friends.map(f => ({
          friendOpenid: f.friend.openid,
          friendNickname: f.friend.nickname || null,
          status: f.status,
          createdAt: f.createdAt
        })),
        shareLogs: shareLogs.map(l => ({
          type: l.type,
          createdAt: l.createdAt
        }))
      }

      const json = JSON.stringify(exportData, null, 2)
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const filename = `yeelin_data_${date}.json`

      res.header('Content-Type', 'application/json')
      res.header('Content-Disposition', `attachment; filename="${filename}"`)
      return res.send(json)
    } catch (error) {
      console.error('Export data error:', error)
      return res.status(500).send({ error: '导出失败' })
    }
  })
```

- [ ] **Step 3: Test the endpoint manually**

Run server, then:
```bash
# Get a valid token first (register or login), then:
curl -X POST http://localhost:4000/api/auth/export-data \
  -H "Authorization: Bearer <token>" \
  -o /tmp/test_export.json
# Verify the JSON is valid
cat /tmp/test_export.json | python -m json.tool > /dev/null && echo "Valid JSON"
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/auth.js
git commit -m "feat: add POST /api/auth/export-data for GDPR data portability"
```

---

## Frontend: API Method

### Task 2: Add exportData() to api.ts

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Find the authApi section in api.ts**

```bash
grep -n "authApi" src/services/api.ts | head -10
```

- [ ] **Step 2: Add exportData method after verifyToken**

Find the verifyToken call in api.ts and add after it:

```typescript
async exportData(): Promise<void> {
  const token = getAuthToken()
  if (!token) throw new Error('Not authenticated')

  const res = await fetchWithTimeout(`${API_BASE}/auth/export-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '导出失败')
  }

  // Extract filename from Content-Disposition header
  const contentDisposition = res.headers.get('Content-Disposition') || ''
  const filenameMatch = contentDisposition.match(/filename="(.+)"/)
  const filename = filenameMatch ? filenameMatch[1] : `yeelin_data_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 3: Add exportData to authApi export**

Find the authApi object and add `exportData` to it.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts
git commit -m "feat: add exportData() to api service"
```

---

## Frontend: ExportDataModal Component

### Task 3: Create ExportDataModal

**Files:**
- Create: `src/components/ExportDataModal.tsx`
- Create: `src/components/ExportDataModal.module.css`

- [ ] **Step 1: Create ExportDataModal.tsx**

```tsx
import { useState } from 'react'
import { ConfirmModal } from './ui/ConfirmModal'
import { Toast } from './ui/Toast'
import { api } from '../services/api'
import styles from './ExportDataModal.module.css'

interface ExportDataModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportDataModal({ isOpen, onClose }: ExportDataModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await api.exportData()
      onClose()
    } catch (err) {
      setToastMessage('导出失败，请重试')
      setToastVisible(true)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ConfirmModal
        isOpen={isOpen}
        title="导出我的数据"
        message="将导出你的所有个人信息，包括梦境记录、社区帖子、好友关系等"
        confirmText={isExporting ? '正在导出...' : '确认导出'}
        cancelText="取消"
        onConfirm={handleExport}
        onCancel={onClose}
      />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </>
  )
}
```

- [ ] **Step 2: Create ExportDataModal.module.css**

```css
/* Uses ConfirmModal and Toast from ui — no extra styles needed here */
/* This file exists for potential future modal-specific overrides */
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ExportDataModal.tsx src/components/ExportDataModal.module.css
git commit -m "feat: add ExportDataModal confirm dialog"
```

---

## Frontend: Add Export Entry to Profile Page

### Task 4: Wire Export into Profile Page

**Files:**
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/Profile.module.css` (if needed for style)

- [ ] **Step 1: Read Profile.tsx to find where to add the button**

```bash
grep -n "logout\|设置\|logoutConfirm" src/pages/Profile.tsx | head -10
```

- [ ] **Step 2: Add import and state for ExportDataModal**

Add to imports:
```tsx
import { ExportDataModal } from '../components/ExportDataModal'
```

Add to component state:
```tsx
const [showExportModal, setShowExportModal] = useState(false)
```

- [ ] **Step 3: Add export button in Profile page**

Find the settings/logout section of Profile.tsx and add before or after the logout button:

```tsx
<button
  className={styles.settingItem}
  onClick={() => setShowExportModal(true)}
>
  <span>导出我的数据</span>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={styles.chevron}>
    <path d="M9 18l6-6-6-6" />
  </svg>
</button>
```

- [ ] **Step 4: Add ExportDataModal to JSX**

Before the final `</div>` of the Profile component:
```tsx
<ExportDataModal
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
/>
```

- [ ] **Step 5: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add src/pages/Profile.tsx
git commit -m "feat: add data export entry to Profile page"
```

---

## Self-Review Checklist

- [ ] Route: `POST /api/auth/export-data` with `authMiddleware`, returns JSON blob with correct Content-Disposition
- [ ] Prisma queries: sessions+answers+story, wallPosts+comments, friends, shareLogs all included
- [ ] API: `exportData()` fetches, creates blob, triggers download with correct filename
- [ ] Modal: ConfirmModal with correct title/message, loading state on confirm, error toast on failure
- [ ] Profile: Button visible in settings area, opens modal
- [ ] No passwordHash in export, no openid leakage issues (openid is user data)
- [ ] Build passes after each commit
