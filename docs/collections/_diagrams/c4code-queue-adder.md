---
title: c4code-printer-sendtoqueue
---

```mermaid
   architecture-beta
    group queueAdder(cloud)[QueueAdder]

    service db(aws:arch-amazon-dynamodb)[ItemsWithTTL] in queueAdder
    service clientConfig(aws:res-aws-systems-manager-parameter-store)[Client Configuration] in queueAdder
    service createLambda(logos:aws-lambda)[CreateTTL] in queueAdder
    service queue(logos:aws-sqs)[SQS] in queueAdder
    service downloadedEvent(aws:res-amazon-eventbridge-event)[MESHInboxMessageDownloaded event]
    service enqueuedEvent(aws:res-amazon-eventbridge-event) [ItemEnqueued event]

    downloadedEvent:R --> L:queue
    queue:R --> L:createLambda
    clientConfig:B --> T:createLambda
    createLambda:R --> L:enqueuedEvent
    createLambda:B --> T:db
```
