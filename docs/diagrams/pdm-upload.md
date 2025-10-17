---
layout: page
title: PDM Upload
nav_order: 4
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
  participant pdmUploadQueue as Queue<br/>PDMUploadQueue
  participant pdmUpload as Lambda<br/>PDMUpload
  participant s3 as S3
  participant pdm as PDM

  eventBus -) pdmUploadQueue: MESHFileAvailable Event
  activate pdmUploadQueue
  pdmUploadQueue ->> pdmUpload:
  deactivate pdmUploadQueue
  activate pdmUpload
  pdmUpload ->> s3: Get file from S3
  s3 -->> pdmUpload: DocumentReference
  pdmUpload ->> pdm: CreateResource(DocumentReference)
  activate pdm
  pdm -->> pdmUpload: 200 OK
  deactivate pdm
  pdmUpload -) eventBus: SavedToPDM Event(meshFileId)
  deactivate pdmUpload
```
