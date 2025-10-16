---

title: c4Component-status-reporter

---


## Daily Status Report

### Report Scheduler

```mermaid
architecture-beta
    group reportScheduler(cloud)[ReportScheduler]
    service scheduledEvent(aws:res-amazon-eventbridge-event)[Scheduled Event]
    service reportSchedulerLambda(logos:aws-lambda)[Report Scheduler] in reportScheduler
    service report1Event(aws:res-amazon-eventbridge-event)[GenerateReport Trust1]
    service report2Event(aws:res-amazon-eventbridge-event)[GenerateReport Trust2]
    service report3Event(aws:res-amazon-eventbridge-event)[GenerateReport TrustN]
    junction j1
    junction j2
    junction j3

    scheduledEvent:R -- L:reportSchedulerLambda
    reportSchedulerLambda:R -- L:j1
    j1:T -- B:j2
    j1:B -- T:j3
    j2:R --> L:report1Event
    j1:R --> L:report2Event
    j3:R --> L:report3Event
```

### Report Generator

```mermaid
architecture-beta
    group reportGenerator(cloud)[ReportGenerator]
    service report1Event(aws:res-amazon-eventbridge-event)[GenerateReport Trust1]
    service reportGenerated(aws:res-amazon-eventbridge-event)[ReportGenerated Event]
    service reportGeneratorLambda(logos:aws-lambda)[Report Generator] in reportGenerator
    service ddb(aws:arch-amazon-dynamodb)[LetterRequests] in reportGenerator
    service s3(logos:aws-s3)[Reports] in reportGenerator
    junction j1 in reportGenerator

    report1Event:R -- L:reportGeneratorLambda
    reportGeneratorLambda:B <-- T:ddb
    reportGeneratorLambda:R -- L:j1
    j1:B --> T:s3
    j1:R --> L:reportGenerated

```

### Report Sender

```mermaid
architecture-beta
    group reportSender(cloud)[ReportSender]
    service reportGenerated(aws:res-amazon-eventbridge-event)[ReportGenerated Event]
    service reportSenderLambda(logos:aws-lambda)[Report Sender] in reportSender
    service s3(logos:aws-s3)[Reports] in reportSender
    service mesh(server)[MESH]

    reportGenerated:R --> L:reportSenderLambda
    reportSenderLambda:B <-- T:s3
    reportSenderLambda:R --> L:mesh

```
