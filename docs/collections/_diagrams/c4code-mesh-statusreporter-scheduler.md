---

title: c4code-mesh-statusreporter-scheduler

---

## Decisions

1. ReportScheulder lambda publishes a `GenerateReport` event for each trust that has new report data in the previous 24 hours.
2. A scheduled event triggers ReportScheduler lambda every 24 hours.
3. ReportScheduler lambda reads Client Configuration from Parameter Store to get list of trusts.
4. The `GenerateReport` event metadata contains the trust ID so the ReportGenerator lambda knows which trust to generate a report for.

```mermaid
architecture-beta
    group reportScheduler(cloud)[ReportScheduler]
    service scheduledEvent(aws:res-amazon-eventbridge-event)[Scheduled Event]
    service reportSchedulerLambda(logos:aws-lambda)[Report Scheduler] in reportScheduler
    service report1Event(aws:res-amazon-eventbridge-event)[GenerateReport Trust1]
    service report2Event(aws:res-amazon-eventbridge-event)[GenerateReport Trust2]
    service report3Event(aws:res-amazon-eventbridge-event)[GenerateReport TrustN]
    service clientConfig(aws:res-aws-systems-manager-parameter-store)[Client Configuration] in reportScheduler
    junction j1
    junction j2
    junction j3

    scheduledEvent:R -- L:reportSchedulerLambda
    clientConfig:B --> T:reportSchedulerLambda
    reportSchedulerLambda:R -- L:j1
    j1:T -- B:j2
    j1:B -- T:j3
    j2:R --> L:report1Event
    j1:R --> L:report2Event
    j3:R --> L:report3Event
```
