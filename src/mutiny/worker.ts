/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import initMutinyWallet, {
  ChannelClosure,
  // LnUrlParams,
  MutinyBalance,
  MutinyBip21RawMaterials,
  MutinyChannel,
  MutinyInvoice,
  MutinyPeer,
  MutinyWallet,
} from '@nervina-labs/mutiny-wasm'
import { MutinyWalletSettingStrings } from './settings'

// For some reason {...invoice } doesn't bring across the paid field
export function destructureInvoice(invoice: MutinyInvoice): MutinyInvoice {
  return {
    amount_sats: invoice.amount_sats,
    bolt11: invoice.bolt11,
    description: invoice.description,
    expire: invoice.expire,
    expired: invoice.expired,
    fees_paid: invoice.fees_paid,
    inbound: invoice.inbound,
    labels: invoice.labels,
    last_updated: invoice.last_updated,
    paid: invoice.paid,
    payee_pubkey: invoice.payee_pubkey,
    payment_hash: invoice.payment_hash,
    potential_hodl_invoice: invoice.potential_hodl_invoice,
    preimage: invoice.preimage,
    privacy_level: invoice.privacy_level,
    status: invoice.status,
  } as MutinyInvoice
}

let wallet: MutinyWallet
export let wasm_initialized = false
export let wallet_initialized = false

export const isWalletInitialized = () => wasm_initialized

export async function initializeWasm() {
  // Actually initialize the WASM, this should be the first thing that requires the WASM blob to be downloaded
  // If WASM is already initialized, don't init twice
  try {
    MutinyWallet.convert_btc_to_sats(1)
    console.debug('MutinyWallet WASM already initialized, skipping init')
    wasm_initialized = true
    return
  } catch (e) {
    console.debug('MutinyWallet WASM about to be initialized')
    await initMutinyWallet()
    console.debug('MutinyWallet WASM initialized')
  }
}

export async function setupMutinyWallet(
  settings: MutinyWalletSettingStrings,
  mnemonic?: string,
  password?: string,
  safeMode?: boolean,
  shouldZapHodl?: boolean,
  doNotBumpCloseTx?: boolean
): Promise<MutinyWallet> {
  console.info('Starting setup...')
  const {
    network,
    proxy,
    esplora,
    rgs,
    lsp,
    lsps_connection_string,
    lsps_token,
    auth,
    subscriptions,
    storage,
    scorer,
    blind_auth,
    hermes,
    ln_event_broadcast_channel,
  } = settings

  console.info('Initializing Mutiny Manager')
  console.info('Using network', network)
  console.info('Using proxy', proxy)
  console.info('Using esplora address', esplora)
  console.info('Using rgs address', rgs)
  console.info('Using lsp address', lsp)
  console.info('Using lsp connection string', lsps_connection_string)
  console.info('Using lsp token', lsps_token)
  console.info('Using auth address', auth)
  console.info('Using subscriptions address', subscriptions)
  console.info('Using storage address', storage)
  console.info('Using scorer address', scorer)
  console.info('Using blind auth', blind_auth)
  console.info('Using hermes', hermes)
  console.info('Using do not bump close tx', doNotBumpCloseTx)
  console.info(safeMode ? 'Safe mode enabled' : 'Safe mode disabled')
  console.info(shouldZapHodl ? 'Hodl zaps enabled' : 'Hodl zaps disabled')
  console.info('Using ln_event broadcast channel', ln_event_broadcast_channel)

  // Only use lsps if there's no lsp set
  const shouldUseLSPS = !lsp && lsps_connection_string && lsps_token

  const mutinyWallet = await MutinyWallet.new(
    // Password
    password || undefined,
    // Mnemonic
    mnemonic,
    proxy,
    network,
    esplora,
    rgs,
    shouldUseLSPS ? undefined : lsp,
    shouldUseLSPS ? lsps_connection_string : undefined,
    shouldUseLSPS ? lsps_token : undefined,
    auth,
    subscriptions,
    storage,
    scorer,
    // Do not connect peers
    undefined,
    // Do not skip device lock
    undefined,
    // Safe mode
    safeMode || undefined,
    // Skip hodl invoices? (defaults to true, so if shouldZapHodl is true that's when we pass false)
    shouldZapHodl ? false : undefined,
    // do_not_bump_close_tx override
    doNotBumpCloseTx,
    // Nip7 (not supported in web worker)
    undefined,
    /// blind auth url
    blind_auth,
    /// hermes url
    hermes,
    // BroadcastChannel name for ln events
    ln_event_broadcast_channel
  )

  wallet = mutinyWallet
  wallet_initialized = true

  return wallet
}

