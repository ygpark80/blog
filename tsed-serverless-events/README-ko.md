# Ts.ED Framework을 사용하여 다양한 AWS Lambda 이벤트 처리하기

저는 Ts.ED Framework와 AWS Lambda를 함께 사용한 지 어느 정도 시간이 지났습니다. 여러 모듈로 코드를 분리하지 않고, 단일 Ts.ED 프로젝트 내에서 다양한 AWS Lambda 이벤트를 처리하는 방법을 찾고 싶었습니다. 내부 API의 경우, 별도의 내부 API Gateway를 추가하는 것은 다소 과하다고 느꼈습니다. Serverless Framework는 다양한 [AWS Lambda Events](https://www.serverless.com/framework/docs/providers/aws/guide/events)를 지원하므로, 이를 하나의 Ts.ED 프로젝트에서 관리하는 방법을 찾게 되었습니다. 여기 제가 사용한 접근 방식을 공유합니다.

## 프로젝트 설정

먼저 새로운 Ts.ED 프로젝트를 설정해보겠습니다. [Ts.ED Framework 시작을 위한 가이드](https://ygpark80.medium.com/3031bc69d59c)를 참조할 수 있습니다.

```bash
npx -p @tsed/cli tsed init -s .
yarn add @tsed/platform-serverless-http
yarn add -D @types/aws-lambda
```

간단하게 컨트롤러 구조를 평탄화(flatten)합니다.

```json
{
  "directory": ["./src/controllers"],
  // ...
}

```

`src/controllers/rest/HelloWorldController.ts` 파일을 `src/controllers/rest.ts`로 이름을 변경하고 다른 파일을 제거합니다.

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

`yarn barrels` 명령어를 실행해 새로운 barrel 파일을 생성하고, `yarn build`로 빌드가 성공하는지 확인합니다.

## API Gateway

Ts.ED 프로젝트를 HTTP로 서비스하기 위한 기본 `serverless.yml` 파일을 생성합니다. 저는 성능과 비용 효율성 측면에서 더 나은 `httpApi`로 알려진 API Gateway v2를 선호합니다.

Lambda 함수를 위한 `lambda.ts` 파일을 생성해야 합니다:

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

[`index.ts`](./src/index.ts) 및 [`Server.ts`](./src/Server.ts)를 참고하십시오. 몇 가지 추가 변경 사항이 있습니다.

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

이 구성이 낯설다면 [Ts.ED Framework 시작을 위한 가이드](https://ygpark80.medium.com/ebe995d4bf06)를 참조하면 도움이 될 것입니다.

## SQS Queues

다음으로, AWS SQS 클라이언트 SDK를 프로젝트에 추가해 보겠습니다.

```bash
yarn add @aws-sdk/client-sqs
```

[Ts.ED Framework 시작을 위한 가이드](https://ygpark80.medium.com/ebe995d4bf06)에서와 같이 Lambda 핸들러를 다음과 같이 작성하였습니다:

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

이러한 방식으로 Ts.ED 프레임워크를 초기화하고 SQS Queue 트리거를 위한 `bootstrap()` 함수를 사용했습니다.

다음으로, [Ts.ED Framework 시작을 위한 가이드](https://ygpark80.medium.com/ebe995d4bf06)에서와 같이 CalendarService라는 서비스를 생성합니다.

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

`Platform.get<T>(t: TokenProvider<T>)` 함수는 Ts.ED 프레임워크를 `bootstrap()`을 통해 초기화하고 서비스 주입기를 로드합니다. 이제 필요한 서비스 인스턴스를 가져올 수 있습니다.

다음으로, SQS 이벤트를 처리하기 위한 sqs.ts 핸들러 함수를 작성합니다:

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

이제 이 핸들러를 `serverless.yml`에서 참조합니다:

```yaml
functions:
  sqs:
    handler: dist/functions/sqs.handler
    events:
      - sqs:
          arn: arn:aws:sqs:us-east-1:123456789012:MyQueue
```

이 설정은 단일 Ts.ED 프로젝트에서 API Gateway 이벤트와 함께 SQS Queue 이벤트를 처리하는 간단한 예시를 보여줍니다.

## SQS Queue를 효율적으로 처리하기 위한 SQS Processor

SQS 이벤트를 처리할 때, 일반적으로 각 레코드를 순차적으로 처리합니다. 그러나 반복적인 루프 로직은 코드의 가독성을 떨어뜨릴 수 있습니다.

`SQSProcessor` 클래스를 만들어 이 로직을 효율적으로 처리해 보겠습니다:

```ts
// src/functions/base.ts
// ...
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
```

이제 `SQSProcessor`를 사용해 SQS 이벤트를 관리해 보겠습니다:

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

훨씬 깔끔해졌습니다! `SQSProcessor`는 반복적인 코드를 추상화하여 핸들러 함수를 더 읽기 쉽게 만들어 줍니다.

## 결론

SQS Queue 트리거에서 사용된 유사한 원리를 적용하여 단일 Ts.ED 프로젝트 내에서 다양한 [AWS Lambda 이벤트들](https://www.serverless.com/framework/docs/providers/aws/guide/events)을 처리할 수 있습니다. 핸들러 함수를 생성하고 `Platform.get<T>(t: TokenProvider<T>)`를 사용하여 필요한 서비스 인스턴스를 가져오면 됩니다. 그런 다음 `serverless.yml` 파일을 업데이트하여 새로운 이벤트 트리거를 추가하면 됩니다.

이 접근 방식은 Ts.ED의 강력한 아키텍처를 활용하여 다양한 AWS Lambda 이벤트를 처리하면서 코드의 청결성과 유지 보수성을 유지할 수 있도록 도와줍니다.

이 가이드가 Ts.ED 프로젝트를 더 효율적으로 관리하는 데 도움이 되기를 바랍니다. 개선할 점이나 제안이 있다면 언제든지 공유해 주세요!
