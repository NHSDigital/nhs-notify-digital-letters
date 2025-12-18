---

title: c4code-pdm-upload
description: PDM Upload
---


```mermaid
architecture-beta
    service meshDownloaded(aws:res-amazon-eventbridge-event)[MESHInboxMessageDownloaded Event]
    service pdmSaved(aws:res-amazon-eventbridge-event)[PDMResourceSubmitted Event]
    service pdmFailed(aws:res-amazon-eventbridge-event)[PDMResourceSubmssionRejected Event]
    group uploadToPdm(cloud)[UploadToPDM]
    service uploadQueue(logos:aws-sqs)[UploadToPDM Queue] in uploadToPdm
    service uploadLambda(logos:aws-lambda)[UploadToPDM] in uploadToPdm
    service s3(logos:aws-s3)[DocumentReference] in uploadToPdm
    service pdm(server)[PDM]
    junction j1


    meshDownloaded:R -- L:uploadQueue
    uploadQueue:R --> L:uploadLambda
    uploadLambda:B <-- T:s3
    uploadLambda:R -- L:j1
    j1:R --> L:pdmSaved
    j1:B --> L:pdmFailed
    uploadLambda:T --> B:pdm

```
