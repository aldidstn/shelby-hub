import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { NetworkSelector } from '@/features/network/components/NetworkSelector'
import { ShelbyNetworkProvider } from '@/features/network/NetworkProvider'
import { SHELBY_NETWORK_STORAGE_KEY, toShelbyNetwork } from '@/features/network/network'

describe('Shelby network selection', () => {
  beforeEach(() => window.localStorage.clear())

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
})
