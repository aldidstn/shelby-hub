import { type Report } from '../types/report'

export type BlockType = 'heading' | 'subheading' | 'paragraph' | 'quote' | 'divider'

export interface ContentBlock {
  type: BlockType
  text?: string
}

export interface ReportContent {
  id: string
  title: string
  subtitle: string
  blocks: ContentBlock[]
}

// Static (on-chain) reports with full metadata.
// Add real published reports here — never mock data.
export const STATIC_REPORTS: Report[] = [
  {
    id: 'design-is-the-exploit',
    title: 'Design is the Exploit',
    description:
      "Why Web3's biggest systemic risk isn't a zero-day — it's the interface. An argument for why current Web3 design is the single biggest systemic risk to mass adoption.",
    type: 'Research',
    access: 'free',
    likes: 847,
    downloads: 3200,
    author: 'aldidstn',
    authorAddress: '0xaldi000000000000',
    createdAt: '2026-03-24T08:00:00Z',
    onChain: true,
    fileType: 'md',
    tags: ['UX', 'Security', 'Design', 'Web3', 'Blind Signing'],
    blobAccount: 'aldidstn',
    blobName: 'design-is-the-exploit.md',
  },
]

export const REPORT_CONTENT: Record<string, ReportContent> = {
  'design-is-the-exploit': {
    id: 'design-is-the-exploit',
    title: 'Design is the Exploit',
    subtitle:
      "Why Web3's biggest systemic risk isn't a zero-day — it's the interface.",
    blocks: [
      {
        type: 'paragraph',
        text: 'If you look at the post-mortem data from the largest crypto losses over the last two years, you will find a disturbing pattern. The industry is obsessed with elite hackers from North Korea or zero-day exploits on complex bridge protocols. But the reality on the ground is far more banal and far more tragic.',
      },
      {
        type: 'paragraph',
        text: 'Billions of dollars aren\'t being lost because the code broke. They are being lost because the interface failed.',
      },
      {
        type: 'paragraph',
        text: 'In Web3, poor User Experience (UX) is not just an aesthetic inconvenience; it is a critical security vector. For too long, the crypto industry has treated product design as an afterthought — cosmetics applied after the backend is finalized. This is a fatal error. When "programmable money" meets confusing design, the result isn\'t just user frustration. The result is accidental wealth transfer.',
      },
      {
        type: 'quote',
        text: 'Here is the argument for why current Web3 design is the single biggest systemic risk to mass adoption.',
      },
      { type: 'divider' },
      {
        type: 'heading',
        text: 'The Cognitive Gap: The "Blind Signing" Problem',
      },
      {
        type: 'paragraph',
        text: 'The core of Web3\'s security crisis lies in the gap between Intent (what the user wants to do) and Execution (what actually happens on-chain).',
      },
      {
        type: 'paragraph',
        text: 'Imagine walking into a bank. You want to transfer $10 for lunch. But the withdrawal slip is written in ancient Sumerian. The teller simply says, "Just sign here, sir." You sign it. Suddenly, your entire life savings are drained, and the deed to your house is transferred to an anonymous stranger.',
      },
      {
        type: 'paragraph',
        text: 'Sounds ridiculous? This is exactly what happens every single day in Web3 through the phenomenon of Blind Signing.',
      },
      {
        type: 'paragraph',
        text: 'Most wallets today still present transactions as raw hex data or incomprehensible strings of code. Users, conditioned by Web2 to click "Accept Cookies" or "I Agree" without reading, do the exact same thing with blockchain transactions.',
      },
      {
        type: 'paragraph',
        text: 'Drainer kits automate the exploitation of this cognitive gap. They mask malicious transactions like setApprovalForAll behind a harmless-looking "Login" or "Claim Airdrop" button. Technically, the user "authorized" the robbery. But structurally, the system failed to provide enough intelligible information to allow for an informed decision.',
      },
      { type: 'divider' },
      {
        type: 'heading',
        text: 'Design as a Gatekeeper (and a Trap)',
      },
      {
        type: 'paragraph',
        text: 'There is a technocratic arrogance embedded in Web3 culture that says: "If you get rekt, it\'s your fault. Do your own research."',
      },
      {
        type: 'paragraph',
        text: 'This is a lazy and dangerous mentality.',
      },
      {
        type: 'paragraph',
        text: 'Expecting the average user to audit smart contract interactions every time they mint an NFT is a hallucination. The human brain has a limit on cognitive load. When faced with high complexity — gas fees, slippage, network selection, bridging — the brain experiences "security fatigue." We get tired, our vigilance drops, and we start looking for shortcuts.',
      },
      {
        type: 'subheading',
        text: 'Current Web3 design maximizes this cognitive load.',
      },
      {
        type: 'paragraph',
        text: 'Non-reversible by default: one wrong click, funds are gone forever. Zero safety nets: no fraud department to reverse a transaction. Inconsistent patterns: a button in one dApp might mean something entirely different in another.',
      },
      {
        type: 'paragraph',
        text: 'This creates a highly adversarial environment. It isn\'t the "democratization of finance"; it is a Darwinian selection process where only the technically paranoid survive. Mainstream society will never adopt a system where a mistake as small as a "misclick" carries a life-altering financial penalty.',
      },
      { type: 'divider' },
      {
        type: 'heading',
        text: 'The Verdict: Abstraction or Death',
      },
      {
        type: 'paragraph',
        text: 'So, what is the solution? More user education? No. Education does not scale. You cannot teach 1 billion people to read Solidity.',
      },
      {
        type: 'subheading',
        text: 'The solution is Abstraction.',
      },
      {
        type: 'paragraph',
        text: 'Technologies like Account Abstraction (ERC-4337) and Intents-based architecture are the only way out. We need systems capable of simulating transaction outcomes in plain human language before the user presses confirm. We need wallets that say: "Warning: This transaction will grant full access to your USDT balance to an unknown address. Proceed?"',
      },
      {
        type: 'paragraph',
        text: 'Until that happens, Web3 UX will remain an accomplice to fraud.',
      },
      {
        type: 'quote',
        text: 'We must stop blaming users for errors triggered by bad design. If a door has a handle but needs to be pushed, it is not the user\'s fault for pulling. It is the architect\'s fault. In Web3, bad architects don\'t just confuse people — they bankrupt them.',
      },
    ],
  },
}
