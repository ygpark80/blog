import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs"
import { PlatformBuilder, TokenProvider } from "@tsed/common"
import { SQSEvent, SQSHandler } from "aws-lambda"

import { bootstrap } from "../lambda"

export class Platform {
	private static loadedInjector = false

	static async get<T>(t: TokenProvider<T>) {
		const platform: PlatformBuilder = await bootstrap()
		if (Platform.loadedInjector) return platform.injector.get<T>(t)! // maybe I should cache this?

		await platform.loadInjector()
		Platform.loadedInjector = true
		return platform.injector.get<T>(t)!
	}
}

const sqs = new SQSClient({ region: "ap-southeast-2" })

export class SQSProcessor {
	static async handler<P>(process: (payload: P) => void): Promise<SQSHandler> {
		const handler: SQSHandler = async (event: SQSEvent) => {
			for (const record of event.Records) {
				try {
					const payload = JSON.parse(record.body) as P

					process(payload)

					if (record.receiptHandle) {
						await sqs.send(
							new DeleteMessageCommand({
								QueueUrl: record.eventSourceARN,
								ReceiptHandle: record.receiptHandle
							})
						)
					}
				} catch (error) {
					console.error("Error processing record", record, error)
				}
			}
		}
		return handler
	}
}
