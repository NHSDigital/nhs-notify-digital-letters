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
    service reportSent(aws:res-amazon-eventbridge-event)[ReportSent Event]


    reportGenerated:R --> L:sqs
    sqs:R --> L:reportSenderLambda
    clientConfig:R -- T:reportSenderLambda
    s3:L -- T:reportSenderLambda
    j1:B --> T:reportSenderLambda
    reportSenderLambda:B --> T:mesh
    reportSenderLambda:R -- L:j2
    j2:R --> L:reportSent

```
