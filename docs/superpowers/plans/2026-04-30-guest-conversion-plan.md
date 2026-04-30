# 游客转化功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现游客点击"发布到梦墙"时触发登录，登录后自动合并游客 session，体验无感知注册

**Architecture:** 后端 `/auth/phone-login` 改造为手机号不存在时自动注册；前端 Story 页面检测未登录游客并跳转登录页，登录成功后触发 session 合并和本地数据清理

**Tech Stack:** React + Zustand (前端), Fastify + Prisma (后端)

---

## 文件结构

```
server/src/routes/auth.js          # 修改 phone-login 自动注册
server/src/services/authService.js # 实现 phoneLogin 自动创建账户
src/pages/Story.tsx              # 发布按钮检测登录状态
src/pages/Login.tsx              # 登录成功触发合并
src/pages/WeChatCallback.tsx     # 微信回调触发合并
src/hooks/useDreamStore.ts        # Zustand store，含 persist
src/services/api.ts               # migrateSession API
```

---

## Task 1: 后端 phone-login 自动注册

**Files:**
- Modify: `server/src/routes/auth.js:83-100`
- Modify: `server/src/services/authService.js` (phoneLogin 函数)

- [ ] **Step 1: 读取 authService.js 确认 phoneLogin 实现位置**

```bash
grep -n "phoneLogin" server/src/services/authService.js
```

- [ ] **Step 2: 修改 authService.js phoneLogin 函数，自动注册不存在的用户**

找到 `phoneLogin` 函数，在用户不存在时自动创建账户：

```javascript
async phoneLogin(phone, password) {
  const user = await prisma.user.findUnique({ where: { phone } })
  if (!user) {
    // Auto-register: create account with hashed password
    const hashedPassword = await bcrypt.hash(password, 10)
    const guestOpenid = `phone_${phone}_${Date.now()}`
    user = await prisma.user.create({
      data: {
        phone,
        password: hashedPassword,
        openid: guestOpenid,
        nickname: `用户${phone.slice(-4)}`,
      }
    })
    const token = this.generateToken(user.id)
    return { success: true, user, token }
  }
  // ... existing login logic
}
```

- [ ] **Step 3: 验证修改**

```bash
cd server && node -e "const s = require('./src/services/authService.js'); console.log('authService loads')"
```

Expected: 无报错

- [ ] **Step 4: 提交**

```bash
git add server/src/services/authService.js
git commit -m "feat(auth): auto-register on phone login if user not exists"
```

---

## Task 2: 前端 Story.tsx 发布按钮检测登录状态

**Files:**
- Modify: `src/pages/Story.tsx`

- [ ] **Step 1: 读取 Story.tsx 找到发布按钮相关代码**

```bash
grep -n "发布\|publish\|toast\|未登录" src/pages/Story.tsx | head -30
```

- [ ] **Step 2: 确认 useDreamStore 中 user 和 token 的使用方式**

读取 `src/hooks/useDreamStore.ts` 确认 `user` 和 `isLoggedIn` 等判断方式

- [ ] **Step 3: 修改发布按钮 onClick，检测未登录游客并跳转登录页**

在 Story.tsx 的发布按钮 onClick handler 中添加：

```typescript
const handlePublish = async () => {
  const { user, token } = useDreamStore.getState()

  if (!user || !token) {
    // 未登录：跳转到登录页，登录成功后返回当前 Story 页面
    navigate('/login', { state: { from: { pathname: location.pathname } } })
    return
  }
  // ... 已有发布逻辑
}
```

- [ ] **Step 4: 验证构建**

```bash
npm run build 2>&1 | grep -E "error|Error|Story"
```

Expected: 无 Story 相关错误

- [ ] **Step 5: 提交**

```bash
git add src/pages/Story.tsx
git commit -m "feat(Story): redirect guest users to login on publish click"
```

---

## Task 3: Login.tsx 登录成功后触发 session 合并

**Files:**
- Modify: `src/pages/Login.tsx:69-107`
- Modify: `src/hooks/useDreamStore.ts` (添加 clearGuestData 方法)

- [ ] **Step 1: 读取 useDreamStore.ts 确认 persist 配置**

```bash
grep -n "persist\|zustand\|clear" src/hooks/useDreamStore.ts | head -20
```

- [ ] **Step 2: 在 useDreamStore 添加 clearGuestSession 方法**

```typescript
clearGuestSession: () => {
  // 清除游客相关的本地数据
  localStorage.removeItem('yeelin_openid') // 保留 token 和 user
  // 如果有其他游客特有的 localStorage 项也清除
}
```

- [ ] **Step 3: 修改 Login.tsx handlePhoneLogin，登录成功后触发完整合并流程**

当前代码已有部分 migrateSession 调用 (lines 91-94)，需要增强：

```typescript
const handlePhoneLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError('')

  if (!phone || !password) {
    setError('请输入手机号和密码')
    setIsLoading(false)
    return
  }

  try {
    const result = await authApi.phoneLogin(phone, password)
    if (result.success && result.data?.user) {
      const user = result.data.user
      const token = result.data.token

      if (token) {
        localStorage.setItem('yeelin_token', token)
      }

      // ① 合并游客 session
      const guestOpenid = localStorage.getItem('yeelin_openid')
      if (guestOpenid && guestOpenid !== user.openid) {
        try {
          await api.migrateSession(guestOpenid)
        } catch (err) {
          console.error('Session migration failed:', err)
          // 合并失败不影响登录流程
        }
      }

      // ② 设置用户状态
      setUser(user, token)
      localStorage.setItem('yeelin_openid', user.openid)

      // ③ 清除本地游客数据
      const { clearGuestSession } = useDreamStore.getState()
      clearGuestSession()

      // ④ 跳转回来源页面或首页
      navigate(user.isAdmin ? '/admin' : from, { replace: true })
    } else {
      setError(result.data?.reason || result.reason || '登录失败')
    }
  } catch (err) {
    setError('网络错误，请检查网络连接')
  } finally {
    setIsLoading(false)
  }
}
```

