import * as ACE from '@aptos-labs/ace-sdk'
import { AccountAddress, type PublicKey, type Signature } from '@aptos-labs/ts-sdk'
import { getAceConfig, getAceReportModule } from '@/lib/ace/config'

const encoder = new TextEncoder()

function reportLabel(reportId: string) {
  return encoder.encode(reportId)
}

function errorMessage(value: unknown) {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try { return JSON.stringify(value) }
  catch { return String(value) }
}

function throwAceResultError(prefix: string, result: { errValue?: unknown; extra?: unknown }): never {
  const detail = errorMessage(result.errValue ?? result.extra)
  throw new Error(detail && detail !== 'undefined' ? `${prefix}: ${detail}` : prefix)
}

export async function encryptReportWithAce(input: { reportId: string; plaintext: Uint8Array }) {
  const { aceDeployment, chainId, keypairId } = getAceConfig()
  const { moduleAddr, moduleName } = getAceReportModule()

  const result = await ACE.IBE_Aptos.encrypt({
    aceDeployment,
    keypairId,
    chainId,
    moduleAddr,
    moduleName,
    label: reportLabel(input.reportId),
    plaintext: input.plaintext,
  })
  const ciphertext = result.okValue
  if (!result.isOk || !ciphertext) throwAceResultError('ACE encrypt failed', result)
  return ciphertext
}

export async function createAceReportDecryptionSession(input: { reportId: string; ciphertext: Uint8Array }) {
  const { aceDeployment, chainId, keypairId } = getAceConfig()
  const { moduleAddr, moduleName } = getAceReportModule()

  return ACE.IBE_Aptos.BasicDecryptionSession.create({
    aceDeployment,
    keypairId,
    chainId,
    moduleAddr,
    moduleName,
    label: reportLabel(input.reportId),
    ciphertext: input.ciphertext,
  })
}

export async function decryptReportWithAce(input: {
  reportId: string
  ciphertext: Uint8Array
  accountAddress: string
  publicKey: PublicKey
  signMessage: (message: { address?: boolean; application?: boolean; chainId?: boolean; message: string; nonce: string }) => Promise<{
    fullMessage: string
    signature: Signature
  }>
}) {
  const session = await createAceReportDecryptionSession({
    reportId: input.reportId,
    ciphertext: input.ciphertext,
  })
  const message = await session.getRequestToSign()
  let signed: Awaited<ReturnType<typeof input.signMessage>>
  try {
    signed = await input.signMessage({
      address: true,
      application: true,
      chainId: true,
      message,
      nonce: crypto.randomUUID(),
    })
  } catch (error) {
    throw new Error(`Wallet signature failed: ${errorMessage(error)}`)
  }
  const result = await session.decryptWithProof({
    userAddr: AccountAddress.fromString(input.accountAddress),
    publicKey: input.publicKey,
    signature: signed.signature,
    fullMessage: signed.fullMessage,
  })
  const plaintext = result.okValue
  if (!result.isOk || !plaintext) throwAceResultError('ACE decrypt failed', result)
  return plaintext
}
