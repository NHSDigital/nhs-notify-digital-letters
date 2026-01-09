---

title: sequence-expire-print-ttl

---

```mermaid
sequenceDiagram
  participant scannerLambda as Lambda<br/>PrintScanner
  participant analyserLambda as Lambda<br/>PrintAnalyser
  participant senderLambda as Lambda<br/>PrintSender
  participant moveLambda as Lambda<br/>MoveFiles
  participant unscannedS3 as S3<br/>UnscannedFiles
  participant gd as GuardDuty
  participant safeS3 as S3<br/>SafeFiles
  participant quarantinedS3 as S3<br/>QuarantinedFiles
  participant eventBus as Event Bus
  participant printApi as Print API

  eventBus ->> scannerLambda: ItemDequeued event
  activate scannerLambda
  scannerLambda ->> scannerLambda: Extract & Decode PDF
        scannerLambda -) unscannedS3: Store PDF
  deactivate scannerLambda
  unscannedS3 -) gd: S3 new object event
  activate gd
      gd -) gd: Scan for threats
      gd -) eventBus: ScanResult event
  deactivate gd
  eventBus -) moveLambda: ScanResult event
  activate moveLambda
    alt Move scanned file
      moveLambda ->> safeS3: Store safe PDF
      moveLambda ->> eventBus: FileSfe event
    else
      moveLambda ->> quarantinedS3: Store quarantined PDF
      moveLambda ->> eventBus: FileQuarantined event
  end
  moveLambda ->> unscannedS3: Delete unscanned PDF
  deactivate moveLambda
  eventBus -) analyserLambda: FileSafe event
  activate analyserLambda
  analyserLambda ->> safeS3: Get scanned PDF
        activate safeS3
                safeS3 -->> analyserLambda: PDF
        deactivate safeS3
  analyserLambda ->> analyserLambda: Count pages
  analyserLambda ->> analyserLambda: SHA256
  analyserLambda ->> eventBus: PDFAnalysed event
  deactivate analyserLambda
  eventBus -) senderLambda: PDFAnalysed event
  activate senderLambda
  senderLambda -) eventBus: letter.PREPARED event
  deactivate senderLambda
  eventBus -) printApi: letter.PREPARED event
```
