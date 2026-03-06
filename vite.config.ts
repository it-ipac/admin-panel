import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function safeGit(command: string): string {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
  } catch {
    return ''
  }
}

function getPackageVersion(): string {
  try {
    const packageJsonRaw = readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8')
    const packageJson = JSON.parse(packageJsonRaw) as { version?: string }
    return packageJson.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const packageVersion = process.env.VITE_APP_VERSION || getPackageVersion()
const commitSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  safeGit('git rev-parse HEAD')
const commitMessage =
  process.env.VERCEL_GIT_COMMIT_MESSAGE ||
  process.env.VITE_RELEASE_FEATURES ||
  safeGit('git log -1 --pretty=%s')
const deployedAt = process.env.VERCEL_GIT_COMMIT_DATE || new Date().toISOString()

const releaseFeatures = process.env.VITE_RELEASE_FEATURES || commitMessage
const releaseType = process.env.VITE_RELEASE_TYPE || 'patch'

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageVersion),
    __APP_DEPLOYED_AT__: JSON.stringify(deployedAt),
    __APP_COMMIT_SHA__: JSON.stringify(commitSha),
    __APP_COMMIT_MESSAGE__: JSON.stringify(commitMessage),
    __APP_RELEASE_FEATURES__: JSON.stringify(releaseFeatures),
    __APP_RELEASE_TYPE__: JSON.stringify(releaseType),
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