/**
 * Gets the CARGO_PKG_VERSION of the wallet-node.
 * @returns {Promise<string>}
 */
export async function get_version(): Promise<string> {
  return MutinyWallet.get_version()
}

/**
 * Gets the current balance of the wallet.
 * This includes both on-chain and lightning funds.
 *
 * This will not include any funds in an unconfirmed lightning channel.
 * @returns {Promise<MutinyBalance>}
 */
export async function get_balance(): Promise<MutinyBalance> {
  const balance = await wallet!.get_balance()
  return {
    lightning: balance.lightning,
    confirmed: balance.confirmed,
    unconfirmed: balance.unconfirmed,
    closing: balance.closing,
  } as MutinyBalance
}

export async function get_activity(): Promise<any[]> {
  const activity = await wallet!.get_activity()
  return activity
}

/**
 * Checks whether or not the user is subscribed to Mutiny+.
 * Submits a NWC string to keep the subscription active if not expired.
 *
 * Returns None if there's no subscription at all.
 * Returns Some(u64) for their unix expiration timestamp, which may be in the
 * past or in the future, depending on whether or not it is currently active.
 * @returns {Promise<bigint | undefined>}
 */
// export async function check_subscribed(): Promise<bigint | undefined> {
//   const subscribed = await wallet!.check_subscribed()
//   return subscribed
// }

/**
 * Stops all of the nodes and background processes.
 * Returns after node has been stopped.
 * @returns {Promise<void>}
 */
export async function stop(): Promise<void> {
  await wallet!.stop()
}

/**
 * Clears storage and deletes all data.
 *
 * All data in VSS persists but the device lock is cleared.
 * @returns {Promise<void>}
 */
export async function delete_all(): Promise<void> {
  await wallet!.delete_all()
}

/**
 * Gets the current bitcoin price in chosen Fiat.
 * @param {string | undefined} [fiat]
 * @returns {Promise<number>}
 */
export async function get_bitcoin_price(fiat: string): Promise<number> {
  const price = await wallet!.get_bitcoin_price(fiat)
  return price
}

// export async function get_tag_items(): Promise<TagItem[]> {
//   const tagItems = await wallet!.get_tag_items()
//   return tagItems
// }

/**
 * Returns the network of the wallet.
 * @returns {string}
 */
export async function get_network(): Promise<string> {
  const network = await wallet!.get_network()
  return network || 'signet'
}

/**
 * Returns all the on-chain and lightning activity from the wallet.
 * @param {number | undefined} [limit]
 * @param {number | undefined} [offset]
 */
// export async function get_activity(
//   limit: number,
//   offset?: number
// ): Promise<any[]> {
//   const activity = await wallet!.get_activity(limit, offset)
//   return activity
// }

// export async function get_contact_for_npub(
//   npub: string
// ): Promise<TagItem | undefined> {
//   const contact = await wallet!.get_contact_for_npub(npub)
//   if (!contact) return undefined
//   return { ...contact?.value }
// }

// export async function get_tag_item(id: string): Promise<TagItem | undefined> {
//   const tagItem = await wallet!.get_tag_item(id)
//   if (!tagItem) return undefined
//   return { ...tagItem?.value }
// }

/**
 * Returns all the on-chain and lightning activity for a given label
 * @param {string} label
 * @returns {Promise<any>}
 */
// export async function get_label_activity(label: string): Promise<any[]> {
//   const activity = await wallet!.get_label_activity(label)
//   return activity
// }

/**
 * Gets an invoice from the node manager.
 * This includes sent and received invoices.
 * @param {string} invoice
 * @returns {Promise<MutinyInvoice>}
 */
export async function get_invoice(
  bolt11: string
): Promise<MutinyInvoice | undefined> {
  const invoice = await wallet!.get_invoice(bolt11)
  if (!invoice) return undefined
  // For some reason {...invoice } doesn't bring across the paid field
  return destructureInvoice(invoice)
}

/**
 * Exports the current state of the node manager to a json object.
 * @returns {Promise<string[]>}
 */
