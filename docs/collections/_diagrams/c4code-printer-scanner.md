---

title: c4code-printer-scanner
---


```mermaid
architecture-beta
    group printScanner(cloud)[PrintScanner]
    service itemDequeued(aws:res-amazon-eventbridge-event)[ItemDequeued Event]
    service analyseQueue(logos:aws-sqs)[Analyse Queue] in printScanner
    service analyseLambda(logos:aws-lambda)[PrintScanner] in printScanner
    service docRefBucket(logos:aws-s3)[DocumentReference] in printScanner
    service lettersBucket(logos:aws-s3)[DigitalLetters] in printScanner
    service quarantineBucket(logos:aws-s3)[QuarantinedLetters] in printScanner
    service safeBucket(logos:aws-s3)[SafeLetters] in printScanner
    service guardDuty(aws:arch-amazon-guardduty)[GuardDuty] in printScanner
    service safeLetter(aws:res-amazon-eventbridge-event)[PrintLetterSafe Event]
    service quarantinedLetter(aws:res-amazon-eventbridge-event)[PrintLetterQuarantined Event]
    junction j1 in printScanner
    junction j2 in printScanner
    junction j3 in printScanner

    itemDequeued:R --> L:analyseQueue
    docRefBucket:T --> B:analyseLambda
    analyseQueue:R --> L:analyseLambda
    analyseLambda:T --> B:lettersBucket
    lettersBucket:R --> L:guardDuty
    guardDuty:R -- L:j1
    j1:T -- B:j2
    j1:B -- T:j3
    j2:R --> L:quarantineBucket
    quarantineBucket:R --> L:quarantinedLetter
    j3:R --> L:safeBucket
    safeBucket:R --> L:safeLetter


```
