import { useState, useEffect } from 'react'
import styles from './WallSearch.module.css'

interface WallSearchProps {
  value: string
  onChange: (value: string) => void
  isSearching: boolean
}

export function WallSearch({ value, onChange, isSearching }: WallSearchProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
  }

  return (
    <div className={styles.searchWrapper}>
      <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        id="search-dream-wall"
        className={styles.searchInput}
        placeholder="搜索梦墙故事..."
        value={localValue}
        onChange={handleChange}
        aria-label="搜索梦墙故事"
      />
      {localValue && (
        <button className={styles.searchClear} onClick={handleClear} aria-label="清除搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      {isSearching && localValue && <span className={styles.searching}>搜索中...</span>}
    </div>
  )
}