export async function get_logs(): Promise<string[]> {
  const logs: string[] = await MutinyWallet.get_logs()
  return logs
}

/**
 * Sends a DM to the given npub
 * @param {string} npub
 * @param {string} message
 * @returns {Promise<string>}
 */
// export async function send_dm(
//   npub: string,
//   message: string
// ): Promise<string | undefined> {
//   const result = await wallet!.send_dm(npub, message)
//   return result
// }

/**
 * Returns the user's npub
 * @returns {Promise<string>}
 */
// export async function get_npub(): Promise<string | undefined> {
//   const npub = await wallet!.get_npub()
//   return npub
// }

/**
 * Decodes a lightning invoice into useful information.
 * Will return an error if the invoice is for a different network.
 * @param {string} invoice
 * @param {string | undefined} [network]
 * @returns {Promise<MutinyInvoice>}
 */
export async function decode_invoice(
  invoice: string,
  network?: string
): Promise<MutinyInvoice | undefined> {
  const decoded = await wallet!.decode_invoice(invoice, network)
  if (!decoded) return undefined
  return destructureInvoice(decoded)
}

/**
 * Creates a BIP 21 invoice. This creates a new address and a lightning invoice.
 * The lightning invoice may return errors related to the LSP. Check the error and
 * fallback to `get_new_address` and warn the user that Lightning is not available.
 *
 *
 * Errors that might be returned include:
 *
 * - [`MutinyJsError::LspGenericError`]: This is returned for various reasons, including if a
 *   request to the LSP server fails for any reason, or if the server returns
 *   a status other than 500 that can't be parsed into a `ProposalResponse`.
 *
 * - [`MutinyJsError::LspFundingError`]: Returned if the LSP server returns an error with
 *   a status of 500, indicating an "Internal Server Error", and a message
 *   stating "Cannot fund new channel at this time". This means that the LSP cannot support
 *   a new channel at this time.
 *
 * - [`MutinyJsError::LspAmountTooHighError`]: Returned if the LSP server returns an error with
 *   a status of 500, indicating an "Internal Server Error", and a message stating "Invoice
 *   amount is too high". This means that the LSP cannot support the amount that the user
 *   requested. The user should request a smaller amount from the LSP.
 *
 * - [`MutinyJsError::LspConnectionError`]: Returned if the LSP server returns an error with
 *   a status of 500, indicating an "Internal Server Error", and a message that starts with
 *   "Failed to connect to peer". This means that the LSP is not connected to our node.
 *
 * If the server returns a status of 500 with a different error message,
 * a [`MutinyJsError::LspGenericError`] is returned.
 * @param {bigint | undefined} amount
 * @param {(string)[]} labels
 * @returns {Promise<MutinyBip21RawMaterials>}
 */
export async function create_bip21(
  amount: bigint | undefined,
  labels: string[]
): Promise<MutinyBip21RawMaterials> {
  const mbrw = await wallet!.create_bip21(amount, labels)
  return {
    ...mbrw?.value,
  } as MutinyBip21RawMaterials
}

/**
 * Creates a lightning invoice. The amount should be in satoshis.
 * If no amount is provided, the invoice will be created with no amount.
 * If no description is provided, the invoice will be created with no description.
 *
 * If the manager has more than one node it will create a phantom invoice.
 * If there is only one node it will create an invoice just for that node.
 * @param {bigint} amount
 * @param {(string)[]} labels
 * @returns {Promise<MutinyInvoice>}
 */
export async function create_invoice(
  amount: bigint,
  label: string,
  expiry_delta_secs?: number
): Promise<MutinyInvoice | undefined> {
  const invoice = await wallet!.create_invoice(amount, label, expiry_delta_secs)
  if (!invoice) return undefined
  return destructureInvoice(invoice)
}

/**
 * Estimates the onchain fee for a transaction sending to the given address.
 * The amount is in satoshis and the fee rate is in sat/vbyte.
 * @param {string} destination_address
 * @param {bigint} amount
 * @param {number | undefined} [fee_rate]
 * @returns {bigint}
 */
// export async function estimate_tx_fee(
//   address: string,
//   amount: bigint,
//   feeRate?: number
// ): Promise<bigint | undefined> {
//   const fee = await wallet!.estimate_tx_fee(address, amount, feeRate)
//   return fee
// }

