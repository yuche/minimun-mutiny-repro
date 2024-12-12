export type Network = 'bitcoin' | 'testnet' | 'regtest' | 'signet'

export type MutinyWalletSettingStrings = {
  network?: string
  proxy?: string
  esplora?: string
  rgs?: string
  lsp?: string
  lsps_connection_string?: string
  lsps_token?: string
  auth?: string
  subscriptions?: string
  storage?: string
  scorer?: string
  selfhosted?: string
  blind_auth?: string
  hermes?: string
  ln_event_broadcast_channel?: string
}

const SETTINGS_KEYS = [
  {
    name: 'network',
    storageKey: 'USER_SETTINGS_network',
    default: import.meta.env.VITE_NETWORK || 'testnet',
  },
  {
    name: 'proxy',
    storageKey: 'USER_SETTINGS_proxy',
    default: import.meta.env.VITE_PROXY || 'wss://websocket-proxy.devops-5f8.workers.dev',
  },
  {
    name: 'esplora',
    storageKey: 'USER_SETTINGS_esplora',
    default: import.meta.env.VITE_ESPLORA || 'https://cell.mempool.space/testnet/api',
  },
  {
    name: 'rgs',
    storageKey: 'USER_SETTINGS_rgs',
    default: import.meta.env.VITE_RGS,
  },
  {
    name: 'lsp',
    storageKey: 'USER_SETTINGS_lsp',
    default: import.meta.env.VITE_LSP || 'https://api.internal.joyid.dev',
  },
  {
    name: 'lsps_connection_string',
    storageKey: 'USER_SETTINGS_lsps_connection_string',
    default: import.meta.env.VITE_LSPS_CONNECTION_STRING,
  },
  {
    name: 'lsps_token',
    storageKey: 'USER_SETTINGS_lsps_token',
    default: import.meta.env.VITE_LSPS_TOKEN,
  },
  {
    name: 'auth',
    storageKey: 'USER_SETTINGS_auth',
    default: import.meta.env.VITE_AUTH,
  },
  {
    name: 'subscriptions',
    storageKey: 'USER_SETTINGS_subscriptions',
    default: import.meta.env.VITE_SUBSCRIPTIONS,
  },
  {
    name: 'storage',
    storageKey: 'USER_SETTINGS_storage',
    default: import.meta.env.VITE_STORAGE || 'https://vs.joyid.dev/v2',
  },
  {
    name: 'scorer',
    storageKey: 'USER_SETTINGS_scorer',
    default: import.meta.env.VITE_SCORER,
  },
  {
    name: 'selfhosted',
    storageKey: 'USER_SETTINGS_selfhosted',
    default: import.meta.env.VITE_SELFHOSTED,
  },
  {
    name: 'blind_auth',
    storageKey: 'USER_SETTINGS_blind_auth',
    default: import.meta.env.VITE_BLIND_AUTH,
  },
  {
    name: 'hermes',
    storageKey: 'USER_SETTINGS_hermes',
    default: import.meta.env.VITE_HERMES,
  },
  {
    name: 'ln_event_broadcast_channel',
    storageKey: 'USER_SETTINGS_ln_event_broadcast_channel',
    default:
      import.meta.env.VITE_BROADCAST_CHANNEL ??
      'joyid_ln_event_broadcast_channel',
  },
] as const

function getItemOrDefault(
  storageKey: string,
  defaultValue: string
): string | undefined {
  const item = localStorage.getItem(storageKey)
  if (item === '') {
    return undefined
  }
  if (item === null) {
    return defaultValue
  }
  return item
}

function setItemIfNotDefault(
  key: string,
  override: string,
  defaultValue: string
) {
  if (override === defaultValue) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, override)
  }
}

export function getSettings() {
  const settings = <MutinyWalletSettingStrings>{}

  SETTINGS_KEYS.forEach(({ name, storageKey, default: defaultValue }) => {
    const n = name as keyof MutinyWalletSettingStrings
    const item = getItemOrDefault(storageKey, defaultValue)
    settings[n] = item
  })

  // VITE_PROXY and VITE_STORAGE might be set as relative URLs when self-hosting, so we need to make them absolute
  const selfhosted = settings.selfhosted === 'true'

  // Expect urls like /_services/proxy and /_services/storage
  if (selfhosted) {
    let base = location.origin
    // eslint-disable-next-line no-console
    console.log('Self-hosted mode enabled, using base URL', base)
    const { storage } = settings
    if (storage && storage.startsWith('/')) {
      settings.storage = base + storage
    }

    const { proxy } = settings
    if (proxy && proxy.startsWith('/')) {
      if (base.startsWith('http://')) {
        base = base.replace('http://', 'ws://')
      } else if (base.startsWith('https://')) {
        base = base.replace('https://', 'wss://')
      }
      settings.proxy = base + proxy
    }
  }

  if (!settings.network || !settings.proxy) {
    throw new Error(
      'Missing a default setting for network or proxy. Check your .env file to make sure it looks like .env.sample'
    )
  }

  return settings
}

export function setSettings(newSettings: MutinyWalletSettingStrings) {
  SETTINGS_KEYS.forEach(({ name, storageKey, default: defaultValue }) => {
    const n = name as keyof MutinyWalletSettingStrings
    const override = newSettings[n]
    // If the value is in the newSettings, and it's not the default, set it in localstorage
    // Also, "" is a valid value, so we only want to reject undefined
    if (override !== undefined) {
      setItemIfNotDefault(storageKey, override, defaultValue)
    }
  })
}
