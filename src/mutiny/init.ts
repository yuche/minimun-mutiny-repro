import { getSettings } from './settings'

export const createWorker = async () => {
  const worker = new ComlinkWorker<typeof import('./worker')>(
    new URL('./worker', import.meta.url),
    {
      type: 'module',
    }
  )

  await worker.initializeWasm()

  return worker
}

const mnemonic = 'ginger paper cattle labor prize suit alert blue bronze tongue opera bind easy wrist express relax trophy vapor helmet title helmet pulse base robust'

const password = '17f0007d273dbcdf89168cc8d7069308'

const connectionString = '023d07a5d8f6ac4d736146797f07c0dd7f597e4e7f0dd8f39460f8190a5f0e6647@34.195.113.42:39735'

export const init = async () => {
  const worker = await createWorker()
  const settings = getSettings()
  await worker.setupMutinyWallet(settings, mnemonic, password, undefined, undefined, false)
  await worker.connect_to_peer(connectionString)
  return worker
}