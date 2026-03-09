import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'))

for (const [subpath, target] of Object.entries(packageJson.exports)) {
  if (!target || typeof target !== 'object') continue

  const importPath = resolve(projectRoot, target.import)
  const typesPath = resolve(projectRoot, target.types)

  if (!existsSync(importPath)) {
    throw new Error(`Missing import target for ${subpath}: ${target.import}`)
  }
  if (!existsSync(typesPath)) {
    throw new Error(`Missing types target for ${subpath}: ${target.types}`)
  }

  await import(pathToFileURL(importPath).href)
}

console.log(
  `Verified ${Object.keys(packageJson.exports).length} package exports against dist artifacts.`
)
