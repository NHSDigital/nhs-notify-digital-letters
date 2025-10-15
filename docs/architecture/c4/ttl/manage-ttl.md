---
layout: page
title: Digital Letters - Printed Letter TTL Management
parent: Architecture
nav_order: 2
has_children: false
is_not_draft: false
last_modified_date: 2025-10-09
owner: Tom D'Roza
author: Tom D'Roza
---

```mermaid
architecture-beta
   group manageTTL(cloud)[ManageTTL]
   service manageLambda(logos:aws-lambda)[Poll TTL] in manageTTL
   service manageDb(logos:aws-dynamodb)[ItemsWithTTL] in manageTTL
   service ttlStream(aws-icons-mermaid:dynamodb-stream) in manageTTL
   service manageTtlExpiry(logos:aws-lambda)[HandleTTLExpiry] in manageTTL
   service printTTLExpired(aws-icons-mermaid:eventbridge-event)[PrintTTLExpired] in manageTTL

   manageLambda:R -- L:manageDb
   manageDb:R -- L:ttlStream
   ttlStream:B -- T:manageTtlExpiry
   manageTtlExpiry:R -- L:printTTLExpired
```
