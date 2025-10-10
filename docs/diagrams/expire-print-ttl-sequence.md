---
layout: page
title: Fallback to Printing Sequence Diagram
nav_order: 3
parent: Diagrams
has_children: false
child_nav_order: reversed
is_not_draft: false
last_modified_date: 2025-10-08
owner: Tom D'Roza
author: Tom D'Roza
---

```mermaid
sequenceDiagram
  participant dynamo as DynamoDB
  participant stream as DynamoDB Stream
  participant expireTTL as Expire TTL Lambda
  participant processTTLExpiry as Process TTL Expiry Lambda
  participant eb as Event Bridge

  alt Dynamo auto-expires after TTL
    dynamo ->> dynamo: TTL expires
    dynamo ->> stream: TTL expired
    stream ->> processTTLExpiry:
    processTTLExpiry ->> eb: PrintTTLExpired Event
  else Polling Lamba expires after TTL
    expireTTL ->> dynamo:
    dynamo ->> stream: TTL expired
    processTTLExpiry ->> eb: PrintTTLExpired Event
  end
```
