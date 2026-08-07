import type { ReactNode } from 'react'
import { Providers } from '@/app/providers'
import { WorkspaceShell } from '@/components/layout/WorkspaceShell'
import '@/styles/legacy-utilities.css'

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <WorkspaceShell>{children}</WorkspaceShell>
    </Providers>
  )
}
