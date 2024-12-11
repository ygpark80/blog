const packageManagers = [
	// "yarn",
	// "yarn_berry",
	"npm",
	"pnpm"
]

let error = false
for (const packageManager of packageManagers) {
	try { await $`rm -rf dist/${packageManager}` } catch { }
	await $`mkdir -p dist/${packageManager}`
	cd(`dist/${packageManager}`)

	console.info(`[${packageManager}] running...`)

	const runtime = packageManager === "yarn_berry" ? "yarn" : packageManager
	if (packageManager === "yarn") {
		await $`yarn set version classic`
		await $`yarn -v`
		await $`rm package.json`
	}
	await $`npx -p @tsed/cli tsed init --features swagger,testing,vitest --package-manager ${packageManager} -s .`

	await $({ quiet: true })`${runtime} run build`

	const packageJson = await fs.readJson("./package.json")
	packageJson.scripts.test = `${runtime} run test:coverage`
	await fs.writeJson("./package.json", packageJson, { spaces: 2, EOL: "\n" })

	const specFile = await fs.readFile("src/Server.integration.spec.ts", "utf8")
	const updatedContent = specFile.replace(
		'import { PlatformTest } from "@tsed/platform-http";',
		'import { PlatformTest } from "@tsed/platform-http/testing";'
	)
	await fs.writeFile("src/Server.integration.spec.ts", updatedContent)

	try {
		const p = await $({ quiet: true })`${runtime} run test`
		console.info(`[${packageManager}] ${p.exitCode === 0 ? "success" : "failed"}`)
		if (p.exitCode !== 0) {
			console.error(chalk.bold.red(p.stderr))
			error = true
		}
	} catch (e) {
		console.info(`[${packageManager}] failed`)
		echo(chalk.bold.red(e.stderr))
		error = true
	}

	cd("../..")
}

if (error) {
	console.error(chalk.bold.blue("Some tests failed"))
	process.exit(1)
}
