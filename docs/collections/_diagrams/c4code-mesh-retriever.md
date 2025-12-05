---

title: c4code-mesh-retriever

---


## MESH Retriever

```mermaid
architecture-beta
    group meshRetriever(cloud)[MeshRetriever]
    service meshReceived(aws:res-amazon-eventbridge-event)[MESHInboxMessageReceived Event]
    service meshDownloaded(aws:res-amazon-eventbridge-event)[ MESHInboxMessageDownloaded Event]
    service meshDownloadQueue(logos:aws-sqs)[MeshDownload Queue] in meshRetriever
    service meshDownloadLambda(logos:aws-lambda)[MeshDownload] in meshRetriever
    service mesh(server)[MESH]
    service s3(logos:aws-s3)[DocumentReference] in meshRetriever

    meshReceived:R --> L:meshDownloadQueue
    meshDownloadQueue:R --> L:meshDownloadLambda
    meshDownloadLambda:T --> B:mesh
    meshDownloadLambda:B --> T:s3
    meshDownloadLambda:R --> L:meshDownloaded
```
