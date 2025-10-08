---
layout: page
title: Sequence diagram
nav_order: 2
parent: Diagrams
has_children: false
child_nav_order: reversed
is_not_draft: false
last_modified_date: 2025-10-08
owner: Tom D'Roza
author: Tom D'Roza
---

## Questions

- 1. Should we validate the CommunicationRequest schema?
- 2. (&14) This would result in two separate PDS hits
- 3. Should Notify virus check the payload given that files >10MB don't go to PDM/NDR
- 7. When does Notify delete its local copy?
- 11. Duration and interval of polling
- 21. Can NHSApp read callback go to notify-letters when the message request originated from notify-core?

```mermaid

sequenceDiagram
  actor trust as Trust
  participant notify-letters as Notify: Digital Letters
  participant notify-core as Notify: Core
  participant notify-supplier as Notify: Supplier API
  participant pds as PDS
  participant nhsapp as NHSApp
  participant pdm as PDM
  participant ndr as NDR

  autonumber
  trust -> notify-letters: MESH (CommunicationRequest)
  notify-letters -> notify-letters: validate(schema, pdf)?
  notify-letters -> notify-letters: virus-check?
  opt Optionally check PDS
    notify-letters ->> pds: GetPatient (NHSNumber)
    pds -->> notify-letters: 200 OK (Patient)
    notify-letters -> notify-letters: validate(death,sflag, rfr)
  end
  notify-letters ->> notify-letters: Store CommunicationRequest (S3)
  notify-letters ->> pdm: POST /CommunicationRequest
  activate pdm
  pdm -) ndr: SFTP
  pdm -->> notify-letters: 200 OK
  deactivate pdm
  Loop Interval & Duration TBC
    notify-letters ->> pdm: GET /CommunicationRequest/<id>
    pdm ->> notify-letters: 200 OK (CommunicationRequest)
  end
  rect rgb(204, 223, 241)
    note over notify-letters,nhsapp: Existing Notify behaviour
    notify-letters ->> notify-core: post /v1/messages (NHSApp)
    activate notify-core
      notify-core ->> pds: GetPatient(NHSNumber)
      activate pds
        pds -->> notify-core: 200 OK (Patient)
      deactivate pds
      notify-core -> notify-core: validate(death,sflag, rfr)
      notify-core ->> nhsapp: sendMessage
      nhsapp -->> notify-core: 201 CREATED
      notify-core ->> notify-letters: 201 CREATED
    deactivate notify-core
  end

  notify-letters ->> notify-letters: Create SendLetter TTL
  alt Letter is read in NHS App
    nhsapp ->> notify-letters: Callback(status: read)
    notify-letters ->> notify-letters: Delete TTL
  else Letter is not read after fallback wait time
    notify-letters ->> notify-letters: SendLetter TTL expires
    notify-letters ->> notify-supplier: SendLetter(PDF)
  end
```
