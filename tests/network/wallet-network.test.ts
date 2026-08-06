import { Network } from '@aptos-labs/ts-sdk'
import { describe, expect, it, vi } from 'vitest'
import { ensureWalletNetwork, SHELBYNET_CHAIN_ID, SHELBYNET_FULLNODE_URL } from '@/features/network/wallet-network'

describe('ensureWalletNetwork', () => {
  it('does not request a switch when the wallet already uses the target chain', async () => {
    const changeNetwork = vi.fn()

    await ensureWalletNetwork({
      target: 'shelbynet',
      currentNetwork: { name: 'shelbynet', chainId: SHELBYNET_CHAIN_ID },
      wallet: null,
      changeNetwork,
    })

    expect(changeNetwork).not.toHaveBeenCalled()
  })

  it('uses the wallet adapter to switch to Aptos Testnet', async () => {
    const changeNetwork = vi.fn().mockResolvedValue(undefined)

    await ensureWalletNetwork({
      target: 'testnet',
      currentNetwork: { name: 'shelbynet', chainId: SHELBYNET_CHAIN_ID },
      wallet: null,
      changeNetwork,
    })

    expect(changeNetwork).toHaveBeenCalledWith(Network.TESTNET)
  })

  it('supplies ShelbyNet chain metadata through the wallet standard feature', async () => {
    const switchShelbyNet = vi.fn().mockResolvedValue({ status: 'Approved', args: { success: true } })

    await ensureWalletNetwork({
      target: 'shelbynet',
      currentNetwork: { name: 'testnet', chainId: 2 },
      wallet: { name: 'Petra', features: { 'aptos:changeNetwork': { changeNetwork: switchShelbyNet } } },
      changeNetwork: vi.fn(),
    })

    expect(switchShelbyNet).toHaveBeenCalledWith({
      name: Network.SHELBYNET,
      chainId: SHELBYNET_CHAIN_ID,
      url: SHELBYNET_FULLNODE_URL,
    })
  })

  it('reports a rejected ShelbyNet switch', async () => {
    await expect(ensureWalletNetwork({
      target: 'shelbynet',
      currentNetwork: { name: 'testnet', chainId: 2 },
      wallet: {
        name: 'Petra',
        features: {
          'aptos:changeNetwork': {
            changeNetwork: vi.fn().mockResolvedValue({ status: 'Rejected', args: { success: false, reason: 'User rejected' } }),
          },
        },
      },
      changeNetwork: vi.fn(),
    })).rejects.toThrow('User rejected')
  })
})
