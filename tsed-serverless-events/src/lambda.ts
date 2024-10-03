import { PlatformBuilder } from "@tsed/common"
import { PlatformExpress } from "@tsed/platform-express"
import { PlatformServerlessHttp } from "@tsed/platform-serverless-http"
import { Handler } from "aws-lambda"

let platform: PlatformBuilder & {
	handler(): Handler
}
export async function bootstrap() {
	if (platform) return platform

	return (platform = PlatformServerlessHttp.bootstrap((await import("./Server")).Server, {
		adapter: PlatformExpress
	}))
}

export const handler: Handler = async (event, context, callback) => {
	await bootstrap()
	return platform.handler()(event, context, callback)
}
