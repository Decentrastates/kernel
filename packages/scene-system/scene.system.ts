import { WebWorkerTransport } from 'decentraland-rpc'
import { inject } from 'decentraland-rpc/lib/client/Script'
import { defaultLogger } from 'shared/logger'
import { RunOptions, SceneRuntime } from './sdk/SceneRuntime'
import { DevToolsAdapter } from './sdk/DevToolsAdapter'
import { customEval, getES5Context } from './sdk/sandbox'
import { ScriptingTransport } from 'decentraland-rpc/lib/common/json-rpc/types'

import { run as runWasm } from '@dcl/wasm-runtime'
import { rendererAdapter } from './sdk/RendererAdapter'
import { DecentralandInterface } from 'decentraland-ecs'

/**
 * This file starts the scene in a WebWorker context.
 */

class WebWorkerScene extends SceneRuntime {
  @inject('DevTools')
  devTools: any

  devToolsAdapter?: DevToolsAdapter

  updateEnabled: boolean = true

  constructor(transport: ScriptingTransport) {
    super(transport)

    addEventListener('error', (e) => {
      console.warn('🚨🚨🚨 Unhandled error in scene code. Disabling worker update loop 🚨🚨🚨')
      console.error(e)
      this.updateEnabled = false
      eval('debu' + 'gger')
      e.preventDefault() // <-- "Hey browser, I handled it!"
      if (this.devToolsAdapter) this.devToolsAdapter.error(e.error)
    })
  }

  async run({ sourceResponse, isWasmScene, dcl }: RunOptions): Promise<void> {
    if (!isWasmScene) {
      await customEval(await sourceResponse.text(), getES5Context({ dcl }))
    } else {
      const wasmBytes = new Uint8Array(await sourceResponse.arrayBuffer())
      this.runWasm({ wasmBytes, dcl })
    }
  }

  private async runWasm({ wasmBytes, dcl }: { wasmBytes: Uint8Array; dcl: DecentralandInterface }) {
    const result = await runWasm({ wasmBytes })
    debugger
    await result.start()
    await result.sendCommand(`set_fd RENDERER ${result.metaverseWrapper.fdRendererInput}`)
    await result.sendCommand(`set_fd DEBUG_IN ${result.metaverseWrapper.fdSceneDebuggerInput}`)
    await result.sendCommand(`set_fd DEBUG_OUT ${result.metaverseWrapper.fdSceneDebuggerOutput}`)

    this.onUpdateFunctions.push(async (dt: number) => {
      result.update(dt)
      const resultOut = await result.metaverseWrapper.wasmFs.getStdOut()
      if (resultOut) {
        console.log(resultOut)
        await result.metaverseWrapper.wasmFs.fs.writeFileSync('/dev/stdout', '')
      }
    })

    let entities: Set<number>[] = []
    let components: any[] = []

    const { bufferReader } = rendererAdapter({ entities, components, dcl })

    result.metaverseWrapper.setRendererCallback((args: any[]) => {
      if (args.length > 0) {
        const buf = args[0]
        if (buf instanceof Uint8Array) {
          bufferReader(Buffer.from(buf))
        } else {
          // invalid write call
        }
      } else {
        // invalid write call
      }
    })

    result.metaverseWrapper.setDebuggerOutputCallback((args: any[]) => {
      if (args.length == 4){
        // args[0] UInt8Array
        // args[2] length
      }
    })
    result.metaverseWrapper.setDebuggerInputCallback((args: any[]) => {
      console.log('debugger input', args)
      if (args.length == 4){
        // args[0] UInt8Array
        // args[2] length
      }
    })
  }

  async systemDidEnable() {
    this.devToolsAdapter = new DevToolsAdapter(this.devTools)
    await super.systemDidEnable()
  }

  onError(error: Error) {
    if (this.devToolsAdapter) {
      this.devToolsAdapter.error(error)
    } else {
      defaultLogger.error('', error)
    }
  }

  onLog(...messages: any[]) {
    if (this.devToolsAdapter) {
      this.devToolsAdapter.log(...messages)
    } else {
      defaultLogger.info('', ...messages)
    }
  }

  startLoop() {
    let start = performance.now()

    const update = () => {
      if (!this.updateEnabled) return

      const now = performance.now()
      const dt = now - start
      start = now

      setTimeout(update, this.updateInterval)

      let time = dt / 1000

      this.update(time)
    }

    update()
  }
}

// tslint:disable-next-line
new WebWorkerScene(WebWorkerTransport(self))
