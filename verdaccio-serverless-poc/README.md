# How I Built a Serverless Private NPM Registry with Verdaccio and AWS

## Introduction

I've been a serverless advocate since around 2015 and have been building many of my building blocks using serverless technology. I've been thinking about making everything into a serverless product for a long time but I had limited time. For small workloads, serverless is cheap but at very high loads, using serverless can be more expensive than running your own servers or containers. However, most of the internal stuff we run are usually small so using serverless for internal tools seems reasonable. When the market was good, the priority of serving my own internal tools was low, thus I never thought of using serverless for this kind of work but since the market is going crazy, I'm beginning to think I should tap more into this stuff and I'll start with a private NPM registry.

Verdaccio is a lightweight private npm proxy registry that can be self-hosted. While traditionally it's been run on servers or containers, we can leverage serverless technology to create a more scalable and cost-effective solution.

Why even create a private NPM registry in the first place you may ask? For running a one-man company like myself, $7 price tag of npm seems a bit too much. Then I looked at GitHub Packages, but the pricing plan seemed a bit weird as its pricing is based on storage and data transfer. I didn't really mind storage costs, but data transfer? I didn't really look into other SaaS products since it would cost me anyway. Since AWS provides a generous free-tier, it seemed like a time to start this project.

## Why Serverless Verdaccio?

- Cost-effective: Pay only for what you use
- Scalable: Automatically handles varying loads
- Low maintenance: No server management required
- High availability: Built-in redundancy

## Architecture

When I say serverless, I usually mean AWS Lambda, not AWS ECS Fargate. With ECS Fargate, you still have to run the server 24 hours a day and have the responsibility of ensuring that the server is running. When going serverless, the most important thing to resolve is that the server itself needs to be stateless. However, by default, Verdaccio stores its files in the local file system, which needs to be addressed. Storage? We have S3 for that! So, the basic architecture involves:

- AWS Lambda function running Verdaccio
- Amazon API Gateway as the HTTP endpoint
- S3 for package storage

That's about it!

## Implementation Guide

### Prerequisites

- AWS Account
- Node.js and npm installed
- AWS CLI configured
- Serverless Framework installed

### Step-By-Step Setup

#### Initial Setup

```sh
mkdir verdaccio
cd verdaccio
npm init -y
npm install verdaccio@^5 verdaccio-aws-s3-storage
```

> [!WARNING]
> 
> verdaccio-aws-s3-storage only works for Verdaccio 5.x versions not the latest. Since Verdaccio 5.x is deprecated, if you are not comfortable using a deprecated version, you should stop here.

#### Launch Server Locally

Let's create some files so that we can launch the server locally for testing. Since we'll be using TypeScript, let's install TypeScript and some other dependencies to get started.

```sh
npm install --save-dev @types/node @types/aws-lambda @types/express typescript rimraf tsx
```

Now, `src/index.ts`

```ts
import { runServer } from "verdaccio"
import { Express } from "express"

const app: Express = await runServer("./config.yml")
app.listen(4873)

const SIG_EVENTS = ["beforeExit", "SIGHUP", "SIGINT", "SIGQUIT", "SIGILL", "SIGTRAP", "SIGABRT", "SIGBUS", "SIGFPE", "SIGUSR1", "SIGSEGV", "SIGUSR2", "SIGTERM"]
SIG_EVENTS.forEach(event => {
    process.on(event, () => {
        console.info(`\nReceived ${event} signal: closing Verdaccio...`)
        process.exit(0)
    })
})
```

There are other ways to launch Verdaccio locally but this code demonstrates how to manually load an express app. To explain this code briefly, this is pretty straightforward as Verdaccio provides a way to get an express instance. Since it's an express instance, we can just call `listen()` to bind it to a specific port. This is a very important point later on, because to make any express app serverless, we need an express instance to start with.

Now, let's modify `package.json` and add the following:

