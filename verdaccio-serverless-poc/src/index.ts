import { runServer } from "verdaccio"
import { Express } from "express"

const app: Express = await runServer("./config.yml")
app.listen(4873)

const SIG_EVENTS = ["beforeExit", "SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT", "SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"]
SIG_EVENTS.forEach(event => {
    process.on(event, () => {
        console.info(`\nReceived ${event} signal: closing verdaccio...`)
        process.exit(0)
    })
})