- [ ] **Step 4: 验证构建**

```bash
npm run build 2>&1 | grep -E "error|Error|Login"
```

Expected: 无 Login 相关错误

- [ ] **Step 5: 提交**

```bash
git add src/pages/Login.tsx src/hooks/useDreamStore.ts
git commit -m "feat(Login): trigger session merge after phone login"
```

---

## Task 4: WeChatCallback.tsx 微信登录回调触发合并

**Files:**
- Modify: `src/pages/WeChatCallback.tsx`

- [ ] **Step 1: 读取 WeChatCallback.tsx 找到当前 redirect 逻辑**

```bash
grep -n "navigate\|redirect\|wechat_token\|migrate" src/pages/WeChatCallback.tsx
```

- [ ] **Step 2: 修改 WeChatCallback.tsx，微信登录成功后触发 session 合并**

在解析 `wechat_token` 并设置用户状态后，添加 session 合并逻辑：

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search)
  const wechatToken = params.get('wechat_token')
  const wechatUser = params.get('wechat_user')

  if (wechatToken && wechatUser) {
    try {
      const user = JSON.parse(decodeURIComponent(wechatUser))
      localStorage.setItem('yeelin_token', wechatToken)
      localStorage.setItem('yeelin_openid', user.openid)

      // ① 合并游客 session
      const guestOpenid = localStorage.getItem('yeelin_guest_openid') // 如果有记录
      if (guestOpenid && guestOpenid !== user.openid) {
        api.migrateSession(guestOpenid).catch(err => {
          console.error('Session migration failed:', err)
        })
      }

      setUser(user, wechatToken)

      // ② 清除本地游客数据
      localStorage.removeItem('yeelin_guest_openid')

      // ③ 跳转回 Story 页面（而非首页）
      const from = sessionStorage.getItem('login_redirect_from') || '/story'
      sessionStorage.removeItem('login_redirect_from')
      navigate(from, { replace: true })
    } catch (err) {
      console.error('WeChat callback error:', err)
      navigate('/login?error=1')
    }
  } else if (error) {
    navigate('/login?error=1')
  }
}, [navigate, setUser, error])
```

- [ ] **Step 3: Story.tsx 跳转登录时记录返回地址**

在 Story.tsx 发布按钮点击跳转登录时，记录返回地址：

```typescript
// 在 Story.tsx handlePublish 中
if (!user || !token) {
  sessionStorage.setItem('login_redirect_from', location.pathname)
  navigate('/login', { state: { from: { pathname: location.pathname } } })
  return
}
```

- [ ] **Step 4: 验证构建**

```bash
npm run build 2>&1 | grep -E "error|Error|WeChatCallback"
```

Expected: 无 WeChatCallback 相关错误

- [ ] **Step 5: 提交**

```bash
git add src/pages/WeChatCallback.tsx src/pages/Story.tsx
git commit -m "feat(WeChatCallback): trigger session merge after wechat login"
```

---

## Task 5: 端到端验证

**Files:**
- Test: 手动测试完整流程

- [ ] **Step 1: 启动后端和前端**

```bash
cd server && npm run dev &
npm run dev
```

- [ ] **Step 2: 测试场景 1 - 游客点击发布 → 手机号登录 → 合并**

1. 不登录，直接进入 Questions 页面回答问题生成故事
2. 进入 Story 页面，点击"发布到梦墙"
3. 确认跳转到登录页
4. 使用手机号登录（手机号未注册过，自动创建账户）
5. 确认跳回 Story 页面，session 已合并

- [ ] **Step 3: 测试场景 2 - 游客点击发布 → 微信登录 → 合并**

1. 不登录，直接进入 Questions 页面
2. 进入 Story 页面，点击"发布到梦墙"
3. 确认跳转到登录页
4. 点击微信登录
5. 确认微信授权后跳回 Story 页面

- [ ] **Step 4: 测试场景 3 - 游客 session 为空时登录**

1. 无任何 session，直接访问登录页
2. 手机号登录
3. 确认无报错，登录成功

---

## 依赖关系

```
Task 1 (后端)  ──────────────────┐
                                 ▼
Task 2 (Story.tsx) ──► Task 3 (Login.tsx)
                                           │
Task 4 (WeChatCallback.tsx) ───────────────┘
                                                  │
                                                  ▼
                                           Task 5 (端到端验证)
```

---

## 成功标准

- [ ] 手机号不存在时自动创建账户，用户无感知"注册"步骤
- [ ] 游客在 Story 页面点击发布，检测到未登录并跳转登录页
- [ ] 登录成功后自动调用 migrateSession 合并游客 session
- [ ] 登录成功后清除本地游客数据
- [ ] 微信登录和手机号登录后都跳转到 Story 页面
- [ ] 合并失败时 toast 提示"保存失败，请重试"，但不阻断登录流程
