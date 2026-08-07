'use client'

import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import styles from './LandingPage.module.css'

const LandingWalletDialog = dynamic(
  () => import('./LandingWalletDialog').then((module) => module.LandingWalletDialog),
  { ssr: false },
)

const BENEFITS = [
  {
    number: '01',
    title: 'Pay-Per-Alpha',
    text: 'Unlock only what you need with one wallet payment.',
  },
  {
    number: '02',
    title: 'Instant Delivery',
    text: 'Stream reports and datasets from Shelby hot storage.',
  },
  {
    number: '03',
    title: 'Direct-to-Creator',
    text: 'Aptos settles each purchase directly with the analyst.',
  },
] as const

const STORAGE_STEPS = [
  { title: 'Create', text: 'Report ID + wrapped key' },
  { title: 'Encrypt', text: 'AES-256-GCM in browser' },
  { title: 'Store', text: 'Ciphertext on Shelby' },
  { title: 'Unlock', text: 'Key after verified access' },
] as const

const SETTLEMENT_STEPS = [
  { title: 'Validate', text: 'Registry V2 checks listing' },
  { title: 'Settle', text: 'APT goes to creator' },
  { title: 'Index', text: 'Receipt is recorded' },
  { title: 'Restore', text: 'Access follows wallet' },
] as const

const MARQUEE_ITEMS = [
  'Research reports',
  'Smart money data',
  'Encrypted delivery',
  'Direct settlement',
  'Permanent access',
] as const

function Brand() {
  return (
    <Link href="/" className={styles.brand} aria-label="Shelby Scribe home">
      <Image src="/images/shelby-logo-pink.svg" alt="Shelby Scribe" width={172} height={40} className={styles.brandLogo} priority />
    </Link>
  )
}

