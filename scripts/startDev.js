import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)

export function createProcessSpecs() {
  const serverEntry = fileURLToPath(new URL('../server/index.js', import.meta.url))
  const viteEntry = join(dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')

  // Windows 上 spawn 无法直接执行 npm.cmd，因此用当前 Node 启动两个入口。
  return [
    {
      name: 'server',
      command: process.execPath,
      args: [serverEntry],
    },
    {
      name: 'vite',
      command: process.execPath,
      args: [viteEntry, '--configLoader', 'native'],
    },
  ]
}

export function startDevelopmentServices(specs = createProcessSpecs(), options = {}) {
  const cwd = options.cwd || process.cwd()
  const stdio = options.stdio || 'inherit'
  const children = []
  let isStopping = false

  function stopAll(signal = 'SIGTERM') {
    if (isStopping) {
      return
    }

    isStopping = true

    for (const child of children) {
      if (!child.killed && child.exitCode === null) {
        child.kill(signal)
      }
    }
  }

  for (const spec of specs) {
    const child = spawn(spec.command, spec.args, {
      cwd,
      stdio,
      shell: false,
    })

    children.push(child)

    child.on('error', (error) => {
      console.error(`[${spec.name}] failed to start: ${error.message}`)
      process.exitCode = 1
      stopAll()
    })

    child.on('exit', (code, signal) => {
      if (isStopping) {
        return
      }

      const reason = signal ? `signal ${signal}` : `code ${code}`
      console.error(`[${spec.name}] exited with ${reason}; stopping dev services.`)
      process.exitCode = code || 1
      stopAll()
    })
  }

  process.once('SIGINT', () => stopAll('SIGINT'))
  process.once('SIGTERM', () => stopAll('SIGTERM'))

  return {
    children,
    stop: stopAll,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startDevelopmentServices()
}
