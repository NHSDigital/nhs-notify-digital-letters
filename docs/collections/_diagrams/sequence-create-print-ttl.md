---

title: sequence-create-print-ttl

---

```mermaid
sequenceDiagram
  participant eb as Event Bridge
  participant sqs as SQS<br/>CreateTTLQueue
  participant createTTL as Lambda<br/>CreateTTL
  participant dynamo as DynamoDB


  eb ->> sqs: MESHInboxMessageDownloaded event
  sqs ->> createTTL:
  createTTL ->> dynamo: Insert (24h TTL)
```
