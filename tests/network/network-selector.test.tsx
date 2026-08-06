import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkSelector } from '@/features/network/components/NetworkSelector'
import { ShelbyNetworkProvider } from '@/features/network/NetworkProvider'
import { SHELBY_NETWORK_STORAGE_KEY, toShelbyNetwork } from '@/features/network/network'

const walletState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@aptos-labs/wallet-adapter-react', () => ({
  useWallet: () => walletState.current,
}))

describe('Shelby network selection', () => {
  beforeEach(() => {
    cleanup()
    window.localStorage.clear()
    walletState.current = {
      connected: false,
      account: null,
      network: null,
      wallet: null,
      changeNetwork: vi.fn(),
    }
  })

  it('defaults unknown values to testnet', () => {
    expect(toShelbyNetwork(undefined)).toBe('testnet')
    expect(toShelbyNetwork('mainnet')).toBe('testnet')
    expect(toShelbyNetwork('shelbynet')).toBe('shelbynet')
  })

  it('restores and persists the selected storage network', async () => {
    window.localStorage.setItem(SHELBY_NETWORK_STORAGE_KEY, 'shelbynet')

    render(
      <ShelbyNetworkProvider>
        <NetworkSelector />
      </ShelbyNetworkProvider>,
    )

    const selector = screen.getByRole('combobox', { name: 'Shelby storage network' })
    await waitFor(() => expect(selector).toHaveValue('shelbynet'))

    fireEvent.change(selector, { target: { value: 'testnet' } })
    expect(selector).toHaveValue('testnet')
    expect(window.localStorage.getItem(SHELBY_NETWORK_STORAGE_KEY)).toBe('testnet')
  })

  it('switches Petra before persisting a connected ShelbyNet selection', async () => {
    const switchNetwork = vi.fn().mockResolvedValue({ status: 'Approved', args: { success: true } })
    walletState.current = {
      connected: true,
      account: { address: { toString: () => '0x2' } },
      network: { name: 'testnet', chainId: 2 },
      wallet: { name: 'Petra', features: { 'aptos:changeNetwork': { changeNetwork: switchNetwork } } },
      changeNetwork: vi.fn(),
    }

    render(
      <ShelbyNetworkProvider>
        <NetworkSelector />
      </ShelbyNetworkProvider>,
    )

    const selector = screen.getByRole('combobox', { name: 'Shelby storage network' })
    await waitFor(() => expect(selector).not.toBeDisabled())
    fireEvent.change(selector, {
      target: { value: 'shelbynet' },
    })

    await waitFor(() => expect(switchNetwork).toHaveBeenCalledWith({
      name: 'shelbynet',
      chainId: 118,
      url: 'https://api.shelbynet.shelby.xyz/v1',
    }))
    await waitFor(() => expect(window.localStorage.getItem(SHELBY_NETWORK_STORAGE_KEY)).toBe('shelbynet'))
  })
})