/**
 * Calls upon a LNURL to get the parameters for it.
 * This contains what kind of LNURL it is (pay, withdrawal, auth, etc).
 * @param {string} lnurl
 * @returns {Promise<LnUrlParams>}
 */
// export async function decode_lnurl(lnurl: string): Promise<LnUrlParams> {
//   const lnurlParams = await wallet!.decode_lnurl(lnurl)
//   // PAIN: this is supposed to be returning bigints, but it returns numbers instead
//   return {
//     ...lnurlParams?.value,
//   } as LnUrlParams
// }

/**
 * Pays a lightning invoice from the selected node.
 * An amount should only be provided if the invoice does not have an amount.
 * The amount should be in satoshis.
 * @param {string} invoice_str
 * @param {bigint | undefined} amt_sats
 * @param {(string)[]} labels
 * @returns {Promise<MutinyInvoice>}
 */
export async function pay_invoice(
  invoice_str: string,
  amt_sats: bigint | undefined,
  labels: string[]
): Promise<MutinyInvoice | undefined> {
  const invoice = await wallet!.pay_invoice(invoice_str, amt_sats, labels)
  if (!invoice) return undefined
  return destructureInvoice(invoice)
}

/**
 * Calls upon a LNURL and pays it.
 * This will fail if the LNURL is not a LNURL pay.
 * @param {string} lnurl
 * @param {bigint} amount_sats
 * @param {string | undefined} zap_npub
 * @param {(string)[]} labels
 * @param {string | undefined} [comment]
 * @param {string | undefined} [privacy_level]
 * @returns {Promise<MutinyInvoice>}
 */
// export async function lnurl_pay(
//   lnurl: string,
//   amount_sats: bigint,
//   zap_npub: string | undefined,
//   labels: string[],
//   comment?: string,
//   privacy_level?: string
// ): Promise<MutinyInvoice | undefined> {
//   const invoice = await wallet!.lnurl_pay(
//     lnurl,
//     amount_sats,
//     zap_npub,
//     labels,
//     comment,
//     privacy_level
//   )
//   if (!invoice) return undefined
//   return destructureInvoice(invoice)
// }

// export async function send_payjoin(
//   payjoin_uri: string,
//   amount: bigint,
//   labels: string[],
//   fee_rate?: number
// ): Promise<string | undefined> {
//   const payment = await wallet!.send_payjoin(
//     payjoin_uri,
//     amount,
//     labels,
//     fee_rate
//   )
//   return payment
// }

/**
 * Sends an on-chain transaction to the given address.
 * The amount is in satoshis and the fee rate is in sat/vbyte.
 *
 * If a fee rate is not provided, one will be used from the fee estimator.
 * @param {string} destination_address
 * @param {bigint} amount
 * @param {(string)[]} labels
 * @param {number | undefined} [fee_rate]
 * @returns {Promise<string>}
 */
// export async function send_to_address(
//   destination_address: string,
//   amount: bigint,
//   labels: string[],
//   fee_rate?: number
// ): Promise<string | undefined> {
//   const payment = await wallet!.send_to_address(
//     destination_address,
//     amount,
//     labels,
//     fee_rate
//   )
//   return payment
// }

/**
 * Sends a spontaneous payment to a node from the selected node.
 * The amount should be in satoshis.
 * @param {string} to_node
 * @param {bigint} amt_sats
 * @param {string | undefined} message
 * @param {(string)[]} labels
 * @returns {Promise<MutinyInvoice>}
 */
export async function keysend(
  to_node: string,
  amt_sats: bigint,
  message: string | undefined,
  labels: string[]
): Promise<MutinyInvoice | undefined> {
  const invoice = await wallet!.keysend(to_node, amt_sats, message, labels)
  if (!invoice) return undefined
  return destructureInvoice(invoice)
}

/**
 * Gets an invoice from the node manager.
 * This includes sent and received invoices.
 * @param {string} hash
 * @returns {Promise<MutinyInvoice>}
 */
export async function get_invoice_by_hash(
  hash: string
): Promise<MutinyInvoice> {
  const invoice = await wallet!.get_invoice_by_hash(hash)
  return destructureInvoice(invoice)
}

/**
 * Gets an channel closure from the node manager.
 * @param {string} user_channel_id
 * @returns {Promise<ChannelClosure>}
 */
