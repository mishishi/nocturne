import { Link, useLocation } from 'react-router-dom'
import styles from './Navbar.module.css'

export function Navbar() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1" opacity="0.5" />
              <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.3" />
              <circle cx="15" cy="8" r="2.5" fill="currentColor" />
            </svg>
          </span>
          <span className={styles.logoText}>夜棂</span>
        </Link>

        <ul className={styles.links}>
          <li>
            <Link to="/" aria-current={isActive('/') ? 'page' : undefined} className={`${styles.link} ${isActive('/') ? styles.active : ''}`}>
              首页
            </Link>
          </li>
          <li>
            <Link to="/history" aria-current={isActive('/history') ? 'page' : undefined} className={`${styles.link} ${isActive('/history') ? styles.active : ''}`}>
              历史
            </Link>
          </li>
          <li>
            <Link to="/profile" aria-current={isActive('/profile') ? 'page' : undefined} className={`${styles.link} ${isActive('/profile') ? styles.active : ''}`}>
              个人
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}
