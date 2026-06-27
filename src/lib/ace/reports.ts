import * as ACE from '@aptos-labs/ace-sdk'
import {
  AccountAddress,
  AnyPublicKey,
  Deserializer,
  Ed25519PublicKey,
  FederatedKeylessPublicKey,
  Hex,
  KeylessPublicKey,
  MultiEd25519PublicKey,
  MultiKey,
  type PublicKey,
  type Signature,
} from '@aptos-labs/ts-sdk'
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

function isAceSupportedPublicKey(value: unknown): value is PublicKey {
  return value instanceof Ed25519PublicKey
    || value instanceof AnyPublicKey
    || value instanceof MultiEd25519PublicKey
    || value instanceof MultiKey
    || value instanceof KeylessPublicKey
    || value instanceof FederatedKeylessPublicKey
}

function bytesFromHex(value: string) {
  const hex = value.startsWith('0x') ? value : `0x${value}`
  if (!Hex.isValid(hex).valid) return null
  return Hex.fromHexInput(hex).toUint8Array()
}

function publicKeyBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return value
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return new Uint8Array(value)
  }
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? bytesFromHex(value) : null
  }

  const candidate = value as {
    bcsToHex?: () => { toString: () => string } | string
    toUint8Array?: () => Uint8Array
    toString?: () => string
  }

  if (typeof candidate.toUint8Array === 'function') return candidate.toUint8Array()
  if (typeof candidate.bcsToHex === 'function') return bytesFromHex(String(candidate.bcsToHex()))
  if (typeof candidate.toString === 'function') {
    const text = candidate.toString()
    if (text !== '[object Object]') return bytesFromHex(text)
  }

  return null
}

function deserializePublicKey(bytes: Uint8Array): PublicKey | null {
  if (bytes.length === Ed25519PublicKey.LENGTH) return new Ed25519PublicKey(bytes)

  for (const deserialize of [
    AnyPublicKey.deserialize,
    Ed25519PublicKey.deserialize,
    MultiEd25519PublicKey.deserialize,
    MultiKey.deserialize,
    KeylessPublicKey.deserialize,
    FederatedKeylessPublicKey.deserialize,
  ]) {
    try { return deserialize(new Deserializer(bytes)) as PublicKey }
    catch { /* try the next supported key format */ }
  }

  return null
}

export function normalizeAcePublicKey(value: unknown): PublicKey {
  if (isAceSupportedPublicKey(value)) return value

  const nested = value && typeof value === 'object' && 'publicKey' in value
    ? normalizeAcePublicKey((value as { publicKey: unknown }).publicKey)
    : null
  if (nested) return nested

  const bytes = publicKeyBytes(value)
  const publicKey = bytes ? deserializePublicKey(bytes) : null
  if (publicKey) return publicKey

  throw new Error('Wallet public key type is not supported by ACE')
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
  let session: Awaited<ReturnType<typeof createAceReportDecryptionSession>>
  try {
    session = await createAceReportDecryptionSession({
      reportId: input.reportId,
      ciphertext: input.ciphertext,
    })
  } catch (error) {
    throw new Error(`ACE decrypt session failed: ${errorMessage(error)}`)
  }

  let message: string
  try {
    message = await session.getRequestToSign()
  } catch (error) {
    throw new Error(`ACE decrypt request failed: ${errorMessage(error)}`)
  }

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

  let result: Awaited<ReturnType<typeof session.decryptWithProof>>
  try {
    result = await session.decryptWithProof({
      userAddr: AccountAddress.fromString(input.accountAddress),
      publicKey: normalizeAcePublicKey(input.publicKey),
      signature: signed.signature,
      fullMessage: signed.fullMessage,
    })
  } catch (error) {
    throw new Error(`ACE decrypt failed: ${errorMessage(error)}`)
  }

  const plaintext = result.okValue
  if (!result.isOk || !plaintext) throwAceResultError('ACE decrypt failed', result)
  return plaintext
}
