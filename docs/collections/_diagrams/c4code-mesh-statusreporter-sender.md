---

title: c4code-mesh-statusreporter-sender

---


```mermaid
architecture-beta
    group reportSender(cloud)[ReportSender]
    service reportGenerated(aws:res-amazon-eventbridge-event)[ReportGenerated Event]
    service sqs(logos:aws-sqs)[ReportSender Queue] in reportSender
    service reportSenderLambda(logos:aws-lambda)[Report Sender] in reportSender
    service mesh(server)[MESH]
    service clientConfig(aws:res-aws-systems-manager-parameter-store)[Client Configuration] in reportSender
    service s3(logos:aws-s3)[Reports] in reportSender
    junction j1 in reportSender
    junction j2
    junction j3
    junction j4 in reportSender
    service reportSent(aws:res-amazon-eventbridge-event)[ReportSent Event]


    reportGenerated:R --> L:sqs
    sqs:R --> L:reportSenderLambda
    clientConfig:B -- T:j2
    s3:B -- T:j3
    j2:R -- L:j1
    j3:L -- R:j1
    j1:B --> T:reportSenderLambda
    reportSenderLambda:B --> T:mesh
    reportSenderLambda:R -- L:j4
    j4:R --> L:reportSent

```