export async function get_channel_closure(
  user_channel_id: string
): Promise<ChannelClosure> {
  const channel_closure = await wallet!.get_channel_closure(user_channel_id)
  return {
    channel_id: channel_closure.channel_id,
    node_id: channel_closure.node_id,
    reason: channel_closure.reason,
    timestamp: channel_closure.timestamp,
  } as ChannelClosure
}

/**
 * Gets an channel closure from the node manager.
 * @returns {Promise<ChannelClosure[]>}
 */
export async function list_channel_closures(): Promise<ChannelClosure[]> {
  const channel_closures = await wallet!.list_channel_closures()
  return channel_closures.map(
    (closure: any) =>
      ({
        channel_id: closure.channel_id,
        node_id: closure.node_id,
        reason: closure.reason,
        timestamp: closure.timestamp,
        channel_funding_txo: closure.channel_funding_txo,
      }) as ChannelClosure
  )
}

/**
 * Gets the details of a specific on-chain transaction.
 * @param {string} txid
 * @returns {any}
 */
// export async function get_transaction(txid: string): Promise<ActivityItem> {
//   // TODO: this is an ActivityItem right?
//   const transaction = await wallet!.get_transaction(txid)
//   return transaction as ActivityItem
// }

/**
 * Gets a new bitcoin address from the wallet.
 * Will generate a new address on every call.
 *
 * It is recommended to create a new address for every transaction.
 * @param {(string)[]} labels
 * @returns {MutinyBip21RawMaterials}
 */
export async function get_new_address(
  labels: string[]
): Promise<MutinyBip21RawMaterials> {
  const mbrw = await wallet!.get_new_address(labels)
  return {
    ...mbrw?.value,
  } as MutinyBip21RawMaterials
}

/**
 * Checks if the given address has any transactions.
 * If it does, it returns the details of the first transaction.
 *
 * This should be used to check if a payment has been made to an address.
 * @param {string} address
 * @returns {Promise<any>}
 */
export async function check_address(address: string): Promise<any> {
  const tx = await wallet!.check_address(address)
  return tx as any
}

/**
 * Lists all the channels for all the nodes in the node manager.
 * @returns {Promise<any>}
 */
export async function list_channels(): Promise<MutinyChannel[]> {
  const channels = await wallet!.list_channels()
  return channels
}

/**
 * Get the outpoints of all the channels in the node manager.
 * The return is a combined string of all outpoints as the following format: `txid[:20]:vout,txid[:20]:vout,...`.
 * @returns {Promise<string>}
 */
export async function get_channel_outpoints_short_string(): Promise<string> {
  const channels = await list_channels()
  return channels
    .map((channel) => {
      const [txid, vout] = channel.outpoint!.split(':')
      return `${txid.slice(0, 20)}:${vout}`
    })
    .join(',')
}

/**
 * This should only be called when the user is setting up a new profile
 * never for an existing profile
 * @param {string | undefined} [name]
 * @param {string | undefined} [img_url]
 * @param {string | undefined} [lnurl]
 * @param {string | undefined} [nip05]
 * @returns {Promise<any>}
 */
// export async function setup_new_profile(
//   name?: string,
//   img_url?: string,
//   lnurl?: string,
//   nip05?: string
// ): Promise<unknown> {
//   const profile = await wallet!.setup_new_profile(name, img_url, lnurl, nip05)
//   return profile
// }

/**
 * Approves an invoice and sends the payment
 * @param {string} hash
 * @returns {Promise<void>}
 */
// export async function approve_invoice(hash: string): Promise<void> {
//   await wallet!.approve_invoice(hash)
// }

// /**
//  * Removes an invoice from the pending list, will also remove expired invoices
//  * @param {string} hash
//  * @returns {Promise<void>}
//  */
// export async function deny_invoice(hash: string): Promise<void> {
//   await wallet!.deny_invoice(hash)
// }

/**
 * Disconnects from a peer from the selected node.
 * @param {string} peer
 * @returns {Promise<void>}
 */
export async function disconnect_peer(pubkey: string): Promise<void> {
  await wallet!.disconnect_peer(pubkey)
}

/**
 * Deletes a peer from the selected node.
 * This will make it so that the node will not attempt to
 * reconnect to the peer.
 * @param {string} peer
 * @returns {Promise<void>}
 */
export async function delete_peer(pubkey: string): Promise<void> {
  await wallet!.delete_peer(pubkey)
}

