---

title: c4code-mesh-poller

---

```mermaid
architecture-beta
    group meshPoller(cloud)[MeshPoller]
    service meshDownloaded(aws:res-amazon-eventbridge-event)[MeshPollerTimerExpired Event]
    service pdmSaved(aws:res-amazon-eventbridge-event)[MESHInboxMessageReceived Event]
    service meshPollLambda(logos:aws-lambda)[MeshPoll] in meshPoller
    service clientConfig(aws:res-aws-systems-manager-parameter-store)[Client Configuration] in meshPoller
    service mesh(server)[MESH]

    meshDownloaded:R --> L:meshPollLambda
    clientConfig:B --> T:meshPollLambda
    meshPollLambda:B --> T:mesh
    meshPollLambda:R --> L:pdmSaved
```
