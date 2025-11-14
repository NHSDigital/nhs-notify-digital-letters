---

title: sequence-expire-print-ttl

---

```mermaid
sequenceDiagram
  participant eb as Event Bridge
  participant expireTTL as Lambda<br/>PollTTL
  participant dynamo as DynamoDB
  participant stream as DynamoDB Stream
  participant processTTLExpiry as Lambda<br/>HandleTTLExpiry

  alt Dynamo auto-expires after TTL
    dynamo ->> dynamo: TTL expires
    dynamo ->> stream: TTL expired
    stream ->> processTTLExpiry:
  else Polling Lamba deletes after TTL
    eb ->> expireTTL: TTLPollTimeExpired Event
    expireTTL ->> dynamo: Delete items with expired TTL
    dynamo ->> stream: TTL expired
    stream ->> processTTLExpiry:
  end
  processTTLExpiry ->> processTTLExpiry: Filter unread attachments
  processTTLExpiry ->> eb: ItemDequeued Event
```
