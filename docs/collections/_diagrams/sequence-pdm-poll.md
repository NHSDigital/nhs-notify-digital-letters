---
layout: page
title: PDM Poll
nav_order: 5
parent: Diagrams
has_children: false
child_nav_order: reversed
is_not_draft: false
last_modified_date: 2025-10-13
owner: Tom D'Roza
author: Tom D'Roza
---

```mermaid

sequenceDiagram
  participant eventBus as EventBridge
  participant pdmPollerQueue as Queue<br/>PDMPollerQueue
  participant pdmPoller as Lambda<br/>PDMPoller
  participant pdm as PDM

  eventBus -) pdmPollerQueue: PDMResourceSubmitted Event(pdmID)<br/>PDMResourceUnavailable Event(pdmID)
  activate pdmPollerQueue
  pdmPollerQueue ->> pdmPoller:
  deactivate pdmPollerQueue
  activate pdmPoller
  loop Until resource contains payload
    pdmPoller ->> pdm: GetSpecificResource(pdmID)
    activate pdm
    pdm -->> pdmPoller: DocumentReference
    pdm ->> eventBus: PDMResourceUnavailable(pdmID) [if no payload]
    deactivate pdm
  end
  alt Resource contains payload
  pdmPoller -) eventBus: PDMResourceAvailable(pdmID)
  else after retries exceeded
  pdmPoller -) eventBus: PDMResourceRetriesExceeded(pdmID)
  deactivate pdmPoller
  end
```
