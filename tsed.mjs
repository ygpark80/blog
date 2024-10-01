await $`rm -rf myproject`
await $`mkdir myproject`
cd("myproject")

await $`npx -p @tsed/cli tsed init --features swagger,testing,jest -s .`

await $`yarn build`

const packageJson = await fs.readJson("./package.json")
packageJson.scripts.test = "yarn run test:coverage"
await fs.writeJson("./package.json", packageJson, { spaces: 2, EOL: "\n" })

await $`yarn test --coverageThreshold '{}'`
