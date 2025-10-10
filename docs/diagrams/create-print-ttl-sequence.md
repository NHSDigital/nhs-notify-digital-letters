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
  participant eb as Event Bridge
  participant sqs as SQS
  participant createTTL as Create TTL Lambda
  participant dynamo as DynamoDB


  eb ->> sqs: LetterStored event
  sqs ->> createTTL:
  createTTL ->> dynamo: Insert (24h TTL)
```
