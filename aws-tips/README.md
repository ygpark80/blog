## Dynamically get `QueueUrl` from SQS Event

Don't hard-code `QueueUrl` in the code. SQS event already have all the information you need to create `QueueUrl`.

Typically, the `QueueUrl` has the following format:

```
https://sqs.<region>.amazonaws.com/<account-id>/<queue-name>
```

So basically you can construct any `QueueUrl` if you have the `region`, `account-id`, and `queue-name`.

Let's look at some example SQS event.

```json
{
  messageId: '12345678901234567890',
  receiptHandle: '12345678901234567890',
  body: '{ "a": 1, "b": 2, "c": 3 }',
  attributes: {
    ApproximateReceiveCount: '1',
    SentTimestamp: '1728272125760',
    SenderId: '12345678901234567890',
    ApproximateFirstReceiveTimestamp: '1728272125762'
  },
  messageAttributes: {},
  md5OfBody: 'b0b524e22242aaa124f5dd59ccf3a579',
  eventSource: 'aws:sqs',
  eventSourceARN: 'arn:aws:sqs:<region>:<account-id>:<queue-name>',
  awsRegion: '<region>'
}
```

Obviously, you can get `region` from `awsRegion` directly but for `account-id` and `queue-name`, you'll need to parse from `eventSourceARN`.

```typescript
const eventSourceARN = ... // from event
const [region, accountId, queueName] = eventSourceARN.replace("arn:aws:sqs:", "").split(":")
```

Finally, you can construct `QueueUrl` like this:

```typescript
const QueueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`
```

You will typically use `QueueUrl` to delete the message from SQS.

Here's a complete example of processing SQS event via AWS Lambda. Note that it does not have to be AWS Lambda since when using AWS SDK to process SQS events, the format is the same.

```typescript
import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs"
import { SQSEvent, SQSHandler } from "aws-lambda"

export const handler: SQSHandler = (event: SQSEvent) {
    const region = event.Records[0]?.awsRegion
    const sqs = new SQSClient({ region })

    for (const record of event.Records) {
        try {
            const payload = JSON.parse(record.body)

            // do something

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
```
