import serverless from "serverless-http"
import type { Handler } from "aws-lambda"
import { Express } from "express"
import { runServer } from "verdaccio"

let app: Express
export const handler: Handler = async (event, context) => {
    if (!app) app = await runServer("./config.yml")
    const handler = serverless(app)
    return handler(event, context)
}
