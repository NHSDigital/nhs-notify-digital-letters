---

title: c4code-mesh-statusreporter-recorder

---

```mermaid
architecture-beta
    group statusRecorder(cloud)[ReportStatusRecorder]
    service report1Event(aws:res-amazon-eventbridge-event)[DigitalLetterRead Event]
    service report2Event(aws:res-amazon-eventbridge-event)[PrintingDispatched Event]
    service report3Event(aws:res-amazon-eventbridge-event)[NHSAppMessageRequested Event]
    service sqs(logos:aws-sqs)[StatusRecorder Queue] in statusRecorder
    service reportGeneratorLambda(logos:aws-lambda)[StatusRecorder] in statusRecorder
    service ddb(aws:arch-amazon-athena)[Reports] in statusRecorder
    junction j1
    junction j2

    j2:B -- T:j1
    report1Event:R -- L:j2
    report2Event:R -- L:j1
    report3Event:R -- B:j1

    j1:R --> L:sqs
    sqs:R --> L:reportGeneratorLambda
    reportGeneratorLambda:B --> T:ddb

```
