---

title: c4code-mesh-statusreporter-sender

---


```mermaid
architecture-beta
    group reportSender(cloud)[ReportSender]
    service reportGenerated(aws:res-amazon-eventbridge-event)[ReportGenerated Event]
    service sqs(logos:aws-sqs)[ReportSender Queue] in reportSender
    service clientConfig(aws:res-aws-systems-manager-parameter-store)[Client Configuration] in reportSender
    service reportSenderLambda(logos:aws-lambda)[Report Sender] in reportSender
    service s3(logos:aws-s3)[Reports] in reportSender
    service reportSent(aws:res-amazon-eventbridge-event)[StatusReportSent Event]
    service mesh(server)[MESH]
    junction j1
    junction j2
    junction j3

    reportGenerated:R --> L:sqs
    sqs:R --> L:reportSenderLambda
    clientConfig:B --> T:reportSenderLambda
    reportSenderLambda:B <-- T:s3
    reportSenderLambda:R -- L:j1
    j1:T -- B:j2
    j2:R --> L:mesh
    j1:B -- T:j3
    j3:R --> L:reportSent

```
