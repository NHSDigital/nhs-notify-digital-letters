---

title: Report Recorder
parent:  Digital Letter Status Reports
nav_order: 1
has_children: true
is_not_draft: false
last_modified_date: 2025-10-24
owner: Tom D'Roza
author: Tom D'Roza
diagrams: [c4code-tracker-listener, c4component-nhsapp-callback, sequence-nhsapp-callback]
events-raised: [reporting-daily-report-generated]
events-consumed: [
    mesh-file-found,
    mesh-file-saved,
    pdm-file-saved,
    callback-digital-letter-read,
    mesh-status-report-sent]
description: Listens to all events and generates up the report
c4type: code

---
