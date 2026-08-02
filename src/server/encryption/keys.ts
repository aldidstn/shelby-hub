import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ACTIVE_KEY_VERSION = '1'
const PROVIDER_PREFIX = 'vercel-env'
const WRAP_FORMAT = 'v1'
const PURPOSE = 'scribehub-premium-report-key'
const IV_BYTES = 12
const TAG_BYTES = 16
const DATA_KEY_BYTES = 32

function configuredVersion() {
  const version = process.env.PREMIUM_MASTER_KEY_VERSION?.trim() || ACTIVE_KEY_VERSION
  if (!/^[1-9]\d*$/.test(version)) throw new Error('PREMIUM_MASTER_KEY_VERSION must be a positive integer')
  return version
}

function masterKey(version: string) {
  const encoded = process.env[`PREMIUM_MASTER_KEY_V${version}`]?.trim()
  if (!encoded) throw new Error(`PREMIUM_MASTER_KEY_V${version} is not configured`)
  if (!/^[A-Za-z0-9+/]{43}=$/.test(encoded)) {
    throw new Error(`PREMIUM_MASTER_KEY_V${version} must be a base64-encoded 32-byte key`)
  }
  const key = Buffer.from(encoded, 'base64')
  if (key.length !== DATA_KEY_BYTES) throw new Error(`PREMIUM_MASTER_KEY_V${version} must decode to 32 bytes`)
  return key
}

function additionalData(reportId: string, keyVersion: string) {
  return Buffer.from(`${PURPOSE}\0${reportId}\0${keyVersion}`, 'utf8')
}

function providerKeyId(version: string) {
  return `${PROVIDER_PREFIX}:v${version}`
}

function versionFromProviderKeyId(value: string) {
  const match = /^vercel-env:v([1-9]\d*)$/.exec(value)
  return match?.[1]
}

function wrapDataKey(reportId: string, dataKey: Buffer, keyVersion: string) {
  const wrappingKey = masterKey(keyVersion)
  const iv = randomBytes(IV_BYTES)
  try {
    const cipher = createCipheriv('aes-256-gcm', wrappingKey, iv)
    cipher.setAAD(additionalData(reportId, keyVersion))
    const ciphertext = Buffer.concat([cipher.update(dataKey), cipher.final()])
    const tag = cipher.getAuthTag()
    return [WRAP_FORMAT, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
  } finally {
    wrappingKey.fill(0)
  }
}

function unwrapVercelDataKey(reportId: string, wrappedKey: string, keyVersion: string) {
  const [format, encodedIv, encodedTag, encodedCiphertext, extra] = wrappedKey.split('.')
  if (format !== WRAP_FORMAT || !encodedIv || !encodedTag || !encodedCiphertext || extra) {
    throw new Error('Wrapped report key has an unsupported format')
  }

  const iv = Buffer.from(encodedIv, 'base64url')
  const tag = Buffer.from(encodedTag, 'base64url')
  const ciphertext = Buffer.from(encodedCiphertext, 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length !== DATA_KEY_BYTES) {
    throw new Error('Wrapped report key is malformed')
  }

  const wrappingKey = masterKey(keyVersion)
  try {
    const decipher = createDecipheriv('aes-256-gcm', wrappingKey, iv)
    decipher.setAAD(additionalData(reportId, keyVersion))
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } finally {
    wrappingKey.fill(0)
  }
}

async function unwrapLegacyAwsDataKey(reportId: string, wrappedKey: string, wrappingKeyId: string) {
  const { DecryptCommand, KMSClient } = await import('@aws-sdk/client-kms')
  const kms = new KMSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
  const result = await kms.send(new DecryptCommand({
    KeyId: wrappingKeyId,
    CiphertextBlob: Buffer.from(wrappedKey, 'base64'),
    EncryptionContext: { reportId, purpose: 'shelby-premium-report' },
  }))
  if (!result.Plaintext) throw new Error('AWS KMS did not decrypt the legacy report key')
  return Buffer.from(result.Plaintext)
}

export const PREMIUM_ENCRYPTION_PROVIDER = 'vercel-master-key'

export function isPremiumEncryptionConfigured() {
  try {
    const key = masterKey(configuredVersion())
    key.fill(0)
    return true
  } catch {
    return false
  }
}

export async function createReportDataKey(reportId: string) {
  const keyVersion = configuredVersion()
  const dataKey = randomBytes(DATA_KEY_BYTES)
  try {
    return {
      plaintextKey: dataKey.toString('base64'),
      wrappedKey: wrapDataKey(reportId, dataKey, keyVersion),
      wrappingKeyId: providerKeyId(keyVersion),
      keyVersion,
    }
  } finally {
    dataKey.fill(0)
  }
}

export async function unwrapReportDataKey(reportId: string, wrappedKey: string, wrappingKeyId: string) {
  const keyVersion = versionFromProviderKeyId(wrappingKeyId)
  const dataKey = keyVersion
    ? unwrapVercelDataKey(reportId, wrappedKey, keyVersion)
    : await unwrapLegacyAwsDataKey(reportId, wrappedKey, wrappingKeyId)
  try {
    return dataKey.toString('base64')
  } finally {
    dataKey.fill(0)
  }
}
