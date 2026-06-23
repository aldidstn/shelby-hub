import * as ACE from '@aptos-labs/ace-sdk'
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