```json
{
    ...,
    "type": "module",
    "scripts": {
        "build": "rimraf dist && tsc",
        "dev": "npx tsx src/index.ts",
        ...
    },
    ...
}
```

Before creating the Verdaccio config, we need a user. Verdaccio uses htpasswd to manage its users, let's create one by executing the following command:

```sh
htpasswd -B htpasswd <username>
```

Now, let's create Verdaccio config called `config.yml`

```
storage: /tmp/verdaccio

store:
  aws-s3-storage:
    bucket: <bucket-name, required>
    keyPrefix: <optional>
    region: <region, optional>
    endpoint: <optional>
    accessKeyId: <optional>
    secretAccessKey: <optional>
    s3ForcePathStyle: true

auth:
  htpasswd:
    file: ./htpasswd
    algorithm: bcrypt
    max_users: -1

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@your-private-scope/*':
    access: <username>, <username2>, ...
    publish: <username>, <username2>, ...
    proxy: npmjs
    storage: private
  '**':
    access: $all
    publish:
    proxy: npmjs
    storage: public

log: { type: stdout, format: pretty, level: http }
```

Now, let's the server locally and you'll see something similar to the following output:

```
% npm run dev   

> verdaccio-serverless-poc@1.0.0 dev
> npx tsx src/index.ts

(node:45563) NOTE: The AWS SDK for JavaScript (v2) is in maintenance mode.
 SDK releases are limited to address critical bug fixes and security issues only.

Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the blog post at https://a.co/cUPnyil
(Use `node --trace-warnings ...` to show where the warning was created)
info --- plugin successfully loaded: verdaccio-aws-s3-storage
info --- using htpasswd file: /Users/<home>/verdaccio-serverless-poc/htpasswd
info --- plugin successfully loaded: verdaccio-htpasswd
```

Launch the server at http://localhost:4873 and test if the added user can be logged in.

#### Deploy To AWS

Let's now deploy this server to AWS using Serverless Framework.

```
npm install serverless-http
npm install --save-dev serverless serverless-domain-manager
```

We obviously need `serverless.yml`:

```yml
service: verdaccio

provider:
  name: aws
  region: <your-aws-region>

plugins:
  - serverless-domain-manager

custom:
  customDomain:
    domainName: <your-custom-domain>
    certificateName: "<your-acm-cert-name>"
    createRoute53Record: false
    createRoute53IPv6Record: false
    endpointType: EDGE
    apiType: rest
    autoDomain: true

functions:
  app:
    handler: dist/lambda.handler
    events:
      - http:
          path: /
          method: ANY
      - http:
          path: /{proxy+}
          method: ANY

```

We need a lambda handler so create `src/lambda.ts`:

```ts
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
```

Now let's add the `deploy` script to our package.json:

```json
{
    ...,
    "scripts": {
        ...,
        "deploy": "npm run build && serverless deploy",
        ...
    },
    ...
}
```

Now let's deploy it! You'll see something similar to the following output:

```
% npm run deploy

> verdaccio@0.0.1 deploy
> npm run build && serverless deploy


> verdaccio@0.0.1 build
> rimraf dist && tsc


Deploying "verdaccio"

✔ Service deployed to stack verdaccio (40s)

endpoints:
  ANY - https://<id>.execute-api.<region>.amazonaws.com/prod/
  ANY - https://<id>.execute-api.<region>.amazonaws.com/prod/{proxy+}
functions:
  app: verdaccio-app (32 MB)
Serverless Domain Manager:
  Domain Name: <YourDomainName>
  Target Domain: <TargetDomain>.cloudfront.net
  Hosted Zone Id: <HostedZoneId>
```

You can launch the deployed app at `<YourDomainName>`. Viola!

## Conclusion

Running Verdaccio on serverless infrastructure provides a modern, scalable approach to private npm registries.
You don’t need to overpay for private NPM hosting or worry about servers anymore.

The source code is available at https://github.com/ygpark80/blog/tree/main/verdaccio-serverless-poc.
