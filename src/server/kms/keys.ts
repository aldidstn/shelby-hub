import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from '@aws-sdk/client-kms'

const kms = new KMSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })

function keyId() {
  const value = process.env.AWS_KMS_KEY_ID
  if (!value) throw new Error('AWS_KMS_KEY_ID is not configured')
  return value
}

export async function generateReportDataKey(reportId: string) {
  const result = await kms.send(new GenerateDataKeyCommand({
    KeyId: keyId(), KeySpec: 'AES_256',
    EncryptionContext: { reportId, purpose: 'shelby-premium-report' },
  }))
  if (!result.Plaintext || !result.CiphertextBlob) throw new Error('KMS did not return a data key')
  return {
    plaintextKey: Buffer.from(result.Plaintext).toString('base64'),
    wrappedKey: Buffer.from(result.CiphertextBlob).toString('base64'),
    kmsKeyId: keyId(),
  }
}

export async function decryptReportDataKey(reportId: string, wrappedKey: string) {
  const result = await kms.send(new DecryptCommand({
    KeyId: keyId(), CiphertextBlob: Buffer.from(wrappedKey, 'base64'),
    EncryptionContext: { reportId, purpose: 'shelby-premium-report' },
  }))
  if (!result.Plaintext) throw new Error('KMS did not decrypt the data key')
  return Buffer.from(result.Plaintext).toString('base64')
}
