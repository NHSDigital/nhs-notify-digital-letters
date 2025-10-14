---
layout: page
title: Digital Letters Sequence diagram
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

1. When does Notify delete its local copy?
2. Duration and interval of polling
3. Can NHSApp read callback go to notify-letters when the message request originated from notify-core?

## Decisions

1. Out of scope for MVP: Virus checking of PDF received from Trust
2. Don't check `CommunicationRequest` filesize. Attempt to upload all `CommunicationRequest`s to PDM. Those exceeding APIM size limit will fail.
3. No PDS check by Digital Letters component of Date-of-Death, S-flag, RFR codes. Rely on Trusts having performed these checks.

```mermaid

sequenceDiagram
  actor trust as Trust
  participant notify-letters as Notify: Digital Letters
  participant pdm as PDM
  participant ndr as NDR
  participant notify-core as Notify: Core
  participant notify-supplier as Notify: Supplier API
  participant pds as PDS
  participant nhsapp as NHSApp


  trust ->> notify-letters: MESH (CommunicationRequest)
  activate notify-letters
      notify-letters ->> trust: MESH Ack
  deactivate notify-letters
  notify-letters ->> notify-letters: Store CommunicationRequest (S3)
  notify-letters ->> notify-letters: Create SendLetter TTL
  notify-letters ->> pdm: POST /CommunicationRequest
  activate pdm
  pdm -) ndr: SFTP
  pdm -->> notify-letters: 200 OK
  deactivate pdm
  Loop Interval & Duration TBC
    notify-letters ->> pdm: GET /CommunicationRequest/<id>
    pdm ->> notify-letters: 200 OK (CommunicationRequest)
  end
  rect rgba(5, 26, 46, 1)
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

  alt Letter is read in NHS App
    nhsapp ->> notify-letters: Callback(status: read)
    notify-letters ->> notify-letters: Delete SendLetterTTL
  else Read receipt not received within print expiry time
    notify-letters ->> notify-letters: SendLetter TTL expires
    notify-letters -) notify-supplier: SendLetter Event
    notify-supplier -) notify-letters: Letter Status Events
  end
  opt Daily status reports
    notify-letters -) trust: CSV via MESH
  end

```