/**
 * Lists all the peers for all the nodes in the node manager.
 * @returns {Promise<any>}
 */
export async function list_peers(): Promise<MutinyPeer[]> {
  return wallet!.list_peers()
}

/**
 * Attempts to connect to a peer from the selected node.
 * @param {string} connection_string
 * @param {string | undefined} [label]
 * @returns {Promise<void>}
 */
export async function connect_to_peer(
  connection_string: string
): Promise<void> {
  await wallet!.connect_to_peer(connection_string)
}

/**
 * Closes a channel with the given outpoint.
 *
 * If force is true, the channel will be force closed.
 *
 * If abandon is true, the channel will be abandoned.
 * This will force close without broadcasting the latest transaction.
 * This should only be used if the channel will never actually be opened.
 *
 * If both force and abandon are true, an error will be returned.
 * @param {string} outpoint The BTC transaction outpoint of opening channel
 * @param {boolean} force
 * @param {boolean} abandon
 * @param {string} address The mutiny node return address to receive satoshi from channel
 * @param {string} network: The Bitcoin network which includes "bitcoin", "testnet", "signet" and "regtest"
 * @returns {Promise<void>}
 */
export async function close_channel(
  outpoint: string,
  force: boolean,
  abandon: boolean,
  address?: string,
  network?: string,
  feeRatePerKw?: number
): Promise<void> {
  await wallet!.close_channel(
    outpoint,
    force,
    abandon,
    address,
    network,
    feeRatePerKw
  )
}

/**
 * Opens a channel from our selected node to the given pubkey.
 * The amount is in satoshis.
 *
 * The node must be online and have a connection to the peer.
 * The wallet much have enough funds to open the channel.
 * @param {string | undefined} to_pubkey
 * @param {bigint} amount
 * @param {number | undefined} [fee_rate]
 * @returns {Promise<MutinyChannel>}
 */
export async function open_channel(
  to_pubkey: string | undefined,
  amount: bigint
): Promise<MutinyChannel> {
  const channel = await wallet!.open_channel(to_pubkey, amount)
  return { ...channel.value } as MutinyChannel
}

/**
 * Lists the pubkeys of the lightning node in the manager.
 * @returns {Promise<any>}
 */
export async function list_nodes(): Promise<string[]> {
  return await wallet!.list_nodes()
}

/**
 * Changes all the node's LSPs to the given config. If any of the nodes have an active channel with the
 * current LSP, it will fail to change the LSP.
 *
 * Requires a restart of the node manager to take effect.
 * @param {string | undefined} [lsp_url]
 * @param {string | undefined} [lsp_connection_string]
 * @param {string | undefined} [lsp_token]
 * @returns {Promise<void>}
 */
export async function change_lsp(
  lsp_url?: string,
  lsp_connection_string?: string,
  lsps_token?: string
): Promise<void> {
  await wallet!.change_lsp(lsp_url, lsp_connection_string, lsps_token)
}

type LspConfig = {
  url?: string
  connection_string?: string
  token?: string
}

/**
 * Returns the configured LSP for the node manager.
 *
 * @returns {Promise<LspConfig>}
 */
export async function get_configured_lsp(): Promise<LspConfig> {
  return await wallet!.get_configured_lsp()
}

/**
 * Resets BDK's keychain tracker. This will require a re-sync of the blockchain.
 *
 * This can be useful if you get stuck in a bad state.
 * @returns {Promise<void>}
 */
export async function reset_onchain_tracker(): Promise<void> {
  await wallet!.reset_onchain_tracker()
}

/**
 * Starts up all the nodes again.
 * Not needed after [NodeManager]'s `new()` function.
 * @returns {Promise<void>}
 */
export async function start(): Promise<void> {
  await wallet!.start()
}

/**
 * Sweeps all the funds from the wallet to the given address.
 * The fee rate is in sat/vbyte.
 *
 * If a fee rate is not provided, one will be used from the fee estimator.
 * @param {string} destination_address
 * @param {(string)[]} labels
 * @param {bigint | undefined} [fee_rate]
 * @returns {Promise<string>}
 */
export async function sweep_wallet(
  destination_address: string,
  labels: string[],
  fee_rate?: bigint
): Promise<string | undefined> {
  const payment = await wallet!.sweep_wallet(
    destination_address,
    labels,
    fee_rate
  )
  return payment
}

