import type { CSSProperties, HTMLAttributes } from 'react'
import styles from './MaterialIcon.module.css'

interface MaterialIconProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: string
  size?: number
}

export function MaterialIcon({ name, size = 20, className = '', style, ...props }: MaterialIconProps) {
  return (
    <span
      aria-hidden="true"
      className={`${styles.icon} ${className}`}
      style={{ ...style, fontSize: `${size}px` } as CSSProperties}
      {...props}
    >
      {name}
    </span>
  )
}
