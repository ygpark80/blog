# Ts.ED Framework 시작을 위한 가이드

## Why Ts.ED Framework

마이크로서비스 및 AWS Lambda에 배포 가능한 API 서비스를 구축하기에 적합한 프레임워크를 찾는 과정에서 Express.js나 Hono와 같은 low-level 프레임워크의 대안을 모색했습니다. 이러한 low-level 옵션들은 요청을 모델 객체에 매핑, 모델 검증, 의존성 주입, Swagger 문서화와 같은 기능을 구현하고 유지 관리하는 데 어려움을 겪는 경우가 많습니다.

여러 프레임워크를 평가한 결과 Ts.ED Framework가 가장 유력한 옵션으로 떠올랐습니다. 고려된 프레임워크는 다음과 같습니다:

- [TypeStack routing-controllers](https://github.com/typestack/routing-controllers)
- [Ts.ED](https://github.com/tsedio/tsed)
- [Nest](https://github.com/nestjs/nest)
- [LoopBack](https://github.com/strongloop/loopback-next)

프레임워크에 대한 요구 사항은 다음과 같습니다:

1. Express.js 또는 Koa.js 위에 구축되어 로컬 테스트 및 AWS Lambda로의 원활한 배포를 용이하게 함.
1. Spring annotations와 유사한 decorators를 사용.
1. 견고한 의존성 주입(DI) 시스템 제공.
1. TypeScript 타입 안전성 보장.
1. Swagger 문서화 및 OpenAPI 사양(OAS) 생성 기능 포함.

Ts.ED Framework는 TypeScript로 개발된 Node.js 프레임워크로, 확장 가능한 서버 측 애플리케이션을 구축할 수 있게 해줍니다. Spring Boot에 익숙한 개발자에게 Ts.ED Framework는 JavaScript/TypeScript 환경에서 클래스, decorators, 의존성 주입을 활용한 유사한 구조적 접근 방식을 제공합니다:

1. **TypeScript 기반**: TypeScript를 활용하여 향상된 타입 안전성과 개발자 경험을 제공합니다.
1. **Decorators**: Spring annotations와 유사한 decorators를 구현하여 Spring 개발자들의 전환을 용이하게 합니다.
1. **의존성 주입**: Spring의 IoC 컨테이너에 필적하는 견고한 DI 시스템을 제공합니다.
1. **모듈성**: Spring의 컴포넌트 기반 접근 방식과 유사한 모듈 아키텍처를 촉진합니다.
1. **Express.js 통합**: Express.js 위에 구축되어 광범위한 미들웨어와의 쉬운 통합을 용이하게 합니다.

주요 유사점은 다음과 같습니다:

* **의존성 주입(DI)**: Spring의 `@Autowired`와 유사하게, Ts.ED Framework는 decorators를 통해 서비스와 컨트롤러를 주입할 수 있게 하여 모듈성 및 테스트 용이성을 향상시킵니다.
* **컨트롤러**: `@Controller`, `@Get`, `@Post`와 같은 decorators를 사용하여 라우트를 관리하며, 이는 Spring의 `@RestController`, `@RequestMapping`, `@GetMapping`, `@PostMapping`과 유사합니다.
* **모델 바인딩**: 두 프레임워크 모두 들어오는 요청을 데이터 모델에 매핑하여 데이터 처리를 간소화합니다.
* **검증**: 데이터 검증을 위한 견고한 메커니즘을 제공하여 들어오는 데이터가 정의된 기준을 준수하도록 합니다.
* **OpenAPI Specification (OAS)**: OAS 생성을 위한 내장 지원으로 API 문서화, 테스트, 다른 시스템과의 통합을 간소화합니다.

## Set Up

새로운 Ts.ED Framework 프로젝트를 설정해봅시다.

새 프로젝트를 생성하려면 다음을 실행하세요:

```bash
mkdir myproject
npx -p @tsed/cli tsed init .
```

tsed를 처음 실행하면 `@tsed/cli` 패키지를 설치하라는 메시지가 표시됩니다. 계속하려면 `y`를 입력하세요.

```
Need to install the following packages:
@tsed/cli@5.4.3
Ok to proceed? (y)
```

아래 옵션을 선택하세요:

```
? Choose the target Framework: Express.js
? Choose the architecture for your project: Ts.ED
? Choose the convention file styling: Ts.ED
? Check the features needed for your project Swagger, Testing
? Choose unit framework Jest
? Choose the runtime: Node.js
? Choose the package manager: Yarn
↓ Write RC files [SKIPPED]
↓ Write RC files [SKIPPED]
✔ Initialize package.json
✔ Install plugins
✔ Load plugins
✔ Install plugins dependencies
❯ Generate project files
⠋ Root files
   › [0/15] Rendering files...
✔ Generate project files
✔ Generate files for jest
✔ Install dependencies
✔ Generate barrels files
```

## Run Locally

Ts.ED Framework 애플리케이션을 로컬에서 실행하고 테스트하려면 다음 명령어를 실행하세요.

개발 서버를 시작하려면:

```bash
yarn start
```

기본적으로 서버는 `http://localhost:8083`에서 접근할 수 있습니다. Postman이나 cURL과 같은 도구를 사용하여 API 엔드포인트를 테스트하세요.

## Testing

단위 테스트를 위해 Ts.ED Framework는 Jest를 기본적으로 지원합니다. ‘Linting’ 기능이 포함되지 않았으므로 `package.json`을 수정하여 린팅을 우회해야 합니다. 다음 줄을 변경하세요:

```json
"test": "yarn run test:lint && yarn run test:coverage ",
```

다음과 같이 변경:

```json
"test": "yarn run test:coverage",
```

테스트를 실행하려면:

```bash
yarn test
```

글로벌 커버리지 임계값 70%로 인해 테스트가 실패할 수 있습니다. 이는 개발을 진행하기 위해 일시적으로 무시할 수 있습니다.

## Run Locally with Docker

Docker Compose를 사용하여 Ts.ED Framework 애플리케이션을 컨테이너화하려면 프로젝트 루트에 `Dockerfile`을 생성하세요:

```dockerfile
ARG NODE_VERSION=20.10.0

FROM node:${NODE_VERSION}-alpine
WORKDIR /opt

ARG NPM_TOKEN
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"
COPY package.json yarn.lock ./

RUN yarn install --pure-lockfile
RUN npm config delete '//registry.npmjs.org/:_authToken'

COPY tsconfig.json tsconfig.compile.json .barrelsby.json .env* ./
COPY ./src ./src
COPY ./views ./views

CMD ["yarn", "start"]
```
> **참고**: 이 Dockerfile은 로컬 개발 및 테스트 용도로만 의도된 것이며, 프로덕션 환경에 최적화되어 있지 않습니다.

`docker-compose.yml` 파일을 생성하세요:

```yaml
services:
  app:
    build: .
    ports:
      - "8083:8083"
```

컨테이너화된 애플리케이션을 빌드하고 실행하려면:

```bash
docker-compose up --build --force-recreate -d
```

서버는 `http://localhost:8083`에서 이용 가능합니다.

## Deploy to AWS Lambda

Ts.ED Framework 애플리케이션을 AWS Lambda에 배포하려면 필요한 종속성을 설치하세요:

```bash
yarn add @tsed/platform-serverless-http
yarn add -D serverless serverless-dotenv-plugin @types/aws-lambda
```

프로젝트 루트에 `Dockerfile.lambda`을 생성하세요:

```dockerfile
FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

RUN corepack enable
ARG NPM_TOKEN
RUN npm config set '//registry.npmjs.org/:_authToken' "${NPM_TOKEN}"
COPY package.json yarn.lock ./

RUN yarn install --pure-lockfile
RUN npm config delete '//registry.npmjs.org/:_authToken'

COPY tsconfig.json tsconfig.compile.json .barrelsby.json .env* ./
COPY ./src ./src
COPY ./views ./views

RUN yarn build

CMD ["dist/lambda.handler"]
```

> **참고**: 제공된 Dockerfile.lambda은 프로덕션 사용을 위해 최적화되어 있지 않으며, 프로덕션 준비 환경을 위해 추가 조정이 필요할 수 있습니다.

Lambda 핸들러 파일을 생성하세요 (예: `lambda.ts`):

```typescript
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

`index.ts`를 수정하여 `httpPort`와 `httpsPort`를 지정하세요. 이는 Lambda에 배포될 때 필요하지 않기 때문에 `Server.ts`에서 이러한 속성을 제거하세요.

```typescript
import { $log } from "@tsed/common"
import { PlatformExpress } from "@tsed/platform-express"

async function bootstrap() {
  try {
    const { Server } = await import("./Server")
    const platform = await PlatformExpress.bootstrap(Server, {
      httpPort: process.env.PORT || 8083,
      httpsPort: false // CHANGE
    })
    await platform.listen()

    process.on("SIGINT", () => {
      platform.stop()
    })
  } catch (error) {
    $log.error({ event: "SERVER_BOOTSTRAP_ERROR", message: error.message, stack: error.stack })
  }
}

bootstrap()
```

`serverless.yml` 파일을 생성하세요:

```yaml
service: myproject

provider:
  name: aws
  region: us-east-1  # Replace with your desired AWS region
  environment:
    - NODE_ENV=production
  timeout: 29
  ecr:
    images:
      myproject:
        path: .
        file: ./Dockerfile.lambda
        buildArgs:
          NPM_TOKEN: ${env:NPM_TOKEN}

plugins:
- serverless-plugin-docker

functions:
  handler:
    image:
      name: myproject
    events:
      - httpApi:
        method: ANY
        path: /
      - httpApi:
        method: ANY
        path: /{proxy+}
```

다음 명령어를 사용하여 AWS Lambda에 배포하세요:

```bash
npx serverless deploy
```

## Creating a new Controller

기본 `.barrelsby.json` 설정은 배럴 내보내기를 다음과 같이 관리합니다:

```json
{
  "directory": ["./src/controllers/rest","./src/controllers/pages"],
  ...
}
```

그러나 저는 보통 `src/controllers/rest/HelloWorldController.ts`를 `src/controllers/index.ts`로, `src/controllers/pages/indexController.ts`를 `src/controllers/pages.ts`로 변경하여 디렉터리 구조를 다음과 같이 평평하게 만듭니다:

```json
{
  "directory": ["./src/controllers"],
  ...
}
```

이제 새로운 REST API 엔드포인트를 생성하려면 `@Controller` 데코레이터가 있는 새 컨트롤러를 생성해야 합니다.

```typescript
import { Controller, Get, Inject } from "@tsed/common"

@Controller("/")
export class CalendarController {
   @Get()
   findAll() {
      return "This action returns all calendars"
   }
}
```

Ts.ED Framework는 각 HTTP 동사를 처리할 수 있는 decorators를 제공합니다:

* `@Get`
* `@Post`
* `@Put`
* `@Delete`
* `@Patch`
* `@Options`
* `@Head`
* `@All`

> **참고**: Ts.ED Framework는 `@All`을 지원하지만, 특별한 이유가 없는 한 특정 HTTP 동사 decorators를 사용하는 것이 권장됩니다.

새 컨트롤러를 `src/controllers/`에 추가한 경우 `yarn barrels`를 실행하여 `src/controllers/index.ts`를 업데이트해야 하며, 이는 `src/Server.ts` 파일에 반영됩니다. Ts.ED Framework는 `src/Server.ts`에서 다음과 같이 컨트롤러를 로드합니다:

```typescript
...
import * as controllers from "./controllers"
...

@Configuration({
   ...
   mount: {
      "/": [ ...Object.values(controllers) ]
   }
})
```

## Creating a New Service

새로운 서비스를 생성하려면 새 클래스를 만들고 `@Injectable` 데코레이터를 사용하세요.

```typescript
import { Injectable } from "@tsed/common"

@Injectable()
export class CalendarService {
  findAll() {
    return "This action returns all calendars"
  }
}
```

그런 다음 `@Inject` 데코레이터를 사용하여 컨트롤러에 서비스를 주입하세요.

```typescript
import { Controller, Get, Inject } from "@tsed/common"

@Controller("/")
export class CalendarController {
  @Inject()
  private calendar: CalendarService

  @Get()
  findAll() {
    return this.calendar.findAll()
  }
}
```

> **참고**: `@Service`와 `@Injectable` 데코레이터는 동일한 결과를 얻을 수 있습니다. 그러나 `@Injectable`은 추가 옵션을 허용하는 반면, `@Service`는 항상 서비스를 singleton으로 주입합니다.

## Binding a Model to a Request

요청 매개변수를 모델에 바인딩하는 것은 모델 클래스를 통해 가능합니다. 모델 클래스를 사용하면 데이터 검증을 용이하게 할 뿐만 아니라 OpenAPI 스펙 생성을 돕습니다.

```typescript
import { Enum, Property, Required } from "@tsed/schema"

export class CalendarInsertRequest {
  @Property()
  @Required()
  name: string

  @Property()
  @Enum("PUBLIC", "PRIVATE")
  visibility: string
}

export class CalendarListRequest {
  @Property()
  page?: number  // page number

  @Property()
  limit?: number // page size

  @Enum("NEWEST", "OLDEST")
  sort?: string
}
```

> **참고**: Swagger UI와 함께 사용할 때 `@Enum`을 사용하면 가능한 값에 대한 드롭다운 메뉴를 제공하므로 유용합니다.

이제 `CalendarInsertRequest` 클래스를 컨트롤러 메서드의 매개변수로 사용할 수 있습니다.

```typescript
import { Controller, Post, Get } from "@tsed/common"
import { BodyParams, QueryParams } from "@tsed/platform-params"

@Controller("/")
export class CalendarController {
  @Post("/")
  insert(@BodyParams() request: CalendarInsertRequest) {
    console.log(request instanceof CalendarInsertRequest) // true
    return request
  }

  @Get("/list")
  list(@QueryParams() request: CalendarListRequest) {
    console.log(request instanceof CalendarListRequest) // true
    return request
  }
}
```

더 많은 Ts.ED Framework 스키마 관련 decorators 및 예제는 [Model](https://tsed.io/docs/model.html)을 참조하세요.

## Pion Rules

[Pion Corporation](https://pioncorp.com/)에서는 Ts.ED Framework를 사용할 때 특정 지침을 준수합니다.

### Use `Controller` postfix

컨트롤러 클래스에 `Ctrl`과 같은 축약형을 사용하거나 접미사를 생략하는 대신 `Controller` 접미사를 사용하세요.

#### Why

컨트롤러 클래스를 식별하고 구분하기가 더 쉬워집니다.

#### Example

`CalendarController` 대신 `CalendarCtrl`.

### Use `Request` or `Response` postfix

요청 또는 응답 모델을 나타내는 모델 클래스에는 `Request` 또는 `Response` 접미사를 사용하세요.

#### Why

모델 클래스를 식별하고 구분하기가 더 쉬워집니다.

#### Example:

`CalendarInsertRequest` 대신 `CalendarInsert`.

### Use @Controller("/") and Specify Full URL Paths in HTTP Verb Decorators

`@Controller("/")`를 사용하고 각 HTTP 동사 decorator에 전체 URL 경로를 지정하세요.

#### Why

HTTP 동사 decorator 내에서 전체 URL 경로를 직접 관리하고 추적하면 명확성과 유지 관리성이 향상됩니다.

#### Example

허용됨

```typescript
@Controller("/")
export class MyController {
   @Get("/my/items")
   findAll() { ... }
}
```

허용되지 않음

```typescript
@Controller("/my")
export class MyController {
   @Get("/items")
   findAll() { ... }
}
```

### Use a specific HTTP verb decorator instead of `@All`

특별한 이유가 없는 한 `@All` 대신 특정 HTTP 동사 decorators를 사용하세요.

#### Why

`@All`을 통해 모든 HTTP 동사를 허용하면 잠재적인 보안 위험이 발생할 수 있습니다. 따라서 이러한 위험을 완화하기 위해 특정 HTTP 동사 decorators를 사용하는 것이 일반적으로 권장됩니다.
