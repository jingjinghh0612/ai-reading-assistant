import dotenv from 'dotenv'
import path from 'node:path'

let hasLoadedProcessEnv = false

export function loadEnv(options = {}) {
  const cwd = options.cwd || process.cwd()
  const env = options.env || process.env
  const force = Boolean(options.force)

  if (env === process.env && hasLoadedProcessEnv && !force) {
    return
  }

  for (const fileName of ['.env.local', '.env']) {
    dotenv.config({
      path: path.join(cwd, fileName),
      processEnv: env,
      override: false,
      quiet: true,
    })
  }

  if (env === process.env) {
    hasLoadedProcessEnv = true
  }
}

loadEnv()
