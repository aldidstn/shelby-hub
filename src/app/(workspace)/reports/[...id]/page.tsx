import { notFound } from 'next/navigation'
import Link from 'next/link'
import { REPORT_CONTENT, STATIC_REPORTS, type ContentBlock } from '@/features/reports/data/content'
import { ReaderActions } from '@/features/reports/components/ReaderActions'
import ReportsPage from '@/features/reports/components/ReportsPage'
import { SharedReportPreview } from '@/features/reports/components/SharedReportPreview'
import { getOptionalSession } from '@/server/auth/session'
import { findReport } from '@/server/reports/repository'

interface Props {
  params: Promise<{ id: string[] }>
}

export default async function ReportReaderPage({ params }: Props) {
  const { id: segments } = await params
  const id = segments.join('/')

  const content = REPORT_CONTENT[id]
  const report = STATIC_REPORTS.find((r) => r.id === id)

  if (!content || !report) {
    const session = await getOptionalSession()
    const indexed = await findReport(id, session?.walletAddress)
    if (!indexed || !indexed.blobAccount || !indexed.blobName || indexed.active === false) notFound()
    return (
      <>
        <ReportsPage />
        <SharedReportPreview report={indexed} />
      </>
    )
  }

  const readableReports = STATIC_REPORTS.filter((r) => Boolean(REPORT_CONTENT[r.id]))

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-8">

      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col gap-1 w-56 shrink-0">

        {/* Back to Library — highlighted */}
        <Link
          href="/reports"
          className="flex items-center gap-2 px-3 py-2.5 mb-3 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>

        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1 px-2">
          All Files
        </p>
        {readableReports.map((r) => (
          <Link
            key={r.id}
            href={`/reports/${r.id}`}
            className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-lg text-xs transition-colors duration-150 ${
              r.id === id
                ? 'bg-pink-light text-pink font-medium border border-pink/20'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            <span className="line-clamp-2 leading-snug">{r.title}</span>
          </Link>
        ))}
      </aside>

      {/* Reading area */}
      <article className="flex-1 min-w-0 max-w-2xl">

        {/* Back to Library — mobile, highlighted */}
        <Link
          href="/reports"
          className="lg:hidden inline-flex items-center gap-2 px-3 py-2 mb-6 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>

        {/* Article header */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
              {report.type}
            </span>
            {report.onChain && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-positive/10 text-positive">
                On-chain
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-positive/10 text-positive border border-positive/20">
              Free
            </span>
          </div>

          <h1 className="text-3xl font-bold text-brown leading-tight mb-3">
            {content.title}
          </h1>
          <p className="text-base text-text-secondary leading-relaxed mb-6">
            {content.subtitle}
          </p>

          {/* Like + Download CTAs */}
          <div className="flex items-center justify-between pb-6 border-b border-divider">
            <ReaderActions
              initialLikes={report.likes}
              title={report.title}
              fileType={report.fileType}
              blobAccount={report.blobAccount}
              blobName={report.blobName}
            />
            <span className="text-xs text-text-muted">
              {new Date(report.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Article body */}
        <div className="flex flex-col gap-5">
          {content.blocks.map((block, i) => (
            <ReaderBlock key={i} block={block} />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-divider flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {report.tags.map((tag) => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-surface border border-divider text-text-secondary">
                {tag}
              </span>
            ))}
          </div>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pink text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Library
          </Link>
        </footer>
      </article>
    </div>
  )
}

function ReaderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-xl font-bold text-brown mt-4 leading-snug">
          {block.text}
        </h2>
      )
    case 'subheading':
      return (
        <h3 className="text-base font-semibold text-text-primary mt-2">
          {block.text}
        </h3>
      )
    case 'paragraph':
      return (
        <p className="text-sm text-text-primary leading-7">
          {block.text}
        </p>
      )
    case 'quote':
      return (
        <blockquote className="border-l-2 border-pink pl-4 py-1 my-2">
          <p className="text-sm italic text-text-secondary leading-7">
            {block.text}
          </p>
        </blockquote>
      )
    case 'divider':
      return <hr className="border-divider my-2" />
    default:
      return null
  }
}
