# Safeguard Against AWS Account Confusion: A TypeScript Validation Approach

In our current company, multiple AWS accounts are utilized across different environments. While CI/CD processes maintain consistency when deploying to specific environments through `package.json` scripts, local deployments pose a greater risk of deploying to an unintended AWS account, especially when under time pressure.

To address this, the following approach provides a safeguard against such missteps, focusing on validation before deploying. Assume our account IDs are `123456789012` and `098765432109`.

## Shell Script Solution

The following shell command validates the AWS account ID based on the environment specified in the `STAGE` environment variable:

```bash
[ -z "$STAGE" ] && echo "❌ STAGE required" && exit 1 || \
aws sts get-caller-identity --output text --query Account | \
(grep -q "^123456789012$" && [ "$STAGE" = "beta" -o "$STAGE" = "prod" ] || \
 grep -q "^098765432109$" && [ "$STAGE" = "alpha" ] || \
 (echo "❌ Wrong AWS account for $STAGE" && exit 1)) && \
echo "✅ AWS account verified for $STAGE" && \
<your-deploy-command-here>
```

While functional, this solution remains less readable. TypeScript offers a cleaner and more structured approach.

## TypeScript Solution

The TypeScript solution, shown below, leverages the `zx` library for command execution. This approach ensures a clear error message if an AWS account does not match the expected environment.

```typescript
import { $ } from "zx"

const stage = process.env.STAGE
if (!stage) {
	console.error("❌ STAGE environment variable is required (alpha/beta/real)")
	process.exit(1)
}

const ACCOUNTS = {
	"123456789012": ["beta", "prod"],
	"098765432109": ["alpha"]
}

try {
	const identity = await $`aws sts get-caller-identity --output json`
	const currentAccount = JSON.parse(identity.stdout).Account

	if (!ACCOUNTS[currentAccount].includes(stage)) {
		console.error(`❌ Wrong AWS account for ${stage} environment! AWS account ${currentAccount} is for ${ACCOUNTS[currentAccount].join(", ")}.`)
		process.exit(1)
	}

	console.info(`✅ AWS account ${currentAccount} verified for '${stage}' environment`)
} catch (error) {
	console.error("❌ Failed to check AWS identity. Make sure AWS CLI is configured properly.")
	console.error(error)
	process.exit(1)
}
```

Note that you could use tools like `jq` to parse JSON or replace AWS CLI with the AWS SDK, but I wanted to demonstrate a CLI-TypeScript hybrid for our DevOps team.

By naming this file `check-aws-env.mts` and adding it to our `package.json` scripts, we streamline deployment checks and reduce human error risk. Here’s how to integrate it:

```json
{
	"scripts": {
        ...
		"deploy:alpha": "cross-env STAGE=alpha tsx check-aws-env.mts && cross-env STAGE=alpha yarn deploy:merge && npx sls deploy --stage alpha",
		"deploy:beta": "cross-env STAGE=beta tsx check-aws-env.mts && cross-env STAGE=beta yarn deploy:merge && npx sls deploy --stage beta",
		"deploy:prod": "cross-env STAGE=prod tsx check-aws-env.mts && cross-env STAGE=prod yarn deploy:merge && npx sls deploy --stage prod"
	}
}
```

## Example Outputs

Upon successful account verification:

```
% yarn deploy:alpha
yarn run v1.22.22
warning package.json: No license field
$ cross-env STAGE=alpha tsx check-aws-env.mts && cross-env STAGE=alpha yarn deploy:merge && npx sls deploy --stage alpha
✅ AWS account 098765432109 verified for 'alpha' environment
warning package.json: No license field
$ yq ea '. as $item ireduce ({}; . *+ $item )' serverless.base.yml serverless.${STAGE}.yml > serverless.yml
...
```

If the AWS account does not match the expected environment:

```
% yarn deploy:beta 
yarn run v1.22.22
warning package.json: No license field
$ cross-env STAGE=beta tsx check-aws-env.mts && cross-env STAGE=beta yarn deploy:merge && npx sls deploy --stage beta
❌ Wrong AWS account for beta environment! AWS account 098765432109 is for alpha.
error Command failed with exit code 1.
```

This method provides a clear and reliable safeguard against accidental misconfiguration in AWS deployments.

What a relief! Happy deploying!
