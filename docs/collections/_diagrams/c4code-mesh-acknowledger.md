---

title: c4code-mesh-acknowledger

---

## MESH Acknowledge

```mermaid
architecture-beta
    group meshAcknowledger(cloud)[MeshAcknowledge]
    service meshDownloaded(aws:res-amazon-eventbridge-event)[MESHInboxMessageDownloaded Event]
    service meshAcknowledged(aws:res-amazon-eventbridge-event)[ MESHInboxMessageAcknowledged Event]
    service meshAckQueue(logos:aws-sqs)[MeshAcknowledgement Queue] in meshAcknowledger
    service meshAckLambda(logos:aws-lambda)[MeshAcknowledger] in meshAcknowledger
    service mesh(server)[MESH]

    meshDownloaded:R --> L:meshAckQueue
    meshAckQueue:R --> L:meshAckLambda
    meshAckLambda:B --> T:mesh
    meshAckLambda:R --> L:meshAcknowledged
```