/**
 * Authenticates with a LNURL-auth for the given profile.
 * @param {string} lnurl
 * @returns {Promise<void>}
 */
// export async function lnurl_auth(lnurl: string): Promise<void> {
//   // TODO: test auth
//   await wallet!.lnurl_auth(lnurl)
// }

// type PlanDetails = {
//   id: number
//   amount_sat: bigint
// }

/**
 * Gets the subscription plans for Mutiny+ subscriptions
 * @returns {Promise<any>}
 */
// export async function get_subscription_plans(): Promise<PlanDetails[]> {
//   return await wallet!.get_subscription_plans()
// }

/**
 * Subscribes to a Mutiny+ plan with a specific plan id.
 *
 * Returns a lightning invoice so that the plan can be paid for to start it.
 * @param {number} id
 * @returns {Promise<MutinyInvoice>}
 */
// export async function subscribe_to_plan(id: number): Promise<MutinyInvoice> {
//   const invoice = await wallet!.subscribe_to_plan(id)
//   return destructureInvoice(invoice)
// }

/**
 * Pay the subscription invoice. This will post a NWC automatically afterwards.
 * @param {string} invoice_str
 * @param {boolean} autopay
 * @returns {Promise<void>}
 */
// export async function pay_subscription_invoice(
//   invoice_str: string,
//   autopay: boolean
// ): Promise<void> {
//   await wallet!.pay_subscription_invoice(invoice_str, autopay)
// }

/**
 * Returns the mnemonic seed phrase for the wallet.
 * @returns {string}
 */
export async function show_seed(): Promise<string> {
  return await wallet!.show_seed()
}

/**
 * Calls upon a LNURL and withdraws from it.
 * This will fail if the LNURL is not a LNURL withdrawal.
 * @param {string} lnurl
 * @param {bigint} amount_sats
 * @returns {Promise<boolean>}
 */
// export async function lnurl_withdraw(
//   lnurl: string,
//   amount_sats: bigint
// ): Promise<boolean> {
//   return await wallet!.lnurl_withdraw(lnurl, amount_sats)
// }

/**
 * Checks the registered username for the user
 * @returns {Promise<string | undefined>}
 */
// export async function check_lnurl_name(): Promise<string | undefined> {
//   return await wallet!.check_lnurl_name()
// }

/**
 * Checks if a given LNURL name is available
 * @param {string} name
 * @returns {Promise<boolean>}
 */
// export async function check_available_lnurl_name(
//   name: string
// ): Promise<boolean> {
//   return await wallet!.check_available_lnurl_name(name)
// }

/**
 * Reserves a given LNURL name for the user
 * @param {string} name
 * @returns {Promise<void>}
 */
// export async function reserve_lnurl_name(name: string): Promise<void> {
//   return await wallet!.reserve_lnurl_name(name)
// }

export async function change_password(
  old_password?: string,
  new_password?: string
): Promise<void> {
  await wallet!.change_password(old_password, new_password)
}

/**
 * Converts a satoshi amount to BTC.
 * @param {bigint} sats
 * @returns {number}
 */
export async function convert_sats_to_btc(sats: bigint): Promise<number> {
  return await MutinyWallet.convert_sats_to_btc(sats)
}

/**
 * Converts a bitcoin amount in BTC to satoshis.
 * @param {number} btc
 * @returns {bigint}
 */
export async function convert_btc_to_sats(btc: number): Promise<bigint> {
  return await MutinyWallet.convert_btc_to_sats(btc)
}

/**
 * Returns if there is a saved wallet in storage.
 * This is checked by seeing if a mnemonic seed exists in storage.
 * @returns {Promise<boolean>}
 */
export async function has_node_manager(): Promise<boolean> {
  return await MutinyWallet.has_node_manager()
}

/**
 * Convert an npub string to a hex string
 * @param {string} npub
 * @returns {Promise<string>}
 */
// export async function npub_to_hexpub(npub: string): Promise<string> {
//   return await MutinyWallet.npub_to_hexpub(npub)
// }

/**
 * Convert an npub string to a hex string
 * @param {string} nsec
 * @returns {Promise<string>}
 */
// export async function nsec_to_npub(nsec: string): Promise<string> {
//   return await MutinyWallet.nsec_to_npub(nsec)
// }

/**
 * Convert an hex string to a npub string
 * @param {string} npub
 * @returns {Promise<string>}
 */
