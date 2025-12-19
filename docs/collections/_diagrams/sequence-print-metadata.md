---

title: sequence-expire-print-ttl

---

```mermaid
sequenceDiagram
  participant dl as Digital Letters
  participant s3 as S3 Bucket
  participant eventBus as Event Bus
  participant printApi as Print API

  eventBus ->> dl: ItemDequeued event
  activate dl
  dl ->> dl: Extract & Decode PDF
        dl -) s3: Store PDF
  deactivate dl
  s3 -) s3: GuardDuty
  s3 -) eventBus: ScanResult event
  eventBus ->> dl: ScanResult event
  activate dl
  dl ->> s3: Get scanned PDF
        activate s3
                s3 -->> dl: PDF
        deactivate s3
  dl ->> dl: Count pages
  dl ->> dl: SHA256
  dl ->> eventBus: LetterAvailable event
  deactivate dl
  eventBus ->> dl: LetterAvailable event
  activate dl
  dl -) printApi: letter.PREPARED event
  deactivate dl
```
