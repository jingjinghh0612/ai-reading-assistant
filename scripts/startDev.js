import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'

export function getNpmCommand(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm'
}

export function createProcessSpecs(npmCommand = getNpmCommand()) {
  return [
    {
      name: 'server',
      command: npmCommand,
      args: ['run', 'server'],
    },
    {
      name: 'vite',
      command: npmCommand,
      args: ['run', 'dev'],
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
