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

export class SQSProcessor {
	static handler<P>(process: (payload: P) => void | Promise<void>) {
		const handler: SQSHandler = async (event: SQSEvent) => {
			const region = event.Records[0]?.awsRegion
			const sqs = new SQSClient({ region })

			for (const record of event.Records) {
				try {
					const payload = JSON.parse(record.body) as P

					await process(payload)

					if (record.receiptHandle) {
						const [, accountId, queueName] = record.eventSourceARN.replace("arn:aws:sqs:", "").split(":")
						const QueueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`
						await sqs.send(
							new DeleteMessageCommand({
								QueueUrl,
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