// export async function hexpub_to_npub(hexpub: string): Promise<string> {
//   // TODO: the argument is called "npub" but it's actually a hexpub?
//   return await MutinyWallet.hexpub_to_npub(hexpub)
// }

/**
 * Restore's the mnemonic after deleting the previous state.
 *
 * Backup the state beforehand. Does not restore lightning data.
 * Should refresh or restart afterwards. Wallet should be stopped.
 * @param {string} m
 * @param {string | undefined} [password]
 * @returns {Promise<void>}
 */
export async function restore_mnemonic(
  mnemonic: string,
  password?: string
): Promise<void> {
  await MutinyWallet.restore_mnemonic(mnemonic, password)
}

/**
 * Restore a node manager from a json object.
 * @param {string} json
 * @returns {Promise<void>}
 */
export async function import_json(json: string): Promise<void> {
  await MutinyWallet.import_json(json)
}

/**
 * Exports the current state of the node manager to a json object.
 * @param {string | undefined} [password]
 * @returns {Promise<string>}
 */
export async function export_json(password?: string): Promise<string> {
  return await MutinyWallet.export_json(password)
}

/**
 * Exports the current state of the node manager to a json object.
 * @returns {Promise<any>}
 */
export async function get_infos(): Promise<string[]> {
  // @ts-expect-error
  return await MutinyWallet.get_infos()
}

export async function encrypt_mnemonic(mnemonic: string, password: string) {
  return MutinyWallet.encrypt_mnemonic(mnemonic, password)
}

export async function decrypt_mnemonic(encrypted: string, password: string) {
  return MutinyWallet.decrypt_mnemonic(encrypted, password)
}

/**
 * Returns the number of remaining seconds until the device lock expires.
 */
export async function get_device_lock_remaining_secs(
  password?: string,
  auth_url?: string,
  storage_url?: string
): Promise<bigint | undefined> {
  return await MutinyWallet.get_device_lock_remaining_secs(
    password,
    auth_url,
    storage_url
  )
}

/**
 * Estimates the onchain fee for sweeping our on-chain balance to open a lightning channel.
 * The fee rate is in sat/vbyte.
 * @param {bigint | undefined} [fee_rate]
 * @returns {bigint}
 */
export async function estimate_sweep_channel_open_fee(
  fee_rate?: bigint | undefined
): Promise<bigint> {
  return await wallet!.estimate_sweep_channel_open_fee(fee_rate)
}

export async function estimate_ln_fee(invoice: string, amount?: bigint) {
  return await wallet!.estimate_ln_fee(invoice, amount)
}

/**
 * Change LSP and restart Lightning Node
 *
 * If change_lsp occurs error(check if any nodes have active channels with the current LSP),
 * stop and start for LN will be ignore and it has no affect for LN.
 * @param {string} lspUrl
 * @returns {Promise<void>}
 */
export async function change_lsp_and_restart(lspUrl: string): Promise<void> {
  await change_lsp(lspUrl)
  await stop()
  await start()
}

// export async function parse_params(params: string): Promise<PaymentParams> {
//   const paramsResult = await new PaymentParams(params)
//   // PAIN just another object rebuild
//   return {
//     address: paramsResult.address,
//     amount_msats: paramsResult.amount_msats,
//     amount_sats: paramsResult.amount_sats,
//     cashu_token: paramsResult.cashu_token,
//     disable_output_substitution: paramsResult.disable_output_substitution,
//     fedimint_invite_code: paramsResult.fedimint_invite_code,
//     fedimint_oob_notes: paramsResult.fedimint_oob_notes,
//     invoice: paramsResult.invoice,
//     is_lnurl_auth: paramsResult.is_lnurl_auth,
//     lightning_address: paramsResult.lightning_address,
//     lnurl: paramsResult.lnurl,
//     memo: paramsResult.memo,
//     network: paramsResult.network,
//     node_pubkey: paramsResult.node_pubkey,
//     nostr_pubkey: paramsResult.nostr_pubkey,
//     nostr_wallet_auth: paramsResult.nostr_wallet_auth,
//     offer: paramsResult.offer,
//     payjoin_endpoint: paramsResult.payjoin_endpoint,
//     payjoin_supported: paramsResult.payjoin_supported,
//     refund: paramsResult.refund,
//     string: paramsResult.string,
//   } as PaymentParams
// }
