import * as ACE from '@aptos-labs/ace-sdk'
import { AccountAddress, type PublicKey, type Signature } from '@aptos-labs/ts-sdk'
import { getAceConfig, getAceReportModule } from '@/lib/ace/config'

const encoder = new TextEncoder()

function reportLabel(reportId: string) {
  return encoder.encode(reportId)
}

export async function encryptReportWithAce(input: { reportId: string; plaintext: Uint8Array }) {
  const { aceDeployment, chainId, keypairId } = getAceConfig()
  const { moduleAddr, moduleName } = getAceReportModule()

  return (await ACE.IBE_Aptos.encrypt({
    aceDeployment,
    keypairId,
    chainId,
    moduleAddr,
    moduleName,
    label: reportLabel(input.reportId),
    plaintext: input.plaintext,
  })).unwrapOrThrow('ACE encrypt failed')
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
  const signed = await input.signMessage({
    address: true,
    application: true,
    chainId: true,
    message,
    nonce: crypto.randomUUID(),
  })
  return (await session.decryptWithProof({
    userAddr: AccountAddress.fromString(input.accountAddress),
    publicKey: input.publicKey,
    signature: signed.signature,
    fullMessage: signed.fullMessage,
  })).unwrapOrThrow('ACE decrypt failed')
}
