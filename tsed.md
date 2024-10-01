# A Comprehensive Guide to Getting Started with the Ts.ED Framework

## Why Ts.ED Framework

When searching for a framework suitable for building microservices and API services deployable to AWS Lambda, I sought an alternative to low-level frameworks like Express.js or Hono. These lower-level options often make features such as request mapping to model objects, model validation, dependency injection, and Swagger documentation more challenging to implement and maintain.

After evaluating several frameworks, Ts.ED emerged as the most promising option. The frameworks considered include:

- [TypeStack routing-controllers](https://github.com/typestack/routing-controllers)
- [Ts.ED](https://github.com/tsedio/tsed)
- [Nest](https://github.com/nestjs/nest)
- [LoopBack](https://github.com/strongloop/loopback-next)

Here are the requirements that I have for the framework:

1. Built on top of Express.js or Koa.js to facilitate local testing and seamless deployment to AWS Lambda.
1. Utilizes decorators akin to Spring annotations.
1. Offers a robust dependency injection (DI) system.
1. Ensures TypeScript type safety.
1. Includes Swagger documentation and the capability to generate OpenAPI Specifications (OAS).

Ts.ED is a Node.js framework developed in TypeScript, enabling the construction of scalable server-side applications. For developers acquainted with Spring Boot, Ts.ED offers a similarly structured approach, utilizing classes, decorators, and dependency injection within a JavaScript/TypeScript environment:

1. **TypeScript-Based**: Leverages TypeScript for enhanced type safety and developer experience.
1. **Decorators**: Implements decorators similar to Spring annotations, easing the transition for Spring developers.
1. **Dependency Injection**: Features a robust DI system comparable to Spring’s IoC container.
1. **Modularity**: Promotes a modular architecture akin to Spring’s component-based approach.
1. **Express.js Integration**: Built atop Express.js, facilitating easy integration with a wide range of middleware.

Key similarities include:

* **Dependency Injection (DI)**: Similar to Spring’s `@Autowired`, Ts.ED enables the injection of services and controllers through decorators, enhancing modularity and testability.
* **Controllers**: Utilizes decorators such as `@Controller`, `@Get`, and `@Post` to manage routes, analogous to Spring’s `@RestController`, `@RequestMapping`, `@GetMapping`, and `@PostMapping`.
* **Model Binding**: Both frameworks facilitate mapping incoming requests to data models, streamlining data handling.
* **Validation**: Provides robust mechanisms for data validation, ensuring incoming data adheres to defined criteria.
* **OpenAPI Specification (OAS)**: Built-in support for generating OAS simplifies API documentation, testing, and integration with other systems.

## Set Up

Let's set up a new Ts.ED project.

To create a new project:

```bash
mkdir myproject
npx -p @tsed/cli tsed init .
```

Upon running tsed for the first time, you will be prompted to install the `@tsed/cli` package. Respond with `y` to continue.

```
Need to install the following packages:
@tsed/cli@5.4.3
Ok to proceed? (y)
```

Choose the options below:

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

To run and test your Ts.ED application locally, run the following command.

Start the development server:

```bash
yarn start
```

By default, the server will be accessible at `http://localhost:8083`. Utilize tools such as Postman or cURL to test your API endpoints.

## Testing

For unit testing, Ts.ED supports Jest out of the box. Since the 'Linting' feature was not included, you need to modify the package.json to bypass linting. Change the following line:

```json
"test": "yarn run test:lint && yarn run test:coverage ",
```

to

```json
"test": "yarn run test:coverage",
```
Run tests with:

```bash
yarn test
```

The test may fail due to the global coverage threshold of 70%. This can be temporarily ignored to proceed with development.

## Run Locally with Docker

To containerize your Ts.ED application using Docker Compose, create a `Dockerfile` in your project root:

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
> **Note**: This Dockerfile is intended solely for local development and testing purposes and is not optimized for production environments.

Create a `docker-compose.yml` file:

```yaml
services:
  app:
    build: .
    ports:
      - "8083:8083"
```

Build and run your containerized application:

```bash
docker-compose up --build --force-recreate -d
```

The server will be available at [`http://localhost:8083`](http://localhost:8083).

## Deploy to AWS Lambda

To deploy your Ts.ED application to AWS Lambda, install the required dependencies:

```bash
yarn add @tsed/platform-serverless-http
yarn add -D serverless serverless-dotenv-plugin @types/aws-lambda
```

Create a `Dockerfile.lambda` in your project root:

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

> **Note**: The Dockerfile.lambda provided is not optimized for production use and may require additional adjustments for a production-ready environment.

Create a Lambda handler file (e.g., `lambda.ts`):

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

Modify `index.ts` to specify `httpPort` and `httpsPort` since these won't be needed when deployed to Lambda. Remove these properties from `Server.ts`.

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

Create a `serverless.yml` file:

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

Now, deploy to AWS Lambda using the following command:

```bash
npx serverless deploy
```

## Creating a new Controller

The default `.barrelsby.json` configuration manages barrel exports as follows:

```json
{
  "directory": ["./src/controllers/rest","./src/controllers/pages"],
  ...
}
```

However, I usually change `src/controllers/rest/HelloWorldController.ts` to `src/controllers/index.ts` and `src/controllers/pages/indexController.ts` to `src/controllers/pages.ts`, flattening the directory structure to the following:

```json
{
  "directory": ["./src/controllers"],
  ...
}
```

Now, to create a new REST API endpoint, we need to create a new controller with a `@Controller` decorator.

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

Ts.ED provides a decorator for each HTTP verb that can be used to handle requests:

* `@Get`
* `@Post`
* `@Put`
* `@Delete`
* `@Patch`
* `@Options`
* `@Head`
* `@All`

> **Note**: Although Ts.ED supports `@All`, it’s recommended to use specific HTTP verb decorators unless there’s a compelling reason to use `@All`.

If you added the new controller in `src/controllers/`, you should run `yarn barrels` to update `src/controllers/index.ts` which is then be reflected in the `src/Server.ts` file. Ts.ED loads controllers in the `src/Server.ts` using

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

You can create a new service by creating a new class and using the `@Injectable` decorator.

```typescript
import { Injectable } from "@tsed/common"

@Injectable()
export class CalendarService {
  findAll() {
    return "This action returns all calendars"
  }
}
```

Then use the `@Inject` decorator to inject the service into the controller.

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

> **Note**: Both `@Service` and `@Injectable` decorators achieve the same result. However, `@Injectable` allows for additional options, while `@Service` always injects the service as a singleton.

## Binding a Model to a Request

Binding request parameters to a model is achievable through model classes. Utilizing model classes not only facilitates data validation but also aids in generating OpenAPI specifications.

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

> **Note**: Using `@Enum` is beneficial when used with Swagger UI, as it provides a dropdown menu for the possible values.

You can now use the `CalendarInsertRequest` class as a parameter in the controller method.

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

Refer to [Model](https://tsed.io/docs/model.html) for more Ts.ED schema-related decorators and examples.

## Pion Rules

At [Pion Corporation](https://pioncorp.com/), we adhere to specific guidelines when utilizing the Ts.ED framework.

### Use `Controller` postfix

Use the `Controller` postfix for controller classes instead of shorthand forms like `Ctrl` or omitting the postfix.

#### Why

It becomes easier to identify and distinguish controller classes.

#### Example

`CalendarController` instead of `CalendarCtrl`.

### Use `Request` or `Response` postfix

Use `Request` or `Response` postfix for model classes that represent a request or response model.

#### Why

It is easier to identify and distinguish model classes.

#### Example:

`CalendarInsertRequest` instead of `CalendarInsert`.

### Use @Controller("/") and Specify Full URL Paths in HTTP Verb Decorators

Use `@Controller("/")` and specify full URL paths in each HTTP verb decorator.

#### Why

Managing and tracing full URL paths directly within HTTP verb decorators enhances clarity and maintainability.

#### Example

This is okay
```typescript
@Controller("/")
export class MyController {
   @Get("/my/items")
   findAll() { ... }
}
```

This is not okay

```typescript
@Controller("/my")
export class MyController {
   @Get("/items")
   findAll() { ... }
}
```

### Use a specific HTTP verb decorator instead of `@All`

Use a specific HTTP verb decorator instead of `@All` unless you have a good reason to use `@All`.

#### Why

Potential security risks arise from allowing all HTTP verbs via `@All`. Therefore, it is generally recommended to use specific HTTP verb decorators to mitigate these risks.