export function LandingPage() {
  const router = useRouter()
  const [walletOpen, setWalletOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>(`[data-landing-reveal]`))
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add(styles.revealVisible))
      return
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add(styles.revealVisible)
        observer.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })

    revealElements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  function enterWorkspace() {
    setMenuOpen(false)
    setWalletOpen(true)
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className={`${styles.page} ${styles.motionReady}`}>
      <header className={styles.siteHeader}>
        <Brand />
        <nav id="landing-navigation" className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Landing page navigation">
          <a href="#why" onClick={closeMenu}>Why Shelby</a>
          <a href="#intelligence" onClick={closeMenu}>Intelligence</a>
          <a href="#architecture" onClick={closeMenu}>Architecture</a>
          <a href="https://docs.shelby.xyz/" target="_blank" rel="noreferrer" onClick={closeMenu}>SDK Docs ↗</a>
          <button className={styles.mobileNavCta} onClick={enterWorkspace}>Connect & explore <span>↗</span></button>
        </nav>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <button className={styles.headerCta} onClick={enterWorkspace}>Connect & explore</button>
          <button className={styles.menuButton} onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label="Toggle navigation">
            <span /><span />
          </button>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <Image
            className={styles.heroImage}
            src="/images/shelby-hero-panorama.jpg"
            alt="A sunlit research campus rendered in pink and blue pixel art"
            fill
            priority
            fetchPriority="high"
            quality={45}
            sizes="(max-width: 720px) 100vw, 94rem"
          />
          <div className={styles.heroShade} />
          <div className={styles.heroStatus}><i /> SHELBY NETWORK / RESEARCH ONLINE</div>
          <div className={styles.heroPanel}>
            <p className={styles.eyebrow}><i /> Independent crypto intelligence</p>
            <h1 id="hero-title">Research at market speed.<br /><span>Own the signal.</span></h1>
            <p className={styles.heroText}>Reports and smart-money data, delivered through Shelby and settled on Aptos.</p>
            <div className={styles.heroActions}>
              <button className={styles.primaryButton} onClick={enterWorkspace}>
                <span>Connect & explore</span><b>↗</b>
              </button>
              <a className={styles.secondaryButton} href="https://docs.shelby.xyz/" target="_blank" rel="noreferrer">SDK docs</a>
            </div>
            <p className={styles.heroNote}>No subscriptions. Permanent access.</p>
          </div>
        </section>

        <section className={styles.marquee} aria-label="Platform characteristics">
          <span className="sr-only">{MARQUEE_ITEMS.join(', ')}</span>
          <div className={styles.marqueeTrack} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, groupIndex) => (
              <span className={styles.marqueeGroup} key={`marquee-group-${groupIndex}`}>
                {MARQUEE_ITEMS.map((item) => (
                  <span className={styles.marqueeItem} key={`${groupIndex}-${item}`}>
                    {item}
                    <i />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </section>

        <section className={styles.signalStory} aria-labelledby="signal-story-title">
          <figure className={`${styles.signalFigure} ${styles.reveal}`} data-landing-reveal>
            <div className={styles.signalImageCard}>
              <Image
                src="/images/shelby-signal-network.jpg"
                alt="A dark pixel-art research room filled with market data terminals"
                fill
                sizes="(max-width: 720px) 100vw, 90vw"
              />
              <div className={styles.signalOverlay}>
                <p className={styles.eyebrow}>The intelligence layer</p>
                <h2 id="signal-story-title">From market noise to owned intelligence.</h2>
                <p>Shelby turns independent research into portable, wallet-bound access—without hiding the source or the settlement.</p>
              </div>
              <figcaption>
                <span><b>01</b> Detect</span>
                <i>→</i>
                <span><b>02</b> Verify</span>
                <i>→</i>
                <span><b>03</b> Own</span>
              </figcaption>
            </div>
          </figure>
        </section>

        <section className={styles.whySection} id="why" aria-labelledby="why-title">
          <div className={`${styles.sectionIntro} ${styles.reveal}`} data-landing-reveal>
            <p className={styles.eyebrow}>The economic model</p>
            <h2 id="why-title">Buy once.<br /><span>Keep access.</span></h2>
            <p>No subscriptions. No platform lock-in.</p>
          </div>
          <div className={`${styles.benefitList} ${styles.reveal}`} data-landing-reveal>
            {BENEFITS.map((benefit) => (
              <article key={benefit.number}>
                <span>{benefit.number}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.feedSection} id="intelligence" aria-labelledby="feed-title">
          <header className={`${styles.sectionHeader} ${styles.reveal}`} data-landing-reveal>
            <div>
              <p className={styles.eyebrow}>Curated examples</p>
              <h2 id="feed-title">The live intelligence feed</h2>
              <p className={styles.sectionSubtitle}>Research you can read, own, and carry with one wallet.</p>
            </div>
          </header>

          <div className={`${styles.listings} ${styles.reveal}`} data-landing-reveal>
            <article className={styles.listingPrimary}>
              <div className={styles.listingIndex}>01 / DATASET</div>
              <div className={styles.listingContent}>
                <div className={styles.listingMeta}><span>CSV</span><span>45.2 MB</span><span className={styles.premium}>Premium</span></div>
                <h3>Smart Money Movement Q2</h3>
                <p>See where institutional and venture capital is moving this week. Raw transaction arrays, cleaned and structured for immediate algorithmic use.</p>
                <small>ILLUSTRATIVE LISTING</small>
              </div>
              <button onClick={enterWorkspace}>Unlock for 2 APT <span>↗</span></button>
            </article>

            <article className={styles.listingSecondary}>
              <div className={styles.listingIndex}>02 / REPORT</div>
              <div className={styles.listingContent}>
                <div className={styles.listingMeta}><span>PDF</span><span>12.8 MB</span><span className={styles.open}>Open access</span></div>
                <h3>AI Sector On-Chain Onboarding Report</h3>
                <p>A technical breakdown of decentralized AI tokens, hardware-cluster economics, and multi-network infrastructure.</p>
                <small>ILLUSTRATIVE LISTING</small>
              </div>
              <Link href="/reports">Stream report instantly <span>→</span></Link>
            </article>
          </div>
        </section>

        <section className={styles.architectureSection} id="architecture" aria-labelledby="architecture-title">
          <header className={`${styles.architectureIntro} ${styles.reveal}`} data-landing-reveal>
            <p className={styles.eyebrow}>Under the glass</p>
            <h2 id="architecture-title">Protected by design.</h2>
            <p>Encrypted on Shelby. Settled on Aptos. Access follows your wallet.</p>
          </header>

          <div className={`${styles.workflows} ${styles.reveal}`} data-landing-reveal>
            <article className={styles.flowLane}>
              <header><span>WORKFLOW 01</span><b>TypeScript / Shelby / Encryption</b></header>
              <h3>Encrypted storage pipeline</h3>
              <ol>{STORAGE_STEPS.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
              <footer><i /> Ciphertext is public. Access keys are not.</footer>
            </article>
            <article className={styles.flowLane}>
              <header><span>WORKFLOW 02</span><b>Aptos Move / Registry V2</b></header>
              <h3>Direct settlement registry</h3>
              <ol>{SETTLEMENT_STEPS.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
              <footer><i /> Purchases survive devices and sessions.</footer>
            </article>
          </div>
        </section>

        <section className={`${styles.finalCta} ${styles.reveal}`} data-landing-reveal>
          <Image
            className={styles.finalCtaImage}
            src="/images/shelby-city-sunset.jpg"
            alt="A pink pixel-art city skyline at sunset"
            fill
            sizes="100vw"
          />
          <div className={styles.finalCtaShade} />
          <p className={styles.eyebrow}>The research desk is open</p>
          <h2>Find the signal.<br /><span>Own the source.</span></h2>
          <p>Explore independent intelligence or publish research directly to the people who value it.</p>
          <button className={styles.primaryButton} onClick={enterWorkspace}><span>Connect wallet & explore</span><b>↗</b></button>
          <div className={styles.ctaProof}><i /> Encrypted on Shelby · Settled on Aptos</div>
        </section>
      </main>

      <footer className={styles.siteFooter}>
        <Brand />
        <p>Independent intelligence, stored on Shelby and settled on Aptos.</p>
        <nav aria-label="Footer navigation">
          <Link href="/reports">Reports</Link>
          <Link href="/intel">Intel</Link>
          <a href="https://docs.shelby.xyz/" target="_blank" rel="noreferrer">Docs</a>
          <a href="https://github.com/shelby" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <small>© {new Date().getFullYear()} Shelby Scribe</small>
      </footer>

      {walletOpen && (
        <LandingWalletDialog open onClose={() => setWalletOpen(false)} onConnected={() => router.push('/reports')} />
      )}
    </div>
  )
}
