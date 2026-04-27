# Error Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add React Error Boundary (global + page-level) to prevent uncaught JS errors from crashing the entire app.

**Architecture:** Two-layer error boundary — GlobalErrorBoundary wraps the entire app in App.tsx, PageErrorBoundary wraps each Route individually. Uses class-based componentDidCatch for error capture with class state.

**Tech Stack:** React class components, CSS Modules, existing App.tsx structure.

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/components/GlobalErrorBoundary.tsx` | Full-app crash handler (reset via page reload) |
| `src/components/PageErrorBoundary.tsx` | Per-page crash handler (reset via re-render + back nav) |
| `src/components/ErrorFallback.module.css` | Shared error UI styles (starfield theme) |
| `src/App.tsx` | Wrap app with GlobalErrorBoundary |

---

## Shared: ErrorFallback Styles

### Task 1: Create ErrorFallback.module.css

**Files:**
- Create: `src/components/ErrorFallback.module.css`

- [ ] **Step 1: Create the CSS file**

```css
/* Error page shared styles — matches the app's dark starfield theme */

.page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.starfield {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.star {
  position: absolute;
  background: #fff;
  border-radius: 50%;
  opacity: 0.6;
  animation: twinkle 2s ease-in-out infinite alternate;
}

@keyframes twinkle {
  from { opacity: 0.3; }
  to { opacity: 0.8; }
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-moonlight, #E8DFD0);
  margin: 0 0 0.5rem;
  position: relative;
  z-index: 1;
}

.message {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #9CA3AF);
  margin: 0 0 1.5rem;
  position: relative;
  z-index: 1;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.primaryBtn {
  padding: 0.625rem 1.5rem;
  background: var(--color-primary, #7C6EE6);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.primaryBtn:hover {
  opacity: 0.85;
}

.textBtn {
  padding: 0.625rem 1rem;
  background: transparent;
  color: var(--color-text-secondary, #9CA3AF);
  border: none;
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.textBtn:hover {
  color: var(--color-moonlight, #E8DFD0);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ErrorFallback.module.css
git commit -m "feat: add ErrorFallback shared CSS styles"
```

---

## Task 2: GlobalErrorBoundary Component

**Files:**
- Create: `src/components/GlobalErrorBoundary.tsx`
- Modify: `src/App.tsx` (add wrapper)

- [ ] **Step 1: Create GlobalErrorBoundary.tsx**

```tsx
import { Component, ReactNode } from 'react'
import styles from './ErrorFallback.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('GlobalErrorBoundary caught:', error, errorInfo)
  }

  handleRefresh = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          <div className={styles.starfield}>
            {[...Array(40)].map((_, i) => (
              <div
                key={i}
                className={styles.star}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`
                }}
              />
            ))}
          </div>
          <h1 className={styles.title}>页面出错了</h1>
          <p className={styles.message}>抱歉，内容加载时遇到问题</p>
          <div className={styles.actions}>
            <button className={styles.primaryBtn} onClick={this.handleRefresh}>
              刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 2: Modify App.tsx to wrap with GlobalErrorBoundary**

Read App.tsx first (lines 1-100 shown). Then change:

```tsx
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary'

// In the JSX, wrap the Routes section:
// Before: <Routes>...</Routes>
// After:  <GlobalErrorBoundary><Routes>...</Routes></GlobalErrorBoundary>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GlobalErrorBoundary.tsx src/App.tsx
git commit -m "feat: add GlobalErrorBoundary for top-level crash recovery"
```

---

## Task 3: PageErrorBoundary Component

**Files:**
- Create: `src/components/PageErrorBoundary.tsx`

- [ ] **Step 1: Create PageErrorBoundary.tsx**

```tsx
import { Component, ReactNode } from 'react'
import styles from './ErrorFallback.module.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PageErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  handleGoBack = () => {
    window.history.back()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.page}>
          <div className={styles.starfield}>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={styles.star}
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`
                }}
              />
            ))}
          </div>
          <h1 className={styles.title}>该页面暂时无法加载</h1>
          <p className={styles.message}>抱歉，内容加载时遇到问题</p>
          <div className={styles.actions}>
            <button className={styles.textBtn} onClick={this.handleGoBack}>
              返回上一页
            </button>
            <button className={styles.primaryBtn} onClick={this.handleRetry}>
              重新加载
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 2: Wrap a single Route in App.tsx as test**

Read App.tsx. Wrap one route (e.g., `/wall`) as a test:

```tsx
import { PageErrorBoundary } from './components/PageErrorBoundary'

// Wrap DreamWall route:
<Route path="/wall" element={
  <PageErrorBoundary><DreamWall /></PageErrorBoundary>
} />
```

- [ ] **Step 3: Verify build passes**

Run: `cd D:/claude/workspace/nocturne && npm run build 2>&1 | head -30`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/components/PageErrorBoundary.tsx src/App.tsx
git commit -m "feat: add PageErrorBoundary for per-page crash recovery"
```

---

## Task 4: Wrap All Routes with PageErrorBoundary

**Files:**
- Modify: `src/App.tsx` (wrap all Route elements)

- [ ] **Step 1: Wrap all Route elements**

Read App.tsx. Replace every `<Route path="..." element={<X />} />` with:

```tsx
<Route path="..." element={<PageErrorBoundary><X /></PageErrorBoundary>} />
```

Wrap these routes: Home, Dream, Questions, Story, History, Profile, Login, Register, Friends, DreamWall, WeChatCallback.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -30`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wrap all routes with PageErrorBoundary"
```

---

## Self-Review Checklist

- [ ] GlobalErrorBoundary.tsx — uses `componentDidCatch`, `getDerivedStateFromError`, page reload reset
- [ ] PageErrorBoundary.tsx — uses `componentDidCatch`, `getDerivedStateFromError`, re-render reset + back nav
- [ ] ErrorFallback.module.css — shared starfield styles, no emoji, CSS variables used
- [ ] App.tsx — GlobalErrorBoundary wraps all Routes; each Route wrapped in PageErrorBoundary
- [ ] No placeholder text or TBD in any file
- [ ] Build passes after each commit
