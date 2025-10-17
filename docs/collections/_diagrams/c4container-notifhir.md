---

title: c4container-notifhir

---

```mermaid
    C4Context
      title Container NotiFHIR

      System_Boundary(trusts, "Digital Letters")
      {
        System_Ext(trustmesh, "MESH", "Trusts mesh mailbox")
      }
      Container_Boundary(notify01, "NotiFHIR C4 Container. (all cloudevents via EventBus)") {
        Container(statetracking, "Digital Letter Status Reports", "Keeps track of state", "Used for mesh to send reports")
        Container(mesh, "MESH Services", "Python", "All things MESH", $tags="v1.0", $link="https://www.google.com")
        Container(eventbus, "Event Bus", "CloudEvents", "All Events go via here")
        Container(pdm, "PDM Services", "Typescript", "All things PDM")
        Container(ttl, "Queue Services", "AWS", "Keeping things in a queue")
        Container(core, "Core System Notifier", "NHS Notify", "Interacts with Notify to send App messages", $link="https://www.google.com")
        Container(fhir, "FHIR", "FHIR", "Extraction of PDF from FHIR")
        Container(digitalletter, "Digital Letter Viewer Services", "Stuff", "Knows about digital letters")

        Container(print, "Print Supplier Services", "Print", "Sends pdfs to printer")

      }

      System_Boundary(digitallettersext, "Other Services")
      {
        System_Ext(digitalletterssystem, "Digital Letters Viewer", "In App digital letters")
        System_Ext(notifycore, "NHS Notify Core API", "Description")
      }

      BiRel(trustmesh, mesh, "POST", "MESH")
      Rel(mesh, pdm, "MeshFileSaved", "CloudEvent")
      Rel(pdm, ttl, "PDMDataSent", "CloudEvent")
      Rel(pdm, core, "PDMDataSaved", "CloudEvent")
      Rel(ttl, fhir, "QueueItemExpired", "CloudEvent")
      Rel(fhir, print, "AttachmentExtracted", "CloudEvent")
      Rel(digitalletter, ttl, "DigitalLetterRead", "CloudEvent")
      Rel(digitalletterssystem, digitalletter, "ReadReceipt", "HTTP Callback")
      Rel(eventbus, statetracking, "All Events", "CloudEvent")
      Rel(statetracking, mesh, "ReportCreated", "CloudEvent")
      Rel(core, notifycore,  "POST /v1/messages", "API")
      Rel(eventbus, mesh,  "TimerExpired", "CloudEvent")



       UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")

```
