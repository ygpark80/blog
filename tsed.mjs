try { await $`rm -rf dist/myproject` } catch {}
await $`mkdir -p dist/myproject`
cd("dist/myproject")

await $`npx -p @tsed/cli tsed init --features swagger,testing,vitest --package-manager pnpm -s .`

await $`pnpm run build`

const packageJson = await fs.readJson("./package.json")
packageJson.scripts.test = "pnpm run test:coverage"
await fs.writeJson("./package.json", packageJson, { spaces: 2, EOL: "\n" })

const specFile = await fs.readFile("src/Server.integration.spec.ts", "utf8")
const updatedContent = specFile.replace(
  'import { PlatformTest } from "@tsed/platform-http";',
  'import { PlatformTest } from "@tsed/platform-http/testing";'
)
await fs.writeFile("src/Server.integration.spec.ts", updatedContent)

await $`pnpm run test`
