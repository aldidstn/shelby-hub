import * as ACE from '@aptos-labs/ace-sdk'
import { AccountAddress } from '@aptos-labs/ts-sdk'

const DEFAULT_KNOWN_DEPLOYMENT = 'preview20260610'

type KnownDeployment = {
  aceDeployment: ACE.AceDeployment
  chainId: number
  ibeKeypairId?: AccountAddress
  keypairId?: AccountAddress
}

export function isAceConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS)
}

export function getAceAppOrigin() {
  return process.env.NEXT_PUBLIC_ACE_APP_ORIGIN ?? 'https://shelbyscribe.vercel.app'
}

export function getAceReportModule() {
  const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_V2_ADDRESS
  if (!registryAddress) throw new Error('NEXT_PUBLIC_REGISTRY_V2_ADDRESS is not configured')
  return {
    moduleAddr: AccountAddress.fromString(registryAddress),
    moduleName: 'registry_v2',
    functionName: 'on_ace_decryption_request',
  }
}

export function getAceConfig() {
  const customEndpoint = process.env.NEXT_PUBLIC_ACE_API_ENDPOINT
  const customContract = process.env.NEXT_PUBLIC_ACE_CONTRACT_ADDRESS
  const customKeypair = process.env.NEXT_PUBLIC_ACE_KEYPAIR_ID
  const customChainId = process.env.NEXT_PUBLIC_ACE_CHAIN_ID

  if (customEndpoint && customContract && customKeypair && customChainId) {
    return {
      aceDeployment: new ACE.AceDeployment({
        apiEndpoint: customEndpoint,
        contractAddr: AccountAddress.fromString(customContract),
        apiKey: process.env.NEXT_PUBLIC_ACE_API_KEY,
      }),
      chainId: Number(customChainId),
      keypairId: AccountAddress.fromString(customKeypair),
    }
  }

  const deploymentName = process.env.NEXT_PUBLIC_ACE_DEPLOYMENT_NAME ?? DEFAULT_KNOWN_DEPLOYMENT
  const deployments = ACE.knownDeployments as unknown as Record<string, KnownDeployment | undefined>
  const known = deployments[deploymentName]
  if (!known) throw new Error(`Unknown ACE deployment: ${deploymentName}`)
  const keypairId = known.ibeKeypairId ?? known.keypairId
  if (!keypairId) throw new Error(`ACE deployment ${deploymentName} does not expose an IBE keypair`)

  return {
    aceDeployment: known.aceDeployment,
    chainId: known.chainId,
    keypairId,
  }
}
