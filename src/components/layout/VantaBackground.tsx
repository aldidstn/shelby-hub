import styles from './VantaBackground.module.css'

/** Decorative, dependency-free ambient network texture. */
export function VantaBackground() {
  return <div className={styles.background} aria-hidden="true" />
}
