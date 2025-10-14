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

  eventBus -) pdmPollerQueue: SavedToPDM Event(meshFileId)
  activate pdmPollerQueue
  pdmPollerQueue ->> pdmPoller:
  deactivate pdmPollerQueue
  loop Until resource contains payload
    pdmPoller ->> pdm: GetSpecificResource(ID)
    activate pdm
    pdm -->> pdmPoller: DocumentReference
    deactivate pdm
  end
  pdmPoller -) eventBus: PDMDocumentReadyEvent(meshFileId)
```
