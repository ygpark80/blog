# Using Ts.ED Framework to Handle Various AWS Lambda Events

I have been using the Ts.ED framework with AWS Lambda for some time now. Instead of separating code into multiple modules, I wanted to find a way to handle various AWS Lambda events within a single Ts.ED project. For internal APIs, creating an additional internal API Gateway felt like overkill. Since the Serverless Framework supports multiple [AWS Lambda Events](https://www.serverless.com/framework/docs/providers/aws/guide/events), I sought to manage different AWS Lambda events within a single Ts.ED project. Here is the approach I’ve been using.

## Set Up

Let’s start by setting up a new Ts.ED project. You can also refer to [A Comprehensive Guide to Getting Started with Ts.ED Framework](https://ygpark80.medium.com/ebe995d4bf06).

```bash
npx -p @tsed/cli tsed init -s .
yarn add @tsed/platform-serverless-http
yarn add -D @types/aws-lambda
```

For simplicity, I will flatten the controller structure.

```json
{
  "directory": ["./src/controllers"],
  // ...
}

```

Rename `src/controllers/rest/HelloWorldController.ts` to `src/controllers/rest.ts` and remove the other files.

```ts
// src/controllers/rest.ts
import {Controller} from "@tsed/di";
import {Get} from "@tsed/schema";

@Controller("/hello-world")
export class HelloWorldController {
  @Get("/")
  get() {
    return "hello";
  }
}
```

```ts
// src/Server.ts
// ...
import * as controllers from "./controllers";

@Configuration({
  // ...
  mount: {
    "/": [
      ...Object.values(controllers)
    ]
  },
  // ...
})
export class Server {
  // ...
}
```

Run `yarn barrels` to generate new barrels and run `yarn build` to verify the build is successful.

## API Gateway

Let's create a basic `serverless.yml` file to serve the Ts.ED project using HTTP via API Gateway. I prefer using API Gateway v2, also known as `httpApi`, as it's more performant and cost-effective.

You’ll need to create a `lambda.ts` file for the Lambda function:

```ts
// src/lambda.ts
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
```

Refer to [`index.ts`](./src/index.ts), [`Server.ts`](./src/Server.ts) since I've added some additional changes to it.

```yaml
service: tsed-serverless-events

provider:
  name: aws

functions:
  handler:
    handler: dist/lambda.handler
    events:
      - httpApi:
          method: ANY
          path: /
      - httpApi:
          method: ANY
          path: /{proxy+}
```

This should look familiar if you’ve followed [A Comprehensive Guide to Getting Started with Ts.ED Framework](https://ygpark80.medium.com/ebe995d4bf06).

## SQS Queues

Next, let’s add the AWS SQS client SDK to our project:

```bash
yarn add @aws-sdk/client-sqs
```

In [A Comprehensive Guide to Getting Started with Ts.ED Framework](https://ygpark80.medium.com/ebe995d4bf06), I created the Lambda handler as follows:

```ts
// ...
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
```

Why? Because I leveraged the `bootstrap()` function to initialize the Ts.ED framework for the SQS Queue trigger.

Next, create a service called `CalendarService` as seen in [A Comprehensive Guide to Getting Started with Ts.ED Framework](https://ygpark80.medium.com/ebe995d4bf06).

```ts
// src/functions/base.ts
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
```

The `Platform.get<T>(t: TokenProvider<T>)` function initializes the Ts.ED framework via `bootstrap()` and loads the service injector. Now, you can get the service instance you need.

Next, create a handler function `sqs.ts` to handle the SQS event:

```ts
// src/functions/sqs.ts
import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs"
import { SQSEvent } from "aws-lambda"
import { Platform } from "./base"
import { CalendarService } from "src/services/calendar"

const sqs = new SQSClient()

export async function handler(event: SQSEvent) {
    for (const record of event.Records) {
        try {
            const payload = JSON.parse(record.body)
            console.log("Payload=", payload)

            const calendarService = await Platform.get<CalendarService>(CalendarService)
            console.log("calendarService=", calendarService.findAll())

            if (record.receiptHandle) {
                await sqs.send(new DeleteMessageCommand({
                    QueueUrl: record.eventSourceARN,
                    ReceiptHandle: record.receiptHandle
                }))
            }
        } catch (error) {
            console.error(error)
        }
    }
}
```

Now, let’s reference this handler in `serverless.yml`:

```yaml
functions:
  sqs:
    handler: dist/functions/sqs.handler
    events:
      - sqs:
          arn: arn:aws:sqs:us-east-1:123456789012:MyQueue
```

This provides a simple example of handling SQS Queues events along with API Gateway events in a single Ts.ED project.

## SQS Processor for handling multiple SQS Queues Efficiently

When processing SQS events, you typically loop through each record to process it. However, the repetitive looping logic can make the code less readable.

Let’s create an `SQSProcessor` class to handle this logic more efficiently:

```ts
// src/functions/base.ts
// ...
export class SQSProcessor {
	static handler<P>(process: (payload: P) => void) {
		const handler: SQSHandler = async (event: SQSEvent) => {
			for (const record of event.Records) {
				try {
					const payload = JSON.parse(record.body) as P

					process(payload)

					if (record.receiptHandle) {
						const [region, accountId, queueName] = record.eventSourceARN.replace("arn:aws:sqs:", "").split(":")
						const QueueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`
						const sqs = new SQSClient({ region })
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
```

Now, let’s use `SQSProcessor` to manage the SQS event:

```ts
// src/functions/sqs.ts
import { Platform, SQSProcessor } from "./base"
import { CalendarService } from "../services/calendar"

interface CalendarPayload {
    id: string
}

export const handler = SQSProcessor.handler<CalendarPayload>(async (payload) => {
    console.log("Payload=", payload)

    const service = await Platform.get<CalendarService>(CalendarService)
    console.log("calendarService=", service.findAll())
})
```

Much cleaner, right? The `SQSProcessor` abstracts the repetitive code and makes the handler function more readable.

## Conclusion

By applying similar principles used in the SQS Queue trigger, you can handle other [AWS Lambda events](https://www.serverless.com/framework/docs/providers/aws/guide/events) within a single Ts.ED project. Simply create a handler function and use `Platform.get<T>(t: TokenProvider<T>)` to retrieve the necessary service instance. Then update your `serverless.yml` to add the new event trigger.

This approach allows you to leverage Ts.ED’s powerful architecture to handle various AWS Lambda events while keeping your code clean and maintainable.

I hope this guide helps you manage your Ts.ED project more efficiently. If you have any suggestions or improvements, please feel free to share them!
