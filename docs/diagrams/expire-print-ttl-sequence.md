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
  participant expireTTL as Lambda<br/>PollTTL
  participant processTTLExpiry as Lambda<br/>HandleTTLExpiry
  participant eb as Event Bridge

  alt Dynamo auto-expires after TTL
    dynamo ->> dynamo: TTL expires
    dynamo ->> stream: TTL expired
    stream ->> processTTLExpiry:
  else Polling Lamba expires after TTL
    expireTTL ->> dynamo: Delete items with expired TTL
    dynamo ->> stream: TTL expired
    stream ->> processTTLExpiry:
  end
  processTTLExpiry ->> processTTLExpiry: Filter unread attachments
  processTTLExpiry ->> eb: PrintTTLExpired Event
```
