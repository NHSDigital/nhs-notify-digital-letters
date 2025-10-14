---
layout: page
title: PDM - C4 Component
parent:  NotiFHIR - C4 Container
nav_order: 6
has_children: true
is_not_draft: false
last_modified_date: 2024-10-13
owner: Tom D'Roza
author: Tom D'Roza
---

```mermaid
architecture-beta
    service meshDownloaded(logos:aws-eventbridge)[MESHFileDownloaded Event]
    service pdmSaved(logos:aws-eventbridge)[SavedToPDM Event]
    group uploadToPdm(cloud)[UploadToPDM]
    service uploadQueue(logos:aws-sqs)[UploadToPDM Queue] in uploadToPdm
    service uploadLambda(logos:aws-lambda)[UploadToPDM] in uploadToPdm
    service s3(logos:aws-s3)[S3 Bucket] in uploadToPdm
    service pdm(server)[PDM]


    meshDownloaded:R -- L:uploadQueue
    uploadQueue:R --> L:uploadLambda
    uploadLambda:B --> T:s3
    uploadLambda:T --> L:pdmSaved
    uploadLambda:R --> L:pdm

```

```mermaid
architecture-beta
    service eventBus(logos:aws-eventbridge)[SavedToPDM Event]
    service pdmReady(logos:aws-eventbridge)[PDMDocumentReadyEvent]
    group checkPdm(cloud)[PDMPoller]
    service pollPdmQueue(logos:aws-sqs)[PollPDM Queue] in checkPdm
    service pollPdmLambda(logos:aws-lambda)[PollPDM] in checkPdm
    service pdm(server)[PDM]

    eventBus:R -- L:pollPdmQueue
    pollPdmQueue:R --> L:pollPdmLambda
    pollPdmLambda:B --> L:pdmReady
    pollPdmLambda:R --> L:pdm
```
