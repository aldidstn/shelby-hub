'use client'

import styles from './ThemeToggle.module.css'
import { MaterialIcon } from '@/components/ui/MaterialIcon'

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement
    const next = root.dataset.theme === 'light' ? 'dark' : 'light'
    root.dataset.theme = next
    localStorage.setItem('shelby-theme', next)
  }

  return <button className={styles.toggle} onClick={toggleTheme} aria-label="Toggle light and dark theme" title="Toggle theme">
    <MaterialIcon name="light_mode" size={20} className={styles.sun} />
    <MaterialIcon name="dark_mode" size={20} className={styles.moon} />
  </button>
}
