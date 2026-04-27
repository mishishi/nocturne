import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDreamStore, DreamSession, DREAM_TAGS } from '../hooks/useDreamStore'
import { Button } from '../components/ui/Button'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Toast } from '../components/ui/Toast'
import { Breadcrumb } from '../components/Breadcrumb'
import { DreamWeather } from '../components/DreamWeather'
import { api } from '../services/api'
import styles from './History.module.css'

const SWIPE_THRESHOLD = 100
const UNDO_TIMEOUT = 5000

export function History() {
  const navigate = useNavigate()
  const { history, removeFromHistory, restoreItem, toggleFavorite, updatePrivateNote, setHistory } = useDreamStore()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchUpdating, setSearchUpdating] = useState(false)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)

  // Swipe-to-delete state
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  // Undo state
  const [undoItem, setUndoItem] = useState<DreamSession | null>(null)
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Private note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  // Tag filter state
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null)

  // Sync history from backend API (only on mount)
  useEffect(() => {
    let isMounted = true
    const syncHistoryFromBackend = async () => {
      const openid = localStorage.getItem('yeelin_openid')
      if (!openid) return

      try {
        const { sessions } = await api.getHistory(openid)
        if (!isMounted) return

        if (sessions && sessions.length > 0) {
          // Convert backend session format to DreamSession format
          const backendHistory: DreamSession[] = sessions.map((s: any) => {
            const dateObj = new Date(s.date)
            const dateStr = dateObj.toLocaleDateString('zh-CN')

            return {
              id: s.id,
              sessionId: s.sessionId || '',
              date: dateStr,
              dreamSnippet: s.dreamFragment?.slice(0, 100) + (s.dreamFragment?.length > 100 ? '...' : '') || '',
              storyTitle: s.storyTitle,
              story: s.story,
              questions: [],
              answers: [],
              tags: []
            }
          })

          // Dedup by id (in case backend returns dupes)
          const dedupedMap = new Map()
          backendHistory.forEach(item => dedupedMap.set(item.id, item))
          const finalHistory = Array.from(dedupedMap.values())

          setHistory(finalHistory)
        }
      } catch (err) {
        console.error('Failed to sync history from backend:', err)
      }
    }

    syncHistoryFromBackend()
    return () => { isMounted = false }
  }, [])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays} 天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  // Touch handlers for swipe-to-delete
  const handleTouchStart = (e: React.TouchEvent, itemId: string) => {
    if (multiSelectMode) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    setSwipedItemId(itemId)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipedItemId || multiSelectMode) return
    const deltaX = e.touches[0].clientX - touchStartX.current
    const deltaY = e.touches[0].clientY - touchStartY.current

    // Only track horizontal swipe if it's more horizontal than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      const offset = Math.max(-120, Math.min(0, deltaX))
      setSwipeOffset(offset)
    }
  }

  const handleTouchEnd = () => {
    if (!swipedItemId) return
    if (swipeOffset < -SWIPE_THRESHOLD) {
      // Show delete button fully revealed
      setSwipeOffset(-100)
    } else {
      // Snap back
      setSwipeOffset(0)
      setSwipedItemId(null)
    }
  }

  const handleSwipeDelete = (item: typeof history[0]) => {
    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
    }

    // Store item for undo
    setUndoItem(item)

    // Start delete animation
    setDeletingId(item.id!)
    setSwipedItemId(null)
    setSwipeOffset(0)

    // Actually remove after animation
    setTimeout(() => {
      removeFromHistory(item.id!)
      setDeletingId(null)

      // Show undo toast
      setToastType('info')
      setToastMessage('已删除，点击撤销')
      setToastVisible(true)

      // Set undo timeout
      undoTimeoutRef.current = setTimeout(() => {
        setUndoItem(null)
        setToastVisible(false)
      }, UNDO_TIMEOUT)
    }, 300)
  }

  const handleUndoDelete = () => {
    if (!undoItem) return

    // Clear the undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current)
    }

    // Restore the item to history
    restoreItem(undoItem)
    setToastVisible(false)
    setUndoItem(null)
  }

  // Private note handlers
  const handleStartEditNote = (item: typeof history[0]) => {
    setEditingNoteId(item.id!)
    setNoteDraft(item.privateNote || '')
  }

  const handleSaveNote = (id: string) => {
    updatePrivateNote(id, noteDraft)
    setEditingNoteId(null)
    setNoteDraft('')
  }

  const handleCancelNote = () => {
    setEditingNoteId(null)
    setNoteDraft('')
  }

  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id)
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const confirmDelete = () => {
    if (!deleteConfirmId) return
    setDeletingId(deleteConfirmId)
    setTimeout(() => {
      removeFromHistory(deleteConfirmId)
      setDeletingId(null)
      setDeleteConfirmId(null)
    }, 300)
  }

  const cancelDelete = () => {
    setDeleteConfirmId(null)
  }

  const handleShare = async (item: typeof history[0]) => {
    const shareText = `「${item.storyTitle}」\n\n${item.story.slice(0, 200)}...`

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.storyTitle,
          text: shareText
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          copyToClipboard(shareText)
        }
      }
    } else {
      copyToClipboard(shareText)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setToastType('success')
      setToastMessage('内容已复制到剪贴板')
      setToastVisible(true)
    })
  }

  const handleReadStory = (item: typeof history[0]) => {
    navigate('/story', { state: { fromHistory: item } })
  }

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Multi-select handlers
  const toggleMultiSelect = () => {
    setMultiSelectMode(!multiSelectMode)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredHistory.map(item => item.id!)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const confirmBatchDelete = () => {
    setBatchDeleteConfirm(true)
  }

  const executeBatchDelete = () => {
    const count = selectedIds.size
    selectedIds.forEach(id => {
      removeFromHistory(id)
    })
    setSelectedIds(new Set())
    setMultiSelectMode(false)
    setBatchDeleteConfirm(false)
    setToastMessage(`已删除 ${count} 个故事`)
    setToastVisible(true)
  }

  const cancelBatchDelete = () => {
    setBatchDeleteConfirm(false)
  }

  // Filter history based on search query and selected tags
  const filteredHistory = history.filter(item => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.storyTitle.toLowerCase().includes(query) ||
        item.story.toLowerCase().includes(query) ||
        (item.dreamSnippet && item.dreamSnippet.toLowerCase().includes(query))
      if (!matchesSearch) return false
    }

    // Tag filter
    if (selectedTags.length > 0) {
      const itemTags = item.tags || []
      const hasSelectedTag = selectedTags.some(tag => itemTags.includes(tag))
      if (!hasSelectedTag) return false
    }

    return true
  })

  // Debug: check for duplicate IDs in filteredHistory
  useEffect(() => {
    const ids = filteredHistory.map(item => item.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      console.error('DUPLICATE IDs in filteredHistory!', {
        total: ids.length,
        unique: uniqueIds.size,
        duplicates: ids.filter((id, i) => ids.indexOf(id) !== i)
      })
    }
  }, [filteredHistory])

  // Tag filter handlers
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    )
  }

  const clearTagFilter = () => {
    setSelectedTags([])
  }

  // Tag editing handlers
  const handleStartEditTags = (item: typeof history[0]) => {
    setEditingTagsId(item.id!)
  }

  const handleToggleItemTag = (itemId: string, tagId: string) => {
    const item = history.find(h => h.id === itemId)
    if (!item) return
    const currentTags = item.tags || []
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(t => t !== tagId)
      : [...currentTags, tagId]
    useDreamStore.getState().updateTags(itemId, newTags)
  }

  const handleSaveTags = () => {
    setEditingTagsId(null)
  }

  return (
    <div className={styles.page}>
      {/* Decorative stars */}
      <div className={styles.decorStars}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="stars" patternUnits="userSpaceOnUse" width="100" height="100">
              <circle cx="10" cy="10" r="0.5" fill="currentColor" opacity="0.3" />
              <circle cx="50" cy="30" r="0.8" fill="currentColor" opacity="0.5" />
              <circle cx="80" cy="60" r="0.5" fill="currentColor" opacity="0.4" />
              <circle cx="30" cy="70" r="0.6" fill="currentColor" opacity="0.3" />
              <circle cx="70" cy="90" r="0.7" fill="currentColor" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stars)" />
        </svg>
      </div>

      <div className={styles.container}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: '首页', href: '/' },
            { label: '历史记录' }
          ]}
        />

        {/* Header */}
        <header className={styles.header}>
          <span className={styles.badge}>梦境档案</span>
          <h1 className={styles.title}>你的故事集</h1>
          <p className={styles.subtitle}>
            {history.length > 0
              ? `共 ${history.length} 个梦境故事`
              : '记录你的每一个梦'}
          </p>
        </header>

        {/* Dream Weather Easter Egg */}
        {history.length > 0 && <DreamWeather />}

        {/* Search */}
        {history.length > 0 && (
          <div className={styles.searchWrapper}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              id="search-dreams"
              className={`${styles.searchInput} ${searchUpdating ? styles.updating : ''}`}
              placeholder="搜索梦境故事..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setSearchUpdating(true)
                setTimeout(() => setSearchUpdating(false), 300)
              }}
              aria-label="搜索梦境故事"
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')} aria-label="清除搜索">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Search Results Info */}
        {searchQuery && filteredHistory.length === 0 && (
          <div className={styles.noResults}>
            <p>没有找到匹配的梦境</p>
          </div>
        )}

        {/* Tag Filter Bar */}
        {history.length > 0 && (
          <div className={styles.tagFilterBar} role="group" aria-label="标签筛选">
            <div className={styles.tagFilterScroll}>
              <button
                className={`${styles.tagFilterChip} ${selectedTags.length === 0 ? styles.tagFilterActive : ''}`}
                onClick={clearTagFilter}
                aria-pressed={selectedTags.length === 0}
              >
                全部
              </button>
              {DREAM_TAGS.map(tag => (
                <button
                  key={tag.id}
                  className={`${styles.tagFilterChip} ${selectedTags.includes(tag.id) ? styles.tagFilterActive : ''}`}
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={selectedTags.includes(tag.id)}
                  style={{ '--tag-color': tag.color } as React.CSSProperties}
                >
                  <span className={styles.tagFilterIcon}>{tag.icon}</span>
                  <span>{tag.label}</span>
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <span className={styles.tagFilterCount}>
                已选 {selectedTags.length} 个标签
              </span>
            )}
          </div>
        )}

        {/* Multi-select Controls */}
        {history.length > 0 && (
          <div className={styles.multiSelectBar}>
            <button
              className={`${styles.multiSelectBtn} ${multiSelectMode ? styles.active : ''}`}
              onClick={toggleMultiSelect}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              {multiSelectMode ? '取消选择' : '批量选择'}
            </button>
            {multiSelectMode && selectedIds.size > 0 && (
              <>
                <button className={styles.selectAllBtn} onClick={selectAll}>全选</button>
                <button className={styles.deselectAllBtn} onClick={deselectAll}>取消全选</button>
              </>
            )}
          </div>
        )}

        {/* Batch Delete Bar */}
        {multiSelectMode && selectedIds.size > 0 && (
          <div className={styles.batchDeleteBar}>
            <button className={styles.doneMultiSelectBtn} onClick={toggleMultiSelect}>完成</button>
            <span className={styles.selectedCount}>已选择 {selectedIds.size} 项</span>
            <Button variant="ghost" size="sm" onClick={confirmBatchDelete} className={styles.batchDeleteBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              删除所选
            </Button>
          </div>
        )}

        {/* History List or Empty State */}
        {history.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background stars */}
                <circle cx="20" cy="25" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="95" cy="20" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="100" cy="80" r="1.5" fill="currentColor" opacity="0.3" />
                <circle cx="15" cy="90" r="1" fill="currentColor" opacity="0.4" />
                <circle cx="50" cy="10" r="1" fill="currentColor" opacity="0.3" />
                <circle cx="75" cy="105" r="1.5" fill="currentColor" opacity="0.3" />
                {/* Moon glow */}
                <circle cx="60" cy="55" r="30" fill="url(#moonGlow)" opacity="0.15" />
                {/* Moon crescent */}
                <path d="M60 25C45 25 35 37 35 55C35 73 45 85 60 85C48 85 40 73 40 55C40 37 48 25 60 25Z" fill="currentColor" opacity="0.8" />
                {/* Cloud wisps */}
                <path d="M25 70C25 70 30 65 38 68C46 71 50 78 55 75" stroke="currentColor" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
                <path d="M70 90C70 90 78 85 85 90C92 95 95 102 100 100" stroke="currentColor" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
                {/* Z's for dreaming */}
                <text x="78" y="35" fontSize="12" fill="currentColor" opacity="0.4" fontFamily="var(--font-display)">z</text>
                <text x="88" y="25" fontSize="10" fill="currentColor" opacity="0.3" fontFamily="var(--font-display)">z</text>
                <text x="95" y="18" fontSize="8" fill="currentColor" opacity="0.2" fontFamily="var(--font-display)">z</text>
                <defs>
                  <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="currentColor" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>暂无记录</h2>
            <p className={styles.emptyText}>
              {['月光落在枕边，梦正在酝酿', '星河入梦前，万籁皆寂', '今夜的月色，值得一个梦', '在醒与睡之间，故事正在萌发', '每一个梦境，都是夜的礼物'][new Date().getDay() % 5]}
            </p>
            <Link to="/dream">
              <Button size="lg">记录你的第一个梦</Button>
            </Link>
          </div>
        ) : (
          <div className={styles.historyList}>
            {filteredHistory.map((item, index) => {
              const isExpanded = expandedId === item.id
              const isSwiped = swipedItemId === item.id
              return (
                <div
                  key={item.id || index}
                  className={`${styles.swipeContainer} ${isSwiped ? styles.swipeRevealed : ''}`}
                >
                  {/* Delete action revealed on swipe */}
                  <div className={styles.swipeAction}>
                    <button
                      className={styles.swipeDeleteBtn}
                      onClick={() => handleSwipeDelete(item)}
                      aria-label="删除"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>删除</span>
                    </button>
                  </div>

                  {/* Main card */}
                  <article
                    className={`${styles.historyItem} ${deletingId === item.id ? styles.deleting : ''} ${isExpanded ? styles.expanded : ''} ${multiSelectMode && selectedIds.has(item.id!) ? styles.selected : ''}`}
                    style={{
                      transform: isSwiped ? `translateX(${swipeOffset}px)` : undefined,
                      transition: isSwiped ? 'none' : undefined
                    }}
                    onTouchStart={(e) => handleTouchStart(e, item.id!)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div
                      className={styles.itemHeader}
                      onClick={() => multiSelectMode ? toggleSelect(item.id!) : toggleExpand(item.id!)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          multiSelectMode ? toggleSelect(item.id!) : toggleExpand(item.id!)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={multiSelectMode ? selectedIds.has(item.id!) : undefined}
                      aria-expanded={!multiSelectMode ? isExpanded : undefined}
                    >
                      {multiSelectMode && (
                        <span
                          className={`${styles.checkbox} ${selectedIds.has(item.id!) ? styles.checked : ''}`}
                          aria-hidden="true"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                      <div className={styles.itemMeta}>
                        <span className={styles.itemDate}>{formatDate(item.date)}</span>
                        <h3 className={styles.itemTitle}>{item.storyTitle}</h3>
                        {item.tags && item.tags.length > 0 && (
                          <div className={styles.itemTags}>
                            {item.tags.map(tagId => {
                              const tag = DREAM_TAGS.find(t => t.id === tagId)
                              return tag ? (
                                <span
                                  key={tagId}
                                  className={styles.itemTag}
                                  style={{ '--tag-color': tag.color } as React.CSSProperties}
                                >
                                  {tag.icon} {tag.label}
                                </span>
                              ) : null
                            })}
                          </div>
                        )}
                      </div>
                      <div className={styles.itemActions} onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`${styles.actionBtn} ${item.isFavorite ? styles.favoriteActive : ''}`}
                          onClick={() => handleToggleFavorite(item.id!)}
                          aria-label={item.isFavorite ? '取消收藏' : '收藏'}
                          title={item.isFavorite ? '取消收藏' : '收藏'}
                        >
                          <svg viewBox="0 0 24 24" fill={item.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        </button>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleShare(item)}
                          aria-label="分享"
                          title="分享"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="18" cy="5" r="3" />
                            <circle cx="6" cy="12" r="3" />
                            <circle cx="18" cy="19" r="3" />
                            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                          </svg>
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDelete(item.id)}
                          aria-label="删除"
                          title="删除"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                  {/* Preview - always visible */}
                  <p className={styles.itemPreview}>{item.story.replace(/\n/g, ' ').slice(0, 150)}...</p>

                  {/* Expand button */}
                  <button
                    className={styles.expandBtn}
                    onClick={() => toggleExpand(item.id!)}
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? '收起全文' : '展开全文'}
                  >
                    <span>{isExpanded ? '收起' : '展开全文'}</span>
                    <svg
                      className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className={styles.expandedContent}>
                      <div className={styles.storyContent}>
                        {item.story.split('\n').map((paragraph, idx) => (
                          paragraph.trim() && <p key={idx}>{paragraph}</p>
                        ))}
                      </div>

                      {/* Private note section */}
                      <div className={styles.privateNoteSection}>
                        {editingNoteId === item.id ? (
                          <div className={styles.noteEdit}>
                            <textarea
                              className={styles.noteTextarea}
                              value={noteDraft}
                              onChange={(e) => setNoteDraft(e.target.value)}
                              placeholder="写下你的私人笔记..."
                              rows={3}
                            />
                            <div className={styles.noteEditActions}>
                              <button className={styles.noteCancelBtn} onClick={handleCancelNote}>
                                取消
                              </button>
                              <button className={styles.noteSaveBtn} onClick={() => handleSaveNote(item.id!)}>
                                保存
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={styles.noteDisplay}>
                            {item.privateNote ? (
                              <p className={styles.noteText}>{item.privateNote}</p>
                            ) : null}
                            <button
                              className={styles.noteEditBtn}
                              onClick={() => handleStartEditNote(item)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                                <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              {item.privateNote ? '编辑笔记' : '添加笔记'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Tags section */}
                      <div className={styles.tagsSection}>
                        <div className={styles.tagsSectionHeader}>
                          <span className={styles.tagsSectionLabel}>标签</span>
                          <button
                            className={styles.tagsEditBtn}
                            onClick={() => handleStartEditTags(item)}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                            编辑标签
                          </button>
                        </div>
                        {editingTagsId === item.id ? (
                          <div className={styles.tagEditGrid}>
                            {DREAM_TAGS.map(tag => (
                              <button
                                key={tag.id}
                                className={`${styles.tagEditChip} ${(item.tags || []).includes(tag.id) ? styles.tagEditChipActive : ''}`}
                                onClick={() => handleToggleItemTag(item.id!, tag.id)}
                                style={{ '--tag-color': tag.color } as React.CSSProperties}
                              >
                                <span>{tag.icon}</span>
                                <span>{tag.label}</span>
                              </button>
                            ))}
                            <button className={styles.tagSaveBtn} onClick={handleSaveTags}>
                              完成
                            </button>
                          </div>
                        ) : (
                          <div className={styles.tagsDisplay}>
                            {item.tags && item.tags.length > 0 ? (
                              item.tags.map(tagId => {
                                const tag = DREAM_TAGS.find(t => t.id === tagId)
                                return tag ? (
                                  <span
                                    key={tagId}
                                    className={styles.tagBadge}
                                    style={{ '--tag-color': tag.color } as React.CSSProperties}
                                  >
                                    {tag.icon} {tag.label}
                                  </span>
                                ) : null
                              })
                            ) : (
                              <span className={styles.noTags}>暂无标签</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.expandedActions}>
                        <Button variant="secondary" size="sm" onClick={() => handleReadStory(item)}>
                          在故事页查看
                        </Button>
                      </div>
                    </div>
                  )}
                  </article>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        title="删除确认"
        message="确定要删除这个梦境故事吗？删除后将无法恢复。"
        confirmText="删除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        danger
      />

      <ConfirmModal
        isOpen={batchDeleteConfirm}
        title="批量删除确认"
        message={`确定要删除选中的 ${selectedIds.size} 个梦境故事吗？删除后将无法恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={executeBatchDelete}
        onCancel={cancelBatchDelete}
        danger
      />

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => {
          setToastVisible(false)
          setUndoItem(null)
        }}
        type={toastType}
        action={undoItem ? {
          label: '撤销',
          onClick: handleUndoDelete
        } : undefined}
      />
    </div>
  )
}